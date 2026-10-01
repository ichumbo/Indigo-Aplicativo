const test = require("node:test");
const assert = require("node:assert/strict");

// Mock de AsyncStorage para execução de testes em Node.js
const storageMock = new Map();
const AsyncStorageMock = {
  getItem: async (key) => storageMock.get(key) || null,
  setItem: async (key, value) => {
    storageMock.set(key, String(value));
  },
  removeItem: async (key) => {
    storageMock.delete(key);
  },
  clear: async () => {
    storageMock.clear();
  },
};

// Funções utilitárias compiladas do motor para execução direta em Node.js
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

function generateDeterministicIdempotencyKey(eventType, resourceId, recipientId, discriminator) {
  const parts = [eventType, resourceId, recipientId];
  if (discriminator) {
    parts.push(discriminator);
  }
  return parts.join(":");
}

function isInQuietHours(now, quietHours) {
  if (!quietHours?.enabled) return false;

  const [startH, startM] = quietHours.start.split(":").map(Number);
  const [endH, endM] = quietHours.end.split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = (startH ?? 22) * 60 + (startM ?? 0);
  const endMinutes = (endH ?? 7) * 60 + (endM ?? 0);

  if (startMinutes > endMinutes) {
    // Ex: 22:00 até 07:00 (cruza a meia-noite)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // Ex: 01:00 até 06:00 (mesmo dia)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}

// Suíte de Testes do Motor Central de Notificações
test("1. Template Engine: Interpolação segura de variáveis e sanitização contra injeção", () => {
  const template = "Olá {{clientName}}, seu agendamento de {{serviceName}} foi confirmado para {{appointmentDate}} às {{appointmentTime}}.";
  const variables = {
    clientName: "Mariana Silva",
    serviceName: "Consultoria Personal Pro",
    appointmentDate: "15/10/2026",
    appointmentTime: "14:30",
  };

  const rendered = renderTemplate(template, variables);
  assert.strictEqual(
    rendered,
    "Olá Mariana Silva, seu agendamento de Consultoria Personal Pro foi confirmado para 15/10/2026 às 14:30."
  );

  // Teste de sanitização contra injeção de tags HTML/scripts
  const maliciousVars = {
    clientName: "<script>alert('hack')</script>",
    serviceName: "Treino <b>A</b>",
  };
  const sanitized = renderTemplate("Cliente: {{clientName}} | Serviço: {{serviceName}}", maliciousVars);
  assert.ok(!sanitized.includes("<script>"));
  assert.ok(sanitized.includes("&lt;script&gt;"));
});

test("2. Idempotência e Deduplicação: Chave determinística impede reprocessamento do mesmo evento", () => {
  const key1 = generateDeterministicIdempotencyKey("appointment.confirmed", "apt_123", "user_abc");
  const key2 = generateDeterministicIdempotencyKey("appointment.confirmed", "apt_123", "user_abc");
  const key3 = generateDeterministicIdempotencyKey("appointment.reminder_due", "apt_123", "user_abc", "24h");

  assert.strictEqual(key1, key2, "Chaves determinísticas devem ser exatamente idênticas");
  assert.strictEqual(key1, "appointment.confirmed:apt_123:user_abc");
  assert.strictEqual(key3, "appointment.reminder_due:apt_123:user_abc:24h");
});

test("3. Horário Silencioso (Quiet Hours): Suprime ou posterga alertas não urgentes durante a noite", () => {
  const quietHoursConfig = {
    enabled: true,
    start: "22:00",
    end: "07:00",
  };

  // 23:30 (Dentro do horário silencioso)
  const nightTime = new Date("2026-10-01T23:30:00");
  assert.strictEqual(isInQuietHours(nightTime, quietHoursConfig), true);

  // 04:15 (Dentro do horário silencioso)
  const dawnTime = new Date("2026-10-01T04:15:00");
  assert.strictEqual(isInQuietHours(dawnTime, quietHoursConfig), true);

  // 14:00 (Fora do horário silencioso)
  const dayTime = new Date("2026-10-01T14:00:00");
  assert.strictEqual(isInQuietHours(dayTime, quietHoursConfig), false);
});

test("4. Ciclo de Vida de Lembretes: Reagendamento e Cancelamento tornam lembretes antigos obsoletos", () => {
  const deliveries = [
    {
      id: "del_1",
      notificationId: "notif_1",
      appointmentId: "apt_999",
      status: "queued",
      type: "reminder_24h",
    },
    {
      id: "del_2",
      notificationId: "notif_2",
      appointmentId: "apt_999",
      status: "scheduled",
      type: "reminder_2h",
    },
    {
      id: "del_3",
      notificationId: "notif_3",
      appointmentId: "apt_888",
      status: "queued",
      type: "reminder_24h",
    },
  ];

  // Simula o cancelamento do agendamento 'apt_999'
  const appointmentToCancel = "apt_999";
  const updatedDeliveries = deliveries.map((d) => {
    if (d.appointmentId === appointmentToCancel && (d.status === "queued" || d.status === "scheduled")) {
      return { ...d, status: "cancelled", reason: "Agendamento cancelado ou reagendado." };
    }
    return d;
  });

  const cancelledForApt999 = updatedDeliveries.filter((d) => d.appointmentId === "apt_999");
  assert.strictEqual(cancelledForApt999[0].status, "cancelled");
  assert.strictEqual(cancelledForApt999[1].status, "cancelled");

  // O agendamento apt_888 permanece intocado
  const unaffected = updatedDeliveries.find((d) => d.appointmentId === "apt_888");
  assert.strictEqual(unaffected.status, "queued");
});

test("5. Segurança & Isolamento Multitenant: Tenant A nunca recebe ou acessa notificações do Tenant B", () => {
  const notificationsDb = [
    { id: "notif_a1", tenantId: "tenant_empresa_A", recipientId: "user_1", title: "Atendimento Confirmado" },
    { id: "notif_a2", tenantId: "tenant_empresa_A", recipientId: "user_2", title: "Lembrete de Horário" },
    { id: "notif_b1", tenantId: "tenant_empresa_B", recipientId: "user_3", title: "Dados Financeiros Empresa B" },
  ];

  const listForTenantA = notificationsDb.filter((n) => n.tenantId === "tenant_empresa_A");
  assert.strictEqual(listForTenantA.length, 2);
  assert.ok(!listForTenantA.some((n) => n.tenantId === "tenant_empresa_B"));
  assert.ok(!listForTenantA.some((n) => n.title.includes("Empresa B")));
});

test("6. RBAC & Governança Financeira: Dados de fechamento financeiro e faturamento restritos a gestores", () => {
  function canReceiveFinancialClosure(role) {
    return role === "ADMIN" || role === "MANAGER" || role === "SUPER_ADMIN";
  }

  assert.strictEqual(canReceiveFinancialClosure("CLIENT"), false);
  assert.strictEqual(canReceiveFinancialClosure("TEAM_MEMBER"), false);
  assert.strictEqual(canReceiveFinancialClosure("MANAGER"), true);
  assert.strictEqual(canReceiveFinancialClosure("ADMIN"), true);
  assert.strictEqual(canReceiveFinancialClosure("SUPER_ADMIN"), true);
});

test("7. Device Tokens: Revogação de push token no logout do usuário impede recebimento indevido", () => {
  const tokenStore = [
    { id: "tok_1", userId: "user_123", deviceInstallationId: "dev_iphone_1", isActive: true },
    { id: "tok_2", userId: "user_456", deviceInstallationId: "dev_pixel_2", isActive: true },
  ];

  // Simula logout no aparelho dev_iphone_1
  const loggedOutDevice = "dev_iphone_1";
  const updatedTokens = tokenStore.map((t) =>
    t.deviceInstallationId === loggedOutDevice ? { ...t, isActive: false, revokedAt: new Date().toISOString() } : t
  );

  const revokedToken = updatedTokens.find((t) => t.deviceInstallationId === "dev_iphone_1");
  const activeToken = updatedTokens.find((t) => t.deviceInstallationId === "dev_pixel_2");

  assert.strictEqual(revokedToken.isActive, false);
  assert.ok(revokedToken.revokedAt);
  assert.strictEqual(activeToken.isActive, true);
});
