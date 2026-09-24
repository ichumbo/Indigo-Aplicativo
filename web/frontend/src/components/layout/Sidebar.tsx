import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  FileCheck2,
  Activity,
  TrendingUp,
  Library,
  MessageSquare,
  Bell,
  Calendar,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  mobileOpen = false,
  onMobileClose,
}) => {
  const { user, trainerProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    onMobileClose?.();
  }, [location.pathname]);

  const handleLogout = async () => {
    onMobileClose?.();
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Alunos', path: '/alunos', icon: Users },
    { label: 'Treinos', path: '/treinos', icon: Dumbbell },
    { label: 'Avaliações', path: '/avaliacoes', icon: FileCheck2 },
    { label: 'Agenda', path: '/agenda', icon: Calendar },
    { label: 'Protocolos', path: '/protocolos', icon: Activity },
    { label: 'Evolução', path: '/evolucao', icon: TrendingUp },
    { label: 'Exercícios', path: '/exercicios', icon: Library },
    { label: 'Mensagens', path: '/mensagens', icon: MessageSquare },
    { label: 'Notificações', path: '/notificacoes', icon: Bell },
    { label: 'Configurações', path: '/configuracoes', icon: Settings },
  ];

  const renderNavLinks = (isDrawer = false) => (
    <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={() => {
                  if (isDrawer) onMobileClose?.();
                }}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? 'var(--accent-red)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'rgba(217, 0, 0, 0.08)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent-red)' : '3px solid transparent',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  transition: 'background 0.15s ease, color 0.15s ease',
                  justifyContent: !isDrawer && collapsed ? 'center' : 'flex-start',
                })}
                title={!isDrawer && collapsed ? item.label : undefined}
              >
                <Icon size={19} style={{ flexShrink: 0 }} />
                {(isDrawer || !collapsed) && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const renderProfileFooter = (isDrawer = false) => (
    <div
      style={{
        padding: '12px 14px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-primary)',
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {user?.name?.charAt(0) || 'P'}
        </div>

        {(isDrawer || !collapsed) && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.name}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                color: 'var(--color-success)',
              }}
            >
              <ShieldCheck size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {trainerProfile?.cref_number ? `CREF ${trainerProfile.cref_number}/${trainerProfile.cref_state}` : 'CREF Verificado'}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          title="Sair da Conta"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Sticky Sidebar (>= 1024px) */}
      <aside className={`sidebar-desktop ${collapsed ? 'collapsed' : ''}`}>
        {/* Brand Header */}
        <div
          style={{
            height: 'var(--topbar-height)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: '0 16px',
            borderBottom: '1px solid var(--border-color)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {collapsed ? (
              <img
                src="/logo-principal.png"
                alt="DragonCorp"
                style={{ width: 32, height: 32, objectFit: 'contain' }}
              />
            ) : (
              <img
                src="/logotipo-principal.png"
                alt="DragonCorp"
                style={{ height: 32, width: 'auto', maxWidth: 155, objectFit: 'contain' }}
              />
            )}
          </div>

          <button
            onClick={onToggle}
            title={collapsed ? 'Expandir Menu' : 'Recolher Menu'}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Links & Profile */}
        {renderNavLinks(false)}
        {renderProfileFooter(false)}
      </aside>

      {/* 2. Mobile / Tablet Drawer (< 1024px) */}
      <div
        className={`sidebar-mobile-backdrop ${mobileOpen ? 'open' : ''}`}
        onClick={onMobileClose}
        aria-hidden={!mobileOpen}
      />

      <aside className={`sidebar-mobile-drawer ${mobileOpen ? 'open' : ''}`} aria-label="Menu Principal">
        {/* Mobile Header with Logo & Close Button */}
        <div
          style={{
            height: 'var(--topbar-height)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            borderBottom: '1px solid var(--border-color)',
            flexShrink: 0,
          }}
        >
          <img
            src="/logotipo-principal.png"
            alt="DragonCorp"
            style={{ height: 30, width: 'auto', maxWidth: 140, objectFit: 'contain' }}
          />
          <button
            onClick={onMobileClose}
            title="Fechar Menu"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Links & Profile */}
        {renderNavLinks(true)}
        {renderProfileFooter(true)}
      </aside>
    </>
  );
};
