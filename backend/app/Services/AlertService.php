<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Ingredient;
use App\Models\Notification;
use App\Models\Order;
use App\Models\User;

/**
 * Centraliza o disparo de alertas do Pragma.
 *
 * As notificações são persistentes e por usuário: cada alerta cria uma linha
 * para cada usuário ativo, com dados de destino para navegação direta.
 */
class AlertService
{
    private const STATUS_LABELS = [
        'pending' => 'Pendente',
        'development' => 'Em preparo',
        'preparing' => 'Preparando',
        'ready' => 'Pronto',
        'delivered' => 'Entregue',
        'cancelled' => 'Cancelado',
        'not_delivered' => 'Não entregue',
        'late' => 'Atrasado',
    ];

    private const STOCK_TYPES = ['low_stock', 'critical_stock'];

    /** Novo pedido registrado. */
    public function newOrder(Order $order): void
    {
        $this->broadcast([
            'type' => 'new_order',
            'title' => 'Novo pedido ' . $this->orderNumber($order),
            'message' => $order->customer_name
                ? "Pedido de {$order->customer_name} aguardando preparo."
                : 'Novo pedido aguardando preparo.',
            'target_view' => 'orders',
            'resource_type' => 'order',
            'resource_id' => (string) $order->id,
            'highlight' => true,
        ], true);
    }

    /** Mudança relevante de status do pedido. */
    public function orderStatus(Order $order, string $status, ?string $reason = null): void
    {
        if (! in_array($status, ['ready', 'delivered', 'cancelled', 'not_delivered', 'late'], true)) {
            return;
        }

        $label = self::STATUS_LABELS[$status] ?? $status;
        $message = "Pedido {$this->orderNumber($order)} agora está {$label}.";
        if ($reason) {
            $message .= ' Motivo: ' . $reason;
        }

        $this->broadcast([
            'type' => 'order_status',
            'title' => 'Pedido ' . $this->orderNumber($order) . ': ' . $label,
            'message' => $message,
            'target_view' => 'orders',
            'resource_type' => 'order',
            'resource_id' => (string) $order->id,
            'highlight' => true,
        ]);
    }

    /** Saída registrada no caixa. */
    public function expenseCreated(Expense $expense, string $author): void
    {
        $this->broadcast([
            'type' => 'expense',
            'title' => 'Saída registrada',
            'message' => "{$author} registou {$expense->description} por R$ " . number_format((float) $expense->value, 2, ',', '.') . '.',
            'target_view' => 'reports',
            'resource_type' => 'expense',
            'resource_id' => (string) $expense->id,
            'highlight' => false,
        ]);
    }

    /** Abertura/fechamento do negócio. */
    public function storeStatus(bool $isOpen, string $author, ?int $sessionId = null): void
    {
        $this->broadcast([
            'type' => 'store_status',
            'title' => $isOpen ? 'Negócio aberto' : 'Negócio fechado',
            'message' => "{$author} " . ($isOpen ? 'abriu' : 'fechou') . ' o negócio.',
            'target_view' => 'history',
            'resource_type' => 'store_session',
            'resource_id' => $sessionId !== null ? (string) $sessionId : null,
            'highlight' => false,
        ]);
    }

    /** Reavalia o estoque dos ingredientes informados após consumo/reposição. */
    public function checkIngredients(array $ids): void
    {
        $ids = array_values(array_filter(array_unique($ids), fn ($id) => $id !== null && $id !== ''));

        if ($ids === []) {
            return;
        }

        Ingredient::whereIn('id', $ids)->get()->each(function (Ingredient $ingredient) {
            $this->syncIngredient($ingredient);
        });
    }

    /** Remove alertas de um ingrediente excluído. */
    public function forgetIngredient(int $ingredientId): void
    {
        Notification::where('resource_type', 'ingredient')
            ->where('resource_id', (string) $ingredientId)
            ->delete();
    }

    /** Sincroniza todos os alertas de estoque com a movimentação real do sistema. */
    public function syncLowStock(): void
    {
        Ingredient::query()->get()->each(function (Ingredient $ingredient) {
            $this->syncIngredient($ingredient);
        });
    }

    /** Cria/atualiza/resolve o alerta de estoque de um ingrediente. */
    private function syncIngredient(Ingredient $ingredient): void
    {
        $quantity = (float) $ingredient->quantity;
        $capacity = (float) $ingredient->capacity;
        $percentage = $capacity > 0 ? ($quantity / $capacity) * 100 : 0;

        $type = $quantity <= 0 || $percentage <= 0
            ? 'critical_stock'
            : ($percentage <= Ingredient::LOW_PERCENT ? 'low_stock' : null);

        if ($type === null) {
            Notification::whereIn('type', self::STOCK_TYPES)
                ->where('resource_type', 'ingredient')
                ->where('resource_id', (string) $ingredient->id)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);

            return;
        }

        $value = number_format($quantity, 2, ',', '.');
        $unit = $ingredient->unit ?: 'un';
        $title = $type === 'critical_stock'
            ? "Estoque crítico: {$ingredient->name}"
            : "Estoque baixo: {$ingredient->name}";
        $message = $type === 'critical_stock'
            ? "{$ingredient->name} está sem estoque ({$value} {$unit}). Reposição necessária."
            : "{$ingredient->name} está com " . number_format($percentage, 0) . "% da capacidade ({$value} {$unit}).";

        $payload = [
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'target_view' => 'stock',
            'resource_type' => 'ingredient',
            'resource_id' => (string) $ingredient->id,
            'highlight' => true,
        ];

        foreach ($this->activeUsers() as $user) {
            $existing = Notification::where('user_id', $user->id)
                ->whereIn('type', self::STOCK_TYPES)
                ->where('resource_type', 'ingredient')
                ->where('resource_id', (string) $ingredient->id)
                ->whereNull('read_at')
                ->first();

            if ($existing) {
                // Uma alteração de gravidade atualiza o alerta existente,
                // evitando repetir o mesmo aviso para o mesmo ingrediente.
                if ($existing->type !== $type || $existing->message !== $message) {
                    $existing->update($payload);
                }
                continue;
            }

            Notification::create($payload + ['user_id' => $user->id]);
        }
    }

    /** Cria um alerta para cada usuário ativo, evitando duplicatas não lidas. */
    private function broadcast(array $payload, bool $oncePerResource = false): void
    {
        foreach ($this->activeUsers() as $user) {
            $query = Notification::where('user_id', $user->id)
                ->where('type', $payload['type'])
                ->whereNull('read_at');

            if ($oncePerResource) {
                $query->where('resource_type', $payload['resource_type'] ?? null)
                    ->where('resource_id', $payload['resource_id'] ?? null);
            }

            if ($query->exists()) {
                continue;
            }

            Notification::create($payload + ['user_id' => $user->id]);
        }
    }

    private function activeUsers()
    {
        $users = User::where('status', 'Ativo')->get();

        return $users->isNotEmpty() ? $users : User::all();
    }

    private function orderNumber(Order $order): string
    {
        return '#' . str_pad((string) $order->id, 4, '0', STR_PAD_LEFT);
    }
}
