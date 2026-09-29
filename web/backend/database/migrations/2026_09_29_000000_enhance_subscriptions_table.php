<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            if (!Schema::hasColumn('subscriptions', 'provider')) {
                $table->string('provider')->default('free')->after('plan_id');
            }
            if (!Schema::hasColumn('subscriptions', 'product_id')) {
                $table->string('product_id')->nullable()->after('provider');
            }
            if (!Schema::hasColumn('subscriptions', 'original_transaction_id')) {
                $table->string('original_transaction_id')->nullable()->index()->after('product_id');
            }
            if (!Schema::hasColumn('subscriptions', 'latest_transaction_id')) {
                $table->string('latest_transaction_id')->nullable()->index()->after('original_transaction_id');
            }
            if (!Schema::hasColumn('subscriptions', 'purchase_token')) {
                $table->text('purchase_token')->nullable()->after('latest_transaction_id');
            }
            if (!Schema::hasColumn('subscriptions', 'environment')) {
                $table->string('environment')->default('production')->after('purchase_token');
            }
            if (!Schema::hasColumn('subscriptions', 'auto_renew')) {
                $table->boolean('auto_renew')->default(false)->after('cancel_at_period_end');
            }
            if (!Schema::hasColumn('subscriptions', 'last_verified_at')) {
                $table->timestamp('last_verified_at')->nullable()->after('auto_renew');
            }
            if (!Schema::hasColumn('subscriptions', 'raw_payload')) {
                $table->json('raw_payload')->nullable()->after('last_verified_at');
            }
        });

        if (!Schema::hasTable('subscription_transactions')) {
            Schema::create('subscription_transactions', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->string('user_id')->index();
                $table->string('subscription_id')->nullable()->index();
                $table->string('provider'); // apple, google, admin
                $table->string('event_type'); // INITIAL_PURCHASE, RENEWAL, RESTORE, CANCELLATION, EXPIRATION, REFUND, REVOCATION, SERVER_NOTIFICATION
                $table->string('transaction_id')->nullable()->unique(); // Idempotency key
                $table->string('original_transaction_id')->nullable()->index();
                $table->string('product_id')->nullable();
                $table->text('purchase_token')->nullable();
                $table->string('status');
                $table->string('environment')->default('production');
                $table->json('payload')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_transactions');

        Schema::table('subscriptions', function (Blueprint $table) {
            $columns = [
                'provider',
                'product_id',
                'original_transaction_id',
                'latest_transaction_id',
                'purchase_token',
                'environment',
                'auto_renew',
                'last_verified_at',
                'raw_payload'
            ];
            foreach ($columns as $column) {
                if (Schema::hasColumn('subscriptions', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
