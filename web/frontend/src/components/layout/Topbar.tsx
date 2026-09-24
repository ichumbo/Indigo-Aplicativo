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
  Users,
  CheckCheck,
  X,
  ShieldCheck,
  Menu,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { StudentProfile, AppNotification } from '../../types';

interface TopbarProps {
  onToggleMobileMenu?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleMobileMenu }) => {
  const { user, trainerProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

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

    const interval = setInterval(() => {
      fetchNotifications();
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
    <header className="topbar-wrapper">
      {/* LEFT: Mobile Menu Button + Search Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, maxWidth: 520 }}>
        {/* Hamburger Menu Toggle (Mobile < 1024px) */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="mobile-menu-toggle-btn"
          title="Abrir Menu"
          aria-label="Abrir Menu Lateral"
        >
          <Menu size={20} />
        </button>

        {/* Search Box */}
        <div
          ref={searchContainerRef}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 320,
            minWidth: 0,
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
              placeholder="Buscar aluno, treino..."
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
                className="hide-on-mobile"
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
                minWidth: 'min(340px, 90vw)',
                backgroundColor: '#141414',
                border: '1px solid #262626',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.75)',
                zIndex: 100,
                overflow: 'hidden',
                animation: 'dropdown-fade-in 0.15s ease',
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #222222',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#161616',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Alunos Cadastrados
                </span>
                <span style={{ fontSize: 10, color: '#71717A' }}>
                  {filteredStudents.length} resultados
                </span>
              </div>

              <div style={{ maxHeight: 260, overflowY: 'auto', padding: '6px' }}>
                {searchLoading ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    Buscando alunos...
                  </div>
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setIsSearchFocused(false);
                        navigate(`/alunos/${s.id}`);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E1E1E')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'var(--accent-red)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#FFFFFF',
                          }}
                        >
                          {s.full_name?.charAt(0) || 'A'}
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
      </div>

      {/* RIGHT: CTA + Notifications + Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* + Montar Treino CTA */}
        <button
          type="button"
          onClick={() => navigate('/treinos/novo')}
          className="topbar-action-btn"
          title="Criar novo treino"
        >
          <Plus size={14} style={{ flexShrink: 0 }} />
          <span className="hide-on-mobile-compact">Montar Treino</span>
        </button>

        {/* Notifications Icon Button */}
        <div style={{ position: 'relative' }} ref={notifMenuRef}>
          <button
            type="button"
            onClick={() => setNotifMenuOpen(!notifMenuOpen)}
            className="topbar-icon-btn"
            title="Notificações"
            aria-label="Notificações"
            style={{
              borderColor: notifMenuOpen ? 'var(--primary)' : '#222222',
            }}
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  backgroundColor: 'var(--accent-red)',
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 800,
                  width: 16,
                  height: 16,
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #0F0F0F',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* NOTIFICATIONS DROPDOWN */}
          {notifMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 'min(360px, 92vw)',
                backgroundColor: '#141414',
                border: '1px solid #262626',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.85)',
                zIndex: 100,
                overflow: 'hidden',
                animation: 'dropdown-fade-in 0.15s ease',
              }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid #222222',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#161616',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={14} color="var(--accent-red)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Notificações
                  </span>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllNotifsRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <CheckCheck size={12} />
                    <span>Marcar lidas</span>
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {notifications.length > 0 ? (
                  notifications.slice(0, 6).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        setNotifMenuOpen(false);
                        navigate('/notificacoes');
                      }}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid #1E1E1E',
                        cursor: 'pointer',
                        backgroundColor: n.read ? 'transparent' : 'rgba(217, 0, 0, 0.04)',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1C1C1C')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = n.read ? 'transparent' : 'rgba(217, 0, 0, 0.04)')
                      }
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: n.read ? 'var(--text-secondary)' : '#FFFFFF' }}>
                          {n.title}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {n.created_at ? new Date(n.created_at).toLocaleDateString('pt-BR') : 'Hoje'}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>
                        {n.message}
                      </p>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
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
                  padding: '10px',
                  textAlign: 'center',
                  backgroundColor: '#161616',
                  borderTop: '1px solid #222222',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--accent-red)',
                  cursor: 'pointer',
                }}
              >
                Ver todas as notificações
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill & Dropdown */}
        <div style={{ position: 'relative' }} ref={userMenuRef}>
          <div
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="topbar-user-pill"
            style={{
              borderColor: userMenuOpen ? 'var(--primary)' : '#222222',
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 11,
              }}
            >
              {user?.name?.charAt(0) || 'P'}
            </div>
            <span
              className="hide-on-mobile-compact"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-primary)',
                maxWidth: 90,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.name?.split(' ')[0] || 'Personal'}
            </span>
            <ChevronDown size={12} color="#71717A" />
          </div>

          {/* USER PROFILE DROPDOWN */}
          {userMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 220,
                backgroundColor: '#141414',
                border: '1px solid #262626',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.85)',
                zIndex: 100,
                overflow: 'hidden',
                animation: 'dropdown-fade-in 0.15s ease',
              }}
            >
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #222222', backgroundColor: '#161616' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email}
                </div>
              </div>

              <div style={{ padding: '6px' }}>
                <div
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/configuracoes');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E1E1E')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Settings size={14} color="var(--text-muted)" />
                  <span>Configurações & Perfil</span>
                </div>

                <div
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--color-danger)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <LogOut size={14} color="var(--color-danger)" />
                  <span>Sair do Painel</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
