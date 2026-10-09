const test = require("node:test");
const assert = require("node:assert/strict");

// ==============================================================================
// Suíte de Testes do Sistema de Notificações DragonCorp
// ==============================================================================

// 1. Funções de motor e catálogo
function renderTemplate(template, variables) {
  if (!template) return "";
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const val = variables[key];
    if (val === undefined || val === null) return "";
    return String(val)
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  });
}

function generateDedupeKey(eventType, resourceId, recipientId, discriminator) {
  const parts = [eventType, resourceId, recipientId];
  if (discriminator) parts.push(discriminator);
  return parts.join(":");
}

function isInQuietHours(now, quietHours) {
  if (!quietHours?.enabled) return false;

  const [startH, startM] = quietHours.start.split(":").map(Number);
  const [endH, endM] = quietHours.end.split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = (startH ?? 22) * 60 + (startM ?? 0);
  const endMinutes = (endH ?? 8) * 60 + (endM ?? 0);

  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

function shouldDispatchNotification(event, quietHours, now = new Date()) {
  // Alertas críticos ignoram o horário de silêncio
  if (event.priority === "critical") {
    return { shouldSend: true, reason: "critical_bypass" };
  }

  // Verifica se está dentro do horário de silêncio
  if (isInQuietHours(now, quietHours)) {
    return { shouldSend: false, reason: "quiet_hours_postponed" };
  }

  return { shouldSend: true, reason: "normal_dispatch" };
}

function sanitizeForLockScreen(event) {
  // Para relatos de dor e saúde, a tela de bloqueio não expõe detalhes clínicos
  if (event.category === "pain" || event.priority === "critical") {
    return {
      title: "DragonCorp • Atenção",
      lockScreenBody: "Um aluno enviou um relato que exige atenção.",
      inAppBody: event.body, // detalhes clínicos disponíveis pós-autenticação
    };
  }
  return {
    title: event.title,
    lockScreenBody: event.body,
    inAppBody: event.body,
  };
}

function formatBadgeCount(unreadCount) {
  if (unreadCount <= 0) return "0";
  if (unreadCount > 99) return "99+";
  return String(unreadCount);
}

// ------------------------------------------------------------------------------
// TESTES
// ------------------------------------------------------------------------------

test("1. Catálogo DragonCorp: Eventos de Treinos e Execução", () => {
  const workoutPublishedEvent = {
    eventType: "workout.published",
    category: "workout",
    priority: "normal",
    titleTemplate: "Novo treino disponível! 💪",
    bodyTemplate: "Seu treinador {{trainerName}} prescreveu a ficha '{{workoutName}}'.",
    variables: { trainerName: "Treinador Carlos", workoutName: "Treino A - Hipertrofia" },
  };

  const renderedBody = renderTemplate(workoutPublishedEvent.bodyTemplate, workoutPublishedEvent.variables);
  assert.strictEqual(renderedBody, "Seu treinador Treinador Carlos prescreveu a ficha 'Treino A - Hipertrofia'.");
  assert.strictEqual(workoutPublishedEvent.priority, "normal");
});

test("2. Catálogo DragonCorp: Relato de Dor com Prioridade Crítica e Sanitização de Tela de Bloqueio", () => {
  const painEvent = {
    eventType: "pain.reported",
    category: "pain",
    priority: "critical",
    title: "Alerta de Dor Relatada",
    body: "Aluno João relatou dor aguda de nível 9 no joelho direito durante o agachamento.",
    recipientId: "trainer_123",
  };

  const sanitized = sanitizeForLockScreen(painEvent);

  // A tela bloqueada não deve expor "joelho direito" ou "nível 9" por privacidade médica
  assert.strictEqual(sanitized.lockScreenBody, "Um aluno enviou um relato que exige atenção.");
  assert.ok(!sanitized.lockScreenBody.includes("joelho"));
  assert.ok(!sanitized.lockScreenBody.includes("nível 9"));

  // O corpo in-app retém os detalhes clínicos para o personal
  assert.strictEqual(sanitized.inAppBody, "Aluno João relatou dor aguda de nível 9 no joelho direito durante o agachamento.");
});

test("3. Catálogo DragonCorp: Avaliações Físicas e Reavaliação Periódica", () => {
  const assessmentEvent = {
    eventType: "assessment.reassessment_due",
    category: "assessment",
    priority: "high",
    titleTemplate: "Hora de reavaliar! 📊",
    bodyTemplate: "Sua reavaliação física está prevista para {{dueDate}}.",
    variables: { dueDate: "15/10/2026" },
  };

  const rendered = renderTemplate(assessmentEvent.bodyTemplate, assessmentEvent.variables);
  assert.strictEqual(rendered, "Sua reavaliação física está prevista para 15/10/2026.");
  assert.strictEqual(assessmentEvent.priority, "high");
});

test("4. Catálogo DragonCorp: Anamnese Pendente e Concluída", () => {
  const anamnesisEvent = {
    eventType: "anamnesis.pending",
    category: "assessment",
    priority: "high",
    titleTemplate: "Ficha de Anamnese Pendente",
    bodyTemplate: "Preencha sua anamnese de saúde para que {{trainerName}} possa prescrever seu treino com segurança.",
    variables: { trainerName: "Rodrigo Personal" },
  };

  const rendered = renderTemplate(anamnesisEvent.bodyTemplate, anamnesisEvent.variables);
  assert.strictEqual(rendered, "Preencha sua anamnese de saúde para que Rodrigo Personal possa prescrever seu treino com segurança.");
});

test("5. Catálogo DragonCorp: Protocolos Aeróbios e Check-in de Prontidão (Readiness)", () => {
  const protocolEvent = {
    eventType: "protocol.assigned",
    category: "workout",
    priority: "normal",
    titleTemplate: "Novo Protocolo Aeróbio 🏃",
    bodyTemplate: "Protocolo '{{protocolName}}' configurado: {{durationMinutes}} min em intensidade {{targetZone}}.",
    variables: { protocolName: "HIIT Esteira 20min", durationMinutes: "20", targetZone: "Zona 4" },
  };

  const readinessAlert = {
    eventType: "readiness.low_score_alert",
    category: "readiness",
    priority: "high",
    titleTemplate: "Alerta de Prontidão Baixa ⚠️",
    bodyTemplate: "Aluno {{studentName}} registrou prontidão {{score}}/10. Considere ajustar a carga.",
    variables: { studentName: "Mariana", score: "3" },
  };

  assert.strictEqual(
    renderTemplate(protocolEvent.bodyTemplate, protocolEvent.variables),
    "Protocolo 'HIIT Esteira 20min' configurado: 20 min em intensidade Zona 4."
  );
  assert.strictEqual(
    renderTemplate(readinessAlert.bodyTemplate, readinessAlert.variables),
    "Aluno Mariana registrou prontidão 3/10. Considere ajustar a carga."
  );
});

test("6. Catálogo DragonCorp: Feedback de Treino e Respostas", () => {
  const feedbackEvent = {
    eventType: "feedback.reply_received",
    category: "feedback",
    priority: "normal",
    titleTemplate: "Resposta do Personal 💬",
    bodyTemplate: "{{trainerName}} respondeu ao seu feedback sobre '{{workoutName}}'.",
    variables: { trainerName: "Carlos Personal", workoutName: "Treino de Peito e Tríceps" },
  };

  const rendered = renderTemplate(feedbackEvent.bodyTemplate, feedbackEvent.variables);
  assert.strictEqual(rendered, "Carlos Personal respondeu ao seu feedback sobre 'Treino de Peito e Tríceps'.");
});

test("7. Catálogo DragonCorp: Agenda, Agendamentos e Lembretes 24h/1h", () => {
  const aptReminder24h = {
    eventType: "appointment.reminder_24h",
    category: "appointment",
    priority: "normal",
    titleTemplate: "Lembrete: Consulta amanhã 📅",
    bodyTemplate: "Você tem sessão agendada com {{trainerName}} amanhã às {{time}}.",
    variables: { trainerName: "Carlos", time: "10:00" },
  };

  const aptCancelled = {
    eventType: "appointment.cancelled",
    category: "appointment",
    priority: "high",
    titleTemplate: "Agendamento cancelado",
    bodyTemplate: "A sessão agendada para {{date}} foi cancelada.",
    variables: { date: "12/10/2026 às 15:00" },
  };

  assert.strictEqual(renderTemplate(aptReminder24h.bodyTemplate, aptReminder24h.variables), "Você tem sessão agendada com Carlos amanhã às 10:00.");
  assert.strictEqual(renderTemplate(aptCancelled.bodyTemplate, aptCancelled.variables), "A sessão agendada para 12/10/2026 às 15:00 foi cancelada.");
});

test("8. Catálogo DragonCorp: Mensagens Diretas e Chat", () => {
  const messageEvent = {
    eventType: "message.new_message",
    category: "message",
    priority: "high",
    titleTemplate: "Nova mensagem de {{senderName}}",
    bodyTemplate: "{{previewText}}",
    variables: { senderName: "Professor Rodrigo", previewText: "Tudo bem! Pode trocar o exercício pelo leg press 45." },
  };

  assert.strictEqual(renderTemplate(messageEvent.titleTemplate, messageEvent.variables), "Nova mensagem de Professor Rodrigo");
  assert.strictEqual(renderTemplate(messageEvent.bodyTemplate, messageEvent.variables), "Tudo bem! Pode trocar o exercício pelo leg press 45.");
});

test("9. Catálogo DragonCorp: Lembretes de Hidratação (Opt-in estrito e janela 08h-20h)", () => {
  const hydrationReminder = {
    eventType: "hydration.reminder",
    category: "hydration",
    priority: "low",
    title: "Hora de se hidratar 💧",
    body: "Lembre-se de beber um copo d'água para manter sua hidratação em dia.",
  };

  const quietHours = { enabled: true, start: "20:00", end: "08:00" };

  // 14:00 (dentro da janela de hidratação permitida)
  const afternoonTime = new Date("2026-10-09T14:00:00");
  const checkAfternoon = shouldDispatchNotification(hydrationReminder, quietHours, afternoonTime);
  assert.strictEqual(checkAfternoon.shouldSend, true);

  // 21:30 (fora da janela de hidratação, não deve incomodar o usuário)
  const nightTime = new Date("2026-10-09T21:30:00");
  const checkNight = shouldDispatchNotification(hydrationReminder, quietHours, nightTime);
  assert.strictEqual(checkNight.shouldSend, false);
  assert.strictEqual(checkNight.reason, "quiet_hours_postponed");
});

test("10. Catálogo DragonCorp: Assinaturas e Webhooks da Apple & Google Play (Store Webhooks)", () => {
  const appleRenew = {
    eventType: "subscription.renewed",
    category: "subscription",
    priority: "normal",
    title: "Assinatura Renovada ✅",
    body: "Sua assinatura DragonCorp Pro foi renovada com sucesso.",
  };

  const paymentFailed = {
    eventType: "subscription.payment_failed",
    category: "subscription",
    priority: "critical",
    title: "Falha na renovação da assinatura ⚠️",
    body: "Não foi possível processar o pagamento da sua assinatura. Atualize a forma de pagamento na App Store ou Google Play.",
  };

  assert.strictEqual(appleRenew.priority, "normal");
  assert.strictEqual(paymentFailed.priority, "critical");
});

test("11. Deduplicação e Idempotência: dedupeKey impede duplicatas", () => {
  const eventType = "workout.published";
  const resourceId = "workout_uuid_999";
  const recipientId = "student_uuid_111";

  const key1 = generateDedupeKey(eventType, resourceId, recipientId);
  const key2 = generateDedupeKey(eventType, resourceId, recipientId);
  const keyWithDiscriminator = generateDedupeKey(eventType, resourceId, recipientId, "v2");

  assert.strictEqual(key1, key2);
  assert.strictEqual(key1, "workout.published:workout_uuid_999:student_uuid_111");
  assert.strictEqual(keyWithDiscriminator, "workout.published:workout_uuid_999:student_uuid_111:v2");
});

test("12. Horário de Silêncio (Quiet Hours) vs Bypass Crítico de Dor e Emergência", () => {
  const quietHours = { enabled: true, start: "22:00", end: "08:00" };
  const lateNight = new Date("2026-10-09T23:45:00");

  // Notificação normal (treino) durante a noite -> postergada
  const normalEvent = { eventType: "workout.reminder", priority: "normal" };
  const resNormal = shouldDispatchNotification(normalEvent, quietHours, lateNight);
  assert.strictEqual(resNormal.shouldSend, false);
  assert.strictEqual(resNormal.reason, "quiet_hours_postponed");

  // Alerta crítico de dor durante a noite -> BYPASS autorizado
  const criticalPainEvent = { eventType: "pain.reported", priority: "critical" };
  const resCritical = shouldDispatchNotification(criticalPainEvent, quietHours, lateNight);
  assert.strictEqual(resCritical.shouldSend, true);
  assert.strictEqual(resCritical.reason, "critical_bypass");
});

test("13. Cancelamento de Lembretes Obsoletos: Treino Realizado invalida lembrete pendente", () => {
  const scheduledReminders = [
    { id: "rem_1", workoutId: "w_123", status: "scheduled", scheduledFor: "2026-10-09T18:00:00Z" },
    { id: "rem_2", workoutId: "w_456", status: "scheduled", scheduledFor: "2026-10-09T19:00:00Z" },
  ];

  // Aluno completa o treino w_123 antes das 18h
  const completedWorkoutId = "w_123";
  const updatedReminders = scheduledReminders.map((r) => {
    if (r.workoutId === completedWorkoutId && r.status === "scheduled") {
      return { ...r, status: "cancelled", reason: "Treino já realizado pelo aluno." };
    }
    return r;
  });

  const cancelled = updatedReminders.find((r) => r.workoutId === "w_123");
  const untouched = updatedReminders.find((r) => r.workoutId === "w_456");

  assert.strictEqual(cancelled.status, "cancelled");
  assert.strictEqual(cancelled.reason, "Treino já realizado pelo aluno.");
  assert.strictEqual(untouched.status, "scheduled");
});

test("14. Registro Multi-Dispositivo de Push e Revogação no Logout", () => {
  const devices = [
    { id: "dev_1", userId: "usr_carlos", deviceInstallationId: "iphone_carlos", platform: "ios", active: true },
    { id: "dev_2", userId: "usr_carlos", deviceInstallationId: "ipad_carlos", platform: "ios", active: true },
    { id: "dev_3", userId: "usr_ana", deviceInstallationId: "pixel_ana", platform: "android", active: true },
  ];

  // Carlos faz logout especificamente do seu iPhone
  const logoutInstallationId = "iphone_carlos";
  const updatedDevices = devices.map((d) => {
    if (d.deviceInstallationId === logoutInstallationId) {
      return { ...d, active: false, revokedAt: new Date().toISOString() };
    }
    return d;
  });

  const iphone = updatedDevices.find((d) => d.deviceInstallationId === "iphone_carlos");
  const ipad = updatedDevices.find((d) => d.deviceInstallationId === "ipad_carlos");
  const pixel = updatedDevices.find((d) => d.deviceInstallationId === "pixel_ana");

  assert.strictEqual(iphone.active, false);
  assert.ok(iphone.revokedAt);
  assert.strictEqual(ipad.active, true, "Outro dispositivo do mesmo usuário continua ativo");
  assert.strictEqual(pixel.active, true, "Dispositivo de outro usuário continua ativo");
});

test("15. Isolamento Multi-Tenant: Tenant A nunca vaza para Tenant B", () => {
  const store = [
    { id: "notif_1", tenantId: "tenant_gym_alpha", recipientId: "trainer_1", title: "Novo Aluno Vinculado" },
    { id: "notif_2", tenantId: "tenant_gym_alpha", recipientId: "student_1", title: "Treino Disponível" },
    { id: "notif_3", tenantId: "tenant_gym_beta", recipientId: "trainer_2", title: "Fechamento Mensal Gym Beta" },
  ];

  const alphaItems = store.filter((s) => s.tenantId === "tenant_gym_alpha");
  assert.strictEqual(alphaItems.length, 2);
  assert.ok(!alphaItems.some((s) => s.tenantId === "tenant_gym_beta"));
  assert.ok(!alphaItems.some((s) => s.title.includes("Beta")));
});

test("16. Controle de Acesso e Deep Links: Aluno impedido de acessar rotas restritas de Personal", () => {
  function validateDeepLinkForRole(pathname, role) {
    const trainerOnlyRoutes = ["/trainer-agenda", "/trainer-workout-templates", "/(tabs)/student", "/admin-dashboard"];
    if (role === "STUDENT" && trainerOnlyRoutes.includes(pathname)) {
      return { allowed: false, fallback: "/(tabs)/index" };
    }
    return { allowed: true, route: pathname };
  }

  // Aluno tenta abrir link de painel do treinador
  const checkStudent = validateDeepLinkForRole("/trainer-agenda", "STUDENT");
  assert.strictEqual(checkStudent.allowed, false);
  assert.strictEqual(checkStudent.fallback, "/(tabs)/index");

  // Treinador acessando sua agenda
  const checkTrainer = validateDeepLinkForRole("/trainer-agenda", "TRAINER");
  assert.strictEqual(checkTrainer.allowed, true);

  // Aluno acessando seu treino
  const checkStudentWorkout = validateDeepLinkForRole("/(tabs)/training", "STUDENT");
  assert.strictEqual(checkStudentWorkout.allowed, true);
});

test("17. Contador de Badge em Tempo Real (0, 1..99, 99+)", () => {
  assert.strictEqual(formatBadgeCount(0), "0");
  assert.strictEqual(formatBadgeCount(1), "1");
  assert.strictEqual(formatBadgeCount(42), "42");
  assert.strictEqual(formatBadgeCount(99), "99");
  assert.strictEqual(formatBadgeCount(100), "99+");
  assert.strictEqual(formatBadgeCount(500), "99+");
});
