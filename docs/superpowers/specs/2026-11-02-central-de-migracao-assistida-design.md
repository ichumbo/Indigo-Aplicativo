# Especificação de Design — Central de Migração Assistida (DragonCorp)

**Data:** 02/11/2026  
**Status:** Aprovado  
**Autor:** Antigravity Architect & Senior Full-Stack Engineer  
**Objetivo:** Permitir que o personal trainer importe dados de alunos, treinos, avaliações, arquivos e fotos de outros aplicativos (MFIT, Avaliação Física PRO, planilhas, PDFs, ZIPs) para o DragonCorp com segurança, revisão, rastreabilidade e rollback transacional garantido.

---

## 1. Princípio Fundamental e Arquitetura em Camadas

Nunca gravar arquivos importados diretamente nas tabelas definitivas da aplicação. Todos os dados passam por uma área temporária de staging (`migration_batches` e `migration_items`), validação de tipos, normalização canônica, resolução assistida de duplicidades e homônimos, conferência em prévia e inserção transacional auditada.

```text
Upload Seguro ──> Validação MIME & Quarentena ──> Parsing em Staging
                         │
                         ▼
             Detecção de Duplicidades & Mapeamento
                         │
                         ▼
             Revisão do Personal & Prévia Real
                         │
                         ▼
                 Confirmação Explícita
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
  Alunos (Convite Pendente)   Treinos (Rascunho)
  Avaliações Históricas      Arquivos Legados Preservados
           │
           ▼
  Relatório Final Verificável & Janela de Rollback
```

---

## 2. Modelo de Banco de Dados

### 2.1 Tabela `migration_batches`
Rastreia cada lote de migração iniciado pelo personal:
- `id`: string (ex: `mig-batch-xxxxxxxx`) — chave primária
- `trainer_id`: string (indexado) — vínculo obrigatório com `users.id`
- `source`: string — `mfit`, `avaliacao_fisica_pro`, `spreadsheet`, `pdf`, `images_zip`, `other`
- `status`: string — `uploaded`, `validating`, `parsed`, `awaiting_review`, `ready`, `importing`, `completed`, `completed_with_warnings`, `failed`, `cancelled`, `rolled_back`
- `source_files`: json — metadados dos arquivos (`original_name`, `stored_path`, `mime_type`, `size_bytes`, `sha256`)
- `column_mapping`: json — de/para de cabeçalhos configurados
- `total_items`: integer — total de registros detectados
- `imported_items`: integer — total gravado com sucesso
- `warning_items`: integer — total com alertas ou pendências
- `failed_items`: integer — total de falhas
- `conflict_resolutions`: json — mapa de decisões do personal para duplicidades
- `execution_summary`: json — resumo detalhado da execução
- `started_at`: timestamp nullable
- `completed_at`: timestamp nullable
- `rollback_until`: timestamp nullable — janela permitida para reversão (7 dias)
- `rolled_back_at`: timestamp nullable
- `rollback_reason`: string nullable
- `timestamps`

### 2.2 Tabela `migration_items`
Itens individuais de staging:
- `id`: string (ex: `mig-item-xxxxxxxx`) — chave primária
- `batch_id`: string (indexado, FK com cascade)
- `item_type`: string — `student`, `workout`, `assessment`, `document`, `photo`
- `external_id`: string nullable — identificador no sistema legado
- `raw_data`: json — conteúdo bruto original para auditoria
- `normalized_data`: json — estrutura canônica DragonCorp
- `match_status`: string — `new`, `exact_match`, `probable_match`, `conflict`, `ignored`, `invalid`
- `match_confidence`: integer — 0 a 100%
- `matched_entity_id`: string nullable — ID existente com o qual houve match
- `review_decision`: string nullable — `create_new`, `link_existing`, `merge_empty`, `override_fields`, `ignore`, `keep_as_legacy`
- `warnings`: json nullable — mensagens de inconsistência ou dados faltantes
- `errors`: json nullable — erros de validação
- `destination_id`: string nullable (indexado) — ID gerado no DragonCorp (chave para Rollback)
- `imported_at`: timestamp nullable
- `timestamps`

### 2.3 Tabela `legacy_imported_files`
Armazenamento seguro de arquivos que não puderam ser convertidos ou que devem ser preservados como histórico documental no perfil do aluno:
- `id`: string (ex: `leg-file-xxxxxxxx`) — chave primária
- `student_id`: string (indexado) — vínculo com `student_profiles.id`
- `trainer_id`: string (indexado) — vínculo com `users.id`
- `migration_batch_id`: string nullable (indexado)
- `category`: string — `workout_sheet`, `assessment`, `anamnesis`, `photo`, `report`, `document`, `unclassified`
- `original_name`: string
- `stored_path`: string — caminho privado seguro
- `file_size`: unsigned big integer
- `mime_type`: string
- `source_platform`: string
- `original_date`: date nullable
- `notes`: text nullable
- `conversion_status`: string — `raw_preserved`, `partially_parsed`, `manual_converted`
- `timestamps`

