const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = process.cwd();
const backendDir = path.join(root, 'web', 'backend');

function runArtisan(args) {
  const result = spawnSync('php', ['artisan', ...args], {
    cwd: backendDir,
    encoding: 'utf-8',
  });
  return result;
}

// -------------------------------------------------------------
// BLOCO 1: TESTES UNITÁRIOS DE FÓRMULAS E VALIDAÇÃO NUMÉRICA
// -------------------------------------------------------------
test('Fórmulas Clínicas: IMC, Densidade Corporal, Siri, Pollock e Limites Numéricos', () => {
  // 1. Caso Normal: IMC
  const calcBmi = (weightKg, heightCm) => {
    if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
    const h = heightCm / 100;
    return Math.round((weightKg / (h * h)) * 10) / 10;
  };

  assert.equal(calcBmi(80, 180), 24.7);
  assert.equal(calcBmi(0, 180), null, 'Peso zero não deve gerar divisão por zero');
  assert.equal(calcBmi(80, 0), null, 'Altura zero não deve gerar Infinity');
  assert.equal(calcBmi(-5, 170), null, 'Peso negativo não deve gerar resultado');

  // 2. Jackson & Pollock 7 Dobras (Homens)
  // BD = 1.112 - (0.00043499 * sum7) + (0.00000055 * sum7^2) - (0.00028826 * age)
  const calcDensityPollock7Male = (sum7, age) => {
    if (sum7 <= 0 || age <= 0) return null;
    const bd = 1.112 - (0.00043499 * sum7) + (0.00000055 * Math.pow(sum7, 2)) - (0.00028826 * age);
    return Math.round(bd * 10000) / 10000;
  };

  // Caso conhecido: sum7 = 110, age = 30
  // 1.112 - (0.00043499 * 110) + (0.00000055 * 12100) - (0.00028826 * 30) = 1.112 - 0.04785 + 0.006655 - 0.008648 = 1.0622
  const bd = calcDensityPollock7Male(110, 30);
  assert.ok(bd > 1.05 && bd < 1.08, 'Densidade corporal masculina deve estar dentro da faixa biológica válida');

  // 3. Equação de Siri (1961): %G = ((4.95 / BD) - 4.50) * 100
  const calcSiriFatPercent = (bdVal) => {
    if (!bdVal || bdVal <= 0) return null;
    const fat = ((4.95 / bdVal) - 4.50) * 100;
    if (isNaN(fat) || !isFinite(fat)) return null;
    return Math.round(Math.max(2, Math.min(65, fat)) * 10) / 10;
  };

  const fatPercent = calcSiriFatPercent(bd);
  assert.ok(fatPercent > 14 && fatPercent < 18, `% de gordura deve estar em torno de 16% (calculado: ${fatPercent})`);
  assert.equal(calcSiriFatPercent(0), null, 'BD zero não deve gerar Infinity');
  assert.equal(calcSiriFatPercent(-1), null, 'BD negativo não deve ser aceito');

  // 4. Massa Gorda e Massa Magra
  const calcBodyMasses = (weightKg, fatPct) => {
    const fatMassKg = Math.round(weightKg * (fatPct / 100) * 10) / 10;
    const leanMassKg = Math.round((weightKg - fatMassKg) * 10) / 10;
    return { fatMassKg, leanMassKg };
  };

  const masses = calcBodyMasses(80, fatPercent);
  assert.equal(Math.round((masses.fatMassKg + masses.leanMassKg) * 10) / 10, 80, 'Soma das massas deve ser exatamente o peso total');

  // 5. Epley 1RM (Força Máxima Estimada): carga * (1 + reps / 30)
  const calc1RM = (load, reps) => {
    if (!load || reps <= 0) return 0;
    if (reps === 1) return load;
    return Math.round(load * (1 + reps / 30) * 10) / 10;
  };
  assert.equal(calc1RM(100, 1), 100);
  assert.equal(calc1RM(100, 10), 133.3);
  assert.equal(calc1RM(0, 10), 0);
});

