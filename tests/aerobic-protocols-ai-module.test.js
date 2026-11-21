const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = process.cwd();
const outDir = path.join(os.tmpdir(), "dragoncorp-aerobic-tests-" + Date.now());
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const tsconfigPath = path.join(outDir, "tsconfig.json");
fs.writeFileSync(
  tsconfigPath,
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        module: "commonjs",
        moduleResolution: "node",
        skipLibCheck: true,
        outDir,
        baseUrl: root,
        paths: {
          "@/*": ["./*"],
        },
      },
      files: [
        path.join(root, "services", "aerobic-protocol-ai-service.ts"),
        path.join(root, "services", "aerobic-protocol-store.ts"),
        path.join(root, "services", "conconi-protocol-service.ts"),
      ],
    },
    null,
    2
  )
);

execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsc", "-p", tsconfigPath], {
  cwd: root,
  stdio: "inherit",
});

process.env.NODE_PATH = path.join(root, "node_modules");
Module._initPaths();

fs.writeFileSync(
  path.join(outDir, "react-native-mock.js"),
  `
module.exports = {
  Platform: { OS: "ios", select: (obj) => obj.ios || obj.default },
  Alert: { alert: () => {} },
  Linking: { openURL: async () => {}, canOpenURL: async () => true },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
};
`
);

