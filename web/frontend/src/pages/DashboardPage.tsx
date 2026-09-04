import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Dumbbell,
  FileCheck2,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Calendar,
  Star,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/common/Loader';

export const DashboardPage: React.FC = () => {
  const { user, trainerProfile } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiClient.get('/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Falha ao carregar dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <Loader text="Carregando central do treinador..." />;

  const stats = data?.stats || {};
  const students = data?.students || [];
  const recentFeedbacks = data?.recentFeedbacks || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Card Principal do Personal (Prompt Item 10: Fundo Vermelho DragonCorp) */}
      <div className="trainer-hero-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500'}
            alt="Personal Trainer"
            style={{
              width: 58,
              height: 58,
              borderRadius: 'var(--radius-full)',
              objectFit: 'cover',
              border: '2px solid rgba(255, 255, 255, 0.4)',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', letterSpacing: -0.5 }}>
                {user?.name || 'Personal DragonCorp'}
              </h1>
              <span
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <Star size={11} fill="#FFFFFF" /> PRO
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.85)', marginTop: 2 }}>
              {trainerProfile?.cref_number ? `CREF ${trainerProfile.cref_number}/${trainerProfile.cref_state}` : 'CREF 123456-G/SP'} • Consultoria Ativa
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate('/alunos')}
            className="btn"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              borderColor: 'rgba(255, 255, 255, 0.25)',
              padding: '8px 16px',
            }}
          >
            <Users size={15} />
            <span>Meus Alunos</span>
          </button>
          <button
            onClick={() => navigate('/treinos/novo')}
            className="btn"
            style={{
              backgroundColor: '#FFFFFF',
              color: 'var(--accent-red)',
              fontWeight: 700,
              padding: '8px 18px',
            }}
          >
            <Plus size={16} />
            <span>Criar Treino Rápido</span>
          </button>
        </div>
      </div>

      {/* 2. Banner de Status (Prompt Item 24: Aviso sutil de conectividade) */}
      <div className="warning-banner">
        <AlertCircle size={16} style={{ flexShrink: 0 }} />
        <span>
          Todos os dados sincronizados em tempo real com o aplicativo mobile DragonCorp dos seus alunos.
        </span>
      </div>

      {/* 3. Resumo do Dia (Prompt Item 11: Adaptação Horizontal com Card Vermelho em Destaque) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Resumo do Dia
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Atualizado agora
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
          }}
        >
          {/* Card 1: Em Destaque com Vermelho (Hierarquia Visual) */}
          <div className="summary-card summary-card-featured">
            <span className="summary-title" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
              Atendimentos / Check-ins
            </span>
            <div className="summary-value" style={{ fontSize: 32, fontWeight: 900 }}>
              {stats.activeStudents ?? 0}
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.8)' }}>
              Alunos acompanhados nesta consultoria
            </span>
          </div>

          {/* Card 2: Treinos Ativos */}
          <div className="summary-card">
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Treinos Ativos
            </span>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)' }}>
              {stats.activePlans ?? 0}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Prescrições vigentes no aplicativo
            </span>
          </div>

          {/* Card 3: Avaliações Físicas */}
          <div className="summary-card">
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Reavaliações Próximas
            </span>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)' }}>
              {stats.expiringPlans ?? 0}
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-warning)' }}>
              Necessitam de nova periodização
            </span>
          </div>

          {/* Card 4: Alertas de Desconforto */}
          <div className="summary-card">
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Relatos de Dor
            </span>
            <div style={{ fontSize: 32, fontWeight: 900, color: stats.painAlerts > 0 ? 'var(--accent-red)' : 'var(--color-success)' }}>
              {stats.painAlerts ?? 0}
            </div>
            <span style={{ fontSize: 11, color: stats.painAlerts > 0 ? 'var(--accent-red)' : 'var(--color-success)' }}>
              {stats.painAlerts > 0 ? 'Exigem revisão imediata de carga' : 'Sem relatos adversos recentes'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Seção "Atenção Necessária" + Alunos Recentes (Prompt Item 25) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* Left Column: Alunos com Treinos Recentes */}
        <div className="card" style={{ padding: 0 }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF' }}>
                Alunos da Consultoria
              </h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {students.length} alunos cadastrados no ecossistema
              </span>
            </div>

            <button
              onClick={() => navigate('/alunos')}
              className="btn btn-secondary btn-sm"
            >
              <span>Ver Todos</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Objetivo</th>
                  <th>Plano Vigente</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 5).map((st: any) => (
                  <tr key={st.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={st.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'}
                          alt={st.full_name}
                          style={{ width: 34, height: 34, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                            {st.full_name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {st.phone || 'Sem telefone'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{st.main_goal}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                        {st.active_plans?.[0]?.name || 'Nenhum treino ativo'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${st.status === 'ativo' ? 'badge-green' : 'badge-neutral'}`}>
                        {st.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => navigate(`/alunos/${st.id}`)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: 11 }}
                      >
                        Ver Perfil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Painel de Atenção Necessária (Prompt Item 25) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertTriangle size={18} color="var(--accent-red)" />
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Atenção Necessária
              </h3>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Itens prioritários reportados pelos alunos no celular para sua revisão técnica:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentFeedbacks.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', backgroundColor: 'var(--card-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <CheckCircle2 size={24} color="var(--color-success)" style={{ margin: '0 auto 6px auto' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Nenhuma pendência crítica no momento.
                  </span>
                </div>
              ) : (
                recentFeedbacks.slice(0, 3).map((fb: any) => (
                  <div
                    key={fb.id}
                    style={{
                      padding: 12,
                      backgroundColor: 'var(--card-secondary)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: fb.has_pain ? '3px solid var(--accent-red)' : '3px solid var(--border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#FFFFFF' }}>
                        {fb.student?.full_name || 'Aluno'}
                      </span>
                      {fb.has_pain && (
                        <span className="badge badge-red" style={{ fontSize: 9 }}>
                          Dor nível {fb.pain_level}/10
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {fb.comments || 'Execução registrada sem observações textuais.'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Banner de Atalho Rápido para Avaliações */}
          <div
            className="card"
            style={{
              padding: 18,
              backgroundColor: 'var(--card-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <FileCheck2 size={20} color="var(--accent-red)" />
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
                Comparativo de Avaliações
              </h4>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Compare a evolução de perímetros, peso e dobras cutâneas lado a lado no desktop.
            </p>
            <button
              type="button"
              onClick={() => navigate('/avaliacoes')}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%' }}
            >
              Abrir Avaliações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
