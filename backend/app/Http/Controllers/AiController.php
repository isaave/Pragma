<?php

namespace App\Http\Controllers;

use App\Models\Ingredient;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class AiController extends Controller
{
    // Endpoint: POST /api/ai/ask  { question: "..." }
    public function ask(Request $request)
    {
        $data = $request->validate([
            'question' => 'required|string|max:1000',
        ]);

        $question = trim($data['question']);
        $context  = $this->buildBusinessContext();

        $apiKey = env('OPENAI_API_KEY');
        $model  = env('OPENAI_MODEL', 'gpt-4o-mini');

        if (empty($apiKey)) {
            // Modo offline: devolve um resumo simples sem IA
            return response()->json([
                'answer'  => "Ainda não configurei uma chave de IA. Defina OPENAI_API_KEY no .env do backend.\n\n" .
                             "Enquanto isso, aqui está um resumo dos dados:\n\n" . $context,
                'offline' => true,
            ]);
        }

        try {
            $response = Http::withToken($apiKey)
                ->timeout(30)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => $model,
                    'messages' => [
                        [
                            'role'    => 'system',
                            'content' => "Você é o assistente de IA do sistema Pragma (House Burguer). " .
                                         "Responda em português de Portugal, de forma clara, objetiva e profissional. " .
                                         "Use os dados abaixo para responder às perguntas do gestor sobre vendas, " .
                                         "movimentação de dinheiro, estoque, produtos e pedidos. " .
                                         "Se a resposta não puder ser calculada com os dados fornecidos, diga isso.\n\n" .
                                         "DADOS DO NEGÓCIO:\n" . $context,
                        ],
                        [
                            'role'    => 'user',
                            'content' => $question,
                        ],
                    ],
                    'temperature' => 0.3,
                    'max_tokens'  => 600,
                ]);

            if (!$response->successful()) {
                return response()->json([
                    'answer' => 'Não consegui consultar a IA agora. Tente novamente em instantes.',
                    'error'  => $response->json('error.message', 'erro desconhecido'),
                ], 502);
            }

            $answer = $response->json('choices.0.message.content', 'Sem resposta.');

            return response()->json([
                'answer'  => $answer,
                'offline' => false,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'answer' => 'Ocorreu um erro ao consultar a IA: ' . $e->getMessage(),
            ], 500);
        }
    }

    // Reúne um resumo dos dados de negócio para dar contexto à IA
    private function buildBusinessContext(): string
    {
        $lines = [];

        // Vendas
        $totalRevenue   = (float) Order::where('status', '!=', 'cancelled')->sum('total');
        $todayRevenue   = (float) Order::where('status', '!=', 'cancelled')->whereDate('created_at', now())->sum('total');
        $ordersCount    = Order::count();
        $ordersByStatus = Order::select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        $lines[] = "Receita total (excl. cancelados): R$ " . number_format($totalRevenue, 2, ',', '.');
        $lines[] = "Receita de hoje: R$ " . number_format($todayRevenue, 2, ',', '.');
        $lines[] = "Total de pedidos: " . $ordersCount;
        $lines[] = "Pedidos por status: " . json_encode($ordersByStatus, JSON_UNESCAPED_UNICODE);

        // Produtos mais vendidos
        $topProducts = DB::table('order_items')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->select('products.name', DB::raw('SUM(order_items.quantity) as qty'), DB::raw('SUM(order_items.subtotal) as revenue'))
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('qty')
            ->limit(5)
            ->get();

        if ($topProducts->isNotEmpty()) {
            $lines[] = "Produtos mais vendidos (top 5):";
            foreach ($topProducts as $p) {
                $lines[] = "  - {$p->name}: {$p->qty} unid. / R$ " . number_format($p->revenue, 2, ',', '.');
            }
        }

        // Estoque crítico
        $lowStock = Ingredient::whereRaw('quantity <= capacity * 0.25')->get(['name', 'quantity', 'unit', 'capacity']);
        if ($lowStock->isNotEmpty()) {
            $lines[] = "Ingredientes com estoque baixo/crítico:";
            foreach ($lowStock as $i) {
                $lines[] = "  - {$i->name}: {$i->quantity} {$i->unit} (capacidade {$i->capacity})";
            }
        }

        // Pedidos recentes
        $recent = Order::with(['items.product', 'user'])->latest()->limit(5)->get();
        if ($recent->isNotEmpty()) {
            $lines[] = "Últimos pedidos:";
            foreach ($recent as $o) {
                $items = $o->items->map(fn ($it) => $it->quantity . 'x ' . $it->product->name)->implode(', ');
                $lines[] = "  - #{$o->id} ({$o->status}) R$ " . number_format($o->total, 2, ',', '.') . " — {$items} [{$o->user->name}]";
            }
        }

        // Produtos ativos
        $activeProducts = Product::where('is_active', true)->where('status', 'ativo')->count();
        $lines[] = "Produtos ativos: " . $activeProducts;

        return implode("\n", $lines);
    }
}
