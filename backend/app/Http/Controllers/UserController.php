<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Mail\WelcomePasswordMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class UserController extends Controller
{
    /**
     * Apenas usuários 'completo' (chefe) podem gerenciar contas.
     */
    private function ensureCompleto(Request $request)
    {
        $user = $request->user();

        if (! $user || ! $user->isCompleto()) {
            return response()->json([
                'message' => 'Acesso restrito: apenas usuários completo podem gerenciar contas',
            ], 403);
        }

        return null;
    }

    // Listar todos os utilizadores
    public function index(Request $request)
    {
        if ($response = $this->ensureCompleto($request)) {
            return $response;
        }

        return response()->json(User::all());
    }

    // Mostrar um utilizador
    public function show(Request $request, $id)
    {
        if ($response = $this->ensureCompleto($request)) {
            return $response;
        }

        $user = User::findOrFail($id);
        return response()->json($user);
    }

    // Criar novo utilizador (apenas chefe / perfil completo)
    public function store(Request $request)
    {
        if ($response = $this->ensureCompleto($request)) {
            return $response;
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'role' => ['required', 'string', 'in:atendente,chefe'],
            'access_level' => ['required', 'string', 'in:basico,completo'],
            'status' => 'nullable|in:Ativo,Inativo,ativo,inativo',
        ]);

        $role = $request->role;
        $accessLevel = $request->input('access_level', $role);
        $status = ucfirst(strtolower($request->input('status', 'Ativo')));

        // Gera uma senha temporária pelo sistema (não solicitada no formulário)
        $plainPassword = strtoupper(substr(str_shuffle('ABCDEFGHJKLMNPQRSTUVWXYZ23456789'), 0, 8));

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($plainPassword),
            'role' => $role,
            'access_level' => $accessLevel,
            'status' => $status,
        ]);

        // Tenta enviar a senha por e-mail. Se falhar, o chefe recebe a senha na resposta.
        $emailEnviado = true;
        try {
            Mail::to($user->email)->send(new WelcomePasswordMail($user->name, $plainPassword));
        } catch (\Throwable $e) {
            $emailEnviado = false;
            Log::warning('Falha ao enviar senha temporária: ' . $e->getMessage());
        }

        $message = 'Utilizador criado com sucesso!';
        $message .= $emailEnviado
            ? ' A senha foi enviada para o e-mail.'
            : ' Não foi possível enviar o e-mail; entregue a senha temporária ao colaborador.';

        return response()->json([
            'message' => $message,
            'user' => $user,
            'temporary_password' => $plainPassword,
        ], 201);
    }

    // Atualizar utilizador
    public function update(Request $request, $id)
    {
        if ($response = $this->ensureCompleto($request)) {
            return $response;
        }

        $user = User::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $id,
            'password' => 'nullable|string|min:6',
            'role' => ['sometimes', 'required', 'string', 'in:atendente,chefe'],
            'access_level' => ['sometimes', 'required', 'string', 'in:basico,completo'],
            'status' => 'nullable|in:Ativo,Inativo,ativo,inativo',
        ]);

        $data = $request->only(['name', 'email']);

        if ($request->filled('role')) {
            $data['role'] = $request->role;
        }
        if ($request->filled('access_level')) {
            $data['access_level'] = $request->access_level;
        }
        if ($request->filled('status')) {
            $data['status'] = ucfirst(strtolower($request->status));
        }

        $user->update($data);

        if ($request->filled('password')) {
            $user->update(['password' => Hash::make($request->password)]);
        }

        return response()->json(['message' => 'Utilizador atualizado com sucesso!', 'user' => $user->fresh()]);
    }

    // Apagar utilizador
    public function destroy(Request $request, $id)
    {
        if ($response = $this->ensureCompleto($request)) {
            return $response;
        }

        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'Utilizador apagado com sucesso!']);
    }
}
