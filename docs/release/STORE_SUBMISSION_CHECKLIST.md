# Checklist de Submissão para as Lojas — DragonCorp V1.0.0

Este documento consolida todos os itens obrigatórios e pré-requisitos para envio e aprovação do **DragonCorp** na **Apple App Store Connect** e **Google Play Console**.

---

## 1. Apple App Store Connect Checklist

### A. Conta e Configurações Globais
- [ ] **Conta Apple Developer Program:** Ativa e com termos do *Paid Applications Agreement* aceitos.
- [ ] **Tax & Banking:** Dados fiscais e bancários devidamente preenchidos e validados pela Apple para recebimento de IAP.
- [ ] **App Criado no App Store Connect:**
  - **Nome:** DragonCorp
  - **Bundle ID:** `com.dragoncorp.app`
  - **SKU:** `dragoncorp-app-ios`
  - **Idioma Primário:** Português (Brasil) (pt-BR)
  - **Categoria Primária:** Saúde e boa forma (Health & Fitness)
  - **Categoria Secundária:** Estilo de vida (Lifestyle) ou Produtividade (Productivity)
  - **Classificação Etária:** 17+ (ou classificação recomendada pelo questionário de conteúdo)
  - **Copyright:** `© 2026 DragonCorp. Todos os direitos reservados.`

### B. Metadados e Textos Promocionais
- [ ] **Subtítulo (até 30 caracteres):** `Consultoria Fitness & Treinos`
- [ ] **Palavras-chave (Keywords):** `personal trainer,treinos,musculação,avaliação física,fitness,consultoria,dieta,saúde`
- [ ] **URL de Suporte:** `https://dragoncorp.app/suporte` (ou e-mail `suporte@dragoncorp.app`)
- [ ] **URL da Política de Privacidade:** `https://dragoncorp.app/privacidade` (e rota in-app `/privacy-policy`)
- [ ] **URL dos Termos de Uso (EULA):** `https://dragoncorp.app/termos` (e rota in-app `/terms-of-use`)

### C. Configuração de In-App Purchases (StoreKit)
- [ ] **Grupo de Assinatura Criado:** `DragonCorp Pro Subscriptions`
- [ ] **Produto 1 (Mensal):**
  - **Product ID:** `com.dragoncorp.pro.monthly`
  - **Nome de Referência:** DragonCorp Pro Mensal
  - **Duração:** 1 mês
  - **Preço:** R$ 19,90 (ou Tier equivalente da Apple)
  - **Período de Teste Gratuito (Introductory Offer):** 7 dias (opcional)
- [ ] **Produto 2 (Anual):**
  - **Product ID:** `com.dragoncorp.pro.annual`
  - **Nome de Referência:** DragonCorp Pro Anual
  - **Duração:** 1 ano
  - **Preço:** R$ 199,90 (Tier anual equivalente)
  - **Período de Teste Gratuito:** 7 dias (opcional)
- [ ] **App Store Server Notifications:** URL de webhook configurada para `https://api.dragoncorp.app/api/v1/webhooks/apple-iap` (Versão 2).

### D. Informações de Revisão do App (App Review Information)
- [ ] **Sign In Requerido:** Marcado como **Sim**.
- [ ] **Conta de Demonstração para o Revisor:**
  - **Usuário:** `revisor.personal@dragoncorp.app`
  - **Senha:** `ReviewerPass@2026`
