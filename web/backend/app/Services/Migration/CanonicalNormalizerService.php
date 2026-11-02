<?php

namespace App\Services\Migration;

use Carbon\Carbon;
use Exception;

class CanonicalNormalizerService
{
    /**
     * Normaliza dados brutos de aluno para a estrutura canônica do DragonCorp.
     */
    public function normalizeStudent(array $raw, array $mapping = []): array
    {
        $mapped = $this->applyMapping($raw, $mapping);
        $errors = [];
        $warnings = [];

        // 1. Nome Completo (obrigatório)
        $fullName = trim($mapped['fullName'] ?? $mapped['nome_completo'] ?? $mapped['nome'] ?? $mapped['aluno'] ?? '');
        if (empty($fullName)) {
            $errors[] = 'Nome completo do aluno é obrigatório.';
        }

        // 2. E-mail (normalizado em minúsculas)
        $rawEmail = trim($mapped['email'] ?? $mapped['e_mail'] ?? $mapped['correio_eletronico'] ?? '');
        $email = !empty($rawEmail) ? strtolower($rawEmail) : null;
        if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $warnings[] = "E-mail '{$email}' possui formato inválido e foi mantido como observação.";
            $email = null;
        }

        // 3. Telefone (apenas dígitos para indexação/matching)
        $rawPhone = trim($mapped['phone'] ?? $mapped['telefone'] ?? $mapped['celular'] ?? $mapped['whatsapp'] ?? '');
        $phoneDigits = preg_replace('/\D/', '', $rawPhone);
        if (strlen($phoneDigits) < 8) {
            $phoneDigits = null;
        }

        // 4. Data de Nascimento
        $rawBirth = trim($mapped['birthDate'] ?? $mapped['data_nascimento'] ?? $mapped['nascimento'] ?? '');
        $birthDate = $this->parseDate($rawBirth);

        // 5. Gênero
        $rawGender = strtolower(trim($mapped['gender'] ?? $mapped['genero'] ?? $mapped['sexo'] ?? ''));
        $gender = 'not_informed';
        if (str_starts_with($rawGender, 'm')) {
            $gender = 'masculino';
        } elseif (str_starts_with($rawGender, 'f')) {
            $gender = 'feminino';
        }

        // 6. Objetivos
        $mainGoal = trim($mapped['mainGoal'] ?? $mapped['objetivo_principal'] ?? $mapped['objetivo'] ?? 'Hipertrofia e Condicionamento');
        $secondaryGoalsRaw = trim($mapped['secondaryGoals'] ?? $mapped['objetivos_secundarios'] ?? '');
        $secondaryGoals = !empty($secondaryGoalsRaw)
            ? array_map('trim', explode(',', $secondaryGoalsRaw))
            : [];

        // 7. Profissão e Endereço
        $profession = trim($mapped['profession'] ?? $mapped['profissao'] ?? '') ?: null;
        $address = trim($mapped['address'] ?? $mapped['endereco'] ?? $mapped['cidade'] ?? '') ?: null;
        $adminNotes = trim($mapped['administrativeNotes'] ?? $mapped['observacoes_administrativas'] ?? $mapped['observacoes'] ?? $mapped['notas'] ?? '') ?: null;

        // 8. ID Externo
        $externalId = trim($mapped['externalId'] ?? $mapped['id_externo'] ?? $mapped['id'] ?? '') ?: null;

