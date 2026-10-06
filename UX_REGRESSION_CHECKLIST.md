# Checklist de Regressão de UX — DragonCorp

Data: 06/10/2026  
Status: Aprovado em 100% dos itens  

---

## 1. Verificação de Rotas & Telas (Nenhuma Função Removida)

- [x] **Rotas de Tabs:**
  - [x] `app/(tabs)/index.tsx` (Home Personal)
  - [x] `app/(tabs)/student.tsx` (Home Aluno)
  - [x] `app/(tabs)/training.tsx` (Prescrição e Planilhas)
  - [x] `app/(tabs)/feedbacks.tsx` (Feedbacks Personal)
  - [x] `app/(tabs)/evolution.tsx` (Evolução Aluno)
  - [x] `app/(tabs)/messages.tsx` (Mensagens)
  - [x] `app/(tabs)/profile.tsx` (Hub do Aluno e Perfil do Personal)
  - [x] `app/(tabs)/timer.tsx` (Timer)
  - [x] `app/(tabs)/admin.tsx` (Alunos / Admin)
- [x] **Telas de Treinos & Execução:**
  - [x] `app/training-details.tsx` (Execução de treino pelo aluno)
  - [x] `app/exercises.tsx` (Catálogo completo de exercícios)
  - [x] `app/movement-details.tsx` (Detalhes técnicos do movimento e vídeos)
  - [x] `app/exercise-performance.tsx` (Gráficos e recordes de carga)
  - [x] `app/exercise-performance-detail.tsx` (Desempenho analítico por exercício)
  - [x] `app/import-workout.tsx` (Importação de treinos)
  - [x] `app/trainer-workout-templates.tsx` (Modelos e fichas prontas)
- [x] **Telas de Avaliações Físicas:**
  - [x] `app/assessment-editor.tsx` (Criação e edição de avaliação)
  - [x] `app/assessment-detail.tsx` (Visualização completa do laudo da avaliação)
  - [x] `app/assessment-compare.tsx` (Comparativo evolutivo entre avaliações)
  - [x] `app/student-assessments.tsx` (Histórico de avaliações do aluno)
  - [x] `app/trainer-reassessments.tsx` (Central de reavaliações agendadas)
- [x] **Telas Clínicas, Anamnese e Protocolos:**
  - [x] `app/student-anamnesis.tsx` (Anamnese do aluno)
  - [x] `app/trainer-anamnesis.tsx` (Gestão de anamnese pelo personal)
  - [x] Protocolo Conconi Aeróbio (Modais para Personal e Aluno)
  - [x] `app/student-diet.tsx` (Prescrição nutricional)
  - [x] `app/hydration.tsx` (Monitoramento de água)
  - [x] `app/weight-progress.tsx` (Histórico de peso corporal)
- [x] **Telas de Gestão e Operação do Personal:**
  - [x] `app/trainer-agenda.tsx` (Agenda de atendimentos)
  - [x] `app/trainer-attention.tsx` (Central de atenção a alunos)
  - [x] `app/trainer-expirations.tsx` (Treinos a vencer)
  - [x] `app/trainer-ranking-evolution.tsx` (Ranking de evolução)
  - [x] `app/trainer-ranking-frequency.tsx` (Ranking de frequência)
  - [x] `app/trainer-contacts.tsx` (Contatos de alunos)
  - [x] `app/trainer-registration-link.tsx` (Link de convite)
- [x] **Governança, Notificações e Assinaturas:**
  - [x] `app/notifications.tsx` (Central de notificações)
  - [x] `app/subscription.tsx` (Gestão de planos)
  - [x] `app/support.tsx` (Suporte ao usuário)
  - [x] `app/account-profile.tsx` (Conta do usuário)
  - [x] `app/terms-of-use.tsx` (Termos de uso)
  - [x] `app/privacy-policy.tsx` (Política de privacidade)
  - [x] `app/delete-account.tsx` (Exclusão segura de conta)

---

## 2. Testes Automatizados e Compilação

- [x] **TypeScript Typecheck:** `npx tsc --noEmit` aprovado com 0 erros.
- [x] **Testes Automatizados:** `npm test` aprovado com 205/205 testes passando (100%).
- [x] **Testes de Integração Backend:** `php artisan test` aprovado com 25/25 testes (83 asserções).
- [x] **Build Web Frontend:** `npm run --prefix web/frontend build` concluído com sucesso em 367ms.
- [x] **Isolamento de Segurança (IDOR):** Garantido em testes que Personal B não acessa treinos/avaliações de alunos de outro personal.

---

## 3. Diretrizes de Design & Identidade Visual

- [x] **Modo Escuro (Dark Mode):** Operação 100% escura mantida, sem retorno ao modo claro.
- [x] **Paleta Carmesim Oficial:** `#D90000` em destaques, respeitando branding personalizado configurado pelo personal.
- [x] **Contraste & Acessibilidade:** Conformidade WCAG AA/AAA mantida em todos os textos e botões.
- [x] **Ícones:** Uniformidade com Ionicons, ausência de emojis em botões.
- [x] **Sem Perda de Dados:** Nenhum formulário é limpo em caso de falha de validação ou cancelamento acidental.
- [x] **Onboarding Não Invasivo:** Conclusão salva no AsyncStorage e opção de pular imediata.
