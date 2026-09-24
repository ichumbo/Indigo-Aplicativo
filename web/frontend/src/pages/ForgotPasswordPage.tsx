import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft, Send } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Por favor, informe seu e-mail cadastrado.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const result = await forgotPassword(email);
    setLoading(false);

    if (result.success) {
      setSuccessMessage(result.message || 'Se o e-mail estiver cadastrado, enviamos o link de redefinição.');
    } else {
      setError(result.message || 'Falha ao processar solicitação.');
    }
  };

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Informe seu e-mail para receber as instruções de recuperação."
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

      {successMessage ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '14px',
            padding: '20px 16px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981',
              marginBottom: '12px',
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
            E-mail enviado!
          </h3>
          <p style={{ fontSize: '13px', color: '#A1A1AA', lineHeight: 1.4, marginBottom: '16px' }}>
            {successMessage} Verifique sua caixa de entrada e spam.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <Link
              to="/confirm-account"
              style={{
                width: '100%',
                height: '42px',
                backgroundColor: '#D90000',
                color: '#FFFFFF',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              Inserir código recebido
            </Link>
            <Link
              to="/login"
              style={{
                width: '100%',
                height: '42px',
                backgroundColor: '#161616',
                border: '1px solid #262626',
                color: '#A1A1AA',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              Voltar para o login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              E-mail cadastrado <span style={{ color: '#D90000' }}>*</span>
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
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#D90000')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#262626')}
              />
            </div>
          </div>

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
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(217, 0, 0, 0.35)',
              marginTop: '4px',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#B30000';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#D90000';
            }}
          >
            {loading ? (
              'Enviando...'
            ) : (
              <>
                <Send size={16} />
                <span>Enviar link de recuperação</span>
              </>
            )}
          </button>

          <div
            style={{
              textAlign: 'center',
              fontSize: '13px',
              color: '#A1A1AA',
              marginTop: '8px',
            }}
          >
            Lembrou da senha?{' '}
            <Link
              to="/login"
              style={{
                color: '#D90000',
                fontWeight: 700,
                textDecoration: 'none',
                marginLeft: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ArrowLeft size={14} />
              <span>Voltar ao login</span>
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};
