<?php

namespace App\Http\Controllers;

use App\Models\Ingredient;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IngredientController extends Controller
{
    // Listar ingredientes (filtros: ?filter=low|expiring|out  e  ?search=texto)
    public function index(Request $request)
    {
        $query = Ingredient::query();

        switch ($request->query('filter')) {
            case 'low':
                $query->lowStock();
                break;
            case 'expiring':
                $query->expiring();
                break;
            case 'out':
                $query->outOfStock();
                break;
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where('name', 'like', '%' . $search . '%');
        }

        return response()->json($query->orderBy('name')->get());
    }

    // Mostrar um ingrediente
    public function show(Ingredient $ingredient)
    {
        return response()->json($ingredient);
    }

    // Cadastrar novo ingrediente
    public function store(Request $request)
    {
        $data = $request->validate($this->rules());

        $ingredient = Ingredient::create($data);

        return response()->json([
            'message' => 'Ingrediente cadastrado com sucesso!',
            'ingredient' => $ingredient->fresh(),
        ], 201);
    }

    // Editar ingrediente
    public function update(Request $request, Ingredient $ingredient)
    {
        $data = $request->validate($this->rules($ingredient->id));

        $ingredient->update($data);

        return response()->json([
            'message' => 'Ingrediente atualizado com sucesso!',
            'ingredient' => $ingredient->fresh(),
        ]);
    }

    // Excluir ingrediente
    public function destroy(Ingredient $ingredient)
    {
                // Não deixa excluir um ingrediente que faz parte da receita de algum produto
        if (\Illuminate\Support\Facades\DB::table('ingredient_product')->where('ingredient_id', $ingredient->id)->exists()) {
            return response()->json(['message' => 'Este ingrediente é usado em produtos e não pode ser excluído.'], 422);
        }
        $ingredient->delete();

        return response()->json(['message' => 'Ingrediente excluído com sucesso!']);
    }

    // Adicionar estoque (modal "Adicionar" do Figma): soma a quantidade e registra o lote
    public function restock(Request $request, Ingredient $ingredient)
    {
        $data = $request->validate([
            'quantity' => 'required|numeric|gt:0|max:99999999',
            'expiry_date' => 'nullable|date',
            'last_purchase_date' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        $ingredient->quantity = $ingredient->quantity + $data['quantity'];
        $ingredient->last_purchase_date = $data['last_purchase_date'] ?? now()->toDateString();

        if (!empty($data['expiry_date'])) {
            $ingredient->expiry_date = $data['expiry_date'];
        }
        if (array_key_exists('notes', $data) && $data['notes'] !== null) {
            $ingredient->notes = $data['notes'];
        }

        $ingredient->save();

        return response()->json([
            'message' => 'Estoque adicionado com sucesso!',
            'ingredient' => $ingredient->fresh(),
        ]);
    }

    // Regras de validação (usadas no cadastro e na edição)
    private function rules(?int $ignoreId = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('ingredients', 'name')->ignore($ignoreId)],
            'unit' => 'required|string|max:50',
            'quantity' => 'required|numeric|min:0|max:99999999',
            'capacity' => 'required|numeric|gt:0|max:99999999',
            'expiry_date' => 'nullable|date',
            'last_purchase_date' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
        ];
    }
}
