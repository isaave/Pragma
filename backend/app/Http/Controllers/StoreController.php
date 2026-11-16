<?php

namespace App\Http\Controllers;

use App\Models\StoreSetting;
use Illuminate\Http\Request;

class StoreController extends Controller
{
    /**
     * Estado atual do negócio (aberto/fechado).
     */
    public function show()
    {
        return response()->json($this->payload($this->currentSetting()));
    }

    /**
     * Abrir ou fechar o negócio. Apenas o chefe pode alterar.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        if (strtolower((string) $user?->role) !== 'chefe') {
            return response()->json(
                ['message' => 'Apenas o chefe pode abrir ou fechar o negócio.'],
                403
            );
        }

        $data = $request->validate([
            'is_open' => ['required', 'boolean'],
        ]);

        $setting = $this->currentSetting();
        $setting->is_open = (bool) $data['is_open'];
        $setting->updated_by = $user->id;
        $setting->save();

        return response()->json($this->payload($setting->fresh('updatedBy:id,name')) + [
            'message' => $setting->is_open
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

    private function payload(StoreSetting $setting): array
    {
        return [
            'is_open' => (bool) $setting->is_open,
            'updated_at' => optional($setting->updated_at)->toIso8601String(),
            'updated_by' => $setting->updatedBy?->name,
        ];
    }
}
