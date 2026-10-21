import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { ShieldCheck, AlertCircle, Lock, Mail } from 'lucide-react';
import '../../admin.css';

export const AdminLoginPage: React.FC = () => {
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    const result = await login(email, password);

    if (result.success) {
      navigate('/admin', { replace: true });
    } else {
      setErrorMessage(result.message || 'Credenciais inválidas ou acesso não autorizado.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0A0A0A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#FFFFFF',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        backgroundColor: '#141414',
        border: '1px solid #2C2C2C',
        borderRadius: 12,
        padding: '36px 32px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: 10,
            backgroundColor: 'rgba(217, 0, 0, 0.15)',
            border: '1px solid rgba(217, 0, 0, 0.3)',
            marginBottom: 14,
          }}>
            <ShieldCheck size={28} color="#D90000" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            Portal Administrativo
          </h1>
          <p style={{ fontSize: 13, color: '#A1A1AA', margin: 0 }}>
            Governança & Controle Operacional DragonCorp
          </p>
        </div>

        {errorMessage && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #EF4444',
            borderRadius: 6,
            padding: '12px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            fontSize: 12.5,
            color: '#FCA5A5',
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 6 }}>
              E-mail Administrativo
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#71717A" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dragoncorp.app"
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  backgroundColor: '#1F1F1F',
                  border: '1px solid #2C2C2C',
                  borderRadius: 6,
                  color: '#FFFFFF',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 6 }}>
              Senha de Acesso
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#71717A" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  backgroundColor: '#1F1F1F',
                  border: '1px solid #2C2C2C',
                  borderRadius: 6,
                  color: '#FFFFFF',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="admin-btn admin-btn-primary"
            style={{ width: '100%', padding: '11px', marginTop: 8, fontSize: 13.5 }}
          >
            {isLoading ? 'Autenticando sessão...' : 'Entrar no Painel Admin'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11.5, color: '#52525B' }}>
          Área restrita e monitorada. Tentativas não autorizadas serão registradas em log de auditoria.
        </div>
      </div>
    </div>
  );
};
