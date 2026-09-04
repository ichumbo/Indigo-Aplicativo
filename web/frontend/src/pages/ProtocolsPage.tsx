import React from 'react';
import { Activity, Heart, Flame, Shield, CheckCircle2 } from 'lucide-react';

export const ProtocolsPage: React.FC = () => {
  const protocols = [
    {
      id: 'conconi',
      name: 'Protocolo Conconi (Limiar Anaeróbio)',
      category: 'Cardiorrespiratório',
      icon: Heart,
      description: 'Identificação da velocidade do limiar de deflexão da frequência cardíaca em esteira ou cicloergômetro.',
      formula: 'Incremento de 0.5 km/h a cada 200m com registro contínuo da FC.',
      status: 'Disponível no App e Web',
    },
    {
      id: 'bruce',
      name: 'Protocolo de Bruce (VO2 Máximo)',
      category: 'Cardiorrespiratório',
      icon: Flame,
      description: 'Teste progressivo de esteira em estágios de 3 minutos com aumento simultâneo de velocidade e inclinação.',
      formula: 'VO2max (homens) = 14.8 - (1.379 * T) + (0.451 * T²) - (0.012 * T³)',
      status: 'Disponível no App e Web',
    },
    {
      id: 'cooper',
      name: 'Teste de 12 Minutos de Cooper',
      category: 'Cardiorrespiratório',
      icon: Activity,
      description: 'Corrida/caminhada contínua em pista ou esteira para estimativa de capacidade aeróbia funcional.',
      formula: 'VO2max = (Distância em metros - 504.9) / 44.73',
      status: 'Disponível no App e Web',
    },
    {
      id: 'fms',
      name: 'Avaliação Funcional FMS (Functional Movement Screen)',
      category: 'Neuromuscular & Mobilidade',
      icon: Shield,
      description: 'Triagem de 7 padrões de movimento fundamentais para detecção de assimetrias e limitações articulares.',
      formula: 'Pontuação de 0 a 3 por padrão (Agachamento overhead, Passo sobre a barreira, Avanço, Mobilidade de ombro, etc.)',
      status: 'Disponível no App e Web',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
          Protocolos Clínicos & Testes Fisiológicos
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Protocolos padronizados integrados ao DragonCorp com validação científica.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        {protocols.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--accent-red-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-red)',
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</h3>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.category}</span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {p.description}
              </p>

              <div
                style={{
                  padding: 10,
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                }}
              >
                {p.formula}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-success)', marginTop: 'auto' }}>
                <CheckCircle2 size={13} />
                <span>{p.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
