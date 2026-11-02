<?php

namespace App\Services\Migration;

use App\Models\Exercise;

class ExerciseMatcherService
{
    /**
     * Tabela de sinônimos/aliases comuns entre plataformas.
     */
    private array $commonAliases = [
        'supino reto' => 'Supino Reto',
        'supino reto com barra' => 'Supino Reto',
        'supino reto barra' => 'Supino Reto',
        'supino barra' => 'Supino Reto',
        'barbell bench press' => 'Supino Reto',
        'supino inclinado' => 'Supino Inclinado com Halteres',
        'supino inclinado halteres' => 'Supino Inclinado com Halteres',
        'agachamento livre' => 'Agachamento Livre',
        'agachamento com barra' => 'Agachamento Livre',
        'puxada frente' => 'Puxada Frontal',
        'puxada alta frontal' => 'Puxada Frontal',
        'leg press' => 'Leg Press 45',
        'leg press 45' => 'Leg Press 45',
        'elevacao lateral' => 'Elevação Lateral com Halteres',
        'rosca direta' => 'Rosca Direta com Barra W',
        'triceps corda' => 'Tríceps Corda no Pulley',
    ];

    /**
     * Localiza exercício correspondente no catálogo do DragonCorp.
     */
    public function match(string $incomingName, string $trainerId): array
    {
        $normalizedInput = $this->normalizeText($incomingName);

        if (empty($normalizedInput)) {
            return [
                'catalog_id' => null,
                'matched_name' => $incomingName,
                'confidence' => 0,
                'is_custom' => true,
            ];
        }

        // 1. Checar catálogo por nome exato (sistema ou do próprio personal)
        $exactExercise = Exercise::where(function ($q) use ($trainerId) {
            $q->whereNull('trainer_id')->orWhere('trainer_id', $trainerId);
        })
        ->whereRaw('LOWER(name) = ?', [mb_strtolower(trim($incomingName))])
        ->first();

        if ($exactExercise) {
            return [
                'catalog_id' => $exactExercise->id,
                'matched_name' => $exactExercise->name,
                'confidence' => 100,
                'is_custom' => false,
            ];
        }

        // 2. Checar tabela de aliases comuns
        $targetName = $this->commonAliases[$normalizedInput] ?? null;
        if ($targetName) {
            $aliasExercise = Exercise::where(function ($q) use ($trainerId) {
                $q->whereNull('trainer_id')->orWhere('trainer_id', $trainerId);
            })
            ->where('name', $targetName)
            ->first();

            if ($aliasExercise) {
                return [
                    'catalog_id' => $aliasExercise->id,
                    'matched_name' => $aliasExercise->name,
                    'confidence' => 95,
                    'is_custom' => false,
                ];
            }
        }

        // 3. Busca por similaridade com catálogo existente
        $allExercises = Exercise::where(function ($q) use ($trainerId) {
            $q->whereNull('trainer_id')->orWhere('trainer_id', $trainerId);
        })->get(['id', 'name']);

        $bestMatch = null;
        $highestSimilarity = 0;

        foreach ($allExercises as $ex) {
            $normalizedCatalog = $this->normalizeText($ex->name);

            // Similaridade via similar_text
            similar_text($normalizedInput, $normalizedCatalog, $percent);

            if ($percent > $highestSimilarity) {
                $highestSimilarity = $percent;
                $bestMatch = $ex;
            }
        }

        if ($bestMatch && $highestSimilarity >= 80) {
            return [
                'catalog_id' => $bestMatch->id,
                'matched_name' => $bestMatch->name,
                'confidence' => (int) round($highestSimilarity),
                'is_custom' => false,
            ];
        }

        // Não encontrado com segurança: manter como exercício customizado do personal
        return [
            'catalog_id' => null,
            'matched_name' => $incomingName,
            'confidence' => (int) round($highestSimilarity),
            'is_custom' => true,
        ];
    }

    private function normalizeText(string $text): string
    {
        $normalized = mb_strtolower(trim($text));
        $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalized);
        return preg_replace('/[^a-z0-9 ]/', '', $normalized);
    }
}
