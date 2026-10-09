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
  ClipboardList,
  CreditCard,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { AppNotification } from '../types';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<
    'all' | 'unread' | 'workout' | 'assessment' | 'pain' | 'feedback' | 'message' | 'subscription'
  >('all');

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
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await apiClient.post(`/notifications/${id}/dismiss`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNavigateToResource = (n: AppNotification) => {
    void handleMarkRead(n.id);

    if (n.deep_link) {
      if (n.deep_link.includes('subscription')) {
        navigate('/perfil');
        return;
      }
      if (n.deep_link.includes('workouts') || n.deep_link.includes('training')) {
        navigate('/treinos');
        return;
      }
      if (n.deep_link.includes('assessments')) {
        navigate('/avaliacoes');
        return;
      }
      if (n.deep_link.includes('feedbacks') || n.deep_link.includes('feedback')) {
        navigate('/feedbacks');
        return;
      }
      if (n.deep_link.includes('messages')) {
        navigate('/mensagens');
        return;
      }
    }

    if (n.category === 'workout' || n.type.startsWith('workout')) {
      navigate('/treinos');
    } else if (n.category === 'assessment' || n.type.startsWith('assessment')) {
      navigate('/avaliacoes');
    } else if (n.category === 'feedback' || n.category === 'pain_report' || n.feedback_id) {
      navigate('/feedbacks');
    } else if (n.category === 'message' || n.type.startsWith('message')) {
      navigate('/mensagens');
    } else if (n.category === 'subscription' || n.type.startsWith('subscription')) {
      navigate('/perfil');
    } else {
      navigate('/dashboard');
    }
  };

  const getIcon = (n: AppNotification) => {
    if (n.highlight_pain || n.category === 'pain_report' || n.priority === 'critical') {
      return <AlertTriangle size={15} color="#EF4444" />;
    }
    if (n.category === 'workout' || n.type.startsWith('workout')) {
      return <Dumbbell size={15} color="#10B981" />;
    }
    if (n.category === 'assessment' || n.type.startsWith('assessment')) {
      return <ClipboardList size={15} color="#3B82F6" />;
    }
    if (n.category === 'message' || n.type.startsWith('message')) {
      return <MessageSquare size={15} color="#38BDF8" />;
    }
    if (n.category === 'subscription' || n.type.startsWith('subscription')) {
      return <CreditCard size={15} color="#F59E0B" />;
    }
    return <Bell size={15} color="var(--text-muted)" />;
  };

  const getPriorityBadge = (priority?: string) => {
    if (priority === 'critical') {
      return (
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: 4,
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#EF4444',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <ShieldAlert size={10} />
          Crítica
        </span>
      );
    }
    if (priority === 'high') {
      return (
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: 4,
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#F59E0B',
          }}
        >
          Alta
        </span>
      );
    }
    return null;
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const painCount = notifications.filter((n) => n.highlight_pain || n.category === 'pain_report').length;
  const workoutCount = notifications.filter((n) => n.category === 'workout' || n.type.startsWith('workout')).length;
  const feedbackCount = notifications.filter((n) => n.category === 'feedback' || n.type.startsWith('feedback')).length;

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === 'unread') return !n.read;
      if (activeTab === 'pain') return n.highlight_pain || n.category === 'pain_report';
      if (activeTab === 'workout') return n.category === 'workout' || n.type.startsWith('workout');
      if (activeTab === 'assessment') return n.category === 'assessment' || n.type.startsWith('assessment');
      if (activeTab === 'feedback') return n.category === 'feedback' || n.type.startsWith('feedback');
      if (activeTab === 'message') return n.category === 'message' || n.type.startsWith('message');
      if (activeTab === 'subscription') return n.category === 'subscription' || n.type.startsWith('subscription');
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
            Alertas em tempo real sincronizados entre o aplicativo móvel e a plataforma web.
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
      <div className="stats-grid-4">
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
            <div style={{ fontSize: 20, fontWeight: 800, color: unreadCount > 0 ? 'var(--brand-primary, #D90000)' : 'var(--text-primary)', marginTop: 2 }}>
              {unreadCount}
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
              color: '#D90000',
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
              Relatos de Dor
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#EF4444', marginTop: 2 }}>
              {painCount}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
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
              Treinos
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#10B981', marginTop: 2 }}>
              {workoutCount}
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
              color: '#10B981',
            }}
          >
            <Dumbbell size={18} />
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid #222222', paddingBottom: 10 }}>
        {[
          { key: 'all', label: `Todas (${notifications.length})` },
          { key: 'unread', label: `Não Lidas (${unreadCount})` },
          { key: 'pain', label: `Dores (${painCount})` },
          { key: 'workout', label: `Treinos (${workoutCount})` },
          { key: 'feedback', label: `Feedbacks (${feedbackCount})` },
          { key: 'message', label: 'Mensagens' },
          { key: 'subscription', label: 'Assinatura' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              fontWeight: 700,
              border: activeTab === tab.key ? '1px solid var(--brand-primary, #D90000)' : '1px solid #252525',
              backgroundColor: activeTab === tab.key ? 'var(--brand-primary, #D90000)' : '#161616',
              color: activeTab === tab.key ? 'var(--brand-on-primary, #FFFFFF)' : 'var(--text-secondary)',
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
            return (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  padding: '14px 18px',
                  backgroundColor: n.read ? '#141414' : '#171717',
                  border: n.highlight_pain || n.category === 'pain_report'
                    ? '1px solid rgba(239, 68, 68, 0.4)'
                    : '1px solid #222222',
                  borderRadius: 'var(--radius-md)',
                  gap: 12,
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#383838')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor =
                    n.highlight_pain || n.category === 'pain_report' ? 'rgba(239, 68, 68, 0.4)' : '#222222')
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                  {/* Icon Badge */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: '#1E1E1E',
                      border: '1px solid #2A2A2A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getIcon(n)}
                  </div>

                  {/* Text Details */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                        {n.title}
                      </span>
                      {getPriorityBadge(n.priority)}
                      {!n.read && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: 'var(--brand-primary, #D90000)',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2, wordBreak: 'break-word' }}>
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
                    onClick={() => handleNavigateToResource(n)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: '#1E1E1E',
                      border: '1px solid #2C2C2C',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2A2A2A')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1E1E1E')}
                  >
                    <span>Ver detalhes</span>
                    <ArrowRight size={11} />
                  </button>

                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      style={{
                        padding: '6px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#1A2A22',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#10B981',
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

                  <button
                    onClick={() => handleDismiss(n.id)}
                    style={{
                      padding: '6px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'transparent',
                      border: '1px solid transparent',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Dispensar notificação"
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