        return [
            'data' => [
                'externalId' => $externalId,
                'fullName' => $fullName,
                'email' => $email,
                'phone' => $rawPhone ?: null,
                'phoneNormalized' => $phoneDigits,
                'birthDate' => $birthDate,
                'gender' => $gender,
                'mainGoal' => $mainGoal ?: 'Hipertrofia e Condicionamento',
                'secondaryGoals' => $secondaryGoals,
                'profession' => $profession,
                'address' => $address,
                'administrativeNotes' => $adminNotes,
            ],
            'errors' => $errors,
            'warnings' => $warnings,
        ];
    }

    /**
     * Normaliza dados brutos de treino para a estrutura canônica.
     */
    public function normalizeWorkout(array $raw, array $mapping = []): array
    {
        $mapped = $this->applyMapping($raw, $mapping);
        $errors = [];
        $warnings = [];

        $workoutName = trim($mapped['workoutName'] ?? $mapped['nome_treino'] ?? $mapped['plano'] ?? 'Treino Importado');
        $sessionName = trim($mapped['sessionName'] ?? $mapped['nome_sessao'] ?? $mapped['sessao'] ?? 'Treino Principal');
        $sessionIdentifier = trim($mapped['sessionIdentifier'] ?? $mapped['identificador_sessao'] ?? $mapped['divisao'] ?? 'Treino A');
        $exerciseName = trim($mapped['exerciseName'] ?? $mapped['exercicio'] ?? $mapped['nome_exercicio'] ?? '');

        if (empty($exerciseName)) {
            $errors[] = 'Nome do exercício é obrigatório para prescrição de treino.';
        }

        $muscleGroup = trim($mapped['muscleGroup'] ?? $mapped['grupo_muscular'] ?? $mapped['grupo'] ?? 'Geral') ?: 'Geral';
        $order = intval($mapped['order'] ?? $mapped['ordem_exercicio'] ?? $mapped['ordem'] ?? 1);
        $plannedSets = max(1, intval($mapped['plannedSets'] ?? $mapped['series'] ?? 3));
        $plannedReps = trim($mapped['plannedReps'] ?? $mapped['repeticoes'] ?? '10-12');

        // Normalização de carga com suporte a vírgula brasileira (ex: 35,5 -> 35.5)
        $rawLoad = trim($mapped['plannedLoad'] ?? $mapped['carga_kg'] ?? $mapped['carga'] ?? '');
        $plannedLoad = null;
        if (!empty($rawLoad)) {
            $cleanedLoad = str_replace(',', '.', preg_replace('/[^\d.,]/', '', $rawLoad));
            if (is_numeric($cleanedLoad)) {
                $plannedLoad = floatval($cleanedLoad);
            }
        }

        $restSeconds = intval($mapped['restSeconds'] ?? $mapped['descanso_segundos'] ?? $mapped['descanso'] ?? 60);
        $tempo = trim($mapped['tempo'] ?? $mapped['cadencia'] ?? '') ?: null;
        $observation = trim($mapped['observation'] ?? $mapped['observacoes'] ?? $mapped['obs'] ?? '') ?: null;
        $studentName = trim($mapped['studentName'] ?? $mapped['nome_aluno'] ?? $mapped['aluno'] ?? '') ?: null;
        $studentExternalId = trim($mapped['studentExternalId'] ?? $mapped['id_aluno_externo'] ?? '') ?: null;

        return [
            'data' => [
                'studentExternalId' => $studentExternalId,
                'studentName' => $studentName,
                'workoutName' => $workoutName,
                'sessionName' => $sessionName,
                'sessionIdentifier' => $sessionIdentifier,
                'exerciseName' => $exerciseName,
                'muscleGroup' => $muscleGroup,
                'order' => $order,
                'plannedSets' => $plannedSets,
                'plannedReps' => $plannedReps,
                'plannedLoad' => $plannedLoad,
                'loadUnit' => 'kg',
                'restSeconds' => $restSeconds > 0 ? $restSeconds : 60,
                'tempo' => $tempo,
                'observation' => $observation,
            ],
            'errors' => $errors,
            'warnings' => $warnings,
        ];
    }

    private function applyMapping(array $raw, array $mapping): array
    {
        if (empty($mapping)) {
            return $raw;
        }

        $result = $raw;
        foreach ($mapping as $sourceCol => $canonicalKey) {
            $loweredSource = strtolower(trim($sourceCol));
            if (isset($raw[$loweredSource])) {
                $result[$canonicalKey] = $raw[$loweredSource];
            } elseif (isset($raw[$sourceCol])) {
                $result[$canonicalKey] = $raw[$sourceCol];
            }
        }

        return $result;
    }

    private function parseDate(string $rawDate): ?string
    {
        if (empty($rawDate)) {
            return null;
        }

        // Se for número serial do Excel (ex: 45000)
        if (is_numeric($rawDate) && intval($rawDate) > 30000 && intval($rawDate) < 70000) {
            $days = intval($rawDate);
            $unixTime = ($days - 25569) * 86400;
            return date('Y-m-d', $unixTime);
        }

        // Tentar formatos padrão brasileiros e internacionais
        $formats = ['d/m/Y', 'd-m-Y', 'Y-m-d', 'Y/m/d', 'd/m/y'];
        foreach ($formats as $fmt) {
            try {
                $d = Carbon::createFromFormat($fmt, $rawDate);
                if ($d && $d->year > 1900 && $d->year <= Carbon::now()->year) {
                    return $d->toDateString();
                }
            } catch (Exception) {
                // Tentar próximo formato
            }
        }

        return null;
    }
}
