import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowDown, ArrowUp, Minus, FileCheck2 } from 'lucide-react';
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
      if (!firstId || !secondId) return;
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

  if (loading) return <Loader text="Calculando comparação longitudinal..." />;
  if (!data) return <div>Dados de comparação não disponíveis.</div>;

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
    const color = isPositiveGood ? 'var(--color-success)' : 'var(--accent-red)';
    const Icon = delta > 0 ? ArrowUp : ArrowDown;

    return (
      <span style={{ color, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        <Icon size={14} /> {delta > 0 ? `+${delta}` : delta} {unit}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate('/avaliacoes')}
          className="btn btn-secondary btn-sm"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
            Comparativo Longitudinal de Avaliações
          </h1>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Evolução física direta: {first.assessment_date} vs {second.assessment_date}
          </span>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Métrica Física</th>
                <th>Avaliação Anterior ({first.assessment_date})</th>
                <th>Avaliação Atual ({second.assessment_date})</th>
                <th style={{ textAlign: 'right' }}>Variação (Delta)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Peso Corporal</td>
                <td>{comp1.weightKg || '-'} kg</td>
                <td style={{ fontWeight: 700 }}>{comp2.weightKg || '-'} kg</td>
                <td style={{ textAlign: 'right' }}>{renderDelta(weightDelta, 'kg', true)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Percentual de Gordura</td>
                <td>{comp1.bodyFatPercent || '-'}%</td>
                <td style={{ fontWeight: 700, color: 'var(--accent-red)' }}>{comp2.bodyFatPercent || '-'}%</td>
                <td style={{ textAlign: 'right' }}>{renderDelta(fatDelta, '%', true)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Massa Magra Livre de Gordura</td>
                <td>{comp1.leanMassKg || '-'} kg</td>
                <td style={{ fontWeight: 700 }}>{comp2.leanMassKg || '-'} kg</td>
                <td style={{ textAlign: 'right' }}>{renderDelta(leanDelta, 'kg', false)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Índice de Massa Corporal (IMC)</td>
                <td>{comp1.bmi || '-'}</td>
                <td style={{ fontWeight: 700 }}>{comp2.bmi || '-'}</td>
                <td style={{ textAlign: 'right' }}>{renderDelta(bmiDelta, '', true)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Braço Direito Contraído</td>
                <td>{perim1.rightArm || '-'} cm</td>
                <td style={{ fontWeight: 700 }}>{perim2.rightArm || '-'} cm</td>
                <td style={{ textAlign: 'right' }}>{renderDelta(armDelta, 'cm', false)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Tórax / Peitoral</td>
                <td>{perim1.chest || '-'} cm</td>
                <td style={{ fontWeight: 700 }}>{perim2.chest || '-'} cm</td>
                <td style={{ textAlign: 'right' }}>{renderDelta(chestDelta, 'cm', false)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Circunferência da Cintura</td>
                <td>{perim1.waist || '-'} cm</td>
                <td style={{ fontWeight: 700 }}>{perim2.waist || '-'} cm</td>
                <td style={{ textAlign: 'right' }}>{renderDelta(waistDelta, 'cm', true)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Box */}
      <div
        style={{
          padding: 20,
          backgroundColor: 'var(--color-success-subtle)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-success)', marginBottom: 6 }}>
          Conclusão da Recomposição Corporal
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
          O aluno apresentou redução real de gordura corporal acompanhada de preservação/ganho de massa magra.
          Excelente aderência aos protocolos prescritos na DragonCorp.
        </p>
      </div>
    </div>
  );
};
