<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Ingredient;
use App\Models\IngredientMovement;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\StoreSession;
use App\Services\AlertService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Fonte única de verdade do painel: todos os números vêm das movimentações
 * reais do sistema (pedidos, itens, adicionais, estoque, saídas e sessões).
 */
class ReportController extends Controller
{
    public function dashboard(Request $request)
    {
        // Alertas de estoque refletem sempre o estado atual do sistema.
        app(AlertService::class)->syncLowStock();

        $orders = Order::with([
            'items.product:id,name,category',
            'items.addons:id,order_item_id,product_addon_id,quantity,unit_price',
            'statusHistory.user:id,name',
            'user:id,name',
        ])->get();

        $validOrders = $orders->where('status', '!=', 'cancelled');
        $revenue = (float) $validOrders->sum('total');
        $delivered = $orders->where('status', 'delivered')->count();
        $cancelled = $orders->where('status', 'cancelled')->count();

        $today = now()->startOfDay();
        $yesterday = $today->copy()->subDay();
        $tomorrow = $today->copy()->addDay();

        $revenueIn = fn ($from, $to) => (float) $orders
            ->where('status', '!=', 'cancelled')
            ->filter(fn ($o) => $o->created_at && $o->created_at->gte($from) && $o->created_at->lt($to))
            ->sum('total');

        $deliveredIn = fn ($from, $to) => $orders
            ->where('status', 'delivered')
            ->filter(fn ($o) => $o->created_at && $o->created_at->gte($from) && $o->created_at->lt($to))
            ->count();

        // Custos reais de produção: cada movimentação de venda guarda o custo
        // unitário do ingrediente no momento em que foi consumida.
        $productionCost = (float) DB::table('ingredient_movements')
            ->where('type', 'sale')
            ->sum(DB::raw('quantity * unit_cost'));

        $expensesTotal = (float) Expense::sum('value');
        $outgoing = $productionCost + $expensesTotal;
        $profit = $revenue - $outgoing;

        $costIn = function ($from, $to) {
            $movements = (float) DB::table('ingredient_movements')
                ->join('order_items', 'order_items.id', '=', 'ingredient_movements.order_item_id')
                ->join('orders', 'orders.id', '=', 'order_items.order_id')
                ->where('ingredient_movements.type', 'sale')
                ->where('orders.created_at', '>=', $from)
                ->where('orders.created_at', '<', $to)
                ->sum(DB::raw('ingredient_movements.quantity * ingredient_movements.unit_cost'));

            $expenses = (float) Expense::whereBetween('created_at', [$from, $to])->sum('value');
            return $movements + $expenses;
        };

        $revenueToday = $revenueIn($today, $tomorrow);
        $revenueYesterday = $revenueIn($yesterday, $today);
        $deliveredToday = $deliveredIn($today, $tomorrow);
        $deliveredYesterday = $deliveredIn($yesterday, $today);
        $outToday = $costIn($today, $tomorrow);
        $outYesterday = $costIn($yesterday, $today);

        $pct = fn ($current, $previous) => $previous > 0
            ? round((($current - $previous) / $previous) * 100, 1)
            : 0.0;

        $kpis = [
            ['id' => 'revenue', 'label' => 'Faturamento Total', 'value' => $revenue, 'change' => $pct($revenueToday, $revenueYesterday), 'hint' => 'vs. ontem'],
            ['id' => 'orders', 'label' => 'Pedidos Concluídos', 'value' => $delivered, 'change' => $pct($deliveredToday, $deliveredYesterday), 'hint' => 'vs. ontem'],
            ['id' => 'out', 'label' => 'Saída', 'value' => $outgoing, 'change' => $pct($outToday, $outYesterday), 'hint' => 'custo de produção + despesas'],
            ['id' => 'profit', 'label' => 'Lucro Estimado', 'value' => $profit, 'change' => $pct($revenueToday - $outToday, $revenueYesterday - $outYesterday), 'hint' => 'faturamento - saídas'],
        ];

        // Produtos mais vendidos e faturamento por categoria (com adicionais)
        $productAgg = [];
        $categoryAgg = [];
        foreach ($validOrders as $order) {
            foreach ($order->items as $item) {
                $name = $item->product?->name ?? 'Produto';
                $category = $item->product?->category ?? 'outros';
                $addons = (float) $item->addons->sum(fn ($a) => (float) $a->unit_price * (int) $a->quantity);
                $value = (float) $item->subtotal + $addons;

                // Escreve de volta no array: ??= devolve uma cópia em PHP,
                // então acumular na variável $entry não atualizava o agregado.
                if (!isset($productAgg[$name])) {
                    $productAgg[$name] = ['name' => $name, 'units' => 0, 'value' => 0.0];
                }
                $productAgg[$name]['units'] += (int) $item->quantity;
                $productAgg[$name]['value'] += $value;

                if (!isset($categoryAgg[$category])) {
                    $categoryAgg[$category] = ['category' => $category, 'value' => 0.0];
                }
                $categoryAgg[$category]['value'] += $value;
            }
        }

        $topProducts = collect($productAgg)->sortByDesc('units')->take(5)->values()->map(fn ($p) => [
            'name' => $p['name'],
            'units' => (int) $p['units'],
            'value' => round($p['value'], 2),
        ])->toArray();

        $categories = collect($categoryAgg)->sortByDesc('value')->take(3)->values()->map(fn ($c) => [
            'category' => $c['category'],
            'value' => round($c['value'], 2),
        ])->toArray();

        // Fluxo de caixa por hora (dia atual), com vendas, custos e lucro reais.
        // Cobre as 24 horas: pedidos podem ser criados fora do horário 11h-23h.
        $hours = array_map(fn ($h) => sprintf('%02d:00', $h), range(0, 23));
        $salesByHour = array_fill(0, count($hours), 0.0);
        $costsByHour = array_fill(0, count($hours), 0.0);

        foreach ($orders as $order) {
            if (!$order->created_at || $order->created_at < $today || $order->status === 'cancelled') {
                continue;
            }
            $index = (int) $order->created_at->format('G');
            if ($index >= 0 && $index < count($hours)) {
                $salesByHour[$index] += (float) $order->total;
            }
        }

        $hourlyMovements = DB::table('ingredient_movements')
            ->join('order_items', 'order_items.id', '=', 'ingredient_movements.order_item_id')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('ingredient_movements.type', 'sale')
            ->where('orders.created_at', '>=', $today)
            ->select(
                'orders.created_at as occurred_at',
                DB::raw('ingredient_movements.quantity * ingredient_movements.unit_cost as cost')
            )
            ->get();

        foreach ($hourlyMovements as $movement) {
            $index = (int) optional(\Carbon\Carbon::parse($movement->occurred_at))->format('G');
            if ($index >= 0 && $index < count($hours)) {
                $costsByHour[$index] += (float) $movement->cost;
            }
        }

        foreach (Expense::whereDate('created_at', $today->toDateString())->get() as $expense) {
            $index = (int) $expense->created_at->format('G');
            if ($index >= 0 && $index < count($hours)) {
                $costsByHour[$index] += (float) $expense->value;
            }
        }

        $cashFlow = [
            'hours' => $hours,
            'sales' => array_map(fn ($v) => round($v, 2), $salesByHour),
            'costs' => array_map(fn ($v) => round($v, 2), $costsByHour),
            'profit' => array_map(fn ($i) => round($salesByHour[$i] - $costsByHour[$i], 2), array_keys($hours)),
        ];

        // Alertas de estoque a partir dos dados reais dos ingredientes
        $lowStock = Ingredient::all()->filter(fn ($i) =>
            (float) $i->quantity <= 0 || (float) $i->quantity <= (float) $i->capacity * 0.25
        )->map(fn ($i) => [
            'id' => $i->id,
            'name' => $i->name,
            'current' => (float) $i->quantity,
            'min' => round((float) $i->capacity * 0.25, 2),
            'unit' => $i->unit,
            'status' => $i->stock_status,
            'badge' => $i->stock_status === 'Em falta' ? 'Crítico' : 'Atenção',
        ])->values()->toArray();

        // Atividades recentes de todas as movimentações do sistema
        $activities = [];
        foreach (OrderStatusHistory::with(['order:id', 'user:id,name'])->latest()->limit(12)->get() as $history) {
            $activities[] = [
                'at' => optional($history->created_at)->toIso8601String(),
                'text' => 'Pedido #' . str_pad((string) $history->order_id, 4, '0', STR_PAD_LEFT)
                    . ' — status ' . $history->status . ($history->user ? ' por ' . $history->user->name : ''),
            ];
        }
        foreach (IngredientMovement::where('type', 'restock')->with('ingredient:id,name')->latest()->limit(6)->get() as $movement) {
            $activities[] = [
                'at' => optional($movement->created_at)->toIso8601String(),
                'text' => 'Estoque reposto: ' . $movement->quantity . ' '
                    . ($movement->ingredient?->unit ?? '') . ' de ' . ($movement->ingredient?->name ?? 'ingrediente'),
            ];
        }
        foreach (Expense::with('user:id,name')->latest()->limit(6)->get() as $expense) {
            $activities[] = [
                'at' => optional($expense->created_at)->toIso8601String(),
                'text' => 'Saída registada: ' . $expense->description . ' — R$ ' . number_format((float) $expense->value, 2, ',', '.'),
            ];
        }
        foreach (StoreSession::with(['openedBy:id,name', 'closedBy:id,name'])->latest('opened_at')->limit(6)->get() as $session) {
            $activities[] = [
                'at' => optional($session->opened_at)->toIso8601String(),
                'text' => 'Negócio aberto' . ($session->openedBy ? ' por ' . $session->openedBy->name : ''),
            ];
            if ($session->closed_at) {
                $activities[] = [
                    'at' => optional($session->closed_at)->toIso8601String(),
                    'text' => 'Negócio fechado' . ($session->closedBy ? ' por ' . $session->closedBy->name : ''),
                ];
            }
        }
        usort($activities, fn ($a, $b) => strcmp((string) $b['at'], (string) $a['at']));

        $expenses = Expense::with('user:id,name')->latest()->limit(20)->get()->map(fn (Expense $e) => [
            'id' => $e->id,
            'description' => $e->description,
            'value' => (float) $e->value,
            'expense_date' => optional($e->expense_date)->format('Y-m-d'),
            'user' => $e->user?->name,
        ])->toArray();

        return response()->json([
            'generated_at' => now()->toIso8601String(),
            'kpis' => $kpis,
            'cash_flow' => $cashFlow,
            'top_products' => $topProducts,
            'categories' => $categories,
            'low_stock' => $lowStock,
            'activities' => array_slice($activities, 0, 8),
            'expenses' => $expenses,
            'summary' => [
                'total_orders' => $orders->count(),
                'valid_orders' => $validOrders->count(),
                'delivered_orders' => $delivered,
                'cancelled_orders' => $cancelled,
                'production_cost' => round($productionCost, 2),
                'expenses_total' => round($expensesTotal, 2),
                'outgoing_total' => round($outgoing, 2),
                'profit' => round($profit, 2),
                'average_ticket' => $validOrders->count() > 0 ? round($revenue / $validOrders->count(), 2) : 0,
                'active_products' => Product::whereNull('deleted_at')->where('is_active', true)->where('status', 'ativo')->count(),
                'sessions' => StoreSession::count(),
            ],
        ]);
    }
}
