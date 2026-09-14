import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Plus,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Dumbbell,
  FileCheck2,
  Activity,
  TrendingUp,
  Users,
  Check,
  CheckCheck,
  X,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { StudentProfile, AppNotification } from '../../types';

export const Topbar: React.FC = () => {
  const { user, trainerProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  // Search & Spotlight States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [studentsList, setStudentsList] = useState<StudentProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  // Dropdown States
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  const checkConnectivity = async () => {
    try {
      setSyncStatus('syncing');
      await apiClient.get('/ping');
      setSyncStatus('synced');
    } catch {
      setSyncStatus('offline');
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await apiClient.get('/notifications');
        const list = res.data.notifications || [];
        setNotifications(list);
        setUnreadCount(res.data.unreadCount || list.filter((n: AppNotification) => !n.read).length || 0);
      } catch {
        // silencioso
      }
    };

    fetchNotifications();
    checkConnectivity();

    const interval = setInterval(() => {
      fetchNotifications();
      checkConnectivity();
    }, 25000);

    return () => clearInterval(interval);
  }, []);

  // Global Keyboard Shortcut: ⌘K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      } else if (e.key === 'Escape') {
        setIsSearchFocused(false);
        setUserMenuOpen(false);
        setNotifMenuOpen(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isSearchFocused && studentsList.length === 0) {
      setSearchLoading(true);
      apiClient
        .get('/students')
        .then((res) => {
          setStudentsList(res.data.students || []);
        })
        .catch(() => {})
        .finally(() => setSearchLoading(false));
    }
  }, [isSearchFocused, studentsList.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setIsSearchFocused(false);
      navigate(`/alunos?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleMarkNotifRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.post(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await apiClient.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const filteredStudents = searchQuery.trim()
    ? studentsList.filter((s) => {
        const name = s.full_name || '';
        const goal = s.main_goal || '';
        const email = s.contact?.email || '';
        const q = searchQuery.toLowerCase();
        return name.toLowerCase().includes(q) || goal.toLowerCase().includes(q) || email.toLowerCase().includes(q);
      })
    : studentsList.slice(0, 4);

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <header
      style={{
        height: 56,
        backgroundColor: '#0F0F0F',
        borderBottom: '1px solid #1E1E1E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* LEFT: Compact Minimalist Search + Status Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, maxWidth: 640 }}>
        {/* Search Box */}
        <div
          ref={searchContainerRef}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 300,
          }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: 10,
                color: '#666666',
                pointerEvents: 'none',
              }}
            />
            <input
              ref={searchInputRef}
              type="text"
              className="topbar-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar aluno, treino, protocolo..."
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                style={{
                  position: 'absolute',
                  right: 8,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2,
                }}
              >
                <X size={12} />
              </button>
            ) : (
              <span
                style={{
                  position: 'absolute',
                  right: 6,
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#71717A',
                  backgroundColor: '#1C1C1C',
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid #282828',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  letterSpacing: '0.4px',
                }}
              >
                {isMac ? '⌘K' : 'Ctrl+K'}
              </span>
            )}
          </div>

          {/* SPOTLIGHT DROPDOWN */}
          {isSearchFocused && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                width: '100%',
                minWidth: 340,
                backgroundColor: '#161616',
                border: '1px solid #262626',
                borderRadius: 'var(--radius-md)',
                padding: '10px',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6)',
                zIndex: 60,
              }}
            >
              {/* Quick Actions Shortcuts */}
              <div style={{ marginBottom: 10 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    letterSpacing: 0.5,
                    marginBottom: 6,
                    padding: '0 4px',
                  }}
                >
                  Ações Rápidas
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchFocused(false);
                      navigate('/treinos/novo');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 8px',
                      backgroundColor: '#1C1C1C',
                      border: '1px solid #262626',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Dumbbell size={13} style={{ color: 'var(--primary)' }} />
                    <span>Novo Treino</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchFocused(false);
                      navigate('/avaliacoes');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 8px',
                      backgroundColor: '#1C1C1C',
                      border: '1px solid #262626',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <FileCheck2 size={13} style={{ color: 'var(--color-success)' }} />
                    <span>Nova Avaliação</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchFocused(false);
                      navigate('/protocolos');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 8px',
                      backgroundColor: '#1C1C1C',
                      border: '1px solid #262626',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Activity size={13} style={{ color: 'var(--color-warning)' }} />
                    <span>Protocolos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchFocused(false);
                      navigate('/alunos');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 8px',
                      backgroundColor: '#1C1C1C',
                      border: '1px solid #262626',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Users size={13} style={{ color: 'var(--color-info)' }} />
                    <span>Ver Alunos</span>
                  </button>
                </div>
              </div>

              {/* Students Results */}
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  letterSpacing: 0.5,
                  marginBottom: 6,
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{searchQuery ? 'Resultados' : 'Alunos Recentes'}</span>
                {searchLoading && <span style={{ fontSize: 10, color: 'var(--primary)' }}>Buscando...</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setIsSearchFocused(false);
                        navigate(`/alunos?search=${encodeURIComponent(s.full_name)}`);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E1E1E')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: '#242424',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#FFFFFF',
                          }}
                        >
                          {s.full_name.charAt(0)}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {s.full_name}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: s.status === 'ativo' ? '#34D399' : '#A1A1AA',
                        }}
                      >
                        {s.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '12px 6px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                    Nenhum aluno encontrado para "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ultra-minimalist Live Sync Status */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 500,
            userSelect: 'none',
          }}
          title="Status de sincronização com app móvel"
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: syncStatus === 'synced' ? '#10B981' : syncStatus === 'syncing' ? '#F59E0B' : '#EF4444',
              display: 'inline-block',
            }}
          />
          <span style={{ color: '#777777' }}>
            {syncStatus === 'synced' ? 'Mobile Sincronizado' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Offline'}
          </span>
        </div>
      </div>

      {/* RIGHT: Minimalist CTA + Notifications + Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* + Montar Treino CTA */}
        <button
          type="button"
          onClick={() => navigate('/treinos/novo')}
          className="topbar-action-btn"
          title="Criar novo treino"
        >
          <Plus size={14} />
          <span>Montar Treino</span>
        </button>

        {/* Notifications Icon Button */}
        <div style={{ position: 'relative' }} ref={notifMenuRef}>
          <button
            type="button"
            onClick={() => setNotifMenuOpen(!notifMenuOpen)}
            className="topbar-icon-btn"
            title="Notificações"
            style={{
              borderColor: notifMenuOpen ? 'var(--primary)' : '#222222',
            }}
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  backgroundColor: 'var(--primary)',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                }}
              />
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 320,
                backgroundColor: '#161616',
                border: '1px solid #262626',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6)',
                zIndex: 60,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid #222222',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#1A1A1A',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Notificações {unreadCount > 0 && `(${unreadCount})`}
                </span>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllNotifsRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <CheckCheck size={12} />
                    <span>Limpar</span>
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {notifications.length > 0 ? (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        setNotifMenuOpen(false);
                        navigate('/notificacoes');
                      }}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid #202020',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E1E1E')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: '#202020',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        <Bell size={12} color="var(--text-muted)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.message}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                    Nenhuma notificação recente
                  </div>
                )}
              </div>

              <div
                onClick={() => {
                  setNotifMenuOpen(false);
                  navigate('/notificacoes');
                }}
                style={{
                  padding: '9px 14px',
                  backgroundColor: '#181818',
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  borderTop: '1px solid #222222',
                }}
              >
                Ver Todas as Notificações →
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown Pill */}
        <div style={{ position: 'relative' }} ref={userMenuRef}>
          <div
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="topbar-user-pill"
            style={{
              borderColor: userMenuOpen ? 'var(--primary)' : '#222222',
            }}
          >
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
              alt="Personal"
              style={{
                width: 22,
                height: 22,
                borderRadius: 'var(--radius-full)',
                objectFit: 'cover',
                border: '1px solid var(--border-color)',
              }}
            />

            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.name?.split(' ')[0] || 'Personal'}
            </span>

            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#FF4D4D',
                backgroundColor: '#201010',
                border: '1px solid rgba(217, 0, 0, 0.3)',
                padding: '1px 5px',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              PRO
            </span>

            <ChevronDown
              size={11}
              style={{
                color: 'var(--text-muted)',
                transform: userMenuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}
            />
          </div>

          {/* User Menu Dropdown */}
          {userMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 220,
                backgroundColor: '#161616',
                border: '1px solid #262626',
                borderRadius: 'var(--radius-md)',
                padding: '6px',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6)',
                zIndex: 60,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {/* User Header Info Card */}
              <div
                style={{
                  padding: '8px 10px',
                  backgroundColor: '#1A1A1A',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 4,
                  border: '1px solid #242424',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {user?.name || 'Personal DragonCorp'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                  {user?.email || 'personal@dragoncorp.com'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, paddingTop: 4, borderTop: '1px solid #242424' }}>
                  <ShieldCheck size={11} color="var(--color-success)" />
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-success)' }}>
                    {trainerProfile?.cref_number ? `CREF ${trainerProfile.cref_number}/${trainerProfile.cref_state}` : 'CREF Verificado'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/configuracoes');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#202020')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <User size={13} style={{ color: 'var(--primary)' }} />
                <span>Perfil e CREF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/configuracoes');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#202020')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Settings size={13} style={{ color: 'var(--text-secondary)' }} />
                <span>Configurações</span>
              </button>

              <div style={{ height: 1, backgroundColor: '#242424', margin: '3px 0' }} />

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--color-danger)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <LogOut size={13} />
                <span>Sair da Conta</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
