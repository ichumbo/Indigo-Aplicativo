import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  RefreshCw, 
  Apple, 
  Smartphone, 
  Gift, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { adminClient } from '../../api/adminClient';
import { AdminSubscriptionItem } from '../../types/admin';
import { AdminConfirmModal } from '../../components/admin/AdminConfirmModal';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminSubscriptionsPage: React.FC = () => {
  const { isSuperAdmin, isFinancialAdmin } = useAdminAuth();

  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionItem[]>([]);
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState('');
  const [environment, setEnvironment] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [syncSub, setSyncSub] = useState<AdminSubscriptionItem | null>(null);
  const [revokeSub, setRevokeSub] = useState<AdminSubscriptionItem | null>(null);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [promoForm, setPromoForm] = useState({
    user_id: '',
    plan_id: 'pro',
    days: 30,
    reason: '',
  });

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (provider) params.append('provider', provider);
      if (environment) params.append('environment', environment);
      params.append('page', page.toString());

      const res = await adminClient.get(`/subscriptions?${params.toString()}`);
      setSubscriptions(res.data.data || []);
      setTotal(res.data.meta?.total || 0);
      setTotalPages(res.data.meta?.last_page || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao buscar assinaturas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [status, provider, environment, page]);

  const handleSyncConfirm = async (reason: string) => {
    if (!syncSub) return;
    await adminClient.post(`/subscriptions/${syncSub.id}/sync`, { reason });
    setSyncSub(null);
    fetchSubscriptions();
  };

  const handleRevokePromoConfirm = async (reason: string) => {
    if (!revokeSub) return;
    await adminClient.post(`/subscriptions/${revokeSub.id}/revoke-promo`, { reason });
    setRevokeSub(null);
    fetchSubscriptions();
  };

  const handleGrantPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminClient.post('/subscriptions/grant-promo', promoForm);
      setIsPromoOpen(false);
      setPromoForm({ user_id: '', plan_id: 'pro', days: 30, reason: '' });
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Falha ao conceder plano promocional.');
    }
  };

  const formatStatus = (s: string) => {
    switch (s) {
      case 'active': return <span className="admin-badge admin-badge-success">Ativa</span>;
      case 'trial': return <span className="admin-badge admin-badge-info">Trial (Teste)</span>;
      case 'grace_period': return <span className="admin-badge admin-badge-warning">Carência</span>;
      case 'cancelled': return <span className="admin-badge admin-badge-danger">Cancelada</span>;
      case 'expired': return <span className="admin-badge admin-badge-neutral">Expirada</span>;
      default: return <span className="admin-badge admin-badge-neutral">{s}</span>;
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Assinaturas & Lojas de Aplicativos</h1>
          <p className="admin-page-subtitle">
            Auditoria de In-App Purchases (Apple App Store e Google Play Store) e acessos promocionais.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {(isSuperAdmin || isFinancialAdmin) && (
            <button 
              className="admin-btn admin-btn-primary" 
              onClick={() => setIsPromoOpen(true)}
            >
              <Gift size={14} /> Conceder Acesso Promocional
            </button>
          )}
          <button 
            className="admin-btn admin-btn-secondary" 
            onClick={fetchSubscriptions}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'admin-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <select 
            value={status} 
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="admin-filter-select"
          >
            <option value="">Status da Assinatura: Todos</option>
            <option value="active">Ativas</option>
            <option value="trial">Em Teste (Trial)</option>
            <option value="grace_period">Período de Carência</option>
            <option value="cancelled">Canceladas</option>
            <option value="expired">Expiradas</option>
          </select>

          <select 
            value={provider} 
            onChange={(e) => { setProvider(e.target.value); setPage(1); }}
            className="admin-filter-select"
          >
            <option value="">Canal / Provedor: Todos</option>
            <option value="apple">Apple App Store</option>
            <option value="google">Google Play Store</option>
            <option value="admin">Administrativo / Promocional</option>
          </select>

          <select 
            value={environment} 
            onChange={(e) => { setEnvironment(e.target.value); setPage(1); }}
            className="admin-filter-select"
          >
            <option value="">Ambiente: Todos</option>
            <option value="production">Produção Oficial</option>
            <option value="sandbox">Sandbox / Testes</option>
          </select>

          {(status || provider || environment) && (
            <button
              className="admin-btn admin-btn-secondary"
              onClick={() => { setStatus(''); setProvider(''); setEnvironment(''); setPage(1); }}
            >
              Limpar Filtros
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
              <th>Usuário</th>
              <th>Plano</th>
              <th>Provedor</th>
              <th>Ambiente</th>
              <th>Status</th>
              <th>Vigência do Ciclo</th>
              <th>Última Validação</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <tr key={i}><td colSpan={8}><div className="admin-skeleton" style={{ height: 24, width: '100%' }} /></td></tr>
              ))
            ) : subscriptions.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="admin-empty-state">
                    <CreditCard size={32} color="#71717A" />
                    <div className="admin-empty-title">Nenhuma assinatura localizada</div>
                  </div>
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{sub.user?.name || 'Usuário'}</div>
                    <div style={{ fontSize: 11, color: '#71717A' }}>{sub.user?.email}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#FFFFFF', textTransform: 'uppercase', fontSize: 12 }}>
                      {sub.plan_id}
                    </div>
                    <div style={{ fontSize: 11, color: '#71717A' }}>
                      Limite: {sub.student_limit} alunos
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, textTransform: 'capitalize' }}>
                      {sub.provider === 'apple' && <Apple size={14} color="#FFFFFF" />}
                      {sub.provider === 'google' && <Smartphone size={14} color="#10B981" />}
                      {sub.provider === 'admin' && <ShieldCheck size={14} color="#F59E0B" />}
                      {sub.provider}
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      fontSize: 11, 
                      fontWeight: 600, 
                      color: sub.environment === 'production' ? '#10B981' : '#F59E0B',
                      backgroundColor: sub.environment === 'production' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      padding: '2px 6px',
                      borderRadius: 4
                    }}>
                      {sub.environment === 'production' ? 'PRODUÇÃO' : 'SANDBOX'}
                    </span>
                  </td>
                  <td>{formatStatus(sub.status)}</td>
                  <td style={{ fontSize: 12, color: '#A1A1AA' }}>
                    {sub.current_period_end ? (
                      <>Até {new Date(sub.current_period_end).toLocaleDateString('pt-BR')}</>
                    ) : (
                      <>Vitalício / Ilimitado</>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: '#71717A' }}>
                    {sub.last_verified_at ? new Date(sub.last_verified_at).toLocaleString('pt-BR') : 'Nunca'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: '6px 8px' }}
                        onClick={() => setSyncSub(sub)}
                        title="Revalidar e Sincronizar com a Loja Oficial"
                      >
                        <RotateCcw size={13} /> Sincronizar
                      </button>

                      {sub.provider === 'admin' && (
                        <button
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: '6px 8px', color: '#EF4444' }}
                          onClick={() => setRevokeSub(sub)}
                          title="Revogar Acesso Promocional"
                        >
                          Revogar
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
          Total de {total} assinaturas gerenciadas
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

      {/* Modal Grant Promo */}
      {isPromoOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <h3 className="admin-modal-title">Concessão Administrativa Promocional</h3>
            <p style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 14 }}>
              Libera temporariamente funcionalidades Pro ou VIP para o usuário com auditoria completa.
            </p>
            <form onSubmit={handleGrantPromo} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>UUID do Usuário</label>
                <input
                  type="text"
                  required
                  placeholder="ID do usuário..."
                  value={promoForm.user_id}
                  onChange={(e) => setPromoForm({ ...promoForm, user_id: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>Plano</label>
                  <select
                    value={promoForm.plan_id}
                    onChange={(e) => setPromoForm({ ...promoForm, plan_id: e.target.value })}
                    className="admin-filter-select"
                    style={{ width: '100%' }}
                  >
                    <option value="pro">Pro</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>Duração (Dias)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    required
                    value={promoForm.days}
                    onChange={(e) => setPromoForm({ ...promoForm, days: parseInt(e.target.value, 10) })}
                    className="admin-filter-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>Motivo da Concessão (Obrigatório)</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Justifique a cortesia ou resolução de suporte..."
                  value={promoForm.reason}
                  onChange={(e) => setPromoForm({ ...promoForm, reason: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setIsPromoOpen(false)}>Cancelar</button>
                <button type="submit" className="admin-btn admin-btn-primary">Conceder Acesso</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sync */}
      {syncSub && (
        <AdminConfirmModal
          isOpen={true}
          title="Sincronizar Assinatura com a Loja"
          impactNotice="O backend atualizará a data de verificação e revalidará os recibos com a App Store / Google Play."
          affectedUser={`Usuário: ${syncSub.user?.name} (Plano: ${syncSub.plan_id})`}
          confirmButtonText="Sincronizar Agora"
          onConfirm={handleSyncConfirm}
          onClose={() => setSyncSub(null)}
        />
      )}

      {/* Modal Revoke Promo */}
      {revokeSub && (
        <AdminConfirmModal
          isOpen={true}
          title="Revogar Acesso Promocional"
          impactNotice="O usuário retornará ao plano gratuito básico imediatamente."
          affectedUser={`Usuário: ${revokeSub.user?.name}`}
          confirmButtonText="Revogar Acesso"
          isDestructive={true}
          onConfirm={handleRevokePromoConfirm}
          onClose={() => setRevokeSub(null)}
        />
      )}
    </div>
  );
};