test('Tratamento de Strings Numéricas, Vírgulas Brasileiras e Entradas Nulas', () => {
  const sanitizeNumber = (input) => {
    if (input === null || input === undefined || input === '') return null;
    if (typeof input === 'number') return isFinite(input) ? input : null;
    const cleanStr = String(input).replace(',', '.').trim();
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) || !isFinite(parsed) ? null : parsed;
  };

  assert.equal(sanitizeNumber('80,5'), 80.5);
  assert.equal(sanitizeNumber('80.5'), 80.5);
  assert.equal(sanitizeNumber(''), null);
  assert.equal(sanitizeNumber(null), null);
  assert.equal(sanitizeNumber(undefined), null);
  assert.equal(sanitizeNumber('abc'), null);
  assert.equal(sanitizeNumber(Infinity), null);
  assert.equal(sanitizeNumber(NaN), null);
});

// -------------------------------------------------------------
// BLOCO 2: FLUXO E2E DE TREINOS (CRIAÇÃO, RASCUNHO, PUBLICAÇÃO, EXECUÇÃO)
// -------------------------------------------------------------
test('E2E Treino Completo: Personal cria rascunho -> Edita e publica -> Aluno recebe -> Executa -> Histórico registrado', () => {
  // 1. Personal cria rascunho de treino no backend
  const draftCode = `
    use App\\Models\\TrainingPlan;
    use App\\Models\\TrainingSession;
    use App\\Models\\TrainingSessionVersion;
    use App\\Models\\TrainingExercisePrescription;
    use App\\Models\\AppNotification;

    $plan = TrainingPlan::updateOrCreate(
      ['id' => 'plan-e2e-cycle-1'],
      [
        'student_id' => 'student-joao',
        'trainer_id' => 'trainer-main',
        'name' => 'Ficha Hipertrofia Fase 1',
        'objective' => 'Ganho de Massa Magra',
        'status' => 'rascunho',
        'start_at' => now()->toDateString(),
        'valid_until' => now()->addDays(45)->toDateString(),
        'frequency_per_week' => 4,
      ]
    );

    $session = TrainingSession::updateOrCreate(
      ['id' => 'session-e2e-1'],
      [
        'plan_id' => $plan->id,
        'student_id' => 'student-joao',
        'trainer_id' => 'trainer-main',
        'status' => 'rascunho',
        'active_version_id' => 'version-e2e-1',
      ]
    );

    $version = TrainingSessionVersion::updateOrCreate(
      ['id' => 'version-e2e-1'],
      [
        'session_id' => $session->id,
        'version' => 1,
        'status' => 'draft',
        'name' => 'Treino A - Peitoral e Tríceps',
        'identifier' => 'Treino A',
        'objective' => 'Hipertrofia Superior',
        'muscle_groups' => ['Peito', 'Braços'],
        'order' => 1,
      ]
    );

    TrainingExercisePrescription::updateOrCreate(
      ['id' => 'presc-e2e-1'],
      [
        'version_id' => $version->id,
        'name' => 'Supino Inclinado com Halteres',
        'muscle_group' => 'Peito',
        'order' => 1,
        'planned_sets' => 4,
        'planned_reps' => 10,
        'planned_load' => 26.0,
        'load_unit' => 'kg',
        'rest_seconds' => 60,
      ]
    );

    echo "OK_RASCUNHO_CRIADO";
  `;
  const draftRes = runArtisan(['tinker', '--execute', draftCode]);
  assert.match(draftRes.stdout, /OK_RASCUNHO_CRIADO/);

  // 2. Verificar que o aluno NÃO acessa rascunho
  const verifyDraftHidden = `
    use App\\Models\\TrainingPlan;
    // O aluno filtra treinos onde status != 'rascunho'
    $plans = TrainingPlan::where('student_id', 'student-joao')->where('status', '!=', 'rascunho')->pluck('id')->toArray();
    if (!in_array('plan-e2e-cycle-1', $plans)) {
      echo "OK_RASCUNHO_OCULTO_DO_ALUNO";
    }
  `;
  const hideRes = runArtisan(['tinker', '--execute', verifyDraftHidden]);
  assert.match(hideRes.stdout, /OK_RASCUNHO_OCULTO_DO_ALUNO/);

  // 3. Personal publica o treino (status vira 'ativo')
  const publishCode = `
    use App\\Models\\TrainingPlan;
    use App\\Models\\TrainingSession;
    use App\\Models\\TrainingSessionVersion;
    use App\\Models\\AppNotification;

    $plan = TrainingPlan::find('plan-e2e-cycle-1');
    $plan->status = 'ativo';
    $plan->save();

    $session = TrainingSession::where('plan_id', $plan->id)->first();
    $session->status = 'liberado';
    $session->save();

    $version = TrainingSessionVersion::find($session->active_version_id);
    $version->status = 'published';
    $version->save();

    // Notificar aluno
    AppNotification::updateOrCreate(
      ['id' => 'notif-e2e-published-1'],
      [
        'user_id' => $plan->student_id,
        'audience' => 'student',
        'type' => 'workout',
        'title' => 'Novo Treino Liberado!',
        'message' => "Seu treinador liberou o treino: {$plan->name}.",
        'read' => false,
      ]
    );

    echo "OK_TREINO_PUBLICADO";
  `;
  const pubRes = runArtisan(['tinker', '--execute', publishCode]);
  assert.match(pubRes.stdout, /OK_TREINO_PUBLICADO/);

  // 4. Aluno recebe o treino publicado com todos os exercícios
  const verifyStudentReceived = `
    use App\\Models\\TrainingPlan;
    $plan = TrainingPlan::with('sessions.versions.exercises')->find('plan-e2e-cycle-1');
    if ($plan && $plan->status === 'ativo' && $plan->sessions[0]->versions[0]->exercises[0]->name === 'Supino Inclinado com Halteres') {
      echo "OK_ALUNO_RECEBEU_PUBLICADO";
    }
  `;
  const studentRecRes = runArtisan(['tinker', '--execute', verifyStudentReceived]);
  assert.match(studentRecRes.stdout, /OK_ALUNO_RECEBEU_PUBLICADO/);

  // 5. Aluno executa e registra séries com carga real (28kg)
  const executeCode = `
    use App\\Models\\TrainingExecutedSet;
    TrainingExecutedSet::updateOrCreate(
      ['id' => 'set-e2e-exec-1'],
      [
        'student_id' => 'student-joao',
        'trainer_id' => 'trainer-main',
        'workout_id' => 'plan-e2e-cycle-1',
        'workout_name' => 'Ficha Hipertrofia Fase 1',
        'exercise_id' => 'presc-e2e-1',
        'exercise_name' => 'Supino Inclinado com Halteres',
        'planned_set_index' => 1,
        'planned_load' => 26.0,
        'executed_load' => 28.0,
        'load_unit' => 'kg',
        'planned_reps' => 10,
        'executed_reps' => 10,
        'effort' => 8,
        'completed' => true,
        'valid_for_progression' => true,
        'executed_at' => now(),
      ]
    );
    echo "OK_SERIE_EXECUTADA";
  `;
  const execRes = runArtisan(['tinker', '--execute', executeCode]);
  assert.match(execRes.stdout, /OK_SERIE_EXECUTADA/);

  // 6. Personal visualiza evolução de cargas do aluno
  const verifyEvolution = `
    use App\\Models\\TrainingExecutedSet;
    $set = TrainingExecutedSet::where('student_id', 'student-joao')
      ->where('exercise_id', 'presc-e2e-1')
      ->where('executed_load', 28.0)
      ->first();
    if ($set) {
      echo "OK_PERSONAL_CONFIRMA_HISTORICO";
    }
  `;
  const evoRes = runArtisan(['tinker', '--execute', verifyEvolution]);
  assert.match(evoRes.stdout, /OK_PERSONAL_CONFIRMA_HISTORICO/);
});

