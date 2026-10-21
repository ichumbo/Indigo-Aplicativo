import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { adminClient } from '../../api/adminClient';
import { AdminNotificationItem } from '../../types/admin';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminNotificationsPage: React.FC = () => {
  const { isSuperAdmin, isSupportAdmin } = useAdminAuth();

  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [form, setForm] = useState({
    audience: 'all',
    title: '',
    message: '',
    reason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminClient.get(`/notifications?page=${page}`);
      setNotifications(res.data.data || []);
      setTotal(res.data.meta?.total || 0);
      setTotalPages(res.data.meta?.last_page || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao buscar histórico de notificações.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await adminClient.post('/notifications/broadcast', form);
      alert(res.data.message || 'Notificação enviada com sucesso!');
      setIsBroadcastOpen(false);
      setForm({ audience: 'all', title: '', message: '', reason: '' });
      fetchNotifications();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao disparar aviso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Notificações & Avisos Operacionais</h1>
          <p className="admin-page-subtitle">
            Comunicação administrativa com segmentação de público e histórico de entregas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {(isSuperAdmin || isSupportAdmin) && (
            <button 
              className="admin-btn admin-btn-primary" 
              onClick={() => setIsBroadcastOpen(true)}
            >
              <Send size={14} /> Novo Aviso Operacional
            </button>
          )}
          <button 
            className="admin-btn admin-btn-secondary" 
            onClick={fetchNotifications} 
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

      {/* Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Mensagem</th>
              <th>Segmentação</th>
              <th>Tipo</th>
              <th>Data do Envio</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <tr key={i}><td colSpan={5}><div className="admin-skeleton" style={{ height: 24, width: '100%' }} /></td></tr>
              ))
            ) : notifications.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-empty-state">
                    <Bell size={32} color="#71717A" />
                    <div className="admin-empty-title">Nenhum aviso emitido até o momento</div>
                  </div>
                </td>
              </tr>
            ) : (
              notifications.map((n) => (
                <tr key={n.id}>
                  <td style={{ fontWeight: 600, color: '#FFFFFF', minWidth: 180 }}>{n.title}</td>
                  <td style={{ color: '#A1A1AA', fontSize: 12.5, maxWidth: 360 }}>{n.message}</td>
                  <td>
                    <span className="admin-badge admin-badge-info" style={{ textTransform: 'uppercase' }}>
                      {n.audience || 'Todos'}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: '#71717A' }}>{n.type}</td>
                  <td style={{ fontSize: 12, color: '#A1A1AA' }}>
                    {new Date(n.created_at).toLocaleString('pt-BR')}
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
          Total de {total} notificações registradas
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

      {/* Modal Broadcast */}
      {isBroadcastOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <h3 className="admin-modal-title">Disparar Aviso Operacional</h3>
            <p style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 14 }}>
              Esta mensagem será entregue aos usuários na central de notificações do aplicativo.
            </p>
            <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>Público Alvo</label>
                <select
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                  className="admin-filter-select"
                  style={{ width: '100%' }}
                >
                  <option value="all">Todos os Usuários Ativos</option>
                  <option value="trainer">Somente Personal Trainers</option>
                  <option value="student">Somente Alunos</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>Título do Comunicado</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Ex: Atualização programada da plataforma..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>Conteúdo da Mensagem</label>
                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  placeholder="Descreva o comunicado com clareza..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>Motivo Administrativo (Auditoria)</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Justifique o motivo do disparo..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setIsBroadcastOpen(false)} disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Transmitindo...' : 'Disparar Notificação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
