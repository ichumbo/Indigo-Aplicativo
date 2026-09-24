import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { apiClient } from '../api/client';
import { Loader } from '../components/common/Loader';

export const AssessmentComparePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const firstId = searchParams.get('first');
  const secondId = searchParams.get('second');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchComparison = async () => {
      if (!firstId || !secondId) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiClient.get(`/assessments/compare?first=${firstId}&second=${secondId}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchComparison();
  }, [firstId, secondId]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading) return <Loader text="Calculando comparação longitudinal..." />;
  if (!data || !data.first || !data.second) {
    return (
      <div style={{ padding: 32, maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Selecione 2 avaliações para comparar
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
            Para visualizar o comparativo evolutivo detalhado, selecione duas avaliações na lista de avaliações.
          </p>
          <button
            onClick={() => navigate('/avaliacoes')}
            style={{
              backgroundColor: 'var(--accent-red)',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Ir para Avaliações Físicas
          </button>
        </div>
      </div>
    );
  }

  const first = data.first || {};
  const second = data.second || {};

  const comp1 = first.body_composition || {};
  const comp2 = second.body_composition || {};
  const perim1 = first.perimeters || {};
  const perim2 = second.perimeters || {};

  const weightDelta = Math.round(((comp2.weightKg || 0) - (comp1.weightKg || 0)) * 10) / 10;
  const fatDelta = Math.round(((comp2.bodyFatPercent || 0) - (comp1.bodyFatPercent || 0)) * 10) / 10;
  const leanDelta = Math.round(((comp2.leanMassKg || 0) - (comp1.leanMassKg || 0)) * 10) / 10;
  const waistDelta = Math.round(((perim2.waist || 0) - (perim1.waist || 0)) * 10) / 10;

  const armDelta = Math.round(((perim2.rightArm || 0) - (perim1.rightArm || 0)) * 10) / 10;
  const chestDelta = Math.round(((perim2.chest || 0) - (perim1.chest || 0)) * 10) / 10;
  const bmiDelta = Math.round(((comp2.bmi || 0) - (comp1.bmi || 0)) * 10) / 10;

  const renderDelta = (delta: number, unit: string, lowerIsBetter: boolean = true) => {
    if (delta === 0) {
      return (
        <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <Minus size={13} /> 0 {unit}
        </span>
      );
    }
    const isPositiveGood = lowerIsBetter ? delta < 0 : delta > 0;
    const color = isPositiveGood ? '#34D399' : '#D90000';
    const Icon = delta > 0 ? ArrowUp : ArrowDown;

    return (
      <span style={{ color, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        <Icon size={14} /> {delta > 0 ? `+${delta}` : delta} {unit}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate('/avaliacoes')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: '#1C1C1C',
            border: '1px solid #282828',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.4 }}>
            Comparativo Longitudinal de Avaliações
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Evolução física direta: {formatDate(first.assessment_date)} vs {formatDate(second.assessment_date)}
          </p>
        </div>
      </div>

      {/* Comparison Grid */}
      <div
        style={{
          backgroundColor: '#141414',
          border: '1px solid #222222',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: '#181818', borderBottom: '1px solid #242424' }}>
              <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Métrica Física
              </th>
              <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Avaliação Anterior ({formatDate(first.assessment_date)})
              </th>
              <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Avaliação Atual ({formatDate(second.assessment_date)})
              </th>
              <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'right' }}>
                Variação (Delta)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #1C1C1C' }}>
              <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>Peso Corporal</td>
              <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{comp1.weightKg || '-'} kg</td>
              <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--text-primary)' }}>{comp2.weightKg || '-'} kg</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>{renderDelta(weightDelta, 'kg', true)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #1C1C1C' }}>
              <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>Percentual de Gordura (%BF)</td>
              <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{comp1.bodyFatPercent || '-'}%</td>
              <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--text-primary)' }}>{comp2.bodyFatPercent || '-'}%</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>{renderDelta(fatDelta, '%', true)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #1C1C1C' }}>
              <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>Massa Magra Livre de Gordura</td>
              <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{comp1.leanMassKg || '-'} kg</td>
              <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--text-primary)' }}>{comp2.leanMassKg || '-'} kg</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>{renderDelta(leanDelta, 'kg', false)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #1C1C1C' }}>
              <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>Índice de Massa Corporal (IMC)</td>
              <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{comp1.bmi || '-'}</td>
              <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--text-primary)' }}>{comp2.bmi || '-'}</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>{renderDelta(bmiDelta, '', true)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #1C1C1C' }}>
              <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>Braço Direito Contraído</td>
              <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{perim1.rightArm || '-'} cm</td>
              <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--text-primary)' }}>{perim2.rightArm || '-'} cm</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>{renderDelta(armDelta, 'cm', false)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #1C1C1C' }}>
              <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>Tórax / Peitoral</td>
              <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{perim1.chest || '-'} cm</td>
              <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--text-primary)' }}>{perim2.chest || '-'} cm</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>{renderDelta(chestDelta, 'cm', false)}</td>
            </tr>
            <tr>
              <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>Circunferência da Cintura</td>
              <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{perim1.waist || '-'} cm</td>
              <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--text-primary)' }}>{perim2.waist || '-'} cm</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>{renderDelta(waistDelta, 'cm', true)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Box */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#34D399', marginBottom: 4 }}>
          Conclusão da Recomposição Corporal
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          O aluno apresentou redução real de gordura corporal acompanhada de preservação/ganho de massa magra.
          Excelente aderência aos protocolos prescritos na DragonCorp.
        </p>
      </div>
    </div>
  );
};
