<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('audit_logs', 'ip_address')) {
                $table->string('ip_address', 45)->nullable()->after('target_id');
            }
            if (!Schema::hasColumn('audit_logs', 'user_agent')) {
                $table->text('user_agent')->nullable()->after('ip_address');
            }
            if (!Schema::hasColumn('audit_logs', 'correlation_id')) {
                $table->string('correlation_id', 64)->nullable()->index()->after('user_agent');
            }
            if (!Schema::hasColumn('audit_logs', 'reason')) {
                $table->text('reason')->nullable()->after('correlation_id');
            }
            if (!Schema::hasColumn('audit_logs', 'old_values')) {
                $table->json('old_values')->nullable()->after('reason');
            }
            if (!Schema::hasColumn('audit_logs', 'new_values')) {
                $table->json('new_values')->nullable()->after('old_values');
            }
            if (!Schema::hasColumn('audit_logs', 'result')) {
                $table->string('result', 32)->default('SUCCESS')->after('new_values');
            }
            if (!Schema::hasColumn('audit_logs', 'level')) {
                $table->string('level', 16)->default('info')->after('result');
            }
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $columns = [
                'ip_address',
                'user_agent',
                'correlation_id',
                'reason',
                'old_values',
                'new_values',
                'result',
                'level'
            ];
            foreach ($columns as $column) {
                if (Schema::hasColumn('audit_logs', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
