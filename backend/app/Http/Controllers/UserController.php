<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Mail\WelcomePasswordMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class UserController extends Controller
{
    // Listar todos os utilizadores
    public function index()
    {
        return response()->json(User::all());
    }

    // Mostrar um utilizador
    public function show($id)
    {
        $user = User::findOrFail($id);
        return response()->json($user);
    }

    // Criar novo utilizador (Apenas Chefe)
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'role' => 'required|string|max:255',
            'access_level' => 'nullable|string|max:255',
            'status' => 'nullable|in:Ativo,Inativo,ativo,inativo',
        ]);

        $role = $request->role;
        $accessLevel = $request->input('access_level', 'Nível 1');
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

        // Envia a senha gerada para o email do utilizador
        Mail::to($user->email)->queue(new WelcomePasswordMail($user->name, $plainPassword));

        return response()->json(['message' => 'Utilizador criado com sucesso! A senha foi enviada para o email.', 'user' => $user], 201);
    }

    // Atualizar utilizador
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $id,
            'password' => 'nullable|string|min:6',
            'role' => 'nullable|string|max:255',
            'access_level' => 'nullable|string|max:255',
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
    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'Utilizador apagado com sucesso!']);
    }
}