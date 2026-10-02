# Reviewer Access Kit — DragonCorp (App Store & Google Play)

**Documento Técnico de Acesso para Revisores das Lojas**  
**Versão do Aplicativo:** 1.0.0 (Build 1)  
**Ambiente de Revisão:** Produção com Sandbox Habilitado  

---

## 1. Contas Fictícias de Demonstração e Teste

> [!IMPORTANT]
> Estas contas possuem exclusivamente **dados fictícios e simulados**, criados com a finalidade de demonstrar todas as funcionalidades do aplicativo à equipe de revisão da Apple (App Store Review) e do Google (Google Play App Review).

### A. Conta de Personal Trainer (Treinador)
* **Perfil:** Personal Trainer com Plano PRO ativo e alunos vinculados
* **E-mail de Acesso:** `revisor.personal@dragoncorp.app`
* **Senha de Acesso:** `ReviewerPass@2026`
* **Código de Treinador:** `DRAGON-PRO-REV`
* **CREF:** `123456-SP` (Status: Verificado)
* **Recursos para Testar:**
  1. Visualização da lista de alunos ativos (`Lucas Fictício`, `Mariana Teste`);
  2. Criação e edição de fichas de treino com exercícios e vídeos;
  3. Realização e comparação de avaliações físicas (Pollock 7 dobras e VO₂Max);
  4. Visualização dos avisos de saúde metodológicos;
  5. Consulta de rankings de frequência e evolução.

### B. Conta de Aluno (Atleta)
* **Perfil:** Aluno vinculado ao Personal Trainer de demonstração
* **E-mail de Acesso:** `revisor.aluno@dragoncorp.app`
* **Senha de Acesso:** `StudentReview@2026`
* **Recursos para Testar:**
  1. Acesso à ficha de treino do dia (com séries, repetições e cargas);
  2. Execução de treino com cronômetro e feedback de esforço percebido (PSE);
  3. Visualização de histórico de avaliações físicas, gráficos de peso e hidratação;
  4. Envio de mensagem na central de suporte.

### C. Conta de Demonstração Administrativa / Compliance (Se solicitada)
* **E-mail de Acesso:** `revisor.admin@dragoncorp.app`
* **Senha de Acesso:** `AdminReview@2026`
* **Recursos:** Visualização do painel de moderação e auditoria de cadastros.

---

## 2. Roteiro Passo a Passo para os Revisores

### Passo 1: Autenticação
1. Abra o aplicativo DragonCorp;
2. Na tela inicial escura com animação do dragão, toque para entrar;
3. Insira o e-mail `revisor.personal@dragoncorp.app` e a senha `ReviewerPass@2026`;
4. Toque em **Entrar**.

### Passo 2: Navegação e Prescrição de Treinos
1. Na aba **Alunos**, selecione o aluno `Lucas Fictício`;
2. Abra a aba **Treinos** para visualizar a divisão A/B/C com exercícios cadastrados;
3. Toque em um exercício para abrir a demonstração de movimento e execução.

### Passo 3: Avaliação Física e Avisos de Saúde
1. Na ficha do aluno, acesse **Avaliações Físicas**;
2. Visualize o histórico longitudinal e o **Aviso de Saúde** que contextualiza que os cálculos são estimativas funcionais e não diagnóstico médico;
3. Toque no botão de relatório para gerar o laudo formatado em PDF.

### Passo 4: Teste de Assinatura In-App (StoreKit / Google Play Billing)
1. Acesse o menu **Perfil** > **Minha Assinatura**;
2. Visualize os detalhes do plano PRO e teste a tela de upgrade em ambiente Sandbox;
3. Teste o botão **Restaurar Compras** para verificar a sincronização da assinatura.

### Passo 5: Exclusão de Conta (Apple Guideline 5.1.1(v))
1. Acesse **Perfil** > **Exclusão de Conta** (ou acesse a rota `/delete-account`);
2. Digite a confirmação `EXCLUIR` para testar o fluxo de eliminação definitiva de dados.

---

## 3. Roteiro para Gravação de Vídeo Demonstrativo (App Review Video)

* **Cena 1 (0:00 - 0:15):** Abertura do app no fundo preto com o dragão oficial, login com o perfil de personal.
* **Cena 2 (0:15 - 0:45):** Visualização do painel de alunos, navegação na ficha de treino e catálogo de exercícios.
* **Cena 3 (0:45 - 1:15):** Exibição da avaliação física, gráficos corporais e aviso metodológico de saúde.
* **Cena 4 (1:15 - 1:45):** Telas de gerenciamento de assinatura Pro, suporte in-app e conformidade de exclusão.
* **Cena 5 (1:45 - 2:00):** Encerramento com tela de perfil e links de termos/privacidade.
