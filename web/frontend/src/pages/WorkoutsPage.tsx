import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  Plus,
  Search,
  Copy,
  Edit2,
  Calendar,
  X,
  LayoutGrid,
  List,
  CheckCircle2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { TrainingPlan } from '../types';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';

export const WorkoutsPage: React.FC = () => {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const fetchWorkouts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/workouts');
      setWorkouts(res.data.workouts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const handleDuplicate = async (id: string) => {
    setDuplicatingId(id);
    try {
      await apiClient.post(`/workouts/${id}/duplicate`);
      fetchWorkouts();
    } catch {
      alert('Falha ao duplicar treino.');
    } finally {
      setDuplicatingId(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Indeterminada';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const filtered = useMemo(() => {
    return workouts.filter((w) => {
      const name = w.name || '';
      const student = w.student?.full_name || '';
      const obj = w.objective || '';
      const q = search.toLowerCase();
      const matchesSearch = name.toLowerCase().includes(q) || student.toLowerCase().includes(q) || obj.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || w.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [workouts, search, statusFilter]);

  const totalCount = workouts.length;
  const activeCount = workouts.filter((w) => w.status === 'ativo').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: '100%' }}>
      {/* 1. Header */}
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
            Fichas & Treinos
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Prescreva, edite e acompanhe as fichas de musculação personalizadas dos seus alunos.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* View Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#161616',
              border: '1px solid #282828',
              borderRadius: 'var(--radius-md)',
              padding: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: viewMode === 'grid' ? '#242424' : 'transparent',
                border: 'none',
                color: viewMode === 'grid' ? '#FFFFFF' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Visualização em Cards"
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: viewMode === 'table' ? '#242424' : 'transparent',
                border: 'none',
                color: viewMode === 'table' ? '#FFFFFF' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Visualização em Tabela"
            >
              <List size={14} />
              <span>Tabela</span>
            </button>
          </div>

          <button
            onClick={() => navigate('/treinos/novo')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 800,
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#D90000',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#B30000')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D90000')}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Novo Treino</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Sleek Minimalist Stat Cards */}
      <div className="stats-grid-4">
        <div className="stat-card-sleek">
          <div className="stat-card-sleek-header">
            <span className="stat-card-sleek-title">Total de Fichas</span>
            <div className="icon-badge" style={{ width: 34, height: 34 }}>
              <Dumbbell size={17} />
            </div>
          </div>
          <div>
            <div className="stat-card-sleek-value">{totalCount}</div>
            <div className="stat-card-sleek-footer" style={{ marginTop: 4 }}>
              <span>Catálogo e modelos</span>
            </div>
          </div>
        </div>

        <div className="stat-card-sleek">
          <div className="stat-card-sleek-header">
            <span className="stat-card-sleek-title">Fichas Ativas</span>
            <div className="icon-badge" style={{ width: 34, height: 34 }}>
              <CheckCircle2 size={17} />
            </div>
          </div>
          <div>
            <div className="stat-card-sleek-value">{activeCount}</div>
            <div className="stat-card-sleek-footer" style={{ marginTop: 4, color: 'var(--text-secondary)' }}>
              <span>Vigentes nos alunos</span>
            </div>
          </div>
        </div>

        <div className="stat-card-sleek">
          <div className="stat-card-sleek-header">
            <span className="stat-card-sleek-title">Frequência Padrão</span>
            <div className="icon-badge" style={{ width: 34, height: 34 }}>
              <Calendar size={17} />
            </div>
          </div>
          <div>
            <div className="stat-card-sleek-value">4 a 5x <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>/ sem</span></div>
            <div className="stat-card-sleek-footer" style={{ marginTop: 4 }}>
              <span>Média da prescrição</span>
            </div>
          </div>
        </div>

        <div className="stat-card-sleek">
          <div className="stat-card-sleek-header">
            <span className="stat-card-sleek-title">Sincronismo Mobile</span>
            <div className="icon-badge" style={{ width: 34, height: 34 }}>
              <Zap size={17} />
            </div>
          </div>
          <div>
            <div className="stat-card-sleek-value" style={{ fontSize: 18 }}>Tempo Real</div>
            <div className="stat-card-sleek-footer" style={{ marginTop: 4, color: 'var(--text-secondary)' }}>
              <span>Reflete no app do aluno</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search and Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          backgroundColor: '#141414',
          border: '1px solid #222222',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Buscar por treino, aluno ou objetivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#1A1A1A',
              border: '1px solid #2A2A2A',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 34px 8px 36px',
              fontSize: 13,
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#D90000')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A2A')}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border: statusFilter === 'all' ? '1px solid #D90000' : '1px solid #282828',
              backgroundColor: statusFilter === 'all' ? 'rgba(217, 0, 0, 0.14)' : '#1A1A1A',
              color: statusFilter === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Todos ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ativo')}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border: statusFilter === 'ativo' ? '1px solid #D90000' : '1px solid #282828',
              backgroundColor: statusFilter === 'ativo' ? 'rgba(217, 0, 0, 0.14)' : '#1A1A1A',
              color: statusFilter === 'ativo' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Ativos ({activeCount})
          </button>
        </div>
      </div>

      {/* 4. Content Area: Grid vs Table */}
      {loading ? (
        <div style={{ padding: 60 }}>
          <Loader text="Carregando fichas de treino..." />
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            backgroundColor: '#141414',
            border: '1px solid #222222',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 24px',
          }}
        >
          <EmptyState
            icon={<Dumbbell size={40} />}
            title="Nenhum treino cadastrado"
            description="Crie fichas completas com exercícios, séries, repetições e descanso para seus alunos."
            actionLabel="+ Montar Novo Treino"
            onAction={() => navigate('/treinos/novo')}
          />
        </div>
      ) : viewMode === 'grid' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap: 16,
          }}
        >
          {filtered.map((workout) => (
            <div
              key={workout.id}
              style={{
                backgroundColor: '#141414',
                border: '1px solid #222222',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                transition: 'border-color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#383838')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#222222')}
            >
              {/* Top: Icon + Title + Student + Status */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#1E1E1E',
                      border: '1px solid #2A2A2A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      flexShrink: 0,
                    }}
                  >
                    <Dumbbell size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {workout.name}
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                      Aluno: <strong style={{ color: 'var(--text-secondary)' }}>{workout.student?.full_name || 'Geral'}</strong>
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor:
                      workout.status === 'ativo'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(239, 68, 68, 0.12)',
                    color: workout.status === 'ativo' ? '#34D399' : '#F87171',
                    border:
                      workout.status === 'ativo'
                        ? '1px solid rgba(16, 185, 129, 0.25)'
                        : '1px solid rgba(239, 68, 68, 0.25)',
                  }}
                >
                  {workout.status?.toUpperCase() || 'ATIVO'}
                </span>
              </div>

              {/* Info row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  backgroundColor: '#181818',
                  border: '1px solid #222222',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                }}
              >
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Objetivo
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                    {workout.objective || 'Hipertrofia'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Validade da Ficha
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                    {formatDate(workout.valid_until)}
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #1E1E1E',
                  paddingTop: 10,
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleDuplicate(workout.id)}
                  disabled={duplicatingId === workout.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: '#1E1E1E',
                    border: '1px solid #282828',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Copy size={13} />
                  <span>Duplicar</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/treinos/${workout.id}/editar`)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: '#242424',
                    border: '1px solid #333333',
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2E2E2E')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#242424')}
                >
                  <Edit2 size={13} />
                  <span>Editar Ficha</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
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
                  Treino / Ficha
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Aluno
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Objetivo
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Validade
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'right' }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((workout) => (
                <tr
                  key={workout.id}
                  style={{ borderBottom: '1px solid #1C1C1C', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#181818')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{workout.name}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {workout.student?.full_name || 'Geral'}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {workout.objective || 'Hipertrofia'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor:
                          workout.status === 'ativo'
                            ? 'rgba(16, 185, 129, 0.12)'
                            : 'rgba(239, 68, 68, 0.12)',
                        color: workout.status === 'ativo' ? '#34D399' : '#F87171',
                      }}
                    >
                      {workout.status?.toUpperCase() || 'ATIVO'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                    {formatDate(workout.valid_until)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(workout.id)}
                        disabled={duplicatingId === workout.id}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#1E1E1E',
                          border: '1px solid #282828',
                          color: 'var(--text-secondary)',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Duplicar
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/treinos/${workout.id}/editar`)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#242424',
                          border: '1px solid #333333',
                          color: '#FFFFFF',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
