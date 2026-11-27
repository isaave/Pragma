<?php

namespace Ai;

use App\Models\User;
use Illuminate\Support\Facades\Http;

/**
 * Assistente do sistema Pragma.
 *
 * Quando a API externa responde, usa function calling para consultar dados
 * reais ou executar ações. Quando a API falha, responde localmente com as
 * mesmas ferramentas — incluindo perguntas "como faço..." e ações.
 */
class Agent
{
    private BusinessData $data;
    private Tools $tools;

    public function __construct()
    {
        $this->data = new BusinessData();
        $this->tools = new Tools();
    }

    /** Endpoint: POST /api/ai/ask  { question: "..." } */
    public function ask(string $question, ?User $user = null): array
    {
        $context = $this->data->contextText();
        $apiKey = env('GEMINI_API_KEY');
        $configured = env('GEMINI_MODEL', 'gemma-4-26b-a4b-it');

        if (!empty($apiKey)) {
            $models = [$configured];
            foreach ($models as $model) {
                try {
                    $result = $this->askModel($model, $apiKey, $question, $context, $user);
                    if ($result) {
                        return $result;
                    }
                } catch (\Throwable $e) {
                    // tenta o próximo modelo
                }
            }
        }

        // Modo local: continua a responder com dados reais e a executar ações
        return [
            'answer' => $this->localAnswer($question, $user),
            'offline' => true,
        ];
    }

    /** @return array<string, mixed>|null */
    private function askModel(string $model, string $apiKey, string $question, string $context, ?User $user): ?array
    {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

        $payload = [
            'systemInstruction' => [
                'parts' => [['text' => Handbook::systemPrompt($context, $user)]],
            ],
            'contents' => [
                ['role' => 'user', 'parts' => [['text' => $question]]],
            ],
            'tools' => [['functionDeclarations' => $this->tools->definitions()]],
            'generationConfig' => [
                'temperature' => 0.3,
                'maxOutputTokens' => 800,
            ],
        ];

        if (str_contains($model, 'gemini')) {
            $payload['generationConfig']['thinkingConfig'] = ['thinkingBudget' => 0];
        }

        $contents = $payload['contents'];

        // Até 2 rondas de ferramentas (consulta/ação -> resposta final)
        for ($round = 0; $round < 2; $round++) {
            $payload['contents'] = $contents;
            $response = Http::timeout(6)->post($url, $payload);

            if (!$response->successful()) {
                $error = strtolower((string) $response->json('error.message', ''));
                if (str_contains($error, 'high demand') || str_contains($error, 'not found')
                    || str_contains($error, 'not available') || str_contains($error, 'unavailable')) {
                    return null;
                }
                return [
                    'answer' => $this->localAnswer($question, $user),
                    'offline' => true,
                    'error' => $response->json('error.message', ''),
                ];
            }

            $parts = $response->json('candidates.0.content.parts', []);
            $calls = array_values(array_filter($parts, fn ($p) => isset($p['functionCall'])));

            if (!$calls) {
                $text = '';
                foreach ($parts as $part) {
                    $text .= (string) ($part['text'] ?? '');
                }
                $text = trim($text) ?: 'Sem resposta.';
                if (str_contains($model, 'gemma')) {
                    $text = $this->cleanGemmaResponse($text);
                }
                return ['answer' => $text, 'offline' => false];
            }

            $contents[] = ['role' => 'model', 'parts' => $parts];
            $responses = [];
            foreach ($calls as $call) {
                $name = (string) ($call['functionCall']['name'] ?? '');
                $args = (array) ($call['functionCall']['args'] ?? []);
                $result = $this->tools->execute($name, $args, $user);
                $responses[] = [
                    'functionResponse' => [
                        'name' => $name,
                        'response' => [
                            'sucesso' => $result['ok'],
                            'resultado' => $result['message'],
                            'dados' => $result['data'],
                        ],
                    ],
                ];
            }
            $contents[] = ['role' => 'user', 'parts' => $responses];
        }

        return null;
    }

