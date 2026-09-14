import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  User as UserIcon,
  Search,
  X,
  Dumbbell,
  Phone,
  Clock,
  CheckCheck,
  Zap,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { ChatMessage } from '../types';
import { Loader } from '../components/common/Loader';

interface ConversationItem {
  id: string;
  student: {
    id: string;
    name: string;
    avatar?: string;
    main_goal?: string;
    contact?: {
      phone?: string;
      whatsapp?: string;
      email?: string;
    };
    status?: string;
  };
  lastMessage?: {
    id: string;
    text: string;
    tag?: string;
    created_at: string;
    sender_role?: string;
  } | null;
  unreadCount: number;
}

const QUICK_TEMPLATES = [
  '💪 Treino atualizado! Confira a nova periodização no seu app.',
  '🔥 Excelente execução hoje! Ajustei a carga para a próxima semana.',
  '🩺 Como está a recuperação muscular da última sessão?',
  '⚖️ Mantenha esse peso e foque na amplitude e controle do movimento.',
  '📲 Não esqueça de registrar seu feedback de esforço ao finalizar!',
];

const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  geral: { bg: '#222222', text: '#A1A1AA', border: '#333333' },
  treino: { bg: '#2E1010', text: '#FF6B6B', border: 'rgba(217, 0, 0, 0.4)' },
  dor: { bg: '#2C1C0D', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.4)' },
  ajuste: { bg: '#0D2038', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.4)' },
  duvida: { bg: '#0D2A1C', text: '#34D399', border: 'rgba(16, 185, 129, 0.4)' },
};

