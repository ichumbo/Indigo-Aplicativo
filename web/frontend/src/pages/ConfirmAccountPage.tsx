import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Mail, KeyRound, AlertCircle, CheckCircle2, ArrowRight, RotateCw } from 'lucide-react';

export const ConfirmAccountPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { confirmAccount, forgotPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !code.trim()) {
      setError('Por favor, informe seu e-mail e o código de 6 dígitos.');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await confirmAccount(email, code);
    setLoading(false);

    if (result.success) {
      setSuccess('Conta confirmada com sucesso! Redirecionando...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } else {
      setError(result.message || 'Código inválido ou expirado.');
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Informe seu e-mail para reenviar o código.');
      return;
    }

    setResending(true);
    setError(null);
    const result = await forgotPassword(email);
    setResending(false);

    if (result.success) {
      setSuccess('Um novo código foi enviado para seu e-mail.');
    } else {
      setError(result.message || 'Falha ao reenviar código.');
    }
  };

  return (
    <AuthLayout
      title="Confirmar conta"
      subtitle="Digite o código enviado para seu e-mail para validar seu acesso."
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

      {success && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '14px',
            color: '#34D399',
            fontSize: '13px',
          }}
        >
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{success}</span>
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

        {/* 6-Digit Code Field */}
        <div>
          <label
            htmlFor="code"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#D4D4D8',
              marginBottom: '5px',
            }}
          >
            Código de Verificação <span style={{ color: '#D90000' }}>*</span>
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <KeyRound
              size={17}
              style={{
                position: 'absolute',
                left: '13px',
                color: '#71717A',
                pointerEvents: 'none',
              }}
            />
            <input
              id="code"
              type="text"
              placeholder="Ex: 123456"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              style={{
                width: '100%',
                height: '44px',
                backgroundColor: '#161616',
                border: '1px solid #262626',
                borderRadius: '10px',
                padding: '0 14px 0 42px',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '4px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#D90000')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#262626')}
            />
          </div>
        </div>

        {/* Resend Code Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            style={{
              background: 'none',
              border: 'none',
              color: '#A1A1AA',
              fontSize: '12px',
              cursor: resending ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#D90000')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#A1A1AA')}
          >
            <RotateCw size={13} className={resending ? 'animate-spin' : ''} />
            <span>{resending ? 'Reenviando...' : 'Não recebeu? Reenviar código'}</span>
          </button>
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
            fontSize: '14px',
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
            'Validando...'
          ) : (
            <>
              <span>Confirmar e acessar</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>

        {/* Back to Login */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '13px',
            color: '#A1A1AA',
            marginTop: '6px',
          }}
        >
          <Link
            to="/login"
            style={{
              color: '#D90000',
              fontWeight: 700,
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            Voltar para o login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
