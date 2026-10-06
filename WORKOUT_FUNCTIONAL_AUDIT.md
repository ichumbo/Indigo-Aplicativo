# DragonCorp — Auditoria Funcional Completa: Treinos & Fichas

> **Módulo:** Treinos e Prescrições de Exercícios  
> **Plataformas:** Mobile (React Native / Expo), Web (React / Vite) e Backend (Laravel REST API / SQLite)  
> **Status Geral:** **APROVADO & SINCRONIZADO**

---

## 1. Visão Geral da Arquitetura de Treinos

O ecossistema de treinos do DragonCorp é estruturado em três camadas sincronizadas e resilientes:

1. **Backend REST API (Laravel Sanctum & SQLite):**
   - Endpoints: `/api/v1/workouts`, `/api/v1/training-plans` (alias oficial), `/api/v1/workouts/{id}/duplicate`, `/api/v1/sync/pull`, `/api/v1/sync/push`.
   - Models: `TrainingPlan`, `TrainingSession`, `TrainingSessionVersion`, `TrainingExercisePrescription`, `TrainingExecutedSet`, `AppNotification`, `AuditLog`.
   - Isolamento de Acesso: Verificação IDOR estrita em todas as operações (`$plan->trainer_id === $trainer->id` e vínculo em `trainer_students`).

2. **Painel Web do Personal Trainer (`/web/frontend`):**
   - Páginas: `WorkoutsPage.tsx` (catálogo, filtros de busca, duplicação e visualização) e `WorkoutEditorPage.tsx` (editor completo de fichas, sessões, exercícios, cargas, repetições, descanso, bi-sets e capas).
   - Comunicação: Cliente Axios com autorização Sanctum Bearer Token.

3. **Aplicativo Mobile do Personal e do Aluno (`/app`):**
   - Telas: `app/(tabs)/training.tsx` (dashboard dinâmico do treino), `app/training-details.tsx` (detalhamento da ficha), `app/exercise-performance.tsx` (evolução longitudinal de cargas).
   - Componente: `components/trainer-workout-editor.tsx`.
   - Store: `services/training-plan-store.ts` integrado via `services/api-sync-service.ts` com o backend central.

---

## 2. Ciclo de Vida do Treino: Rascunho vs. Publicado

| Estado | Visível ao Personal? | Visível ao Aluno? | Notificação Enviada? | Acesso para Execução? |
|---|---|---|---|---|
| **Rascunho (`rascunho`)** | Sim (Web e Mobile) | **Não** (Filtrado em `/sync/pull`) | **Não** | Não |
| **Ativo/Publicado (`ativo`)** | Sim | **Sim** | **Sim** (`AppNotification`) | Sim |
| **Pausado (`pausado`)** | Sim | Sim (indicador pausado) | Não | Bloqueado |
| **Vencido (`vencido`)** | Sim | Sim (alerta de prorrogação) | Sim | Conforme tolerância |
| **Arquivado (`arquivado`)** | Oculto na listagem padrão | Não | Não | Histórico preservado |

### Regra de Transição:
- Ao criar um treino como rascunho, nenhuma notificação é gerada para o aluno e o treino é omitido na sincronização do aluno (`SyncController::pull`).
- Ao atualizar o status de `rascunho` para `ativo`, o backend emite automaticamente a notificação push/in-app (`AppNotification`) com o texto: *"Seu treinador liberou o treino: [Nome]"*.

---

## 3. Campos Obrigatórios e Opcionais da Prescrição

| Campo | Nível | Tipo | Obrigatório? | Regra de Negócio |
|---|---|---|---|---|
| `studentId` | Plano | UUID / String | Sim | Deve pertencer à consultoria do personal (IDOR). |
| `name` | Plano | String (3-150 chars) | Sim | Nome descritivo da ficha (ex: "Treino A - Peito"). |
| `objective` | Plano | String (max 200) | Sim | Objetivo hipertrófico/condicionamento. |
| `validUntil` | Plano | Date (YYYY-MM-DD) | Não | Padrão: 60 a 90 dias após início. |
| `frequencyPerWeek` | Plano | Integer (1-7) | Não | Frequência semanal sugerida (padrão: 4). |
| `sessions` | Sessão | Array (min: 1) | Sim | Lista de sessões de treino (Treino A, B, C...). |
| `sessions.*.name` | Sessão | String | Sim | Identificador visual da sessão. |
| `sessions.*.exercises` | Exercício | Array (min: 1) | Sim | Pelo menos um exercício por sessão. |
| `exercises.*.name` | Exercício | String | Sim | Nome oficial ou customizado do exercício. |
| `exercises.*.muscleGroup` | Exercício | String | Sim | Grupo muscular anatômico. |
| `exercises.*.plannedSets` | Exercício | Integer (min: 1) | Sim | Número de séries prescritas. |
| `exercises.*.plannedReps` | Exercício | Integer / String | Não | Faixa de repetições (ex: 8-12 ou 10). |
| `exercises.*.plannedLoad` | Exercício | Float | Não | Carga prescrita em kg (ex: 28.5). |
| `exercises.*.loadUnit` | Exercício | Enum | Não | 'kg', 'lb', 'level', 'bodyweight', 'none'. |
| `exercises.*.restSeconds` | Exercício | Integer | Não | Descanso entre séries em segundos (padrão: 60). |
| `exercises.*.combinationId` | Exercício | String | Não | ID compartilhado para agrupamento Bi-Set/Tri-Set. |
| `exercises.*.combinationLabel`| Exercício | String | Não | Rótulo exibido (ex: "BI-SET A"). |

---

## 4. Biblioteca de Exercícios & Mídias

- Cada exercício mantém vínculo com seu identificador de catálogo (`exercise_catalog_id`), nome, grupo muscular, instruções, thumbnail e URL de vídeo demonstrativo.
- Suporte a agrupamentos avançados:
  - **Bi-Set:** dois exercícios conjugados que compartilham o mesmo `combinationId` e rótulo "BI-SET".
  - **Tri-Set / Circuito:** múltiplos exercícios executados sequencialmente sem intervalo intra-série.
  - **Unilateral:** flag indicativa para controle de cargas e repetições por lado.

---

## 5. Execução pelo Aluno e Evolução Longitudinal

1. O aluno inicia a sessão no aplicativo mobile.
2. Cada série concluída registra:
   - Carga executada (`executedLoad`);
   - Repetições reais (`executedReps`);
   - Percepção subjetiva de esforço (`effort` - escala RPE 1 a 10);
   - Relato de dor opcional (`pain`: região anatômica e nível de 1 a 10).
3. Ao finalizar, o app envia os dados via `POST /api/v1/sync/push` ou `pushMobileExecutionsToBackend`.
4. O personal trainer visualiza a evolução do aluno na Web e no Mobile em tempo real sob `/evolution/{studentId}`.
5. Fórmulas de performance longitudinal (Epley 1RM e Volume Total) utilizam os dados reais persistidos no banco SQLite.

---

## 6. Duplicação, Modelos e Arquivamento

- **Duplicação de Treino (`POST /workouts/{id}/duplicate`):**
  - Cria um novo registro com ID independente para o plano, sessões, versões e prescrições (`Str::random(10)`).
  - Nunca reaproveita IDs primários do treino anterior.
  - O treino original permanece inalterado.
- **Arquivamento (`DELETE /workouts/{id}`):**
  - Soft-archive: altera status para `arquivado`.
  - Preserva 100% do histórico de execuções passadas do aluno, garantindo conformidade com relatórios longitudinais.
