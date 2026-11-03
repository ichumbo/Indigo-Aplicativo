<?php

namespace App\Services\Migration;

use App\Models\StudentProfile;
use App\Models\TrainerStudent;

class DuplicateReconciliationService
{
    /**
     * Reconcilia um aluno importado contra a carteira de alunos ativos do personal.
     */
    public function reconcileStudent(array $incoming, string $trainerId): array
    {
        $relationships = TrainerStudent::where('trainer_id', $trainerId)
            ->where('status', 'ACTIVE')
            ->pluck('student_id')
            ->toArray();

        if (empty($relationships)) {
            return [
                'match_status' => 'new',
                'match_confidence' => 0,
                'matched_entity_id' => null,
                'suggested_decision' => 'create_new',
                'warnings' => [],
            ];
        }

        $existingStudents = StudentProfile::whereIn('id', $relationships)->get();

        $incomingEmail = !empty($incoming['email']) ? strtolower(trim($incoming['email'])) : null;
        $incomingPhone = !empty($incoming['phone']) ? preg_replace('/\D/', '', $incoming['phone']) : null;
        $incomingName = $this->normalizeString($incoming['fullName'] ?? '');
        $incomingBirth = $incoming['birthDate'] ?? null;

        // 1. Checagem por E-mail (Correspondência Forte - 100%)
        if ($incomingEmail) {
            foreach ($existingStudents as $student) {
                $studentEmail = strtolower(trim($student->contact['email'] ?? ''));
                if ($studentEmail && $studentEmail === $incomingEmail) {
                    return [
                        'match_status' => 'exact_match',
                        'match_confidence' => 100,
                        'matched_entity_id' => $student->id,
                        'matched_student' => [
                            'id' => $student->id,
                            'name' => $student->full_name,
                            'email' => $studentEmail,
                        ],
                        'suggested_decision' => 'link_existing',
                        'warnings' => [],
                    ];
                }
            }
        }

        // 2. Checagem por Telefone (Correspondência Forte - 95%)
        if ($incomingPhone && strlen($incomingPhone) >= 10) {
            foreach ($existingStudents as $student) {
                $studentPhone = preg_replace('/\D/', '', $student->contact['phone'] ?? '');
                if ($studentPhone && ($studentPhone === $incomingPhone || str_ends_with($studentPhone, $incomingPhone) || str_ends_with($incomingPhone, $studentPhone))) {
                    return [
                        'match_status' => 'exact_match',
                        'match_confidence' => 95,
                        'matched_entity_id' => $student->id,
                        'matched_student' => [
                            'id' => $student->id,
                            'name' => $student->full_name,
                            'phone' => $studentPhone,
                        ],
                        'suggested_decision' => 'link_existing',
                        'warnings' => [],
                    ];
                }
            }
        }

        // 3. Checagem por Nome + Data de Nascimento (Correspondência Provável - 80%)
        if ($incomingName && $incomingBirth) {
            foreach ($existingStudents as $student) {
                $existingName = $this->normalizeString($student->full_name);
                $existingBirth = $student->birth_date;

                if ($existingName === $incomingName && $existingBirth === $incomingBirth) {
                    return [
                        'match_status' => 'probable_match',
                        'match_confidence' => 80,
                        'matched_entity_id' => $student->id,
                        'matched_student' => [
                            'id' => $student->id,
                            'name' => $student->full_name,
                            'birthDate' => $existingBirth,
                        ],
                        'suggested_decision' => 'link_existing',
                        'warnings' => ['Mesmo nome e mesma data de nascimento encontrados. Recomenda-se confirmar o vínculo.'],
                    ];
                }
            }
        }

        // 4. Homônimo Puro (Mesmo Nome, mas sem identificador coincidente) -> Conflito/Revisão Obrigatória
        if ($incomingName) {
            foreach ($existingStudents as $student) {
                $existingName = $this->normalizeString($student->full_name);
                if ($existingName === $incomingName) {
                    return [
                        'match_status' => 'conflict',
                        'match_confidence' => 50,
                        'matched_entity_id' => $student->id,
                        'matched_student' => [
                            'id' => $student->id,
                            'name' => $student->full_name,
                            'email' => $student->contact['email'] ?? null,
                            'phone' => $student->contact['phone'] ?? null,
                        ],
                        'suggested_decision' => 'create_new', // REGRA DE OURO: Nunca mesclar homônimo automaticamente!
                        'warnings' => [
                            'Homônimo detectado: aluno com o mesmo nome já existe em sua carteira, mas e-mail ou telefone são diferentes ou ausentes. O sistema sugere criar um novo cadastro ou confirmar manualmente.',
                        ],
                    ];
                }
            }
        }

        // 5. Sem Correspondência
        return [
            'match_status' => 'new',
            'match_confidence' => 0,
            'matched_entity_id' => null,
            'suggested_decision' => 'create_new',
            'warnings' => [],
        ];
    }

    private function normalizeString(string $value): string
    {
        $normalized = mb_strtolower(trim($value));
        $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalized);
        return preg_replace('/[^a-z0-9]/', '', $normalized);
    }
}

