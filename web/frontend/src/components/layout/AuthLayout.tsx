import React from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#0F0F0F',
        color: '#FFFFFF',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
      }}
    >
      {/* LEFT SIDE: Full-Bleed Edge-to-Edge capa-login.png */}
      <div
        className="auth-hero-banner"
        style={{
          flex: '1 1 50%',
          width: '50%',
          height: '100vh',
          maxHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#0A0A0A',
          borderRight: '1px solid #1A1A1A',
        }}
      >
        <img
          src="/capa-login.png"
          alt="DragonCorp - Treine com seu Personal"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
            userSelect: 'none',
          }}
        />
      </div>

      {/* RIGHT SIDE: Auth Container (Harmonious Centered Card, Zero Scroll) */}
      <div
        style={{
          flex: '1 1 50%',
          width: '50%',
          height: '100vh',
          maxHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px 32px',
          backgroundColor: '#0F0F0F',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Unified Center Card */}
        <div
          style={{
            width: '100%',
            maxWidth: '410px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header Block: Logo + Title + Subtitle */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              marginBottom: '22px',
            }}
          >
            {/* Real Official DragonCorp Logo */}
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                marginBottom: '18px',
                transition: 'opacity 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <img
                src="/logotipo-principal.png"
                alt="DragonCorp"
                style={{
                  height: '42px',
                  width: 'auto',
                  maxWidth: '220px',
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (!img.src.includes('logo-principal.png')) {
                    img.src = '/logo-principal.png';
                  }
                }}
              />
            </Link>

            {/* Minimalist Title */}
            <h1
              style={{
                fontSize: '25px',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                color: '#FFFFFF',
                margin: '0 0 6px 0',
                lineHeight: 1.25,
              }}
            >
              {title}
            </h1>

            {/* Minimalist Subtitle */}
            <p
              style={{
                fontSize: '13.5px',
                fontWeight: 400,
                color: '#9CA3AF',
                letterSpacing: '-0.01em',
                lineHeight: 1.45,
                maxWidth: '360px',
                margin: 0,
              }}
            >
              {subtitle}
            </p>
          </div>

          {/* Form Content */}
          {children}

          {/* Footer Legal Links */}
          <div
            style={{
              textAlign: 'center',
              fontSize: '11.5px',
              color: '#6B7280',
              lineHeight: 1.5,
              marginTop: '20px',
            }}
          >
            Ao continuar, você concorda com nossos{' '}
            <Link
              to="/terms"
              style={{
                color: '#9CA3AF',
                textDecoration: 'underline',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#D90000')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
            >
              Termos de Uso
            </Link>{' '}
            e{' '}
            <Link
              to="/privacy"
              style={{
                color: '#9CA3AF',
                textDecoration: 'underline',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#D90000')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
            >
              Política de Privacidade
            </Link>
            .
          </div>
        </div>
      </div>

      {/* Responsive Stacking for Small Devices */}
      <style>{`
        @media (max-width: 900px) {
          .auth-hero-banner {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
