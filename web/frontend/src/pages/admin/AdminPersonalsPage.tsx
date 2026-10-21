import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  RefreshCw, 
  UserCheck, 
  UserX, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Users
} from 'lucide-react';
import { adminClient } from '../../api/adminClient';
import { AdminUserListItem } from '../../types/admin';
import { AdminConfirmModal } from '../../components/admin/AdminConfirmModal';

export const AdminPersonalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  const [personals, setPersonals] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<{
    type: 'suspend' | 'reactivate';
    user: AdminUserListItem;
  } | null>(null);

  const fetchPersonals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('role', 'TRAINER');
      if (search.trim()) params.append('search', search.trim());
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('per_page', perPage.toString());

      const res = await adminClient.get(`/users?${params.toString()}`);
      setPersonals(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.last_page || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao buscar Personals cadastrados.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPersonals();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, status, page, perPage]);

  const handleConfirmAction = async (reason: string) => {
    if (!activeModal) return;
    const { type, user } = activeModal;
    if (type === 'suspend') {
      await adminClient.post(`/users/${user.id}/suspend`, { reason });
    } else {
      await adminClient.post(`/users/${user.id}/reactivate`, { reason });
    }
    setActiveModal(null);
    fetchPersonals();
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Gestão de Personal Trainers</h1>
          <p className="admin-page-subtitle">
            Supervisão técnica, conformidade de CREF, uso de limites de alunos e assinaturas ativas.
          </p>
        </div>

        <button 
          className="admin-btn admin-btn-secondary" 
          onClick={fetchPersonals} 
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? 'admin-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Filter Bar */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: '#71717A' }} />
            <input
              type="text"
              placeholder="Buscar por nome, CREF, ID ou e-mail..."
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
            <option value="">Status da Conta: Todos</option>
            <option value="ACTIVE">Ativo</option>
            <option value="SUSPENDED">Suspenso</option>
            <option value="PENDING_REVIEW">Pendente de Revisão</option>
          </select>

          {(search || status) && (
            <button
              className="admin-btn admin-btn-secondary"
              onClick={() => { setSearch(''); setStatus(''); setPage(1); }}
            >
              Limpar
            </button>
          )}
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
              <th>Personal</th>
              <th>Status</th>
              <th>Plano DragonCorp</th>
              <th>Canal de Cobrança</th>
              <th>Data de Entrada</th>
              <th>Último Acesso</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1, 2, 3, 4].map((i) => (
                <tr key={i}><td colSpan={7}><div className="admin-skeleton" style={{ height: 24, width: '100%' }} /></td></tr>
              ))
            ) : personals.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="admin-empty-state">
                    <Users size={32} color="#71717A" />
                    <div className="admin-empty-title">Nenhum Personal Trainer localizado</div>
                  </div>
                </td>
              </tr>
            ) : (
              personals.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%', 
                        backgroundColor: '#1E1E1E', 
                        border: '1px solid #D90000',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: 12,
                        color: '#FFFFFF'
                      }}>
                        {p.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: 13 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#71717A' }}>{p.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`admin-badge ${p.status === 'ACTIVE' ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF' }}>{p.plan_id || 'Básico (Free)'}</div>
                    <div style={{ fontSize: 11, color: '#10B981' }}>{p.plan_status || 'ativo'}</div>
                  </td>
                  <td style={{ fontSize: 12, color: '#A1A1AA', textTransform: 'uppercase' }}>
                    {p.provider || 'admin'}
                  </td>
                  <td style={{ fontSize: 12, color: '#A1A1AA' }}>
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td style={{ fontSize: 12, color: '#A1A1AA' }}>
                    {p.last_access_at ? new Date(p.last_access_at).toLocaleString('pt-BR') : 'Nunca'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: '6px 10px' }}
                        onClick={() => navigate(`/admin/users/${p.id}`)}
                      >
                        <Eye size={13} /> Detalhes & Alunos
                      </button>

                      {p.status === 'SUSPENDED' ? (
                        <button
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '6px 8px', color: '#10B981' }}
                          onClick={() => setActiveModal({ type: 'reactivate', user: p })}
                          title="Reativar Personal"
                        >
                          <UserCheck size={13} />
                        </button>
                      ) : (
                        <button
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '6px 8px', color: '#EF4444' }}
                          onClick={() => setActiveModal({ type: 'suspend', user: p })}
                          title="Suspender Personal"
                        >
                          <UserX size={13} />
                        </button>
                      )}
                    </div>
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
          Total de {total} Personals Trainers cadastrados
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

      {/* Modal */}
      {activeModal && activeModal.type === 'suspend' && (
        <AdminConfirmModal
          isOpen={true}
          title="Suspender Personal Trainer"
          impactNotice="O treinador e seus alunos perderão acesso à sincronização de treinos até reativação."
          affectedUser={`${activeModal.user.name} (${activeModal.user.email})`}
          requiredConfirmText="SUSPENDER"
          confirmButtonText="Confirmar Suspensão"
          isDestructive={true}
          onConfirm={handleConfirmAction}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal && activeModal.type === 'reactivate' && (
        <AdminConfirmModal
          isOpen={true}
          title="Reativar Personal Trainer"
          impactNotice="O acesso do treinador e as consultorias serão reativadas imediatamente."
          affectedUser={`${activeModal.user.name} (${activeModal.user.email})`}
          confirmButtonText="Reativar Personal"
          onConfirm={handleConfirmAction}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
};