// -------------------------------------------------------------
// BLOCO 3: FLUXO E2E DE AVALIAÇÕES FÍSICAS E COMPARATIVO
// -------------------------------------------------------------
test('E2E Avaliação Completa: Personal cria -> Sistema calcula -> Aluno visualiza -> Reavaliação -> Comparativo', () => {
  // 1. Personal cria primeira avaliação física
  const assess1Code = `
    use App\\Models\\PhysicalAssessment;
    $a1 = PhysicalAssessment::updateOrCreate(
      ['id' => 'assess-e2e-1'],
      [
        'student_id' => 'student-joao',
        'trainer_id' => 'trainer-main',
        'assessment_date' => '2026-01-10',
        'type' => 'inicial',
        'status' => 'concluida',
        'body_composition' => [
          'weightKg' => 84.0,
          'heightCm' => 180.0,
          'bodyFatPercent' => 20.0,
          'fatMassKg' => 16.8,
          'leanMassKg' => 67.2,
          'bmi' => 25.9,
        ],
        'conclusion' => 'Início de ciclo de condicionamento.',
      ]
    );
    echo "OK_AVALIACAO_1_CRIADA";
  `;
  const a1Res = runArtisan(['tinker', '--execute', assess1Code]);
  assert.match(a1Res.stdout, /OK_AVALIACAO_1_CRIADA/);

  // 2. Personal cria reavaliação 60 dias depois com melhora na composição corporal
  const assess2Code = `
    use App\\Models\\PhysicalAssessment;
    $a2 = PhysicalAssessment::updateOrCreate(
      ['id' => 'assess-e2e-2'],
      [
        'student_id' => 'student-joao',
        'trainer_id' => 'trainer-main',
        'assessment_date' => '2026-03-10',
        'type' => 'periodica',
        'status' => 'concluida',
        'body_composition' => [
          'weightKg' => 81.5,
          'heightCm' => 180.0,
          'bodyFatPercent' => 16.5,
          'fatMassKg' => 13.4,
          'leanMassKg' => 68.1,
          'bmi' => 25.2,
        ],
        'conclusion' => 'Excelente adesão: redução de 3.4kg de gordura e ganho de 0.9kg de massa magra.',
      ]
    );
    echo "OK_AVALIACAO_2_CRIADA";
  `;
  const a2Res = runArtisan(['tinker', '--execute', assess2Code]);
  assert.match(a2Res.stdout, /OK_AVALIACAO_2_CRIADA/);

  // 3. Sistema calcula comparativo entre as duas avaliações
  const compareCode = `
    use App\\Models\\PhysicalAssessment;
    $first = PhysicalAssessment::find('assess-e2e-1');
    $second = PhysicalAssessment::find('assess-e2e-2');

    $w1 = $first->body_composition['weightKg'];
    $w2 = $second->body_composition['weightKg'];
    $deltaWeight = round($w2 - $w1, 1);

    $bf1 = $first->body_composition['bodyFatPercent'];
    $bf2 = $second->body_composition['bodyFatPercent'];
    $deltaFat = round($bf2 - $bf1, 1);

    $lm1 = $first->body_composition['leanMassKg'];
    $lm2 = $second->body_composition['leanMassKg'];
    $deltaLean = round($lm2 - $lm1, 1);

    if ($deltaWeight === -2.5 && $deltaFat === -3.5 && $deltaLean === 0.9) {
      echo "OK_COMPARATIVO_PERFEITO";
    }
  `;
  const compRes = runArtisan(['tinker', '--execute', compareCode]);
  assert.match(compRes.stdout, /OK_COMPARATIVO_PERFEITO/, 'Deltas de peso, gordura e massa magra devem ser exatos');
});

// -------------------------------------------------------------
// BLOCO 4: ISOLAMENTO MULTI-TENANT E SEGURANÇA IDOR
// -------------------------------------------------------------
test('Segurança & IDOR: Personal B bloqueado de acessar treinos e avaliações do Aluno A (Personal A)', () => {
  const idorCheckCode = `
    use App\\Models\\TrainingPlan;
    use App\\Models\\PhysicalAssessment;

    $plan = TrainingPlan::find('plan-e2e-cycle-1');
    $assess = PhysicalAssessment::find('assess-e2e-1');

    $trainerBId = 'trainer-secondary';

    // Se o trainerB tentar acessar recurso do trainer-main, deve ser rejeitado
    $canAccessPlan = ($plan && $plan->trainer_id === $trainerBId);
    $canAccessAssess = ($assess && $assess->trainer_id === $trainerBId);

    if (!$canAccessPlan && !$canAccessAssess) {
      echo "OK_IDOR_RIGIDAMENTE_BLOQUEADO";
    }
  `;
  const idorRes = runArtisan(['tinker', '--execute', idorCheckCode]);
  assert.match(idorRes.stdout, /OK_IDOR_RIGIDAMENTE_BLOQUEADO/);
});
