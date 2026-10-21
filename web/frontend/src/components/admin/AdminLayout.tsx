import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  GraduationCap, 
  Link2, 
  CreditCard, 
  Bell, 
  ShieldAlert, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ChevronRight
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import '../../admin.css';

export const AdminLayout: React.FC = () => {
  const { admin, logout, isSuperAdmin, isSupportAdmin, isFinancialAdmin } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/overview') return 'Visão Geral';
    if (path.startsWith('/admin/users/')) return 'Detalhes do Usuário';
    if (path.startsWith('/admin/users')) return 'Gestão de Usuários';
    if (path.startsWith('/admin/personals')) return 'Personals';
    if (path.startsWith('/admin/students')) return 'Alunos';
    if (path.startsWith('/admin/links')) return 'Vínculos & Transferências';
    if (path.startsWith('/admin/subscriptions')) return 'Assinaturas & Lojas';
    if (path.startsWith('/admin/notifications')) return 'Notificações Operacionais';
    if (path.startsWith('/admin/audit')) return 'Auditoria Imutável';
    if (path.startsWith('/admin/security')) return 'Segurança & Administradores';
    if (path.startsWith('/admin/settings')) return 'Configurações Globais';
    return 'Painel Administrativo';
  };

  const getRoleLabel = () => {
    if (isSuperAdmin) return 'Super Administrador';
    if (isSupportAdmin) return 'Atendimento & Suporte';
    if (isFinancialAdmin) return 'Gestão Financeira';
    return 'Somente Leitura';
  };

  return (
    <div className="admin-app">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <img 
              src="/logo-principal.png" 
              alt="DragonCorp" 
              className="admin-brand-logo"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('logo-white.png')) {
                  target.src = '/logo-white.png';
                }
              }}
            />
            <div className="admin-brand-title">
              DragonCorp
              <span className="admin-badge-gov">Super Admin</span>
            </div>
          </div>
          <button 
            className="admin-mobile-toggle" 
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="admin-nav">
          <span className="admin-nav-group-label">Monitoramento</span>
          <NavLink 
            to="/admin" 
            end 
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <LayoutDashboard size={17} />
            Visão Geral
          </NavLink>

          <span className="admin-nav-group-label">Usuários & Vínculos</span>
          <NavLink 
            to="/admin/users" 
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <Users size={17} />
            Todos os Usuários
          </NavLink>
          <NavLink 
            to="/admin/personals" 
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <UserCheck size={17} />
            Personals
          </NavLink>
          <NavLink 
            to="/admin/students" 
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <GraduationCap size={17} />
            Alunos
          </NavLink>
          <NavLink 
            to="/admin/links" 
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <Link2 size={17} />
            Vínculos e Trocas
          </NavLink>

          <span className="admin-nav-group-label">Faturamento & Lojas</span>
          <NavLink 
            to="/admin/subscriptions" 
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <CreditCard size={17} />
            Assinaturas
          </NavLink>

          <span className="admin-nav-group-label">Operação & Governança</span>
          <NavLink 
            to="/admin/notifications" 
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <Bell size={17} />
            Notificações
          </NavLink>
          <NavLink 
            to="/admin/audit" 
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <ShieldAlert size={17} />
            Trilha de Auditoria
          </NavLink>
          <NavLink 
            to="/admin/security" 
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <ShieldCheck size={17} />
            Segurança & Sessões
          </NavLink>
          <NavLink 
            to="/admin/settings" 
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <Settings size={17} />
            Configurações
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-user-avatar">
              {admin?.name ? admin.name.substring(0, 2).toUpperCase() : 'SA'}
            </div>
            <div className="admin-user-details">
              <span className="admin-user-name">{admin?.name || 'Super Admin'}</span>
              <span className="admin-user-role-badge">{getRoleLabel()}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="admin-btn admin-btn-secondary"
              style={{ padding: '6px 8px' }}
              title="Encerrar Sessão Administrativa"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="admin-main">
        <header className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              className="admin-mobile-toggle" 
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <div className="admin-breadcrumbs">
              <span>Admin</span>
              <ChevronRight size={13} />
              <span className="active">{getBreadcrumb()}</span>
            </div>
          </div>

          <div className="admin-header-actions">
            <div className="admin-system-health-pill">
              <span className="admin-pulse-dot" />
              <span>Ambiente Seguro & Auditado</span>
            </div>
          </div>
        </header>

        <main className="admin-content-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
