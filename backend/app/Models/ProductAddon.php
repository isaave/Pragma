<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductAddon extends Model
{
    protected $fillable = [
        'product_id',
        'name',
        'price',
        'quantity',
        'is_active',
    ];

    protected $casts = [
        'price'   => 'float',
        'quantity'=> 'integer',
        'is_active' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
