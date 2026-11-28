<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Um produto que já aparece em pedidos não pode ser removido do banco
            // (FK de order_items). Ele é arquivado e deixa de aparecer no cardápio.
            $table->timestamp('deleted_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('deleted_at');
        });
    }
};
