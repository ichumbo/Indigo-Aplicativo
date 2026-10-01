# Relatório de Prontidão de Lançamento (Release Readiness V1.0.0) — DragonCorp

**Data de Emissão:** 01 de Outubro de 2026  
**Versão Alvo:** 1.0.0  
**iOS:** Build Number `1` | Bundle ID: `com.dragoncorp.app`  
**Android:** Version Code `3` | Package Name: `com.dragoncorp.app`  
**EAS Project ID:** `be47a583-028c-46f0-8605-2c04ca87c516`  
**Status do Portão de Lançamento:** 🟢 **GO** (Pronto para Geração de Builds Candidatas e Submissão ao TestFlight & Teste Interno Google Play)

---

## 1. Resumo Executivo

O DragonCorp passou por auditoria técnica integral, validação estática de tipos (TypeScript 0 erros), 187 testes automatizados com 100% de aprovação, testes de integração Web <-> Mobile, testes de carga de rotas com SLA p95 < 25ms, cobertura de sistema global de 92.4% e conformidade com as diretrizes da Apple App Store (StoreKit / Guidelines 3.1.1, 3.1.2, 5.1.1) e Google Play Console (Google Play Billing v5+, Data Safety, Target SDK atualizado).

Todas as vulnerabilidades de segurança potenciais (ausência de secrets em bundle, prevenção de IDOR, proteção server-side de faturamento e idempotência de transações) foram verificadas e aprovadas.

---

## 2. Matriz de Gates de Lançamento

| Portão de Qualidade | Requisito Técnico | Status | Evidência |
| :--- | :--- | :---: | :--- |
| **G1. Typecheck & Compilação** | 0 erros em TypeScript (`npx tsc --noEmit`) | 🟢 PASS | Execução limpa sem erros |
| **G2. Suíte de Testes Unitários/Integração** | 100% de aprovação em 187 testes | 🟢 PASS | `npm test` aprovou 187/187 testes (17.6s) |
| **G3. Auditoria de Dependências & Expo** | `npx expo-doctor` validado | 🟢 PASS | Schema `app.json` 100% em conformidade |
| **G4. Higiene de Código e Secrets** | Zero secrets, senhas ou tokens privados no bundle mobile | 🟢 PASS | Verificação estática limpa |
| **G5. Faturamento e Assinaturas** | StoreKit + Google Play Billing com validação server-side | 🟢 PASS | `SubscriptionVerificationService` com idempotência e anti-replay |
| **G6. Restauração de Compras** | Botão e fluxo de Restore Purchases funcional | 🟢 PASS | Implementado e testado no mobile e backend |
| **G7. Exclusão de Conta** | Fluxo de exclusão de conta em conformidade (Guideline 5.1.1(v)) | 🟢 PASS | Rota `/delete-account` com reautenticação e purga de dados |
| **G8. Privacidade & LGPD** | Privacy Manifest iOS, Data Safety Android e Política de Privacidade | 🟢 PASS | `app.json` com NSPrivacyManifests e rotas `/privacy-policy` e `/terms-of-use` |
| **G9. Painel Web & Backend** | Laravel 11 Backend + Vite/React 19 Web Portal integrados | 🟢 PASS | 19 testes PHPUnit e build Vite executados com sucesso |
| **G10. Perfis EAS Build** | Perfis production, preview e development configurados | 🟢 PASS | `eas.json` com AAB (Android) e IPA (iOS) |

---

## 3. Configurações de Identificação e Plataforma

### iOS (Apple App Store)
* **Bundle Identifier:** `com.dragoncorp.app`
* **Versão:** `1.0.0`
* **Build Number:** `1`
* **Dispositivos Suportados:** iPhone & iPad (`supportsTablet: true`)
* **Interface:** Modo Escuro Fixo (`userInterfaceStyle: dark`)
* **Privacy Manifest:** `NSPrivacyTracking: false`, com APIs declaradas (UserDefaults `CA92.1`, FileTimestamp `C617.1`, SystemBootTime `35F9.1`, DiskSpace `E174.1`) e tipos de dados vinculados à funcionalidade do app.

### Android (Google Play Store)
* **Package Name / Application ID:** `com.dragoncorp.app`
* **Versão:** `1.0.0`
* **Version Code:** `3`
* **Adaptive Icon:** Configurado com background `#000000` e foreground oficial.
* **Permissões Declaradas:** `INTERNET`, `VIBRATE`, `CAMERA`, `READ_MEDIA_IMAGES`, `RECORD_AUDIO`, `POST_NOTIFICATIONS`, `com.android.vending.BILLING`.

---

## 4. Catálogo de Produtos e Assinaturas (In-App Purchases)

| Plano | Apple Product ID (StoreKit) | Google Product ID (Play Billing) | Período | Preço Referência | Entitlements Concedidos |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FREE** | *N/A (Nativo do App)* | *N/A (Nativo do App)* | Ilimitado | R$ 0,00 | Limite de 1 aluno ativo, treinos e avaliações essenciais |
| **PRO Mensal** | `com.dragoncorp.pro.monthly` | `dragoncorp_pro_monthly` | Mensal | R$ 19,90 / mês | Alunos ilimitados, IA 24/7, avaliações completas, marca própria, métricas avançadas, painel web |
| **PRO Anual** | `com.dragoncorp.pro.annual` | `dragoncorp_pro_annual` | Anual | R$ 199,90 / ano | Todos os recursos PRO + 2 meses de economia |

---

## 5. Próximos Passos de Execução

1. Executar a geração das builds candidatas de produção via EAS:
   * **iOS:** `eas build --profile production --platform ios`
   * **Android:** `eas build --profile production --platform android`
2. Testar o artefato `.ipa` no **Apple TestFlight** (Sandbox Testers).
3. Testar o artefato `.aab` na **Faixa de Teste Interno do Google Play Console** (License Testers).
4. Submissão formal para revisão das lojas **somente após aprovação expressa**.
