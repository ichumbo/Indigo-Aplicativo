<?php

namespace Tests\Unit;

use App\Services\Migration\TemplateGeneratorService;
use Tests\TestCase;

class TemplateGeneratorServiceTest extends TestCase
{
    private TemplateGeneratorService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new TemplateGeneratorService();
    }

    public function test_generates_student_template_csv(): void
    {
        $csv = $this->service->generateCsv('students');

        $this->assertStringContainsString('nome_completo', $csv);
        $this->assertStringContainsString('email', $csv);
        $this->assertStringContainsString('telefone', $csv);
        $this->assertStringContainsString('objetivo_principal', $csv);
        // Deve conter linhas de exemplo
        $this->assertStringContainsString('Carlos Eduardo Silva', $csv);
    }

    public function test_generates_workout_template_csv(): void
    {
        $csv = $this->service->generateCsv('workouts');

        $this->assertStringContainsString('nome_treino', $csv);
        $this->assertStringContainsString('exercicio', $csv);
        $this->assertStringContainsString('series', $csv);
        $this->assertStringContainsString('repeticoes', $csv);
        $this->assertStringContainsString('Supino Reto', $csv);
    }

    public function test_generates_assessment_template_csv(): void
    {
        $csv = $this->service->generateCsv('assessments');

        $this->assertStringContainsString('data_avaliacao', $csv);
        $this->assertStringContainsString('peso_kg', $csv);
        $this->assertStringContainsString('percentual_gordura', $csv);
        $this->assertStringContainsString('Jackson & Pollock 3 Dobras', $csv);
    }

    public function test_returns_available_template_types_and_metadata(): void
    {
        $templates = $this->service->getAvailableTemplates();

        $this->assertArrayHasKey('students', $templates);
        $this->assertArrayHasKey('workouts', $templates);
        $this->assertArrayHasKey('assessments', $templates);
        $this->assertArrayHasKey('measurements', $templates);
        $this->assertArrayHasKey('documents', $templates);
        $this->assertArrayHasKey('photos', $templates);
    }

    public function test_returns_legal_export_guides(): void
    {
        $guides = $this->service->getLegalExportGuides();

        $this->assertArrayHasKey('mfit', $guides);
        $this->assertArrayHasKey('avaliacao_fisica_pro', $guides);
        $this->assertArrayHasKey('spreadsheet', $guides);
        $this->assertStringContainsString('LGPD', $guides['mfit']['legal_disclaimer']);
    }
}

