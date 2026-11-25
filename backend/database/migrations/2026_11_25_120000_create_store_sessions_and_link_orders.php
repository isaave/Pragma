<?php

use App\Models\Order;
use App\Models\StoreSession;
use App\Models\StoreSetting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_sessions', function (Blueprint $table) {
            $table->id();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('opened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('store_session_id')
                ->nullable()
                ->after('user_id')
                ->constrained('store_sessions')
                ->nullOnDelete();
        });

        // Pedidos anteriores a esta versão passam a pertencer a uma única sessão.
        // Se o negócio estiver aberto, essa sessão continua aberta e os pedidos
        // permanecem na gestão até o próximo fechamento.
        $firstOrder = Order::oldest()->first();
        if (! $firstOrder) {
            return;
        }

        $setting = StoreSetting::first();
        $isOpen = (bool) ($setting?->is_open);
        $openedAt = $firstOrder->created_at;
        $reference = $setting?->updated_at;
        $closedAt = ! $isOpen
            ? ($reference && $reference->greaterThan($openedAt) ? $reference : now())
            : null;

        $legacySession = StoreSession::create([
            'opened_at' => $openedAt,
            'closed_at' => $closedAt,
            'opened_by' => $setting?->updated_by,
            'closed_by' => $isOpen ? null : $setting?->updated_by,
        ]);

        Order::query()
            ->whereNull('store_session_id')
            ->update(['store_session_id' => $legacySession->id]);
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('store_session_id');
        });

        Schema::dropIfExists('store_sessions');
    }
};
