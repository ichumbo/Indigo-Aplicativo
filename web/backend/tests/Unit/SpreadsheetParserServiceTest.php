<?php

namespace Tests\Unit;

use App\Services\Migration\CanonicalNormalizerService;
use App\Services\Migration\SpreadsheetParserService;
use Tests\TestCase;

class SpreadsheetParserServiceTest extends TestCase
{
    private SpreadsheetParserService $parser;
    private CanonicalNormalizerService $normalizer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->parser = new SpreadsheetParserService();
        $this->normalizer = new CanonicalNormalizerService();
    }

    public function test_parses_csv_with_semicolon_and_utf8_bom(): void
    {
        $csvContent = "\xEF\xBB\xBF" . "nome_completo;email;telefone;data_nascimento\n" .
            "João da Silva;joao@teste.com;(11) 98888-7777;10/05/1990\n" .
            "Maria Santos;maria@teste.com;(21) 97777-6666;25/12/1985\n";

        $tempFile = tempnam(sys_get_temp_dir(), 'test_csv_');
        file_put_contents($tempFile, $csvContent);

        $parsed = $this->parser->parseFile($tempFile, 'teste.csv');
        unlink($tempFile);

        $this->assertCount(2, $parsed['rows']);
        $this->assertEquals(['nome_completo', 'email', 'telefone', 'data_nascimento'], $parsed['headers']);
        $this->assertEquals('João da Silva', $parsed['rows'][0]['nome_completo']);
        $this->assertEquals('joao@teste.com', $parsed['rows'][0]['email']);
    }

    public function test_parses_csv_with_comma_delimiter(): void
    {
        $csvContent = "nome_completo,email,objetivo\n" .
            "\"Lucas Ferreira\",lucas@teste.com,\"Hipertrofia e Força\"\n";

        $tempFile = tempnam(sys_get_temp_dir(), 'test_csv_comma_');
        file_put_contents($tempFile, $csvContent);

        $parsed = $this->parser->parseFile($tempFile, 'teste.csv');
        unlink($tempFile);

        $this->assertCount(1, $parsed['rows']);
        $this->assertEquals('Lucas Ferreira', $parsed['rows'][0]['nome_completo']);
        $this->assertEquals('Hipertrofia e Força', $parsed['rows'][0]['objetivo']);
    }

    public function test_normalizer_converts_brazilian_dates_and_phones(): void
    {
        $rawStudent = [
            'nome_completo' => 'Renato Russo',
            'email' => '  RENATO@TESTE.COM  ',
            'telefone' => '(11) 98765-4321',
            'data_nascimento' => '27/03/1960',
            'objetivo_principal' => 'Condicionamento',
        ];

        $normalized = $this->normalizer->normalizeStudent($rawStudent);

        $this->assertEquals('Renato Russo', $normalized['data']['fullName']);
        $this->assertEquals('renato@teste.com', $normalized['data']['email']);
        $this->assertEquals('11987654321', $normalized['data']['phoneNormalized']);
        $this->assertEquals('1960-03-27', $normalized['data']['birthDate']);
        $this->assertEmpty($normalized['errors']);
    }

    public function test_normalizer_handles_comma_decimals_and_workout_loads(): void
    {
        $rawWorkout = [
            'nome_treino' => 'Treino A',
            'exercicio' => 'Supino Reto com Barra',
            'grupo_muscular' => 'Peitoral',
            'series' => '4',
            'repeticoes' => '10-12',
            'carga_kg' => '42,5',
            'descanso_segundos' => '90',
        ];

        $normalized = $this->normalizer->normalizeWorkout($rawWorkout);

        $this->assertEquals('Treino A', $normalized['data']['workoutName']);
        $this->assertEquals('Supino Reto com Barra', $normalized['data']['exerciseName']);
        $this->assertEquals(4, $normalized['data']['plannedSets']);
        $this->assertEquals(42.5, $normalized['data']['plannedLoad']);
        $this->assertEquals(90, $normalized['data']['restSeconds']);
    }

    public function test_normalizer_flags_missing_required_student_name(): void
    {
        $rawStudent = [
            'email' => 'semnome@teste.com',
        ];

        $normalized = $this->normalizer->normalizeStudent($rawStudent);

        $this->assertNotEmpty($normalized['errors']);
        $this->assertStringContainsString('Nome', $normalized['errors'][0]);
    }
}
