<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ingredients', function (Blueprint $table) {
            $table->decimal('unit_cost', 10, 2)->default(0)->after('capacity');
        });

        Schema::table('ingredient_movements', function (Blueprint $table) {
            // Custo unitário congelado no momento da movimentação
            $table->decimal('unit_cost', 10, 2)->default(0)->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('ingredient_movements', function (Blueprint $table) {
            $table->dropColumn('unit_cost');
        });

        Schema::table('ingredients', function (Blueprint $table) {
            $table->dropColumn('unit_cost');
        });
    }
};
