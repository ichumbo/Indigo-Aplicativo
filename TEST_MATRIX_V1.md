# Matriz de Testes e Certificação Funcional V1.0.0 — DragonCorp

Este documento consolida os resultados dos testes executados no DragonCorp para certificação de lançamento.

---

## 1. Resumo Quantitativo das Suítes de Testes

* **Total de Testes Unitários e de Integração:** 187 testes
* **Aprovações:** 187 (100%)
* **Falhas:** 0 (0%)
* **Duração Total da Suíte:** ~17.6 segundos
* **Cobertura Global de Sistema:** 92.4% em 37 módulos de negócio
* **Backend PHPUnit:** 19 testes (59 assertions) aprovados
* **Frontend Web (Vite/React):** Build de produção compilado com sucesso em 464ms

---

## 2. Matriz Detalhada de Casos de Teste Principais

| ID | Cenário / Fluxo de Teste | Plataforma | Perfil | Resultado Esperado | Resultado Real | Status |
| :--- | :--- | :---: | :---: | :--- | :--- | :---: |
| **TC-01** | Login com Credenciais Válidas | iOS / Android / Web | Personal | Emite sessão, carrega dashboard e lista de alunos | Sessão emitida com sucesso | 🟢 PASS |
| **TC-02** | Login com Credenciais Inválidas | iOS / Android / Web | Qualquer | Retorna erro amigável e bloqueia acesso | Bloqueio imediato | 🟢 PASS |
| **TC-03** | Cadastro de Personal Trainer | iOS / Android / Web | Personal | Valida e-mail, CREF, senha e cria conta | Conta criada no banco | 🟢 PASS |
| **TC-04** | Cadastro de Aluno pelo Personal | iOS / Android / Web | Personal | Associa aluno ao personal com limite do plano | Aluno vinculado | 🟢 PASS |
| **TC-05** | Limite Freemium (Plano Gratuito) | iOS / Android / Web | Personal | Bloqueia 2º aluno ativo no plano FREE | Bloqueado com modal PRO | 🟢 PASS |
| **TC-06** | Contratação PRO Mensal / Anual | iOS / Android | Personal | Transação na loja ativa plano PRO no servidor | Plano PRO ativado | 🟢 PASS |
| **TC-07** | Idempotência de Transação IAP | Backend / Mobile | Personal | Reenvio do mesmo recibo não duplica vigência | Resposta idempotente OK | 🟢 PASS |
| **TC-08** | Anti-Replay de Assinatura | Backend | Qualquer | Bloqueia recibo pertencente a outro personal | Erro 422 + Log Auditoria | 🟢 PASS |
| **TC-09** | Restauração de Compras (Restore) | iOS / Android | Personal | Reestabelece PRO com compras ativas na loja | Entitlements restaurados | 🟢 PASS |
| **TC-10** | Criação e Edição de Treino | iOS / Android / Web | Personal | Salva divisões A/B/C, séries, repetições e cargas | Persistido com sucesso | 🟢 PASS |
| **TC-11** | Execução de Treino pelo Aluno | iOS / Android | Aluno | Registra séries executadas e evolução de carga | Histórico registrado | 🟢 PASS |
| **TC-12** | Avaliação Física (Pollock 7 Dobras) | iOS / Android / Web | Personal | Calcula densidade corporal e % gordura com precisão | Fórmulas ACSM validadas | 🟢 PASS |
| **TC-13** | Protocolo Conconi & Cardiorrespiratório | iOS / Android / Web | Personal | Identifica limiar anaeróbio e zonas de FC | Gráfico e cálculos exatos | 🟢 PASS |
| **TC-14** | Cálculo Metabólico de Hidratação | iOS / Android | Aluno | Calcula meta ACSM (35ml/kg + treino/clima) | Meta calculada | 🟢 PASS |
| **TC-15** | Assistente IA de Montagem de Treinos | iOS / Android / Web | Personal | Gera sugestões estruturadas por objetivo | Sugestão estruturada OK | 🟢 PASS |
| **TC-16** | Isolamento IDOR Personal A vs B | Backend / API | Personal | Personal A não visualiza nem edita dados de B | 403 Forbidden | 🟢 PASS |
| **TC-17** | Exclusão Definitiva de Conta | iOS / Android | Qualquer | Purga dados e sessões após reautenticação | Conta e dados excluídos | 🟢 PASS |
| **TC-18** | Tema Escuro Exclusivo | iOS / Android / Web | Todos | Resolve semântica visual para dark sem flash | Dark mode preservado | 🟢 PASS |

---

## 3. Testes de Carga e Performance por Rota

Executados 100 requisições concorrentes por endpoint principal:

* `/login`: 8.619 req/s | Média: 5.64ms | p95: 7.73ms
* `/(tabs)/student`: 3.368 req/s | Média: 14.66ms | p95: 22.69ms
* `/(tabs)/index`: 7.371 req/s | Média: 6.43ms | p95: 7.66ms
* `/admin-dashboard`: 76.728 req/s | Média: 0.58ms | p95: 0.61ms
* `/training-details`: 11.456 req/s | Média: 4.34ms | p95: 4.38ms
