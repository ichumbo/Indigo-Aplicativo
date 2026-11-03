<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Migration Batches
        Schema::create('migration_batches', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('trainer_id')->index();
            $table->string('source'); // 'mfit', 'avaliacao_fisica_pro', 'spreadsheet', 'pdf', 'images_zip', 'other'
            $table->string('status')->default('uploaded');
            $table->json('source_files');
            $table->json('column_mapping')->nullable();
            $table->integer('total_items')->default(0);
            $table->integer('imported_items')->default(0);
            $table->integer('warning_items')->default(0);
            $table->integer('failed_items')->default(0);
            $table->json('conflict_resolutions')->nullable();
            $table->json('execution_summary')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('rollback_until')->nullable();
            $table->timestamp('rolled_back_at')->nullable();
            $table->string('rollback_reason')->nullable();
            $table->timestamps();
        });

        // 2. Migration Items (Staging)
        Schema::create('migration_items', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('batch_id')->index();
            $table->foreign('batch_id')->references('id')->on('migration_batches')->onDelete('cascade');
            $table->string('item_type'); // 'student', 'workout', 'assessment', 'document', 'photo'
            $table->string('external_id')->nullable();
            $table->json('raw_data');
            $table->json('normalized_data')->nullable();
            $table->string('match_status')->default('new'); // 'new', 'exact_match', 'probable_match', 'conflict', 'ignored', 'invalid'
            $table->integer('match_confidence')->default(100);
            $table->string('matched_entity_id')->nullable();
            $table->string('review_decision')->nullable(); // 'create_new', 'link_existing', 'merge_empty', 'override_fields', 'ignore', 'keep_as_legacy'
            $table->json('warnings')->nullable();
            $table->json('errors')->nullable();
            $table->string('destination_id')->nullable()->index();
            $table->timestamp('imported_at')->nullable();
            $table->timestamps();
        });

        // 3. Legacy Imported Files
        Schema::create('legacy_imported_files', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('student_id')->index();
            $table->string('trainer_id')->index();
            $table->string('migration_batch_id')->nullable()->index();
            $table->string('category'); // 'workout_sheet', 'assessment', 'anamnesis', 'photo', 'report', 'document', 'unclassified'
            $table->string('original_name');
            $table->string('stored_path');
            $table->unsignedBigInteger('file_size');
            $table->string('mime_type');
            $table->string('source_platform');
            $table->date('original_date')->nullable();
            $table->text('notes')->nullable();
            $table->string('conversion_status')->default('raw_preserved');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('legacy_imported_files');
        Schema::dropIfExists('migration_items');
        Schema::dropIfExists('migration_batches');
    }
};

