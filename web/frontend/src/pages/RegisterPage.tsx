import React from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Smartphone, ExternalLink, ArrowLeft } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  return (
    <AuthLayout
      title="Crie sua conta no App"
      subtitle="O cadastro de novos Personal Trainers e Alunos é realizado diretamente no aplicativo mobile oficial."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            backgroundColor: '#161616',
            border: '1px solid #262626',
            borderRadius: '16px',
            padding: '20px 16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(217, 0, 0, 0.12)',
              border: '1px solid rgba(217, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D90000',
              margin: '0 auto 12px auto',
            }}
          >
            <Smartphone size={24} />
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
            Baixe o DragonCorp no seu celular
          </h3>
          <p style={{ fontSize: '13px', color: '#A1A1AA', lineHeight: 1.4, marginBottom: '20px' }}>
            Escolha a loja do seu aparelho para instalar o aplicativo e criar seu perfil gratuitamente:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* App Store Button */}
            <a
              href="https://apps.apple.com/app/dragoncorp"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: '#0F0F0F',
                border: '1px solid #262626',
                borderRadius: '10px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.58.66-.99 1.74-.86 2.76 1.01.08 2.05-.51 2.59-1.26z"/>
                </svg>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '10px', color: '#71717A', textTransform: 'uppercase' }}>Disponível na</div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>App Store (iOS)</div>
                </div>
              </div>
              <ExternalLink size={15} style={{ color: '#71717A' }} />
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
                padding: '12px 16px',
                backgroundColor: '#0F0F0F',
                border: '1px solid #262626',
                borderRadius: '10px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186c-.23-.21-.36-.51-.36-.836V2.65c0-.326.13-.626.359-.836zM15.207 13.414l2.121 2.121-11.83 6.83 9.709-8.951zm2.121-4.949l-2.121 2.121-9.709-8.951 11.83 6.83zm1.414 1.414l2.829 1.633c.534.309.534.809 0 1.118l-2.829 1.633-1.879-1.879 1.879-1.505z"/>
                </svg>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '10px', color: '#71717A', textTransform: 'uppercase' }}>Disponível no</div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>Google Play (Android)</div>
                </div>
              </div>
              <ExternalLink size={15} style={{ color: '#71717A' }} />
            </a>
          </div>
        </div>

        {/* Back to Login */}
        <div style={{ textAlign: 'center', marginTop: '4px' }}>
          <Link
            to="/login"
            style={{
              color: '#D90000',
              fontWeight: 700,
              fontSize: '13px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ArrowLeft size={14} />
            <span>Já tem conta? Fazer login</span>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};
