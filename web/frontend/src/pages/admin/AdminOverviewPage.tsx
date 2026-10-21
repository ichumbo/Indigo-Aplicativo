import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  GraduationCap, 
  CreditCard, 
  AlertTriangle, 
  RefreshCw, 
  TrendingUp, 
  ShieldAlert, 
  Smartphone,
  Apple,
  CheckCircle2,
  Clock,
  Activity
} from 'lucide-react';
import { adminClient } from '../../api/adminClient';
import { AdminDashboardMetrics } from '../../types/admin';

export const AdminOverviewPage: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [period, setPeriod] = useState<string>('30d');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async (selectedPeriod = period) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminClient.get(`/dashboard?period=${selectedPeriod}`);
      setMetrics(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao carregar métricas reais do painel.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(period);
  }, [period]);

  const formatDateTime = (iso?: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('pt-BR');
  };

  return (
    <div>
      {/* Top Bar with Period Selector and Refresh */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Visão Geral Operacional</h1>
          <p className="admin-page-subtitle">
            Telemetria em tempo real e integridade da base DragonCorp.
            {metrics?.last_updated_at && (
              <span style={{ marginLeft: 8, color: '#71717A' }}>
                Atualizado em: {formatDateTime(metrics.last_updated_at)}
              </span>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="admin-tabs-nav" style={{ marginBottom: 0 }}>
            {[
              { id: 'today', label: 'Hoje' },
              { id: '7d', label: '7 dias' },
              { id: '30d', label: '30 dias' },
              { id: '90d', label: '90 dias' },
              { id: 'all', label: 'Todos' },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`admin-tab-btn ${period === tab.id ? 'active' : ''}`}
                onClick={() => setPeriod(tab.id)}
                disabled={isLoading}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            className="admin-btn admin-btn-secondary"
            onClick={() => fetchMetrics(period)}
            disabled={isLoading}
            title="Recarregar Métricas Reais"
          >
            <RefreshCw size={14} className={isLoading ? 'admin-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Error state with retry */}
      {error && (
        <div style={{ 
          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid #EF4444', 
          borderRadius: 8, 
          padding: '16px 20px', 
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle color="#EF4444" size={20} />
            <span style={{ color: '#FCA5A5', fontSize: 13.5 }}>{error}</span>
          </div>
          <button className="admin-btn admin-btn-secondary" onClick={() => fetchMetrics(period)}>
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !metrics && (
        <div className="admin-kpi-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="admin-kpi-card" style={{ height: 130 }}>
              <div className="admin-skeleton" style={{ width: '60%', height: 16, marginBottom: 12 }} />
              <div className="admin-skeleton" style={{ width: '40%', height: 32, marginBottom: 8 }} />
              <div className="admin-skeleton" style={{ width: '80%', height: 12 }} />
            </div>
          ))}
        </div>
      )}

      {/* KPIs Grid */}
      {metrics && (
        <>
          <div className="admin-kpi-grid">
            {/* Total Users */}
            <div className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-title">Total de Usuários</span>
                <div className="admin-kpi-icon-box">
                  <Users size={15} color="#D90000" />
                </div>
              </div>
              <div className="admin-kpi-value">{metrics.users.total.toLocaleString()}</div>
              <div className="admin-kpi-footer">
                <span style={{ color: '#E4E4E7', fontWeight: 600 }}>{metrics.users.trainers} Personals</span>
                <span>•</span>
                <span style={{ color: '#E4E4E7', fontWeight: 600 }}>{metrics.users.students} Alunos</span>
              </div>
            </div>

            {/* Linked vs Unlinked Students */}
            <div className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-title">Vínculos de Alunos</span>
                <div className="admin-kpi-icon-box">
                  <GraduationCap size={15} color="#60A5FA" />
                </div>
              </div>
              <div className="admin-kpi-value">{metrics.users.linked_students.toLocaleString()}</div>
              <div className="admin-kpi-footer">
                <span style={{ color: '#34D399' }}>{metrics.users.linked_students} com personal</span>
                <span>•</span>
                <span style={{ color: '#FBBF24' }}>{metrics.users.unlinked_students} sem vínculo</span>
              </div>
            </div>

            {/* Active / Suspended / Pending */}
            <div className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-title">Status Operacional</span>
                <div className="admin-kpi-icon-box">
                  <Activity size={15} color="#34D399" />
                </div>
              </div>
              <div className="admin-kpi-value">
                {metrics.users.active.toLocaleString()}{' '}
                <span style={{ fontSize: 13, color: '#34D399', fontWeight: 600 }}>Ativos</span>
              </div>
              <div className="admin-kpi-footer">
                <span style={{ color: '#F87171' }}>{metrics.users.suspended} Suspensos</span>
                <span>•</span>
                <span style={{ color: '#FBBF24' }}>{metrics.users.pending} Pendentes</span>
              </div>
            </div>

            {/* New Signups in Period */}
            <div className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-title">Novos Cadastros ({period})</span>
                <div className="admin-kpi-icon-box">
                  <TrendingUp size={15} color="#34D399" />
                </div>
              </div>
              <div className="admin-kpi-value">{metrics.users.new_in_period.toLocaleString()}</div>
              <div className="admin-kpi-footer">
                <span>+{metrics.users.new_trainers_in_period} personals, +{metrics.users.new_students_in_period} alunos</span>
                {metrics.users.previous_new_users !== null && (
                  <span style={{ color: '#71717A' }} title="Período imediatamente anterior">
                    (ant: {metrics.users.previous_new_users})
                  </span>
                )}
              </div>
            </div>

            {/* Active Subscriptions */}
            <div className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-title">Assinaturas Ativas</span>
                <div className="admin-kpi-icon-box">
                  <CreditCard size={15} color="#34D399" />
                </div>
              </div>
              <div className="admin-kpi-value">{metrics.subscriptions.active.toLocaleString()}</div>
              <div className="admin-kpi-footer">
                <span style={{ color: '#60A5FA' }}>{metrics.subscriptions.trial} em teste (Trial)</span>
                <span>•</span>
                <span style={{ color: '#FBBF24' }}>{metrics.subscriptions.grace_period} carência</span>
              </div>
            </div>

            {/* Inactive Subscriptions */}
            <div className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-title">Assinaturas Inativas</span>
                <div className="admin-kpi-icon-box">
                  <CreditCard size={15} color="#71717A" />
                </div>
              </div>
              <div className="admin-kpi-value">{metrics.subscriptions.cancelled + metrics.subscriptions.expired}</div>
              <div className="admin-kpi-footer">
                <span style={{ color: '#F87171' }}>{metrics.subscriptions.cancelled} canceladas</span>
                <span>•</span>
                <span style={{ color: '#71717A' }}>{metrics.subscriptions.expired} expiradas</span>
              </div>
            </div>

            {/* Store Distribution */}
            <div className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-title">Provedor de Compra</span>
                <div className="admin-kpi-icon-box">
                  <Apple size={15} color="#D4D4D8" />
                </div>
              </div>
              <div className="admin-kpi-value" style={{ fontSize: 20 }}>
                Apple: {metrics.subscriptions.provider_distribution?.apple || 0} <span style={{ color: '#52525B' }}>|</span> Google: {metrics.subscriptions.provider_distribution?.google || 0}
              </div>
              <div className="admin-kpi-footer">
                <span>Web / Promocional: {metrics.subscriptions.provider_distribution?.admin || 0}</span>
              </div>
            </div>

            {/* Plan Distribution */}
            <div className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span className="admin-kpi-title">Distribuição de Planos</span>
                <div className="admin-kpi-icon-box">
                  <CreditCard size={15} color="#D90000" />
                </div>
              </div>
              <div className="admin-kpi-value" style={{ fontSize: 20 }}>
                {Object.keys(metrics.subscriptions.plan_distribution || {}).length} Planos Ativos
              </div>
              <div className="admin-kpi-footer" style={{ gap: 6 }}>
                {Object.entries(metrics.subscriptions.plan_distribution || {}).map(([plan, count]) => (
                  <span key={plan} style={{ backgroundColor: '#1A1A20', border: '1px solid #282830', padding: '2px 8px', borderRadius: 4, fontWeight: 700, color: '#FFFFFF' }}>
                    {plan.toUpperCase()}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Operational Alerts & Recent Activity Grid */}
          <div className="admin-bottom-grid">
            {/* Operational Alerts */}
            <div className="admin-card">
              <div className="admin-card-header">
                <div className="admin-card-title">
                  <AlertTriangle size={16} color="#EF4444" />
                  <span>Alertas Operacionais Recentes</span>
                </div>
                <span className="admin-badge admin-badge-danger">
                  {metrics.alerts?.length || 0} Registros
                </span>
              </div>

              {(!metrics.alerts || metrics.alerts.length === 0) ? (
                <div className="admin-empty-state">
                  <CheckCircle2 size={32} color="#10B981" />
                  <div className="admin-empty-title">Nenhum alerta crítico ativo</div>
                  <div className="admin-empty-desc">Todos os fluxos operacionais estão estáveis e em conformidade.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {metrics.alerts.map((alert) => (
                    <div key={alert.id} className="admin-feed-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="admin-feed-tag" style={{ backgroundColor: '#260E0E', border: '1px solid #541E1E', color: '#F87171' }}>
                          {alert.action}
                        </span>
                        <span style={{ fontSize: 11, color: '#71717A' }}>
                          {formatDateTime(alert.created_at)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12.5, color: '#D4D4D8', marginTop: 4 }}>
                        {alert.reason || alert.details || 'Sem descrição detalhada'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Audit Timeline */}
            <div className="admin-card">
              <div className="admin-card-header">
                <div className="admin-card-title">
                  <ShieldAlert size={16} color="#D90000" />
                  <span>Últimas Ações Administrativas</span>
                </div>
              </div>

              {(!metrics.recent_activity || metrics.recent_activity.length === 0) ? (
                <div className="admin-empty-state">
                  <Clock size={32} color="#71717A" />
                  <div className="admin-empty-title">Nenhuma ação recente</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {metrics.recent_activity.map((item) => (
                    <div key={item.id} className="admin-feed-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="admin-feed-tag" style={{ 
                          backgroundColor: item.result === 'FAILED' ? '#260E0E' : '#0E2419', 
                          border: item.result === 'FAILED' ? '1px solid #541E1E' : '1px solid #144D34', 
                          color: item.result === 'FAILED' ? '#F87171' : '#34D399' 
                        }}>
                          {item.action}
                        </span>
                        <span style={{ fontSize: 11, color: '#71717A' }}>
                          {formatDateTime(item.created_at)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12.5, color: '#D4D4D8', marginTop: 4 }}>
                        Motivo: <span style={{ color: '#FFFFFF' }}>{item.reason || 'Operação administrativa regular'}</span>
                      </div>
                      {item.correlation_id && (
                        <div style={{ fontSize: 10.5, color: '#71717A', fontFamily: 'monospace' }}>
                          Ref: {item.correlation_id}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