    /** Resposta local inteligente, usando as mesmas ferramentas. */
    private function localAnswer(string $question, ?User $user): string
    {
        $n = BusinessData::normalize($question);
        $period = $this->detectPeriod($n);

        // 1) Perguntas de como fazer -> manual completo
        if ($this->has($n, ['como ', 'como faco', 'como faco', 'como cadastrar', 'como criar', 'como adicionar', 'passo a passo', 'como funciona', 'me explica', 'me explicar', 'ajuda a'])) {
            return $this->tools->execute('get_help', ['topic' => $question], $user)['message'];
        }

        // 2) Ações (só quando há verbo de ação explícito)
        $action = $this->detectAction($n, $question, $user);
        if ($action) {
            $result = $this->tools->execute($action['name'], $action['args'], $user);
            return $result['message'];
        }

        // 3) Consultas
        if ($this->has($n, ['fluxo de caixa', 'fluxo de dinheiro'])) {
            return $this->tools->execute('get_cash_flow', [], $user)['message'];
        }

        if ($this->has($n, ['saida', 'saidas', 'despesa', 'despesas', 'gasto', 'gastos', 'gastamos', 'gastei', 'gasta', 'mercado'])) {
            return $this->tools->execute('get_expenses', ['period' => $period], $user)['message'];
        }

        if ($this->has($n, ['faturamento', 'faturamento total', 'receita', 'lucro', 'custo', 'ticket medio', 'faturou', 'vendeu', 'vendas', 'mais vendid', 'mais vendem', 'categoria', 'quantos pedidos', 'pedidos entregues', 'pedidos cancelados'])) {
            return $this->tools->execute('get_metrics', ['period' => $period], $user)['message'];
        }

        if ($this->has($n, ['estoque baixo', 'ingrediente', 'ingredientes', 'estoque', 'validade', 'em falta', 'insumo', 'insumos'])) {
            if ($this->has($n, ['alerta', 'baixo', 'falta', 'critico', 'atencao'])) {
                return $this->tools->execute('get_stock_alerts', [], $user)['message'];
            }
            return $this->tools->execute('list_ingredients', [], $user)['message'];
        }

        if ($this->has($n, ['pedido', 'pedidos', 'encomenda'])) {
            if (preg_match('/#?\s*(\d{1,6})\b/', $question, $m)) {
                return $this->tools->execute('get_order', ['id' => (int) $m[1]], $user)['message'];
            }
            return $this->tools->execute('list_orders', [
                'scope' => $this->has($n, ['historico', 'antigo', 'encerrado']) ? 'history' : 'current',
                'limit' => 10,
            ], $user)['message'];
        }

        if ($this->has($n, ['usuario', 'usuarios', 'conta', 'contas', 'funcionario', 'atendente', 'chefe'])) {
            if (!$user || strtolower((string) $user->access_level) !== 'completo') {
                return 'A listagem de contas exige nível de acesso completo.';
            }
            return $this->tools->execute('list_users', [], $user)['message'];
        }

        if ($this->has($n, ['negocio', 'loja', 'aberto', 'fechado', 'sessao'])) {
            return $this->tools->execute('get_store_status', [], $user)['message'];
        }

        if ($this->has($n, ['sessoes', 'sessão', 'dias abertos'])) {
            return $this->tools->execute('list_sessions', [], $user)['message'];
        }

        if ($this->has($n, ['produto', 'produtos', 'cardapio', 'menu', 'preco'])) {
            return $this->tools->execute('list_products', [
                'search' => $this->extractQuoted($question),
            ], $user)['message'];
        }

        // 4) Pergunta genérica: resumo real do sistema
        $metrics = $this->tools->execute('get_metrics', ['period' => 'today'], $user)['message'];
        $store = $this->tools->execute('get_store_status', [], $user)['message'];
        $help = $this->tools->execute('get_help', ['topic' => 'visao geral'], $user)['message'];

        return "Posso ajudar com qualquer dúvida sobre o sistema e executar ações dentro dele.\n\n"
            . $store . "\n" . $metrics . "\n\n"
            . "Visão geral: " . $help . "\n\n"
            . "Pergunte, por exemplo, sobre faturamento, pedidos, estoque, saídas ou como usar uma tela.";
    }

