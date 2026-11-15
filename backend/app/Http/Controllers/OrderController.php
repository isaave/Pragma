<?php

namespace App\Http\Controllers;

use App\Models\Ingredient;
use App\Models\IngredientMovement;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\ProductAddon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    // Status que exigem um motivo quando são aplicados
    private const STATUS_WITH_REASON = ['cancelled', 'not_delivered', 'late'];

    // Listar pedidos (com histórico de status e utilizador)
    public function index(Request $request)
    {
        $query = Order::with('items.product', 'items.addons.addon', 'user', 'statusHistory.user')
            ->withCount('statusHistory');

        if ($status = trim((string) $request->query('status', ''))) {
            $query->where('status', $status);
        }

        return response()->json($query->latest()->get());
    }

    // Mostrar um pedido com todos os itens
    public function show(Order $order)
    {
        return response()->json(
            $order->load('items.product', 'items.addons.addon', 'user', 'statusHistory.user')
        );
    }

    // Criar pedido e dar baixa automática nos ingredientes da receita
    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_name'      => 'nullable|string|max:120',
            'items'              => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity'   => 'required|integer|min:1|max:999',
            'items.*.notes'      => 'nullable|string|max:1000',
            'items.*.addons'     => 'nullable|array',
            'items.*.addons.*.product_addon_id' => 'required|integer|exists:product_addons,id',
            'items.*.addons.*.quantity'         => 'required|integer|min:1|max:999',
            'notes'              => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();

        try {
            $user = $request->user();

            // 1) Validar estoque de TODOS os ingredientes antes de criar qualquer coisa
            foreach ($data['items'] as $item) {
                $product = Product::with('ingredients')->findOrFail($item['product_id']);
                foreach ($product->ingredients as $ingredient) {
                    $needed = (float) $ingredient->pivot->quantity * (int) $item['quantity'];
                    if ((float) $ingredient->quantity < $needed) {
                        throw new \Exception(
                            "Estoque insuficiente de {$ingredient->name} ({$ingredient->unit}) para o produto {$product->name}. " .
                            "Disponível: {$ingredient->quantity} {$ingredient->unit}."
                        );
                    }
                }
            }

            // 2) Criar a ordem
            $order = Order::create([
                'user_id'       => $user->id,
                'customer_name' => $data['customer_name'] ?? null,
                'total'         => 0,
                'status'        => 'pending',
                'notes'         => $data['notes'] ?? null,
            ]);

            // 2.1) Registar o status inicial no histórico
            OrderStatusHistory::create([
                'order_id' => $order->id,
                'user_id'  => $user->id,
                'status'   => 'pending',
                'reason'   => null,
            ]);

            // 3) Criar itens, adicionais e baixar estoque
            $total = $this->applyItems($order, $data['items']);

            // 4) Salvar total
            $order->update(['total' => $total]);

            DB::commit();

            return response()->json([
                'message' => 'Pedido realizado com sucesso!',
                'order'   => $order->fresh()->load('items.product', 'items.addons.addon', 'user', 'statusHistory.user'),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    // Atualizar status do pedido e registar no histórico
    public function updateStatus(Request $request, Order $order)
    {
        $data = $request->validate([
            'status' => [
                'required',
                Rule::in([
                    'pending',
                    'development',
                    'preparing',
                    'ready',
                    'delivered',
                    'cancelled',
                    'not_delivered',
                    'late',
                ]),
            ],
            'reason' => [
                Rule::requiredIf(fn () => in_array($request->input('status'), self::STATUS_WITH_REASON, true)),
                'nullable',
                'string',
                'max:1000',
            ],
        ], [
            'status.required' => 'Informe o novo status do pedido.',
            'status.in'       => 'Status de pedido inválido.',
            'reason.required' => 'Informe o motivo para este status.',
            'reason.max'      => 'O motivo pode ter no máximo 1000 caracteres.',
        ]);

        if ($data['status'] === $order->status) {
            return response()->json([
                'message' => 'O pedido já está com esse status.',
                'order'   => $order->fresh()->load('items.product', 'items.addons.addon', 'user', 'statusHistory.user'),
            ]);
        }

        $order->update(['status' => $data['status']]);

        OrderStatusHistory::create([
            'order_id' => $order->id,
            'user_id'  => $request->user()?->id,
            'status'   => $data['status'],
            'reason'   => $data['reason'] ?? null,
        ]);

        return response()->json([
            'message' => 'Status do pedido atualizado!',
            'order'   => $order->fresh()->load('items.product', 'items.addons.addon', 'user', 'statusHistory.user'),
        ]);
    }

    // Editar pedido (cliente, observações e itens) enquanto não estiver entregue/cancelado
    public function update(Request $request, Order $order)
    {
        if (in_array($order->status, ['delivered', 'cancelled'], true)) {
            return response()->json([
                'message' => 'Não é possível editar um pedido já entregue ou cancelado.',
            ], 422);
        }

        $data = $request->validate([
            'customer_name'      => 'nullable|string|max:120',
            'items'              => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity'   => 'required|integer|min:1|max:999',
            'items.*.notes'      => 'nullable|string|max:1000',
            'items.*.addons'     => 'nullable|array',
            'items.*.addons.*.product_addon_id' => 'required|integer|exists:product_addons,id',
            'items.*.addons.*.quantity'         => 'required|integer|min:1|max:999',
            'notes'              => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();

        try {
            $order->load('items.product.ingredients');

            // 1) Calcular o que os novos itens consomem e o que será devolvido ao estoque
            $usage = [];
            foreach ($data['items'] as $item) {
                $product = Product::with('ingredients')->findOrFail($item['product_id']);
                foreach ($product->ingredients as $ingredient) {
                    $usage[$ingredient->id] = ($usage[$ingredient->id] ?? 0)
                        + (float) $ingredient->pivot->quantity * (int) $item['quantity'];
                }
            }

            $restore = [];
            foreach ($order->items as $item) {
                $product = $item->product;
                if (!$product) {
                    continue;
                }
                foreach ($product->ingredients as $ingredient) {
                    $restore[$ingredient->id] = ($restore[$ingredient->id] ?? 0)
                        + (float) $ingredient->pivot->quantity * (int) $item->quantity;
                }
            }

            foreach ($usage as $ingredientId => $needed) {
                $ingredient = Ingredient::findOrFail($ingredientId);
                $available = (float) $ingredient->quantity + ($restore[$ingredientId] ?? 0);
                if ($available < $needed) {
                    throw new \Exception(
                        "Estoque insuficiente de {$ingredient->name} ({$ingredient->unit}). " .
                        "Disponível: {$available} {$ingredient->unit}."
                    );
                }
            }

            // 2) Devolver ao estoque o que o pedido antigo consumia e limpar os itens antigos
            foreach ($order->items as $item) {
                $product = $item->product;
                if ($product) {
                    foreach ($product->ingredients as $ingredient) {
                        $ingredient->increment(
                            'quantity',
                            (float) $ingredient->pivot->quantity * (int) $item->quantity
                        );
                    }
                }
                $item->addons()->delete();
            }

            IngredientMovement::whereIn('order_item_id', $order->items->pluck('id'))->delete();
            $order->items()->delete();

            // 3) Recriar os itens e dar baixa no estoque novamente
            $total = $this->applyItems($order, $data['items']);

            $order->update([
                'customer_name' => $data['customer_name'] ?? null,
                'notes'         => $data['notes'] ?? null,
                'total'         => $total,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Pedido atualizado com sucesso!',
                'order'   => $order->fresh()->load('items.product', 'items.addons.addon', 'user', 'statusHistory.user'),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    // Criar itens do pedido, adicionais e dar baixa no estoque; devolve o total
    private function applyItems(Order $order, array $items): float
    {
        $total = 0.0;

        foreach ($items as $item) {
            $product = Product::with('ingredients')->findOrFail($item['product_id']);
            $unitPrice = (float) $product->price;
            $subtotal = $unitPrice * (int) $item['quantity'];
            $total += $subtotal;

            $orderItem = $order->items()->create([
                'product_id' => $product->id,
                'quantity'   => (int) $item['quantity'],
                'unit_price' => $unitPrice,
                'subtotal'   => $subtotal,
                'notes'      => $item['notes'] ?? null,
            ]);

            // Adicionais do item
            foreach ($item['addons'] ?? [] as $addonItem) {
                $addon = ProductAddon::findOrFail($addonItem['product_addon_id']);
                $addonPrice = (float) $addon->price;
                $total += $addonPrice * (int) $addonItem['quantity'];

                $orderItem->addons()->create([
                    'product_addon_id' => $addon->id,
                    'quantity'         => (int) $addonItem['quantity'],
                    'unit_price'       => $addonPrice,
                ]);
            }

            // Baixar estoque dos ingredientes da receita deste produto
            foreach ($product->ingredients as $ingredient) {
                $used = (float) $ingredient->pivot->quantity * (int) $item['quantity'];

                $ingredient->decrement('quantity', $used);

                IngredientMovement::create([
                    'ingredient_id' => $ingredient->id,
                    'order_item_id' => $orderItem->id,
                    'type'          => 'sale',
                    'quantity'      => $used,
                    'notes'         => "Venda de {$product->name} — pedido #{$order->id}",
                ]);
            }
        }

        return $total;
    }

    // Excluir pedido (só se ainda não estiver entregue/cancelado)
    public function destroy(Order $order)
    {
        if (in_array($order->status, ['delivered', 'cancelled'], true)) {
            return response()->json([
                'message' => 'Não é possível excluir um pedido já entregue ou cancelado.',
            ], 422);
        }

        $order->delete();

        return response()->json(['message' => 'Pedido excluído com sucesso!']);
    }
}
