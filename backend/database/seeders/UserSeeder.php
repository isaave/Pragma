<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Criar a conta de Acesso Basico
        User::create([
            'name' => 'Usuario Basico House Burguer',
            'email' => 'basico@pragma.com',
            'password' => Hash::make('password123'),
            'role' => 'atendente',
            'access_level' => 'basico',
            'status' => 'Ativo',
        ]);

        // Criar a conta de Acesso Completo
        User::create([
            'name' => 'Usuario Completo House Burguer',
            'email' => 'completo@pragma.com',
            'password' => Hash::make('password123'),
            'role' => 'chefe',
            'access_level' => 'completo',
            'status' => 'Ativo',
        ]);
    }
}