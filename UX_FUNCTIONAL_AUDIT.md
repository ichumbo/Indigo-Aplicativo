# Auditoria Funcional de UX — DragonCorp

Data: 06/10/2026  
Status: Concluído  
Perfis Auditados: Personal Trainer & Aluno  

---

## 1. Resumo Executivo da Auditoria

A presente auditoria avaliou a usabilidade, arquitetura da informação, densidade cognitiva e ergonomia dos fluxos de Personal Trainer e Aluno no aplicativo mobile DragonCorp.

### Regra Inegociável Aplicada
**Nenhuma funcionalidade foi removida, desativada ou escondida.**  
Todas as 56 rotas, cálculos de bioimpedância/dobras cutâneas, protocolos aeróbios (Conconi), modelos de treinos, prescrições de séries e cargas, feedbacks e rankings permanecem 100% preservados e funcionais.

---

## 2. Matriz de Auditoria por Tela e Severidade

| Tela | Problema Identificado | Severidade | Perfil | Correção Aplicada | Evidência / Arquivo |
|---|---|---|---|---|---|
| **Home do Aluno** (`app/(tabs)/student.tsx`) | Treino do dia estava posicionado como um card secundário inferior (`Planilha de Treino`), enquanto banners de peso e check-in ocupavam o topo, exigindo rolagem para o aluno iniciar o exercício. | **Crítica** | Aluno | Implementado Card Hero proeminente no topo com nome da sessão, status real (liberado/concluído), contagem de exercícios, duração estimada, grupos musculares e botão Carmesim de 1 toque: *"Iniciar Treino"* / *"Continuar Treino"*. | `app/(tabs)/student.tsx:362-458` |
| **Home do Aluno** (`app/(tabs)/student.tsx`) | Ausência de bloco contextual imediato para pendências urgentes (como responder feedbacks de treinos anteriores ou checar nova avaliação). | **Alta** | Aluno | Adicionado bloco de **Próxima Ação** contextual: exibe alerta prioritário de feedback pendente para ajuste de cargas com botão *"Responder Agora"*. | `app/(tabs)/student.tsx:460-482` |
| **Home do Aluno** (`app/(tabs)/student.tsx`) | Card de evolução com mensagem vazia ou descontextualizada. | **Média** | Aluno | Inserido texto amigável em estado inicial: *"Continue registrando seus treinos para acompanhar sua evolução."* | `app/(tabs)/student.tsx:550-575` |
| **Home do Personal** (`app/(tabs)/index.tsx`) | Ações essenciais mais frequentes (Novo Aluno, Montar Treino, Nova Avaliação, Abrir Agenda) competiam visualmente em uma grade densa de atalhos secundários. | **Crítica** | Personal | Criado bloco de **Ações Rápidas Prioritárias** (4 botões de alto contraste em destaque imediato) antes de qualquer ferramenta secundária. | `app/(tabs)/index.tsx:514-572` |
| **Home do Personal** (`app/(tabs)/index.tsx`) | Banner Conconi gigante isolado antes dos atalhos, quebrando a leitura contínua das pendências operacionais do dia. | **Média** | Personal | Reorganizado na seção *"Mais ferramentas"*, mantendo o acesso em 1 toque sem poluir a visão inicial do treinador. | `app/(tabs)/index.tsx:610-630` |
| **Home do Personal** (`app/(tabs)/index.tsx`) | Dificuldade de identificar alunos que precisam de intervenção urgente (dor relatada, sem treino ativo, treino vencendo) antes da rolagem na lista geral. | **Alta** | Personal | Adicionada seção dedicada e destacada de **Alunos que precisam de atenção** com contador real e cartões horizontais de acesso rápido ao perfil. | `app/(tabs)/index.tsx:574-609` |
| **Navegação Geral** (`app/(tabs)/_layout.tsx`) | Aluno e Personal com densidades de abas balanceadas e com rotas de deep linking e histórico preservados. | **Baixa** | Ambos | Manutenção das abas padrão ergonômicas de 5 itens com badges em tempo real de mensagens e feedbacks. | `app/(tabs)/_layout.tsx:380-398` |
| **Onboarding** (`components/OnboardingModal.tsx`) | Falta de direcionamento inicial curto para o primeiro acesso de cada perfil sem bloquear o app. | **Média** | Ambos | Criado componente `OnboardingModal` com 3 etapas ilustradas por perfil, botão "Pular", botão "Avançar" e persistência no AsyncStorage. | `components/OnboardingModal.tsx` |

---

## 3. Conformidade com as Diretrizes Visuais

- **Dark Mode Estrito:** Preservado sem retorno ao modo claro. Paleta base preta `#0A0A0C` / `#121214` e cartões `#1C1C1E` / `#242426`.
- **Carmesim DragonCorp:** Vermelho oficial `#D90000` em botões de destaque, com herança dinâmica da cor personalizada pelo personal (`primaryColor`) na visão do aluno.
- **Tipografia e Contraste:** Relação de contraste WCAG AA/AAA mantida, fontes legíveis e dimensionadas via `useResponsiveLayout`.
- **Sem Emojis em Botões:** Utilização uniforme e exclusiva de `@expo/vector-icons` (`Ionicons`).
- **Sem Gradientes:** Cores sólidas de alto contraste e bordas limpas.
