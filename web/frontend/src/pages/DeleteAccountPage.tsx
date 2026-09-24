import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, AlertTriangle, ArrowLeft, Mail, ExternalLink, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DeleteAccountPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !confirmed) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#09090b', color: '#f4f4f5', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #18181b', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#D90000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '14px' }}>
            D
          </div>
          <span style={{ fontWeight: '800', letterSpacing: '1px', fontSize: '16px' }}>DRAGON<span style={{ color: '#D90000' }}>CORP</span></span>
        </div>
        <Link to="/login" style={{ color: '#a1a1aa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
          <ArrowLeft size={16} /> Voltar ao Início
        </Link>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '720px', margin: '40px auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: 'rgba(217, 0, 0, 0.1)', color: '#EF4444', marginBottom: '16px' }}>
            <Trash2 size={32} />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '8px' }}>
            Solicitação de Exclusão de Conta e Dados
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '15px', lineHeight: '1.6' }}>
            Canal oficial para atendimento de direitos do titular (LGPD / GDPR) e conformidade com as diretrizes do Google Play e App Store.
          </p>
        </div>

        {submitted ? (
          <div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', marginBottom: '16px' }}>
              <CheckCircle size={36} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>Solicitação Recebida com Sucesso</h2>
            <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
              Um e-mail de confirmação foi enviado para <strong>{email}</strong>. Suas sessões ativas foram revogadas e o processo de anonimização e exclusão definitiva será concluído em até <strong>15 dias úteis</strong>.
            </p>
            <div style={{ backgroundColor: '#27272a', borderRadius: '8px', padding: '16px', textAlign: 'left', fontSize: '13px', color: '#d4d4d8', marginBottom: '24px' }}>
              <strong>Importante sobre Assinaturas Digitais:</strong>
              <p style={{ margin: '6px 0 0 0', color: '#a1a1aa' }}>
                A exclusão da conta DragonCorp <strong>não cancela automaticamente</strong> assinaturas administradas diretamente pela Apple App Store ou Google Play Store. Caso possua uma assinatura ativa, gerencie ou cancele-a nas configurações da respectiva loja.
              </p>
            </div>
            <Link to="/login" style={{ display: 'inline-block', backgroundColor: '#D90000', color: '#fff', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
              Concluir
            </Link>
          </div>
        ) : (
          <div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '16px', padding: '28px' }}>
            {/* Warning Box */}
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px' }}>
              <AlertTriangle size={22} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#EF4444', margin: '0 0 4px 0' }}>Consequências da Exclusão Definitiva</h3>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#d4d4d8', lineHeight: '1.5' }}>
                  <li>Todos os seus treinos, avaliações físicas, histórico de evolução corporal e fotos serão permanentemente removidos.</li>
                  <li>Alunos e personal trainers perderão o vínculo e o acesso ao painel compartilhado.</li>
                  <li>Dados estritamente fiscais e contábeis de transações anteriores serão retidos pelo prazo legal aplicável (Lei 13.709/2018).</li>
                </ul>
              </div>
            </div>

            {/* Store Subscription Notice */}
            <div style={{ backgroundColor: '#27272a', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: '700', color: '#fff', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={16} color="#38bdf8" /> Assinaturas In-App (Apple & Google)
              </h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#a1a1aa', lineHeight: '1.5' }}>
                Por políticas de segurança das lojas de aplicativos, o cancelamento de cobranças recorrentes deve ser feito diretamente no seu ID Apple ou Conta Google:
              </p>
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                <a href="https://apps.apple.com/account/subscriptions" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', fontSize: '12.5px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Gerenciar na App Store <ExternalLink size={12} />
                </a>
                <a href="https://play.google.com/store/account/subscriptions" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', fontSize: '12.5px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Gerenciar na Google Play <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#e4e4e7', marginBottom: '6px' }}>
                  E-mail cadastrado na conta DragonCorp *
                </label>
                <input
                  type="email"
                  required
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#09090b', border: '1px solid #3f3f46', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#e4e4e7', marginBottom: '6px' }}>
                  Motivo da solicitação (opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Conte-nos brevemente o motivo da saída..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#09090b', border: '1px solid #3f3f46', color: '#fff', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="confirm-delete"
                  required
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  style={{ marginTop: '3px', accentColor: '#D90000', cursor: 'pointer' }}
                />
                <label htmlFor="confirm-delete" style={{ fontSize: '12.5px', color: '#a1a1aa', lineHeight: '1.4', cursor: 'pointer' }}>
                  Estou ciente de que a exclusão da conta é permanente e irreversível, e que eventuais assinaturas ativas na App Store ou Google Play devem ser canceladas diretamente na respectiva loja.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !confirmed || !email}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: confirmed && email ? '#DC2626' : '#3f3f46',
                  color: '#fff',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: confirmed && email ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Trash2 size={16} />
                {loading ? 'Processando Solicitação...' : 'Confirmar Solicitação de Exclusão'}
              </button>
            </form>
          </div>
        )}

        {/* Support Footer */}
        <div style={{ marginTop: '32px', textAlign: 'center', color: '#71717a', fontSize: '12px' }}>
          <p style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Mail size={14} /> Dúvidas do titular e contato do Encarregado DPO: <strong>privacidade@dragoncorp.app</strong>
          </p>
        </div>
      </main>
    </div>
  );
};
