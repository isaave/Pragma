<?php

namespace Ai;

use App\Http\Controllers\IngredientController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\StoreController;
use App\Http\Controllers\UserController;
use App\Models\Ingredient;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Ferramentas executáveis pelo assistente.
 *
 * As ações reutilizam os controllers existentes (mesmas validações, RBAC e
 * efeitos de estoque), apenas com um Request interno em vez de HTTP.
 */
class Tools
{
    private BusinessData $data;

    public function __construct()
    {
        $this->data = new BusinessData();
    }

    /** Declarações no formato Gemini (functionDeclarations). */
    public function definitions(): array
    {
        $string = ['type' => 'STRING'];
        $number = ['type' => 'NUMBER'];
        $integer = ['type' => 'INTEGER'];
        $boolean = ['type' => 'BOOLEAN'];

        return [
            [
                'name' => 'get_metrics',
                'description' => 'Faturamento, contagens, ticket médio, top produtos e receita por categoria. Use para perguntas de faturamento, vendas, lucro, pedidos entregues/cancelados.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'period' => [
                            'type' => 'STRING',
                            'enum' => ['today', 'yesterday', 'week', 'month', 'all'],
                            'description' => 'Período: today=hoje, yesterday=ontem, week=semana, month=mês, all=total.',
                        ],
                    ],
                ],
            ],
            [
                'name' => 'get_expenses',
                'description' => 'Listar saídas/despesas registadas (mercado, contas, etc.) e o total por período.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'period' => [
                            'type' => 'STRING',
                            'enum' => ['today', 'week', 'month', 'all'],
                            'description' => 'Período das saídas.',
                        ],
                    ],
                ],
            ],
            [
                'name' => 'get_cash_flow',
                'description' => 'Fluxo de caixa por hora de hoje: vendas, custos reais de produção, saídas e lucro.',
                'parameters' => ['type' => 'OBJECT', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'create_expense',
                'description' => 'Registar uma nova saída/despesa. Requer nível completo.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'description' => $string,
                        'value' => $number,
                        'expense_date' => array_merge($string, ['description' => 'AAAA-MM-DD (opcional)']),
                    ],
                    'required' => ['description', 'value'],
                ],
            ],
            [
                'name' => 'list_orders',
                'description' => 'Listar pedidos recentes (da sessão aberta ou do histórico), opcionalmente filtrados por status.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'status' => array_merge($string, ['description' => 'pending, development, preparing, ready, delivered, cancelled, not_delivered ou late.']),
                        'scope' => array_merge($string, ['description' => 'current (padrão) ou history.']),
                        'limit' => $integer,
                    ],
                ],
            ],
            [
                'name' => 'get_order',
                'description' => 'Detalhes completos de um pedido, incluindo itens e histórico de status.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => ['id' => $integer],
                    'required' => ['id'],
                ],
            ],
            [
                'name' => 'list_products',
                'description' => 'Listar produtos do cardápio com preço, categoria, disponibilidade e receita.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => ['search' => $string],
                ],
            ],
            [
                'name' => 'list_ingredients',
                'description' => 'Listar ingredientes/estoque. Filtros: low, out, expiring.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'filter' => $string,
                        'search' => $string,
                    ],
                ],
            ],
            [
                'name' => 'get_stock_alerts',
                'description' => 'Ingredientes em falta, com estoque baixo ou próximos da validade.',
                'parameters' => ['type' => 'OBJECT', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'list_users',
                'description' => 'Listar contas (nome, e-mail, cargo, nível de acesso e status). Requer nível completo.',
                'parameters' => ['type' => 'OBJECT', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'get_store_status',
                'description' => 'Consultar se o negócio está aberto ou fechado e a sessão atual.',
                'parameters' => ['type' => 'OBJECT', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'list_sessions',
                'description' => 'Listar sessões de abertura do negócio com datas, responsáveis, pedidos e totais.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => ['limit' => $integer],
                ],
            ],
            [
                'name' => 'get_help',
                'description' => 'Manual de funcionamento de uma tela ou fluxo do sistema. Use para perguntas “como faço…”.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'topic' => array_merge($string, ['description' => 'Ex.: pedidos, produtos, estoque, usuários, relatórios, perfil, acesso.']),
                    ],
                    'required' => ['topic'],
                ],
            ],
            [
                'name' => 'create_order',
                'description' => 'Criar um novo pedido com itens. Requer negócio aberto. Estoque é baixado automaticamente.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'customer_name' => $string,
                        'notes' => $string,
                        'items' => [
                            'type' => 'ARRAY',
                            'description' => 'Itens do pedido.',
                            'items' => [
                                'type' => 'OBJECT',
                                'properties' => [
                                    'product_id' => $integer,
                                    'quantity' => $integer,
                                    'notes' => $string,
                                    'addons' => [
                                        'type' => 'ARRAY',
                                        'items' => [
                                            'type' => 'OBJECT',
                                            'properties' => [
                                                'product_addon_id' => $integer,
                                                'quantity' => $integer,
                                            ],
                                        ],
                                    ],
                                ],
                                'required' => ['product_id', 'quantity'],
                            ],
                        ],
                    ],
                    'required' => ['items'],
                ],
            ],
            [
                'name' => 'update_order_status',
                'description' => 'Alterar o status de um pedido. Motivo obrigatório para cancelled, not_delivered e late.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'id' => $integer,
                        'status' => array_merge($string, ['description' => 'pending, development, preparing, ready, delivered, cancelled, not_delivered ou late.']),
                        'reason' => $string,
                    ],
                    'required' => ['id', 'status'],
                ],
            ],
            [
                'name' => 'create_product',
                'description' => 'Cadastrar produto no cardápio. Requer nível completo.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'name' => $string,
                        'category' => array_merge($string, ['description' => 'hamburguer, combo, acompanhamento, bebida, sobremesa ou adicional.']),
                        'price' => $number,
                        'status' => array_merge($string, ['description' => 'ativo, inativo ou desenvolvimento.']),
                        'notes' => $string,
                        'ingredients' => [
                            'type' => 'ARRAY',
                            'items' => [
                                'type' => 'OBJECT',
                                'properties' => [
                                    'id' => $integer,
                                    'quantity' => $number,
                                ],
                            ],
                        ],
                    ],
                    'required' => ['name', 'category', 'price'],
                ],
            ],
            [
                'name' => 'restock_ingredient',
                'description' => 'Adicionar quantidade ao estoque de um ingrediente. Requer nível completo.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'id' => $integer,
                        'quantity' => $number,
                        'expiry_date' => array_merge($string, ['description' => 'AAAA-MM-DD']),
                        'last_purchase_date' => array_merge($string, ['description' => 'AAAA-MM-DD']),
                        'notes' => $string,
                    ],
                    'required' => ['id', 'quantity'],
                ],
            ],
            [
                'name' => 'create_user',
                'description' => 'Criar nova conta com senha temporária. Requer nível completo.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'name' => $string,
                        'email' => $string,
                        'role' => array_merge($string, ['description' => 'atendente ou chefe.']),
                        'access_level' => array_merge($string, ['description' => 'basico ou completo.']),
                        'status' => array_merge($string, ['description' => 'Ativo ou Inativo.']),
                    ],
                    'required' => ['name', 'email', 'role', 'access_level'],
                ],
            ],
            [
                'name' => 'set_store_status',
                'description' => 'Abrir ou fechar o negócio. Requer nível completo.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'is_open' => array_merge($boolean, ['description' => 'true para abrir, false para fechar.']),
                    ],
                    'required' => ['is_open'],
                ],
            ],
        ];
    }

    /** @return array<int, string> */
    public function names(): array
    {
        return array_column($this->definitions(), 'name');
    }

    /**
     * Executa uma ferramenta.
     *
     * @return array{ok:bool, message:string, data:mixed}
     */
    public function execute(string $name, array $args, ?User $user): array
    {
        try {
            switch ($name) {
                case 'get_metrics':
                    $m = $this->data->metrics($args['period'] ?? 'all');
                    return [
                        'ok' => true,
                        'message' => $this->formatMetrics($m),
                        'data' => $m,
                    ];

                case 'get_expenses':
                    $period = $args['period'] ?? 'all';
                    $list = $this->data->expenses($period);
                    $total = 0.0;
                    foreach ($list as $e) {
                        $total += $e['value'];
                    }
                    return [
                        'ok' => true,
                        'message' => $list
                            ? 'Saídas (' . $period . '): ' . implode('; ', array_map(
                                fn ($e) => $e['description'] . ' (' . BusinessData::money($e['value']) . ', ' . $e['expense_date'] . ')',
                                $list
                            )) . '. Total: ' . BusinessData::money($total) . '.'
                            : 'Não há saídas registadas nesse período.',
                        'data' => ['expenses' => $list, 'total' => $total],
                    ];

                case 'get_cash_flow':
                    $flow = $this->data->cashFlow();
                    $totalSales = array_sum($flow['sales']);
                    $totalCosts = array_sum($flow['costs']);
                    return [
                        'ok' => true,
                        'message' => 'Fluxo de caixa de hoje: vendas ' . BusinessData::money($totalSales)
                            . ', custos e saídas ' . BusinessData::money($totalCosts)
                            . ', resultado ' . BusinessData::money($totalSales - $totalCosts) . '.',
                        'data' => $flow,
                    ];

                case 'create_expense':
                    if (!$this->isCompleto($user)) {
                        return $this->denied();
                    }
                    $response = $this->callController(
                        app(\App\Http\Controllers\ExpenseController::class),
                        'store',
                        array_intersect_key($args, array_flip(['description', 'value', 'expense_date'])),
                        $user
                    );
                    return $this->fromResponse($response, 'Saída registada', fn ($j) =>
                        'Saída de ' . BusinessData::money($j['expense']['value'] ?? 0)
                        . ' ("' . ($j['expense']['description'] ?? 'despesa') . '") registada com sucesso.');

                case 'list_orders':
                    $orders = $this->data->orders(
                        $args['status'] ?? null,
                        (int) ($args['limit'] ?? 10),
                        $args['scope'] ?? 'current'
                    );
                    return [
                        'ok' => true,
                        'message' => $orders
                            ? $this->formatOrders($orders)
                            : 'Não encontrei pedidos com esses critérios.',
                        'data' => $orders,
                    ];

                case 'get_order':
                    $order = $this->data->order((int) ($args['id'] ?? 0));
                    return $order
                        ? ['ok' => true, 'message' => $this->formatOrder($order), 'data' => $order]
                        : ['ok' => false, 'message' => 'Não encontrei esse pedido.', 'data' => null];

                case 'list_products':
                    $products = $this->data->products($args['search'] ?? null);
                    return [
                        'ok' => true,
                        'message' => $products ? $this->formatProducts($products) : 'Não encontrei produtos.',
                        'data' => $products,
                    ];

                case 'list_ingredients':
                    $ingredients = $this->data->ingredients($args['filter'] ?? null, $args['search'] ?? null);
                    return [
                        'ok' => true,
                        'message' => $ingredients ? $this->formatIngredients($ingredients) : 'Não encontrei ingredientes.',
                        'data' => $ingredients,
                    ];

                case 'get_stock_alerts':
                    $alerts = $this->data->stockAlerts();
                    return [
                        'ok' => true,
                        'message' => $alerts
                            ? 'Alertas de estoque: ' . implode('; ', array_map(
                                fn ($a) => $a['name'] . ' (' . BusinessData::money($a['quantity']) . ' ' . $a['unit'] . ', ' . $a['status'] . ')',
                                $alerts
                            )) . '.'
                            : 'Não há alertas de estoque neste momento.',
                        'data' => $alerts,
                    ];

                case 'list_users':
                    if (!$this->isCompleto($user)) {
                        return $this->denied();
                    }
                    $users = $this->data->users();
                    return [
                        'ok' => true,
                        'message' => 'Contas cadastradas: ' . implode('; ', array_map(
                            fn ($u) => $u['name'] . ' (' . $u['email'] . ', ' . $u['role'] . ', ' . $u['access_level'] . ', ' . $u['status'] . ')',
                            $users
                        )),
                        'data' => $users,
                    ];

                case 'get_store_status':
                    $status = $this->data->storeStatus();
                    return [
                        'ok' => true,
                        'message' => 'O negócio está ' . ($status['is_open'] ? 'aberto' : 'fechado')
                            . ($status['opened_at'] ? ', sessão aberta em ' . $status['opened_at'] : '') . '.',
                        'data' => $status,
                    ];

                case 'list_sessions':
                    $sessions = $this->data->sessions((int) ($args['limit'] ?? 10));
                    return [
                        'ok' => true,
                        'message' => $sessions
                            ? 'Sessões: ' . implode('; ', array_map(
                                fn ($s) => '#' . $s['id'] . ' (' . $s['opened_at'] . ' a ' . ($s['closed_at'] ?? 'em aberto') . ', '
                                    . $s['orders_count'] . ' pedido(s), ' . BusinessData::money($s['total']) . ')',
                                $sessions
                            ))
                            : 'Ainda não há sessões registadas.',
                        'data' => $sessions,
                    ];

                case 'get_help':
                    return $this->help($args['topic'] ?? '');

                case 'create_order':
                    $response = $this->callController(
                        app(OrderController::class),
                        'store',
                        $args,
                        $user
                    );
                    return $this->fromResponse($response, 'Pedido criado', fn ($j) =>
                        'Pedido #' . ($j['order']['id'] ?? '?') . ' criado com sucesso, total de '
                        . BusinessData::money($j['order']['total'] ?? 0) . '.');

                case 'update_order_status':
                    $order = Order::find((int) ($args['id'] ?? 0));
                    if (!$order) {
                        return ['ok' => false, 'message' => 'Não encontrei esse pedido.', 'data' => null];
                    }
                    $response = $this->callController(
                        app(OrderController::class),
                        'updateStatus',
                        ['status' => $args['status'] ?? '', 'reason' => $args['reason'] ?? null],
                        $user,
                        [$order]
                    );
                    return $this->fromResponse($response, 'Status atualizado', fn ($j) =>
                        'Status do pedido #' . $order->id . ' alterado para ' . ($j['order']['status'] ?? ($args['status'] ?? '')) . '.');

                case 'create_product':
                    if (!$this->isCompleto($user)) {
                        return $this->denied();
                    }
                    $payload = $args;
                    if (isset($payload['ingredients'])) {
                        $payload['ingredients'] = array_values(array_filter($payload['ingredients'], fn ($i) =>
                            !empty($i['id']) && isset($i['quantity'])));
                        if (empty($payload['ingredients'])) {
                            unset($payload['ingredients']);
                        }
                    }
                    $response = $this->callController(app(ProductController::class), 'store', $payload, $user);
                    return $this->fromResponse($response, 'Produto criado', fn ($j) =>
                        'Produto ' . ($j['product']['name'] ?? 'criado') . ' cadastrado no cardápio.');

                case 'restock_ingredient':
                    if (!$this->isCompleto($user)) {
                        return $this->denied();
                    }
                    $ingredient = Ingredient::find((int) ($args['id'] ?? 0));
                    if (!$ingredient) {
                        return ['ok' => false, 'message' => 'Não encontrei esse ingrediente.', 'data' => null];
                    }
                    $response = $this->callController(
                        app(IngredientController::class),
                        'restock',
                        array_intersect_key($args, array_flip(['quantity', 'expiry_date', 'last_purchase_date', 'notes'])),
                        $user,
                        [$ingredient]
                    );
                    return $this->fromResponse($response, 'Estoque reposto', function ($j) use ($ingredient, $args) {
                        $ingredient->refresh();
                        return 'Foram adicionadas ' . (float) ($args['quantity'] ?? 0) . ' ' . $ingredient->unit
                            . ' de ' . $ingredient->name . '. Estoque atual: ' . $ingredient->quantity . ' ' . $ingredient->unit . '.';
                    });

                case 'create_user':
                    if (!$this->isCompleto($user)) {
                        return $this->denied();
                    }
                    $response = $this->callController(app(UserController::class), 'store', $args, $user);
                    return $this->fromResponse($response, 'Conta criada', function ($j) {
                        $msg = 'Conta de ' . ($j['user']['name'] ?? 'utilizador') . ' criada com sucesso.';
                        if (!empty($j['temporary_password'])) {
                            $msg .= ' Senha temporária: ' . $j['temporary_password'] . '.';
                        }
                        return $msg;
                    });

                case 'set_store_status':
                    if (!$this->isCompleto($user)) {
                        return $this->denied();
                    }
                    $response = $this->callController(
                        app(StoreController::class),
                        'update',
                        ['is_open' => (bool) ($args['is_open'] ?? false)],
                        $user
                    );
                    return $this->fromResponse($response, 'Estado do negócio alterado', fn ($j) =>
                        ($j['is_open'] ?? false) ? 'Negócio aberto com sucesso.' : 'Negócio fechado com sucesso.');

                default:
                    return ['ok' => false, 'message' => 'Ferramenta desconhecida: ' . $name, 'data' => null];
            }
        } catch (ValidationException $e) {
            $errors = collect($e->errors())->flatten()->implode(' ');
            return ['ok' => false, 'message' => 'Não foi possível concluir: ' . $errors, 'data' => null];
        } catch (\Throwable $e) {
            return ['ok' => false, 'message' => 'Não foi possível concluir: ' . $e->getMessage(), 'data' => null];
        }
    }

    private function isCompleto(?User $user): bool
    {
        return $user && strtolower((string) $user->access_level) === 'completo';
    }

    private function denied(): array
    {
        return [
            'ok' => false,
            'message' => 'Essa ação exige nível de acesso completo. O seu nível é básico; pode continuar a gerir pedidos e a consultar produtos e estoque.',
            'data' => null,
        ];
    }

    /** Chama um controller com um Request interno autenticado. */
    private function callController($controller, string $method, array $payload, ?User $user, array $extra = [])
    {
        $request = Request::create('/api/ai/tool', 'POST', $payload);
        $request->setUserResolver(fn () => $user);
        return $controller->{$method}($request, ...$extra);
    }

    /** Converte uma JsonResponse de controller no formato padrão das ferramentas. */
    private function fromResponse($response, string $fallback, callable $formatter): array
    {
        $json = method_exists($response, 'getData') ? (array) $response->getData(true) : [];
        $status = method_exists($response, 'getStatusCode') ? $response->getStatusCode() : 200;
        $ok = $status >= 200 && $status < 300;

        return [
            'ok' => $ok,
            'message' => $ok ? $formatter($json) : ($json['message'] ?? $fallback . ': não foi possível concluir.'),
            'data' => $json,
        ];
    }

    private function help(string $topic): array
    {
        $normalized = BusinessData::normalize($topic);
        $best = null;
        $score = 0;
        foreach (Handbook::sections() as $key => $section) {
            $hits = 0;
            foreach ($section['keywords'] as $keyword) {
                if ($keyword !== '' && str_contains($normalized, BusinessData::normalize($keyword))) {
                    $hits++;
                }
            }
            if (str_contains($normalized, BusinessData::normalize($section['title']))) {
                $hits += 2;
            }
            if ($hits > $score) {
                $score = $hits;
                $best = $key;
            }
        }

        if (!$best || $score === 0) {
            $titles = array_map(fn ($s) => $s['title'], Handbook::sections());
            return [
                'ok' => true,
                'message' => 'Posso ajudar com: ' . implode('; ', $titles) . '. Diga-me qual tela ou ação você quer saber.',
                'data' => ['topics' => array_keys(Handbook::sections())],
            ];
        }

        $section = Handbook::sections()[$best];
        return [
            'ok' => true,
            'message' => $section['title'] . ":\n" . $section['content'],
            'data' => ['topic' => $best, 'content' => $section['content']],
        ];
    }

    /** @return array<string, string> */
    public function formatMetrics(array $m): string
    {
        $labels = [
            'today' => 'de hoje',
            'yesterday' => 'de ontem',
            'week' => 'desta semana',
            'month' => 'deste mês',
            'all' => 'total',
        ];
        $label = $labels[$m['period']] ?? 'total';
        $lines = [
            'Faturamento ' . $label . ': ' . BusinessData::money($m['revenue']) . ' em ' . $m['paid_orders'] . ' pedido(s) não cancelado(s).',
            'Ticket médio: ' . BusinessData::money($m['average_ticket']) . '.',
            'Pedidos no período: ' . $m['total_orders'] . '. Entregues: ' . $m['delivered'] . '. Cancelados: ' . $m['cancelled'] . '.',
            'Custo de produção: ' . BusinessData::money($m['production_cost'] ?? 0)
                . '. Saídas registadas: ' . BusinessData::money($m['expenses'] ?? 0)
                . '. Lucro estimado: ' . BusinessData::money($m['profit'] ?? $m['revenue']) . '.',
        ];

        if ($m['top_products']) {
            $lines[] = 'Produtos mais vendidos: ' . implode(', ', array_map(
                fn ($p) => $p['name'] . ' (' . $p['quantity'] . ' unid., ' . BusinessData::money($p['revenue']) . ')',
                $m['top_products']
            )) . '.';
        }
        if ($m['by_category']) {
            $lines[] = 'Receita por categoria: ' . implode(', ', array_map(
                fn ($c) => $c['category'] . ' (' . BusinessData::money($c['revenue']) . ')',
                $m['by_category']
            )) . '.';
        }
        return implode("\n", $lines);
    }

    private function formatOrders(array $orders): string
    {
        return 'Pedidos:\n' . implode("\n", array_map(
            fn ($o) => '#' . $o['id'] . ' — ' . $o['status'] . ' — ' . BusinessData::money($o['total'])
                . ' — ' . ($o['customer_name'] ?: $o['attendant']) . ' — ' . $o['created_at'],
            $orders
        ));
    }

    private function formatOrder(array $o): string
    {
        $lines = [
            'Pedido #' . $o['id'] . ' — status: ' . $o['status'] . ' — total: ' . BusinessData::money($o['total']),
            'Cliente: ' . ($o['customer_name'] ?: 'não informado') . '. Atendente: ' . ($o['attendant'] ?? '—') . '. Criado em ' . $o['created_at'] . '.',
            'Itens: ' . ($o['items'] ? implode(', ', array_map(
                fn ($it) => $it['quantity'] . 'x ' . $it['product'] . ' (' . BusinessData::money($it['subtotal']) . ')',
                $o['items']
            )) : 'nenhum') . '.',
        ];
        if (!empty($o['status_history'])) {
            $lines[] = 'Histórico: ' . implode(' → ', array_map(
                fn ($h) => $h['status'] . ' (' . $h['at'] . ')' . ($h['reason'] ? ' — ' . $h['reason'] : ''),
                $o['status_history']
            ));
        }
        return implode("\n", $lines);
    }

    private function formatProducts(array $products): string
    {
        return 'Produtos:\n' . implode("\n", array_map(
            fn ($p) => '# ' . $p['name'] . ' — ' . BusinessData::money($p['price'])
                . ' — ' . $p['category'] . ' — ' . ($p['available'] ? 'disponível' : 'indisponível'),
            $products
        ));
    }

    private function formatIngredients(array $ingredients): string
    {
        return 'Ingredientes:\n' . implode("\n", array_map(
            fn ($i) => $i['name'] . ' — ' . $i['quantity'] . ' ' . $i['unit'] . ' de ' . $i['capacity']
                . ' (' . $i['status'] . ')' . ($i['expiry_date'] ? ' — validade ' . $i['expiry_date'] : ''),
            $ingredients
        ));
    }
}
