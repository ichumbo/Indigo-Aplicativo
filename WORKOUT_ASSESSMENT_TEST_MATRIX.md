# DragonCorp — Matriz de Testes Funcionais: Treinos & Avaliações

| Módulo | Perfil | Plataforma | Ação | Resultado esperado | Resultado real | Status |
|---|---|---|---|---|---|---|
| **Treinos** | Personal | Web | Criar treino com sessões e múltiplos exercícios | Treino persistido no banco com sessões e exercícios vinculados | HTTP 201 Created, plano e sessões gravados em SQLite | **Aprovado** |
| **Treinos** | Personal | Web | Salvar como rascunho (`rascunho`) | Salva no banco sem notificar aluno; oculto para o aluno | Status 'rascunho', sem notificação emitida | **Aprovado** |
| **Treinos** | Personal | Web | Publicar treino (`ativo`) | Atualiza status e emite notificação imediata para o aluno | Aluno notificado e treino disponível via sync pull | **Aprovado** |
| **Treinos** | Personal | Web | Editar treino existente e adicionar Bi-Set | Exercícios e prescrições atualizados; combinação gravada | HTTP 200, Bi-Set persistido com combinationId | **Aprovado** |
| **Treinos** | Personal | Web | Duplicar treino para o mesmo aluno | Gera novos IDs e cria cópia sem afetar o original | HTTP 201, novos IDs gerados, original intacto | **Aprovado** |
| **Treinos** | Personal | Web | Arquivar treino | Status alterado para arquivado sem deletar execuções | Treino arquivado com histórico preservado | **Aprovado** |
| **Treinos** | Personal | Mobile | Criar sessão de treino com exercícios | Salva em AsyncStorage e sincroniza com backend | Sessão criada localmente e push efetuado | **Aprovado** |
| **Treinos** | Personal | Mobile | Reordenar exercícios na sessão | Ordem dos exercícios atualizada e persistida numericamente | Campo `order` reflete a nova sequência | **Aprovado** |
| **Treinos** | Aluno | Mobile | Sincronizar treinos do servidor | Recebe apenas treinos publicados do seu personal | Somente treinos ativos do personal correto carregados | **Aprovado** |
| **Treinos** | Aluno | Mobile | Aluno tenta acessar treino de outro personal | Bloqueado pelo backend com 403 Forbidden | HTTP 403 Forbidden retornado | **Aprovado** |
| **Treinos** | Aluno | Mobile | Executar treino e registrar cargas reais | Séries salvas e enviadas para o backend (`/sync/push`) | Cargas gravadas em `training_executed_sets` | **Aprovado** |
| **Treinos** | Aluno | Mobile | Finalizar treino com relato de dor | Treino concluído e alerta de dor emitido ao personal | Execução gravada e notificação gerada | **Aprovado** |
| **Treinos** | Personal | Web | Consultar evolução longitudinal do aluno | Visualiza cargas reais registradas pelo aluno | Dados reais exibidos sob `/evolution/{id}` | **Aprovado** |
| **Avaliações** | Personal | Web | Criar avaliação com Jackson & Pollock 7 | Calcula IMC, densidade, %G, massa gorda e magra | Fórmulas aplicadas com precisão e salvas no banco | **Aprovado** |
| **Avaliações** | Personal | Web | Criar avaliação com Bioimpedância | Grava indicadores de bioimpedância diretamente | Dados de composição corporal persistidos | **Aprovado** |
| **Avaliações** | Personal | Web | Comparar duas avaliações do mesmo aluno | Calcula deltas de peso, adiposidade e massa magra | Deltas calculados com precisão de 1 casa decimal | **Aprovado** |
| **Avaliações** | Personal | Web | Tentar comparar avaliações de alunos diferentes | Bloqueado com validação impeditiva | Erro retornado: alunos distintos | **Aprovado** |
| **Avaliações** | Personal | Mobile | Criar rascunho de avaliação | Persiste no store local e envia para o backend | Rascunho salvo com sucesso | **Aprovado** |
| **Avaliações** | Personal | Mobile | Concluir avaliação com fotos posturais | Exige consentimento do aluno e salva fotos protegidas | Consentimento validado e fotos salvas | **Aprovado** |
| **Avaliações** | Aluno | Mobile | Consultar histórico de avaliações | Aluno vê apenas suas avaliações concluídas e liberadas | Acesso concedido somente às avaliações autorizadas | **Aprovado** |
| **Avaliações** | Personal B | API | Tentar acessar avaliação de aluno do Personal A | Bloqueio IDOR com 403 Forbidden | HTTP 403 Forbidden | **Aprovado** |
| **Cálculos** | Sistema | Motor | Testar divisão por zero e altura zero | Retorna null sem lançar exceção ou Infinity | Proteção ativa contra NaN e Infinity | **Aprovado** |
| **Cálculos** | Sistema | Motor | Testar entrada com vírgula brasileira ("80,5") | Normaliza para float 80.5 e calcula corretamente | Normalização decimal 100% funcional | **Aprovado** |
| **Sincronia** | Sistema | Ambos | Pull-to-refresh e cache offline resiliente | App funciona offline e sincroniza quando online | AsyncStorage atua como cache com reconciliação | **Aprovado** |