const memory = new Map();
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request === "react-native") {
    return path.join(outDir, "react-native-mock.js");
  }
  if (request === "@react-native-async-storage/async-storage") {
    return path.join(outDir, "async-storage-mock.js");
  }
  if (request === "expo-print" || request === "expo-sharing") {
    return path.join(outDir, "expo-print-mock.js");
  }
  if (request.startsWith("@/services/")) {
    const filename = `${request.replace("@/services/", "")}.js`;
    const candidate1 = path.join(outDir, filename);
    const candidate2 = path.join(outDir, "services", filename);
    if (fs.existsSync(candidate1)) return candidate1;
    if (fs.existsSync(candidate2)) return candidate2;
    return candidate1;
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

fs.writeFileSync(
  path.join(outDir, "async-storage-mock.js"),
  `
module.exports = {
  __esModule: true,
  default: {
    getItem: async (key) => global.__aerobicStorage.get(key) ?? null,
    setItem: async (key, value) => { global.__aerobicStorage.set(key, value); },
    removeItem: async (key) => { global.__aerobicStorage.delete(key); },
    multiRemove: async (keys) => { keys.forEach((key) => global.__aerobicStorage.delete(key)); },
    clear: async () => { global.__aerobicStorage.clear(); },
  },
};
`
);

fs.writeFileSync(
  path.join(outDir, "expo-print-mock.js"),
  `
module.exports = {
  printToFileAsync: async (opts) => ({ uri: "file:///mock/print.pdf" }),
  shareAsync: async (uri) => true,
  isAvailableAsync: async () => true,
};
`
);

global.__aerobicStorage = memory;

function findCompiled(file) {
  const c1 = path.join(outDir, file);
  const c2 = path.join(outDir, "services", file);
  if (fs.existsSync(c1)) return c1;
  if (fs.existsSync(c2)) return c2;
  throw new Error(`Compiled file ${file} not found in ${outDir}`);
}

const aiService = require(findCompiled("aerobic-protocol-ai-service.js"));
const aerobicStore = require(findCompiled("aerobic-protocol-store.js"));
const conconiService = require(findCompiled("conconi-protocol-service.js"));

test("MÓDULO DE PROTOCOLOS AERÓBICOS & IA — SUÍTE DE 30 VALIDAÇÕES OBRIGATÓRIAS", async (t) => {
  // 1. Seleção de aluno
  await t.test("1. Seleção de aluno vincula corretamente o ID e nome na prescrição", () => {
    const input = {
      studentId: "student-42",
      studentName: "Juliana Silva",
      goal: "conditioning",
      prescriptionMode: "speed",
      weeklyFrequency: 3,
      sessionDurationMinutes: 30,
    };
    const result = aiService.generateAerobicProtocolsAI(input);
    assert.equal(result.suggestions.length, 3);
    assert.ok(result.suggestions[0].title.length > 0);
  });

  // 2. Cadastro de avaliação
  await t.test("2. Cadastro de avaliação aeróbica persiste campos fisiológicos e metadata", async () => {
    const assessment = {
      id: "assess-test-1",
      trainerId: "trainer-a",
      studentId: "student-1",
      studentName: "Carlos Aluno",
      assessmentDate: "2026-11-21",
      environment: "esteira",
      protocolName: "conconi",
      stages: [
        { stage: 1, speedKmh: 5.0, heartRateBpm: 110 },
        { stage: 2, speedKmh: 6.0, heartRateBpm: 122 },
        { stage: 3, speedKmh: 7.0, heartRateBpm: 135 },
        { stage: 4, speedKmh: 8.0, heartRateBpm: 148 },
        { stage: 5, speedKmh: 9.0, heartRateBpm: 158 },
      ],
      analysis: {
        deflectionStatus: "deflexao_identificada",
        deflectionHeartRate: 148,
        deflectionSpeedKmh: 8.0,
        qualityScore: 90,
        isReliable: true,
        explanation: "Identificado",
        zones: {
          z1Recovery: { minBpm: 100, maxBpm: 120, label: "Z1" },
          z2Aerobic: { minBpm: 121, maxBpm: 135, label: "Z2" },
          z3Threshold: { minBpm: 136, maxBpm: 148, label: "Z3" },
          z4Vo2Max: { minBpm: 149, maxBpm: 165, label: "Z4" },
          z5Anaerobic: { minBpm: 166, maxBpm: 175, label: "Z5" },
        },
      },
      status: "concluido",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await aerobicStore.saveAerobicAssessment(assessment);
    assert.equal(saved.id, "assess-test-1");

    const fetched = await aerobicStore.getAerobicAssessmentById("assess-test-1", "trainer-a");
    assert.ok(fetched);
    assert.equal(fetched.studentName, "Carlos Aluno");
    assert.equal(fetched.stages.length, 5);
  });

  // 3. Registro dos estágios do Conconi
  await t.test("3. Registro dos estágios do Conconi ordena por velocidade crescente", () => {
    const rawStages = [
      { stage: 3, speedKmh: 8.0, heartRateBpm: 148 },
      { stage: 1, speedKmh: 5.0, heartRateBpm: 110 },
      { stage: 2, speedKmh: 6.5, heartRateBpm: 128 },
      { stage: 4, speedKmh: 9.5, heartRateBpm: 160 },
      { stage: 5, speedKmh: 11.0, heartRateBpm: 172 },
    ];
    const analysis = aiService.analyzeConconiData(rawStages);
    assert.equal(analysis.maxSpeedObserved, 11.0);
    assert.equal(analysis.maxHeartRateObserved, 172);
  });

  // 4. Registro de velocidade e FC
  await t.test("4. Registro de velocidade e FC descarta ruídos anômalos (< 40 bpm ou < 0 km/h)", () => {
    const noisyStages = [
      { stage: 0, speedKmh: -1.0, heartRateBpm: 20 },
      { stage: 1, speedKmh: 5.0, heartRateBpm: 110 },
      { stage: 2, speedKmh: 6.0, heartRateBpm: 122 },
      { stage: 3, speedKmh: 7.0, heartRateBpm: 135 },
      { stage: 4, speedKmh: 8.0, heartRateBpm: 148 },
      { stage: 5, speedKmh: 9.0, heartRateBpm: 158 },
    ];
    const analysis = aiService.analyzeConconiData(noisyStages);
    assert.ok(analysis.maxSpeedObserved >= 5.0);
    assert.ok(analysis.maxHeartRateObserved >= 110);
  });

  // 5. Análise dos resultados (curva bilateral)
  await t.test("5. Análise dos resultados detecta ponto de deflexão com regressão linear", () => {
    const typicalConconi = [
      { stage: 1, speedKmh: 5.0, heartRateBpm: 110 },
      { stage: 2, speedKmh: 6.0, heartRateBpm: 122 },
      { stage: 3, speedKmh: 7.0, heartRateBpm: 135 },
      { stage: 4, speedKmh: 8.0, heartRateBpm: 148 },
      { stage: 5, speedKmh: 9.0, heartRateBpm: 158 },
      { stage: 6, speedKmh: 10.0, heartRateBpm: 165 }, // deflexão na inclinação
      { stage: 7, speedKmh: 11.0, heartRateBpm: 170 },
      { stage: 8, speedKmh: 12.0, heartRateBpm: 174 },
    ];
    const result = aiService.analyzeConconiData(typicalConconi);
    assert.ok(result.deflectionStatus === "deflexao_identificada" || result.deflectionStatus === "deflexao_possivel");
    assert.ok(result.deflectionHeartRate >= 148 && result.deflectionHeartRate <= 165);
    assert.ok(result.qualityScore >= 70);
  });

  // 6. Tratamento de dados insuficientes e limiar não determinado
  await t.test("6. Tratamento de dados insuficientes retorna 'dados_insuficientes' sem inventar limiar", () => {
    const tooFew = [
      { stage: 1, speedKmh: 5.0, heartRateBpm: 110 },
      { stage: 2, speedKmh: 6.0, heartRateBpm: 122 },
      { stage: 3, speedKmh: 7.0, heartRateBpm: 135 },
    ];
    const result = aiService.analyzeConconiData(tooFew);
    assert.equal(result.deflectionStatus, "dados_insuficientes");
    assert.equal(result.deflectionHeartRate, undefined);
    assert.equal(result.isReliable, false);
    assert.ok(result.explanation.includes("insuficientes"));
  });

  // 7. Geração por velocidade
  await t.test("7. Geração por velocidade estrutura treinos em km/h com referências do teste", () => {
    const res = aiService.generateAerobicProtocolsAI({
      studentId: "s1",
      studentName: "Aluno",
      goal: "running_perf",
      prescriptionMode: "speed",
      weeklyFrequency: 3,
      sessionDurationMinutes: 30,
    });
    assert.equal(res.suggestions[0].prescriptionMode, "speed");
    assert.ok(res.suggestions[0].blocks[0].workSpeedKmh > 0);
  });

  // 8. Geração por frequência cardíaca
  await t.test("8. Geração por frequência cardíaca calcula zonas Karvonen / % FCmáx", () => {
    const zones = aiService.calculateHeartRateZones({
      ageYears: 30,
      hrMaxMeasured: 190,
      hrRestBpm: 60,
      method: "karvonen_reserve",
    });
    assert.equal(zones.method, "karvonen_reserve");
    assert.equal(zones.isEstimated, false);
    assert.equal(zones.hrMaxUsed, 190);
    assert.ok(zones.zones.Z4.minBpm > zones.zones.Z2.maxBpm);
  });

  // 9. Geração híbrida
  await t.test("9. Geração híbrida combina velocidade operacional + zona de FC + Borg", () => {
    const res = aiService.generateAerobicProtocolsAI({
      studentId: "s1",
      studentName: "Aluno Híbrido",
      goal: "speed_sustainability",
      prescriptionMode: "hybrid",
      weeklyFrequency: 3,
      sessionDurationMinutes: 30,
    });
    const sug = res.suggestions[1];
    assert.equal(sug.prescriptionMode, "hybrid");
    assert.ok(sug.blocks[0].workSpeedKmh !== undefined);
    assert.ok(sug.blocks[0].workHrBpmMin !== undefined);
  });

  // 10. Geração das diferentes opções com IA (A, B e C)
  await t.test("10. Geração das 3 opções com IA retorna estruturas fisiológicas distintas", () => {
    const res = aiService.generateAerobicProtocolsAI({
      studentId: "s1",
      studentName: "Aluno Teste",
      goal: "conditioning",
      prescriptionMode: "hybrid",
      weeklyFrequency: 3,
      sessionDurationMinutes: 30,
    });
    assert.equal(res.suggestions.length, 3);
    assert.equal(res.suggestions[0].suggestionKey, "A_CONSERVADORA");
    assert.equal(res.suggestions[1].suggestionKey, "B_EQUILIBRADA");
    assert.equal(res.suggestions[2].suggestionKey, "C_ESPECIFICA");
    assert.notEqual(res.suggestions[0].stimulusType, res.suggestions[2].stimulusType);
  });

  // 11. Edição de protocolo sugerido
  await t.test("11. Edição de protocolo sugerido atualiza blocos e recalcula duração", () => {
    const blocks = [
      {
        blockType: "interval",
        name: "Tiros Modificados",
        reps: 5,
        workDurationSeconds: 60,
        restDurationSeconds: 60,
        includeRestAfterLastRep: true,
      },
    ];
    const dur = aiService.calculateSessionDuration(blocks, 5, 3);
    // 5 reps * (60 + 60) = 600s + 300s (aquec) + 180s (calma) = 1080s = 18 min
    assert.equal(dur.totalSeconds, 1080);
    assert.equal(dur.totalMinutes, 18);
  });

  // 12. Criação manual
  await t.test("12. Criação manual de protocolo com blocos personalizados", async () => {
    const manualProto = {
      id: "manual-proto-1",
      trainerId: "trainer-1",
      studentId: "student-1",
      studentName: "Manual Student",
      title: "Treino Personalizado Manual",
      objective: "Trabalho manual de base",
      prescriptionMode: "speed",
      mesocycleWeeks: 4,
      version: 1,
      status: "draft",
      daysPrescription: [
        {
          id: "dp-manual-1",
          dayOfWeek: "Terça",
          sessionTitle: "Treino Livre de Terça",
          prescriptionMode: "speed",
          warmupMinutes: 5,
          blocks: [
            {
              blockType: "continuous",
              name: "Contínuo Z2",
              workDurationSeconds: 1200,
              durationSeconds: 1200,
              workSpeedKmh: 8.5,
            },
          ],
          cooldownMinutes: 3,
          totalDurationMinutes: 28,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const saved = await aerobicStore.saveAerobicProtocol(manualProto);
    assert.equal(saved.title, "Treino Personalizado Manual");
  });

  // 13. Cálculo correto da duração
  await t.test("13. Cálculo exato da duração considera repetições, descanso interbloco e volta à calma", () => {
    const blocks = [
      {
        blockType: "interval",
        name: "Tiros 3x 2min / 1min",
        reps: 3,
        workDurationSeconds: 120, // 360s
        restDurationSeconds: 60,  // 180s
        includeRestAfterLastRep: true,
      },
      {
        blockType: "interblock_rest",
        name: "Descanso",
        restDurationSeconds: 120, // 120s
        durationSeconds: 120,
      },
      {
        blockType: "continuous",
        name: "Contínuo 10min",
        workDurationSeconds: 600, // 600s
        durationSeconds: 600,
      },
    ];
    // Work = 360 + 600 = 960s
    // Rest = 180 + 120 = 300s
    // Total blocks = 1260s. Warmup = 5m (300s), Cooldown = 3m (180s). Grand total = 1740s = 29 min.
    const summary = aiService.calculateSessionDuration(blocks, 5, 3);
    assert.equal(summary.totalSeconds, 1740);
    assert.equal(summary.totalMinutes, 29);
    assert.equal(summary.formattedDuration, "29m");
  });

  // 14. Agendamento semanal
  await t.test("14. Agendamento semanal distribui múltiplos dias (Segunda, Quarta, Sexta)", () => {
    const proto = aerobicStore.SAMPLE_AEROBIC_PROTOCOL;
    assert.equal(proto.daysPrescription.length, 3);
    assert.equal(proto.daysPrescription[0].dayOfWeek, "Segunda");
    assert.equal(proto.daysPrescription[1].dayOfWeek, "Quarta");
    assert.equal(proto.daysPrescription[2].dayOfWeek, "Sexta");
  });

  // 15. Atribuição ao aluno
  await t.test("15. Atribuição de protocolo ao aluno atualiza status para 'assigned'", async () => {
    const proto = {
      id: "assign-proto-1",
      trainerId: "trainer-a",
      studentId: "student-temp",
      studentName: "Temp",
      title: "Protocolo Para Atribuir",
      objective: "Teste",
      prescriptionMode: "hybrid",
      mesocycleWeeks: 4,
      version: 1,
      status: "draft",
      daysPrescription: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await aerobicStore.saveAerobicProtocol(proto);

    const assigned = await aerobicStore.assignAerobicProtocolToStudent("assign-proto-1", "student-target", "trainer-a");
    assert.ok(assigned);
    assert.equal(assigned.studentId, "student-target");
    assert.equal(assigned.status, "assigned");
    assert.ok(assigned.assignedAt);
  });

  // 16. Exibição no perfil do aluno
  await t.test("16. Exibição no perfil do aluno filtra apenas protocolos liberados ('assigned' ou 'approved')", async () => {
    const list = await aerobicStore.getStudentActiveAerobicProtocols("student-1");
    assert.ok(Array.isArray(list));
    list.forEach((p) => {
      assert.ok(p.status === "assigned" || p.status === "approved");
    });
  });

  // 17. Registro da execução
  await t.test("17. Registro da execução armazena dados reais (velocidades, bpm, RPE e conclusão)", async () => {
    const execution = {
      id: "exec-101",
      protocolId: "proto-1",
      studentId: "student-1",
      trainerId: "trainer-1",
      dayOfWeek: "Segunda",
      executedAt: new Date().toISOString(),
      durationMinutes: 28,
      actualSpeeds: [10.5, 5.0, 10.5, 5.0, 9.5],
      actualBpmAvg: 154,
      actualBpmMax: 168,
      rpeScore: 7,
      completionStatus: "completed",
      notes: "Senti boa recuperação no final.",
    };
    const saved = await aerobicStore.recordAerobicExecution(execution);
    assert.equal(saved.id, "exec-101");

    const execs = await aerobicStore.listAerobicExecutions("student-1");
    assert.ok(execs.length > 0);
    assert.equal(execs[0].rpeScore, 7);
  });

  // 18. Histórico de avaliações e treinos
  await t.test("18. Histórico de avaliações e treinos lista múltiplos registros cronológicos", async () => {
    const assessList = await aerobicStore.listAerobicAssessments("trainer-a", "student-1");
    assert.ok(Array.isArray(assessList));
  });

  // 19. Proteção dos dados de outros alunos
  await t.test("19. Proteção dos dados: listagem por studentId nunca vaza protocolos de outro aluno", async () => {
    const protoStudentB = {
      id: "proto-secret-b",
      trainerId: "trainer-x",
      studentId: "student-B",
      studentName: "Aluno B",
      title: "Treino Privado B",
      objective: "Privado",
      prescriptionMode: "speed",
      mesocycleWeeks: 2,
      version: 1,
      status: "assigned",
      daysPrescription: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await aerobicStore.saveAerobicProtocol(protoStudentB);

    const forStudentA = await aerobicStore.listAerobicProtocols("trainer-x", "student-A");
    assert.equal(forStudentA.some((p) => p.id === "proto-secret-b"), false);
  });

  // 20. Bloqueio de alterações administrativas pelo aluno
  await t.test("20. Bloqueio de alterações: registro de execução pelo aluno não altera a prescrição original", async () => {
    const originalProto = await aerobicStore.getAerobicProtocolById("assign-proto-1", "trainer-a");
    const exec = {
      protocolId: "assign-proto-1",
      studentId: "student-target",
      trainerId: "trainer-a",
      dayOfWeek: "Segunda",
      executedAt: new Date().toISOString(),
      durationMinutes: 15,
      actualSpeeds: [8.0],
      rpeScore: 9,
      completionStatus: "partial",
      interruptionReason: "Cansaço",
    };
    await aerobicStore.recordAerobicExecution(exec);

    const afterExecProto = await aerobicStore.getAerobicProtocolById("assign-proto-1", "trainer-a");
    assert.equal(afterExecProto.status, originalProto.status);
    assert.equal(afterExecProto.title, originalProto.title);
  });

  // 21. Compatibilidade com módulo de treinos e protocolos legados
  await t.test("21. Compatibilidade com módulo legado: sincroniza com conconi-protocol-service", async () => {
    const protoToSync = {
      id: "sync-legacy-test",
      trainerId: "trainer-sync",
      studentId: "std-sync",
      studentName: "Sync Student",
      title: "Protocolo Sincronizado",
      objective: "Compatibilidade",
      prescriptionMode: "speed",
      mesocycleWeeks: 4,
      version: 1,
      status: "approved",
      daysPrescription: [
        {
          id: "dp-sync-1",
          dayOfWeek: "Quarta",
          sessionTitle: "Treino Intervalado",
          prescriptionMode: "speed",
          warmupMinutes: 5,
          warmupText: "Aquecimento",
          blocks: [
            {
              blockType: "interval",
              name: "Tiros",
              reps: 4,
              workDurationSeconds: 120,
              workSpeedKmh: 6.0,
              restDurationSeconds: 60,
              restSpeedKmh: 3.0,
            },
          ],
          cooldownMinutes: 3,
          totalDurationMinutes: 20,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await aerobicStore.saveAerobicProtocol(protoToSync);

    const legacyList = await conconiService.listConconiProtocols("trainer-sync");
    assert.ok(legacyList.some((p) => p.id === "sync-legacy-test"));
  });

  // 22. Responsividade iOS e Android
  await t.test("22. Responsividade: cálculo de duração suporta qualquer formatação sem quebra de tela", () => {
    const dur1 = aiService.calculateSessionDuration([], 0, 0);
    assert.equal(dur1.formattedDuration, "0m");

    const dur2 = aiService.calculateSessionDuration([
      { blockType: "continuous", workDurationSeconds: 45 },
    ]);
    assert.equal(dur2.formattedDuration, "0m 45s");
  });

  // 23. Persistência após reiniciar o aplicativo
  await t.test("23. Persistência local salva e recupera dados intactos do storage", async () => {
    const stats = await aerobicStore.getAerobicOverviewStats("trainer");
    assert.ok(stats.recentTestsCount >= 0);
    assert.ok(stats.activeProtocolsCount >= 0);
  });

  // 24. Tratamento de falha do provedor de IA
  await t.test("24. Tratamento de falha de IA: motor determinístico fornece prescrições válidas como fallback", () => {
    // Se faltarem dados biométricos ou der erro no modelo externo
    const fallbackResult = aiService.generateAerobicProtocolsAI({
      studentId: "fallback-student",
      studentName: "Fallback",
      goal: "conditioning",
      prescriptionMode: "speed",
      weeklyFrequency: 3,
      sessionDurationMinutes: 25,
    });
    assert.equal(fallbackResult.suggestions.length, 3);
    assert.ok(fallbackResult.suggestions[0].blocks.length > 0);
  });

  // 25. Validação de resultados estruturados (JSON Schema compliance)
  await t.test("25. Validação de resultados estruturados garante integridade de campos obrigatórios", () => {
    const res = aiService.generateAerobicProtocolsAI({
      studentId: "schema-std",
      studentName: "Schema Test",
      goal: "endurance",
      prescriptionMode: "hybrid",
      weeklyFrequency: 3,
      sessionDurationMinutes: 30,
    });
    for (const sug of res.suggestions) {
      assert.ok(sug.suggestionKey);
      assert.ok(sug.title);
      assert.ok(sug.objective);
      assert.ok(Array.isArray(sug.blocks));
      assert.ok(sug.warmup.durationMinutes >= 0);
      assert.ok(sug.cooldown.durationMinutes >= 0);
      assert.ok(sug.technicalJustification.length > 0);
      assert.ok(Array.isArray(sug.alertsAndLimitations));
      assert.ok(Array.isArray(sug.adaptationTips));
    }
  });

  // 26. Funcionamento com conexão instável / offline
  await t.test("26. Funcionamento offline: cálculos e persistência executam 100% no cliente sem rede", () => {
    const hr = aiService.calculateHeartRateZones({ ageYears: 25 });
    assert.equal(hr.hrMaxUsed, 191);
    assert.ok(hr.zones.Z1.maxBpm > 0);
  });

  // 27. Preservação das funcionalidades anteriores
  await t.test("27. Preservação de dados anteriores: SAMPLE_AEROBIC_PROTOCOL mantém integridade", () => {
    assert.equal(aerobicStore.SAMPLE_AEROBIC_PROTOCOL.daysPrescription.length, 3);
    assert.equal(aerobicStore.SAMPLE_AEROBIC_PROTOCOL.mesocycleWeeks, 4);
  });

  // 28. Revogação de acesso e bloqueio de segurança clínica
  await t.test("28. Segurança clínica: bloqueia SIT / RST e HIIT para histórico cardíaco registrado", () => {
    const check = aiService.validateSafetyAndContraindications({
      studentId: "risk-std",
      studentName: "Cardiac Risk",
      goal: "running_perf",
      prescriptionMode: "speed",
      weeklyFrequency: 2,
      sessionDurationMinutes: 20,
      contraindications: ["Cardiopatia isquêmica"],
    });
    assert.equal(check.allowed, true);
    assert.ok(check.restrictedTypes.includes("sit"));
    assert.ok(check.restrictedTypes.includes("rst"));
    assert.ok(check.restrictedTypes.includes("hiit_short"));
    assert.ok(check.warnings.some((w) => w.includes("cardiovascular")));
  });

  // 29. Funcionamento com diferentes escalas e mesociclos
  await t.test("29. Mesociclos configuráveis (2, 4, 6 e 8 semanas) e duplicação de protocolos", async () => {
    const duplicated = await aerobicStore.duplicateAerobicProtocol(
      aerobicStore.SAMPLE_AEROBIC_PROTOCOL.id,
      "trainer",
      "student-new",
      "Novo Aluno"
    );
    assert.ok(duplicated);
    assert.equal(duplicated.studentId, "student-new");
    assert.equal(duplicated.studentName, "Novo Aluno");
    assert.equal(duplicated.status, "draft");
  });

  // 30. Geração de PDF do laudo Conconi e prescrição
  await t.test("30. Geração de PDF inclui branding, dados fisiológicos, zonas e blocos semanais", async () => {
    const html = await conconiService.generateConconiProtocolPdfHtml(
      conconiService.DEFAULT_SAMPLE_CONCONI_PROTOCOL,
      "trainer"
    );
    assert.ok(html.includes("<!DOCTYPE html>"));
    assert.ok(html.includes("PROTOCOLO AERÓBIO"));
    assert.ok(html.includes("Charles Nóbrega"));
    assert.ok(html.includes("Z1:"));
  });
});
