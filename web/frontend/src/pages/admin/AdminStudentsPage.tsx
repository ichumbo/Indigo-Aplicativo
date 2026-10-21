import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  RefreshCw, 
  GraduationCap, 
  Eye, 
  Link2, 
  UserX, 
  UserCheck, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { adminClient } from '../../api/adminClient';
import { AdminUserListItem } from '../../types/admin';
import { AdminConfirmModal } from '../../components/admin/AdminConfirmModal';

export const AdminStudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  const [students, setStudents] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<{
    type: 'suspend' | 'reactivate';
    user: AdminUserListItem;
  } | null>(null);

  const fetchStudents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('role', 'STUDENT');
      if (search.trim()) params.append('search', search.trim());
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('per_page', perPage.toString());

      const res = await adminClient.get(`/users?${params.toString()}`);
      setStudents(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.last_page || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao buscar alunos cadastrados.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
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
    fetchStudents();
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Gestão de Alunos</h1>
          <p className="admin-page-subtitle">
            Acompanhamento de alunos, status de vinculação e suporte operacional.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            className="admin-btn admin-btn-secondary" 
            onClick={() => navigate('/admin/links')}
            title="Ir para tela de gerenciamento de vínculos"
          >
            <Link2 size={14} />
            Gerenciar Vínculos
          </button>
          <button 
            className="admin-btn admin-btn-secondary" 
            onClick={fetchStudents} 
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'admin-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: '#71717A' }} />
            <input
              type="text"
              placeholder="Buscar por nome, ID ou e-mail..."
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
            <option value="">Status: Todos</option>
            <option value="ACTIVE">Ativo</option>
            <option value="SUSPENDED">Suspenso</option>
            <option value="PENDING_REVIEW">Pendente</option>
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
              <th>Aluno</th>
              <th>Status</th>
              <th>Cadastro</th>
              <th>Último Acesso</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1, 2, 3, 4].map((i) => (
                <tr key={i}><td colSpan={5}><div className="admin-skeleton" style={{ height: 24, width: '100%' }} /></td></tr>
              ))
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-empty-state">
                    <GraduationCap size={32} color="#71717A" />
                    <div className="admin-empty-title">Nenhum aluno encontrado</div>
                  </div>
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%', 
                        backgroundColor: '#1E1E1E', 
                        border: '1px solid #3F3F46',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: 12,
                        color: '#3B82F6'
                      }}>
                        {s.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: 13 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: '#71717A' }}>{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`admin-badge ${s.status === 'ACTIVE' ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: '#A1A1AA' }}>
                    {s.created_at ? new Date(s.created_at).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td style={{ fontSize: 12, color: '#A1A1AA' }}>
                    {s.last_access_at ? new Date(s.last_access_at).toLocaleString('pt-BR') : 'Nunca'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: '6px 10px' }}
                        onClick={() => navigate(`/admin/users/${s.id}`)}
                      >
                        <Eye size={13} /> Perfil & Vínculo
                      </button>

                      {s.status === 'SUSPENDED' ? (
                        <button
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '6px 8px', color: '#10B981' }}
                          onClick={() => setActiveModal({ type: 'reactivate', user: s })}
                          title="Reativar Aluno"
                        >
                          <UserCheck size={13} />
                        </button>
                      ) : (
                        <button
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '6px 8px', color: '#EF4444' }}
                          onClick={() => setActiveModal({ type: 'suspend', user: s })}
                          title="Suspender Aluno"
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
          Total de {total} Alunos cadastrados
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
          title="Suspender Acesso do Aluno"
          impactNotice="O aluno não conseguirá acessar treinos ou enviar feedbacks até a reativação da conta."
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
          title="Reativar Conta do Aluno"
          impactNotice="O acesso do aluno ao aplicativo mobile DragonCorp será liberado imediatamente."
          affectedUser={`${activeModal.user.name} (${activeModal.user.email})`}
          confirmButtonText="Reativar Aluno"
          onConfirm={handleConfirmAction}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
};
