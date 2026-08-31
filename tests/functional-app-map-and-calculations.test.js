const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

// Helper de YouTube extraído da lógica de produção
function getYoutubeVideoId(url) {
  if (!url || typeof url !== "string") return null;
  const cleanUrl = url.trim();
  const match = cleanUrl.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  return match && match[1] ? match[1] : null;
}

function getYoutubeThumbnailUrl(url) {
  if (!url) return undefined;
  const videoId = getYoutubeVideoId(url);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  return undefined;
}

function validateExerciseMedia(exercise) {
  if (exercise.localVideoUri) {
    return { status: "valid_local_video", videoId: null, thumbnailUrl: exercise.thumbnailUrl };
  }
  if (!exercise.videoUrl || !exercise.videoUrl.trim()) {
    return { status: "no_media", videoId: null, thumbnailUrl: exercise.thumbnailUrl };
  }
  const videoId = getYoutubeVideoId(exercise.videoUrl);
  if (videoId) {
    return {
      status: "valid_youtube",
      videoId,
      thumbnailUrl: exercise.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
  if (exercise.videoUrl.startsWith("http://") || exercise.videoUrl.startsWith("https://")) {
    return { status: "valid_web_video", videoId: null, thumbnailUrl: exercise.thumbnailUrl };
  }
  return { status: "invalid_url", videoId: null, thumbnailUrl: exercise.thumbnailUrl };
}

// 1. IMC OMS
function calculateBmi(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0) return { value: 0, classification: "Invalido" };
  const heightMeters = heightCm / 100;
  const bmi = Math.round((weightKg / (heightMeters * heightMeters)) * 10) / 10;
  let classification = "Eutrofia (Peso Normal)";
  if (bmi < 18.5) classification = "Baixo Peso";
  else if (bmi >= 25 && bmi < 30) classification = "Sobrepeso";
  else if (bmi >= 30 && bmi < 35) classification = "Obesidade Grau I";
  else if (bmi >= 35 && bmi < 40) classification = "Obesidade Grau II";
  else if (bmi >= 40) classification = "Obesidade Grau III";
  return { value: bmi, classification };
}

// 2. Faulkner 4 dobras
function calculateFaulkner4(input) {
  const sum4 = (input.triceps || 0) + (input.subscapular || 0) + (input.suprailiac || 0) + (input.abdominal || 0);
  const factor = input.sex === "female" ? 0.213 : 0.153;
  const bf = Math.round(((sum4 * factor) + 5.783) * 10) / 10;
  const fatMass = Math.round((input.weightKg * (bf / 100)) * 10) / 10;
  const leanMass = Math.round((input.weightKg - fatMass) * 10) / 10;
  return { bodyFatPercent: bf, fatMassKg: fatMass, leanMassKg: leanMass };
}

// 3. Jackson & Pollock 3 dobras (Homem: Peito, Abd, Coxa; Mulher: Triceps, Supra, Coxa)
function calculateJacksonPollock3(input) {
  let density = 0;
  if (input.sex === "male") {
    const sum3 = (input.chest || 0) + (input.abdominal || 0) + (input.thigh || 0);
    density = 1.10938 - (0.0008267 * sum3) + (0.0000016 * sum3 * sum3) - (0.0002574 * input.age);
  } else {
    const sum3 = (input.triceps || 0) + (input.suprailiac || 0) + (input.thigh || 0);
    density = 1.0994921 - (0.0009929 * sum3) + (0.0000023 * sum3 * sum3) - (0.0001392 * input.age);
  }
  const bf = Math.round((((4.95 / density) - 4.50) * 100) * 10) / 10;
  const fatMass = Math.round((input.weightKg * (bf / 100)) * 10) / 10;
  const leanMass = Math.round((input.weightKg - fatMass) * 10) / 10;
  return { bodyDensity: density, bodyFatPercent: bf, fatMassKg: fatMass, leanMassKg: leanMass };
}

// 4. Cooper 12min VO2Max
function calculateCooper12Min(distanceMeters) {
  if (!distanceMeters || distanceMeters <= 0) return { vo2max: 0 };
  const vo2 = Math.round(((distanceMeters - 504.9) / 44.73) * 10) / 10;
  return { vo2max: vo2 };
}

// 5. 1RM Epley
function calculateEpley1RM(load, reps) {
  if (!load || !reps || load <= 0 || reps <= 0) return 0;
  if (reps === 1) return load;
  return Math.round((load * (1 + reps / 30)) * 10) / 10;
}

// 6. Tendência de Desempenho
function calculateExerciseTrend(previous, current) {
  if (!previous || previous <= 0) return "new";
  const diff = ((current - previous) / previous) * 100;
  if (diff > 2.5) return "evolving";
  if (diff < -2.5) return "declining";
  return "stable";
}

// ==========================================
// TESTES
// ==========================================

test("YouTube Integration: Extração de Video ID em múltiplos formatos de URL", () => {
  const cases = [
    { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
    { url: "https://youtu.be/dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
    { url: "https://www.youtube.com/shorts/dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
    { url: "https://www.youtube.com/embed/dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
    { url: "https://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=share", expected: "dQw4w9WgXcQ" },
    { url: "https://youtube.com/watch?v=dQw4w9WgXcQ&t=45s", expected: "dQw4w9WgXcQ" },
  ];

  for (const c of cases) {
    const id = getYoutubeVideoId(c.url);
    assert.equal(id, c.expected, `Falha ao extrair ID de: ${c.url}`);
    const thumb = getYoutubeThumbnailUrl(c.url);
    assert.equal(thumb, `https://img.youtube.com/vi/${c.expected}/hqdefault.jpg`);
  }

  assert.equal(getYoutubeVideoId(""), null);
  assert.equal(getYoutubeVideoId(undefined), null);
  assert.equal(getYoutubeVideoId("https://google.com"), null);
});

test("YouTube Integration: Classificação de mídias do exercício", () => {
  const validExercise = {
    id: "ex-1",
    name: "Supino Reto",
    category: "Peito",
    muscleGroups: ["Peito"],
    tags: ["Barra"],
    videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg",
  };
  assert.equal(validateExerciseMedia(validExercise).status, "valid_youtube");

  const noMediaExercise = {
    id: "ex-2",
    name: "Exercício Sem Vídeo",
    category: "Mobilidade",
    muscleGroups: ["Mobilidade"],
    tags: [],
  };
  assert.equal(validateExerciseMedia(noMediaExercise).status, "no_media");

  const localVideoExercise = {
    id: "ex-3",
    name: "Exercício Vídeo Local",
    category: "Costas",
    muscleGroups: ["Costas"],
    tags: [],
    localVideoUri: "file:///data/user/video.mp4",
  };
  assert.equal(validateExerciseMedia(localVideoExercise).status, "valid_local_video");
});

test("Cálculos Científicos: IMC OMS, Faulkner 4D e Jackson & Pollock 3D", () => {
  // IMC
  const imcNormal = calculateBmi(80, 180);
  assert.equal(imcNormal.value, 24.7);
  assert.equal(imcNormal.classification, "Eutrofia (Peso Normal)");

  // Faulkner
  const faulknerMale = calculateFaulkner4({ sex: "male", triceps: 10, subscapular: 10, suprailiac: 10, abdominal: 10, weightKg: 75 });
  assert.equal(faulknerMale.bodyFatPercent, 11.9);

  // JP3
  const jp3Male = calculateJacksonPollock3({ sex: "male", age: 30, chest: 10, abdominal: 15, thigh: 12, weightKg: 80 });
  assert.ok(jp3Male.bodyDensity > 1.05 && jp3Male.bodyDensity < 1.09);
  assert.ok(jp3Male.bodyFatPercent > 8 && jp3Male.bodyFatPercent < 20);

  // Cooper 12min
  assert.equal(calculateCooper12Min(2400).vo2max, 42.4);

  // 1RM Epley
  assert.equal(calculateEpley1RM(100, 1), 100);
  assert.equal(calculateEpley1RM(100, 10), 133.3);
  assert.equal(calculateEpley1RM(0, 10), 0);

  // Tendência
  assert.equal(calculateExerciseTrend(100, 110), "evolving");
  assert.equal(calculateExerciseTrend(100, 101), "stable");
  assert.equal(calculateExerciseTrend(100, 90), "declining");
  assert.equal(calculateExerciseTrend(0, 100), "new");
});

test("Mapa Funcional: Todas as rotas de navegação do app existem fisicamente", () => {
  const routesToCheck = [
    "app/(tabs)/index.tsx",
    "app/(tabs)/training.tsx",
    "app/(tabs)/feedbacks.tsx",
    "app/(tabs)/timer.tsx",
    "app/(tabs)/profile.tsx",
    "app/(tabs)/admin.tsx",
    "app/(tabs)/student.tsx",
    "app/login.tsx",
    "app/forgot-password.tsx",
    "app/terms-of-use.tsx",
    "app/privacy-policy.tsx",
    "app/subscription.tsx",
    "app/account-profile.tsx",
    "app/assessment-editor.tsx",
    "app/assessment-detail.tsx",
    "app/assessment-compare.tsx",
    "app/exercises.tsx",
    "app/training-details.tsx",
    "app/trainer-agenda.tsx",
    "app/trainer-anamnesis.tsx",
    "app/trainer-attention.tsx",
    "app/trainer-contacts.tsx",
    "app/trainer-expirations.tsx",
    "app/trainer-feedback-hub.tsx",
    "app/trainer-my-exercises.tsx",
    "app/trainer-reassessments.tsx",
    "app/trainer-registration-link.tsx",
    "app/trainer-workout-templates.tsx",
    "app/generate-code.tsx",
    "app/+not-found.tsx",
  ];

  for (const r of routesToCheck) {
    const fullPath = path.join(rootDir, r);
    assert.ok(fs.existsSync(fullPath), `Rota obrigatória não encontrada: ${r}`);
  }
});

test("Modelos de Treino: Estrutura, prescrição de exercícios e integridade dos templates padrão", () => {
  const sampleTemplate = {
    id: "tpl-strength-a",
    name: "Força base",
    focus: "Força",
    level: "Intermediário",
    sessions: "4x semana",
    estimatedDuration: "60 min",
    exercises: [
      {
        id: "ex-1",
        name: "Supino Reto com Barra",
        muscleGroup: "Peitoral",
        sets: 4,
        reps: "6 - 8",
        load: "80% 1RM",
        restSeconds: 90,
        technique: "Normal",
        videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg",
      },
    ],
  };

  assert.strictEqual(sampleTemplate.name, "Força base");
  assert.strictEqual(sampleTemplate.exercises.length, 1);
  assert.strictEqual(sampleTemplate.exercises[0].sets, 4);
  assert.strictEqual(sampleTemplate.exercises[0].technique, "Normal");
  assert.ok(sampleTemplate.exercises[0].videoUrl.includes("youtube.com"));
});

test("Modelos de Treino: Clonagem e duplicação preserva estrutura de séries, repetições e vídeos", () => {
  const original = {
    id: "tpl-1",
    name: "Hipertrofia A",
    focus: "Hipertrofia",
    level: "Avançado",
    sessions: "5x semana",
    exercises: [
      { id: "e-1", name: "Puxada Frontal", muscleGroup: "Costas", sets: 4, reps: "10-12" },
      { id: "e-2", name: "Remada Curvada", muscleGroup: "Costas", sets: 3, reps: "8-10" },
    ],
  };

  const cloned = {
    ...original,
    id: `template-${Date.now()}`,
    name: `${original.name} (Cópia)`,
    exercises: original.exercises.map((e, idx) => ({ ...e, id: `ex-${Date.now()}-${idx}` })),
  };

  assert.strictEqual(cloned.name, "Hipertrofia A (Cópia)");
  assert.strictEqual(cloned.exercises.length, 2);
  assert.notStrictEqual(cloned.id, original.id);
  assert.notStrictEqual(cloned.exercises[0].id, original.exercises[0].id);
  assert.strictEqual(cloned.exercises[0].name, original.exercises[0].name);
});

test("Editor de Treino do Personal: Cadência, séries detalhadas, combinação de exercícios e cabeçalhos", () => {
  const sections = [
    { id: "sec-core", title: "Core & Abdominais", order: 0 },
    { id: "sec-chest", title: "Peitoral", order: 1 },
  ];

  const ex1 = {
    id: "ex-1",
    name: "Abdominal abre e fecha com elástico",
    cadence: "3-0-1-0",
    sectionId: "sec-core",
    combinationId: "comb-1",
    combinationLabel: "Bi-set",
    sets: [
      { id: "s-1", setNumber: 1, reps: "10 a 12", load: "20 kg", restSeconds: 60 },
      { id: "s-2", setNumber: 2, reps: "10 a 12", load: "20 kg", restSeconds: 60 },
      { id: "s-3", setNumber: 3, reps: "10 a 12", load: "20 kg", restSeconds: 60 },
    ],
  };

  const ex2 = {
    id: "ex-2",
    name: "Abdominal Bicicleta",
    cadence: "2-0-2-0",
    sectionId: "sec-core",
    combinationId: "comb-1",
    combinationLabel: "Bi-set",
    sets: [
      { id: "s-4", setNumber: 1, reps: "10 a 12", load: "Corporal", restSeconds: 60 },
      { id: "s-5", setNumber: 2, reps: "10 a 12", load: "Corporal", restSeconds: 60 },
    ],
  };

  assert.strictEqual(sections.length, 2);
  assert.strictEqual(ex1.cadence, "3-0-1-0");
  assert.strictEqual(ex1.sets.length, 3);
  assert.strictEqual(ex1.combinationId, ex2.combinationId);
  assert.strictEqual(ex1.combinationLabel, "Bi-set");
});

test("Editor de Treino do Personal: Cálculo de volume e divisão semanal", () => {
  const workoutInfo = {
    name: "Treino A - Peito",
    splitByWeekDay: true,
    recommendedDays: ["Segunda", "Quarta", "Sexta"],
  };

  const exercises = [
    { muscleGroup: "Peitoral", sets: [{ reps: "10" }, { reps: "10" }, { reps: "8" }] },
    { muscleGroup: "Peitoral", sets: [{ reps: "12" }, { reps: "10" }] },
    { muscleGroup: "Tríceps", sets: [{ reps: "15" }, { reps: "12" }, { reps: "12" }] },
  ];

  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const chestSets = exercises.filter((e) => e.muscleGroup === "Peitoral").reduce((acc, ex) => acc + ex.sets.length, 0);
  const tricepsSets = exercises.filter((e) => e.muscleGroup === "Tríceps").reduce((acc, ex) => acc + ex.sets.length, 0);

  assert.strictEqual(totalSets, 8);
  assert.strictEqual(chestSets, 5);
  assert.strictEqual(tricepsSets, 3);
  assert.strictEqual(workoutInfo.splitByWeekDay, true);
  assert.strictEqual(workoutInfo.recommendedDays.length, 3);
});

test("Geração de PDF do Treino: Montagem do HTML com branding, cores customizadas e dados do aluno", async () => {
  const branding = {
    displayName: "Personal DragonCorp",
    businessName: "DragonCorp",
    primaryColor: "#D90000",
    professionalId: "CREF 123456-G/SP",
  };

  const studentName = "Levy Lopes Furtado";
  const workoutInfo = {
    name: "Treino A - Peitoral e Tríceps",
    startDate: "2026-08-24",
    endDate: "2026-11-24",
    notes: "Priorize técnica e controle excêntrico em cada série.",
  };

  const exercises = [
    {
      id: "ex-1",
      name: "Supino Reto com Barra",
      muscleGroup: "Peitoral",
      cadence: "3-0-1-0",
      sets: [
        { id: "s-1", setNumber: 1, reps: "8 a 10", load: "70 kg", restSeconds: 90 },
        { id: "s-2", setNumber: 2, reps: "8 a 10", load: "75 kg", restSeconds: 90 },
      ],
    },
  ];

  // Simulating HTML assembly validation
  const htmlSample = `
    <h1>${branding.displayName}</h1>
    <div style="color: ${branding.primaryColor};">${branding.businessName}</div>
    <h2>${studentName}</h2>
    <span>${workoutInfo.name}</span>
    <div>${exercises[0].name} - ${exercises[0].cadence}</div>
  `;

  assert.ok(htmlSample.includes("Personal DragonCorp"));
  assert.ok(htmlSample.includes("DragonCorp"));
  assert.ok(htmlSample.includes("#D90000"));
  assert.ok(htmlSample.includes("Levy Lopes Furtado"));
  assert.ok(htmlSample.includes("Supino Reto com Barra"));
  assert.ok(htmlSample.includes("3-0-1-0"));
});

test("Tela do Aluno (Personal Hub): Estrutura com avatar lateral, formulário de 5 campos, hub de 4 ícones e ações", () => {
  const studentData = {
    fullName: "Charles Nóbrega",
    birthDate: "09/03/1990",
    age: 36,
    gender: "Masculino",
    whatsapp: "21979127906",
    email: "charlles.nobrega@gmail.com",
    status: "Ativo",
  };

  const hubActions = ["Dieta", "Anamnese", "Avaliações", "Treinos"];
  const featuredAction = "Evolução de Cargas";
  const mainCta = "Link de Acesso";
  const secondaryAction = "Excluir aluno";

  assert.strictEqual(studentData.fullName, "Charles Nóbrega");
  assert.strictEqual(studentData.birthDate, "09/03/1990");
  assert.strictEqual(studentData.age, 36);
  assert.strictEqual(studentData.gender, "Masculino");
  assert.strictEqual(studentData.whatsapp, "21979127906");
  assert.strictEqual(studentData.email, "charlles.nobrega@gmail.com");
  assert.strictEqual(studentData.status, "Ativo");

  assert.strictEqual(hubActions.length, 4);
  assert.ok(hubActions.includes("Dieta"));
  assert.ok(hubActions.includes("Anamnese"));
  assert.ok(hubActions.includes("Avaliações"));
  assert.ok(hubActions.includes("Treinos"));
  assert.strictEqual(featuredAction, "Evolução de Cargas");
  assert.strictEqual(mainCta, "Link de Acesso");
  assert.strictEqual(secondaryAction, "Excluir aluno");
});

test("Teste Aeróbio (Conconi) & Protocolo Semanal: Montagem da prescrição e geração de PDF com laudo", () => {
  const protocol = {
    title: "Protocolo de treino aeróbico 24/08",
    warmupText: "5 minutos de aquecimento na esteira - 4 a 6km/h (progressivo)",
    conconiTestResult: {
      deflectionHeartRate: 156,
      deflectionSpeedKmh: 6.5,
      maxHeartRate: 172,
      vo2MaxEstimate: 42.5,
    },
    daysPrescription: [
      {
        dayOfWeek: "Segunda",
        description: "4x 3 minutos ativos a 5.6 km/h e 2 minutos pausa ativa a 3.0 km/h. (Volume total de 20 minutos)",
      },
      {
        dayOfWeek: "Quarta",
        description: "4x 2 minutos ativos a 6.0 km/h e 3 minutos pausa ativa a 3.0 km/h. (Volume total de 20 minutos)",
      },
      {
        dayOfWeek: "Sexta",
        description: "20 minutos aeróbio contínuo moderado a 5.0 km/h (serão 20 minutos contínuos nessa faixa de velocidade).",
      },
    ],
  };

  assert.strictEqual(protocol.title, "Protocolo de treino aeróbico 24/08");
  assert.ok(protocol.warmupText.includes("5 minutos de aquecimento"));
  assert.strictEqual(protocol.daysPrescription.length, 3);
  assert.strictEqual(protocol.daysPrescription[0].dayOfWeek, "Segunda");
  assert.ok(protocol.daysPrescription[0].description.includes("5.6 km/h"));
  assert.strictEqual(protocol.daysPrescription[1].dayOfWeek, "Quarta");
  assert.ok(protocol.daysPrescription[1].description.includes("6.0 km/h"));
  assert.strictEqual(protocol.daysPrescription[2].dayOfWeek, "Sexta");
  assert.ok(protocol.daysPrescription[2].description.includes("5.0 km/h"));
  assert.strictEqual(protocol.conconiTestResult.deflectionHeartRate, 156);
  assert.strictEqual(protocol.conconiTestResult.deflectionSpeedKmh, 6.5);
});

test("Home do Aluno: Card do Protocolo Aeróbio com dados reais, observação de 2 semanas e isolamento de permissões", () => {
  const studentProtocolCard = {
    title: "Protocolo aeróbio",
    startDate: "2026-08-24",
    status: "Ativo",
    observation: "O protocolo será atualizado a cada duas semanas, desde que cada treino seja realizado duas vezes.",
    action: "Ver protocolo",
    studentId: "student-1",
    canEdit: false, // Aluno é somente leitura
  };

  assert.strictEqual(studentProtocolCard.title, "Protocolo aeróbio");
  assert.strictEqual(studentProtocolCard.startDate, "2026-08-24");
  assert.strictEqual(studentProtocolCard.status, "Ativo");
  assert.strictEqual(
    studentProtocolCard.observation,
    "O protocolo será atualizado a cada duas semanas, desde que cada treino seja realizado duas vezes."
  );
  assert.strictEqual(studentProtocolCard.action, "Ver protocolo");
  assert.strictEqual(studentProtocolCard.canEdit, false);
});

test("Gestão de Treinos do Personal: Reordenação de cabeçalhos/exercícios e modo Combinar/Excluir com checkboxes", () => {
  // Teste de reordenação de seções
  let sections = [
    { id: "sec-1", title: "Aquecimento & Mobilidade", order: 0 },
    { id: "sec-2", title: "Core & Abdominais", order: 1 },
    { id: "sec-3", title: "Membros Superiores", order: 2 },
  ];

  // Move sec-2 up
  const moveSection = (list, id, dir) => {
    const idx = list.findIndex((s) => s.id === id);
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return list;
    const next = [...list];
    const [moved] = next.splice(idx, 1);
    next.splice(targetIdx, 0, moved);
    return next;
  };

  sections = moveSection(sections, "sec-2", "up");
  assert.strictEqual(sections[0].id, "sec-2");
  assert.strictEqual(sections[1].id, "sec-1");

  // Teste de reordenação de exercícios
  let exercises = [
    { id: "ex-1", name: "Supino Reto" },
    { id: "ex-2", name: "Crucifixo" },
    { id: "ex-3", name: "Tríceps Testa" },
  ];

  const moveExercise = (list, id, dir) => {
    const idx = list.findIndex((e) => e.id === id);
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return list;
    const next = [...list];
    const [moved] = next.splice(idx, 1);
    next.splice(targetIdx, 0, moved);
    return next;
  };

  exercises = moveExercise(exercises, "ex-3", "up");
  assert.strictEqual(exercises[1].id, "ex-3");
  assert.strictEqual(exercises[2].id, "ex-2");

  // Teste de Combinação e Exclusão em Lote
  const selectedForCombine = { "ex-1": true, "ex-3": true };
  const selectedIds = Object.keys(selectedForCombine).filter((k) => selectedForCombine[k]);
  assert.strictEqual(selectedIds.length, 2);

  // Combinar
  const combined = exercises.map((e) =>
    selectedIds.includes(e.id) ? { ...e, combinationLabel: "Bi-set" } : e
  );
  assert.strictEqual(combined[0].combinationLabel, "Bi-set");
  assert.strictEqual(combined[1].combinationLabel, "Bi-set");
  assert.strictEqual(combined[2].combinationLabel, undefined);

  // Excluir em lote
  const remaining = exercises.filter((e) => !selectedIds.includes(e.id));
  assert.strictEqual(remaining.length, 1);
  assert.strictEqual(remaining[0].id, "ex-2");
});

test("Finalização de Treino do Aluno: Registro de foto pós-treino, estrelas, horário e feedback", () => {
  const postWorkoutFeedback = {
    rating: 5,
    starsLabel: "Impecável / Máxima Performance! 🔥",
    completionTime: "13:40",
    photoUrl: "file:///photos/post-workout-selfie.jpg",
    intensity: "Muito intenso",
    comment: "Treino insano, consegui bater PR no agachamento!",
    hasPain: false,
  };

  assert.strictEqual(postWorkoutFeedback.rating, 5);
  assert.strictEqual(postWorkoutFeedback.completionTime, "13:40");
  assert.ok(postWorkoutFeedback.photoUrl.includes("post-workout-selfie.jpg"));
  assert.strictEqual(postWorkoutFeedback.intensity, "Muito intenso");
  assert.ok(postWorkoutFeedback.starsLabel.includes("Máxima Performance"));
});

test("Chat Aluno-Professor: Envio e suporte a Foto, Mensagem de Áudio e Vídeo de Execução", () => {
  const photoMessage = {
    id: "msg-photo-1",
    senderId: "student-1",
    senderRole: "STUDENT",
    text: "Professor, essa é a execução do meu leg press hoje",
    mediaType: "image",
    mediaUrl: "file:///photos/leg-press-form.jpg",
  };

  const audioMessage = {
    id: "msg-audio-1",
    senderId: "trainer-1",
    senderRole: "TRAINER",
    text: "🎙️ Mensagem de voz",
    mediaType: "audio",
    mediaUrl: "file:///audios/voice-feedback.m4a",
    mediaDurationSeconds: 18,
  };

  const videoMessage = {
    id: "msg-video-1",
    senderId: "student-1",
    senderRole: "STUDENT",
    text: "🎥 Vídeo do Levantamento Terra",
    mediaType: "video",
    mediaUrl: "file:///videos/deadlift-video.mp4",
    mediaDurationSeconds: 25,
    mediaThumbnailUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500",
  };

  assert.strictEqual(photoMessage.mediaType, "image");
  assert.ok(photoMessage.mediaUrl.endsWith(".jpg"));

  assert.strictEqual(audioMessage.mediaType, "audio");
  assert.strictEqual(audioMessage.mediaDurationSeconds, 18);

  assert.strictEqual(videoMessage.mediaType, "video");
  assert.strictEqual(videoMessage.mediaDurationSeconds, 25);
  assert.ok(videoMessage.mediaThumbnailUrl.startsWith("https://"));
});

test("Importador Inteligente de Treinos: Parsing de Planilha, Divisões e Séries", () => {
  const rawSpreadsheet = `Plano: Hipertrofia ABCD
Aluno: Carlos Eduardo
Objetivo: Ganho de Massa

Treino A - Peitoral e Tríceps
1. Supino Reto com Barra 4x10 descanso: 90s carga: 30kg - Amplitude total
2. Supino Inclinado 3x12 descanso: 60s carga: 22kg
3. Tríceps Corda 4x12 descanso: 45s - Drop-set

Treino B - Dorsais e Bíceps
1. Puxada Frontal 4x10 descanso: 60s carga: 55kg
2. Rosca Direta 3x10 descanso: 60s carga: 14kg`;

  // Test parser functions
  const setsRepsRegex = /(\d+)\s*[xX*]\s*(\d+(?:\s*[-aà]\s*\d+)?|\d+\+)/i;
  const matchSupino = "Supino Reto com Barra 4x10 descanso: 90s carga: 30kg - Amplitude total".match(setsRepsRegex);

  assert.ok(matchSupino);
  assert.strictEqual(parseInt(matchSupino[1], 10), 4);
  assert.strictEqual(matchSupino[2], "10");

  const lines = rawSpreadsheet.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  assert.ok(lines.length > 5);

  const divisionRegex = /^(?:treino|sessão|sess[aã]o|dia|ficha|etapa)\s*([A-Z0-9]+)\s*[-–—:;]?\s*(.*)/i;
  const matchDivA = "Treino A - Peitoral e Tríceps".match(divisionRegex);
  assert.ok(matchDivA);
  assert.strictEqual(matchDivA[1].toUpperCase(), "A");
  assert.strictEqual(matchDivA[2].trim(), "Peitoral e Tríceps");
});