---

## 3. Regras de Negócio e Segurança

1. **Identificação e Homônimos de Alunos:**
   - E-mail e Telefone normalizados conferem **Correspondência Forte** (90-100%).
   - Nome + Data de Nascimento conferem **Correspondência Provável** (75-85%).
   - Mesmo Nome isolado confere **Revisão Obrigatória** (40-50%). NUNCA mesclar homônimos automaticamente. A ação padrão é sempre "Criar novo aluno" ou aguardar decisão do personal.
2. **Estado dos Alunos Importados:**
   - Cadastrados com `status = 'ativo'`, `invite_status = 'pending'` e `user_id = null`.
   - Nenhuma senha gerada no sistema sem autorização. O personal pode disparar convites individuais ou em lote via link, e-mail ou WhatsApp na conclusão da migração.
3. **Estado dos Treinos Importados:**
   - Criados como `TrainingPlan` com `status = 'rascunho'` e `TrainingSessionVersion` com `status = 'draft'`.
   - Nunca publicados silenciosamente para o app do aluno.
4. **Resolução de Exercícios:**
   - Correspondência por similaridade de texto e tabela de sinônimos/aliases.
   - Nomes com similaridade $\ge 85\%$ associam ao catálogo do DragonCorp.
   - Nomes desconhecidos tornam-se exercícios personalizados do personal (`exercise_catalog_id = null`), mantendo observações e cargas sem inventar vídeos falsos.
5. **Avaliações Físicas Históricas:**
   - Preservam protocolo original, data, dobras/perímetros brutos e resultados originais informados pela plataforma anterior.
   - Zero recálculo silencioso ou distorção do histórico.
6. **Controle de Assinatura (Freemium vs Pro):**
   - Validação prévia de capacidade antes da gravação definitiva. Se o plano Free for excedido (máximo 1 aluno ativo), o sistema interrompe a importação com aviso amigável e código `LIMIT_EXCEEDED`, permitindo ajuste de seleção ou upgrade para Pro.
7. **Rollback Transacional:**
   - O personal pode reverter o lote dentro de 7 dias, desde que os registros não tenham sido profundamente alterados.
   - O rollback busca exclusivamente os IDs listados em `migration_items.destination_id` e restaura dados anteriores auditados em `audit_logs`.

---

## 4. Endpoints da API REST (`/api/v1`)

- `GET /migrations`: Lista lotes de migração do personal.
- `GET /migrations/templates/{type}`: Download de planilhas modelo oficiais (alunos, treinos, avaliações).
- `POST /migrations/upload`: Upload de arquivo, validação e criação do lote.
- `GET /migrations/{id}`: Detalhes, status e progresso do lote.
- `GET /migrations/{id}/items`: Itens do lote de staging com paginação e filtros.
- `POST /migrations/{id}/map-columns`: Atualiza o mapeamento de campos.
- `POST /migrations/{id}/resolve-conflicts`: Atualiza as decisões do personal para inconsistências e duplicidades.
- `POST /migrations/{id}/confirm`: Executa a inserção definitiva dos dados aprovados.
- `POST /migrations/{id}/rollback`: Reverte cirurgicamente os registros criados pelo lote.
- `GET /students/{studentId}/legacy-files`: Lista arquivos legados vinculados ao aluno.
- `POST /students/{studentId}/legacy-files`: Anexa novo arquivo legado ao aluno.
- `GET /legacy-files/{id}/download`: Download seguro de arquivo legado com link temporário.
- `POST /migrations/assisted-request`: Abertura de chamado para suporte com migração assistida.

---

## 5. Interface Web do Personal

- **Acessos:**
  - Menu lateral: `Ferramentas -> Importar alunos e treinos` (ou `/migracao`).
  - Tela de Alunos: Botão de ação primária destacado `Importar alunos`.
  - Detalhe do Aluno: Nova aba `Arquivos Legados`.
- **Central de Migração (`/migracao`):**
  - Painel com resumo dos lotes (Em andamento, Aguardando revisão, Concluídos, Desfeitos).
  - Botão de Nova Migração e Acesso aos Templates para Download.
  - Wizard intuitivo de 11 passos (com agrupamento por etapas: Origem $\rightarrow$ Envio $\rightarrow$ Mapeamento $\rightarrow$ Resolução de Duplicidades $\rightarrow$ Prévia $\rightarrow$ Execução $\rightarrow$ Relatório & Convites).
- **Design System:** Total fidelidade ao padrão DragonCorp (#0D0D0E, #D90000, bordas sutis, tipografia limpa, responsividade completa para Desktop, Tablets e Smartphones).
