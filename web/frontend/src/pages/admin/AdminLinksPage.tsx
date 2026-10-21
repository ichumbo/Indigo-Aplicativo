import React, { useState, useEffect } from 'react';
import { 
  Link2, 
  ArrowRightLeft, 
  Search, 
  RefreshCw, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  UserCheck,
  GraduationCap
} from 'lucide-react';
import { adminClient } from '../../api/adminClient';
import { AdminLinkItem } from '../../types/admin';
import { AdminConfirmModal } from '../../components/admin/AdminConfirmModal';

export const AdminLinksPage: React.FC = () => {
  const [links, setLinks] = useState<AdminLinkItem[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [linkToEnd, setLinkToEnd] = useState<AdminLinkItem | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({ trainer_id: '', student_id: '', reason: '' });
  const [transferForm, setTransferForm] = useState({
    student_id: '',
    from_trainer_id: '',
    to_trainer_id: '',
    reason: '',
    confirm_text: '',
  });

  const fetchLinks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (status) params.append('status', status);
      params.append('page', page.toString());

      const res = await adminClient.get(`/links?${params.toString()}`);
      setLinks(res.data.data || []);
      setTotal(res.data.meta?.total || 0);
      setTotalPages(res.data.meta?.last_page || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao buscar vínculos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [search, status, page]);

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminClient.post('/links', createForm);
      setIsCreateOpen(false);
      setCreateForm({ trainer_id: '', student_id: '', reason: '' });
      fetchLinks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao criar vínculo.');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.confirm_text !== 'TRANSFERIR') {
      alert('Por favor digite TRANSFERIR para confirmar a operação.');
      return;
    }
    try {
      await adminClient.post('/links/transfer', transferForm);
      setIsTransferOpen(false);
      setTransferForm({ student_id: '', from_trainer_id: '', to_trainer_id: '', reason: '', confirm_text: '' });
      fetchLinks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro na transferência de aluno.');
    }
  };

  const handleEndLinkConfirm = async (reason: string) => {
    if (!linkToEnd) return;
    await adminClient.delete(`/links/${linkToEnd.id}`, { data: { reason } });
    setLinkToEnd(null);
    fetchLinks();
  };

  const openTransferWithLink = (link: AdminLinkItem) => {
    setTransferForm({
      student_id: link.student_id,
      from_trainer_id: link.trainer_id,
      to_trainer_id: '',
      reason: '',
      confirm_text: '',
    });
    setIsTransferOpen(true);
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Vínculos & Transferências de Alunos</h1>
          <p className="admin-page-subtitle">
            Governança da relação entre Personal Trainers e Alunos com suporte a transferência atômica com auditoria.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            className="admin-btn admin-btn-primary" 
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={14} /> Novo Vínculo
          </button>
          <button 
            className="admin-btn admin-btn-secondary" 
            onClick={() => setIsTransferOpen(true)}
          >
            <ArrowRightLeft size={14} /> Transferir Aluno
          </button>
          <button 
            className="admin-btn admin-btn-secondary" 
            onClick={fetchLinks}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'admin-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: '#71717A' }} />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail de Personal ou Aluno..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="admin-filter-input"
              style={{ width: '100%', paddingLeft: 36 }}
            />
          </div>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="admin-filter-select"
          >
            <option value="all">Status: Todos</option>
            <option value="active">Ativos</option>
            <option value="transferred">Transferidos</option>
            <option value="ended">Encerrados</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: 8, padding: 14, marginBottom: 18, color: '#FCA5A5' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Personal Trainer</th>
              <th>Aluno</th>
              <th>Status do Vínculo</th>
              <th>Data de Criação</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <tr key={i}><td colSpan={5}><div className="admin-skeleton" style={{ height: 24, width: '100%' }} /></td></tr>
              ))
            ) : links.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-empty-state">
                    <Link2 size={32} color="#71717A" />
                    <div className="admin-empty-title">Nenhum vínculo localizado</div>
                  </div>
                </td>
              </tr>
            ) : (
              links.map((link) => (
                <tr key={link.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{link.trainer_name}</div>
                    <div style={{ fontSize: 11, color: '#71717A' }}>{link.trainer_email}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{link.student_name}</div>
                    <div style={{ fontSize: 11, color: '#71717A' }}>{link.student_email}</div>
                  </td>
                  <td>
                    <span className={`admin-badge ${
                      link.status === 'active' 
                        ? 'admin-badge-success' 
                        : link.status === 'transferred' 
                          ? 'admin-badge-info' 
                          : 'admin-badge-neutral'
                    }`}>
                      {link.status === 'active' ? 'Ativo' : link.status === 'transferred' ? 'Transferido' : 'Encerrado'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: '#A1A1AA' }}>
                    {link.created_at ? new Date(link.created_at).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {link.status === 'active' && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '6px 8px' }}
                          onClick={() => openTransferWithLink(link)}
                          title="Transferir aluno para outro Personal"
                        >
                          <ArrowRightLeft size={13} /> Transferir
                        </button>
                        <button
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '6px 8px', color: '#EF4444' }}
                          onClick={() => setLinkToEnd(link)}
                          title="Encerrar Vínculo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="admin-pagination-bar">
        <div className="admin-pagination-info">
          Total de {total} registros de vínculo
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="admin-btn admin-btn-secondary"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          <button
            className="admin-btn admin-btn-secondary"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage(page + 1)}
          >
            Próxima <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Modal Create Link */}
      {isCreateOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <h3 className="admin-modal-title">Criar Vínculo Administrativo</h3>
            <p style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 16 }}>
              Conecta um aluno a um personal trainer na base DragonCorp.
            </p>
            <form onSubmit={handleCreateLink} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>ID do Personal Trainer</label>
                <input
                  type="text"
                  required
                  placeholder="UUID do personal trainer..."
                  value={createForm.trainer_id}
                  onChange={(e) => setCreateForm({ ...createForm, trainer_id: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>ID do Aluno</label>
                <input
                  type="text"
                  required
                  placeholder="UUID do aluno..."
                  value={createForm.student_id}
                  onChange={(e) => setCreateForm({ ...createForm, student_id: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>Motivo Administrativo (Auditoria)</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Justificativa da vinculação..."
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setIsCreateOpen(false)}>Cancelar</button>
                <button type="submit" className="admin-btn admin-btn-primary">Criar Vínculo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Transfer Link */}
      {isTransferOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <h3 className="admin-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ArrowRightLeft color="#D90000" size={20} />
              Transferência de Aluno
            </h3>
            <div style={{ 
              backgroundColor: 'rgba(217, 0, 0, 0.1)', 
              border: '1px solid rgba(217, 0, 0, 0.3)', 
              padding: 12, 
              borderRadius: 6, 
              fontSize: 12.5, 
              color: '#FCA5A5', 
              marginBottom: 14, 
              lineHeight: 1.4 
            }}>
              <strong>Atenção:</strong> O vínculo anterior será encerrado com status <code>transferred</code> e um novo vínculo será estabelecido em transação atômica no banco de dados.
            </div>

            <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>ID do Aluno</label>
                <input
                  type="text"
                  required
                  value={transferForm.student_id}
                  onChange={(e) => setTransferForm({ ...transferForm, student_id: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>ID do Personal Atual (Origem)</label>
                <input
                  type="text"
                  required
                  value={transferForm.from_trainer_id}
                  onChange={(e) => setTransferForm({ ...transferForm, from_trainer_id: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>ID do Novo Personal (Destino)</label>
                <input
                  type="text"
                  required
                  placeholder="UUID do novo treinador..."
                  value={transferForm.to_trainer_id}
                  onChange={(e) => setTransferForm({ ...transferForm, to_trainer_id: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>Motivo da Transferência</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Justifique a transferência..."
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>
                  Digite <strong style={{ color: '#EF4444' }}>TRANSFERIR</strong> para confirmar:
                </label>
                <input
                  type="text"
                  required
                  placeholder="TRANSFERIR"
                  value={transferForm.confirm_text}
                  onChange={(e) => setTransferForm({ ...transferForm, confirm_text: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setIsTransferOpen(false)}>Cancelar</button>
                <button 
                  type="submit" 
                  className="admin-btn admin-btn-danger"
                  disabled={transferForm.confirm_text !== 'TRANSFERIR'}
                >
                  Confirmar Transferência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal End Link */}
      {linkToEnd && (
        <AdminConfirmModal
          isOpen={true}
          title="Encerrar Vínculo Operacional"
          impactNotice="O aluno será desvinculado do Personal Trainer e precisará de novo convite ou atribuição para acessar consultorias."
          affectedUser={`Aluno: ${linkToEnd.student_name} / Personal: ${linkToEnd.trainer_name}`}
          confirmButtonText="Encerrar Vínculo"
          isDestructive={true}
          onConfirm={handleEndLinkConfirm}
          onClose={() => setLinkToEnd(null)}
        />
      )}
    </div>
  );
};
