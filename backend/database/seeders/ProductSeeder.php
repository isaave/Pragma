<?php

namespace Database\Seeders;

use App\Models\Ingredient;
use App\Models\Product;
use Illuminate\Database\Seeder;

// Dados de exemplo para testar a tela de produtos.
// Rodar sozinho (pode repetir sem duplicar):  php artisan db:seed --class=ProductSeeder
class ProductSeeder extends Seeder
{
    public function run(): void
    {
        // Os produtos usam ingredientes do estoque, então garante que eles existem
        $this->call(IngredientSeeder::class);

        $products = [
            // nome, categoria, descrição, preço, ativo, receita [nome do ingrediente => quantidade]
            ['X-Salada', 'hamburguer', '1 patty, salada, maionese', 30, true,
                ['Pão australiano' => 1, 'Carne' => 1, 'Alface' => 2, 'Tomate' => 2, 'Maionese' => 1]],
            ['X-Queijo', 'hamburguer', '1 patty, queijo derretido', 32, true,
                ['Pão australiano' => 1, 'Carne' => 1, 'Queijo' => 1]],
            ['X-Bacon', 'hamburguer', '1 patty, queijo, bacon crocante', 34, true,
                ['Pão australiano' => 1, 'Carne' => 1, 'Queijo' => 1, 'Bacon' => 2]],
            ['X-Tudo', 'hamburguer', '1 patty, queijo, bacon, ovo', 38, true,
                ['Pão australiano' => 1, 'Carne' => 1, 'Queijo' => 1, 'Bacon' => 2, 'Ovo' => 1]], // Ovo está em falta -> indisponível
            ['Combo X-Salada', 'combo', 'X-salada + batata + refrigerante', 49, true,
                ['Pão australiano' => 1, 'Carne' => 1, 'Alface' => 2, 'Tomate' => 2, 'Maionese' => 1]],
            ['Combo Infantil', 'combo', 'Hambúrguer + batata + suco', 29, false, []],            // inativo
            ['Batata frita', 'acompanhamento', 'Porção média', 14, true, []],
            ['Refrigerante', 'bebida', 'Coca, guaraná ou fanta', 10, true, []],
            ['Água com gás', 'bebida', '500ml', 8, true, []],
            ['Sundae', 'sobremesa', '2 bolas, calda e chantili', 18, true, []],
        ];

        foreach ($products as [$name, $category, $description, $price, $isActive, $recipe]) {
            $product = Product::updateOrCreate(
                ['name' => $name],
                [
                    'category' => $category,
                    'description' => $description,
                    'price' => $price,
                    'is_active' => $isActive,
                    'notes' => null,
                ]
            );

            $sync = [];
            foreach ($recipe as $ingredientName => $quantity) {
                $ingredientId = Ingredient::where('name', $ingredientName)->value('id');
                if ($ingredientId) {
                    $sync[$ingredientId] = ['quantity' => $quantity];
                }
            }
            $product->ingredients()->sync($sync);
        }
    }
}
