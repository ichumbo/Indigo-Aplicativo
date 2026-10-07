# 🏋️ Especificação Técnica & Design Arquitetural: Modo Treino DragonCorp

**Data:** 06/10/2026  
**Status:** Proposta Aprovada (Abordagem 1: Foco Máximo com Gaveta de Suporte)  
**Autor:** Engenheiro de Software Sênior & Arquiteto de Produto  
**Alvo:** Aplicativo DragonCorp (React Native / Expo / TypeScript / Laravel Sync)

---

## 1. Visão Geral e Princípios Fundamentais

O **Modo Treino** tem como objetivo transformar a experiência de execução de treino do aluno em uma interface focada, fluida, segura e operável com apenas uma mão durante o exercício físico. O aluno não precisará alternar entre múltiplas telas para visualizar vídeos de execução, instruções técnicas, observações do personal ou cargas anteriores.

### Regras Inegociáveis & Invariantes de Produto:
1. **Preservação Integral de Funcionalidades:** Nenhuma rota, store, histórico ou funcionalidade existente será removida ou danificada.
2. **Separação Rígida entre Prescrito e Realizado:** Dados executados nunca sobrescrevem ou alteram silenciosamente a prescrição do treinador.
3. **Resiliência a Falhas & Offline First:** Toda ação (preenchimento, conclusão de série, cronômetro) é persistida imediatamente em armazenamento local seguro (`AsyncStorage`). A falta temporária de internet nunca interrompe ou bloqueia a sessão.
4. **Idempotência Absoluta:** Toques múltiplos no botão de iniciar, concluir série ou finalizar sessão não duplicam execuções, séries ou notificações.
5. **Autonomia do Aluno & Segurança Médica:** Relatos de dor alimentam a Fila Inteligente de Atenção do Personal sem tentar realizar diagnósticos automatizados ou cancelar o treino de forma arbitrária.
6. **Aderência Visual DragonCorp:** Dark mode sólido, tipografia oficial, uso dinâmico da cor do personal (`brandColor`) com fallback para o vermelho DragonCorp (`#D90000`), zero gradientes.

---

## 2. Máquina de Estados da Sessão (`WorkoutStateMachine`)

A sessão de treino segue uma máquina de estados finita explícita e determinística:

```
[not_started]
      │
      ▼ (iniciar_treino / validar_autenticacao)
[pre_checkin] (quando check-in de prontidão estiver ativo)
      │
      ▼ (checkin_concluido / start_direto)
[starting] (bloqueio atômico com Mutex)
      │
      ▼
[in_progress] ◄──────────────────────────────────┐
      │                                          │ (retomar_sessao)
      ├──► [paused] (app em segundo plano /      │
      │              saída temporária voluntária)─┘
      │
      ├──► [sync_pending] (séries enfileiradas para sync em background)
      │
      ├──► [completing] (trava de finalização em andamento)
      │         │
      │         ▼
      │    [completed] ──► [feedback_pos_treino]
      │
      ├──► [abandoned] (saída prematura com confirmação dupla e motivo)
      │
      └──► [cancelled] (anulação administrativa ou erro crítico de inicialização)
```

### Regras das Transições:
- Transições de estado são gravadas atomicamente no registro local.
- Uma sessão em `completed`, `abandoned` ou `cancelled` é terminal e não pode voltar para `in_progress`.
- O fechamento abrupto do aplicativo (kill pelo SO, bateria acabando) transiciona implicitamente para `paused` no momento do cold start subsequente, permitindo retomada imediata de onde o aluno parou.

---

## 3. Versionamento & Imutabilidade da Execução

Ao iniciar a sessão:
1. O sistema vincula a execução à versão ativa da sessão (`session.activeVersionId`).
2. Cria-se um `snapshot` imutável (`TrainingSessionVersion`) dentro de `TrainingExecution`.
3. **Edição concorrente pelo Personal:** Se o treinador editar a ficha ou adicionar exercícios na Web enquanto o aluno treina no Mobile:
   - A sessão ativa **continua operando estritamente sobre o `snapshot` congelado**.
   - O aplicativo exibe um banner informativo sutil: *"Seu treinador atualizou sua ficha de treino. As novas alterações estarão disponíveis na próxima sessão."*
   - O histórico de execução fica eternamente consistente e reprodutível.