    /** @return array{name:string,args:array<string,mixed>}|null */
    private function detectAction(string $n, string $question, ?User $user): ?array
    {
        $isAction = $this->has($n, ['criar ', 'crie ', 'cadastrar ', 'cadastre ', 'registrar ', 'adicione ', 'adicionar ', 'fazer ', 'faça ', 'faca ', 'novo ', 'abrir ', 'fechar ', 'repor ', 'repôr ', 'movimentar ', 'alterar ', 'mudar ', 'finalizar ', 'entregar ', 'cancelar ', 'lancar ', 'lançar ', 'remover ', 'excluir ']);

        // Pedido
        if ($isAction && $this->has($n, ['pedido', 'encomenda'])) {
            if ($this->has($n, ['status', 'finalizar', 'entregar', 'cancelar', 'mudar', 'alterar'])) {
                return [
                    'name' => 'update_order_status',
                    'args' => $this->parseStatusArgs($question, $n),
                ];
            }
            return ['name' => 'create_order', 'args' => $this->parseOrderArgs($question)];
        }

        // Negócio
        if ($isAction && $this->has($n, ['abrir negocio', 'abrir a loja', 'abrir loja', 'abre o negocio'])) {
            return ['name' => 'set_store_status', 'args' => ['is_open' => true]];
        }
        if ($isAction && $this->has($n, ['fechar negocio', 'fechar a loja', 'fechar loja', 'fecha o negocio'])) {
            return ['name' => 'set_store_status', 'args' => ['is_open' => false]];
        }

        // Produto
        if ($isAction && $this->has($n, ['produto', 'cardapio']) && !$this->has($n, ['pedido'])) {
            return ['name' => 'create_product', 'args' => $this->parseProductArgs($question)];
        }

        // Estoque
        if ($isAction && $this->has($n, ['estoque', 'ingrediente', 'repor', 'reposicao'])) {
            return ['name' => 'restock_ingredient', 'args' => $this->parseRestockArgs($question)];
        }

        // Saídas
        if ($isAction && $this->has($n, ['saida', 'despesa', 'gasto', 'mercado'])) {
            return ['name' => 'create_expense', 'args' => $this->parseExpenseArgs($question)];
        }

        // Utilizador
        if ($isAction && $this->has($n, ['usuario', 'conta', 'funcionario', 'colaborador'])) {
            return ['name' => 'create_user', 'args' => $this->parseUserArgs($question)];
        }

        return null;
    }

    /** @return array<string, mixed> */
    private function parseStatusArgs(string $question, string $n): array
    {
        preg_match('/#?\s*(\d{1,6})\b/', $question, $m);
        $status = 'delivered';
        $map = [
            'entregue' => 'delivered', 'entregar' => 'delivered', 'finalizar' => 'delivered', 'concluido' => 'delivered',
            'cancelado' => 'cancelled', 'cancelar' => 'cancelled',
            'preparando' => 'preparing', 'em preparo' => 'preparing',
            'pronto' => 'ready',
            'em desenvolvimento' => 'development',
            'pendente' => 'pending',
            'nao entregue' => 'not_delivered', 'atrasado' => 'late',
        ];
        foreach ($map as $word => $value) {
            if (str_contains($n, $word)) {
                $status = $value;
                break;
            }
        }

        $reason = null;
        if (preg_match('/(?:motivo|porque|porque o cliente|justificativa)\s*:?\s*(.+)$/i', $question, $m2)) {
            $reason = trim($m2[1]);
        }

        return [
            'id' => isset($m[1]) ? (int) $m[1] : null,
            'status' => $status,
            'reason' => $reason,
        ];
    }

