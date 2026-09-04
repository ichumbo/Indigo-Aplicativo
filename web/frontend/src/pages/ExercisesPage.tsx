import React, { useEffect, useState } from 'react';
import { Library, Plus, Search, ExternalLink, Play, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { Exercise } from '../types';
import { Modal } from '../components/common/Modal';
import { Loader } from '../components/common/Loader';

export const ExercisesPage: React.FC = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Video preview modal
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);

  // New custom exercise modal
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('Peito');
  const [muscleGroups, setMuscleGroups] = useState<string>('Peito, Ombros');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory !== 'Todos') params.append('category', selectedCategory);
      const res = await apiClient.get(`/exercises?${params.toString()}`);
      setExercises(res.data.exercises || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, [search, selectedCategory]);

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      await apiClient.post('/exercises', {
        name,
        category,
        muscleGroups: muscleGroups.split(',').map((s) => s.trim()),
        videoUrl: videoUrl || null,
        instructions: instructions || null,
      });

      setIsNewModalOpen(false);
      setName('');
      setVideoUrl('');
      setInstructions('');
      fetchExercises();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Falha ao salvar exercício.');
    } finally {
      setSaving(false);
    }
  };

  const categories = ['Todos', 'Peito', 'Costas', 'Membros Inferiores', 'Braços', 'Ombros', 'Abs & Core'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
            Biblioteca de Exercícios
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Catálogo completo com vídeos demonstrativos e exercícios customizados pelo personal.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus size={16} />
          <span>Novo Exercício Personalizado</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          backgroundColor: 'var(--bg-secondary)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ position: 'relative', maxWidth: 450 }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Pesquisar exercício por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid var(--border-color)',
                backgroundColor: selectedCategory === cat ? 'var(--accent-red)' : 'var(--bg-primary)',
                color: selectedCategory === cat ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Exercises Grid */}
      {loading ? (
        <Loader text="Carregando biblioteca de exercícios..." />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {exercises.map((ex) => (
            <div key={ex.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{ex.name}</h3>
                  <span className="badge badge-neutral" style={{ marginTop: 4 }}>{ex.category}</span>
                </div>
                {!ex.is_system && (
                  <span className="badge badge-red" style={{ fontSize: 10 }}>Personalizado</span>
                )}
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {ex.description || ex.instructions || 'Sem descrição cadastrada.'}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 'auto' }}>
                {(ex.tags || []).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      backgroundColor: 'var(--bg-primary)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {ex.video_url && (
                <div style={{ paddingTop: 10, borderTop: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => setVideoModalUrl(ex.video_url || null)}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Play size={14} color="var(--accent-red)" />
                    <span>Assistir Demonstração</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Demonstração de Vídeo */}
      <Modal
        isOpen={!!videoModalUrl}
        onClose={() => setVideoModalUrl(null)}
        title="Demonstração do Exercício"
        maxWidth={640}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Link oficial do vídeo de execução técnica:
          </p>
          <a
            href={videoModalUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <span>Abrir Vídeo no YouTube / Web</span>
            <ExternalLink size={16} />
          </a>
        </div>
      </Modal>

      {/* Modal: Novo Exercício Personalizado */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Cadastrar Exercício Personalizado"
        maxWidth={540}
      >
        {formError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              backgroundColor: 'var(--color-danger-subtle)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#F87171',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateExercise}>
          <div className="form-group">
            <label className="form-label">Nome do Exercício *</label>
            <input
              type="text"
              className="form-input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Supino Reto com Halteres e Pegada Neutra"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Grupo Muscular Principal *</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Peito">Peito</option>
                <option value="Costas">Costas</option>
                <option value="Membros Inferiores">Membros Inferiores</option>
                <option value="Braços">Braços</option>
                <option value="Ombros">Ombros</option>
                <option value="Abs & Core">Abs & Core</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Grupos Secundários</label>
              <input
                type="text"
                className="form-input"
                value={muscleGroups}
                onChange={(e) => setMuscleGroups(e.target.value)}
                placeholder="Ex: Ombros, Tríceps"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Link do Vídeo (YouTube / Vimeo / MP4)</label>
            <input
              type="url"
              className="form-input"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Passo a Passo / Instruções Técnicas</label>
            <textarea
              className="form-textarea"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Descreva posicionamento, padrão de respiração e pontos de atenção..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Cadastrando...' : 'Salvar Exercício'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