- [ ] **Notas para a Revisão (Review Notes):**
  - Incluir as instruções completas do [REVIEWER_ACCESS_KIT.md](file:///Users/pumapunku/Documents/GitHub/Indigo-Aplicativo/REVIEWER_ACCESS_KIT.md).
  - Explicar a distinção entre perfil de Personal Trainer (prescreve treinos e contrata Pro) e perfil de Aluno (recebe os treinos gratuitamente da consultoria).

---

## 2. Google Play Console Checklist

### A. Conta e Configurações Iniciais
- [ ] **Conta Google Play Developer:** Ativa e verificada com perfil para pagamentos (*Merchant Account*).
- [ ] **App Criado no Google Play Console:**
  - **Nome:** DragonCorp
  - **Package Name:** `com.dragoncorp.app`
  - **Idioma Padrão:** Português (Brasil)
  - **App Gratuito com Compras no Aplicativo (IAP):** Sim.

### B. Conteúdo do App e Questionários de Conformidade
- [ ] **Política de Privacidade:** URL pública informada (`https://dragoncorp.app/privacidade`).
- [ ] **Acesso ao App (App Access):** Fornecer credenciais de acesso (`revisor.personal@dragoncorp.app` / `ReviewerPass@2026`).
- [ ] **Anúncios (Ads):** Declarar que o aplicativo **NÃO contém anúncios**.
- [ ] **Classificação de Conteúdo (Content Rating):** Preencher o questionário IARC (Livre / 12+ / 14+).
- [ ] **Público-alvo e Conteúdo:** Selecionar faixa etária (18+ / Adultos).
- [ ] **Segurança dos Dados (Data Safety):**
  - Dados Coletados: Informações Pessoais (Nome, E-mail, Telefone, ID de Usuário), Saúde e Boa Forma (Exercícios, peso, avaliações), Fotos e Vídeos (Fotos corporais para avaliação).
  - Finalidade: Funcionalidade do aplicativo e personalização.
  - Criptografia em trânsito: Sim (HTTPS/TLS).
  - Solicitação de exclusão de conta: Sim (link fornecido para `/delete-account` e no site).

### C. Assinaturas e Produtos Google Play Billing
- [ ] **Assinatura 1 (Mensal):**
  - **ID do Produto:** `dragoncorp_pro_monthly`
  - **Plano Base (Base Plan):** `monthly-base-plan`
  - **Tipo de Renovação:** Auto-renovável a cada 1 mês
  - **Preço:** R$ 19,90
  - **Oferta de Lançamento (Free Trial):** 7 dias grátis (opcional)
  - **Status:** **Ativo** (Active)
- [ ] **Assinatura 2 (Anual):**
  - **ID do Produto:** `dragoncorp_pro_annual`
  - **Plano Base (Base Plan):** `annual-base-plan`
  - **Tipo de Renovação:** Auto-renovável a cada 1 ano
  - **Preço:** R$ 199,90
  - **Status:** **Ativo** (Active)
- [ ] **Configuração de Notificações em Tempo Real (RTDN):**
  - Tópico do Google Cloud Pub/Sub vinculado ao Google Play Console.
  - Endpoint de webhook: `https://api.dragoncorp.app/api/v1/webhooks/google-play`.
- [ ] **Testadores Licenciados (License Testing):** Adicionar os e-mails dos testadores internos para compras de teste gratuitas com renovação acelerada.

---

## 3. Checklist de Assets Gráficos Obrigatórios

### iOS (App Store)
- [x] **Ícone do Aplicativo:** 1024×1024 px PNG sem canal alfa/transparência.
- [ ] **Capturas de Tela (Screenshots):**
  - 6.9” (iPhone 16 Pro Max / 15 Pro Max): 1320 × 2868 px ou 1290 × 2796 px (Mínimo 3, recomendado 5+).
  - 6.7” / 6.5” (iPhone 14 Plus / 11 Pro Max): 1284 × 2778 px ou 1242 × 2688 px.
  - 13” iPad Pro (6ª Geração): 2048 × 2732 px (Se publicado para iPad).

### Android (Google Play Store)
- [x] **Ícone de Alta Resolução:** 512×512 px PNG com 32 bits de cor.
- [x] **Ícone Adaptativo (Adaptive Icon):** Foreground oficial em `./assets/images/android-icon-foreground.png` e background `#000000`.
- [ ] **Gráfico de Recursos (Feature Graphic):** 1024×500 px PNG/JPEG sem transparência.
- [ ] **Capturas de Tela do Smartphone:** Mínimo 4 capturas, resolução mínima 1080×1920 px (proporção 16:9 ou 9:16).
