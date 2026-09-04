import React, { useEffect, useState } from 'react';
import { TrendingUp, User as UserIcon, Dumbbell, Activity, Calendar } from 'lucide-react';
import { apiClient } from '../api/client';
import { StudentProfile } from '../types';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';

export const EvolutionPage: React.FC = () => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [evolutionData, setEvolutionData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedExercise, setSelectedExercise] = useState<string>('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await apiClient.get('/students');
        const list = res.data.students || [];
        setStudents(list);
        if (list.length > 0) {
          setSelectedStudentId(list[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;

    const fetchEvolution = async () => {
      try {
        const res = await apiClient.get(`/evolution/${selectedStudentId}`);
        setEvolutionData(res.data);
        const exercises = Object.keys(res.data.loadProgression || {});
        if (exercises.length > 0) {
          setSelectedExercise(exercises[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchEvolution();
  }, [selectedStudentId]);

  if (loading) return <Loader text="Carregando evolução..." />;
  if (students.length === 0) return <EmptyState title="Nenhum aluno" description="Cadastre alunos para acompanhar evolução." />;

  const loadProgression = evolutionData?.loadProgression || {};
  const exerciseKeys = Object.keys(loadProgression);
  const currentSets = selectedExercise ? loadProgression[selectedExercise] || [] : [];
  const bodyEvolution = evolutionData?.bodyEvolution || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header with Student Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
            Acompanhamento de Evolução
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Gráficos de progressão de sobrecarga, histórico de repetições e peso corporal.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Aluno:</span>
          <select
            className="form-select"
            style={{ width: 220 }}
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            {students.map((st) => (
              <option key={st.id} value={st.id}>
                {st.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Exercise Load Progression Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Dumbbell size={18} color="var(--accent-red)" />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Progressão de Carga por Exercício
            </h2>
          </div>

          {exerciseKeys.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {exerciseKeys.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setSelectedExercise(ex)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 12,
                    fontWeight: 600,
                    border: '1px solid var(--border-color)',
                    backgroundColor: selectedExercise === ex ? 'var(--accent-red)' : 'var(--bg-primary)',
                    color: selectedExercise === ex ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>

        {currentSets.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '20px 0' }}>
            Nenhuma série registrada para este exercício ainda. As séries executadas no aplicativo móvel aparecerão aqui.
          </p>
        ) : (
          <div>
            {/* Visual Bar / Stat Chart */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 18,
                height: 180,
                padding: '20px 10px 10px 10px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                marginBottom: 16,
              }}
            >
              {currentSets.map((s: any, idx: number) => {
                const maxLoad = Math.max(...currentSets.map((item: any) => item.load || 1));
                const heightPercent = Math.max(20, Math.round(((s.load || 1) / maxLoad) * 100));

                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      height: '100%',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-red)' }}>
                      {s.load} {s.unit}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 42,
                        height: `${heightPercent}%`,
                        backgroundColor: 'var(--accent-red)',
                        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                        transition: 'height 0.3s ease',
                      }}
                    />
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {s.date ? new Date(s.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : `S${idx + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
              <span>Última carga: <strong style={{ color: 'var(--text-primary)' }}>{currentSets[currentSets.length - 1]?.load} kg</strong></span>
              <span>Repetições: <strong style={{ color: 'var(--text-primary)' }}>{currentSets[currentSets.length - 1]?.reps} reps</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Body Composition Trend */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Activity size={18} color="var(--color-success)" />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            Evolução de Peso e Percentual de Gordura
          </h2>
        </div>

        {bodyEvolution.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Cadastre avaliações físicas para visualizar a curva de composição corporal do aluno.
          </p>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data da Avaliação</th>
                  <th>Peso (kg)</th>
                  <th>Percentual de Gordura</th>
                  <th>Massa Magra Livre de Gordura</th>
                </tr>
              </thead>
              <tbody>
                {bodyEvolution.map((b: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{b.date}</td>
                    <td style={{ fontWeight: 700 }}>{b.weightKg} kg</td>
                    <td style={{ color: 'var(--accent-red)', fontWeight: 700 }}>{b.bodyFatPercent}%</td>
                    <td>{b.leanMassKg} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
