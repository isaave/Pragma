<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    public const CATEGORIES = ['hamburguer', 'combo', 'acompanhamento', 'bebida', 'sobremesa', 'adicional'];

    protected $fillable = [
        'name',
        'category',
        'description',
        'price',
        'is_active',
        'status',
        'notes',
    ];

    // Sempre carrega os ingredientes (necessário para calcular "available" e "recipe")
    // e os adicionais (para exibir no cardápio e no PDV)
    protected $with = ['ingredients', 'addons'];

    // Em vez de devolver "ingredients" com o pivot cru, a API devolve "recipe" (mais limpo)
    protected $hidden = ['ingredients'];
    protected $appends = ['available', 'recipe'];

    protected function casts(): array
    {
        return [
            'price' => 'float',
            'is_active' => 'boolean',
            'status' => 'string',
        ];
    }

    // Ingredientes do estoque usados neste produto (com a quantidade da receita)
    public function ingredients(): BelongsToMany
    {
        return $this->belongsToMany(Ingredient::class)->withPivot('quantity');
    }

    // Adicionais disponíveis para este produto (ex.: bacon extra, queijo extra)
    public function addons(): HasMany
    {
        return $this->hasMany(ProductAddon::class);
    }

    // Lista simples da receita: [{ingredient_id, name, unit, quantity}]
    protected function recipe(): Attribute
    {
        return Attribute::get(function () {
            return $this->ingredients->map(fn ($ingredient) => [
                'ingredient_id' => $ingredient->id,
                'name' => $ingredient->name,
                'unit' => $ingredient->unit,
                'quantity' => (float) $ingredient->pivot->quantity,
            ])->values()->all();
        });
    }

    // "Disponível" = produto ativo, status não é "inativo" nem "desenvolvimento" E todos os ingredientes da receita têm estoque suficiente
    protected function available(): Attribute
    {
        return Attribute::get(function () {
            if (!$this->is_active || in_array($this->status, ['inativo', 'desenvolvimento'])) {
                return false;
            }
            foreach ($this->ingredients as $ingredient) {
                if ($ingredient->quantity < (float) $ingredient->pivot->quantity) {
                    return false;
                }
            }
            return true;
        });
    }

    public function scopeCategory(Builder $query, ?string $category): Builder
    {
        return in_array($category, self::CATEGORIES, true)
            ? $query->where('category', $category)
            : $query;
    }

    public function scopeStatus(Builder $query, ?string $status): Builder
    {
        return $status ? $query->where('status', $status) : $query;
    }
}
