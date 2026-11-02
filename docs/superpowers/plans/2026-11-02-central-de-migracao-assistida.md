# Plano de Implementação — Central de Migração Assistida (DragonCorp)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar no DragonCorp a Central de Migração Assistida com área temporária de staging, upload seguro em camadas (CSV/XLSX/PDFs/ZIP), normalização canônica, motor de reconciliação de homônimos e duplicidades, geração de templates, inserção transacional controlada (alunos com convite pendente e treinos em rascunho), relatório com evidências e rollback reversível por ID.

**Architecture:** O sistema adota a arquitetura de Motor Canônico em Camadas com Staging Dedicado. Os arquivos são isolados em disco privado (`storage/app/private/migrations/`), processados em tabelas de quarentena (`migration_batches`, `migration_items`), mapeados visualmente pelo personal na interface web e confirmados com proteção de limite de assinatura, gravando na base definitiva com chave de reversão (`destination_id`) e arquivos legados em `legacy_imported_files`.

**Tech Stack:** Laravel 11 / PHP 8.3+, React 19, TypeScript, Vite, CSS Tokens DragonCorp (#0D0D0E, #D90000), PHPUnit, Node.js test runner.

**Spec:** `docs/superpowers/specs/2026-11-02-central-de-migracao-assistida-design.md`

## Global Constraints
- NUNCA gravar arquivos importados diretamente nas tabelas finais sem passar por staging e confirmação.
- NUNCA mesclar homônimos automaticamente; a correspondência por nome isolado exige confirmação ou cria novo aluno.
- Alunos importados entram inicialmente com convite pendente (`user_id = null`); zero senhas provisórias geradas.
- Treinos importados entram exclusivamente como rascunho (`status = 'rascunho'`, versão `status = 'draft'`).
- Avaliações físicas históricas preservam os resultados informados na plataforma de origem sem recálculo silencioso.
- Nenhum dado de outro personal pode ser acessado (validação estrita de `trainer_id`).
- Respeitar limites do plano Freemium (máximo 1 aluno ativo se não for PRO).

## Review Focus
1. Arquivo CSV com delimitador inesperado (ponto e vírgula vs vírgula) ou encoding ISO-8859-1 / UTF-8 com BOM: parser deve detectar e normalizar sem corromper caracteres acentuados.
2. Homônimo perfeito com telefone ou e-mail divergente: sistema não deve vincular ao cadastro existente por padrão.
3. Tentativa de importação em lote que excede o limite do plano Freemium: bloqueio antes de gravar qualquer registro definitivo, retornando erro amigável.
4. Rollback do lote: deve apagar apenas os registros criados pelo lote (`destination_id`), sem afetar alunos já existentes antes da migração ou criados por outros lotes.
5. Tentativa de acesso de um personal ao lote de outro: deve retornar HTTP 403 Forbidden com log de auditoria.

---

### Task 1: Migrações de Banco de Dados de Staging e Arquivos Legados

**Files:**
- Create: `web/backend/database/migrations/2026_11_02_160000_create_migration_tables.php`
- Test: `web/backend/tests/Feature/MigrationDatabaseSchemaTest.php`

- [ ] **Step 1: Criar teste de schema para as tabelas de migração**
Escrever teste validando a existência das tabelas `migration_batches`, `migration_items` e `legacy_imported_files` com seus respectivos campos e chaves.

- [ ] **Step 2: Executar teste para verificar falha**
Run: `cd web/backend && php artisan test --filter=MigrationDatabaseSchemaTest`
Expected: FAIL informando que as tabelas não existem.

- [ ] **Step 3: Criar a migration `2026_11_02_160000_create_migration_tables.php`**
Implementar o esquema completo de `migration_batches`, `migration_items` e `legacy_imported_files` com índices e chaves estrangeiras.

- [ ] **Step 4: Executar migrate e verificar que o teste passa**
Run: `cd web/backend && php artisan migrate && php artisan test --filter=MigrationDatabaseSchemaTest`
Expected: PASS com 100% de sucesso.

- [ ] **Step 5: Commit**
`git add web/backend/database/migrations/2026_11_02_160000_create_migration_tables.php web/backend/tests/Feature/MigrationDatabaseSchemaTest.php && git commit -m "feat(migration): add database schema for migration staging and legacy files"`

---

### Task 2: Modelos Eloquent e Relacionamentos

**Files:**
- Create: `web/backend/app/Models/MigrationBatch.php`
- Create: `web/backend/app/Models/MigrationItem.php`
- Create: `web/backend/app/Models/LegacyImportedFile.php`
- Modify: `web/backend/app/Models/User.php`
- Modify: `web/backend/app/Models/StudentProfile.php`
- Test: `web/backend/tests/Unit/MigrationModelsTest.php`

- [ ] **Step 1: Criar teste unitário dos modelos**
Validar casts, relacionamentos `hasMany`, `belongsTo` e métodos auxiliares (`isAwaitingReview()`, `canRollback()`).

- [ ] **Step 2: Executar teste e verificar falha**
Run: `cd web/backend && php artisan test --filter=MigrationModelsTest`
Expected: FAIL por falta das classes.

- [ ] **Step 3: Implementar `MigrationBatch`, `MigrationItem` e `LegacyImportedFile`**
Definir fillables, casts (`json`, `array`, `datetime`), constantes de status e relacionamentos com `User` e `StudentProfile`.

- [ ] **Step 4: Executar teste e verificar aprovação**
Run: `cd web/backend && php artisan test --filter=MigrationModelsTest`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add web/backend/app/Models/Migration*.php web/backend/app/Models/LegacyImportedFile.php web/backend/app/Models/User.php web/backend/app/Models/StudentProfile.php web/backend/tests/Unit/MigrationModelsTest.php && git commit -m "feat(migration): implement Eloquent models and relationships"`

---

### Task 3: Gerador de Planilhas Modelo e Guia de Exportação Legal

**Files:**
- Create: `web/backend/app/Services/Migration/TemplateGeneratorService.php`
- Test: `web/backend/tests/Unit/TemplateGeneratorServiceTest.php`

- [ ] **Step 1: Criar teste unitário do gerador de templates**
Testar a geração dos modelos de alunos, treinos e avaliações em formato CSV/XLSX com cabeçalhos canônicos e linhas de exemplo realistas.

- [ ] **Step 2: Executar teste e verificar falha**
Run: `cd web/backend && php artisan test --filter=TemplateGeneratorServiceTest`
Expected: FAIL.

- [ ] **Step 3: Implementar `TemplateGeneratorService`**
Criar métodos `generateStudentTemplate()`, `generateWorkoutTemplate()`, `generateAssessmentTemplate()` com colunas amigáveis, instruções de preenchimento e dados fictícios de exemplo.

- [ ] **Step 4: Executar teste e verificar aprovação**
Run: `cd web/backend && php artisan test --filter=TemplateGeneratorServiceTest`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add web/backend/app/Services/Migration/TemplateGeneratorService.php web/backend/tests/Unit/TemplateGeneratorServiceTest.php && git commit -m "feat(migration): add template generator service for spreadsheets"`

---

### Task 4: Serviço de Importação em Camadas e Normalização Canônica

**Files:**
- Create: `web/backend/app/Services/Migration/SpreadsheetParserService.php`
- Create: `web/backend/app/Services/Migration/CanonicalNormalizerService.php`
- Test: `web/backend/tests/Unit/SpreadsheetParserServiceTest.php`

- [ ] **Step 1: Criar testes com múltiplos formatos de entrada**
Testar CSV delimitado por vírgula, ponto e vírgula, com e sem BOM, datas em formato `DD/MM/YYYY` e `YYYY-MM-DD`, números com vírgula e ponto decimal.

- [ ] **Step 2: Executar teste e verificar falha**
Run: `cd web/backend && php artisan test --filter=SpreadsheetParserServiceTest`
Expected: FAIL.

- [ ] **Step 3: Implementar `SpreadsheetParserService` e `CanonicalNormalizerService`**
Parser robusto com detecção automática de encoding/delimitador e conversão para o modelo canônico intermediário do DragonCorp.

- [ ] **Step 4: Executar teste e verificar aprovação**
Run: `cd web/backend && php artisan test --filter=SpreadsheetParserServiceTest`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add web/backend/app/Services/Migration/*Parser*.php web/backend/app/Services/Migration/CanonicalNormalizerService.php web/backend/tests/Unit/SpreadsheetParserServiceTest.php && git commit -m "feat(migration): create spreadsheet parser and canonical normalizer"`

---

### Task 5: Motor de Reconciliação, Duplicidades e Exercícios

**Files:**
- Create: `web/backend/app/Services/Migration/DuplicateReconciliationService.php`
- Create: `web/backend/app/Services/Migration/ExerciseMatcherService.php`
- Test: `web/backend/tests/Unit/DuplicateReconciliationServiceTest.php`

- [ ] **Step 1: Escrever testes cobrindo homônimos, e-mails coincidentes e aliases de exercícios**
Garantir que homônimos com dados divergentes NÃO sejam mesclados e que "supino reto barra" localize "Supino Reto".

- [ ] **Step 2: Executar teste e verificar falha**
Run: `cd web/backend && php artisan test --filter=DuplicateReconciliationServiceTest`
Expected: FAIL.

- [ ] **Step 3: Implementar `DuplicateReconciliationService` e `ExerciseMatcherService`**
Cálculo de confiança de matching (0-100%), atribuição de `match_status` e sugestão de ações sem junção forçada.

- [ ] **Step 4: Executar teste e verificar aprovação**
Run: `cd web/backend && php artisan test --filter=DuplicateReconciliationServiceTest`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add web/backend/app/Services/Migration/DuplicateReconciliationService.php web/backend/app/Services/Migration/ExerciseMatcherService.php web/backend/tests/Unit/DuplicateReconciliationServiceTest.php && git commit -m "feat(migration): implement duplicate reconciliation and exercise matcher"`

---

### Task 6: Controller da API REST de Migração e Rotas

**Files:**
- Create: `web/backend/app/Http/Controllers/Api/V1/MigrationController.php`
- Create: `web/backend/app/Http/Controllers/Api/V1/LegacyFileController.php`
- Modify: `web/backend/routes/api.php`
- Test: `web/backend/tests/Feature/MigrationApiTest.php`

- [ ] **Step 1: Criar testes de Feature para a API**
Validar autenticação, isolamento IDOR (personal A não vê lote do personal B), upload de arquivo, mapeamento, prévia e trava de limite do plano Free.

- [ ] **Step 2: Executar teste e verificar falha**
Run: `cd web/backend && php artisan test --filter=MigrationApiTest`
Expected: FAIL (rotas não encontradas).

- [ ] **Step 3: Implementar `MigrationController`, `LegacyFileController` e registrar rotas**
Endpoints completos com validação de payload, sanitização de logs e respostas JSON padronizadas.

- [ ] **Step 4: Executar teste e verificar aprovação**
Run: `cd web/backend && php artisan test --filter=MigrationApiTest`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add web/backend/app/Http/Controllers/Api/V1/MigrationController.php web/backend/app/Http/Controllers/Api/V1/LegacyFileController.php web/backend/routes/api.php web/backend/tests/Feature/MigrationApiTest.php && git commit -m "feat(migration): add REST controllers and routes for migration"`

---

### Task 7: Execução Transacional em Background e Rollback Seguro

**Files:**
- Create: `web/backend/app/Services/Migration/MigrationExecutorService.php`
- Create: `web/backend/app/Jobs/ProcessMigrationBatchJob.php`
- Test: `web/backend/tests/Feature/MigrationExecutionAndRollbackTest.php`

- [ ] **Step 1: Criar teste de execução e rollback**
Importar lote de alunos e treinos em rascunho -> verificar criação -> executar rollback -> confirmar exclusão limpa apenas dos dados importados e preservação de auditoria.

- [ ] **Step 2: Executar teste e verificar falha**
Run: `cd web/backend && php artisan test --filter=MigrationExecutionAndRollbackTest`
Expected: FAIL.

- [ ] **Step 3: Implementar `MigrationExecutorService` e `ProcessMigrationBatchJob`**
Inserção transacional com `destination_id`, criação com convite pendente, treinos em rascunho e método `rollback()` atômico.

- [ ] **Step 4: Executar teste e verificar aprovação**
Run: `cd web/backend && php artisan test --filter=MigrationExecutionAndRollbackTest`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add web/backend/app/Services/Migration/MigrationExecutorService.php web/backend/app/Jobs/ProcessMigrationBatchJob.php web/backend/tests/Feature/MigrationExecutionAndRollbackTest.php && git commit -m "feat(migration): implement transactional executor and atomic rollback"`

---

### Task 8: Frontend Web — Tipos e Cliente de API de Migração

**Files:**
- Modify: `web/frontend/src/types/index.ts`
- Create: `web/frontend/src/api/migrationApi.ts`

- [ ] **Step 1: Adicionar interfaces TypeScript para migração**
`MigrationBatch`, `MigrationItem`, `ColumnMapping`, `ConflictResolution`, `LegacyImportedFile`.

- [ ] **Step 2: Implementar funções do cliente `migrationApi`**
Chamadas Axios com tipagem forte e tratamento de erros amigável.

- [ ] **Step 3: Testar compilação do TypeScript**
Run: `cd web/frontend && npm run build`
Expected: PASS sem erros de tipo.

- [ ] **Step 4: Commit**
`git add web/frontend/src/types/index.ts web/frontend/src/api/migrationApi.ts && git commit -m "feat(migration-web): add migration typescript definitions and API client"`

---

### Task 9: Frontend Web — Central de Migração (Hub de Lotes e Templates)

**Files:**
- Create: `web/frontend/src/pages/MigrationPage.tsx`
- Modify: `web/frontend/src/components/layout/Sidebar.tsx`
- Modify: `web/frontend/src/App.tsx`

- [ ] **Step 1: Criar página `MigrationPage.tsx`**
Listagem de lotes em andamento, aguardando revisão, concluídos e desfeitos; estatísticas; download direto de planilhas modelo; atalho para Nova Migração e Pedido de Suporte.

- [ ] **Step 2: Integrar no menu lateral e rotas**
Adicionar item "Importar Alunos / Treinos" no Sidebar e registrar rota `/migracao` em `App.tsx`.

- [ ] **Step 3: Testar build do frontend**
Run: `cd web/frontend && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**
`git add web/frontend/src/pages/MigrationPage.tsx web/frontend/src/components/layout/Sidebar.tsx web/frontend/src/App.tsx && git commit -m "feat(migration-web): add MigrationHub page, sidebar nav item and route"`

---

### Task 10: Frontend Web — Assistente de Migração Passo a Passo (Wizard)

**Files:**
- Create: `web/frontend/src/components/migration/MigrationWizardModal.tsx`
- Create: `web/frontend/src/components/migration/ColumnMappingStep.tsx`
- Create: `web/frontend/src/components/migration/DuplicateResolverStep.tsx`
- Create: `web/frontend/src/components/migration/MigrationPreviewStep.tsx`
- Create: `web/frontend/src/components/migration/MigrationReportModal.tsx`

- [ ] **Step 1: Implementar o wizard modular de migração**
Etapas integradas: Seleção de Origem $\rightarrow$ Envio com Drag & Drop e progresso $\rightarrow$ Mapeamento visual de colunas $\rightarrow$ Resolução assistida de homônimos e duplicidades $\rightarrow$ Prévia detalhada $\rightarrow$ Execução com barra real $\rightarrow$ Relatório com botões de convite e opção de rollback.

- [ ] **Step 2: Validar responsividade e design system**
Fundos escuros sólidos (#0D0D0E, #141416), cor de destaque do personal (#D90000), sem gradientes artificiais, adaptável para mobile, tablet e desktop.

- [ ] **Step 3: Testar build do frontend**
Run: `cd web/frontend && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**
`git add web/frontend/src/components/migration/* && git commit -m "feat(migration-web): implement step-by-step migration wizard and report modal"`

---

### Task 11: Frontend Web — Aba de Arquivos Legados no Aluno e Acesso na Lista de Alunos

**Files:**
- Modify: `web/frontend/src/pages/StudentDetailPage.tsx`
- Modify: `web/frontend/src/pages/StudentsPage.tsx`
- Create: `web/frontend/src/components/students/StudentLegacyFilesTab.tsx`

- [ ] **Step 1: Adicionar botão de ação rápida "Importar Alunos" em `StudentsPage.tsx`**
Abre diretamente a Central ou dispara o wizard.

- [ ] **Step 2: Implementar aba `Arquivos Importados` em `StudentDetailPage.tsx`**
Permite ao personal consultar todas as fichas, avaliações em PDF e fotos originais importadas ou fazer upload avulso de documentos históricos.

- [ ] **Step 3: Testar build do frontend**
Run: `cd web/frontend && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**
`git add web/frontend/src/pages/StudentDetailPage.tsx web/frontend/src/pages/StudentsPage.tsx web/frontend/src/components/students/StudentLegacyFilesTab.tsx && git commit -m "feat(migration-web): add legacy files tab to student details and quick action in students list"`

---

### Task 12: Suíte de Testes Automatizados e Certificação de Conclusão

**Files:**
- Create: `web/backend/tests/Feature/FullMigrationE2ETest.php`
- Modify: `tests/migration-central.test.js`

- [ ] **Step 1: Criar teste de integração e fluxo ponta a ponta**
Testar: Upload de planilha de alunos e treinos $\rightarrow$ detecção de duplicidades $\rightarrow$ confirmação $\rightarrow$ validação de registros criados em rascunho $\rightarrow$ rollback completo com verificação de integridade.

- [ ] **Step 2: Executar todos os testes do backend**
Run: `cd web/backend && php artisan test`
Expected: 100% PASS.

- [ ] **Step 3: Executar build e lint do frontend**
Run: `cd web/frontend && npm run build`
Expected: 100% PASS.

- [ ] **Step 4: Executar suíte completa do repositório**
Run: `npm test`
Expected: 100% PASS (todos os testes originais + novos testes).

- [ ] **Step 5: Commit final e entrega do relatório**
`git add . && git commit -m "feat(migration): complete Assisted Migration Central with tests and certifications"`
