<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductAddon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    // Listar produtos
    // Usuários 'basico' podem apenas visualizar produtos
    // Usuários 'completo' têm acesso total
    public function index(Request $request)
    {
        // Tanto 'basico' quanto 'completo' podem consultar o cardápio (somente leitura para basico)
        // Produtos excluídos ficam arquivados para não quebrar o histórico dos pedidos.
        $query = Product::query()->whereNull('deleted_at')->category($request->query('category'));

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where('name', 'like', '%' . $search . '%');
        }

        return response()->json($query->orderBy('name')->get());
    }

    // Mostrar um produto
    public function show(Product $product)
    {
        if ($product->deleted_at) {
            abort(404);
        }

        return response()->json($product);
    }

    // Cadastrar novo produto
    // Usuários 'basico' não podem criar produtos
    public function store(Request $request)
    {
        // Usuários 'basico' não podem criar produtos
        $user = $request->user();
        if ($user->isBasico() && ! $user->isCompleto()) {
            return response()->json(['message' => 'Acesso restrito: usuários basico não podem criar produtos'], 403);
        }
        $data = $request->validate($this->rules());

        $product = DB::transaction(function () use ($data) {
            $product = Product::create($this->productFields($data));
            $this->syncRecipe($product, $data['ingredients'] ?? []);
            return $product;
        });

        return response()->json([
            'message' => 'Produto cadastrado com sucesso!',
            'product' => $product->fresh(),
        ], 201);
    }

    // Editar produto (e a receita, se "ingredients" for enviado)
    public function update(Request $request, Product $product)
    {
        $data = $request->validate($this->rules($product->id));

        DB::transaction(function () use ($product, $data) {
            $product->update($this->productFields($data));
            if (array_key_exists('ingredients', $data)) {
                $this->syncRecipe($product, $data['ingredients'] ?? []);
            }
        });

        return response()->json([
            'message' => 'Produto atualizado com sucesso!',
            'product' => $product->fresh(),
        ]);
    }

    // Excluir produto: arquiva para preservar os pedidos que o utilizam.
    // Um delete real quebraria a FK de order_items e apagaria o histórico de vendas.
    public function destroy(Product $product)
    {
        $product->forceFill(['deleted_at' => now()])->save();

        return response()->json(['message' => 'Produto excluído com sucesso!']);
    }

    // Só os campos da tabela products (sem a lista de ingredientes)
    private function productFields(array $data): array
    {
        $fields = collect($data)->except('ingredients')->all();

        // O status enviado pelo formulário é a fonte da verdade para is_active
        if (array_key_exists('status', $fields)) {
            $fields['is_active'] = $fields['status'] === 'ativo';
        }

        return $fields;
    }

    // Substitui a receita do produto pela lista recebida: [{id, quantity, unit}, ...]
    private function syncRecipe(Product $product, array $items): void
    {
        $sync = [];
        foreach ($items as $item) {
            $sync[$item['id']] = [
                'quantity' => $item['quantity'],
                'unit' => $item['unit'] ?? null,
            ];
        }
        $product->ingredients()->sync($sync);
    }

    private function rules(?int $ignoreId = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('products', 'name')->whereNull('deleted_at')->ignore($ignoreId)],
            'category' => ['required', Rule::in(Product::CATEGORIES)],
            'description' => 'nullable|string|max:255',
            'price' => 'required|numeric|min:0|max:99999.99',
            'is_active' => 'sometimes|boolean',
            'status' => 'sometimes|string|in:ativo,inativo,desenvolvimento',
            'notes' => 'nullable|string|max:1000',
            'ingredients' => 'nullable|array',
            'ingredients.*.id' => 'required|integer|distinct|exists:ingredients,id',
            'ingredients.*.quantity' => 'required|numeric|gt:0|max:99999999',
            'ingredients.*.unit' => 'nullable|string|max:50',
        ];
    }

    // ---------- Adicionais do produto ----------

    // Listar adicionais de um produto
    public function productAddons(Product $product)
    {
        return response()->json($product->addons()->orderBy('name')->get());
    }

    // Cadastrar adicional para um produto
    public function addProductAddon(Request $request, Product $product)
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:255', Rule::unique('product_addons', 'name')->where('product_id', $product->id)],
            'price'    => 'required|numeric|min:0|max:99999.99',
            'quantity' => 'nullable|integer|min:0|max:99999999',
            'is_active'=> 'required|boolean',
        ]);

        $addon = $product->addons()->create([
            'name'     => $data['name'],
            'price'    => $data['price'],
            'quantity' => $data['quantity'] ?? 0,
            'is_active'=> $data['is_active'],
        ]);

        return response()->json([
            'message' => 'Adicional cadastrado com sucesso!',
            'addon'   => $addon->fresh(),
        ], 201);
    }

    // Atualizar adicional
    public function updateProductAddon(Request $request, Product $product, ProductAddon $addon)
    {
        $data = $request->validate([
            'name'     => ['sometimes', 'string', 'max:255', Rule::unique('product_addons', 'name')->where('product_id', $product->id)->ignore($addon->id)],
            'price'    => 'sometimes|numeric|min:0|max:99999.99',
            'quantity' => 'sometimes|integer|min:0|max:99999999',
            'is_active'=> 'sometimes|boolean',
        ]);

        $addon->update($data);

        return response()->json([
            'message' => 'Adicional atualizado com sucesso!',
            'addon'   => $addon->fresh(),
        ]);
    }

    // Excluir adicional
    public function destroyProductAddon(Product $product, ProductAddon $addon)
    {
        $addon->delete();

        return response()->json(['message' => 'Adicional excluído com sucesso!']);
    }
}
