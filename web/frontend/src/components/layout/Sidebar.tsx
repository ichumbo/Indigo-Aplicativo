import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user, trainerProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Alunos', path: '/alunos', icon: Users },
    { label: 'Treinos', path: '/treinos', icon: Dumbbell },
    { label: 'Avaliações', path: '/avaliacoes', icon: FileCheck2 },
    { label: 'Protocolos', path: '/protocolos', icon: Activity },
    { label: 'Evolução', path: '/evolucao', icon: TrendingUp },
    { label: 'Exercícios', path: '/exercicios', icon: Library },
    { label: 'Mensagens', path: '/mensagens', icon: MessageSquare },
    { label: 'Notificações', path: '/notificacoes', icon: Bell },
    { label: 'Configurações', path: '/configuracoes', icon: Settings },
  ];

  return (
    <aside
      style={{
        width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)',
        backgroundColor: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        transition: 'width 0.2s ease',
        zIndex: 40,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: '0 16px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {collapsed ? (
            <img
              src="/logo-principal.png"
              alt="DragonCorp"
              style={{ width: 34, height: 34, objectFit: 'contain' }}
            />
          ) : (
            <img
              src="/logotipo-principal.png"
              alt="DragonCorp"
              style={{ height: 36, width: 'auto', maxWidth: 165, objectFit: 'contain' }}
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

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: '16px 8px', overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
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
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  })}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={19} color={undefined} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Trainer Profile Card at Bottom */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
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
              fontWeight: 600,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {user?.name?.charAt(0) || 'P'}
          </div>

          {!collapsed && (
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
                <ShieldCheck size={12} />
                <span>{trainerProfile?.cref_number ? `CREF ${trainerProfile.cref_number}/${trainerProfile.cref_state}` : 'CREF Verificado'}</span>
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
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
