import React, { useEffect, useState } from 'react';
import {
  Library,
  Plus,
  Search,
  ExternalLink,
  Play,
  AlertCircle,
  X,
  LayoutGrid,
  List,
  Dumbbell,
  Sparkles,
  Film,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Exercise } from '../types';
import { Modal } from '../components/common/Modal';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';

// Helper to get fallback images if exercise doesn't have thumbnail_url
const getExerciseImage = (ex: Exercise): string => {
  if (ex.thumbnail_url) return ex.thumbnail_url;

  const name = ex.name.toLowerCase();
  if (name.includes('supino reto')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg';
  if (name.includes('crucifixo')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Press/0.jpg';
  if (name.includes('puxada')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Front_Lat_Pulldown/0.jpg';
  if (name.includes('remada')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg';
  if (name.includes('agachamento')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/0.jpg';
  if (name.includes('leg press')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg';
  if (name.includes('rosca direta') || name.includes('bíceps') || name.includes('biceps')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/EZ-Bar_Curl/0.jpg';
  if (name.includes('tríceps') || name.includes('triceps') || name.includes('corda')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown_-_Rope_Attachment/0.jpg';
  if (name.includes('elevação lateral') || name.includes('ombro') || name.includes('desenvolvimento')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg';
  if (name.includes('rodinha') || name.includes('abdominal') || name.includes('core') || name.includes('prancha')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Ab_Roller/0.jpg';
  if (name.includes('terra') || name.includes('deadlift')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/0.jpg';

  // Category based Unsplash fallback
  switch (ex.category) {
    case 'Peito':
      return 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600';
    case 'Costas':
      return 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=600';
    case 'Membros Inferiores':
    case 'Glúteos':
      return 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600';
    case 'Braços':
      return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600';
    case 'Ombros':
      return 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=600';
    case 'Abs & Core':
      return 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600';
    default:
      return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600';
  }
};

// Helper to extract YouTube embed URL
const getYoutubeEmbedUrl = (url?: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}?autoplay=1` : null;
};

export const ExercisesPage: React.FC = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Video preview modal
  const [activeVideoExercise, setActiveVideoExercise] = useState<Exercise | null>(null);

  // New custom exercise modal
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('Peito');
  const [muscleGroups, setMuscleGroups] = useState<string>('Peito, Ombros');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
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
        thumbnailUrl: thumbnailUrl || null,
        instructions: instructions || null,
      });

      setIsNewModalOpen(false);
      setName('');
      setVideoUrl('');
      setThumbnailUrl('');
      setInstructions('');
      fetchExercises();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Falha ao salvar exercício.');
    } finally {
      setSaving(false);
    }
  };

  const categories = ['Todos', 'Peito', 'Costas', 'Membros Inferiores', 'Braços', 'Ombros', 'Abs & Core'];

  const totalCount = exercises.length;
  const videosCount = exercises.filter((e) => Boolean(e.video_url)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: '100%' }}>
      {/* 1. Header: Title + Subtitle + View Switcher + CTA */}
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
            Biblioteca de Exercícios
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Catálogo completo com fotos em alta definição, vídeos demonstrativos e prescrições personalizadas.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* View Mode Toggle */}
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

          {/* Solid Minimalist CTA Button (No Gradient) */}
          <button
            onClick={() => setIsNewModalOpen(true)}
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
            <span>Novo Exercício Personalizado</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Indicators */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
        }}
      >
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
              Total no Catálogo
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {totalCount}
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
            <Dumbbell size={18} />
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
              Com Vídeo Demonstrativo
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#34D399', marginTop: 2 }}>
              {videosCount} Vídeos HD
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34D399',
            }}
          >
            <Film size={18} />
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
              Categorias Musculares
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#38BDF8', marginTop: 2 }}>
              6 Grupos
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38BDF8',
            }}
          >
            <Layers size={18} />
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
              Padrão Biomecânico
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#34D399', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={15} />
              DragonCorp Oficial
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34D399',
            }}
          >
            <Sparkles size={18} />
          </div>
        </div>
      </div>

      {/* 3. Search and Category Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          backgroundColor: '#141414',
          border: '1px solid #222222',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
        }}
      >
        <div style={{ position: 'relative', width: '100%', maxWidth: 460 }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Pesquisar exercício por nome, grupo muscular ou tag..."
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

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                fontWeight: 700,
                border: selectedCategory === cat ? '1px solid #D90000' : '1px solid #282828',
                backgroundColor: selectedCategory === cat ? '#D90000' : '#1A1A1A',
                color: selectedCategory === cat ? '#FFFFFF' : 'var(--text-secondary)',
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

      {/* 4. Content Area: Grid with Images vs Dense Table */}
      {loading ? (
        <div style={{ padding: 60 }}>
          <Loader text="Carregando biblioteca de exercícios..." />
        </div>
      ) : exercises.length === 0 ? (
        <div
          style={{
            backgroundColor: '#141414',
            border: '1px solid #222222',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 24px',
          }}
        >
          <EmptyState
            icon={<Library size={40} />}
            title="Nenhum exercício encontrado"
            description="Nenhum resultado corresponde aos filtros pesquisados."
            actionLabel="+ Cadastrar Exercício"
            onAction={() => setIsNewModalOpen(true)}
          />
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW WITH RICH EXERCISE PHOTOS */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 18,
          }}
        >
          {exercises.map((ex) => {
            const imageUrl = getExerciseImage(ex);

            return (
              <div
                key={ex.id}
                style={{
                  backgroundColor: '#141414',
                  border: '1px solid #222222',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.2s ease, transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#383838')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#222222')}
              >
                {/* Image Banner with Badges & Play Icon Overlay */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: 165,
                    backgroundColor: '#1A1A1A',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={imageUrl}
                    alt={ex.name}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.3s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  />

                  {/* Dark subtle overlay on image (No gradient) */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(15, 15, 15, 0.4)',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Top Badges */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      right: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      zIndex: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(8px)',
                        color: '#FFFFFF',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                      }}
                    >
                      {ex.category}
                    </span>

                    {!ex.is_system ? (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'rgba(217, 0, 0, 0.85)',
                          color: '#FFFFFF',
                        }}
                      >
                        Personalizado
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'rgba(0, 0, 0, 0.65)',
                          backdropFilter: 'blur(8px)',
                          color: '#34D399',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        Oficial
                      </span>
                    )}
                  </div>

                  {/* Play Button Overlay if video available */}
                  {ex.video_url && (
                    <button
                      type="button"
                      onClick={() => setActiveVideoExercise(ex)}
                      style={{
                        position: 'absolute',
                        bottom: 10,
                        right: 10,
                        width: 34,
                        height: 34,
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(6px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease, background-color 0.15s ease',
                        zIndex: 2,
                      }}
                      title="Assistir demonstração"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#D90000';
                        e.currentTarget.style.color = '#FFFFFF';
                        e.currentTarget.style.transform = 'scale(1.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
                        e.currentTarget.style.color = 'var(--primary)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Play size={15} fill="currentColor" />
                    </button>
                  )}
                </div>

                {/* Card Body */}
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                      {ex.name}
                    </h3>
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        marginTop: 4,
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {ex.description || ex.instructions || 'Exercício para desenvolvimento de força e hipertrofia.'}
                    </p>
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 'auto' }}>
                    {(ex.tags || []).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          backgroundColor: '#1A1A1A',
                          border: '1px solid #262626',
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-xs)',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Action Button */}
                  <div style={{ paddingTop: 6, borderTop: '1px solid #1E1E1E' }}>
                    <button
                      type="button"
                      onClick={() => setActiveVideoExercise(ex)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#1E1E1E',
                        border: '1px solid #282828',
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#252525';
                        e.currentTarget.style.borderColor = '#383838';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#1E1E1E';
                        e.currentTarget.style.borderColor = '#282828';
                      }}
                    >
                      <Play size={13} color="var(--primary)" fill="currentColor" />
                      <span>Ver Demonstração Técnica</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW WITH THUMBNAILS */
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
                  Exercício
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Categoria
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Grupos Musculares
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Tags
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'right' }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {exercises.map((ex) => {
                const imageUrl = getExerciseImage(ex);

                return (
                  <tr
                    key={ex.id}
                    style={{ borderBottom: '1px solid #1C1C1C', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#181818')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img
                          src={imageUrl}
                          alt={ex.name}
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
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{ex.name}</div>
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--text-muted)',
                              maxWidth: 320,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {ex.description || 'Padrão biomecânico oficial.'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: '#1E1E1E',
                          color: '#FFFFFF',
                          border: '1px solid #282828',
                        }}
                      >
                        {ex.category}
                      </span>
                    </td>

                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                      {(ex.muscle_groups || []).join(', ') || ex.category}
                    </td>

                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(ex.tags || []).slice(0, 2).map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: 10,
                              color: 'var(--text-muted)',
                              backgroundColor: '#1A1A1A',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-xs)',
                            }}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setActiveVideoExercise(ex)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#242424',
                          border: '1px solid #333333',
                          color: '#FFFFFF',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Play size={12} color="var(--primary)" fill="currentColor" />
                        <span>Ver Vídeo</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Demonstração Técnica & Vídeo */}
      <Modal
        isOpen={Boolean(activeVideoExercise)}
        onClose={() => setActiveVideoExercise(null)}
        title={activeVideoExercise?.name || 'Demonstração Técnica'}
        maxWidth={640}
      >
        {activeVideoExercise && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Embedded Video or Video Banner */}
            {getYoutubeEmbedUrl(activeVideoExercise.video_url) ? (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  paddingBottom: '56.25%',
                  backgroundColor: '#000',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid #282828',
                }}
              >
                <iframe
                  src={getYoutubeEmbedUrl(activeVideoExercise.video_url)!}
                  title={activeVideoExercise.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 240,
                  backgroundColor: '#000',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid #282828',
                }}
              >
                <img
                  src={getExerciseImage(activeVideoExercise)}
                  alt={activeVideoExercise.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            {/* Exercise Execution Details */}
            <div
              style={{
                backgroundColor: '#181818',
                border: '1px solid #262626',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.4 }}>
                Instruções de Execução e Padrão Biomecânico
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 6, lineHeight: 1.5 }}>
                {activeVideoExercise.instructions || activeVideoExercise.description || 'Posicione-se adequadamente no aparelho/banco, mantenha a postura estável e realize o movimento com cadência controlada na fase excêntrica.'}
              </p>
            </div>

            {activeVideoExercise.video_url && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <a
                  href={activeVideoExercise.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={13} />
                  <span>Abrir no YouTube em nova aba</span>
                </a>

                <button
                  type="button"
                  onClick={() => setActiveVideoExercise(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: '#242424',
                    border: '1px solid #333',
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal: Novo Exercício Personalizado (Minimalist Form) */}
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
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
            <label className="form-label">Link do Vídeo (YouTube)</label>
            <input
              type="url"
              className="form-input"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">URL da Imagem / Foto do Exercício (Opcional)</label>
            <input
              type="url"
              className="form-input"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
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
              style={{
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 800,
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#D90000',
                color: '#FFFFFF',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Cadastrando...' : 'Salvar Exercício'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