    /** @return array<string, mixed> */
    private function parseOrderArgs(string $question): array
    {
        $items = [];
        $products = $this->data->products();
        $names = array_column($products, 'name');
        $remaining = $question;

        foreach ($names as $name) {
            $position = mb_stripos($remaining, $name);
            if ($position === false) {
                continue;
            }
            $before = mb_substr($remaining, max(0, $position - 20), 20);
            preg_match('/(\d{1,3})\s*(?:x|unidades|unid|porcao|porções)?\s*$/iu', $before, $m);
            $quantity = isset($m[1]) ? max(1, (int) $m[1]) : 1;
            $product = collect($products)->first(fn ($p) => $p['name'] === $name);
            $items[] = ['product_id' => $product['id'], 'quantity' => $quantity, 'addons' => [], 'notes' => null];
            $remaining = str_replace($name, '', $remaining);
        }

        $customer = null;
        if (preg_match('/(?:cliente|para|nome)\s*:?\s*([A-Za-zÀ-ÿ ]{2,40})(?:,|\.|$)/iu', $question, $m)) {
            $customer = trim($m[1]);
        }

        return [
            'customer_name' => $customer,
            'notes' => null,
            'items' => $items,
        ];
    }

    /** @return array<string, mixed> */
    private function parseProductArgs(string $question): array
    {
        $name = $this->extractQuoted($question);
        if (!$name && preg_match('/(?:produto|chamado|nome)\s*:?\s*([A-Za-zÀ-ÿ0-9 ]{2,60})/iu', $question, $m)) {
            $name = trim($m[1]);
        }

        $price = 0;
        if (preg_match('/(?:preco|valor|custa|custo)\s*:?\s*R?\$?\s*(\d+(?:[.,]\d{1,2})?)/iu', $question, $m)) {
            $price = (float) str_replace(',', '.', $m[1]);
        } elseif (preg_match('/(\d+(?:[.,]\d{1,2})?)\s*(?:reais|R\$)/iu', $question, $m)) {
            $price = (float) str_replace(',', '.', $m[1]);
        }

        $category = 'hamburguer';
        foreach (['combo' => 'combo', 'acompanhamento' => 'acompanhamento', 'bebida' => 'bebida', 'sobremesa' => 'sobremesa', 'adicional' => 'adicional', 'hamburguer' => 'hamburguer', 'hambúrguer' => 'hamburguer'] as $word => $value) {
            if (str_contains(BusinessData::normalize($question), $word)) {
                $category = $value;
                break;
            }
        }

        return [
            'name' => $name ?: 'Novo produto',
            'category' => $category,
            'price' => $price,
            'status' => 'ativo',
            'notes' => null,
        ];
    }

    /** @return array<string, mixed> */
    private function parseRestockArgs(string $question): array
    {
        $ingredients = $this->data->ingredients();
        $names = array_column($ingredients, 'name');
        $id = null;
        foreach ($names as $name) {
            if (mb_stripos($question, $name) !== false) {
                $id = collect($ingredients)->first(fn ($i) => $i['name'] === $name)['id'];
                break;
            }
        }

        $quantity = 0;
        if (preg_match('/(\d+(?:[.,]\d{1,2})?)\s*(?:kg|g|ml|l|unidades|unid|hamburgueres|hambúrgueres)?/iu', $question, $m)) {
            $quantity = (float) str_replace(',', '.', $m[1]);
        }

        return ['id' => $id, 'quantity' => $quantity, 'last_purchase_date' => now()->toDateString()];
    }

