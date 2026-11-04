<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

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
            'password' => 'required|string|min:6',
            'role' => 'required|in:Chefe,Atendente,chefe,atendente',
            'access_level' => 'nullable|in:Nível 1,Nível 2,Nível 3',
            'status' => 'nullable|in:Ativo,Inativo,ativo,inativo',
        ]);

        $role = ucfirst(strtolower($request->role));
        $accessLevel = $request->input('access_level', 'Nível 1');
        $status = ucfirst(strtolower($request->input('status', 'Ativo')));

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $role,
            'access_level' => $accessLevel,
            'status' => $status,
        ]);

        return response()->json(['message' => 'Utilizador criado com sucesso!', 'user' => $user], 201);
    }

    // Atualizar utilizador
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $id,
            'password' => 'nullable|string|min:6',
            'role' => 'nullable|in:Chefe,Atendente,chefe,atendente',
            'access_level' => 'nullable|in:Nível 1,Nível 2,Nível 3',
            'status' => 'nullable|in:Ativo,Inativo,ativo,inativo',
        ]);

        $data = $request->only(['name', 'email']);

        if ($request->filled('role')) {
            $data['role'] = ucfirst(strtolower($request->role));
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