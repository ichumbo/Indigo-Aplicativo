<?php

namespace App\Jobs;

use App\Models\MigrationBatch;
use App\Services\Migration\MigrationExecutorService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessMigrationBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 300;

    public function __construct(public string $batchId)
    {
    }

    public function handle(MigrationExecutorService $executor): void
    {
        $batch = MigrationBatch::find($this->batchId);
        if (!$batch || $batch->status === MigrationBatch::STATUS_COMPLETED || $batch->status === MigrationBatch::STATUS_ROLLED_BACK) {
            return;
        }

        $executor->execute($batch);
    }
}