export const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<ConversationItem['student'] | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('geral');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'tagged'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  const fetchConversations = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await apiClient.get('/messages');
      const convs: ConversationItem[] = res.data.conversations || [];
      setConversations(convs);

      if (convs.length > 0 && !selectedStudent) {
        setSelectedStudent(convs[0].student);
      }
    } catch (err) {
      console.error('Erro ao buscar conversas:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchMessages = async (studentId: string) => {
    try {
      const res = await apiClient.get(`/messages/${studentId}`);
      setMessages(res.data.messages || []);
      setConversations((prev) =>
        prev.map((c) => (c.student.id === studentId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.error('Erro ao buscar mensagens do aluno:', err);
    }
  };

  useEffect(() => {
    if (!selectedStudent) return;
    fetchMessages(selectedStudent.id);

    const interval = setInterval(() => {
      fetchMessages(selectedStudent.id);
    }, 8000);

    return () => clearInterval(interval);
  }, [selectedStudent]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || !selectedStudent || sending) return;

    const messageText = text.trim();
    const tagToSend = selectedTag;
    setSending(true);

    try {
      const res = await apiClient.post('/messages/send', {
        studentId: selectedStudent.id,
        text: messageText,
        tag: tagToSend,
      });

      const newMsg = res.data.chatMessage;
      setMessages((prev) => [...prev, newMsg]);
      setText('');

      setConversations((prev) =>
        prev.map((c) =>
          c.student.id === selectedStudent.id
            ? {
                ...c,
                lastMessage: {
                  id: newMsg.id,
                  text: newMsg.text,
                  tag: newMsg.tag,
                  created_at: newMsg.created_at,
                  sender_role: newMsg.sender_role,
                },
              }
            : c
        )
      );
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const matchSearch =
        conv.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conv.lastMessage?.text || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (activeFilter === 'unread') return conv.unreadCount > 0;
      if (activeFilter === 'tagged') return conv.lastMessage?.tag && conv.lastMessage.tag !== 'geral';
      return true;
    });
  }, [conversations, searchQuery, activeFilter]);

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

  const formatMessageTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getStudentWhatsAppLink = (student: ConversationItem['student']) => {
    const rawPhone = student.contact?.whatsapp || student.contact?.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (!cleanPhone) return null;
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(`Olá, ${student.name}! Aqui é o seu Personal da DragonCorp.`)}`;
  };

  if (loading) return <Loader text="Carregando canal seguro de mensagens..." />;

  const tags = ['geral', 'treino', 'dor', 'ajuste', 'duvida'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 116px)' }}>
      {/* 1. Header & Summary Stats */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
            Mensagens com Alunos
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Comunicação direta, alinhamento de cargas e acompanhamento contínuo em tempo real.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => fetchConversations(true)}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Sincronizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* 2. Top Minimalist Metrics Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Conversas Ativas
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {conversations.length} {conversations.length === 1 ? 'aluno' : 'alunos'}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#1E1E1E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
            }}
          >
            <MessageSquare size={18} />
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: totalUnreadCount > 0 ? '1px solid rgba(217, 0, 0, 0.4)' : '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Não Lidas
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: totalUnreadCount > 0 ? '#FF4444' : 'var(--text-primary)',
                marginTop: 2,
              }}
            >
              {totalUnreadCount} {totalUnreadCount === 1 ? 'pendente' : 'pendentes'}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: totalUnreadCount > 0 ? 'var(--accent-red)' : '#1E1E1E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <AlertCircle size={18} />
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              DragonSync™ Live
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
              Conectado ao Mobile
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#1E1E1E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-success)',
            }}
          >
            <Zap size={18} />
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Tempo de Resposta
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              &lt; 3 minutos
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#1E1E1E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <Clock size={18} />
          </div>
        </div>
      </div>

      {/* 3. Main Workspace Container */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          minHeight: 480,
        }}
      >
        {/* Left Sidebar: Conversations list */}
        <div
          style={{
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          {/* Search Box */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar conversa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  paddingLeft: 34,
                  paddingRight: searchQuery ? 30 : 12,
                  paddingTop: 8,
                  paddingBottom: 8,
                  fontSize: 13,
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11,
                  fontWeight: 700,
                  border: '1px solid',
                  borderColor: activeFilter === 'all' ? 'var(--accent-red)' : 'var(--border-color)',
                  backgroundColor: activeFilter === 'all' ? 'var(--accent-red)' : 'var(--bg-primary)',
                  color: activeFilter === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Todas ({conversations.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('unread')}
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11,
                  fontWeight: 700,
                  border: '1px solid',
                  borderColor: activeFilter === 'unread' ? 'var(--accent-red)' : 'var(--border-color)',
                  backgroundColor: activeFilter === 'unread' ? 'var(--accent-red)' : 'var(--bg-primary)',
                  color: activeFilter === 'unread' ? '#FFFFFF' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Não Lidas {totalUnreadCount > 0 && `(${totalUnreadCount})`}
              </button>
            </div>
          </div>

          {/* Conversations List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                {searchQuery ? 'Nenhum aluno encontrado.' : 'Nenhuma conversa ativa no momento.'}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedStudent?.id === conv.student.id;
                const tag = conv.lastMessage?.tag;
                const tagStyle = tag && TAG_COLORS[tag] ? TAG_COLORS[tag] : TAG_COLORS.geral;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedStudent(conv.student)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: isSelected ? 'var(--card-secondary)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--accent-red)' : '3px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Avatar with live indicator */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: '#202020',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 14,
                          color: '#FFFFFF',
                          overflow: 'hidden',
                        }}
                      >
                        {conv.student.avatar ? (
                          <img
                            src={conv.student.avatar}
                            alt={conv.student.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          conv.student.name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-success)',
                          border: '2px solid var(--bg-secondary)',
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span
                          style={{
                            fontWeight: conv.unreadCount > 0 ? 800 : 600,
                            fontSize: 13,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {conv.student.name}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                          {formatMessageTime(conv.lastMessage?.created_at)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: 4,
                        }}
                      >
                        {tag && tag !== 'geral' && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              backgroundColor: tagStyle.bg,
                              color: tagStyle.text,
                              border: `1px solid ${tagStyle.border}`,
                              padding: '1px 4px',
                              borderRadius: 'var(--radius-xs)',
                              flexShrink: 0,
                            }}
                          >
                            #{tag}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 12,
                            color: conv.unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                            fontWeight: conv.unreadCount > 0 ? 600 : 400,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: 1,
                          }}
                        >
                          {conv.lastMessage?.text || 'Nenhuma mensagem ainda'}
                        </span>

                        {conv.unreadCount > 0 && (
                          <span
                            style={{
                              backgroundColor: 'var(--accent-red)',
                              color: '#FFFFFF',
                              fontSize: 10,
                              fontWeight: 800,
                              borderRadius: 'var(--radius-full)',
                              padding: '1px 6px',
                              minWidth: 18,
                              textAlign: 'center',
                            }}
                          >
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Active Chat Workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)' }}>
          {selectedStudent ? (
            <>
              {/* Top Chat Bar */}
              <div
                style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  minWidth: 0,
                }}
              >
                {/* Left: Student identity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: '#222222',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 14,
                      color: '#FFFFFF',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {selectedStudent.avatar ? (
                      <img
                        src={selectedStudent.avatar}
                        alt={selectedStudent.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      selectedStudent.name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {selectedStudent.name}
                      </h3>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          backgroundColor: '#1E1E1E',
                          color: 'var(--color-success)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-full)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
                        App Mobile Online
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        marginTop: 2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {selectedStudent.main_goal || 'Hipertrofia & Rendimento'} • Sincronização DragonSync™ ativa
                    </div>
                  </div>
                </div>

                {/* Right: Quick Context Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <a
                    href={getStudentWhatsAppLink(selectedStudent) || `https://wa.me/?text=${encodeURIComponent(`Olá, ${selectedStudent.name}! Aqui é seu Personal Trainer DragonCorp.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#25D366', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Phone size={13} />
                    WhatsApp
                  </a>

                  <button
                    type="button"
                    onClick={() => navigate(`/treinos/novo?studentId=${selectedStudent.id}`)}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Dumbbell size={13} />
                    + Montar Treino
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/alunos')}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <UserIcon size={13} />
                    Ver Alunos
                  </button>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div
                style={{
                  flex: 1,
                  padding: '20px 24px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  backgroundColor: 'var(--bg-app)',
                }}
              >
                {/* Date Divider */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0 12px 0' }}>
                  <span
                    style={{
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    Canal Criptografado &bull; Atendimento em Tempo Real
                  </span>
                </div>

                {messages.length === 0 ? (
                  <div
                    style={{
                      margin: 'auto',
                      textAlign: 'center',
                      maxWidth: 360,
                      padding: 24,
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                    }}
                  >
                    <MessageSquare size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Nenhuma mensagem com {selectedStudent.name}
                    </h4>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                      Inicie o diálogo para tirar dúvidas sobre exercícios, alinhar cargas e acompanhar feedbacks.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setText('Olá, ' + selectedStudent.name.split(' ')[0] + '! Como foi o treino de hoje?');
                        setSelectedTag('geral');
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Enviar mensagem inicial
                    </button>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isTrainer = msg.sender_role === 'TRAINER';
                    const tagStyle = msg.tag && TAG_COLORS[msg.tag] ? TAG_COLORS[msg.tag] : TAG_COLORS.geral;

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isTrainer ? 'flex-end' : 'flex-start',
                          width: '100%',
                        }}
                      >
                        {/* Bubble Container */}
                        <div
                          style={{
                            maxWidth: '75%',
                            backgroundColor: isTrainer ? '#1F1F1F' : 'var(--card-bg)',
                            border: isTrainer ? '1px solid #333333' : '1px solid var(--border-color)',
                            borderTop: isTrainer ? '2px solid var(--accent-red)' : '1px solid var(--border-color)',
                            borderRadius: isTrainer ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                            padding: '12px 16px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                          }}
                        >
                          {/* Header inside bubble */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              marginBottom: 6,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                color: isTrainer ? 'var(--text-primary)' : '#60A5FA',
                              }}
                            >
                              {isTrainer ? 'Você (Personal)' : `${msg.sender_name || selectedStudent.name} (Aluno)`}
                            </span>

                            {msg.tag && msg.tag !== 'geral' && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  backgroundColor: tagStyle.bg,
                                  color: tagStyle.text,
                                  border: `1px solid ${tagStyle.border}`,
                                  padding: '2px 6px',
                                  borderRadius: 'var(--radius-xs)',
                                }}
                              >
                                #{msg.tag}
                              </span>
                            )}
                          </div>

                          {/* Message Text */}
                          <div
                            style={{
                              fontSize: 13,
                              color: '#FFFFFF',
                              lineHeight: 1.5,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {msg.text}
                          </div>

                          {/* Footer with timestamp and checks */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 4,
                              marginTop: 6,
                              fontSize: 10,
                              color: 'var(--text-muted)',
                            }}
                          >
                            <span>{formatMessageTime(msg.created_at)}</span>
                            {isTrainer && (
                              <CheckCheck size={13} style={{ color: 'var(--color-success)', marginLeft: 2 }} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Template Response Bar */}
              <div
                style={{
                  padding: '8px 20px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                  <Sparkles size={12} style={{ color: 'var(--accent-red)' }} />
                  <span>Respostas Rápidas:</span>
                </div>

                {QUICK_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setText(tmpl)}
                    style={{
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--text-muted)';
                      e.currentTarget.style.color = '#FFFFFF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {tmpl}
                  </button>
                ))}
              </div>

              {/* Chat Input & Tag Selection Bar */}
              <form
                onSubmit={handleSend}
                style={{
                  padding: '14px 20px',
                  borderTop: '1px solid var(--border-color)',
                  backgroundColor: 'var(--card-bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {/* Tag Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Tópico da Mensagem:
                  </span>
                  {tags.map((t) => {
                    const isSelected = selectedTag === t;
                    const tagStyle = TAG_COLORS[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTag(t)}
                        style={{
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 11,
                          fontWeight: 700,
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--accent-red)' : tagStyle.border,
                          backgroundColor: isSelected ? 'var(--accent-red)' : tagStyle.bg,
                          color: isSelected ? '#FFFFFF' : tagStyle.text,
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: 0.3,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        #{t}
                      </button>
                    );
                  })}
                </div>

                {/* Input row */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={`Digite uma mensagem para ${selectedStudent.name}... (Pressione Enter para enviar)`}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      style={{
                        paddingRight: text ? 32 : 12,
                        paddingTop: 12,
                        paddingBottom: 12,
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                        fontSize: 13,
                      }}
                    />
                    {text && (
                      <button
                        type="button"
                        onClick={() => setText('')}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    className="btn btn-primary"
                    style={{
                      height: 44,
                      padding: '0 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    <Send size={15} />
                    <span>{sending ? 'Enviando...' : 'Enviar'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div
              style={{
                margin: 'auto',
                textAlign: 'center',
                color: 'var(--text-muted)',
                padding: 32,
              }}
            >
              <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Selecione uma conversa
              </h3>
              <p style={{ fontSize: 13 }}>
                Escolha um aluno na lista ao lado para ver o histórico e enviar novas mensagens.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
