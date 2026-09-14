import React, { useEffect, useState, useMemo } from 'react';
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
  Phone,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  MoreHorizontal,
  Activity,
  ShieldAlert,
  Flame,
  Layers,
  Clipboard,
  Trophy,
  SlidersHorizontal,
  RefreshCw,
  Clock,
  Eye,
  Check,
  Send,
  User,
  Zap,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/common/Loader';
import { Modal } from '../components/common/Modal';

export const DashboardPage: React.FC = () => {
  const { user, trainerProfile } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});

  // Modals state
  const [selectedStudentForMenu, setSelectedStudentForMenu] = useState<any | null>(null);
  const [feedbackReplyModal, setFeedbackReplyModal] = useState<any | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/dashboard');
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível carregar a central do treinador.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const stats = data?.stats || {};
  const students = data?.students || [];
  const recentFeedbacks = data?.recentFeedbacks || [];

  const toggleExpand = (id: string) => {
    setExpandedStudents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSendFeedbackReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackReplyModal || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await apiClient.post(`/feedbacks/${feedbackReplyModal.id}/respond`, {
        message: replyText.trim(),
      });
      setFeedbackReplyModal(null);
      setReplyText('');
      fetchDashboard();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao enviar resposta ao feedback.');
    } finally {
      setSendingReply(false);
    }
  };

  // Filter students based on search and selected filter
  const filteredStudents = useMemo(() => {
    return students.filter((st: any) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        st.name?.toLowerCase().includes(query) ||
        st.full_name?.toLowerCase().includes(query) ||
        st.main_goal?.toLowerCase().includes(query) ||
        st.phone?.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (activeFilter === 'active') return st.status === 'ativo' || st.status === 'ACTIVE';
      if (activeFilter === 'inactive') return st.status === 'inativo' || st.status === 'INACTIVE';
      if (activeFilter === 'pain') return st.has_pain || stats.painAlerts > 0;
      return true;
    });
  }, [students, searchQuery, activeFilter, stats.painAlerts]);

  if (loading) return <Loader text="Carregando central do treinador..." />;

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          textAlign: 'center',
        }}
      >
        <AlertTriangle size={42} color="var(--primary)" style={{ marginBottom: 12 }} />
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Falha ao carregar</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '8px 0 20px 0' }}>{error}</p>
        <button onClick={fetchDashboard} className="btn btn-primary">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      {/* 1. TOP HEADER (1:1 Mobile Header Component) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 0 4px 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500'}
            alt="Treinador"
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-full)',
              objectFit: 'cover',
              border: '2px solid var(--border-color)',
            }}
          />
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Central do Treinador
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', letterSpacing: -0.3 }}>
                {user?.name || 'Personal DragonCorp'}
              </h1>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(217, 0, 0, 0.15)',
                  border: '1px solid rgba(217, 0, 0, 0.4)',
                  fontSize: 10,
                  fontWeight: 800,
                  color: 'var(--primary-light)',
                  textTransform: 'uppercase',
                }}
              >
                <Star size={10} fill="var(--primary-light)" /> PRO
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => navigate('/notificacoes')}
            style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
            }}
            title="Notificações"
          >
            <Zap size={18} color="#FFFFFF" />
            {stats.unreadNotifications > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 16,
                  height: 16,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--primary)',
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {stats.unreadNotifications}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. RESUMO DO DIA (1:1 Mobile Today Cards 2x2 Grid) */}
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
            Resumo do dia
          </span>
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(217, 0, 0, 0.1)',
              border: '1px solid rgba(217, 0, 0, 0.35)',
              color: 'var(--primary)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <SlidersHorizontal size={13} />
            <span>Personalizar</span>
          </button>
        </div>

        {/* 2x2 Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {/* Card 1: Featured Primary Red Card (Alunos Ativos) */}
          <div
            onClick={() => navigate('/alunos')}
            style={{
              backgroundColor: 'var(--primary)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 10,
              cursor: 'pointer',
              minHeight: 110,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={16} color="#FFFFFF" />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1 }}>
                {stats.activeStudents ?? 0}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255, 255, 255, 0.9)', marginTop: 2 }}>
                Alunos Ativos
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#FFFFFF' }}>
              <span>Ver detalhes</span>
              <ChevronRight size={14} />
            </div>
          </div>

          {/* Card 2: Treinos Ativos */}
          <div
            onClick={() => navigate('/treinos')}
            style={{
              backgroundColor: 'var(--card-secondary)',
              borderColor: 'var(--border-color)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 10,
              cursor: 'pointer',
              minHeight: 110,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Dumbbell size={16} color="var(--primary)" />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {stats.activePlans ?? 0}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 2 }}>
                Treinos Vigentes
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>
              <span>Abrir área</span>
              <ChevronRight size={14} />
            </div>
          </div>

          {/* Card 3: Reavaliações Próximas */}
          <div
            onClick={() => navigate('/avaliacoes')}
            style={{
              backgroundColor: 'var(--card-secondary)',
              borderColor: 'var(--border-color)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 10,
              cursor: 'pointer',
              minHeight: 110,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileCheck2 size={16} color="var(--primary)" />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {stats.expiringPlans ?? 0}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 2 }}>
                Treinos a Vencer
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>
              <span>Filtrar alunos</span>
              <ChevronRight size={14} />
            </div>
          </div>

          {/* Card 4: Relatos de Dor / Feedbacks */}
          <div
            onClick={() => navigate('/alunos')}
            style={{
              backgroundColor: 'var(--card-secondary)',
              borderColor: stats.painAlerts > 0 ? 'rgba(217, 0, 0, 0.55)' : 'var(--border-color)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 10,
              cursor: 'pointer',
              minHeight: 110,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldAlert size={16} color="var(--primary)" />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: stats.painAlerts > 0 ? 'var(--primary)' : 'var(--text-primary)', lineHeight: 1.1 }}>
                {stats.painAlerts ?? 0}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 2 }}>
                Relatos de Dor
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: stats.painAlerts > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
              <span>{stats.painAlerts > 0 ? 'Revisar agora' : 'Em dia'}</span>
              <ChevronRight size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. ATENÇÃO NECESSÁRIA (1:1 Mobile Pending Section) */}
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(217, 0, 0, 0.16)',
                border: '1px solid rgba(217, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertCircle size={18} color="var(--primary)" />
            </div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                Atenção necessária
              </span>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {recentFeedbacks.length > 0 ? `${recentFeedbacks.length} novos itens para revisar` : 'Sem novos alertas na fila'}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--card-secondary)',
              border: '1px solid var(--border-color)',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {recentFeedbacks.length} na fila
          </div>
        </div>

        {/* Pending Items List */}
        {recentFeedbacks.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <CheckCircle2 size={24} color="var(--primary)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Sem pendências críticas
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              A central será atualizada quando houver nova ação para revisar.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentFeedbacks.map((fb: any) => (
              <div
                key={fb.id}
                style={{
                  backgroundColor: 'var(--card-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={fb.student?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'}
                      alt={fb.student?.full_name || 'Aluno'}
                      style={{ width: 38, height: 38, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: fb.has_pain ? 'var(--color-danger)' : 'var(--color-warning)',
                        border: '2px solid var(--card-secondary)',
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {fb.student?.full_name || fb.student_name || 'Aluno'}
                      </span>
                      <span
                        className={`badge ${fb.has_pain ? 'badge-red' : 'badge-yellow'}`}
                        style={{ fontSize: 9 }}
                      >
                        {fb.has_pain ? 'DOR / RISCO' : 'FEEDBACK'}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {fb.notes || fb.comments || (fb.has_pain ? `Relato de dor no exercício: ${fb.pain_location || 'Articulação'}` : 'Feedback de treino enviado')}
                    </p>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                      RPE: {fb.rpe ?? 8}/10 • {fb.created_at ? new Date(fb.created_at).toLocaleDateString('pt-BR') : 'Hoje'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--divider)', paddingTop: 8 }}>
                  <button
                    onClick={() => setFeedbackReplyModal(fb)}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: 11, padding: '4px 12px' }}
                  >
                    <span>Responder</span>
                  </button>
                  <button
                    onClick={() => navigate(`/alunos/${fb.student_id}`)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                  >
                    <span>Ver Aluno</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. HERO BANNER: TESTE AERÓBIO (CONCONI) & PROTOCOLO (1:1 Mobile Hero Banner) */}
      <div
        onClick={() => navigate('/protocolos')}
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--card-secondary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Activity size={20} color="var(--primary)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
            Teste Aeróbio (Conconi) & Protocolos
          </h3>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            Prescrição semanal e laudo em PDF com FC/Velocidade
          </p>
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--card-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ChevronRight size={16} color="var(--primary)" />
        </div>
      </div>

      {/* 5. ACESSOS RÁPIDOS (1:1 Mobile Shortcut Grid) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
            Acessos rápidos
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Principais</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          {[
            { label: 'Novo Treino', detail: 'Prescrever ficha', icon: Dumbbell, path: '/treinos/novo' },
            { label: 'Nova Avaliação', detail: 'Composição corporal', icon: FileCheck2, path: '/avaliacoes' },
            { label: 'Relatos de Dor', detail: 'Ajuste e segurança', icon: ShieldAlert, path: '/alunos' },
            { label: 'Evolução', detail: 'Consistência e cargas', icon: Trophy, path: '/evolucao' },
            { label: 'Exercícios', detail: 'Biblioteca oficial', icon: Layers, path: '/exercicios' },
            { label: 'Mensagens', detail: 'Chat com alunos', icon: MessageSquare, path: '/mensagens' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                onClick={() => navigate(item.path)}
                style={{
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--card-secondary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} color="var(--primary)" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{item.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. ALUNOS (1:1 Mobile Student List & Cards) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
            Alunos
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {filteredStudents.length}/{students.length}
          </span>
        </div>

        {/* Search Bar (1:1 Mobile Search Bar) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Search size={18} color="var(--primary)" />
          <input
            type="text"
            placeholder="Buscar por nome, contato, objetivo ou observação"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 13,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`pill-filter ${activeFilter === 'all' ? 'active' : ''}`}
            style={{ fontSize: 11, padding: '5px 12px' }}
          >
            Todos ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('active')}
            className={`pill-filter ${activeFilter === 'active' ? 'active' : ''}`}
            style={{ fontSize: 11, padding: '5px 12px' }}
          >
            Ativos
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('pain')}
            className={`pill-filter ${activeFilter === 'pain' ? 'active' : ''}`}
            style={{ fontSize: 11, padding: '5px 12px' }}
          >
            Com Relato de Dor
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('inactive')}
            className={`pill-filter ${activeFilter === 'inactive' ? 'active' : ''}`}
            style={{ fontSize: 11, padding: '5px 12px' }}
          >
            Inativos
          </button>
        </div>

        {/* Students List (1:1 Mobile StudentCard items) */}
        {filteredStudents.length === 0 ? (
          <div
            style={{
              padding: '36px 16px',
              textAlign: 'center',
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            Nenhum aluno encontrado para este filtro.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredStudents.map((st: any) => {
              const isExpanded = !!expandedStudents[st.id];

              return (
                <div
                  key={st.id}
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Top Row: Avatar, Name, Status, Goal */}
                  <div
                    onClick={() => navigate(`/alunos/${st.id}`)}
                    style={{
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <img
                      src={st.avatar_url || st.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'}
                      alt={st.name || st.full_name}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 'var(--radius-full)',
                        objectFit: 'cover',
                        border: '2px solid var(--card-secondary)',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {st.full_name || st.name}
                        </span>
                        <span
                          className={`badge ${st.status === 'ativo' || st.status === 'ACTIVE' ? 'badge-green' : 'badge-neutral'}`}
                          style={{ fontSize: 10 }}
                        >
                          {st.status === 'ativo' || st.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {st.main_goal || st.goal || 'Sem objetivo informado'}
                      </div>
                    </div>
                  </div>

                  {/* Badges & Actions Row (1:1 Mobile Control Row) */}
                  <div
                    style={{
                      padding: '0 16px 12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                        {st.active_plans?.[0]?.name ? `Treino: ${st.active_plans[0].name}` : 'Em dia'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {st.phone && (
                        <button
                          type="button"
                          onClick={() => window.open(`https://wa.me/55${st.phone.replace(/\D/g, '')}`, '_blank')}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--card-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          title="WhatsApp"
                        >
                          <Phone size={14} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedStudentForMenu(st)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--card-secondary)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title="Opções do aluno"
                      >
                        <MoreHorizontal size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleExpand(st.id)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--card-secondary)',
                          border: '1px solid var(--border-color)',
                          color: isExpanded ? 'var(--primary)' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title={isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                      >
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Section: 2x2 Metrics Grid (1:1 Mobile Expanded Section) */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '12px 16px',
                        backgroundColor: 'var(--card-secondary)',
                        borderTop: '1px solid var(--divider)',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div
                          style={{
                            backgroundColor: 'var(--card-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                            <Activity size={12} color="var(--primary)" /> Última Atividade
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                            Hoje às 09:30
                          </div>
                        </div>

                        <div
                          style={{
                            backgroundColor: 'var(--card-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                            <Calendar size={12} color="var(--primary)" /> Frequência
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                            4x / semana
                          </div>
                        </div>

                        <div
                          style={{
                            backgroundColor: 'var(--card-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                            <Trophy size={12} color="var(--primary)" /> Aderência
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                            94% consistente
                          </div>
                        </div>

                        <div
                          style={{
                            backgroundColor: 'var(--card-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                            <Dumbbell size={12} color="var(--primary)" /> Ficha Atual
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {st.active_plans?.[0]?.name || 'Nenhuma ficha'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. FLOATING AI ASSISTANT BUTTON (1:1 Mobile Floating AI Button) */}
      <button
        type="button"
        onClick={() => setAiModalOpen(true)}
        className="floating-ai-btn"
        title="Assistente IA DragonCorp"
      >
        <Sparkles size={22} color="#FFFFFF" />
      </button>

      {/* Modal: Student Action Menu (1:1 Mobile StudentActionMenu) */}
      <Modal
        isOpen={Boolean(selectedStudentForMenu)}
        onClose={() => setSelectedStudentForMenu(null)}
        title={selectedStudentForMenu?.full_name || selectedStudentForMenu?.name || 'Ações do Aluno'}
        maxWidth={440}
      >
        {selectedStudentForMenu && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                const id = selectedStudentForMenu.id;
                setSelectedStudentForMenu(null);
                navigate(`/alunos/${id}`);
              }}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
            >
              <User size={16} color="var(--primary)" />
              <span>Ver Perfil Completo do Aluno</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const id = selectedStudentForMenu.id;
                setSelectedStudentForMenu(null);
                navigate(`/treinos/novo?studentId=${id}`);
              }}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
            >
              <Dumbbell size={16} color="var(--primary)" />
              <span>Montar Novo Treino</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const id = selectedStudentForMenu.id;
                setSelectedStudentForMenu(null);
                navigate(`/avaliacoes`);
              }}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
            >
              <FileCheck2 size={16} color="var(--primary)" />
              <span>Realizar Avaliação Física</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const id = selectedStudentForMenu.id;
                setSelectedStudentForMenu(null);
                navigate(`/mensagens`);
              }}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
            >
              <MessageSquare size={16} color="var(--primary)" />
              <span>Enviar Mensagem</span>
            </button>
          </div>
        )}
      </Modal>

      {/* Modal: Feedback Response */}
      <Modal
        isOpen={Boolean(feedbackReplyModal)}
        onClose={() => setFeedbackReplyModal(null)}
        title="Orientação Técnica ao Aluno"
        maxWidth={480}
      >
        {feedbackReplyModal && (
          <form onSubmit={handleSendFeedbackReply} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Aluno: <strong>{feedbackReplyModal.student?.full_name || 'Aluno'}</strong>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Relato: {feedbackReplyModal.notes || feedbackReplyModal.comments || 'Relato registrado'}
            </div>

            <div className="form-group">
              <label className="form-label">Resposta / Ajuste Técnico:</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Ex: Reduza 5kg no próximo treino e mantenha a escápula retraída."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setFeedbackReplyModal(null)}
                className="btn btn-secondary btn-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={sendingReply}
                className="btn btn-primary btn-sm"
              >
                <Send size={14} />
                <span>{sendingReply ? 'Enviando...' : 'Enviar Orientação'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: AI Assistant */}
      <Modal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title="Assistente IA DragonCorp"
        maxWidth={500}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center', padding: '10px 0' }}>
          <Sparkles size={36} color="var(--primary)" style={{ margin: '0 auto' }} />
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
            Inteligência Artificial do Personal
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Gere periodizações completas, calcule cargas progressivas, analise adesão e sugira variações de exercícios baseadas na biomecânica dos seus alunos.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => {
                setAiModalOpen(false);
                navigate('/treinos/novo');
              }}
              className="btn btn-primary"
            >
              <Sparkles size={16} />
              <span>Sugerir Treino com IA</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
