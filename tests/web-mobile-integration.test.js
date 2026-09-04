const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = process.cwd();
const backendDir = path.join(root, 'web', 'backend');

function runArtisanCommand(args) {
  const result = spawnSync('php', ['artisan', ...args], {
    cwd: backendDir,
    encoding: 'utf-8',
  });
  return result;
}

test('Integração Web <-> Mobile: Cenário 1 — Personal cria treino na Web e Aluno recebe no Mobile', () => {
  // 1. O Personal cria um treino no backend (simulando request web)
  const code = `
    use App\Models\TrainingPlan;
    use App\Models\TrainingSession;
    use App\Models\TrainingSessionVersion;
    use App\Models\TrainingExercisePrescription;
    
    $plan = TrainingPlan::updateOrCreate(
      ['id' => 'test-web-created-plan-1'],
      [
        'student_id' => 'student-joao',
        'trainer_id' => 'trainer-main',
        'name' => 'Treino Criado Pelo Computador',
        'objective' => 'Hipertrofia Acelerada',
        'status' => 'ativo',
      ]
    );

    $session = TrainingSession::updateOrCreate(
      ['id' => 'test-web-session-1'],
      [
        'plan_id' => $plan->id,
        'student_id' => 'student-joao',
        'trainer_id' => 'trainer-main',
        'status' => 'liberado',
      ]
    );

    $version = TrainingSessionVersion::updateOrCreate(
      ['id' => 'test-web-version-1'],
      [
        'session_id' => $session->id,
        'name' => 'Treino A - Supino & Puxada',
        'version' => 1,
        'status' => 'published',
      ]
    );

    TrainingExercisePrescription::updateOrCreate(
      ['id' => 'test-web-presc-1'],
      [
        'version_id' => $version->id,
        'name' => 'Supino Inclinado com Halteres',
        'muscle_group' => 'Peito',
        'planned_sets' => 4,
        'planned_reps' => 10,
        'planned_load' => 28.0,
      ]
    );

    echo "OK_TREINO_CRIADO";
  `;

  const runRes = runArtisanCommand(['tinker', '--execute', code]);
  assert.match(runRes.stdout, /OK_TREINO_CRIADO/, 'Treino deve ser persistido no backend pelo personal na web');

  // 2. Consulta pelo Mobile (simulando Sync pull para o aluno Joao)
  const verifyCode = `
    use App\\Models\\TrainingPlan;
    $plan = TrainingPlan::with('sessions.versions.exercises')->find('test-web-created-plan-1');
    if ($plan && count($plan->sessions) > 0 && $plan->sessions[0]->versions[0]->exercises[0]->name === 'Supino Inclinado com Halteres') {
      echo "OK_MOBILE_RECEBEU_TREINO";
    }
  `;
  const verifyRes = runArtisanCommand(['tinker', '--execute', verifyCode]);
  assert.match(verifyRes.stdout, /OK_MOBILE_RECEBEU_TREINO/, 'Aluno no mobile recebe o novo treino com exercícios criados na web');
});

test('Integração Web <-> Mobile: Cenário 2 — Aluno registra carga no Mobile e Personal visualiza na Web', () => {
  // 1. Aluno registra a execução de uma série no mobile
  const logLoadCode = `
    use App\\Models\\TrainingExecutedSet;
    $set = TrainingExecutedSet::updateOrCreate(
      ['id' => 'test-mobile-logged-set-1'],
      [
        'student_id' => 'student-joao',
        'trainer_id' => 'trainer-main',
        'exercise_id' => 'sys-sup-1',
        'exercise_name' => 'Supino Reto com Barra',
        'executed_load' => 92.5,
        'executed_reps' => 6,
        'load_unit' => 'kg',
        'effort' => 9,
        'completed' => true,
        'valid_for_progression' => true,
        'executed_at' => now(),
      ]
    );
    echo "OK_CARGA_REGISTRADA_NO_MOBILE";
  `;

  const logRes = runArtisanCommand(['tinker', '--execute', logLoadCode]);
  assert.match(logRes.stdout, /OK_CARGA_REGISTRADA_NO_MOBILE/);

  // 2. Personal consulta a evolução do aluno na Web
  const checkWebCode = `
    use App\\Models\\TrainingExecutedSet;
    $sets = TrainingExecutedSet::where('student_id', 'student-joao')
      ->where('exercise_id', 'sys-sup-1')
      ->where('executed_load', 92.5)
      ->first();
    if ($sets) {
      echo "OK_PERSONAL_VISUALIZA_NOVA_CARGA";
    }
  `;
  const checkRes = runArtisanCommand(['tinker', '--execute', checkWebCode]);
  assert.match(checkRes.stdout, /OK_PERSONAL_VISUALIZA_NOVA_CARGA/, 'Personal Trainer visualiza na Web a carga registrada no aplicativo mobile');
});

