<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ingredient_product', function (Blueprint $table) {
            // Unidade usada pela receita do produto (unidade, grama, kilos, ...).
            // Nula mantém o comportamento antigo: usar a unidade do ingrediente.
            $table->string('unit', 50)->nullable()->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('ingredient_product', function (Blueprint $table) {
            $table->dropColumn('unit');
        });
    }
};
