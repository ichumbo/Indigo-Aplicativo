import React, { useState } from 'react';
import {
  FileText,
  Users,
  Dumbbell,
  FileCheck2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Send,
  ExternalLink,
  X,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { MigrationBatch } from '../../types';
import { Modal } from '../common/Modal';
import { migrationApi } from '../../api/migrationApi';
import { useNavigate } from 'react-router-dom';

interface MigrationReportModalProps {
  batch: MigrationBatch | null;
  isOpen: boolean;
  onClose: () => void;
  onRollbackSuccess?: () => void;
}

export const MigrationReportModal: React.FC<MigrationReportModalProps> = ({
  batch,
  isOpen,
  onClose,
  onRollbackSuccess,
}) => {
  const navigate = useNavigate();
  const [isRollbackOpen, setIsRollbackOpen] = useState(false);
  const [rollbackReason, setRollbackReason] = useState('');
  const [rollingBack, setRollingBack] = useState(false);
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  if (!batch) return null;

  const summary = batch.execution_summary || {
    students_created: 0,
    students_linked: 0,
    workouts_created: 0,
    legacy_files_created: 0,
    items_ignored: 0,
  };

  const handleRollback = async () => {
    if (!batch) return;
    setRollingBack(true);
    setRollbackError(null);
    try {
      await migrationApi.rollbackMigration(batch.id, rollbackReason);
      setIsRollbackOpen(false);
      onRollbackSuccess?.();
      onClose();
    } catch (err: any) {
      setRollbackError(err?.response?.data?.message || 'Falha ao reverter a migração.');
    } finally {
      setRollingBack(false);
    }
  };

  const canRollback =
    (batch.status === 'completed' || batch.status === 'completed_with_warnings') &&
    !batch.rolled_back_at &&
    (!batch.rollback_until || new Date(batch.rollback_until) > new Date());

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Relatório de Migração" maxWidth="720px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header Summary */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: batch.rolled_back_at
                ? 'rgba(156, 163, 175, 0.1)'
                : 'rgba(34, 197, 94, 0.1)',
              border: `1px solid ${batch.rolled_back_at ? 'var(--border-subtle)' : 'rgba(34, 197, 94, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            {batch.rolled_back_at ? (
              <RotateCcw size={28} style={{ color: 'var(--text-muted)' }} />
            ) : (
              <CheckCircle2 size={28} style={{ color: '#22C55E' }} />
            )}
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                {batch.rolled_back_at ? 'Lote de Migração Desfeito' : 'Importação Concluída com Sucesso'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                Lote #{batch.id} • Origem: <strong>{batch.source.toUpperCase()}</strong> •{' '}
                {new Date(batch.created_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>

          {/* Grid de Estatísticas */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12,
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
                <Users size={16} /> Alunos Criados
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                {summary.students_created}
              </div>
              <div style={{ fontSize: 11, color: '#EAB308', marginTop: 2 }}>Convites pendentes</div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
                <Users size={16} /> Alunos Vinculados
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                {summary.students_linked}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Cadastros existentes</div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
                <Dumbbell size={16} /> Treinos Convertidos
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                {summary.workouts_created}
              </div>
              <div style={{ fontSize: 11, color: '#3B82F6', marginTop: 2 }}>Salvos em rascunho</div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
                <FileCheck2 size={16} /> Arquivos Legados
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                {summary.legacy_files_created}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Preservados intactos</div>
            </div>
          </div>

          {/* Avisos Importantes */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(234, 179, 8, 0.08)',
              border: '1px solid rgba(234, 179, 8, 0.25)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              display: 'flex',
              gap: 12,
            }}
          >
            <ShieldCheck size={20} style={{ color: '#EAB308', flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Regras de Integridade Aplicadas:</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                <li>Os alunos importados não receberam senhas automáticas e seus convites estão pendentes.</li>
                <li>Nenhum treino foi publicado diretamente no celular do aluno; todos estão em modo rascunho para sua conferência.</li>
                {canRollback && (
                  <li>Você pode desfazer esta migração até {new Date(batch.rollback_until!).toLocaleDateString('pt-BR')}.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Ações Seguintes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Próximos passos recomendados:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/alunos');
                }}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px' }}
              >
                <Send size={16} /> Enviar Convites aos Alunos
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/treinos');
                }}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px' }}
              >
                <Dumbbell size={16} /> Revisar Treinos em Rascunho
              </button>

              {canRollback && (
                <button
                  type="button"
                  onClick={() => setIsRollbackOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: '#EF4444',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    marginLeft: 'auto',
                  }}
                >
                  <RotateCcw size={16} /> Desfazer Migração
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmação de Rollback */}
      <Modal
        isOpen={isRollbackOpen}
        onClose={() => setIsRollbackOpen(false)}
        title="Desfazer Lote de Migração"
        maxWidth="500px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-md)',
              color: '#EF4444',
              fontSize: 13,
              display: 'flex',
              gap: 10,
            }}
          >
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Atenção:</strong> Esta ação removerá exclusivamente os cadastros de alunos, treinos e arquivos criados por este lote. Registros existentes antes da migração não serão apagados.
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              Motivo do Rollback (obrigatório para auditoria):
            </label>
            <textarea
              value={rollbackReason}
              onChange={(e) => setRollbackReason(e.target.value)}
              placeholder="Ex: Planilha continha dados desatualizados / Teste de migração"
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: 13,
                resize: 'none',
              }}
            />
          </div>

          {rollbackError && (
            <div style={{ color: '#EF4444', fontSize: 13 }}>{rollbackError}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsRollbackOpen(false)}
              disabled={rollingBack}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRollback}
              disabled={rollingBack || !rollbackReason.trim()}
              style={{
                backgroundColor: '#DC2626',
                color: '#fff',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                fontWeight: 600,
                cursor: rollingBack || !rollbackReason.trim() ? 'not-allowed' : 'pointer',
                opacity: rollingBack || !rollbackReason.trim() ? 0.6 : 1,
              }}
            >
              {rollingBack ? 'Revertendo...' : 'Confirmar Reversão'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
