<?php

namespace Ai;

use App\Models\Expense;
use App\Models\Ingredient;
use App\Models\IngredientMovement;
use App\Models\Order;
use App\Models\Product;
use App\Models\StoreSession;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Consultas reais ao banco usadas pelo assistente, pelas ferramentas e pelo modo offline.
 */
class BusinessData
{
    public static function money($value): string
    {
        return 'R$ ' . number_format((float) $value, 2, ',', '.');
    }

    /** Remove acentos e normaliza para comparação de intenções. */
    public static function normalize(string $text): string
    {
        $text = mb_strtolower($text, 'UTF-8');
        $text = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text) ?: $text;
        return preg_replace('/[^a-z0-9\s]/', ' ', $text) ?? $text;
    }

    /** @return array<string, mixed> */
    public function metrics(string $period = 'all'): array
    {
        $period = in_array($period, ['today', 'yesterday', 'week', 'month', 'all'], true) ? $period : 'all';

        $revenueQuery = Order::query()->where('status', '!=', 'cancelled');
        $allQuery = Order::query();
        $this->applyPeriod($revenueQuery, $period);
        $this->applyPeriod($allQuery, $period);

        $revenue = (float) (clone $revenueQuery)->sum('total');
        $paidOrders = (int) (clone $revenueQuery)->count();
        $delivered = (int) (clone $allQuery)->where('status', 'delivered')->count();
        $cancelled = (int) (clone $allQuery)->where('status', 'cancelled')->count();
        $totalOrders = (int) (clone $allQuery)->count();

        $byStatus = (clone $allQuery)
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        $topProducts = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->where('orders.status', '!=', 'cancelled')
            ->when($period !== 'all', function ($q) use ($period) {
                $q->where('orders.created_at', '>=', $this->periodStart($period))
                  ->where('orders.created_at', '<', now());
            })
            ->select('products.name', DB::raw('SUM(order_items.quantity) as qty'), DB::raw('SUM(order_items.subtotal) as revenue'))
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('qty')
            ->limit(5)
            ->get()
            ->map(fn ($p) => [
                'name' => $p->name,
                'quantity' => (int) $p->qty,
                'revenue' => (float) $p->revenue,
            ])->toArray();

        $byCategory = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->where('orders.status', '!=', 'cancelled')
            ->when($period !== 'all', function ($q) use ($period) {
                $q->where('orders.created_at', '>=', $this->periodStart($period))
                  ->where('orders.created_at', '<', now());
            })
            ->select('products.category', DB::raw('SUM(order_items.subtotal) as revenue'))
            ->groupBy('products.category')
            ->orderByDesc('revenue')
            ->get()
            ->map(fn ($c) => ['category' => $c->category, 'revenue' => (float) $c->revenue])
            ->toArray();

        return [
            'period' => $period,
            'revenue' => $revenue,
            'paid_orders' => $paidOrders,
            'total_orders' => $totalOrders,
            'delivered' => $delivered,
            'cancelled' => $cancelled,
            'average_ticket' => $paidOrders > 0 ? $revenue / $paidOrders : 0.0,
            'production_cost' => $this->productionCost($period),
            'expenses' => $this->expensesTotal($period),
            'profit' => $revenue - $this->productionCost($period) - $this->expensesTotal($period),
            'by_status' => $byStatus,
            'top_products' => $topProducts,
            'by_category' => $byCategory,
        ];
    }

    private function productionCost(string $period): float
    {
        $query = DB::table('ingredient_movements')
            ->join('order_items', 'order_items.id', '=', 'ingredient_movements.order_item_id')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('ingredient_movements.type', 'sale');

        if ($period !== 'all') {
            $query->where('orders.created_at', '>=', $this->periodStart($period))
                  ->where('orders.created_at', '<', $period === 'yesterday' ? now()->startOfDay() : now());
        }

        return (float) $query->sum(DB::raw('ingredient_movements.quantity * ingredient_movements.unit_cost'));
    }

    private function expensesTotal(string $period): float
    {
        $query = Expense::query();
        if ($period === 'today') {
            $query->whereDate('expense_date', now()->toDateString());
        } elseif ($period === 'yesterday') {
            $query->whereDate('expense_date', now()->subDay()->toDateString());
        } elseif ($period === 'week') {
            $query->whereBetween('expense_date', [now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString()]);
        } elseif ($period === 'month') {
            $query->whereBetween('expense_date', [now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateString()]);
        }
        return (float) $query->sum('value');
    }

    /** @return array<int, array<string, mixed>> */
    public function expenses(string $period = 'all'): array
    {
        $query = Expense::with('user:id,name')->latest('expense_date')->latest();
        if ($period === 'today') {
            $query->whereDate('expense_date', now()->toDateString());
        } elseif ($period === 'month') {
            $query->whereBetween('expense_date', [now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateString()]);
        }
        return $query->limit(50)->get()->map(fn (Expense $e) => [
            'id' => $e->id,
            'description' => $e->description,
            'value' => (float) $e->value,
            'expense_date' => optional($e->expense_date)->format('Y-m-d'),
            'user' => $e->user?->name,
        ])->toArray();
    }

    /** Fluxo de caixa por hora do dia atual, com custos e saídas reais. */
    public function cashFlow(): array
    {
        $hours = array_map(fn ($h) => sprintf('%02d:00', $h), range(11, 23));
        $sales = array_fill(0, count($hours), 0.0);
        $costs = array_fill(0, count($hours), 0.0);

        Order::whereDate('created_at', now()->toDateString())
            ->where('status', '!=', 'cancelled')
            ->get(['created_at', 'total'])
            ->each(function ($o) use (&$sales, $hours) {
                $index = (int) $o->created_at->format('G') - 11;
                if ($index >= 0 && $index < count($hours)) {
                    $sales[$index] += (float) $o->total;
                }
            });

        DB::table('ingredient_movements')
            ->join('order_items', 'order_items.id', '=', 'ingredient_movements.order_item_id')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('ingredient_movements.type', 'sale')
            ->whereDate('orders.created_at', now()->toDateString())
            ->select('orders.created_at as occurred_at', DB::raw('ingredient_movements.quantity * ingredient_movements.unit_cost as cost'))
            ->get()
            ->each(function ($m) use (&$costs, $hours) {
                $index = (int) \Carbon\Carbon::parse($m->occurred_at)->format('G') - 11;
                if ($index >= 0 && $index < count($hours)) {
                    $costs[$index] += (float) $m->cost;
                }
            });

        Expense::whereDate('created_at', now()->toDateString())->get()->each(function ($e) use (&$costs, $hours) {
            $index = (int) $e->created_at->format('G') - 11;
            if ($index >= 0 && $index < count($hours)) {
                $costs[$index] += (float) $e->value;
            }
        });

        return [
            'hours' => $hours,
            'sales' => array_map(fn ($v) => round($v, 2), $sales),
            'costs' => array_map(fn ($v) => round($v, 2), $costs),
            'profit' => array_map(fn ($i) => round($sales[$i] - $costs[$i], 2), array_keys($hours)),
        ];
    }

    private function periodStart(string $period)
    {
        return match ($period) {
            'today' => now()->startOfDay(),
            'yesterday' => now()->subDay()->startOfDay(),
            'week' => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            default => now()->subYears(50),
        };
    }

    private function applyPeriod(Builder $query, string $period): void
    {
        if ($period !== 'all') {
            $query->where('created_at', '>=', $this->periodStart($period))
                  ->where('created_at', '<', $period === 'yesterday' ? now()->startOfDay() : now());
        }
    }

    /** @return array<int, array<string, mixed>> */
    public function stockAlerts(): array
    {
        return Ingredient::query()->get()->filter(function (Ingredient $i) {
            return (float) $i->quantity <= 0
                || (float) $i->quantity <= (float) $i->capacity * 0.25
                || $i->near_expiry;
        })->map(fn (Ingredient $i) => [
            'id' => $i->id,
            'name' => $i->name,
            'quantity' => (float) $i->quantity,
            'unit' => $i->unit,
            'capacity' => (float) $i->capacity,
            'status' => $i->stock_status,
            'near_expiry' => (bool) $i->near_expiry,
            'expiry_date' => optional($i->expiry_date)->format('Y-m-d'),
        ])->values()->toArray();
    }

    /** @return array<int, array<string, mixed>> */
    public function orders(?string $status = null, int $limit = 10, string $scope = 'current'): array
    {
        $query = Order::query()->with(['user:id,name', 'items.product:id,name'])->latest();

        if ($status && in_array($status, $this->statuses(), true)) {
            $query->where('status', $status);
        }

        $openSession = StoreSession::whereNull('closed_at')->latest('opened_at')->first();
        if ($scope === 'history') {
            $query->where(function ($q) {
                $q->whereHas('storeSession', fn ($q2) => $q2->whereNotNull('closed_at'))
                  ->orWhereNull('store_session_id');
            });
        } elseif ($openSession) {
            $query->where('store_session_id', $openSession->id);
        }

        return $query->limit(min($limit, 50))->get()->map(fn (Order $o) => $this->orderArray($o))->toArray();
    }

    /** @return array<string, mixed>|null */
    public function order(int $id): ?array
    {
        $order = Order::with(['user:id,name', 'items.product:id,name', 'statusHistory.user:id,name', 'storeSession'])->find($id);
        return $order ? $this->orderArray($order, true) : null;
    }

    private function orderArray(Order $o, bool $detailed = false): array
    {
        $data = [
            'id' => $o->id,
            'status' => $o->status,
            'total' => (float) $o->total,
            'customer_name' => $o->customer_name,
            'attendant' => $o->user?->name,
            'created_at' => optional($o->created_at)->format('d/m/Y H:i'),
            'items' => $o->items->map(fn ($it) => [
                'product' => $it->product?->name,
                'quantity' => (int) $it->quantity,
                'subtotal' => (float) $it->subtotal,
            ])->toArray(),
        ];
        if ($detailed) {
            $data['notes'] = $o->notes;
            $data['status_history'] = $o->statusHistory->map(fn ($h) => [
                'status' => $h->status,
                'reason' => $h->reason,
                'by' => $h->user?->name,
                'at' => optional($h->created_at)->format('d/m/Y H:i'),
            ])->toArray();
        }
        return $data;
    }

    /** @return array<int, string> */
    public function statuses(): array
    {
        return ['pending', 'development', 'preparing', 'ready', 'delivered', 'cancelled', 'not_delivered', 'late'];
    }

    /** @return array<int, array<string, mixed>> */
    public function products(?string $search = null): array
    {
        return Product::query()
            ->when($search, fn ($q) => $q->where('name', 'like', '%' . $search . '%'))
            ->with('ingredients:id,name')
            ->orderBy('name')
            ->limit(50)
            ->get()
            ->map(fn (Product $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'category' => $p->category,
                'price' => (float) $p->price,
                'status' => $p->status,
                'available' => (bool) $p->available,
                'ingredients' => $p->ingredients->map(fn ($i) => [
                    'id' => $i->id,
                    'name' => $i->name,
                    'quantity' => (float) $i->pivot->quantity,
                ])->toArray(),
            ])->toArray();
    }

    /** @return array<int, array<string, mixed>> */
    public function ingredients(?string $filter = null, ?string $search = null): array
    {
        $query = Ingredient::query();
        if ($search) {
            $query->where('name', 'like', '%' . $search . '%');
        }
        if ($filter === 'low') {
            $query->where('quantity', '>', 0)->whereRaw('quantity <= capacity * 0.25');
        } elseif ($filter === 'out') {
            $query->where('quantity', '<=', 0);
        } elseif ($filter === 'expiring') {
            $query->whereNotNull('expiry_date')->where('expiry_date', '<=', now()->addDays(7)->endOfDay());
        }
        return $query->orderBy('name')->limit(50)->get()->map(fn (Ingredient $i) => [
            'id' => $i->id,
            'name' => $i->name,
            'unit' => $i->unit,
            'quantity' => (float) $i->quantity,
            'capacity' => (float) $i->capacity,
            'status' => $i->stock_status,
            'expiry_date' => optional($i->expiry_date)->format('Y-m-d'),
        ])->toArray();
    }

    /** @return array<int, array<string, mixed>> */
    public function users(): array
    {
        return User::query()->orderBy('name')->limit(50)->get()->map(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role,
            'access_level' => $u->access_level,
            'status' => $u->status,
        ])->toArray();
    }

    /** @return array<string, mixed> */
    public function storeStatus(): array
    {
        $setting = StoreSetting::firstOrCreate(['id' => 1], ['is_open' => true]);
        $session = StoreSession::whereNull('closed_at')->latest('opened_at')->first();
        return [
            'is_open' => (bool) $setting->is_open,
            'session_id' => $session?->id,
            'opened_at' => $session ? optional($session->opened_at)->format('d/m/Y H:i') : null,
        ];
    }

    /** @return array<int, array<string, mixed>> */
    public function sessions(int $limit = 10): array
    {
        return StoreSession::with(['openedBy:id,name', 'closedBy:id,name'])
            ->latest('opened_at')->limit(min($limit, 50))->get()
            ->map(fn (StoreSession $s) => [
                'id' => $s->id,
                'opened_at' => optional($s->opened_at)->format('d/m/Y H:i'),
                'closed_at' => $s->closed_at ? optional($s->closed_at)->format('d/m/Y H:i') : null,
                'opened_by' => $s->openedBy?->name,
                'closed_by' => $s->closedBy?->name,
                'orders_count' => $s->orders()->count(),
                'total' => (float) $s->orders()->sum('total'),
            ])->toArray();
    }

    /** TextoCompacto de contexto para o modelo externo. */
    public function contextText(): string
    {
        $lines = [];
        $today = $this->metrics('today');
        $month = $this->metrics('month');
        $all = $this->metrics('all');

        $lines[] = 'Data/hora atual: ' . now()->format('d/m/Y H:i');
        $lines[] = 'Negócio: ' . ($this->storeStatus()['is_open'] ? 'aberto' : 'fechado');
        $lines[] = 'Faturamento de hoje (excl. cancelados): ' . self::money($today['revenue']) . ' em ' . $today['paid_orders'] . ' pedido(s).';
        $lines[] = 'Faturamento do mês: ' . self::money($month['revenue']) . ' em ' . $month['paid_orders'] . ' pedido(s).';
        $lines[] = 'Faturamento total: ' . self::money($all['revenue']) . ' em ' . $all['paid_orders'] . ' pedido(s).';
        $lines[] = 'Pedidos entregues: ' . $all['delivered'] . '. Cancelados: ' . $all['cancelled'] . '. Ticket médio: ' . self::money($all['average_ticket']) . '.';
        $lines[] = 'Custo de produção (ingredientes consumidos): ' . self::money($all['production_cost']) . '.';
        $lines[] = 'Despesas/saídas registadas: ' . self::money($all['expenses']) . '. Lucro estimado: ' . self::money($all['profit']) . '.';
        $lines[] = 'Pedidos por status: ' . json_encode($all['by_status'], JSON_UNESCAPED_UNICODE);

        $expenses = $this->expenses('month');
        if ($expenses) {
            $lines[] = 'Últimas saídas registadas: ' . implode('; ', array_map(
                fn ($e) => $e['description'] . ' (' . self::money($e['value']) . ', ' . $e['expense_date'] . ')',
                $expenses
            )) . '.';
        }

        if ($all['top_products']) {
            $lines[] = 'Produtos mais vendidos (top 5):';
            foreach ($all['top_products'] as $p) {
                $lines[] = '  - ' . $p['name'] . ': ' . $p['quantity'] . ' unid. / ' . self::money($p['revenue']);
            }
        }
        if ($all['by_category']) {
            $lines[] = 'Faturamento por categoria: ' . json_encode(array_map(
                fn ($c) => [$c['category'] => self::money($c['revenue'])],
                $all['by_category']
            ), JSON_UNESCAPED_UNICODE);
        }

        $alerts = $this->stockAlerts();
        $lines[] = 'Alertas de estoque: ' . ($alerts
            ? implode('; ', array_map(fn ($a) => $a['name'] . ' (' . $a['quantity'] . ' ' . $a['unit'] . ', ' . $a['status'] . ')', $alerts))
            : 'nenhum');

        $recent = $this->orders(null, 5);
        if ($recent) {
            $lines[] = 'Últimos pedidos:';
            foreach ($recent as $o) {
                $lines[] = '  - #' . $o['id'] . ' (' . $o['status'] . ') ' . self::money($o['total'])
                    . ' — ' . implode(', ', array_map(fn ($it) => $it['quantity'] . 'x ' . $it['product'], $o['items']))
                    . ' [' . ($o['customer_name'] ?: $o['attendant']) . ']';
            }
        }

        $lines[] = 'Produtos cadastrados: ' . Product::count() . '. Ingredientes cadastrados: ' . Ingredient::count() . '.';
        return implode("\n", $lines);
    }
}
