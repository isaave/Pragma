<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ingredients', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('unit', 50)->default('unidades');      // ex.: unidades, hambúrgueres, kg
            $table->decimal('quantity', 10, 2)->default(0);       // quantidade atual em estoque
            $table->decimal('capacity', 10, 2);                   // capacidade máxima ("75% de 100")
            $table->date('expiry_date')->nullable();              // validade do lote
            $table->date('last_purchase_date')->nullable();       // última compra / última adição
            $table->text('notes')->nullable();                    // observações
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ingredients');
    }
};
