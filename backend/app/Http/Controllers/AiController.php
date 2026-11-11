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

        $apiKey = env('GEMINI_API_KEY');
        $model  = env('GEMINI_MODEL', 'gemini-1.5-flash');

        if (empty($apiKey)) {
            // Modo offline: devolve um resumo simples sem IA
            return response()->json([
                'answer'  => "Ainda não configurei uma chave de IA. Defina GEMINI_API_KEY no .env do backend.\n\n" .
                             "Enquanto isso, aqui está um resumo dos dados:\n\n" . $context,
                'offline' => true,
            ]);
        }

        // Lista de modelos a tentar (em ordem de preferência)
        $modelsToTry = [$model, 'gemini-3.8-flash', 'gemma-4-26b-a4b-it'];

        foreach ($modelsToTry as $tryModel) {
            try {
                // API do Google Gemini (Generative Language API)
                $url = "https://generativelanguage.googleapis.com/v1beta/models/{$tryModel}:generateContent?key={$apiKey}";

                $payload = [
                    'systemInstruction' => [
                        'parts' => [
                            ['text' => "Você é o assistente de IA do sistema Pragma (House Burguer). " .
                                       "Responda em português de Portugal, de forma clara, objetiva e profissional. " .
                                       "Use os dados abaixo para responder às perguntas do gestor sobre vendas, " .
                                       "movimentação de dinheiro, estoque, produtos e pedidos. " .
                                       "Se a resposta não puder ser calculada com os dados fornecidos, diga isso. " .
                                       "IMPORTANTE: Responda APENAS com a resposta final, sem incluir raciocínio, " .
                                       "pensamento ou análise intermediária. Não mostre o seu processo de pensamento.\n\n" .
                                       "DADOS DO NEGÓCIO:\n" . $context],
                        ],
                    ],
                    'contents' => [
                        [
                            'role'  => 'user',
                            'parts' => [
                                ['text' => $question],
                            ],
                        ],
                    ],
                    'generationConfig' => [
                        'temperature'     => 0.3,
                        'maxOutputTokens' => 600,
                    ],
                ];

                // thinkingConfig só para modelos que suportam (gemini-3.8-flash)
                if (str_contains($tryModel, 'gemini')) {
                    $payload['generationConfig']['thinkingConfig'] = [
                        'thinkingBudget' => 0,
                    ];
                }

                $response = Http::timeout(30)->post($url, $payload);

                if (!$response->successful()) {
                    // Se for erro de alta demanda ou modelo indisponível, tenta o próximo
                    $errorMsg = $response->json('error.message', '');
                    if (str_contains($errorMsg, 'high demand') || str_contains($errorMsg, 'not found') || str_contains($errorMsg, 'not available')) {
                        continue;
                    }
                    return response()->json([
                        'answer' => 'Não consegui consultar a IA agora. Tente novamente em instantes.',
                        'error'  => $errorMsg,
                    ], 502);
                }

                $answer = $response->json('candidates.0.content.parts.0.text', 'Sem resposta.');

                // Processar a resposta do modelo gemma para remover raciocínio interno
                if (str_contains($tryModel, 'gemma')) {
                    $answer = $this->cleanGemmaResponse($answer);
                }

                return response()->json([
                    'answer'  => $answer,
                    'offline' => false,
                ]);
            } catch (\Throwable $e) {
                continue;
            }
        }

        return response()->json([
            'answer' => 'Não consegui consultar a IA agora. Tente novamente em instantes.',
        ], 502);
    }

    // Limpa a resposta do gemma para remover o raciocínio interno
    private function cleanGemmaResponse(string $answer): string
    {
        // Procura por padrões de resposta final (frases que começam com "A receita", "A resposta", etc.)
        // O gemma mostra raciocínio com "*" e depois a resposta final entre aspas
        $lines = explode("\n", $answer);
        $finalLines = [];
        $inFinal = false;

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if (empty($trimmed)) {
                if ($inFinal) {
                    $finalLines[] = $line;
                }
                continue;
            }

            // Se a linha parece ser parte do raciocínio (começa com * ou - ou contém "User asks", "Context:", etc.)
            if (preg_match('/^\*|^--|User asks:|Context:|Constraint:|Language:|Tone:|Data Source:|Assistant for/i', $trimmed)) {
                continue;
            }

            // Se a linha contém aspas com a resposta final (ex.: "A receita total é R$ 2.362,50.")
            if (preg_match('/^"(.+)"$/', $trimmed, $matches)) {
                $finalLines = [$matches[1]];
                $inFinal = true;
                break;
            }

            // Se a linha parece ser uma resposta final (contém "R$" ou "receita" ou "produto" ou "pedido")
            if (preg_match('/R\$|receita|produto|pedido|estoque|ingrediente/i', $trimmed)) {
                $finalLines[] = $line;
                $inFinal = true;
            } elseif ($inFinal) {
                $finalLines[] = $line;
            }
        }

        $result = trim(implode("\n", $finalLines));

        // Limpar asteriscos e espaços extras do início
        $result = preg_replace('/^\*+\s*/', '', $result);
        $result = trim($result);

        // Se não conseguiu extrair nada, tenta extrair a última frase que contém "R$"
        if (empty($result)) {
            $lastMatch = '';
            foreach ($lines as $line) {
                if (preg_match('/R\$\s*[\d.,]+/', $line, $m)) {
                    $lastMatch = trim($line);
                    $lastMatch = preg_replace('/^\*+\s*/', '', $lastMatch);
                }
            }
            $result = $lastMatch ?: $answer;
        }

        return $result;
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
