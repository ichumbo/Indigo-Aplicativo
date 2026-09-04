import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { DragonFloatingAI } from '../common/DragonFloatingAI';

export const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        <Topbar />
        <main style={{ flex: 1, padding: '24px 32px', maxWidth: 1400, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
      <DragonFloatingAI />
    </div>
  );
};
