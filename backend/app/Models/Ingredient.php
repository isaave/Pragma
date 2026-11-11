<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Ingredient extends Model
{
    // Limites usados para classificar o estoque (em % da capacidade)
    public const LOW_PERCENT = 25;      // até 25%  -> Estoque baixo
    public const MEDIUM_PERCENT = 75;   // até 75%  -> Estoque mediano (acima disso -> Estoque alto)

    // Quantos dias antes da validade o item aparece em "Próximo da validade"
    public const EXPIRING_DAYS = 7;

    protected $fillable = [
        'name',
        'unit',
        'quantity',
        'capacity',
        'expiry_date',
        'last_purchase_date',
        'notes',
    ];

    // Campos calculados que também vão no JSON devolvido pela API
    protected $appends = ['percentage', 'stock_status', 'near_expiry'];

    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'capacity' => 'float',
            'expiry_date' => 'date:Y-m-d',
            'last_purchase_date' => 'date:Y-m-d',
        ];
    }

    // ---------- Campos calculados ----------

    // Percentagem da capacidade (ex.: 45 de 50 -> 90)
    protected function percentage(): Attribute
    {
        return Attribute::get(function () {
            if ($this->capacity <= 0) {
                return 0;
            }
            return round(($this->quantity / $this->capacity) * 100);
        });
    }

    // Em falta | Estoque baixo | Estoque mediano | Estoque alto
    protected function stockStatus(): Attribute
    {
        return Attribute::get(function () {
            if ($this->quantity <= 0) {
                return 'Em falta';
            }
            if ($this->percentage <= self::LOW_PERCENT) {
                return 'Estoque baixo';
            }
            if ($this->percentage <= self::MEDIUM_PERCENT) {
                return 'Estoque mediano';
            }
            return 'Estoque alto';
        });
    }

    // true se a validade já passou ou vence dentro dos próximos dias configurados
    protected function nearExpiry(): Attribute
    {
        return Attribute::get(function () {
            if (!$this->expiry_date) {
                return false;
            }
            return $this->expiry_date->lte(now()->addDays(self::EXPIRING_DAYS)->endOfDay());
        });
    }

    // ---------- Filtros usados na listagem ----------

    public function scopeOutOfStock(Builder $query): Builder
    {
        return $query->where('quantity', '<=', 0);
    }

    public function scopeLowStock(Builder $query): Builder
    {
        return $query->where('quantity', '>', 0)
            ->whereRaw('quantity <= capacity * ?', [self::LOW_PERCENT / 100]);
    }

    public function scopeExpiring(Builder $query): Builder
    {
        return $query->whereNotNull('expiry_date')
            ->whereDate('expiry_date', '<=', now()->addDays(self::EXPIRING_DAYS)->toDateString());
    }
}
