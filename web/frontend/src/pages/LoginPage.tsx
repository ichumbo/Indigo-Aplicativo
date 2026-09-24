import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Smartphone, X, ExternalLink } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor, informe seu e-mail e senha.');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Falha ao autenticar. Verifique seus dados.');
    }
  };

  const autofillDemo = () => {
    setEmail('treinador@dragoncorp.app');
    setPassword('123456');
    setError(null);
  };

  const handleCreateAccountClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const ua = navigator.userAgent || '';
    
    // Check if on iOS mobile device
    if (/iPhone|iPad|iPod/i.test(ua)) {
      window.location.href = 'https://apps.apple.com/app/dragoncorp';
      return;
    }
    
    // Check if on Android mobile device
    if (/Android/i.test(ua)) {
      window.location.href = 'https://play.google.com/store/apps/details?id=com.dragoncorp.app';
      return;
    }

    // If on desktop / laptop web, open direct store chooser modal
    setShowDownloadModal(true);
  };

  return (
    <AuthLayout
      title="Acesse sua conta"
      subtitle="Entre para gerenciar seu plano e acessar todos os seus recursos."
    >
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '14px',
            color: '#F87171',
            fontSize: '13px',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* E-mail Field */}
        <div>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#D4D4D8',
              marginBottom: '5px',
            }}
          >
            E-mail <span style={{ color: '#D90000' }}>*</span>
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Mail
              size={17}
              style={{
                position: 'absolute',
                left: '13px',
                color: '#71717A',
                pointerEvents: 'none',
              }}
            />
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                height: '44px',
                backgroundColor: '#161616',
                border: '1px solid #262626',
                borderRadius: '10px',
                padding: '0 14px 0 42px',
                color: '#FFFFFF',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#D90000';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217, 0, 0, 0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#262626';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="password"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#D4D4D8',
              marginBottom: '5px',
            }}
          >
            Senha <span style={{ color: '#D90000' }}>*</span>
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Lock
              size={17}
              style={{
                position: 'absolute',
                left: '13px',
                color: '#71717A',
                pointerEvents: 'none',
              }}
            />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                height: '44px',
                backgroundColor: '#161616',
                border: '1px solid #262626',
                borderRadius: '10px',
                padding: '0 40px 0 42px',
                color: '#FFFFFF',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#D90000';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217, 0, 0, 0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#262626';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                background: 'none',
                border: 'none',
                color: '#71717A',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        {/* Remember Me & Forgot Password */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#A1A1AA',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                width: '15px',
                height: '15px',
                accentColor: '#D90000',
                cursor: 'pointer',
              }}
            />
            Lembrar de mim
          </label>
          <Link
            to="/forgot-password"
            style={{
              color: '#A1A1AA',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '13px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#D90000')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#A1A1AA')}
          >
            Esqueci minha senha
          </Link>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            height: '46px',
            backgroundColor: loading ? '#990000' : '#D90000',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(217, 0, 0, 0.35)',
            marginTop: '2px',
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = '#B30000';
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = '#D90000';
          }}
        >
          {loading ? (
            'Entrando...'
          ) : (
            <>
              <span>Entrar</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>

        {/* Demo Button */}
        <button
          type="button"
          onClick={autofillDemo}
          style={{
            width: '100%',
            height: '38px',
            backgroundColor: '#161616',
            border: '1px solid #262626',
            borderRadius: '10px',
            color: '#A1A1AA',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1F1F1F';
            e.currentTarget.style.color = '#FFFFFF';
            e.currentTarget.style.borderColor = '#333333';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#161616';
            e.currentTarget.style.color = '#A1A1AA';
            e.currentTarget.style.borderColor = '#262626';
          }}
        >
          Preencher com Personal Demo (treinador@dragoncorp.app)
        </button>

        {/* Create Account Link -> Direct Store Download */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '13px',
            color: '#A1A1AA',
            marginTop: '4px',
          }}
        >
          Não tem conta?{' '}
          <a
            href="#criar-conta"
            onClick={handleCreateAccountClick}
            style={{
              color: '#D90000',
              fontWeight: 700,
              textDecoration: 'none',
              marginLeft: '4px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            Criar conta grátis
          </a>
        </div>
      </form>

      {/* Modal: Baixar App nas Lojas para Criar Conta */}
      {showDownloadModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
          onClick={() => setShowDownloadModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#161616',
              border: '1px solid #262626',
              borderRadius: '20px',
              padding: '28px 24px',
              position: 'relative',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(217, 0, 0, 0.15)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowDownloadModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: '#71717A',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>

            {/* Icon Header */}
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                backgroundColor: 'rgba(217, 0, 0, 0.12)',
                border: '1px solid rgba(217, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D90000',
                margin: '0 auto 16px auto',
              }}
            >
              <Smartphone size={26} />
            </div>

            <h3
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: '#FFFFFF',
                marginBottom: '8px',
                letterSpacing: '-0.3px',
              }}
            >
              Baixe o aplicativo DragonCorp
            </h3>

            <p
              style={{
                fontSize: '13.5px',
                color: '#A1A1AA',
                lineHeight: 1.5,
                marginBottom: '24px',
              }}
            >
              O cadastro de novos Personal Trainers e Alunos é realizado diretamente no aplicativo mobile. Escolha a sua loja e crie sua conta gratuitamente:
            </p>

            {/* Store Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {/* App Store Button */}
              <a
                href="https://apps.apple.com/app/dragoncorp"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  backgroundColor: '#0F0F0F',
                  border: '1px solid #262626',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s, background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#D90000';
                  e.currentTarget.style.backgroundColor = '#1C1C1C';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#262626';
                  e.currentTarget.style.backgroundColor = '#0F0F0F';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.58.66-.99 1.74-.86 2.76 1.01.08 2.05-.51 2.59-1.26z"/>
                  </svg>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '10px', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Disponível na</div>
                    <div style={{ fontSize: '15px', fontWeight: 700 }}>App Store (iPhone & iPad)</div>
                  </div>
                </div>
                <ExternalLink size={16} style={{ color: '#71717A' }} />
              </a>

              {/* Google Play Button */}
              <a
                href="https://play.google.com/store/apps/details?id=com.dragoncorp.app"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  backgroundColor: '#0F0F0F',
                  border: '1px solid #262626',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s, background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#D90000';
                  e.currentTarget.style.backgroundColor = '#1C1C1C';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#262626';
                  e.currentTarget.style.backgroundColor = '#0F0F0F';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186c-.23-.21-.36-.51-.36-.836V2.65c0-.326.13-.626.359-.836zM15.207 13.414l2.121 2.121-11.83 6.83 9.709-8.951zm2.121-4.949l-2.121 2.121-9.709-8.951 11.83 6.83zm1.414 1.414l2.829 1.633c.534.309.534.809 0 1.118l-2.829 1.633-1.879-1.879 1.879-1.505z"/>
                  </svg>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '10px', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Disponível no</div>
                    <div style={{ fontSize: '15px', fontWeight: 700 }}>Google Play (Android)</div>
                  </div>
                </div>
                <ExternalLink size={16} style={{ color: '#71717A' }} />
              </a>
            </div>

            <button
              onClick={() => setShowDownloadModal(false)}
              style={{
                width: '100%',
                height: '40px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#A1A1AA',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#A1A1AA')}
            >
              Voltar ao login
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
};
