# Matriz de Testes & Validação do Sistema de Notificações

Este documento consolida os testes unitários, integrados e de ponta a ponta aplicados ao motor de notificações.

---

## 1. Cobertura dos Casos de Teste Automatizados

| ID | Cenário de Teste | Camada | Resultado Esperado | Status |
| :--- | :--- | :---: | :--- | :---: |
| **NT-01** | Interpolação Segura de Templates | Unitário | Substituição de variáveis sem injeção de HTML/scripts | 🟢 PASS |
| **NT-02** | Deduplicação & Idempotência | Unitário | Eventos com mesma chave determinística não duplicam entregas | 🟢 PASS |
| **NT-03** | Horário Silencioso (Quiet Hours) | Unitário | Notificações normais suprimidas entre 22h e 07h; alertas urgentes permitidos | 🟢 PASS |
| **NT-04** | Cancelamento de Lembretes Obsoletos | Unitário / Integração | Reagendar ou cancelar agendamento cancela entregas pendentes | 🟢 PASS |
| **NT-05** | Isolamento Multiempresa / Multitenant | Segurança | Notificações do Tenant A nunca vazam para usuários do Tenant B | 🟢 PASS |
| **NT-06** | RBAC & Governança Financeira | Segurança | Clientes e profissionais sem cargo não recebem resumos financeiros | 🟢 PASS |
| **NT-07** | Revogação de Device Token no Logout | Segurança | Logout desativa o push token do aparelho impedindo recebimento indevido | 🟢 PASS |
| **NT-08** | Sincronização de Badges (iOS e Android) | Mobile Nativo | Badge do app reflete contagem real de não lidas do backend | 🟢 PASS |
| **NT-09** | Canais Android com Prioridades | Mobile Nativo | Canais criados com importância correta (High/Max) e cores oficiais | 🟢 PASS |
| **NT-10** | Filtros e Marcação em Massa na Central | Web & Mobile | Marcar todas como lidas zera o contador de não lidas | 🟢 PASS |

---

## 2. Cenários Críticos Validados

1. **Reagendamento:** Cancela automaticamente o lembrete anterior e programa o novo no fuso correto.
2. **Cancelamento:** Marca todas as entregas futuras associadas como `cancelled`.
3. **Logout:** Remove o vínculo do `ExponentPushToken` / `APNs` / `FCM` com o usuário anterior.
4. **Troca de Usuário no Mesmo Aparelho:** O novo usuário não recebe notificações pendentes da sessão anterior.
5. **Falhas Temporárias do Provedor:** O Outbox registra tentativa e agenda reprocessamento com backoff exponencial.
