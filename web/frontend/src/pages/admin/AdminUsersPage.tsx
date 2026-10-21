import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ShieldAlert, 
  UserX, 
  UserCheck, 
  KeyRound, 
  LogOut, 
  FileText, 
  AlertTriangle,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { adminClient } from '../../api/adminClient';
import { AdminUserListItem } from '../../types/admin';
import { AdminConfirmModal } from '../../components/admin/AdminConfirmModal';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSuperAdmin, hasPermission } = useAdminAuth();

  // Search & Filters State
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [role, setRole] = useState(searchParams.get('role') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [planStatus, setPlanStatus] = useState(searchParams.get('plan_status') || '');
  const [provider, setProvider] = useState(searchParams.get('provider') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [perPage, setPerPage] = useState(parseInt(searchParams.get('per_page') || '15', 10));

  // Data State
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [activeModal, setActiveModal] = useState<{
    type: 'suspend' | 'reactivate' | 'revoke' | 'reset_password' | 'anonymize';
    user: AdminUserListItem;
  } | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (role) params.append('role', role);
      if (status) params.append('status', status);
      if (planStatus) params.append('plan_status', planStatus);
      if (provider) params.append('provider', provider);
      params.append('page', page.toString());
      params.append('per_page', perPage.toString());

      const res = await adminClient.get(`/users?${params.toString()}`);
      setUsers(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.last_page || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao buscar usuários com os filtros aplicados.');
    } finally {
      setIsLoading(false);
    }
  }, [search, role, status, planStatus, provider, page, perPage]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(handler);
  }, [search, role, status, planStatus, provider, page, perPage, fetchUsers]);

  const handleClearFilters = () => {
    setSearch('');
    setRole('');
    setStatus('');
    setPlanStatus('');
    setProvider('');
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (role) params.append('role', role);
      if (status) params.append('status', status);
      const res = await adminClient.get(`/users/export?${params.toString()}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dragoncorp-usuarios-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert('Falha ao exportar CSV: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleConfirmAction = async (reason: string) => {
    if (!activeModal) return;
    const { type, user } = activeModal;

    if (type === 'suspend') {
      await adminClient.post(`/users/${user.id}/suspend`, { reason });
    } else if (type === 'reactivate') {
      await adminClient.post(`/users/${user.id}/reactivate`, { reason });
    } else if (type === 'revoke') {
      await adminClient.post(`/users/${user.id}/revoke-sessions`, { reason });
    } else if (type === 'reset_password') {
      await adminClient.post(`/users/${user.id}/password-reset`, { reason });
    } else if (type === 'anonymize') {
      await adminClient.post(`/users/${user.id}/anonymize`, { reason, confirmation: 'ANONIMIZAR' });
    }

    setActiveModal(null);
    fetchUsers();
  };

  const formatRole = (r: string) => {
    switch (r.toUpperCase()) {
      case 'TRAINER': return <span className="admin-badge admin-badge-info">Personal</span>;
      case 'STUDENT': return <span className="admin-badge admin-badge-neutral">Aluno</span>;
      case 'SUPER_ADMIN': return <span className="admin-badge admin-badge-danger">Super Admin</span>;
      case 'SUPPORT_ADMIN': return <span className="admin-badge admin-badge-warning">Suporte</span>;
      case 'FINANCIAL_ADMIN': return <span className="admin-badge admin-badge-warning">Financeiro</span>;
      default: return <span className="admin-badge admin-badge-neutral">{r}</span>;
    }
  };

  const formatStatus = (s: string) => {
    switch (s.toUpperCase()) {
      case 'ACTIVE': return <span className="admin-badge admin-badge-success">Ativo</span>;
      case 'SUSPENDED': return <span className="admin-badge admin-badge-danger">Suspenso</span>;
      case 'BLOCKED': return <span className="admin-badge admin-badge-danger">Bloqueado</span>;
      case 'PENDING_REVIEW': return <span className="admin-badge admin-badge-warning">Pendente</span>;
      case 'ANONYMIZED': return <span className="admin-badge admin-badge-neutral">Anonimizado</span>;
      default: return <span className="admin-badge admin-badge-neutral">{s}</span>;
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Gestão Central de Usuários</h1>
          <p className="admin-page-subtitle">
            Base completa de Personals, Alunos e Administradores com paginação no servidor.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            className="admin-btn admin-btn-secondary" 
            onClick={handleExport}
            title="Exportar base filtrada para CSV"
          >
            <Download size={14} />
            Exportar CSV
          </button>
          <button 
            className="admin-btn admin-btn-secondary" 
            onClick={fetchUsers} 
            disabled={isLoading}
            title="Recarregar"
          >
            <RefreshCw size={14} className={isLoading ? 'admin-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: '#71717A' }} />
            <input
              type="text"
              placeholder="Buscar por nome, ID, e-mail ou telefone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="admin-filter-input"
              style={{ width: '100%', paddingLeft: 36 }}
            />
          </div>

          {/* Role Filter */}
          <select 
            value={role} 
            onChange={(e) => { setRole(e.target.value); setPage(1); }}
            className="admin-filter-select"
          >
            <option value="">Perfil: Todos</option>
            <option value="TRAINER">Personals</option>
            <option value="STUDENT">Alunos</option>
            <option value="SUPER_ADMIN">Super Admins</option>
            <option value="SUPPORT_ADMIN">Suporte</option>
            <option value="FINANCIAL_ADMIN">Financeiro</option>
          </select>

          {/* Status Filter */}
          <select 
            value={status} 
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="admin-filter-select"
          >
            <option value="">Status: Todos</option>
            <option value="ACTIVE">Ativos</option>
            <option value="SUSPENDED">Suspensos</option>
            <option value="BLOCKED">Bloqueados</option>
            <option value="PENDING_REVIEW">Pendentes</option>
            <option value="ANONYMIZED">Anonimizados</option>
          </select>

          {/* Plan Status Filter */}
          <select 
            value={planStatus} 
            onChange={(e) => { setPlanStatus(e.target.value); setPage(1); }}
            className="admin-filter-select"
          >
            <option value="">Assinatura: Todas</option>
            <option value="active">Ativa</option>
            <option value="trial">Em Teste (Trial)</option>
            <option value="grace_period">Carência</option>
            <option value="cancelled">Cancelada</option>
            <option value="expired">Expirada</option>
          </select>

          {/* Provider Filter */}
          <select 
            value={provider} 
            onChange={(e) => { setProvider(e.target.value); setPage(1); }}
            className="admin-filter-select"
          >
            <option value="">Provedor: Todos</option>
            <option value="apple">Apple App Store</option>
            <option value="google">Google Play Store</option>
            <option value="admin">Administrativo / Promocional</option>
          </select>

          {/* Clear Filters Button */}
          {(search || role || status || planStatus || provider) && (
            <button
              className="admin-btn admin-btn-secondary"
              onClick={handleClearFilters}
              style={{ justifyContent: 'center' }}
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: 8, padding: 14, marginBottom: 18, color: '#FCA5A5' }}>
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Perfil</th>
              <th>Status</th>
              <th>Plano / Loja</th>
              <th>Data Cadastro</th>
              <th>Último Acesso</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td colSpan={7}>
                    <div className="admin-skeleton" style={{ height: 24, width: '100%' }} />
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="admin-empty-state">
                    <UserX size={36} color="#71717A" />
                    <div className="admin-empty-title">Nenhum usuário encontrado</div>
                    <div className="admin-empty-desc">Tente ajustar seus termos de pesquisa ou filtros.</div>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%', 
                        backgroundColor: '#262626', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: 12,
                        color: '#D90000',
                        border: '1px solid #3F3F46'
                      }}>
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: 13 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: '#71717A' }}>
                          {u.email} {u.phone ? `• ${u.phone}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{formatRole(u.role)}</td>
                  <td>{formatStatus(u.status)}</td>
                  <td>
                    <div style={{ fontSize: 12, color: '#E4E4E7' }}>{u.plan_id || 'Básico'}</div>
                    <div style={{ fontSize: 10.5, color: '#71717A', textTransform: 'capitalize' }}>
                      {u.provider} ({u.plan_status || 'sem assinatura'})
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: '#A1A1AA' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td style={{ fontSize: 12, color: '#A1A1AA' }}>
                    {u.last_access_at ? new Date(u.last_access_at).toLocaleString('pt-BR') : 'Nunca'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      {/* View Profile */}
                      <button
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: '6px 8px' }}
                        onClick={() => navigate(`/admin/users/${u.id}`)}
                        title="Abrir Perfil Administrativo Completo"
                      >
                        <Eye size={13} />
                        Detalhes
                      </button>

                      {/* Suspend or Reactivate */}
                      {u.status === 'SUSPENDED' ? (
                        <button
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '6px 8px', color: '#10B981' }}
                          onClick={() => setActiveModal({ type: 'reactivate', user: u })}
                          title="Reativar Conta"
                        >
                          <UserCheck size={13} />
                        </button>
                      ) : (
                        <button
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '6px 8px', color: '#EF4444' }}
                          onClick={() => setActiveModal({ type: 'suspend', user: u })}
                          title="Suspender Conta"
                        >
                          <UserX size={13} />
                        </button>
                      )}

                      {/* Revoke Sessions */}
                      <button
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: '6px 8px' }}
                        onClick={() => setActiveModal({ type: 'revoke', user: u })}
                        title="Desconectar todas as sessões e dispositivos"
                      >
                        <LogOut size={13} />
                      </button>

                      {/* Reset Password Request */}
                      <button
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: '6px 8px' }}
                        onClick={() => setActiveModal({ type: 'reset_password', user: u })}
                        title="Solicitar Redefinição Segura de Senha"
                      >
                        <KeyRound size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="admin-pagination-bar">
        <div className="admin-pagination-info">
          Mostrando {users.length} de {total} registros cadastrados
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <select
            value={perPage}
            onChange={(e) => { setPerPage(parseInt(e.target.value, 10)); setPage(1); }}
            className="admin-filter-select"
            style={{ width: 'auto', padding: '4px 8px' }}
          >
            <option value="15">15 por página</option>
            <option value="25">25 por página</option>
            <option value="50">50 por página</option>
            <option value="100">100 por página</option>
          </select>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="admin-btn admin-btn-secondary"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(page - 1)}
              style={{ padding: '6px 10px' }}
            >
              <ChevronLeft size={14} />
              Anterior
            </button>
            <button
              className="admin-btn admin-btn-secondary"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage(page + 1)}
              style={{ padding: '6px 10px' }}
            >
              Próxima
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      {activeModal && activeModal.type === 'suspend' && (
        <AdminConfirmModal
          isOpen={true}
          title="Suspender Conta de Usuário"
          impactNotice="O usuário perderá acesso imediato aos treinos, alunos e consultorias até reativação formal."
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
          title="Reativar Conta de Usuário"
          impactNotice="O acesso do usuário ao aplicativo e à plataforma web será restaurado imediatamente."
          affectedUser={`${activeModal.user.name} (${activeModal.user.email})`}
          confirmButtonText="Reativar Conta"
          onConfirm={handleConfirmAction}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal && activeModal.type === 'revoke' && (
        <AdminConfirmModal
          isOpen={true}
          title="Desconectar Todos os Dispositivos"
          impactNotice="Todos os tokens de autenticação deste usuário serão invalidados no backend. O usuário terá que autenticar novamente."
          affectedUser={`${activeModal.user.name} (${activeModal.user.email})`}
          confirmButtonText="Revogar Sessões"
          isDestructive={true}
          onConfirm={handleConfirmAction}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal && activeModal.type === 'reset_password' && (
        <AdminConfirmModal
          isOpen={true}
          title="Solicitar Redefinição de Senha"
          impactNotice="Um link seguro de troca de senha com validade de 60 minutos será gerado e enviado ao e-mail oficial do usuário."
          affectedUser={`${activeModal.user.name} (${activeModal.user.email})`}
          confirmButtonText="Enviar Link de Recuperação"
          onConfirm={handleConfirmAction}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
};
