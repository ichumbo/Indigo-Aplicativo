# 📱 DragonCorp — Fitness & Personal Platform

> **Plataforma Profissional de Consultoria Fitness, Prescrição de Treinos e Avaliação Física.**  
> Desenvolvido com **React Native**, **Expo Router**, **TypeScript** e arquitetura modular de alta performance.

---

## 🚀 Visão Geral da Arquitetura

O **DragonCorp** é uma solução completa para Personais Trainers e Alunos, com painel administrativo executivo para governança da plataforma.

### 🔑 Principais Módulos do Sistema:
1. **Autenticação & RBAC (`services/auth-store.ts`)**: Separação estrita de perfis (*Master Admin*, *Personal Trainer*, *Aluno*) com sessões criptografadas.
2. **Prescrição & Execução de Treinos (`services/training-plan-store.ts`)**: Versionamento de fichas, matriz de séries, repetições, carga e histórico.
3. **Motor Científico de Hidratação (`services/hydration-service.ts`)**: Algoritmo metabólico baseado nas diretrizes ACSM/EFSA (35ml/kg + compensação de treino/clima).
4. **Protocolos Clínicos & Composição Corporal (`services/body-composition-protocols.ts`)**: Pollock 3 e 7 Dobras, Faulkner 4, Guedes 3, Weltman e Bioimpedância.
5. **Avaliações Cardiorrespiratórias & Funcionais (`services/cardiorespiratory-protocols.ts`, `services/functional-test-catalog.ts`)**: Teste de Cooper 12min, FMS, Rockport e Y-Balance.
6. **Chat Instantâneo & Feedbacks (`services/chat-store.ts`, `services/feedback-store.ts`)**: Comunicação em tempo real com tags de suporte e alertas de dor.
7. **Painel Master Admin (`services/admin-dashboard-store.ts`)**: KPIs em tempo real (MRR, Uptime, usuários), feature flags e trilha de auditoria.

---

## 🛠️ Tecnologias Utilizadas

- **Framework**: React Native 0.86 + Expo 57
- **Roteamento**: Expo Router 6 (File-based Routing com rotas tipadas)
- **Linguagem**: TypeScript 5
- **Design System**: Obsidian Dark Luxe (Minimalista, alto contraste)
- **Persistência**: AsyncStorage atômico de alta performance

---

## 📦 Como Executar o Projeto Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor Expo Mobile
npm start
# ou
npx expo start

# 3. Iniciar Portal Web
npm run web:portal
```

---

## 🧪 Suíte de Testes & Auditoria de Qualidade

```bash
# Executar todos os testes automatizados
npm test

# 1. Teste de Carga e Estresse por Rota (100 reqs simultâneas)
npm run test:load-routes

# 2. Teste de Estrutura Integrada por Unidade Funcional
npm run test:unit-integration

# 3. Auditoria de Cobertura Global do Sistema (>94% cobertura)
npm run test:coverage
```

---

## 📚 Central de Documentação do Projeto

Toda a documentação técnica, relatórios e manuais estão organizados na pasta [`docs/`](./docs/README.md):

- 📊 **[Relatórios & Auditorias Executivas](./docs/README.md#-1-relatórios-executivos--auditorias-docsreports)**
  - [Relatório de Cobertura Global do Sistema](./docs/reports/RELATORIO_COBERTURA_SISTEMA_COMPLETO.md)
  - [Relatório de Estrutura Integrada por Unidade](./docs/reports/RELATORIO_ESTRUTURA_INTEGRADA_UNIDADES.md)
  - [Relatório de Teste de Carga por Rota](./docs/reports/RELATORIO_TESTE_DE_CARGA_ROTAS.md)
- 🚀 **[Publicação, Release & Compliance](./docs/README.md#-2-publicação-release--compliance-docsrelease)**
  - [Checklist de Submissão para as Lojas](./docs/release/STORE_SUBMISSION_CHECKLIST.md)
  - [Kit de Acesso para Revisores](./docs/release/REVIEWER_ACCESS_KIT.md)
  - [Mapeamento de Privacidade & Dados](./docs/release/PRIVACY_DATA_MAP.md)
  - [Notas de Versão v1.0.0](./docs/release/RELEASE_NOTES_1.0.0.md)
- 🏛️ **[Arquitetura do Sistema & IAP](./docs/README.md#-3-arquitetura-do-sistema--integrações-docsarchitecture)**
  - [Assinaturas & StoreKit/Google Play IAP](./docs/architecture/IAP_AND_SUBSCRIPTIONS.md)
  - [Motor de Notificações por Eventos](./docs/architecture/NOTIFICATION_ARCHITECTURE.md)
  - [Especificação de Responsividade](./docs/architecture/RESPONSIVE_SPEC.md)

---

## 📱 Publicação nas Lojas

- **iOS (App Store)**: Bundle ID `com.dragoncorp.app`
- **Android (Google Play)**: Package `com.dragoncorp.app`
