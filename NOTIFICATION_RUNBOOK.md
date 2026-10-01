# Runbook Operacional de Notificações — Suporte & Monitoramento

Este documento descreve procedimentos operacionais para diagnóstico, resolução de falhas, tratamento de tokens inválidos e reprocessamento de filas de notificações.

---

## 1. Monitoramento e Métricas de Saúde

| Indicador | Limite Aceitável | Ação em Caso de Anomalia |
| :--- | :--- | :--- |
| **Taxa de Falha de Envio (Push)** | < 1.5% das entregas | Verificar status dos servidores Expo/APNs/FCM |
| **Tokens Inválidos (`DeviceNotRegistered`)** | < 5.0% | Executar job de purga e desativação de tokens órfãos |
| **Atraso na Fila de Outbox** | < 60 segundos | Escalar workers do backend |
| **Erros de Idempotência Rejeitados** | Normal quando repetidos | Investigar se o frontend está disparando múltiplos cliques |

---

## 2. Tratamento de Tokens Inválidos (`DeviceNotRegistered` / `NotRegistered`)

Quando o provedor (Apple ou Google) responde com erro indicando que o app foi desinstalado ou o token expirou:

1. O worker de notificações identifica o código de retorno da loja (`DeviceNotRegistered`).
2. O token de dispositivo é marcado como `isActive: false` e `revokedAt: now()` na tabela `device_tokens`.
3. O sistema evita novos disparos para esse token até que o usuário reinstale e registre um novo token válido.

---

## 3. Procedimento de Reprocessamento de Entregas com Falha

Se ocorrer uma instabilidade temporária na internet ou no gateway:

1. Entregas no estado `failed` com `attempts < maxAttempts` são automaticamente movidas para `retrying` com backoff exponencial (1min, 5min, 15min).
2. Para forçar o reprocessamento manual via CLI do backend:
   ```bash
   php artisan notifications:retry-failed --limit=100
   ```
3. Registros que atingirem `maxAttempts` (3 tentativas) são arquivados como falhas permanentes no log de auditoria (`AuditLog`).
