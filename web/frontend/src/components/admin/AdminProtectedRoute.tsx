import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { ShieldX } from 'lucide-react';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ 
  children, 
  requiredPermission 
}) => {
  const { admin, token, isLoading, hasPermission } = useAdminAuth();

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#0A0A0A',
        color: '#FFFFFF',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 32, 
            height: 32, 
            border: '3px solid #2C2C2C', 
            borderTopColor: '#D90000', 
            borderRadius: '50%', 
            animation: 'spin 0.8s linear infinite', 
            margin: '0 auto 12px' 
          }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: 13, color: '#A1A1AA' }}>Validando credenciais administrativas...</p>
        </div>
      </div>
    );
  }

  if (!token || !admin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div style={{ 
        padding: 40, 
        textAlign: 'center', 
        backgroundColor: '#141414', 
        borderRadius: 8, 
        border: '1px solid #2C2C2C',
        maxWidth: 500,
        margin: '60px auto'
      }}>
        <ShieldX size={44} color="#EF4444" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 18, color: '#FFFFFF', marginBottom: 8 }}>Acesso Restrito</h2>
        <p style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.5 }}>
          Seu papel administrativo (<strong style={{ color: '#FFFFFF' }}>{admin.role}</strong>) não possui a permissão requerida (<code style={{ color: '#D90000' }}>{requiredPermission}</code>) para acessar esta área.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
