<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('category', 30);                   // hamburguer | combo | acompanhamento | bebida | sobremesa
            $table->string('description')->nullable();        // texto curto do card ("1 patty, salada, maionese")
            $table->decimal('price', 8, 2);
            $table->boolean('is_active')->default(true);      // Ativo / Inativo
            $table->text('notes')->nullable();                // observações
            $table->timestamps();
        });

        // Receita do produto: quais ingredientes do estoque ele usa e em que quantidade
        Schema::create('ingredient_product', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ingredient_id')->constrained()->restrictOnDelete(); // não deixa apagar ingrediente em uso
            $table->decimal('quantity', 10, 2);
            $table->unique(['product_id', 'ingredient_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ingredient_product');
        Schema::dropIfExists('products');
    }
};