    /** @return array<string, mixed> */
    private function parseExpenseArgs(string $question): array
    {
        $description = $this->extractQuoted($question);
        if (!$description) {
            $n = BusinessData::normalize($question);
            foreach (['mercado', 'compra', 'conta de luz', 'conta de agua', 'gas', 'frete', 'manutencao'] as $word) {
                if (str_contains($n, $word)) {
                    $description = ucfirst(str_replace('conta de agua', 'Conta de água', $word));
                    break;
                }
            }
        }

        $value = 0;
        if (preg_match('/(?:valor|de)\s*:?\s*R?\$?\s*(\d+(?:[.,]\d{1,2})?)/iu', $question, $m)) {
            $value = (float) str_replace(',', '.', $m[1]);
        } elseif (preg_match('/R?\$?\s*(\d+(?:[.,]\d{1,2})?)/u', $question, $m)) {
            $value = (float) str_replace(',', '.', $m[1]);
        }

        return ['description' => $description ?: 'Despesa', 'value' => $value];
    }

    /** @return array<string, mixed> */
    private function parseUserArgs(string $question): array
    {
        preg_match('/[\w.\-+]+@[\w.\-]+\.\w+/', $question, $email);
        $name = $this->extractQuoted($question);
        if (!$name && preg_match('/(?:nome|chamad[oa]|usuario)\s*:?\s*([A-Za-zÀ-ÿ ]{3,50})/iu', $question, $m)) {
            $name = trim($m[1]);
        }
        $n = BusinessData::normalize($question);

        return [
            'name' => $name ?: 'Novo utilizador',
            'email' => $email[0] ?? null,
            'role' => str_contains($n, 'chefe') ? 'chefe' : 'atendente',
            'access_level' => str_contains($n, 'completo') ? 'completo' : 'basico',
            'status' => 'Ativo',
        ];
    }

    private function detectPeriod(string $n): string
    {
        if (str_contains($n, 'hoje') || str_contains($n, 'dia de hoje')) return 'today';
        if (str_contains($n, 'ontem')) return 'yesterday';
        if (str_contains($n, 'semana')) return 'week';
        if (str_contains($n, 'mes') || str_contains($n, 'mês')) return 'month';
        return 'all';
    }

    /** @param array<int, string> $needles */
    private function has(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($haystack, BusinessData::normalize($needle))) {
                return true;
            }
        }
        return false;
    }

    private function extractQuoted(string $text): ?string
    {
        if (preg_match('/["“]([^"”]{2,80})["”]/u', $text, $m)) {
            return trim($m[1]);
        }
        if (preg_match('/chamad[oa]\s+([A-Za-zÀ-ÿ0-9 ]{2,60})/iu', $text, $m)) {
            return trim($m[1]);
        }
        return null;
    }

    private function cleanGemmaResponse(string $answer): string
    {
        $lines = explode("\n", $answer);
        $finalLines = [];
        $inFinal = false;

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '') {
                if ($inFinal) {
                    $finalLines[] = $line;
                }
                continue;
            }
            if (preg_match('/^\*|^--|User asks:|Context:|Constraint:|Language:|Tone:|Data Source:|Assistant for/i', $trimmed)) {
                continue;
            }
            if (preg_match('/^"(.+)"$/', $trimmed, $matches)) {
                $finalLines = [$matches[1]];
                break;
            }
            if (preg_match('/R\$|receita|produto|pedido|estoque|ingrediente/i', $trimmed)) {
                $finalLines[] = $line;
                $inFinal = true;
            } elseif ($inFinal) {
                $finalLines[] = $line;
            }
        }

        $result = trim(implode("\n", $finalLines));
        $result = preg_replace('/^\*+\s*/', '', $result) ?? $result;
        $result = trim($result);

        if ($result === '') {
            $last = '';
            foreach ($lines as $line) {
                if (preg_match('/R\$\s*[\d.,]+/', $line)) {
                    $last = preg_replace('/^\*+\s*/', '', trim($line)) ?? trim($line);
                }
            }
            $result = $last ?: $answer;
        }

        return $result;
    }
}
