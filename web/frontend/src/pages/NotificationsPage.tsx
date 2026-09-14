import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  AlertTriangle,
  Dumbbell,
  MessageSquare,
  CheckCheck,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { AppNotification } from '../types';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';

const getNotificationStudentAvatar = (title: string, message: string) => {
  const text = (title + ' ' + message).toLowerCase();
  if (text.includes('mariana')) {
    return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150';
  }
  return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
};

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'pain' | 'feedback'>('all');

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

  const getIcon = (type: string, highlightPain?: boolean) => {
    if (highlightPain) return <AlertTriangle size={14} color="#D90000" />;
    switch (type) {
      case 'feedback-received':
        return <MessageSquare size={14} color="#38BDF8" />;
      case 'workout':
        return <Dumbbell size={14} color="#34D399" />;
      default:
        return <Bell size={14} color="var(--text-muted)" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const painCount = notifications.filter((n) => n.highlight_pain).length;
  const feedbackCount = notifications.filter((n) => n.type === 'feedback-received').length;

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === 'unread') return !n.read;
      if (activeTab === 'pain') return n.highlight_pain;
      if (activeTab === 'feedback') return n.type === 'feedback-received';
      return true;
    });
  }, [notifications, activeTab]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) return <Loader text="Carregando notificações..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: '100%' }}>
      {/* 1. Header with Actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.4 }}>
            Central de Notificações
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Alertas de feedback, treinos finalizados e sinalizações de dor pós-treino dos alunos.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#1E1E1E',
              border: '1px solid #2C2C2C',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#282828')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1E1E1E')}
          >
            <CheckCheck size={14} />
            <span>Marcar todas como lidas</span>
          </button>
        )}
      </div>

      {/* 2. Top Metric Indicators */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        <div
          style={{
            backgroundColor: '#141414',
            border: '1px solid #222222',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.4px' }}>
              Total Recebidas
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {notifications.length}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#1E1E1E',
              border: '1px solid #2A2A2A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <Bell size={18} />
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#141414',
            border: '1px solid #222222',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.4px' }}>
              Não Lidas
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: unreadCount > 0 ? '#34D399' : 'var(--text-primary)', marginTop: 2 }}>
              {unreadCount}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34D399',
            }}
          >
            <Check size={18} />
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#141414',
            border: '1px solid #222222',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.4px' }}>
              Relatos de Dor
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: painCount > 0 ? '#F87171' : 'var(--text-primary)', marginTop: 2 }}>
              {painCount}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(217, 0, 0, 0.1)',
              border: '1px solid rgba(217, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F87171',
            }}
          >
            <AlertTriangle size={18} />
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#141414',
            border: '1px solid #222222',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.4px' }}>
              Feedbacks
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#38BDF8', marginTop: 2 }}>
              {feedbackCount}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38BDF8',
            }}
          >
            <MessageSquare size={18} />
          </div>
        </div>
      </div>

      {/* 3. Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #222222', paddingBottom: 10 }}>
        {[
          { key: 'all', label: `Todas (${notifications.length})` },
          { key: 'unread', label: `Não Lidas (${unreadCount})` },
          { key: 'pain', label: `Relatos de Dor (${painCount})` },
          { key: 'feedback', label: `Feedbacks (${feedbackCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              fontWeight: 700,
              border: activeTab === tab.key ? '1px solid #D90000' : '1px solid #252525',
              backgroundColor: activeTab === tab.key ? '#D90000' : '#161616',
              color: activeTab === tab.key ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div
          style={{
            backgroundColor: '#141414',
            border: '1px solid #222222',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 24px',
          }}
        >
          <EmptyState
            icon={<Bell size={40} />}
            title="Tudo em dia!"
            description={
              activeTab === 'unread'
                ? 'Você não possui notificações pendentes de leitura.'
                : 'Nenhuma notificação encontrada nesta categoria.'
            }
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredNotifications.map((n) => {
            const avatarUrl = getNotificationStudentAvatar(n.title, n.message);

            return (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  backgroundColor: n.read ? '#141414' : '#171717',
                  border: n.highlight_pain ? '1px solid rgba(217, 0, 0, 0.4)' : '1px solid #222222',
                  borderRadius: 'var(--radius-md)',
                  gap: 16,
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#383838')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = n.highlight_pain ? 'rgba(217, 0, 0, 0.4)' : '#222222')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Student Avatar with Badge Icon */}
                  <div style={{ position: 'relative', width: 42, height: 42, flexShrink: 0 }}>
                    <img
                      src={avatarUrl}
                      alt="Aluno"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
                      }}
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 'var(--radius-sm)',
                        objectFit: 'cover',
                        border: '1px solid #2A2A2A',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -3,
                        right: -3,
                        width: 20,
                        height: 20,
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: '#1E1E1E',
                        border: '1px solid #2A2A2A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {getIcon(n.type, n.highlight_pain)}
                    </div>
                  </div>

                  {/* Text Details */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                        {n.title}
                      </span>
                      {!n.read && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: '#D90000',
                          }}
                        />
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {n.message}
                    </p>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Clock size={11} />
                      <span>{formatDate(n.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => navigate('/mensagens')}
                    style={{
                      padding: '5px 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: '#1E1E1E',
                      border: '1px solid #2C2C2C',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  >
                    <span>Responder</span>
                    <ArrowRight size={11} />
                  </button>

                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      style={{
                        padding: '5px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#262626',
                        border: '1px solid #333333',
                        color: '#34D399',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title="Marcar como lida"
                    >
                      <Check size={12} />
                      <span>Lida</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
