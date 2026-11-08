<?php

namespace Database\Seeders;

use App\Models\Ingredient;
use Illuminate\Database\Seeder;

// Dados de exemplo para testar a tela de estoque.
// Rodar sozinho (pode repetir sem duplicar):  php artisan db:seed --class=IngredientSeeder
class IngredientSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            // nome, unidade, quantidade, capacidade, dias p/ validade, dias desde a última compra
            ['Pão australiano', 'hambúrgueres', 75, 100, 30, 5],
            ['Carne', 'hambúrgueres', 70, 100, 20, 3],
            ['Queijo', 'hambúrgueres', 75, 100, 25, 4],
            ['Bacon', 'unidades', 45, 50, 15, 6],
            ['Alface', 'unidades', 120, 200, 4, 2],       // validade próxima
            ['Tomate', 'unidades', 80, 100, 10, 3],
            ['Cebola roxa', 'unidades', 10, 100, 12, 8],  // estoque baixo
            ['Picles', 'unidades', 30, 50, 40, 9],
            ['Maionese', 'unidades', 12, 15, 60, 7],
            ['Ketchup', 'unidades', 18, 20, 90, 10],
            ['Ovo', 'unidades', 0, 300, 14, 12],          // em falta
        ];

        foreach ($items as [$name, $unit, $quantity, $capacity, $expiresInDays, $boughtDaysAgo]) {
            Ingredient::updateOrCreate(
                ['name' => $name],
                [
                    'unit' => $unit,
                    'quantity' => $quantity,
                    'capacity' => $capacity,
                    'expiry_date' => now()->addDays($expiresInDays)->toDateString(),
                    'last_purchase_date' => now()->subDays($boughtDaysAgo)->toDateString(),
                    'notes' => null,
                ]
            );
        }
    }
}
