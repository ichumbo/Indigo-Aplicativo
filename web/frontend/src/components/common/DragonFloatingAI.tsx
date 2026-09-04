import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, Dumbbell, Zap, CheckCircle2 } from 'lucide-react';

export const DragonFloatingAI: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Olá, Treinador DragonCorp! Sou o seu assistente de inteligência artificial. Como posso ajudar na montagem de treinos, periodização ou análise dos seus alunos hoje?',
      time: 'Agora',
    },
  ]);
  const [inputText, setInputText] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = { sender: 'user' as const, text: inputText.trim(), time: 'Agora' };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    setTimeout(() => {
      let reply = 'Entendido! Analisei a base biomecânica da DragonCorp. Recomendo periodizar em blocos de hipertrofia miofibrilar com ênfase em sobrecarga progressiva e descanso controlado entre 60s e 90s.';
      if (userMsg.text.toLowerCase().includes('iniciante')) {
        reply = 'Para alunos iniciantes, a prescrição ideal é Full Body ou ABC com 3 a 4 séries de 10-12 repetições, priorizando máquinas e exercícios multiarticulares guiados.';
      } else if (userMsg.text.toLowerCase().includes('dor') || userMsg.text.toLowerCase().includes('lesão')) {
        reply = 'Atenção ao relato de dor: recomendo substituir exercícios com estresse em cisalhamento (como agachamento livre ou desenvolvimento com barra) por opções convergentes e articuladas.';
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai' as const,
          text: reply,
          time: 'Agora',
        },
      ]);
    }, 600);
  };

  return (
    <>
      {/* Floating Action Button (Mobile-inspired) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="floating-ai-btn"
        title="Assistente de Inteligência Artificial DragonCorp"
      >
        <Sparkles size={24} />
      </button>

      {/* Side Drawer Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            width: 'min(420px, 100vw)',
            height: '100vh',
            backgroundColor: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--border-color)',
            boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.7)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Drawer Header */}
          <div
            style={{
              padding: '18px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--accent-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                }}
              >
                <Bot size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF' }}>
                  DragonCorp IA
                </h3>
                <span style={{ fontSize: 11, color: 'var(--accent-red)', fontWeight: 600 }}>
                  Assistente do Treinador • Ativo
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              padding: '16px 20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {messages.map((m, idx) => {
              const isAi = m.sender === 'ai';
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isAi ? 'flex-start' : 'flex-end',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '86%',
                      padding: '12px 16px',
                      borderRadius: isAi ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                      backgroundColor: isAi ? 'var(--card-bg)' : 'var(--accent-red)',
                      border: isAi ? '1px solid var(--border-color)' : 'none',
                      color: '#FFFFFF',
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    {m.text}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                    {m.time}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick Suggestions */}
          <div style={{ padding: '8px 20px', display: 'flex', gap: 6, overflowX: 'auto' }}>
            {['Prescrever Hipertrofia', 'Aluno com Dor', 'Ajustar Descanso'].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setInputText(suggestion)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--card-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: 10,
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <input
              type="text"
              className="form-input"
              style={{ fontSize: 13, padding: '10px 14px' }}
              placeholder="Pergunte sobre prescrição, exercícios ou cargas..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0 16px' }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
