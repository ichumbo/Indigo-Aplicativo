<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Aprimoramento da tabela app_notifications
        Schema::table('app_notifications', function (Blueprint $table) {
            if (!Schema::hasColumn('app_notifications', 'recipient_id')) {
                $table->string('recipient_id')->nullable()->index()->after('user_id');
            }
            if (!Schema::hasColumn('app_notifications', 'tenant_id')) {
                $table->string('tenant_id')->nullable()->index()->after('recipient_id');
            }
            if (!Schema::hasColumn('app_notifications', 'personal_id')) {
                $table->string('personal_id')->nullable()->index()->after('tenant_id');
            }
            if (!Schema::hasColumn('app_notifications', 'category')) {
                $table->string('category')->default('general')->index()->after('type');
            }
            if (!Schema::hasColumn('app_notifications', 'priority')) {
                $table->string('priority')->default('normal')->index()->after('category');
            }
            if (!Schema::hasColumn('app_notifications', 'body')) {
                $table->text('body')->nullable()->after('title');
            }
            if (!Schema::hasColumn('app_notifications', 'data')) {
                $table->json('data')->nullable()->after('message');
            }
            if (!Schema::hasColumn('app_notifications', 'deep_link')) {
                $table->string('deep_link')->nullable()->after('data');
            }
            if (!Schema::hasColumn('app_notifications', 'source_type')) {
                $table->string('source_type')->nullable()->after('deep_link');
            }
            if (!Schema::hasColumn('app_notifications', 'source_id')) {
                $table->string('source_id')->nullable()->after('source_type');
            }
            if (!Schema::hasColumn('app_notifications', 'dedupe_key')) {
                $table->string('dedupe_key')->nullable()->index()->after('source_id');
            }
            if (!Schema::hasColumn('app_notifications', 'status')) {
                $table->string('status')->default('delivered')->index()->after('dedupe_key');
            }
            if (!Schema::hasColumn('app_notifications', 'scheduled_at')) {
                $table->timestamp('scheduled_at')->nullable()->after('status');
            }
            if (!Schema::hasColumn('app_notifications', 'sent_at')) {
                $table->timestamp('sent_at')->nullable()->after('scheduled_at');
            }
            if (!Schema::hasColumn('app_notifications', 'delivered_at')) {
                $table->timestamp('delivered_at')->nullable()->after('sent_at');
            }
            if (!Schema::hasColumn('app_notifications', 'read_at')) {
                $table->timestamp('read_at')->nullable()->after('delivered_at');
            }
            if (!Schema::hasColumn('app_notifications', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('read_at');
            }
            if (!Schema::hasColumn('app_notifications', 'failure_reason')) {
                $table->string('failure_reason')->nullable()->after('expires_at');
            }
        });

        // 2. Criação da tabela push_devices
        if (!Schema::hasTable('push_devices')) {
            Schema::create('push_devices', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->string('user_id')->index();
                $table->string('tenant_id')->nullable()->index();
                $table->string('token')->index();
                $table->string('provider')->default('expo'); // expo, fcm, apns, web
                $table->string('platform')->default('ios'); // ios, android, web
                $table->string('device_id')->nullable()->index();
                $table->string('app_version')->nullable();
                $table->string('environment')->default('production'); // development, staging, production
                $table->boolean('active')->default(true)->index();
                $table->timestamp('last_seen_at')->nullable();
                $table->timestamp('invalidated_at')->nullable();
                $table->timestamps();
            });
        }

        // 3. Criação da tabela user_notification_preferences
        if (!Schema::hasTable('user_notification_preferences')) {
            Schema::create('user_notification_preferences', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->string('user_id')->unique();
                $table->json('preferences');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_notification_preferences');
        Schema::dropIfExists('push_devices');
    }
};
