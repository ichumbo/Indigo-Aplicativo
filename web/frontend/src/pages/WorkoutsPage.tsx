import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Plus, Search, Copy, Edit2, Calendar, User as UserIcon } from 'lucide-react';
import { apiClient } from '../api/client';
import { TrainingPlan } from '../types';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';

export const WorkoutsPage: React.FC = () => {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
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
    } catch (err) {
      alert('Falha ao duplicar treino.');
    } finally {
      setDuplicatingId(null);
    }
  };

  const filtered = workouts.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    w.objective?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
            Central de Treinos
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Crie, edite e gerencie os programas de treinamento dos seus alunos com velocidade máxima.
          </p>
        </div>

        <button
          onClick={() => navigate('/treinos/novo')}
          className="btn btn-primary"
        >
          <Plus size={16} />
          <span>Montar Novo Treino</span>
        </button>
      </div>

      {/* Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--bg-secondary)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Buscar por nome do treino ou aluno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Workouts Grid */}
      {loading ? (
        <Loader text="Carregando treinos..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={40} />}
          title="Nenhum treino cadastrado"
          description="Aproveite o espaço amplo e o teclado do computador para montar treinos muito mais rápido."
          actionLabel="Montar Primeiro Treino"
          onAction={() => navigate('/treinos/novo')}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 18,
          }}
        >
          {filtered.map((workout) => {
            const sessionsCount = workout.sessions?.length || 0;
            const totalExercises = (workout.sessions || []).reduce(
              (acc, s) => acc + (s.active_version?.exercises?.length || 0),
              0
            );

            return (
              <div key={workout.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {workout.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent-red)', fontWeight: 600, marginTop: 4 }}>
                      <UserIcon size={13} />
                      <span>{workout.student?.full_name || 'Aluno Vinculado'}</span>
                    </div>
                  </div>
                  <span className={`badge ${workout.status === 'ativo' ? 'badge-green' : 'badge-neutral'}`}>
                    {workout.status}
                  </span>
                </div>

                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {workout.objective}
                </p>

                {/* Session Pill tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {workout.sessions?.map((s) => (
                    <span
                      key={s.id}
                      style={{
                        padding: '3px 8px',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 11,
                        color: 'var(--text-muted)',
                      }}
                    >
                      {s.active_version?.identifier || s.active_version?.name || 'Sessão'}
                    </span>
                  ))}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-color)',
                    marginTop: 'auto',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={13} /> {workout.valid_until ? `Até ${workout.valid_until}` : 'Sem validade'}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => handleDuplicate(workout.id)}
                      disabled={duplicatingId === workout.id}
                      className="btn btn-secondary btn-sm"
                      title="Duplicar Treino"
                    >
                      <Copy size={13} />
                      <span>Duplicar</span>
                    </button>
                    <button
                      onClick={() => navigate(`/treinos/${workout.id}/editar`)}
                      className="btn btn-primary btn-sm"
                    >
                      <Edit2 size={13} />
                      <span>Editar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
