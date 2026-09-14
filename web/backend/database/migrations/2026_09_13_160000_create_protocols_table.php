<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('protocols', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('trainer_id')->index();
            $table->string('student_id')->index();
            $table->string('student_name');
            $table->string('student_avatar')->nullable();
            $table->string('type')->default('aerobio'); // aerobio, forca, mobilidade, conconi
            $table->string('title')->default('PROTOCOLO AERÓBIO');
            $table->date('protocol_date');
            $table->text('warmup_text')->nullable();
            $table->json('conconi_test_result')->nullable();
            $table->json('days_prescription')->nullable();
            $table->text('general_notes')->nullable();
            $table->string('status')->default('ativo'); // ativo, rascunho, encerrado, arquivado
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('protocols');
    }
};
