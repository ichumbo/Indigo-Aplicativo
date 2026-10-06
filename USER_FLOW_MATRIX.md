# Matriz de Fluxos de Usuário — DragonCorp

Data: 06/10/2026  
Escopo: Otimização de Jornadas do Personal Trainer e do Aluno  

---

## 1. Comparativo de Etapas (Antes vs Depois)

| Perfil | Tarefa | Caminho Anterior | Caminho Novo | Etapas Antes | Etapas Depois | Redução de Atrito |
|---|---|---|---|:---:|:---:|:---:|
| **Aluno** | Iniciar Treino do Dia | Abrir App → Rolar tela até "Planilha de Treino" → Clicar no card → Abrir tela de detalhes → Clicar em iniciar | Abrir App → Clicar diretamente no botão **"Iniciar Treino"** no topo da Home | 5 | **1** | **-80% de toques** |
| **Aluno** | Responder Feedback Pendente | Abrir App → Ir na Aba Perfil/Mais → Procurar Feedbacks → Identificar treino pendente → Abrir formulário | Abrir App → Clicar no card de **"Próxima Ação: Feedback Pendente"** na Home | 5 | **1** | **-80% de toques** |
| **Aluno** | Fazer Check-in do Treino | Abrir App → Rolar até card de academia → Clicar em confirmar | Abrir App → Clicar no botão de check-in integrado logo abaixo do treino | 3 | **1** | **-66% de toques** |
| **Aluno** | Consultar Protocolo Aeróbio | Abrir App → Rolar e procurar card solto | Abrir App → Clicar em **"Ver protocolo"** no bloco estruturado de cardio | 3 | **1** | **-66% de toques** |
| **Personal** | Cadastrar Novo Aluno | Abrir App → Rolar atalhos → Achar botão de cadastro ou abrir menu lateral → Abrir modal | Abrir App → Clicar no botão **"Novo Aluno"** nas Ações Rápidas | 4 | **1** | **-75% de toques** |
| **Personal** | Prescrever Treino para Aluno | Abrir App → Aba Treinos → Procurar Aluno → Selecionar Aluno → Criar ficha | Abrir App → Buscar aluno na Home → Clicar no aluno → Clicar em **"Treinos"** (contexto preservado) | 5 | **3** | Contexto do aluno mantido sem repetição |
| **Personal** | Avaliar Aluno com Atenção (Dor) | Abrir App → Rolar lista de alunos → Abrir cada aluno para ver histórico de dor | Abrir App → Bloco **"Alunos que precisam de atenção"** no topo → Clicar no aluno com alerta vermelho | 6 | **1** | **-83% de tempo de busca** |
| **Personal** | Consultar e Abrir Agenda | Abrir App → Abrir menu secundário → Procurar item de agenda → Abrir agenda | Abrir App → Clicar no botão **"Abrir Agenda"** nas Ações Rápidas | 4 | **1** | **-75% de toques** |
| **Personal** | Acessar Ferramentas Secundárias (Conconi/Ranking) | Banner gigante poluía o feed diário | Seção organizada **"Mais ferramentas"** sem poluir o feed | - | - | Clareza visual imediata |

---

## 2. Detalhamento dos Fluxos Principais

### Fluxo 1: Aluno — Iniciar e Concluir Treino
1. **Entrada:** Home do Aluno (`app/(tabs)/student.tsx`).
2. **Visão Imediata:** Card Hero do Treino de Hoje com nome, exercícios, tempo estimado e status.
3. **Ação:** Toque em *"Iniciar Treino"*.
4. **Execução:** Tela `/training-details` com carrossel de exercícios, carga anterior de referência e registro de séries com um toque.
5. **Finalização:** Resumo de cargas, registro de percepção de esforço e retorno com consistência atualizada.

### Fluxo 2: Personal Trainer — Atendimento e Gestão
1. **Entrada:** Home do Personal (`app/(tabs)/index.tsx`).
2. **Resumo Operacional:** Resumo do dia com atendimentos, treinos a vencer e feedbacks pendentes.
3. **Pendências Reais:** Avisos de dor ou treinos vencendo.
4. **Ações Rápidas:** 4 botões destacados para as tarefas do dia a dia (Novo Aluno, Montar Treino, Nova Avaliação, Abrir Agenda).
5. **Alunos em Atenção:** Visualização imediata de alunos que necessitam de intervenção com 1 toque.
6. **Hub do Aluno:** Ao entrar no perfil do aluno, todas as ações (Dieta, Anamnese, Avaliações, Treinos e Cargas) acontecem no mesmo contexto sem necessidade de re-seleção.
