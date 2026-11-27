<?php

namespace App\Http\Controllers;

use App\Models\StoreSession;
use App\Models\StoreSetting;
use App\Services\AlertService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StoreController extends Controller
{
    /**
     * Estado atual do negócio (aberto/fechado) e da sessão aberta.
     */
    public function show()
    {
        return response()->json($this->payload($this->currentSetting()));
    }

    /**
     * Dias/sessões em que o negócio ficou aberto, com vendas da sessão.
     */
    public function sessions()
    {
        $sessions = StoreSession::with([
            'openedBy:id,name',
            'closedBy:id,name',
            'orders' => function ($query) {
                $query->with('items.product', 'items.addons.addon', 'user', 'statusHistory.user')
                    ->withCount('statusHistory')
                    ->latest();
            },
        ])
            ->latest('opened_at')
            ->get()
            ->map(function (StoreSession $session) {
                $orders = $session->orders;

                return [
                    'id' => $session->id,
                    'opened_at' => optional($session->opened_at)->toIso8601String(),
                    'closed_at' => optional($session->closed_at)->toIso8601String(),
                    'is_open' => $session->closed_at === null,
                    'opened_by' => $session->openedBy?->name,
                    'closed_by' => $session->closedBy?->name,
                    'orders_count' => $orders->count(),
                    'items_count' => $orders->sum(fn ($order) => $order->items->sum('quantity')),
                    'total' => (float) $orders->sum('total'),
                    'orders' => $orders,
                ];
            });

        return response()->json($sessions);
    }

    /**
     * Abrir ou fechar o negócio. Apenas o chefe pode alterar.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        if (! $user || ! $user->isCompleto()) {
            return response()->json(
                ['message' => 'Apenas o perfil completo (chefe) pode abrir ou fechar o negócio.'],
                403
            );
        }

        $data = $request->validate([
            'is_open' => ['required', 'boolean'],
        ]);

        $setting = $this->currentSetting();
        $wasOpen = (bool) $setting->is_open;
        $nextOpen = (bool) $data['is_open'];
        $openSession = $this->openSession();

        DB::transaction(function () use ($setting, $user, $wasOpen, $nextOpen, &$openSession) {
            if (! $wasOpen && $nextOpen) {
                // Cada abertura cria uma nova sessão com a data/hora exata.
                if (! $openSession) {
                    $openSession = StoreSession::create([
                        'opened_at' => now(),
                        'opened_by' => $user->id,
                    ]);
                }
                $setting->is_open = true;
            } elseif ($wasOpen && ! $nextOpen) {
                // Ao fechar, a sessão é encerrada e os pedidos passam ao histórico.
                if ($openSession) {
                    $openSession->closed_at = now();
                    $openSession->closed_by = $user->id;
                    $openSession->save();
                } elseif ($setting->updated_at) {
                    StoreSession::create([
                        'opened_at' => $setting->updated_at,
                        'closed_at' => now(),
                        'opened_by' => $setting->updated_by,
                        'closed_by' => $user->id,
                    ]);
                }
                $setting->is_open = false;
            }

            $setting->updated_by = $user->id;
            $setting->save();
        });

        app(AlertService::class)->storeStatus($nextOpen, $user->name, $openSession?->id);

        return response()->json($this->payload($setting->fresh('updatedBy:id,name')) + [
            'message' => $nextOpen
                ? 'Negócio aberto com sucesso.'
                : 'Negócio fechado com sucesso.',
        ]);
    }

    private function currentSetting(): StoreSetting
    {
        return StoreSetting::with('updatedBy:id,name')->firstOrCreate(
            [],
            ['is_open' => true]
        );
    }

    private function openSession(): ?StoreSession
    {
        return StoreSession::whereNull('closed_at')
            ->latest('opened_at')
            ->first();
    }

    private function payload(StoreSetting $setting): array
    {
        $session = $this->openSession();

        return [
            'is_open' => (bool) $setting->is_open,
            'session_id' => $session?->id,
            'opened_at' => optional($session?->opened_at)->toIso8601String(),
            'updated_at' => optional($setting->updated_at)->toIso8601String(),
            'updated_by' => $setting->updatedBy?->name,
        ];
    }
}
