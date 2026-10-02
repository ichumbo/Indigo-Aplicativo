# 📚 DragonCorp — Documentação & Guias Técnicos

Bem-vindo à central de documentação e engenharia do ecossistema **DragonCorp Fitness & Personal Platform**.

---

## 📁 Estrutura de Documentos

```
docs/
├── architecture/   # Arquitetura de software, especificações técnicas e IAP
├── release/        # Checklists de publicação nas lojas, conformidade e governança
└── reports/        # Relatórios executivos de testes, benchmarks de carga e cobertura
```

---

## 📊 1. Relatórios Executivos & Auditorias (`docs/reports/`)

Relatórios automáticos gerados a partir da suíte de testes de validação contínua e benchmarks de carga:

- 🛡️ [Relatório de Cobertura Global do Sistema](./reports/RELATORIO_COBERTURA_SISTEMA_COMPLETO.md) — Auditoria de cobertura de testes unitários e de integração de 100% dos serviços de domínio.
- 🏗️ [Relatório de Estrutura Integrada por Unidade](./reports/RELATORIO_ESTRUTURA_INTEGRADA_UNIDADES.md) — Validação estrutural de módulos, invariantes de domínio e isolamento de estado.
- 🚀 [Relatório de Teste de Carga por Rota](./reports/RELATORIO_TESTE_DE_CARGA_ROTAS.md) — Benchmark de latência (p95 < 15ms), vazão e resiliência com concorrência massiva.
- 📱 [Auditoria de Responsividade Multi-Dispositivos](./reports/RESPONSIVE_AUDIT.md) — Verificação visual em smartphones compactos, padrão e tablets.
- 🧪 [Guia de Execução de Testes de Responsividade](./reports/README_RESPONSIVE_TESTS.md) — Procedimentos para validação de safe areas e layouts dinâmicos.

---

## 🚀 2. Publicação, Release & Compliance (`docs/release/`)

Documentos mandatórios para conformidade regulatória, submissão na **Apple App Store** e **Google Play Store**:

- 📝 [Notas de Versão v1.0.0](./release/RELEASE_NOTES_1.0.0.md) — Changelog e recursos da versão inicial de lançamento.
- 🚦 [Checklist de Prontidão para Release (Release Readiness)](./release/RELEASE_READINESS_V1.md) — Critérios de homologação e aprovação para produção.
- 🏪 [Checklist de Submissão para as Lojas](./release/STORE_SUBMISSION_CHECKLIST.md) — Metadados, capturas de tela, categorias e requisitos das lojas.
- 🔐 [Kit de Acesso para Revisores da Apple & Google](./release/REVIEWER_ACCESS_KIT.md) — Credenciais de demonstração e instruções para aprovação célere.
- 🛡️ [Checklist de Segurança para Release](./release/SECURITY_RELEASE_CHECKLIST.md) — Auditoria de OWASP Mobile, criptografia local e sanitização de dados.
- 🔒 [Mapeamento de Privacidade de Dados](./release/PRIVACY_DATA_MAP.md) — Declarações para Apple Privacy Labels e Google Data Safety.
- 🧪 [Matriz de Testes de Homologação v1.0](./release/TEST_MATRIX_V1.md) — Cobertura de cenários funcionais e de borda.
- 💡 [Decisões de Produto Pré-Publicação](./release/DECISOES_PRODUTO_PRE_PUBLICACAO.md) — Registro de diretrizes e decisões de design de produto.
- 🔄 [Plano de Rollback de Emergência](./release/ROLLBACK_PLAN.md) — Procedimentos imediatos para reversão controlada de versão.
- 🛠️ [Playbook de Infraestrutura para Rollout e Rollback](./release/ROLLOUT_ROLLBACK_INFRA_PLAYBOOK.md) — Guia de operações e deploy seguro.

---

## 🏛️ 3. Arquitetura do Sistema & Integrações (`docs/architecture/`)

Especificações detalhadas dos motores e subsistemas:

- 💳 [Arquitetura de Assinaturas & IAP (StoreKit & Google Play)](./architecture/IAP_AND_SUBSCRIPTIONS.md) — Modelo Freemium, verificação de recibos e sincronização cross-platform.
- 🔔 [Arquitetura do Motor de Notificações por Eventos](./architecture/NOTIFICATION_ARCHITECTURE.md) — Sistema desacoplado com transactional outbox e multitenancy.
- 📋 [Catálogo de Eventos de Notificação](./architecture/NOTIFICATION_EVENT_CATALOG.md) — Dicionário de eventos (treinos, hidratação, faturamento, sistema).
- ⚙️ [Configuração de Provedores de Push](./architecture/NOTIFICATION_PROVIDER_SETUP.md) — Setup para Apple APNs, Firebase Cloud Messaging e Expo Push.
- 📖 [Runbook Operacional do Sistema de Notificações](./architecture/NOTIFICATION_RUNBOOK.md) — Diagnóstico de entrega, reprocessamento de dead letters e métricas.
- 🧪 [Matriz de Testes do Motor de Notificações](./architecture/NOTIFICATION_TEST_MATRIX.md) — Casos de teste de deduplicação, horários silenciosos e idempotência.
- 📐 [Especificação de Design Responsivo](./architecture/RESPONSIVE_SPEC.md) — Breakpoints, tokens semânticos e regras de layout adaptativo.
