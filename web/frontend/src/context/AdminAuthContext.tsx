import React, { createContext, useContext, useEffect, useState } from 'react';
import { adminClient } from '../api/adminClient';
import { AdminUser, AdminRole } from '../types/admin';

interface AdminAuthContextType {
  admin: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isSupportAdmin: boolean;
  isFinancialAdmin: boolean;
  isReadOnlyAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('dragoncorp_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dragoncorp_admin_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';
  const isSupportAdmin = admin?.role === 'SUPPORT_ADMIN';
  const isFinancialAdmin = admin?.role === 'FINANCIAL_ADMIN';
  const isReadOnlyAdmin = admin?.role === 'READONLY_ADMIN';

  const hasPermission = (permission: string): boolean => {
    if (!admin) return false;
    if (admin.role === 'SUPER_ADMIN') return true;
    if (admin.permissions.includes('*')) return true;
    return admin.permissions.includes(permission);
  };

  const refreshAdmin = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await adminClient.get('/auth/me');
      if (response.data?.user) {
        setAdmin(response.data.user);
        localStorage.setItem('dragoncorp_admin_user', JSON.stringify(response.data.user));
      }
    } catch {
      setAdmin(null);
      setToken(null);
      localStorage.removeItem('dragoncorp_admin_token');
      localStorage.removeItem('dragoncorp_admin_user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAdmin();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const response = await adminClient.post('/auth/login', { email, password });
      const { token: newToken, user: newUser } = response.data;

      setToken(newToken);
      setAdmin(newUser);

      localStorage.setItem('dragoncorp_admin_token', newToken);
      localStorage.setItem('dragoncorp_admin_user', JSON.stringify(newUser));

      return { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Falha ao autenticar no painel administrativo.';
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      await adminClient.post('/auth/logout');
    } catch {
      // Ignora erro de rede no logout
    } finally {
      setToken(null);
      setAdmin(null);
      localStorage.removeItem('dragoncorp_admin_token');
      localStorage.removeItem('dragoncorp_admin_user');
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        token,
        isLoading,
        isSuperAdmin,
        isSupportAdmin,
        isFinancialAdmin,
        isReadOnlyAdmin,
        hasPermission,
        login,
        logout,
        refreshAdmin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth deve ser utilizado dentro de um AdminAuthProvider');
  }
  return context;
};
