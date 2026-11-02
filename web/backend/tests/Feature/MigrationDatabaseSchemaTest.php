<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MigrationDatabaseSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_migration_batches_table_exists_and_has_required_columns(): void
    {
        $this->assertTrue(Schema::hasTable('migration_batches'), 'migration_batches table should exist');
        $this->assertTrue(Schema::hasColumns('migration_batches', [
            'id',
            'trainer_id',
            'source',
            'status',
            'source_files',
            'column_mapping',
            'total_items',
            'imported_items',
            'warning_items',
            'failed_items',
            'conflict_resolutions',
            'execution_summary',
            'rollback_until',
            'rolled_back_at',
            'rollback_reason',
            'created_at',
            'updated_at',
        ]));
    }

    public function test_migration_items_table_exists_and_has_required_columns(): void
    {
        $this->assertTrue(Schema::hasTable('migration_items'), 'migration_items table should exist');
        $this->assertTrue(Schema::hasColumns('migration_items', [
            'id',
            'batch_id',
            'item_type',
            'external_id',
            'raw_data',
            'normalized_data',
            'match_status',
            'match_confidence',
            'matched_entity_id',
            'review_decision',
            'warnings',
            'errors',
            'destination_id',
            'imported_at',
            'created_at',
            'updated_at',
        ]));
    }

    public function test_legacy_imported_files_table_exists_and_has_required_columns(): void
    {
        $this->assertTrue(Schema::hasTable('legacy_imported_files'), 'legacy_imported_files table should exist');
        $this->assertTrue(Schema::hasColumns('legacy_imported_files', [
            'id',
            'student_id',
            'trainer_id',
            'migration_batch_id',
            'category',
            'original_name',
            'stored_path',
            'file_size',
            'mime_type',
            'source_platform',
            'original_date',
            'notes',
            'conversion_status',
            'created_at',
            'updated_at',
        ]));
    }
}
