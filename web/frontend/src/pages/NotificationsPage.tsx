import React, { useEffect, useState } from 'react';
import { Bell, Check, AlertTriangle, Dumbbell, MessageSquare, CheckCheck } from 'lucide-react';
import { apiClient } from '../api/client';
import { AppNotification } from '../types';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await apiClient.post(`/notifications/${id}/read`);
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post('/notifications/read-all');
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <Loader text="Carregando notificações..." />;

  const getIcon = (type: string, highlightPain?: boolean) => {
    if (highlightPain) return <AlertTriangle size={18} color="var(--accent-red)" />;
    switch (type) {
      case 'feedback-received':
        return <MessageSquare size={18} color="var(--color-info)" />;
      case 'workout':
        return <Dumbbell size={18} color="var(--color-success)" />;
      default:
        return <Bell size={18} color="var(--text-muted)" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 840, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
            Central de Notificações
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Alertas de feedback, treinos finalizados e sinalizações de dor pós-treino.
          </p>
        </div>

        {notifications.some((n) => !n.read) && (
          <button
            onClick={handleMarkAllRead}
            className="btn btn-secondary btn-sm"
          >
            <CheckCheck size={15} />
            <span>Marcar todas como lidas</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={40} />}
          title="Tudo em dia!"
          description="Você não possui novas notificações no momento."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                backgroundColor: n.read ? 'var(--bg-secondary)' : 'var(--bg-surface)',
                border: n.highlight_pain ? '1px solid var(--accent-red-border)' : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--bg-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {getIcon(n.type, n.highlight_pain)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                      {n.title}
                    </span>
                    {!n.read && (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--accent-red)',
                        }}
                      />
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {n.message}
                  </p>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(n.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {!n.read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px', fontSize: 11 }}
                  title="Marcar como lida"
                >
                  <Check size={13} />
                  <span>Lida</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
