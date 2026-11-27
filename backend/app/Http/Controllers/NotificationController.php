<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /** Lista as notificações do usuário com o total de não lidas. */
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $notifications = Notification::where('user_id', $userId)
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (Notification $notification) => $notification->toApiArray());

        $unreadCount = Notification::where('user_id', $userId)->unread()->count();

        return response()->json([
            'notifications' => $notifications,
            'unreadCount' => $unreadCount,
        ]);
    }

    /** Marca uma notificação como lida. */
    public function markAsRead(Request $request, Notification $notification)
    {
        if ((int) $notification->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Notificação não encontrada.'], 404);
        }

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json([
            'notification' => $notification->fresh()->toApiArray(),
            'unreadCount' => Notification::where('user_id', $request->user()->id)->unread()->count(),
        ]);
    }

    /** Marca todas as notificações do usuário como lidas. */
    public function markAllAsRead(Request $request)
    {
        Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'unreadCount' => 0,
        ]);
    }
}
