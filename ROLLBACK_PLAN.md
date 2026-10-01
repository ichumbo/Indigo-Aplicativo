# Plano de Rollout Gradual & Rollback de Produção — DragonCorp

Este documento define os procedimentos de liberação progressiva (staged rollout / phased release), monitoramento contínuo de métricas críticas e procedimentos operacionais de reversão e contingência.

---

## 1. Estratégia de Rollout Gradual

### 1.1 iOS (Phased Release no App Store Connect)
* **Dia 1:** 1% dos usuários automáticos
* **Dia 2:** 2%
* **Dia 3:** 5%
* **Dia 4:** 10%
* **Dia 5:** 20%
* **Dia 6:** 50%
* **Dia 7:** 100% (Liberação total)
* *Pausa de emergência disponível a qualquer momento pelo App Store Connect.*

### 1.2 Android (Staged Rollout no Google Play Console)
* **Estágio 1:** 5% dos usuários
* **Estágio 2:** 20% (após 24h sem anomalias de crash)
* **Estágio 3:** 50% (após 48h)
* **Estágio 4:** 100% (após 72h)

---

## 2. Indicadores Críticos de Monitoramento (Health Gates)

| Métrica | Limite de Alerta | Ação em Caso de Violação |
| :--- | :--- | :--- |
| **Taxa Livre de Travamentos (Crash-Free Sessions)** | < 99.0% | Pausar rollout imediatamente e analisar stack traces |
| **Taxa de Erro em Login / Autenticação** | > 2.0% das tentativas | Investigar indisponibilidade de banco/API |
| **Taxa de Falha em Validação de Assinaturas (IAP)** | > 1.0% das compras | Pausar rollout e verificar comunicação com Apple/Google |
| **Latência Média da API REST (p95)** | > 300ms | Escalar instâncias de backend / verificar queries lentas |

---

## 3. Matriz de Contingência e Procedimentos de Rollback

### Cenário A: Falha Crítica no Aplicativo Mobile (Crash Bloqueante)
1. **Pausar Rollout:** Entrar no Google Play Console / App Store Connect e pausar imediatamente o lançamento gradual.
2. **Avaliar Impacto:** Verificar se a falha afeta usuários já atualizados.
3. **Hotfix Release:**
   * Criar branch `hotfix/1.0.1` a partir da tag `v1.0.0`.
   * Corrigir o bug e executar a suíte completa de testes (`npm test`).
   * Incrementar o build number (`ios.buildNumber = "2"`, `android.versionCode = 4`).
   * Gerar nova build: `eas build --profile production`.
   * Submeter versão de correção em caráter de urgência (Expedited Review na Apple).

### Cenário B: Instabilidade no Backend ou Banco de Dados
1. O aplicativo mobile possui arquitetura resiliente offline: mantém dados no AsyncStorage e continua funcionando para consulta e execução local de treinos.
2. No servidor, executar reversão de container/código para a versão estável anterior:
   ```bash
   git checkout tags/v1.0.0-backend-stable
   php artisan config:cache
   php artisan route:cache
   ```
3. Se houver falha de migração de banco:
   ```bash
   php artisan migrate:rollback --step=1
   ```

### Cenário C: Indisponibilidade dos Serviços de Billing da Apple ou Google
1. O aplicativo utiliza fallback automático: não perde o estado do usuário e armazena transações pendentes no AsyncStorage (`@dragoncorp/pending_transactions_v1`) para retentativa na próxima abertura de tela.
2. O backend processa webhooks assíncronos das lojas assim que o serviço for restabelecido.