test('Integração Web <-> Mobile: Cenário 3 — Personal edita exercício na Web e Mobile recebe alteração', () => {
  // 1. Personal altera séries, reps e carga na Web
  const editCode = `
    use App\\Models\\TrainingExercisePrescription;
    $presc = TrainingExercisePrescription::where('name', 'Supino Inclinado com Halteres')->first();
    if ($presc) {
      $presc->planned_load = 32.0;
      $presc->planned_reps = 12;
      $presc->observation = 'Pausa isometrica de 2s na transicao excêntrica';
      $presc->save();
      echo "OK_EXERCICIO_EDITADO_NA_WEB";
    }
  `;
  const editRes = runArtisanCommand(['tinker', '--execute', editCode]);
  assert.match(editRes.stdout, /OK_EXERCICIO_EDITADO_NA_WEB/);

  // 2. Mobile carrega a prescrição atualizada
  const verifyEditCode = `
    use App\\Models\\TrainingExercisePrescription;
    $presc = TrainingExercisePrescription::where('name', 'Supino Inclinado com Halteres')->first();
    if ($presc && (float)$presc->planned_load === 32.0 && $presc->planned_reps === 12) {
      echo "OK_MOBILE_RECEBEU_EDICAO";
    }
  `;
  const verifyEditRes = runArtisanCommand(['tinker', '--execute', verifyEditCode]);
  assert.match(verifyEditRes.stdout, /OK_MOBILE_RECEBEU_EDICAO/, 'Aluno no mobile recebe atualização imediata de carga e repetições editadas na web');
});

test('Integração Web <-> Mobile: Cenário 4 — Personal cria avaliação na Web e Aluno visualiza histórico no Mobile', () => {
  // 1. Personal cria nova avaliação pela Web
  const createAssessCode = `
    use App\\Models\\PhysicalAssessment;
    $assess = PhysicalAssessment::updateOrCreate(
      ['id' => 'test-web-assessment-1'],
      [
        'student_id' => 'student-joao',
        'trainer_id' => 'trainer-main',
        'assessment_date' => now()->toDateString(),
        'type' => 'periodica',
        'status' => 'concluida',
        'body_composition' => [
          'weightKg' => 79.5,
          'bodyFatPercent' => 16.5,
          'leanMassKg' => 66.4,
          'bmi' => 25.1,
        ],
        'conclusion' => 'Reducao consistente de percentual de gordura.',
      ]
    );
    echo "OK_AVALIACAO_WEB_CRIADA";
  `;

  const assessRes = runArtisanCommand(['tinker', '--execute', createAssessCode]);
  assert.match(assessRes.stdout, /OK_AVALIACAO_WEB_CRIADA/);

  // 2. Aluno abre o aplicativo e visualiza histórico
  const verifyMobileCode = `
    use App\\Models\\PhysicalAssessment;
    $lastAssess = PhysicalAssessment::where('student_id', 'student-joao')
      ->orderBy('assessment_date', 'desc')
      ->first();
    if ($lastAssess && $lastAssess->body_composition['weightKg'] === 79.5) {
      echo "OK_MOBILE_VISUALIZA_HISTORICO";
    }
  `;
  const verifyAssessRes = runArtisanCommand(['tinker', '--execute', verifyMobileCode]);
  assert.match(verifyAssessRes.stdout, /OK_MOBILE_VISUALIZA_HISTORICO/, 'Aluno visualiza no mobile o histórico da avaliação cadastrada na web');
});

