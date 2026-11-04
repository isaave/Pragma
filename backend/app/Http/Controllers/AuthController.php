<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (Auth::attempt($credentials)) {
            $user = Auth::user();
            $token = $user->createToken('pragma-token')->plainTextToken;

            return response()->json([
                'message' => 'Login efetuado com sucesso!',
                'user' => $user,
                'token' => $token
            ]);
        }

        return response()->json([
            'message' => 'Credenciais inválidas.'
        ], 401);
    }
}