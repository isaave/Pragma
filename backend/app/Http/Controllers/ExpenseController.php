<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Services\AlertService;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    /** Lista saídas registadas, com filtro opcional por período. */
    public function index(Request $request)
    {
        $period = (string) $request->query('period', 'all');

        $query = Expense::with('user:id,name')->latest('expense_date')->latest();

        if ($period === 'today') {
            $query->whereDate('expense_date', now()->toDateString());
        } elseif ($period === 'month') {
            $query->whereBetween('expense_date', [now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateString()]);
        } elseif ($period === 'week') {
            $query->whereBetween('expense_date', [now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString()]);
        }

        return response()->json($query->get()->map(fn (Expense $e) => [
            'id' => $e->id,
            'description' => $e->description,
            'value' => (float) $e->value,
            'expense_date' => optional($e->expense_date)->format('Y-m-d'),
            'created_at' => optional($e->created_at)->format('d/m/Y H:i'),
            'user' => $e->user?->name,
        ]));
    }

    /** Regista uma nova saída (apenas nível completo). */
    public function store(Request $request)
    {
        if (! $request->user()?->isCompleto()) {
            return response()->json([
                'message' => 'Acesso restrito: apenas usuários completo podem registar saídas.',
            ], 403);
        }

        $data = $request->validate([
            'description' => 'required|string|max:255',
            'value' => 'required|numeric|gt:0|max:99999999',
            'expense_date' => 'nullable|date',
        ]);

        $expense = Expense::create([
            'description' => $data['description'],
            'value' => $data['value'],
            'expense_date' => $data['expense_date'] ?? now()->toDateString(),
            'user_id' => $request->user()->id,
        ]);

        app(AlertService::class)->expenseCreated($expense, $request->user()->name);

        return response()->json([
            'message' => 'Saída registada com sucesso!',
            'expense' => $expense,
        ], 201);
    }

    /** Elimina uma saída (apenas nível completo). */
    public function destroy(Request $request, Expense $expense)
    {
        if (! $request->user()?->isCompleto()) {
            return response()->json([
                'message' => 'Acesso restrito: apenas usuários completo podem remover saídas.',
            ], 403);
        }

        $expense->delete();

        return response()->json(['message' => 'Saída removida com sucesso!']);
    }
}