---

## 4. Arquitetura de Componentes & Camadas (Abordagem 1: Foco Máximo com Gaveta de Suporte)

```
┌─────────────────────────────────────────────────────────────┐
│                   StandardScreenHeader                      │
│ [Voltar/Pausar]      Nome do Treino (v1)     [Menu/Visão]   │
│ Progresso: 8 de 12 séries (66%) • Tempo: 24:15 • 🟢 Salvo   │
├─────────────────────────────────────────────────────────────┤
│                 Barra Rápida de Exercícios                  │
│ [1. Supino (3/3)]  [2. Crucifixo (2/3)*]  [3. Tríceps (0/3)]│
├─────────────────────────────────────────────────────────────┤
│                   CARD DO EXERCÍCIO FOCADO                  │
│  Título: Crucifixo Inclinado com Halteres                   │
│  Prescrito: 3 séries × 10 a 12 reps • 60s descanso          │
│  Último treino: 18 kg × 12 reps (04/10/2026)                │
│  [🎥 Ver Demonstração & Guia]  [⚠️ Obs: Manter cotovelos..] │
├─────────────────────────────────────────────────────────────┤
│                     TABELA DE SÉRIES                        │
│  Série 1:  [ 18 ] kg  ×  [ 12 ] reps  [ ✔ Concluída ]       │
│  Série 2:  [ 20 ] kg  ×  [ 10 ] reps  [ Concluir Série ]    │
│            ↳ [Copiar Série 1]  [Usar Último Treino]         │
│  Série 3:  [ -- ] kg  ×  [ -- ] reps  [ Pendente ]          │
├─────────────────────────────────────────────────────────────┤
│         CRONÔMETRO DE DESCANSO AUTOMÁTICO (FLUTUANTE)       │
│  ⏱️ Descanso: 00:45 restantes                               │
│  [+15s]  [+30s]  [Pular Descanso]                           │
├─────────────────────────────────────────────────────────────┤
│                     AÇÕES PRINCIPAIS                        │
│  [ ◀ Anterior ]              [ Próximo Exercício ▶ ]        │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Modulares:
1. `WorkoutSessionEngine` (`services/workout-session-engine.ts`):
   - Gerencia a máquina de estados, fila offline, autossalvamento debounced, orquestração de Bi-sets e cronômetro baseado em timestamp.
2. `useWorkoutSession` (`hooks/use-workout-session.ts`):
   - Hook que conecta a tela ao motor, fornecendo estados reativos com re-renderizações restritas apenas aos campos da série ativa.
3. `WorkoutSupportDrawer` (`components/workout/WorkoutSupportDrawer.tsx`):
   - Gaveta inferior modal que exibe o player do YouTube, miniatura em alta resolução, guia técnico de execução passo a passo e observações do treinador sem sair do fluxo.
4. `WorkoutRestTimer` (`components/workout/WorkoutRestTimer.tsx`):
   - Card/barra de descanso com contagem regressiva baseada no timestamp `restEndsAt = Date.now() + restSeconds * 1000`. Continua funcionando mesmo se o aluno bloquear o celular.
5. `WorkoutNumericInput` (`components/workout/WorkoutNumericInput.tsx`):
   - Entrada numérica com teclado numérico adequado (`keyboardType="decimal-pad"`), suporte a vírgula brasileira (`"22,5"` -> `22.5`), sanitização de valores negativos, NaN ou excessivos.
6. `WorkoutSummaryModal` (`components/workout/WorkoutSummaryModal.tsx`):
   - Resumo completo pré-finalização: duração real, volume total levantado em kg, séries executadas vs puladas, e verificação de pendências.

---

## 5. Orquestração de Exercícios Combinados (Bi-sets, Tri-sets e Circuitos)

Para exercícios que possuem `combinationId`:
- O motor agrupa os exercícios do mesmo `combinationId` em um bloco de execução.
- O fluxo de séries avança por **Rodadas (*Rounds*)**:
  1. *Rodada 1:* Exercício A (Série 1) -> Exercício B (Série 1) -> Descanso da Combinação.
  2. *Rodada 2:* Exercício A (Série 2) -> Exercício B (Série 2) -> Descanso da Combinação.
- A interface indica claramente: `Bi-set (Rodada 1 de 3): Exercício Atual (A) ➔ Próximo: Exercício (B)`.

---

## 6. Autossalvamento, Fila Offline & Sincronização Idempotente

### Fluxo de Persistência Local:
1. A cada dígito inserido: o rascunho em memória é atualizado e gravado no AsyncStorage em background com debounce de 400ms.
2. A cada clique em **"Concluir Série"**:
   - Valida os valores numéricos.
   - Atualiza o `TrainingExecution` local imediatamente.
   - Enfileira uma mutação na fila de sincronização:
     ```ts
     type OfflineQueueItem = {
       id: string; // UUID idempotente
       executionId: string;
       type: "save_set" | "finish_execution" | "pain_report";
       payload: any;
       createdAt: string;
       retryCount: number;
     };
     ```
   - Inicia tentativa assíncrona de push via `pushMobileExecutionsToBackend`. Se falhar (modo avião, túnel, sem internet), o item permanece na fila com status *"Sincronização pendente"* sem perda de dados.
3. Indicador de status no topo:
   - 🟢 *"Salvo"*
   - 🟡 *"Salvando..."*
   - ⚪ *"Offline (Salvo no dispositivo)"*
   - 🔴 *"Sincronização pendente"*

---

## 7. Retomada Exata da Sessão

Na inicialização do aplicativo ou abertura da aba Treino:
1. O motor verifica se há execução ativa com status `in_progress` ou `paused`.
2. Se houver:
   - Apresenta na Home do aluno um card prioritário com destaque:
     `"Você possui um treino em andamento: Treino A (66% concluído)"`
     Botões: `[Continuar Treino]` e `[Encerrar / Abandonar]`.
3. Ao tocar em `Continuar Treino`:
   - Abre `training-details.tsx` restaurando exatamente:
     - O exercício ativo.
     - A série pendente em foco.
     - Cargas e repetições já digitadas.
     - O cronômetro de descanso (recalculado com base em `restEndsAt - Date.now()`). Se o tempo já expirou, notifica que o descanso encerrou.

---

## 8. Tratamento de Saída, Pausa e Abandono

Ao tocar em voltar ou fechar a tela com treino incompleto:
O app exibe o diálogo de segurança:
- **"Continuar treinando"**: fecha o diálogo e mantém o aluno na tela.
- **"Pausar e sair"**: salva todo o estado no AsyncStorage, mantém a sessão em `paused` e retorna à Home com possibilidade de retomar a qualquer momento.
- **"Abandonar treino"**: exige uma segunda confirmação com justificativa opcional (ex: indisposição, falta de tempo), marca o status como `abandoned`, preserva todas as séries já feitas no histórico e notifica o treinador.

---

## 9. Plano de Testes Automatizados

1. **Testes Unitários:**
   - Transições da máquina de estados (`WorkoutStateMachine`).
   - Normalização de entradas numéricas (vírgula brasileira, zero, NaN, strings).
   - Cálculo de descanso baseado em timestamp com retorno do background.
   - Alternância de Bi-sets rodada por rodada.
   - Deduplicação de chamadas concorrentes com Mutex.
2. **Testes de Integração:**
   - Iniciar sessão -> Concluir 3 séries -> Simular queda de rede -> Enfileirar offline -> Recuperar rede -> Sincronizar sem duplicar.
   - Retomada de sessão após recarregamento do estado.
   - Registro de relato de dor associado à série e envio para a Fila de Atenção do Treinador.
3. **Testes de Regressão & Cobertura:**
   - Garantir que todos os 205 testes existentes continuem 100% aprovados.
