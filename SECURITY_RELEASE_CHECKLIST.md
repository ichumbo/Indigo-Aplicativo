# Checklist de Segurança de Lançamento (Security Release Checklist) — DragonCorp

Este documento estabelece a auditoria de segurança da informação, higienização do código-fonte e controles de proteção para o lançamento da versão 1.0.0.

---

## 1. Auditoria de Código e Bundle Mobile

| Item de Verificação | Requisito de Segurança | Status | Verificação |
| :--- | :--- | :---: | :--- |
| **Secrets & Chaves Privadas** | Nenhuma chave de API privada, token JWT estático, certificado ou senha gravada no código do app | 🟢 APROVADO | Busca global por credenciais estáticas limpa |
| **Endpoints & URLs** | Ausência de referências a `localhost` ou IPs de desenvolvimento no bundle de produção | 🟢 APROVADO | URLs centralizadas via `.env` / `Constants` |
| **Modo Debug & DevTools** | DevTools, botões ocultos de debug e logs com dados sensíveis desativados | 🟢 APROVADO | `app.json` e `eas.json` com perfil de produção limpo |
| **Bypass de Autenticação** | Login obrigatório com tokens expiráveis (Sanctum) e persistência segura em AsyncStorage / Keychain | 🟢 APROVADO | Testes automatizados RC-1 e U1.4 aprovados |
| **Bypass de Plano PRO** | Autorização de recursos e limite de alunos validada no backend Laravel | 🟢 APROVADO | Teste RC-6 e `SubscriptionVerificationService` validados |

---

## 2. Isolamento de Perfis e Prevenção de IDOR

* **Personal Trainer vs Aluno:** Um aluno nunca tem acesso a rotas ou recursos de outros alunos ou de outros personal trainers.
* **Personal Trainer A vs Personal Trainer B:**
  * O backend valida o `trainer_id` do usuário autenticado em 100% das requisições de alunos, treinos e avaliações.
  * Tentativas de acesso a recursos de outro personal trainer retornam **403 Forbidden** ou **404 Not Found**.
  * Teste destrutivo de penetração automatizado (`RC-2`) aprovado.

---

## 3. Proteção e Mascaramento de Identificadores

* **Recibos StoreKit & Purchase Tokens Google Play:**
  * Recibos e tokens completos nunca são registrados em texto aberto nos arquivos de log.
  * O backend aplica mascaramento de identificadores (ex: `sub***abc`) antes de salvar em logs de auditoria (`AuditLog`).
* **Senhas:** Armazenadas no banco utilizando hash criptográfico seguro `BCRYPT` (custo padrão 12).
* **Comunicação em Trânsito:** Todas as chamadas de API em ambiente de produção utilizam **HTTPS/TLS 1.3** obrigatório.
