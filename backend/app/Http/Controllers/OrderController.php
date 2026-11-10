<?php

namespace App\Http\Controllers;

use App\Models\Ingredient;
use App\Models\IngredientMovement;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductAddon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    // Listar pedidos
    public function index(Request $request)
    {
        $query = Order::query();

        if ($status = trim((string) $request->query('status', ''))) {
            $query->where('status', $status);
        }

        return response()->json($query->latest()->get());
    }

    // Mostrar um pedido com todos os itens
    public function show(Order $order)
    {
        return response()->json($order->load('items.product', 'items.addons.addon', 'user'));
    }

    // Criar pedido e dar baixa automática nos ingredientes da receita
    public function store(Request $request)
    {
        $data = $request->validate([
            'items'     => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity'   => 'required|integer|min:1|max:999',
            'items.*.notes'      => 'nullable|string|max:1000',
            'items.*.addons'     => 'nullable|array',
            'items.*.addons.*.product_addon_id' => 'required|integer|exists:product_addons,id',
            'items.*.addons.*.quantity'         => 'required|integer|min:1|max:999',
            'notes' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();

        try {
            $user = $request->user();
            $total = 0;

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
                'user_id' => $user->id,
                'total'   => 0,
                'status'  => 'pending',
                'notes'   => $data['notes'] ?? null,
            ]);

            // 3) Criar itens, adicionais e baixar estoque
            foreach ($data['items'] as $item) {
                $product = Product::with('ingredients')->findOrFail($item['product_id']);
                $unitPrice = (float) $product->price;
                $subtotal  = $unitPrice * (int) $item['quantity'];
                $total    += $subtotal;

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
                    $addonSubtotal = $addonPrice * (int) $addonItem['quantity'];
                    $total += $addonSubtotal;

                    $orderItem->addons()->create([
                        'product_addon_id' => $addon->id,
                        'quantity'         => (int) $addonItem['quantity'],
                        'unit_price'       => $addonPrice,
                    ]);
                }

                // 4) Baixar estoque dos ingredientes da receita deste produto
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

            // 5) Salvar total
            $order->update(['total' => $total]);

            DB::commit();

            return response()->json([
                'message' => 'Pedido realizado com sucesso!',
                'order'   => $order->fresh()->load('items.product', 'items.addons.addon', 'user'),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    // Atualizar status do pedido (pendente -> preparando -> pronto -> entregue -> cancelado)
    public function updateStatus(Request $request, Order $order)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['pending', 'preparing', 'ready', 'delivered', 'cancelled'])],
        ]);

        $order->update(['status' => $data['status']]);

        return response()->json([
            'message' => 'Status do pedido atualizado!',
            'order'   => $order->fresh(),
        ]);
    }

    // Excluir pedido (só se ainda não estiver entregue/cancelado)
    public function destroy(Order $order)
    {
        if (in_array($order->status, ['delivered', 'cancelled'])) {
            return response()->json([
                'message' => 'Não é possível excluir um pedido já entregue ou cancelado.',
            ], 422);
        }

        $order->delete();

        return response()->json(['message' => 'Pedido excluído com sucesso!']);
    }
}
