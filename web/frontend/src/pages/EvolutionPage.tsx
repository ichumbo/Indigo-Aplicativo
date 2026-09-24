import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Activity,
  Calendar,
  Trophy,
  Scale,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { StudentProfile } from '../types';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';

const EXERCISE_IMAGES: Record<string, string> = {
  'Supino Reto com Barra': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400',
  'Crucifixo Inclinado com Halteres': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
  'Agachamento Livre com Barra': 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400',
  'Leg Press 45': 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400',
  'Puxada Alta Frontal': 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=400',
  'Elevação Lateral com Halteres': 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400',
  'Tríceps Corda na Polia': 'https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?w=400',
  'Rosca Direta com Barra W': 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400',
  'Abdominal na Rodinha': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
};

const getExercisePhoto = (name?: string) => {
  if (!name) return 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400';
  return EXERCISE_IMAGES[name] || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400';
};

export const EvolutionPage: React.FC = () => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [evolutionData, setEvolutionData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedExercise, setSelectedExercise] = useState<string>('');

  const fetchEvolution = async (studentId: string) => {
    try {
      const res = await apiClient.get(`/evolution/${studentId}`);
      setEvolutionData(res.data);
      const exercises = Object.keys(res.data.loadProgression || {});
      if (exercises.length > 0) {
        setSelectedExercise(exercises[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/students');
        const list = res.data.students || [];
        setStudents(list);
        if (list.length > 0) {
          const firstId = list[0].id;
          setSelectedStudentId(firstId);
          await fetchEvolution(firstId);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const handleStudentChange = async (newStudentId: string) => {
    setSelectedStudentId(newStudentId);
    await fetchEvolution(newStudentId);
  };

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

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  if (loading) return <Loader text="Carregando evolução..." />;
  if (students.length === 0) return <EmptyState title="Nenhum aluno" description="Cadastre alunos para acompanhar evolução." />;

  const loadProgression = evolutionData?.loadProgression || {};
  const exerciseKeys = Object.keys(loadProgression);
  const currentSets = selectedExercise ? loadProgression[selectedExercise] || [] : [];
  const bodyEvolution = evolutionData?.bodyEvolution || [];

  // Metrics for progression
  const firstLoad = currentSets[0]?.load || 0;
  const lastLoad = currentSets[currentSets.length - 1]?.load || 0;
  const lastReps = currentSets[currentSets.length - 1]?.reps || 0;
  const loadDelta = Math.round((lastLoad - firstLoad) * 10) / 10;
  const loadGrowthPercent = firstLoad > 0 ? Math.round(((lastLoad - firstLoad) / firstLoad) * 100) : 0;
  
  // Estimate 1RM using Epley Formula: 1RM = Weight * (1 + Reps / 30)
  const estimated1RM = lastLoad > 0 ? Math.round(lastLoad * (1 + (lastReps || 6) / 30) * 10) / 10 : 0;

  // Body composition deltas
  const firstBody = bodyEvolution[0] || {};
  const lastBody = bodyEvolution[bodyEvolution.length - 1] || {};
  const weightDiff = firstBody.weightKg && lastBody.weightKg ? Math.round((lastBody.weightKg - firstBody.weightKg) * 10) / 10 : 0;
  const fatDiff = firstBody.bodyFatPercent && lastBody.bodyFatPercent ? Math.round((lastBody.bodyFatPercent - firstBody.bodyFatPercent) * 10) / 10 : 0;

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: '100%' }}>
      {/* 1. Header with Student Selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          paddingBottom: 4,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.4 }}>
            Acompanhamento de Evolução
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Gráficos de progressão de sobrecarga, histórico de repetições e curva de composição corporal.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.4px' }}>
            Aluno Selecionado:
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#141414',
              border: '1px solid #282828',
              borderRadius: 'var(--radius-md)',
              padding: '4px 10px 4px 6px',
            }}
          >
            <img
              src={selectedStudent?.avatar_url || selectedStudent?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={selectedStudent?.full_name || 'Aluno'}
              style={{ width: 26, height: 26, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
            />
            <select
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
              }}
              value={selectedStudentId}
              onChange={(e) => handleStudentChange(e.target.value)}
            >
              {students.map((st) => (
                <option key={st.id} value={st.id} style={{ backgroundColor: '#161616', color: '#FFFFFF' }}>
                  {st.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Indicators */}
      <div className="stats-grid-4">
        <div
          style={{
            backgroundColor: '#141414',
            border: '1px solid #222222',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.4px' }}>
              Carga Máxima Atual
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {lastLoad > 0 ? `${lastLoad} kg` : '-'}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#1E1E1E',
              border: '1px solid #2A2A2A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <Trophy size={18} />
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#141414',
            border: '1px solid #222222',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.4px' }}>
              Ganho de Sobrecarga
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {loadDelta >= 0 ? `+${loadDelta} kg` : `${loadDelta} kg`}
              <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 4, color: 'var(--text-secondary)' }}>
                ({loadGrowthPercent >= 0 ? `+${loadGrowthPercent}%` : `${loadGrowthPercent}%`})
              </span>
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#1E1E1E',
              border: '1px solid #2A2A2A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
            }}
          >
            <TrendingUp size={18} />
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#141414',
            border: '1px solid #222222',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.4px' }}>
              Peso Corporal Atual
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {lastBody.weightKg ? `${lastBody.weightKg} kg` : '-'}
              {weightDiff !== 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 4, color: 'var(--text-secondary)' }}>
                  ({weightDiff > 0 ? `+${weightDiff}` : weightDiff} kg)
                </span>
              )}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#1E1E1E',
              border: '1px solid #2A2A2A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
            }}
          >
            <Scale size={18} />
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#141414',
            border: '1px solid #222222',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.4px' }}>
              Gordura Corporal Atual
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {lastBody.bodyFatPercent ? `${lastBody.bodyFatPercent}%` : '-'}
              {fatDiff !== 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 4, color: 'var(--text-secondary)' }}>
                  ({fatDiff > 0 ? `+${fatDiff}%` : `${fatDiff}%`})
                </span>
              )}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#1E1E1E',
              border: '1px solid #2A2A2A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
            }}
          >
            <Activity size={18} />
          </div>
        </div>
      </div>

      {/* 3. Exercise Load Progression Card */}
      <div
        style={{
          backgroundColor: '#141414',
          border: '1px solid #222222',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Card Header & Exercise Switcher Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={getExercisePhoto(selectedExercise)}
              alt={selectedExercise || 'Exercício'}
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400';
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-sm)',
                objectFit: 'cover',
                border: '1px solid #2A2A2A',
                flexShrink: 0,
              }}
            />
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                {selectedExercise || 'Progressão de Carga por Exercício'}
              </h2>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Histórico de sobrecarga progressiva registrada pelo aluno no app mobile
              </span>
            </div>
          </div>

          {exerciseKeys.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {exerciseKeys.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setSelectedExercise(ex)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    fontWeight: 700,
                    border: selectedExercise === ex ? '1px solid #D90000' : '1px solid #282828',
                    backgroundColor: selectedExercise === ex ? '#D90000' : '#1A1A1A',
                    color: selectedExercise === ex ? '#FFFFFF' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <img
                    src={getExercisePhoto(ex)}
                    alt=""
                    style={{ width: 18, height: 18, borderRadius: 3, objectFit: 'cover' }}
                  />
                  <span>{ex}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {currentSets.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nenhuma série registrada para este exercício ainda. As séries executadas no aplicativo móvel aparecerão aqui.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Visual Bar Chart with Guidelines */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
                gap: 16,
                height: 200,
                padding: '24px 16px 12px 16px',
                backgroundColor: '#181818',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #222222',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {/* Background Guideline Lines */}
              <div style={{ position: 'absolute', top: '25%', left: 0, right: 0, height: 1, borderTop: '1px dashed #242424', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, borderTop: '1px dashed #242424', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: '75%', left: 0, right: 0, height: 1, borderTop: '1px dashed #242424', pointerEvents: 'none' }} />

              {currentSets.map((s: any, idx: number) => {
                const maxLoad = Math.max(...currentSets.map((item: any) => item.load || 1));
                const heightPercent = Math.max(25, Math.round(((s.load || 1) / maxLoad) * 100));
                const isLatest = idx === currentSets.length - 1;

                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      minWidth: 44,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      height: '100%',
                      justifyContent: 'flex-end',
                      zIndex: 1,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 800, color: isLatest ? '#FFFFFF' : 'var(--text-secondary)' }}>
                      {s.load} {s.unit || 'kg'}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 48,
                        height: `${heightPercent}%`,
                        backgroundColor: '#D90000',
                        borderRadius: 'var(--radius-xs) var(--radius-xs) 0 0',
                        transition: 'height 0.3s ease',
                      }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                      {s.date ? formatShortDate(s.date) : `S${idx + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Performance Summary Capsules */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
                gap: 10,
                backgroundColor: '#181818',
                border: '1px solid #222222',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Carga Atual
                </span>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginTop: 1 }}>
                  {lastLoad} kg
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Repetições Executadas
                </span>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginTop: 1 }}>
                  {lastReps} reps
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Evolução Absoluta
                </span>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#34D399', marginTop: 1 }}>
                  +{loadDelta} kg (+{loadGrowthPercent}%)
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  1RM Teórico Estimado
                </span>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#38BDF8', marginTop: 1 }}>
                  ~{estimated1RM} kg
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Body Composition Trend */}
      <div
        style={{
          backgroundColor: '#141414',
          border: '1px solid #222222',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#1E1E1E',
                border: '1px solid #2A2A2A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34D399',
              }}
            >
              <Activity size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                Evolução de Peso e Composição Corporal
              </h2>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Comparativo cronológico das avaliações físicas periódicas
              </span>
            </div>
          </div>
        </div>

        {bodyEvolution.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Cadastre avaliações físicas para visualizar a curva de composição corporal do aluno.
          </div>
        ) : (
          <div
            className="table-responsive-container"
            style={{
              backgroundColor: '#181818',
              border: '1px solid #222222',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13, minWidth: 620 }}>
              <thead>
                <tr style={{ backgroundColor: '#1C1C1C', borderBottom: '1px solid #262626' }}>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Data da Avaliação
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Peso Total (kg)
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Gordura Corporal (%BF)
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Massa Magra Livre de Gordura
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'right' }}>
                    Status da Recomposição
                  </th>
                </tr>
              </thead>
              <tbody>
                {bodyEvolution.map((b: any, idx: number) => {
                  const prev = idx > 0 ? bodyEvolution[idx - 1] : null;
                  const fatDiffRow = prev ? Math.round((b.bodyFatPercent - prev.bodyFatPercent) * 10) / 10 : 0;

                  return (
                    <tr
                      key={idx}
                      style={{ borderBottom: '1px solid #202020', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#202020')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={13} color="var(--text-muted)" />
                          <span>{formatDate(b.date)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {b.weightKg} kg
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#FBBF24' }}>
                        {b.bodyFatPercent}%
                        {fatDiffRow !== 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 6, color: fatDiffRow < 0 ? '#34D399' : '#F87171' }}>
                            ({fatDiffRow > 0 ? `+${fatDiffRow}%` : `${fatDiffRow}%`})
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#34D399' }}>
                        {b.leanMassKg} kg
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            color: '#34D399',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                          }}
                        >
                          EVOLUÇÃO POSITIVA
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
