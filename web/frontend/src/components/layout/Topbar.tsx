import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const Topbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing'>('synced');

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await apiClient.get('/notifications');
        setUnreadCount(res.data.unreadCount || 0);
      } catch {
        // silencioso
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Search and Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ position: 'relative', width: 300 }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Buscar aluno, treino ou exercício..."
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-full)',
              padding: '7px 12px 7px 34px',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--color-success)',
            backgroundColor: 'var(--color-success-subtle)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          <CheckCircle2 size={13} />
          <span>Sincronizado com Mobile</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={() => navigate('/treinos/novo')}
          className="btn btn-primary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} />
          <span>Montar Treino</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => navigate('/notificacoes')}
          style={{
            position: 'relative',
            background: 'var(--card-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: 8,
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Notificações"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -3,
                right: -3,
                backgroundColor: 'var(--accent-red)',
                color: 'white',
                fontSize: 10,
                fontWeight: 700,
                width: 16,
                height: 16,
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>

        {/* Personal Avatar & Name (Prompt Item 9) */}
        <div
          onClick={() => navigate('/configuracoes')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--card-secondary)',
            border: '1px solid var(--border-color)',
          }}
          title="Meu Perfil e Configurações"
        >
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
            alt="Personal"
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-full)',
              objectFit: 'cover',
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            {user?.name?.split(' ')[0] || 'Personal'}
          </span>
        </div>
      </div>
    </header>
  );
};
