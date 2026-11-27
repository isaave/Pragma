<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'target_view',
        'resource_type',
        'resource_id',
        'highlight',
        'read_at',
    ];

    protected $casts = [
        'highlight' => 'boolean',
        'read_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeUnread($query)
    {
        return $query->whereNull('read_at');
    }

    /** Formato consumido pelo frontend (same shape of src/types/notifications.ts). */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'message' => $this->message,
            'type' => $this->type,
            'target' => [
                'view' => $this->target_view,
                'resourceType' => $this->resource_type,
                'resourceId' => is_numeric($this->resource_id)
                    ? (int) $this->resource_id
                    : $this->resource_id,
                'highlight' => (bool) $this->highlight,
            ],
            'isRead' => $this->read_at !== null,
            'readAt' => optional($this->read_at)->toIso8601String(),
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
