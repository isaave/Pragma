<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    // Ver perfil do utilizador autenticado
    public function show(Request $request)
    {
        $user = $request->user();
        $data = $user->toArray();
        $data['avatar_url'] = $user->avatar ? Storage::url($user->avatar) : null;
        return response()->json($data);
    }

    // Atualizar dados do perfil (nome, email, senha)
    public function update(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:6|confirmed',
        ]);

        $data = $request->only(['name', 'email']);
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        $fresh = $user->fresh();
        $result = $fresh->toArray();
        $result['avatar_url'] = $fresh->avatar ? Storage::url($fresh->avatar) : null;
        return response()->json(['message' => 'Perfil atualizado com sucesso!', 'user' => $result]);
    }

    // Anexar/atualizar imagem de perfil
    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $user = $request->user();

        if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
            Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar' => $path]);

        return response()->json([
            'message' => 'Imagem de perfil atualizada!',
            'avatar' => $path,
            'avatar_url' => Storage::url($path),
        ]);
    }
}