import React, { useEffect, useState } from 'react';
import { MessageSquare, Send, User as UserIcon, Tag } from 'lucide-react';
import { apiClient } from '../api/client';
import { ChatMessage } from '../types';
import { Loader } from '../components/common/Loader';

export const MessagesPage: React.FC = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('geral');
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);

  const fetchConversations = async () => {
    try {
      const res = await apiClient.get('/messages');
      const convs = res.data.conversations || [];
      setConversations(convs);
      if (convs.length > 0 && !selectedStudent) {
        setSelectedStudent(convs[0].student);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;

    const fetchMessages = async () => {
      try {
        const res = await apiClient.get(`/messages/${selectedStudent.id}`);
        setMessages(res.data.messages || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [selectedStudent]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !selectedStudent || sending) return;

    setSending(true);
    try {
      const res = await apiClient.post('/messages/send', {
        studentId: selectedStudent.id,
        text: text.trim(),
        tag: selectedTag,
      });
      setMessages([...messages, res.data.chatMessage]);
      setText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Loader text="Carregando canal de comunicação..." />;

  const tags = ['geral', 'treino', 'dor', 'ajuste', 'duvida'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: 'calc(100vh - 120px)' }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
          Mensagens com Alunos
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Responda dúvidas, ajuste cargas e interaja pelo computador usando seu teclado físico.
        </p>
      </div>

      <div
        className="card"
        style={{
          flex: 1,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          overflow: 'hidden',
        }}
      >
        {/* Left: Students List */}
        <div
          style={{
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-color)',
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--text-primary)',
            }}
          >
            Conversas
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.map((conv) => {
              const isSelected = selectedStudent?.id === conv.student.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedStudent(conv.student)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: isSelected ? 'var(--bg-surface)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 13,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {conv.student.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                        {conv.student.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.lastMessage?.text || 'Sem mensagens recentes'}
                      </div>
                    </div>
                  </div>

                  {conv.unreadCount > 0 && (
                    <span
                      style={{
                        backgroundColor: 'var(--accent-red)',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 800,
                        borderRadius: 'var(--radius-full)',
                        padding: '2px 6px',
                      }}
                    >
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Chat View */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {selectedStudent ? (
            <>
              {/* Chat Header */}
              <div
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedStudent.name}
                  </h3>
                  <span style={{ fontSize: 11, color: 'var(--color-success)' }}>• Conectado via App Mobile</span>
                </div>
              </div>

              {/* Message List */}
              <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)', fontSize: 13 }}>
                    Envie uma mensagem para iniciar o atendimento.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_role === 'TRAINER';
                    return (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '70%',
                          backgroundColor: isMe ? 'var(--accent-red)' : 'var(--bg-surface)',
                          color: '#FFFFFF',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 13,
                          lineHeight: 1.4,
                        }}
                      >
                        {msg.tag && msg.tag !== 'geral' && (
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              backgroundColor: 'rgba(0,0,0,0.3)',
                              padding: '2px 5px',
                              borderRadius: 'var(--radius-sm)',
                              marginBottom: 4,
                            }}
                          >
                            #{msg.tag}
                          </span>
                        )}
                        <div>{msg.text}</div>
                        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
                          {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input & Tag selector */}
              <form
                onSubmit={handleSend}
                style={{
                  padding: '14px 20px',
                  borderTop: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Assunto:</span>
                  {tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTag(t)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 10,
                        fontWeight: 600,
                        border: '1px solid var(--border-color)',
                        backgroundColor: selectedTag === t ? 'var(--accent-red)' : 'var(--bg-primary)',
                        color: selectedTag === t ? 'white' : 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      #{t}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Digite sua mensagem e pressione Enter..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    className="btn btn-primary"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>
              Selecione um aluno para abrir a conversa.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
