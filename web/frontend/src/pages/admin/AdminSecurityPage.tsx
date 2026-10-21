import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  LogOut, 
  RefreshCw, 
  Laptop, 
  Smartphone, 
  AlertTriangle,
  Lock,
  Eye,
  KeyRound,
  Shield
} from 'lucide-react';
import { adminClient } from '../../api/adminClient';
import { AdminUser, AdminSessionItem } from '../../types/admin';
import { AdminConfirmModal } from '../../components/admin/AdminConfirmModal';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminSecurityPage: React.FC = () => {
  const { isSuperAdmin } = useAdminAuth();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [sessions, setSessions] = useState<AdminSessionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'admins' | 'sessions'>('admins');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Create Admin
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SUPPORT_ADMIN',
    reason: '',
  });

  // Modal Revoke Session
  const [sessionToRevoke, setSessionToRevoke] = useState<AdminSessionItem | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [adminsRes, sessionsRes] = await Promise.all([
        adminClient.get('/security/admins'),
        adminClient.get('/security/sessions'),
      ]);
      setAdmins(adminsRes.data.data || []);
      setSessions(sessionsRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao carregar dados de segurança.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminClient.post('/security/admins', newAdminForm);
      setIsCreateAdminOpen(false);
      setNewAdminForm({ name: '', email: '', password: '', role: 'SUPPORT_ADMIN', reason: '' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Falha ao cadastrar administrador.');
    }
  };

  const handleRevokeSessionConfirm = async (reason: string) => {
    if (!sessionToRevoke) return;
    await adminClient.post(`/security/sessions/${sessionToRevoke.id}/revoke`, { reason });
    setSessionToRevoke(null);
    fetchData();
  };

  const formatRole = (r: string) => {
    switch (r) {
      case 'SUPER_ADMIN': return <span className="admin-badge admin-badge-danger">Super Admin</span>;
      case 'SUPPORT_ADMIN': return <span className="admin-badge admin-badge-info">Suporte & Atendimento</span>;
      case 'FINANCIAL_ADMIN': return <span className="admin-badge admin-badge-warning">Financeiro</span>;
      default: return <span className="admin-badge admin-badge-neutral">Somente Leitura</span>;
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Segurança, Administradores & Sessões</h1>
          <p className="admin-page-subtitle">
            Gerenciamento de papéis RBAC, contas administrativas e encerramento forçado de sessões.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {isSuperAdmin && (
            <button 
              className="admin-btn admin-btn-primary" 
              onClick={() => setIsCreateAdminOpen(true)}
            >
              <UserPlus size={14} /> Novo Administrador
            </button>
          )}
          <button 
            className="admin-btn admin-btn-secondary" 
            onClick={fetchData} 
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'admin-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: 8, padding: 14, marginBottom: 18, color: '#FCA5A5' }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs-nav">
        <button
          className={`admin-tab-btn ${activeTab === 'admins' ? 'active' : ''}`}
          onClick={() => setActiveTab('admins')}
        >
          Administradores Credenciados ({admins.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          Sessões Ativas ({sessions.length})
        </button>
      </div>

      {/* Tab 1: Administradores */}
      {activeTab === 'admins' && (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Administrador</th>
                <th>Papel de Segurança (RBAC)</th>
                <th>Status</th>
                <th>Data de Criação</th>
                <th>Último Acesso</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((adm) => (
                <tr key={adm.id}>
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
                        fontWeight: 700,
                        fontSize: 12,
                        color: '#D90000'
                      }}>
                        {adm.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{adm.name}</div>
                        <div style={{ fontSize: 11, color: '#71717A' }}>{adm.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{formatRole(adm.role)}</td>
                  <td>
                    <span className="admin-badge admin-badge-success">Ativo</span>
                  </td>
                  <td style={{ fontSize: 12, color: '#A1A1AA' }}>
                    {adm.created_at ? new Date(adm.created_at).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td style={{ fontSize: 12, color: '#A1A1AA' }}>
                    {adm.last_access_at ? new Date(adm.last_access_at).toLocaleString('pt-BR') : 'Nunca'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Sessões Ativas */}
      {activeTab === 'sessions' && (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuário Conectado</th>
                <th>Perfil</th>
                <th>Endereço IP</th>
                <th>Navegador / Dispositivo</th>
                <th>Última Atividade</th>
                <th style={{ textAlign: 'right' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="admin-empty-state">
                      <ShieldCheck size={32} color="#10B981" />
                      <div className="admin-empty-title">Nenhuma sessão registrada</div>
                    </div>
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{s.user_name}</div>
                      <div style={{ fontSize: 11, color: '#71717A' }}>{s.user_email}</div>
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-neutral">{s.user_role}</span>
                    </td>
                    <td style={{ fontSize: 12, color: '#D4D4D8', fontFamily: 'monospace' }}>
                      {s.ip_address || '127.0.0.1'}
                    </td>
                    <td style={{ fontSize: 11, color: '#71717A', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.user_agent || 'App / Browser'}
                    </td>
                    <td style={{ fontSize: 12, color: '#A1A1AA' }}>
                      {new Date(s.last_activity_at).toLocaleString('pt-BR')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: '6px 8px', color: '#EF4444' }}
                        onClick={() => setSessionToRevoke(s)}
                        title="Encerrar Sessão Imediatamente"
                      >
                        <LogOut size={13} /> Encerrar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Create Admin */}
      {isCreateAdminOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <h3 className="admin-modal-title">Cadastrar Novo Administrador</h3>
            <p style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 14 }}>
              Cria credencial administrativa com perfil de permissões estrito e auditoria.
            </p>
            <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do operador..."
                  value={newAdminForm.name}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>E-mail Corporativo</label>
                <input
                  type="email"
                  required
                  placeholder="admin@dragoncorp.app"
                  value={newAdminForm.email}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>Senha Forte (Mínimo 8 caracteres)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  value={newAdminForm.password}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>Papel de Segurança (RBAC)</label>
                <select
                  value={newAdminForm.role}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, role: e.target.value })}
                  className="admin-filter-select"
                  style={{ width: '100%' }}
                >
                  <option value="SUPPORT_ADMIN">Suporte & Atendimento</option>
                  <option value="FINANCIAL_ADMIN">Gestão Financeira & Lojas</option>
                  <option value="READONLY_ADMIN">Somente Leitura</option>
                  <option value="SUPER_ADMIN">Super Administrador (Acesso Total)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>Motivo da Criação (Auditoria)</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Justifique o credenciamento deste operador..."
                  value={newAdminForm.reason}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, reason: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setIsCreateAdminOpen(false)}>Cancelar</button>
                <button type="submit" className="admin-btn admin-btn-primary">Criar Administrador</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Revoke Session */}
      {sessionToRevoke && (
        <AdminConfirmModal
          isOpen={true}
          title="Encerrar Sessão Remota"
          impactNotice="O usuário será desconectado imediatamente do dispositivo e precisará fazer novo login."
          affectedUser={`${sessionToRevoke.user_name} (${sessionToRevoke.ip_address})`}
          confirmButtonText="Encerrar Sessão"
          isDestructive={true}
          onConfirm={handleRevokeSessionConfirm}
          onClose={() => setSessionToRevoke(null)}
        />
      )}
    </div>
  );
};
