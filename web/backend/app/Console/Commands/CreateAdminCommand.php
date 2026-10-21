<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CreateAdminCommand extends Command
{
    protected $signature = 'admin:create 
                            {--email= : O e-mail do administrador}
                            {--name= : O nome do administrador}
                            {--password= : A senha inicial do administrador}
                            {--role=SUPER_ADMIN : O papel (SUPER_ADMIN, SUPPORT_ADMIN, FINANCIAL_ADMIN, READONLY_ADMIN)}';

    protected $description = 'Cria ou atualiza um administrador seguro com credenciais com hash';

    public function handle(): int
    {
        $email = $this->option('email') ?: $this->ask('E-mail do administrador:');
        $name = $this->option('name') ?: $this->ask('Nome do administrador:');
        $password = $this->option('password') ?: $this->secret('Senha do administrador:');
        $role = strtoupper($this->option('role') ?: 'SUPER_ADMIN');

        $allowedRoles = ['SUPER_ADMIN', 'SUPPORT_ADMIN', 'FINANCIAL_ADMIN', 'READONLY_ADMIN'];
        if (!in_array($role, $allowedRoles)) {
            $this->error("Papel inválido. Escolha entre: " . implode(', ', $allowedRoles));
            return 1;
        }

        if (strlen($password) < 6) {
            $this->error('A senha deve ter no mínimo 6 caracteres.');
            return 1;
        }

        $user = User::where('email', $email)->first();

        if ($user) {
            $user->name = $name;
            $user->password = Hash::make($password);
            $user->role = $role;
            $user->status = 'ACTIVE';
            $user->is_email_verified = true;
            $user->email_verified_at = now();
            $user->save();
            $this->info("Administrador existente atualizado com sucesso: {$email} ({$role})");
        } else {
            $user = User::create([
                'id' => 'admin-' . Str::uuid(),
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($password),
                'role' => $role,
                'status' => 'ACTIVE',
                'is_email_verified' => true,
                'email_verified_at' => now(),
                'last_access_at' => now(),
            ]);
            $this->info("Novo administrador criado com sucesso: {$email} ({$role})");
        }

        return 0;
    }
}
