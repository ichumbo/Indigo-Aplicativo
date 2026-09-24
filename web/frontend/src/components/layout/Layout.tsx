import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { DragonFloatingAI } from '../common/DragonFloatingAI';
import { ErrorBoundary } from '../common/ErrorBoundary';

export const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const location = useLocation();

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // Close mobile drawer on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app-shell">
      {/* Sidebar with Desktop sticky and Mobile overlay drawer */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileDrawerOpen}
        onMobileClose={() => setMobileDrawerOpen(false)}
      />

      {/* Main App Content Area */}
      <div className="app-main-layout">
        <Topbar onToggleMobileMenu={() => setMobileDrawerOpen(!mobileDrawerOpen)} />
        <main className="app-content-container">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <DragonFloatingAI />
    </div>
  );
};
