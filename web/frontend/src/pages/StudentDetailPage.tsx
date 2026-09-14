import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Dumbbell,
  FileCheck2,
  TrendingUp,
  Phone,
  Mail,
  Edit,
  Plus,
  Activity,
  Send,
  Copy,
  CheckCircle2,
  UserCheck,
  UserX,
  Utensils,
  FileText,
  Zap,
  Trash2,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';

export const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'workouts'
    | 'assessments'
    | 'protocols'
    | 'evolution'
    | 'frequency'
    | 'anamnesis'
    | 'feedbacks'
    | 'messages'
    | 'notes'
  >('overview');

  // Edit Modal State
  const [editModal, setEditModal] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    mainGoal: '',
    phone: '',
    status: 'ativo',
    administrativeNotes: '',
  });

  // Note State
  const [noteText, setNoteText] = useState<string>('');
  const [savingNote, setSavingNote] = useState<boolean>(false);

  // Chat State
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);

  // Feedback Reply State
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);

  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const fetchStudent = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/students/${id}`);
      const std = res.data.student;
      setStudent(std);
      setEditForm({
        fullName: std.full_name,
        mainGoal: std.main_goal,
        phone: std.contact?.phone || '',
        status: std.status,
        administrativeNotes: std.administrative_notes || '',
      });
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!id) return;
    try {
      const res = await apiClient.get(`/messages/${id}`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'messages') {
      fetchMessages();
    }
  }, [activeTab, id]);

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(`/students/${id}`, {
        fullName: editForm.fullName,
        mainGoal: editForm.mainGoal,
        status: editForm.status,
        administrativeNotes: editForm.administrativeNotes,
        contact: {
          phone: editForm.phone,
          email: student.contact?.email || null,
        },
      });
      setEditModal(false);
      fetchStudent();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao atualizar dados do aluno.');
    }
  };

  const handleToggleStatus = async () => {
    const nextStatus = student.status === 'ativo' ? 'inativo' : 'ativo';
    if (!confirm(`Deseja alterar o status do aluno para ${nextStatus.toUpperCase()}?`)) return;
    try {
      await apiClient.put(`/students/${id}`, { status: nextStatus });
      fetchStudent();
    } catch (err: any) {
      alert('Erro ao alterar status.');
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !student) return;
    setSavingNote(true);
    try {
      const updatedNotes = [...(student.private_trainer_notes || []), noteText.trim()];
      await apiClient.put(`/students/${student.id}`, {
        privateTrainerNotes: updatedNotes,
      });
      setStudent({ ...student, private_trainer_notes: updatedNotes });
      setNoteText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (indexToDelete: number) => {
    if (!student?.private_trainer_notes) return;
    const updatedNotes = student.private_trainer_notes.filter((_: any, idx: number) => idx !== indexToDelete);
    try {
      await apiClient.put(`/students/${student.id}`, {
        privateTrainerNotes: updatedNotes,
      });
      setStudent({ ...student, private_trainer_notes: updatedNotes });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !id) return;
    setSendingMessage(true);
    try {
      await apiClient.post('/messages/send', {
        receiverId: id,
        text: chatInput.trim(),
        tag: 'geral',
      });
      setChatInput('');
      fetchMessages();
    } catch (err: any) {
      alert('Erro ao enviar mensagem.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendFeedbackReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await apiClient.post(`/feedbacks/${selectedFeedback.id}/respond`, {
        message: replyText.trim(),
      });
      setSelectedFeedback(null);
      setReplyText('');
      fetchStudent();
    } catch (err: any) {
      alert('Erro ao enviar resposta ao feedback.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleCopyAccessLink = () => {
    const accessLink = `${window.location.origin}/login?student=${student.id}`;
    navigator.clipboard?.writeText(accessLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const formatBirthDate = (dateStr?: string) => {
    if (!dateStr) return 'Não informada';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const birthDate = new Date(year, month, day);
        const age = new Date().getFullYear() - year;
        return `${birthDate.toLocaleDateString('pt-BR')} (${age} anos)`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const getWhatsAppUrl = () => {
    const phone = student?.contact?.phone || student?.contact?.whatsapp || '';
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return null;
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(`Olá, ${student.full_name}! Aqui é o seu Personal Trainer DragonCorp.`)}`;
  };

  if (loading) return <Loader text="Carregando perfil completo do aluno..." />;
  if (!student) return <div className="card">Aluno não encontrado ou acesso restrito.</div>;

  const plans = student.training_plans || student.trainingPlans || [];
  const assessments = student.assessments || [];
  const protocols = student.protocols || [];
  const executedSets = student.executed_sets || student.executedSets || [];
  const feedbacks = student.feedbacks || [];
  const notes = student.private_trainer_notes || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Breadcrumb and Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate('/alunos')}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px' }}
          >
            <ArrowLeft size={16} />
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Alunos</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{student.full_name}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setEditModal(true)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Edit size={14} />
            <span>Editar Cadastro</span>
          </button>
          <button
            onClick={handleToggleStatus}
            className={`btn btn-sm ${student.status === 'ativo' ? 'btn-secondary' : 'btn-primary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {student.status === 'ativo' ? (
              <>
                <UserX size={14} />
                <span>Inativar Aluno</span>
              </>
            ) : (
              <>
                <UserCheck size={14} />
                <span>Ativar Aluno</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Student Hero Card (Clean Minimalist Surface, Zero Gradient) */}
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '22px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
          alignItems: 'center',
        }}
      >
        {/* Left: Avatar + Identification + Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
            <img
              src={student.avatar_url || student.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160'}
              alt={student.full_name}
              style={{
                width: 80,
                height: 80,
                borderRadius: 'var(--radius-full)',
                objectFit: 'cover',
                border: '2px solid var(--border-color)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 14,
                height: 14,
                borderRadius: '50%',
                backgroundColor: student.status === 'ativo' ? 'var(--color-success)' : 'var(--text-muted)',
                border: '2px solid var(--card-bg)',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', letterSpacing: -0.5 }}>
                {student.full_name}
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: student.status === 'ativo' ? 'rgba(16, 185, 129, 0.12)' : '#1E1E1E',
                  border: `1px solid ${student.status === 'ativo' ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                  fontSize: 11,
                  fontWeight: 700,
                  color: student.status === 'ativo' ? '#10B981' : 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: student.status === 'ativo' ? '#10B981' : '#71717A',
                  }}
                />
                {student.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
              <span
                style={{
                  backgroundColor: '#1E1E1E',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                🎯 {student.main_goal}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Ficha Atual: <strong style={{ color: '#FFFFFF' }}>{plans[0]?.name || 'Nenhum treino ativo'}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              {student.contact?.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Phone size={13} style={{ color: 'var(--text-secondary)' }} /> {student.contact.phone}
                </span>
              )}
              {student.contact?.email && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Mail size={13} style={{ color: 'var(--text-secondary)' }} /> {student.contact.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={handleCopyAccessLink}
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px 16px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {copiedLink ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            <span>{copiedLink ? 'Link Copiado!' : 'Compartilhar Link de Acesso'}</span>
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate(`/treinos/novo?studentId=${student.id}`)}
              className="btn btn-secondary"
              style={{ flex: 1, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Dumbbell size={14} style={{ color: 'var(--accent-red)' }} />
              <span>+ Novo Treino</span>
            </button>
            <button
              onClick={() => navigate('/avaliacoes')}
              className="btn btn-secondary"
              style={{ flex: 1, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Zap size={14} style={{ color: 'var(--accent-red)' }} />
              <span>+ Avaliar</span>
            </button>
            {getWhatsAppUrl() && (
              <a
                href={getWhatsAppUrl()!}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ color: '#25D366', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 12px' }}
                title="Abrir WhatsApp"
              >
                <Phone size={14} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 3. 4-Card Navigation Hub (Minimalist Indicators) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <button
          type="button"
          onClick={() => setActiveTab('protocols')}
          style={{
            backgroundColor: activeTab === 'protocols' ? '#1E1E1E' : 'var(--card-bg)',
            border: activeTab === 'protocols' ? '1px solid var(--accent-red)' : '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#1E1E1E',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-red)',
              flexShrink: 0,
            }}
          >
            <Utensils size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Protocolos</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {protocols.length} {protocols.length === 1 ? 'ativo' : 'ativos'}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('anamnesis')}
          style={{
            backgroundColor: activeTab === 'anamnesis' ? '#1E1E1E' : 'var(--card-bg)',
            border: activeTab === 'anamnesis' ? '1px solid var(--accent-red)' : '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#1E1E1E',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-red)',
              flexShrink: 0,
            }}
          >
            <FileText size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Anamnese</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {student.anamnesis ? 'Preenchida' : 'Pendente'}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assessments')}
          style={{
            backgroundColor: activeTab === 'assessments' ? '#1E1E1E' : 'var(--card-bg)',
            border: activeTab === 'assessments' ? '1px solid var(--accent-red)' : '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#1E1E1E',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-red)',
              flexShrink: 0,
            }}
          >
            <Zap size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Avaliações</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {assessments.length} {assessments.length === 1 ? 'realizada' : 'realizadas'}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('workouts')}
          style={{
            backgroundColor: activeTab === 'workouts' ? '#1E1E1E' : 'var(--card-bg)',
            border: activeTab === 'workouts' ? '1px solid var(--accent-red)' : '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#1E1E1E',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-red)',
              flexShrink: 0,
            }}
          >
            <Dumbbell size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Treinos</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {plans.length} {plans.length === 1 ? 'ficha ativa' : 'fichas ativas'}
            </div>
          </div>
        </button>
      </div>

      {/* 4. Horizontal Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          gap: 18,
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          paddingBottom: 2,
        }}
      >
        {[
          { id: 'overview', label: 'Resumo' },
          { id: 'workouts', label: `Treinos (${plans.length})` },
          { id: 'assessments', label: `Avaliações (${assessments.length})` },
          { id: 'protocols', label: `Protocolos (${protocols.length})` },
          { id: 'evolution', label: 'Evolução' },
          { id: 'frequency', label: 'Frequência' },
          { id: 'anamnesis', label: 'Anamnese' },
          { id: 'feedbacks', label: `Feedbacks (${feedbacks.length})` },
          { id: 'messages', label: 'Mensagens' },
          { id: 'notes', label: `Anotações (${notes.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 4px',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 800 : 500,
              color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-red)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 5. Tab Content */}

      {/* TAB 1: RESUMO */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserCheck size={16} style={{ color: 'var(--accent-red)' }} />
              <span>Dados Cadastrais & Contato</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Profissão</span>
                <strong style={{ color: 'var(--text-primary)' }}>{student.profession || 'Não informada'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Data de Nascimento</span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatBirthDate(student.birth_date)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Gênero</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {student.gender === 'male' ? 'Masculino' : student.gender === 'female' ? 'Feminino' : 'Não informado'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Endereço</span>
                <strong style={{ color: 'var(--text-primary)', textAlign: 'right', maxWidth: 220 }}>
                  {student.address || 'Não informado'}
                </strong>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} style={{ color: 'var(--accent-red)' }} />
              <span>Acompanhamento & Metas</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Meta Principal</span>
                <strong style={{ color: 'var(--text-primary)' }}>{student.main_goal}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Frequência Planejada</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {student.follow_up_summary?.plannedTrainingFrequency || 4}x por semana
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Assiduidade Geral</span>
                <strong style={{ color: 'var(--color-success)' }}>
                  {student.follow_up_summary?.adherencePercent || 92}%
                </strong>
              </div>
              {student.administrative_notes && (
                <div style={{ marginTop: 4, padding: 12, backgroundColor: 'var(--card-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    Notas Administrativas:
                  </span>
                  <p style={{ fontSize: 12, color: 'var(--text-primary)', marginTop: 4 }}>
                    {student.administrative_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TREINOS */}
      {activeTab === 'workouts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF' }}>Prescrições e Fichas de Treino</h3>
            <button
              onClick={() => navigate(`/treinos/novo?studentId=${student.id}`)}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={15} />
              <span>Criar Treino</span>
            </button>
          </div>

          {plans.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title="Nenhum treino prescrito"
              description="Crie o primeiro programa de treino para este aluno."
              actionLabel="Montar Treino"
              onAction={() => navigate(`/treinos/novo?studentId=${student.id}`)}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {plans.map((p: any) => (
                <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`badge ${p.status === 'ativo' ? 'badge-green' : 'badge-neutral'}`}>
                        {p.status?.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Versão v{p.version || 1}</span>
                    </div>
                    <h4 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', marginTop: 10 }}>{p.name}</h4>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{p.objective}</p>
                    <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                      Sessões: <strong>{p.sessions?.length || 0} divisões</strong> (Frequência: {p.frequency_per_week || 3}x/sem)
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 16, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                    <button
                      onClick={() => navigate(`/treinos/novo?duplicateFrom=${p.id}`)}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                    >
                      Editar Ficha
                    </button>
                    <button
                      onClick={() => navigate(`/treinos/novo?duplicateFrom=${p.id}`)}
                      className="btn btn-secondary btn-sm"
                      title="Duplicar treino"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AVALIAÇÕES */}
      {activeTab === 'assessments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF' }}>Histórico de Avaliações Físicas</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {assessments.length >= 2 && (
                <button
                  onClick={() => navigate('/avaliacoes/comparativo')}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <TrendingUp size={14} />
                  <span>Comparar Avaliações</span>
                </button>
              )}
              <button
                onClick={() => navigate('/avaliacoes')}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} />
                <span>Nova Avaliação</span>
              </button>
            </div>
          </div>

          {assessments.length === 0 ? (
            <EmptyState
              icon={FileCheck2}
              title="Nenhuma avaliação física cadastrada"
              description="Realize a primeira avaliação física para acompanhar percentuais e medidas."
              actionLabel="Cadastrar Avaliação"
              onAction={() => navigate('/avaliacoes')}
            />
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 16px' }}>Data</th>
                      <th style={{ padding: '12px 16px' }}>Tipo</th>
                      <th style={{ padding: '12px 16px' }}>Peso (kg)</th>
                      <th style={{ padding: '12px 16px' }}>% Gordura</th>
                      <th style={{ padding: '12px 16px' }}>Massa Magra</th>
                      <th style={{ padding: '12px 16px' }}>IMC</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.map((as: any) => (
                      <tr key={as.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', color: '#FFFFFF', fontWeight: 700 }}>
                          {as.assessment_date}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className="badge badge-neutral">{as.type}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                          {as.body_composition?.weightKg || '-'} kg
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--accent-red)', fontWeight: 800 }}>
                          {as.body_composition?.bodyFatPercent || '-'}%
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                          {as.body_composition?.leanMassKg || '-'} kg
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {as.body_composition?.bmi || '-'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => navigate('/avaliacoes')}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 10px', fontSize: 11 }}
                          >
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PROTOCOLOS */}
      {activeTab === 'protocols' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF' }}>Protocolos Prescritos (Aeróbios / Força)</h3>
            <button
              onClick={() => navigate('/protocolos')}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={15} />
              <span>Prescrever Protocolo</span>
            </button>
          </div>

          {protocols.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Nenhum protocolo ativo"
              description="Prescreva um protocolo aeróbio (ex: Conconi / HIIT) para aparecer na Home do aluno."
              actionLabel="Criar Protocolo"
              onAction={() => navigate('/protocolos')}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {protocols.map((proto: any) => (
                <div key={proto.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-red">{proto.type?.toUpperCase()}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{proto.protocol_date}</span>
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', marginTop: 10 }}>{proto.title}</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {proto.warmup_text}
                  </p>
                  <div style={{ marginTop: 12, padding: 10, backgroundColor: 'var(--card-secondary)', borderRadius: 'var(--radius-md)', fontSize: 12 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Observação do Aluno:</strong>
                    <p style={{ marginTop: 4, color: 'var(--text-muted)' }}>{proto.general_notes}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: EVOLUÇÃO */}
      {activeTab === 'evolution' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF' }}>Evolução de Cargas & Séries Executadas</h3>
          {executedSets.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Sem execuções registradas"
              description="Quando o aluno registrar cargas e repetições pelo aplicativo móvel, elas aparecerão aqui."
            />
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 16px' }}>Data</th>
                      <th style={{ padding: '12px 16px' }}>Exercício</th>
                      <th style={{ padding: '12px 16px' }}>Carga Executada</th>
                      <th style={{ padding: '12px 16px' }}>Reps</th>
                      <th style={{ padding: '12px 16px' }}>Esforço (RPE)</th>
                      <th style={{ padding: '12px 16px' }}>Treino</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executedSets.slice(0, 30).map((set: any) => (
                      <tr key={set.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                          {set.executed_at ? new Date(set.executed_at).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#FFFFFF', fontWeight: 700 }}>
                          {set.exercise_name}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--accent-red)', fontWeight: 800 }}>
                          {set.executed_load} {set.load_unit || 'kg'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                          {set.executed_reps} reps
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {set.effort ? `${set.effort}/10` : '-'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                          {set.workout_name || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: FREQUÊNCIA */}
      {activeTab === 'frequency' && (
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, color: '#FFFFFF' }}>Frequência & Assiduidade</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div style={{ padding: 16, backgroundColor: 'var(--card-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Frequência Meta</span>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', marginTop: 6 }}>
                {student.follow_up_summary?.plannedTrainingFrequency || 4} dias / semana
              </div>
            </div>
            <div style={{ padding: 16, backgroundColor: 'var(--card-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Treinos Realizados (Mês)</span>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-success)', marginTop: 6 }}>
                {student.follow_up_summary?.completedTrainingFrequency || 16} treinos
              </div>
            </div>
            <div style={{ padding: 16, backgroundColor: 'var(--card-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Aderência Global</span>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-red)', marginTop: 6 }}>
                {student.follow_up_summary?.adherencePercent || 92}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: ANAMNESE */}
      {activeTab === 'anamnesis' && (
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, color: '#FFFFFF' }}>
            Anamnese Completa & Histórico de Saúde
          </h3>
          {student.anamnesis ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div style={{ padding: 12, backgroundColor: 'var(--card-secondary)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Qualidade do Sono</span>
                <p style={{ fontWeight: 800, color: '#FFFFFF', marginTop: 4 }}>{student.anamnesis.sleepQuality || 'Boa'}</p>
              </div>
              <div style={{ padding: 12, backgroundColor: 'var(--card-secondary)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Nível de Estresse</span>
                <p style={{ fontWeight: 800, color: '#FFFFFF', marginTop: 4 }}>{student.anamnesis.stressLevel || 'Moderado'}</p>
              </div>
              <div style={{ padding: 12, backgroundColor: 'var(--card-secondary)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Ingestão Hídrica</span>
                <p style={{ fontWeight: 800, color: '#FFFFFF', marginTop: 4 }}>{student.anamnesis.waterIntakeLiters || 3} Litros/dia</p>
              </div>
              <div style={{ padding: 12, backgroundColor: 'var(--card-secondary)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Histórico Esportivo</span>
                <p style={{ fontWeight: 800, color: '#FFFFFF', marginTop: 4 }}>{student.anamnesis.sportsHistory || 'Musculação recreativa'}</p>
              </div>
              {student.anamnesis.currentPain && (
                <div style={{ gridColumn: '1 / -1', padding: 14, backgroundColor: '#2C1010', border: '1px solid rgba(217, 0, 0, 0.4)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: '#FF6B6B', fontWeight: 800, fontSize: 13 }}>Ponto de Dor / Limitação Física:</span>
                  <p style={{ color: '#FFFFFF', fontSize: 13, marginTop: 4 }}>{student.anamnesis.currentPainDetails}</p>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Nenhuma anamnese preenchida.</p>
          )}
        </div>
      )}

      {/* TAB 8: FEEDBACKS */}
      {activeTab === 'feedbacks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF' }}>Feedbacks Pós-Treino e Relatos de Dor</h3>
          {feedbacks.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nenhum feedback pendente"
              description="Quando o aluno concluir um treino no aplicativo e enviar observações, elas aparecerão aqui."
            />
          ) : (
            feedbacks.map((fb: any) => (
              <div key={fb.id} className="card" style={{ borderLeft: fb.has_pain ? '4px solid var(--accent-red)' : '4px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#FFFFFF', fontSize: 14 }}>{fb.workout_name}</strong>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                      {fb.created_at ? new Date(fb.created_at).toLocaleString('pt-BR') : ''}
                    </span>
                  </div>
                  {fb.has_pain && (
                    <span className="badge badge-red">
                      Dor Nível {fb.pain_level}/10 ({fb.pain_region || 'Geral'})
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 8 }}>
                  "{fb.comment || 'Execução registrada sem observações textuais.'}"
                </p>

                {fb.responses && fb.responses.length > 0 && (
                  <div style={{ marginTop: 12, padding: 12, backgroundColor: 'var(--card-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: 11, color: 'var(--accent-red)', fontWeight: 800, textTransform: 'uppercase' }}>
                      Sua Orientação Técnica:
                    </span>
                    {fb.responses.map((resp: any) => (
                      <p key={resp.id} style={{ fontSize: 12, color: '#FFFFFF', marginTop: 4 }}>
                        {resp.message}
                      </p>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button
                    onClick={() => {
                      setSelectedFeedback(fb);
                      setReplyText('');
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Responder Aluno
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 9: MENSAGENS */}
      {activeTab === 'messages' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF' }}>Chat com {student.full_name}</h3>
            <button
              type="button"
              onClick={() => navigate('/mensagens')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11 }}
            >
              Abrir Central de Mensagens ↗
            </button>
          </div>
          <div style={{ height: 320, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, backgroundColor: 'var(--bg-app)' }}>
            {messages.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>
                Nenhuma mensagem nesta conversa. Envie uma mensagem para iniciar o atendimento.
              </p>
            ) : (
              messages.map((m: any) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.sender_role === 'TRAINER' ? 'flex-end' : 'flex-start',
                    maxWidth: '70%',
                    padding: '10px 14px',
                    borderRadius: m.sender_role === 'TRAINER' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    backgroundColor: m.sender_role === 'TRAINER' ? '#1F1F1F' : 'var(--card-bg)',
                    border: m.sender_role === 'TRAINER' ? '1px solid #333333' : '1px solid var(--border-color)',
                    borderTop: m.sender_role === 'TRAINER' ? '2px solid var(--accent-red)' : '1px solid var(--border-color)',
                    color: '#FFFFFF',
                    fontSize: 13,
                  }}
                >
                  <p>{m.text}</p>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, display: 'block', textAlign: 'right' }}>
                    {m.created_at ? new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', padding: 12, borderTop: '1px solid var(--border-color)', gap: 8, backgroundColor: 'var(--card-bg)' }}>
            <input
              type="text"
              placeholder={`Digite sua mensagem para ${student.full_name}...`}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="form-input"
              style={{ flex: 1 }}
            />
            <button type="submit" disabled={sendingMessage || !chatInput.trim()} className="btn btn-primary">
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      {/* TAB 10: ANOTAÇÕES */}
      {activeTab === 'notes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, color: '#FFFFFF' }}>
              Adicionar Nova Anotação Privada (Visível apenas para o Personal)
            </h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                placeholder="Ex: Aluno relatou cansaço extremo após treino de pernas. Reduzir 1 série..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="form-input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={savingNote || !noteText.trim()}
                className="btn btn-primary"
              >
                Salvar Nota
              </button>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, color: '#FFFFFF' }}>Histórico de Anotações</h3>
            {notes.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nenhuma anotação cadastrada.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notes.map((n: string, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--card-secondary)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 13,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <span>• {n}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(idx)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Edição de Aluno */}
      {editModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">Editar Dados do Aluno</h3>
              <button onClick={() => setEditModal(false)} className="modal-close">×</button>
            </div>
            <form onSubmit={handleUpdateStudent}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="form-label">Nome Completo *</label>
                  <input
                    required
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Objetivo Principal *</label>
                  <input
                    required
                    type="text"
                    value={editForm.mainGoal}
                    onChange={(e) => setEditForm({ ...editForm, mainGoal: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="form-select"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="pausado">Pausado</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Notas Administrativas</label>
                  <textarea
                    rows={3}
                    value={editForm.administrativeNotes}
                    onChange={(e) => setEditForm({ ...editForm, administrativeNotes: e.target.value })}
                    className="form-textarea"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setEditModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Resposta a Feedback */}
      {selectedFeedback && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">Orientação Técnica de Treino</h3>
              <button onClick={() => setSelectedFeedback(null)} className="modal-close">×</button>
            </div>
            <form onSubmit={handleSendFeedbackReply}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: 12, backgroundColor: 'var(--card-secondary)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                  <strong style={{ color: '#FFFFFF' }}>Treino: {selectedFeedback.workout_name}</strong>
                  <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>"{selectedFeedback.comment || 'Sem observações textuais.'}"</p>
                </div>
                <div>
                  <label className="form-label">Mensagem para o Aluno *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Oriente seu aluno sobre ajuste de cargas, descanso ou técnica..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="form-textarea"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setSelectedFeedback(null)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={sendingReply || !replyText.trim()} className="btn btn-primary">
                  {sendingReply ? 'Enviando...' : 'Enviar Orientação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
