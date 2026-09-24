import React from 'react';
import { FileText, ArrowLeft, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TermsOfUsePage: React.FC = () => {
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
          <FileText size={28} color="#D90000" />
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0 }}>Termos de Uso — DragonCorp</h1>
        </div>
        <p style={{ color: '#71717a', fontSize: '13px', marginBottom: '32px' }}>Última atualização: Setembro de 2026 | Versão 1.0.0</p>

        <section style={{ backgroundColor: '#18181b', borderRadius: '16px', border: '1px solid #27272a', padding: '24px', marginBottom: '24px', lineHeight: '1.7', fontSize: '14px', color: '#d4d4d8' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>1. Objeto e Serviços</h2>
          <p>O <strong>DragonCorp</strong> é uma plataforma de tecnologia voltada para a gestão de consultoria esportiva, prescrição de treinamentos, avaliações físicas e comunicação entre profissionais de Educação Física e seus alunos.</p>
        </section>

        <section style={{ backgroundColor: '#18181b', borderRadius: '16px', border: '1px solid #27272a', padding: '24px', marginBottom: '24px', lineHeight: '1.7', fontSize: '14px', color: '#d4d4d8' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>2. Assinaturas Digitais e Faturamento</h2>
          <p>O DragonCorp oferece uma versão gratuita com limite de alunos e planos por assinatura auto-renováveis:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li><strong>Plano Mensal Pro:</strong> R$ 19,90/mês, com renovação automática mensal.</li>
            <li><strong>Plano Anual Pro:</strong> R$ 199,00/ano (equivalente a 2 meses grátis), com renovação anual.</li>
          </ul>
          <p style={{ marginTop: '10px' }}>
            As cobranças são processadas pela <strong>Apple App Store</strong> ou <strong>Google Play Store</strong>. O usuário pode cancelar a renovação a qualquer momento através das configurações de sua conta na loja de aplicativos.
          </p>
        </section>

        <section style={{ backgroundColor: '#18181b', borderRadius: '16px', border: '1px solid #27272a', padding: '24px', marginBottom: '24px', lineHeight: '1.7', fontSize: '14px', color: '#d4d4d8' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>3. Responsabilidade Técnica</h2>
          <p>A correta prescrição de exercícios e avaliação física é de responsabilidade exclusiva do profissional de Educação Física devidamente habilitado e credenciado junto ao Conselho Regional de Educação Física (CREF).</p>
        </section>

        <div style={{ textAlign: 'center', color: '#71717a', fontSize: '13px', marginTop: '40px' }}>
          <p style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Mail size={14} /> Contato: <strong>suporte@dragoncorp.app</strong>
          </p>
        </div>
      </main>
    </div>
  );
};
