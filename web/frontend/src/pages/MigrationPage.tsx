import React, { useEffect, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  HelpCircle,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Users,
  Dumbbell,
  ShieldCheck,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { migrationApi } from '../api/migrationApi';
import { MigrationBatch } from '../types';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';
import { MigrationWizardModal } from '../components/migration/MigrationWizardModal';
import { MigrationReportModal } from '../components/migration/MigrationReportModal';
import { Modal } from '../components/common/Modal';

export const MigrationPage: React.FC = () => {
  const [batches, setBatches] = useState<MigrationBatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [guides, setGuides] = useState<Record<string, any>>({});

  // Modais
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [selectedBatchForReport, setSelectedBatchForReport] = useState<MigrationBatch | null>(null);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState<boolean>(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);
  const [isGuidesModalOpen, setIsGuidesModalOpen] = useState<boolean>(false);

  // Formulário de Suporte
  const [supportSource, setSupportSource] = useState<string>('MFIT');
  const [supportStudents, setSupportStudents] = useState<string>('20');
  const [supportNotes, setSupportNotes] = useState<string>('');
  const [supportPhone, setSupportPhone] = useState<string>('');
  const [sendingSupport, setSendingSupport] = useState<boolean>(false);
  const [supportSuccessTicket, setSupportSuccessTicket] = useState<string | null>(null);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await migrationApi.getMigrations(statusFilter);
      setBatches(res.batches || []);
      setGuides(res.guides || {});
    } catch (err) {
      console.error('Falha ao carregar lotes de migração:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [statusFilter]);

  const handleDownloadTemplate = async (type: string) => {
    try {
      await migrationApi.downloadTemplate(type);
    } catch (err) {
      console.error(err);
      alert('Falha ao baixar planilha modelo.');
    }
  };

  const handleSendSupportRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingSupport(true);
    try {
      const res = await migrationApi.requestAssistedMigration({
        source: supportSource,
        estimatedStudents: parseInt(supportStudents, 10) || 10,
        notes: supportNotes,
        contactPhone: supportPhone,
      });
      setSupportSuccessTicket(res.ticket_id);
    } catch (err) {
      console.error(err);
      alert('Falha ao solicitar suporte.');
    } finally {
      setSendingSupport(false);
    }
  };

  // Contagens para os cards de estatísticas
  const totalBatches = batches.length;
  const awaitingReviewCount = batches.filter(
    (b) => b.status === 'awaiting_review' || b.status === 'parsed'
  ).length;
  const completedCount = batches.filter(
    (b) => b.status === 'completed' || b.status === 'completed_with_warnings'
  ).length;
  const rolledBackCount = batches.filter((b) => b.status === 'rolled_back').length;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Central de Migração Assistida
            </h1>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: 'rgba(217, 0, 0, 0.15)',
                color: 'var(--accent-red)',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              Exclusivo Web
            </span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            “Traga seus alunos para o DragonCorp sem começar do zero.”
          </p>
        </div>

        {/* Ações Primárias */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button
            type="button"
            onClick={() => setIsTemplatesModalOpen(true)}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '9px 14px' }}
          >
            <Download size={16} /> Planilhas Modelo
          </button>

          <button
            type="button"
            onClick={() => setIsGuidesModalOpen(true)}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '9px 14px' }}
          >
            <HelpCircle size={16} /> Guia Legal de Exportação
          </button>

          <button
            type="button"
            onClick={() => setIsSupportModalOpen(true)}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '9px 14px' }}
          >
            <Users size={16} /> Ajuda para Migrar
          </button>

          <button
            type="button"
            onClick={() => setIsWizardOpen(true)}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '9px 16px' }}
          >
            <Plus size={16} /> Nova Migração
          </button>
        </div>
      </div>

      {/* Banner de Garantia Fundamental */}
      <div
        style={{
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(234, 179, 8, 0.08)',
          border: '1px solid rgba(234, 179, 8, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <ShieldCheck size={26} style={{ color: '#EAB308', flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Princípio de Segurança DragonCorp:</strong>{' '}
          Arquivos enviados nunca são gravados diretamente nas tabelas definitivas. Os dados passam por validação, área de quarentena, detecção de homônimos e prévia antes de qualquer inserção. Treinos entram em modo rascunho e alunos com convite pendente.
        </div>
      </div>

      {/* Cards de Métricas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
        }}
      >
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Total de Lotes</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
            {totalBatches}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Histórico completo</div>
        </div>

        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Aguardando Revisão</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#EAB308', marginTop: 4 }}>
            {awaitingReviewCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Pendências ou homônimos</div>
        </div>

        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Concluídas com Sucesso</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#22C55E', marginTop: 4 }}>
            {completedCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Disponíveis no DragonCorp</div>
        </div>

        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Lotes Desfeitos (Rollback)</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-muted)', marginTop: 4 }}>
            {rolledBackCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Revertidos com segurança</div>
        </div>
      </div>

      {/* Tabela de Lotes com Filtro de Abas */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        {/* Abas */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '4px 16px',
            gap: 16,
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'all', label: 'Todos os Lotes' },
            { id: 'awaiting_review', label: 'Aguardando Revisão' },
            { id: 'completed', label: 'Concluídos' },
            { id: 'rolled_back', label: 'Desfeitos' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '12px 6px',
                border: 'none',
                background: 'transparent',
                color: statusFilter === tab.id ? 'var(--accent-red)' : 'var(--text-secondary)',
                fontWeight: statusFilter === tab.id ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                borderBottom: statusFilter === tab.id ? '2px solid var(--accent-red)' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo da Tabela */}
        {loading ? (
          <div style={{ padding: '40px 0' }}>
            <Loader text="Carregando histórico de migrações..." />
          </div>
        ) : batches.length === 0 ? (
          <EmptyState
            icon={UploadCloud}
            title="Nenhum lote de migração encontrado"
            description="Você ainda não importou arquivos de outros aplicativos ou planilhas. Comece agora para trazer seus alunos sem começar do zero."
            actionLabel="Iniciar Primeira Migração"
            onAction={() => setIsWizardOpen(true)}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 18px' }}>Lote / Data</th>
                  <th style={{ padding: '14px 18px' }}>Origem</th>
                  <th style={{ padding: '14px 18px' }}>Itens Detectados</th>
                  <th style={{ padding: '14px 18px' }}>Importados</th>
                  <th style={{ padding: '14px 18px' }}>Status</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const isCompleted = b.status === 'completed' || b.status === 'completed_with_warnings';
                  const isRolledBack = b.status === 'rolled_back';
                  const isAwaiting = b.status === 'awaiting_review' || b.status === 'parsed';

                  return (
                    <tr
                      key={b.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          #{b.id}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {new Date(b.created_at).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(b.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: 12,
                            fontWeight: 600,
                            backgroundColor: 'var(--bg-app)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {b.source.toUpperCase()}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                        <strong>{b.total_items}</strong> registros
                      </td>

                      <td style={{ padding: '14px 18px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {b.imported_items}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: 12,
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: isCompleted
                              ? 'rgba(34, 197, 94, 0.15)'
                              : isRolledBack
                              ? 'rgba(156, 163, 175, 0.15)'
                              : isAwaiting
                              ? 'rgba(234, 179, 8, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                            color: isCompleted
                              ? '#22C55E'
                              : isRolledBack
                              ? 'var(--text-muted)'
                              : isAwaiting
                              ? '#EAB308'
                              : '#EF4444',
                          }}
                        >
                          {isCompleted && <CheckCircle2 size={13} />}
                          {isRolledBack && <RotateCcw size={13} />}
                          {isAwaiting && <Clock size={13} />}
                          {b.status === 'completed'
                            ? 'Concluído'
                            : b.status === 'awaiting_review'
                            ? 'Aguardando Revisão'
                            : b.status === 'rolled_back'
                            ? 'Desfeito'
                            : b.status.toUpperCase()}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedBatchForReport(b)}
                          className="btn btn-secondary"
                          style={{
                            padding: '6px 12px',
                            fontSize: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <FileText size={14} /> Relatório
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Planilhas Modelo para Download */}
      <Modal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        title="Planilhas Modelo Oficiais para Download"
        maxWidth="680px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Utilize nossas planilhas pré-formatadas para organizar seus dados. Todas possuem cabeçalhos reconhecidos automaticamente pela nossa inteligência de importação:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            {[
              { type: 'students', name: 'modelo_alunos.csv', title: 'Modelo de Alunos', desc: 'Contatos, aniversários, objetivos e notas administrativas.' },
              { type: 'workouts', name: 'modelo_treinos.csv', title: 'Modelo de Treinos e Exercícios', desc: 'Divisões, séries, repetições, cargas em kg e descanso.' },
              { type: 'assessments', name: 'modelo_avaliacoes.csv', title: 'Modelo de Avaliações Físicas', desc: 'Protocolos, dobras cutâneas, peso e perímetros.' },
              { type: 'measurements', name: 'modelo_medidas.csv', title: 'Modelo de Perímetros e Circunferências', desc: 'Aferições corporais de evolução biométrica.' },
              { type: 'documents', name: 'modelo_documentos.csv', title: 'Mapeamento de PDFs e Fichas', desc: 'Associe arquivos PDF e laudos aos alunos corretos.' },
            ].map((tpl) => (
              <div
                key={tpl.type}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{tpl.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tpl.desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate(tpl.type)}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '7px 12px' }}
                >
                  <Download size={14} /> Baixar
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal de Guias Legais de Exportação */}
      <Modal
        isOpen={isGuidesModalOpen}
        onClose={() => setIsGuidesModalOpen(false)}
        title="Guia Legal de Obtenção de Dados"
        maxWidth="700px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(guides).map(([key, guide]: [string, any]) => (
            <div
              key={key}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <h4 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                {guide.name}
              </h4>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                {guide.description}
              </p>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {guide.steps.map((st: string, idx: number) => (
                  <li key={idx}>{st}</li>
                ))}
              </ol>
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-app)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                }}
              >
                {guide.legal_disclaimer}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Modal de Solicitação de Ajuda do Suporte */}
      <Modal
        isOpen={isSupportModalOpen}
        onClose={() => {
          setIsSupportModalOpen(false);
          setSupportSuccessTicket(null);
        }}
        title="Preciso de Ajuda para Migrar"
        maxWidth="540px"
      >
        {supportSuccessTicket ? (
          <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <CheckCircle2 size={42} style={{ color: '#22C55E' }} />
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Protocolo Criado com Sucesso!
            </h3>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Seu protocolo interno é: <strong>{supportSuccessTicket}</strong>. Nosso time de especialistas em migração entrará em contato em até 24 horas úteis.
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setIsSupportModalOpen(false);
                setSupportSuccessTicket(null);
              }}
              style={{ marginTop: 10 }}
            >
              Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendSupportRequest} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Nossos especialistas auxiliam você na transição segura dos seus alunos sem custo adicional.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Aplicativo ou Plataforma de Origem:
              </label>
              <select
                value={supportSource}
                onChange={(e) => setSupportSource(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              >
                <option value="MFIT">MFIT Personal</option>
                <option value="Avaliação Física PRO">Avaliação Física PRO</option>
                <option value="Planilhas Excel">Planilhas Excel / Google Sheets</option>
                <option value="PDFs e Fichas Impressas">PDFs e Fichas Impressas</option>
                <option value="Outro">Outro Aplicativo</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Quantidade Estimada de Alunos:
              </label>
              <input
                type="number"
                value={supportStudents}
                onChange={(e) => setSupportStudents(e.target.value)}
                min="1"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                WhatsApp para Contato Direto:
              </label>
              <input
                type="text"
                placeholder="(DDD) 99999-9999"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Observações ou Dúvidas:
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Tenho fichas em PDF e fotos de evolução antigas que gostaria de organizar..."
                value={supportNotes}
                onChange={(e) => setSupportNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  resize: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsSupportModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={sendingSupport}
              >
                {sendingSupport ? 'Enviando...' : 'Solicitar Protocolo'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Wizard de Migração */}
      <MigrationWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => fetchBatches()}
      />

      {/* Modal de Relatório do Lote */}
      <MigrationReportModal
        isOpen={!!selectedBatchForReport}
        batch={selectedBatchForReport}
        onClose={() => setSelectedBatchForReport(null)}
        onRollbackSuccess={() => fetchBatches()}
      />
    </div>
  );
};
