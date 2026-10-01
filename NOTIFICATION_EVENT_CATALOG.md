# Catálogo de Eventos de Domínio & Templates de Notificação

Este documento cataloga todos os eventos de domínio suportados pelo sistema de notificações, respectivos destinatários, canais e templates.

---

## 1. Eventos de Agendamento (Appointments)

| Tipo de Evento | Destinatários Autorizados | Canais Padrão | Prioridade | Descrição / Gatilho |
| :--- | :--- | :--- | :---: | :--- |
| `appointment.created` | Profissional, Gestor | In-App, Push | High | Novo agendamento solicitado pelo cliente |
| `appointment.confirmed` | Cliente | In-App, Push, E-mail | High | Agendamento confirmado pelo profissional |
| `appointment.rejected` | Cliente | In-App, Push | High | Horário não pôde ser atendido |
| `appointment.awaiting_confirmation` | Cliente | In-App, Push | High | Solicitação de confirmação de presença prévia |
| `appointment.rescheduled` | Cliente, Profissional | In-App, Push | High | Horário ou data alterada (cancela lembretes antigos) |
| `appointment.cancelled` | Cliente, Profissional | In-App, Push | High | Cancelamento de horário (invalida lembretes pendentes) |
| `appointment.reminder_due` | Cliente | In-App, Push | High | Lembrete programado (ex: 24h, 2h antes) |
| `appointment.check_in_available` | Cliente | In-App, Push | Normal | Check-in por geolocalização / chegada liberado |
| `appointment.completed` | Cliente | In-App | Low | Finalização do serviço e solicitação de feedback |
| `appointment.no_show` | Profissional, Gestor | In-App, Push | Normal | Registro de não comparecimento do cliente |
| `appointment.waitlist_spot_available` | Cliente na Lista | In-App, Push | Urgent | Horário liberado para confirmação rápida |
| `appointment.waitlist_spot_expired` | Cliente na Lista | In-App | Normal | Prazo da lista de espera expirado |

---

## 2. Eventos Financeiros & Pagamentos (Payments)

| Tipo de Evento | Destinatários Autorizados | Canais Padrão | Prioridade | Descrição / Gatilho |
| :--- | :--- | :--- | :---: | :--- |
| `payment.requested` | Cliente | In-App, Push | High | Solicitação de pagamento para confirmar reserva |
| `payment.pix_generated` | Cliente | In-App, Push | High | Chave PIX copia-e-cola emitida |
| `payment.pix_expiring` | Cliente | In-App, Push | High | PIX com menos de 10 minutos para expiração |
| `payment.approved` | Cliente, Gestor | In-App, Push | High | Confirmação de recebimento |
| `payment.failed` | Cliente | In-App, Push | High | Recusa de cartão ou expiração de chave |
| `payment.refunded` | Cliente, Gestor | In-App, Push | Normal | Estorno financeiro concluído |
| `payment.daily_closure` | Gestor, Administrador | In-App, Push | Normal | Resumo financeiro consolidado do dia |

---

## 3. Eventos de Assinatura do SaaS (Subscriptions)

| Tipo de Evento | Destinatários Autorizados | Canais Padrão | Prioridade | Descrição / Gatilho |
| :--- | :--- | :--- | :---: | :--- |
| `subscription.trial_expiring` | Gestor / Personal | In-App, Push | High | Aviso de término do período de teste |
| `subscription.activated` | Gestor / Personal | In-App, Push | High | Ativação do Plano PRO |
| `subscription.renewed` | Gestor / Personal | In-App | Normal | Renovação periódica confirmada na loja |
| `subscription.failed_to_renew` | Gestor / Personal | In-App, Push | Urgent | Falha na renovação (período de tolerância) |
| `subscription.expired` | Gestor / Personal | In-App, Push | Urgent | Suspensão do acesso premium |
| `subscription.limit_reached` | Gestor / Personal | In-App, Push | High | Tentativa de cadastrar além do limite do plano |

---

## 4. Eventos de Segurança da Conta (Security)

| Tipo de Evento | Destinatários Autorizados | Canais Padrão | Prioridade | Descrição / Gatilho |
| :--- | :--- | :--- | :---: | :--- |
| `security.new_login` | Usuário da Conta | In-App, Push, E-mail | Urgent | Login em novo dispositivo ou IP |
| `security.password_changed` | Usuário da Conta | In-App, Push, E-mail | High | Confirmação de redefinição de senha |
| `security.password_reset_requested` | Usuário da Conta | E-mail | High | Link/código para recuperação de senha |
| `security.suspicious_activity` | Usuário da Conta, Admin | In-App, Push | Urgent | Bloqueio temporário por tentativas inválidas |
| `security.account_deletion_requested` | Usuário da Conta | In-App, E-mail | Urgent | Protocolo de exclusão de dados e conta |

---

## 5. Variáveis Suportadas nos Templates

* `{{clientName}}`: Nome do cliente / aluno.
* `{{professionalName}}`: Nome do profissional / treinador.
* `{{businessName}}`: Nome da empresa / consultoria.
* `{{serviceName}}`: Nome do serviço ou plano de treino.
* `{{appointmentDate}}`: Data formatada (ex: `15/10/2026`).
* `{{appointmentTime}}`: Horário formatado (ex: `14:30`).
* `{{unitName}}`: Nome da unidade ou endereço de atendimento.
* `{{formattedAmount}}`: Valor monetário formatado (ex: `R$ 150,00`).
* `{{timeRemaining}}`: Tempo restante (ex: `2 horas`, `30 minutos`).
