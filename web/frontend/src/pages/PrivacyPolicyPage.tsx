import React from 'react';
import { Shield, ArrowLeft, Mail, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPolicyPage: React.FC = () => {
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

      {/* Content */}
      <main style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Shield size={28} color="#D90000" />
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0 }}>Política de Privacidade — DragonCorp</h1>
        </div>
        <p style={{ color: '#71717a', fontSize: '13px', marginBottom: '32px' }}>Última atualização: Setembro de 2026 | Versão 1.0.0 (Conformidade LGPD, App Store & Google Play)</p>

        <section style={{ backgroundColor: '#18181b', borderRadius: '16px', border: '1px solid #27272a', padding: '24px', marginBottom: '24px', lineHeight: '1.7', fontSize: '14px', color: '#d4d4d8' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>1. Informações Coletadas e Finalidade</h2>
          <p>O <strong>DragonCorp</strong> coleta dados estritamente necessários para a prestação de serviços de consultoria esportiva e prescrição de treinos físicos:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li><strong>Identificação e Contato:</strong> Nome, e-mail, telefone, data de nascimento e registro profissional (CREF para personal trainers).</li>
            <li><strong>Dados de Saúde e Avaliação Física:</strong> Medidas antropométricas, dobras cutâneas, peso, altura, frequência cardíaca, VO2max e histórico de lesões/anamnese para prescrição personalizada.</li>
            <li><strong>Fotos Posturais e de Evolução:</strong> Capturadas ou selecionadas pelo usuário exclusivamente para fins de acompanhamento visual físico com o treinador.</li>
            <li><strong>Dados de Faturamento:</strong> As compras de assinaturas digitais são processadas pelas lojas oficiais (Apple App Store e Google Play Store). Não armazenamos números de cartão de crédito.</li>
          </ul>
        </section>

        <section style={{ backgroundColor: '#18181b', borderRadius: '16px', border: '1px solid #27272a', padding: '24px', marginBottom: '24px', lineHeight: '1.7', fontSize: '14px', color: '#d4d4d8' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>2. Segurança e Criptografia</h2>
          <p>Todos os dados trafegam exclusivamente via conexões seguras criptografadas (HTTPS/TLS). Tokens de autenticação são mantidos em cofres seguros no dispositivo (Keychain no iOS e Keystore no Android).</p>
        </section>

        <section style={{ backgroundColor: '#18181b', borderRadius: '16px', border: '1px solid #27272a', padding: '24px', marginBottom: '24px', lineHeight: '1.7', fontSize: '14px', color: '#d4d4d8' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>3. Direitos do Titular e Exclusão de Dados</h2>
          <p>O titular dos dados pode a qualquer momento solicitar a visualização, correção, anonimização ou exclusão definitiva de seus dados diretamente pelo aplicativo ou pela página pública:</p>
          <p style={{ marginTop: '8px' }}>
            <Link to="/delete-account" style={{ color: '#D90000', fontWeight: '600', textDecoration: 'none' }}>
              Acessar Canal de Exclusão de Conta →
            </Link>
          </p>
        </section>

        <div style={{ textAlign: 'center', color: '#71717a', fontSize: '13px', marginTop: '40px' }}>
          <p style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Mail size={14} /> Dúvidas: <strong>privacidade@dragoncorp.app</strong>
          </p>
        </div>
      </main>
    </div>
  );
};
