import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Falha no login. Verifique suas credenciais.');
    }
  };

  const autofillDemo = () => {
    setEmail('treinador@dragoncorp.app');
    setPassword('123456');
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-app)',
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle DragonCorp brand geometric accents in background (matching mobile) */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 320,
          height: 320,
          borderRadius: '50%',
          backgroundColor: 'rgba(217, 0, 0, 0.03)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 360,
          height: 360,
          borderRadius: '50%',
          backgroundColor: 'rgba(217, 0, 0, 0.02)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '40px 32px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          zIndex: 1,
        }}
      >
        {/* Brand Header with Official DragonCorp Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/logotipo-principal.png"
            alt="DragonCorp"
            style={{ height: 48, width: 'auto', maxWidth: 220, objectFit: 'contain', margin: '0 auto' }}
          />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginTop: 18, letterSpacing: -0.3 }}>
            Entre na sua conta
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Acesse o portal com as mesmas credenciais do mobile
          </p>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#F87171',
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email / CPF Input with Red Icon */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--accent-red)',
                  pointerEvents: 'none',
                }}
              >
                <Mail size={18} />
              </div>
              <input
                type="text"
                className="form-input"
                style={{
                  paddingLeft: 44,
                  paddingRight: 14,
                  height: 48,
                  fontSize: 14,
                  borderRadius: 'var(--radius-md)',
                }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu email ou CPF"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Password Input with Red Icon & Visibility Toggle */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--accent-red)',
                  pointerEvents: 'none',
                }}
              >
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{
                  paddingLeft: 44,
                  paddingRight: 44,
                  height: 48,
                  fontSize: 14,
                  borderRadius: 'var(--radius-md)',
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha de acesso"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 14,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 4,
                }}
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button (Exact Mobile CTA in #D90000) */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              height: 48,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 0.5,
              borderRadius: 'var(--radius-md)',
              marginTop: 6,
            }}
          >
            {loading ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>

        {/* Forgot Password Link */}
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <button
            type="button"
            onClick={() => alert('Para redefinir sua senha, solicite o link de recuperação enviado ao seu e-mail cadastrado.')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            Esqueci minha senha
          </button>
        </div>

        {/* Fast Fill Demo Account */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: '1px solid var(--border-color)',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 10 }}>
            Conta sincronizada do Personal:
          </span>
          <button
            type="button"
            onClick={autofillDemo}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', fontSize: 12, padding: '8px 12px' }}
          >
            Preencher com Personal Demo (treinador@dragoncorp.app)
          </button>
        </div>
      </div>
    </div>
  );
};
