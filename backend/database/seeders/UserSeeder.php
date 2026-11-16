<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Criar a conta do Chefe
        User::create([
            'name' => 'Chefe House Burguer',
            'email' => 'chefe@pragma.com',
            'password' => Hash::make('password123'),
            'role' => 'Chefe',
            'access_level' => 'Nível 3',
            'status' => 'Ativo',
        ]);

        // Criar a conta da Atendente
        User::create([
            'name' => 'Atendente Pragma',
            'email' => 'atendente@pragma.com',
            'password' => Hash::make('password123'),
            'role' => 'Atendente',
            'access_level' => 'Nível 1',
            'status' => 'Ativo',
        ]);
    }
}