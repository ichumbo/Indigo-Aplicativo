import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Dumbbell,
  Copy,
  Link2,
  Unlink,
  Eye,
  FileText,
  TrendingUp,
  X,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { StudentProfile, Exercise } from '../types';
import { Modal } from '../components/common/Modal';
import { Loader } from '../components/common/Loader';

export interface WorkoutSetDetail {
  id: string;
  setNumber: number;
  reps: string;
  load: string;
  restSeconds: number;
  notes?: string;
}

// Helper to get fallback images if exercise doesn't have thumbnail
const getExerciseImage = (ex: { name: string; category?: string; thumbnail_url?: string; thumbnailUrl?: string }): string => {
  if (ex.thumbnail_url) return ex.thumbnail_url;
  if (ex.thumbnailUrl) return ex.thumbnailUrl;

  const name = (ex.name || '').toLowerCase();
  if (name.includes('supino reto')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg';
  if (name.includes('inclinado') || name.includes('crucifixo')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Press/0.jpg';
  if (name.includes('puxada')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Front_Lat_Pulldown/0.jpg';
  if (name.includes('remada')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg';
  if (name.includes('agachamento')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/0.jpg';
  if (name.includes('leg press')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg';
  if (name.includes('rosca') || name.includes('bíceps') || name.includes('biceps')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/EZ-Bar_Curl/0.jpg';
  if (name.includes('tríceps') || name.includes('triceps') || name.includes('corda')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown_-_Rope_Attachment/0.jpg';
  if (name.includes('elevação lateral') || name.includes('ombro') || name.includes('desenvolvimento')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg';
  if (name.includes('rodinha') || name.includes('abdominal') || name.includes('core') || name.includes('prancha')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Ab_Roller/0.jpg';
  if (name.includes('terra') || name.includes('deadlift')) return 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/0.jpg';

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

export interface WorkoutExerciseItem {
  id: string;
  name: string;
  category: string;
  muscleGroup: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  observation?: string;
  cadence?: string;
  sets: WorkoutSetDetail[];
  sectionId?: string;
  combinationId?: string;
  combinationLabel?: string;
}

export interface WorkoutSectionHeader {
  id: string;
  title: string;
  order: number;
  icon?: string;
}

export interface WorkoutGeneralInfo {
  name: string;
  startDate: string;
  endDate: string;
  notes: string;
  releaseToStudent: boolean;
  notifyExpiration: boolean;
  splitByWeekDay: boolean;
  recommendedDays: string[];
  coverUrl?: string;
}

const SECTION_QUICK_PRESETS = [
  { title: 'Aquecimento & Mobilidade', icon: 'flame' },
  { title: 'Peitoral & Tríceps', icon: 'shield' },
  { title: 'Costas & Bíceps', icon: 'layers' },
  { title: 'Pernas & Glúteos', icon: 'activity' },
  { title: 'Ombros & Trapézio', icon: 'zap' },
  { title: 'Força Principal', icon: 'dumbbell' },
  { title: 'Cardio & HIIT', icon: 'flame' },
  { title: 'Alongamento Final', icon: 'activity' },
];

const WORKOUT_COVER_PRESETS = [
  {
    id: 'chest-strength',
    label: 'Força / Supino',
    url: 'https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: 'back-row',
    label: 'Costas / Halteres',
    url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: 'leg-squat',
    label: 'Pernas / Agachamento',
    url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: 'cardio-run',
    label: 'Cardio / Corrida',
    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: 'arms-biceps',
    label: 'Braços / Bíceps',
    url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&auto=format&fit=crop&q=60',
  },
];

export const WorkoutEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const preselectedStudentId = searchParams.get('studentId') || searchParams.get('student_id') || '';

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [exercisesCatalog, setExercisesCatalog] = useState<Exercise[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  // 4 Core Mobile Tabs: 'edit' | 'exercises' | 'volume' | 'student-preview'
  const [activeTab, setActiveTab] = useState<'edit' | 'exercises' | 'volume' | 'student-preview'>('exercises');

  // Selected Student
  const [studentId, setStudentId] = useState<string>(preselectedStudentId);

  // General Info (Tab 1: Dados Gerais)
  const [info, setInfo] = useState<WorkoutGeneralInfo>({
    name: 'Treino A — Peito e Tríceps',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
    notes: '',
    releaseToStudent: true,
    notifyExpiration: true,
    splitByWeekDay: false,
    recommendedDays: ['Segunda', 'Quarta', 'Sexta'],
    coverUrl: WORKOUT_COVER_PRESETS[0].url,
  });

  // Sections (Cabeçalhos)
  const [sections, setSections] = useState<WorkoutSectionHeader[]>([
    { id: 'sec-1', title: 'Aquecimento & Mobilidade', order: 1, icon: 'flame' },
    { id: 'sec-2', title: 'Peitoral & Tríceps', order: 2, icon: 'shield' },
  ]);

  // Exercises List
  const [exercises, setExercises] = useState<WorkoutExerciseItem[]>([
    {
      id: 'ex-1',
      name: 'Supino Reto com Barra',
      category: 'Peito',
      muscleGroup: 'Peito',
      cadence: '3-0-1-0',
      thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg',
      observation: 'Cadência controlada na descida. Escápulas aduzidas.',
      sectionId: 'sec-2',
      sets: [
        { id: 's1', setNumber: 1, reps: '10', load: '30', restSeconds: 90 },
        { id: 's2', setNumber: 2, reps: '10', load: '35', restSeconds: 90 },
        { id: 's3', setNumber: 3, reps: '8', load: '40', restSeconds: 90 },
        { id: 's4', setNumber: 4, reps: '8', load: '40', restSeconds: 90 },
      ],
    },
    {
      id: 'ex-2',
      name: 'Supino Inclinado com Halteres',
      category: 'Peito',
      muscleGroup: 'Peito',
      cadence: '3-0-1-0',
      thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Press/0.jpg',
      observation: 'Alongamento máximo na base.',
      sectionId: 'sec-2',
      sets: [
        { id: 's1', setNumber: 1, reps: '10', load: '22', restSeconds: 60 },
        { id: 's2', setNumber: 2, reps: '10', load: '22', restSeconds: 60 },
        { id: 's3', setNumber: 3, reps: '10', load: '24', restSeconds: 60 },
      ],
    },
    {
      id: 'ex-3',
      name: 'Tríceps Corda na Polia',
      category: 'Braços',
      muscleGroup: 'Braços',
      cadence: '2-0-1-1',
      thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown_-_Rope_Attachment/0.jpg',
      observation: 'Abrir a corda no final da extensão.',
      sectionId: 'sec-2',
      combinationId: 'biset-1',
      combinationLabel: 'BI-SET',
      sets: [
        { id: 's1', setNumber: 1, reps: '12', load: '15', restSeconds: 0 },
        { id: 's2', setNumber: 2, reps: '12', load: '15', restSeconds: 0 },
        { id: 's3', setNumber: 3, reps: '12', load: '15', restSeconds: 0 },
      ],
    },
    {
      id: 'ex-4',
      name: 'Tríceps Francês Unilateral',
      category: 'Braços',
      muscleGroup: 'Braços',
      cadence: '3-0-1-0',
      observation: 'Cotovelo apontando para cima.',
      sectionId: 'sec-2',
      combinationId: 'biset-1',
      combinationLabel: 'BI-SET',
      sets: [
        { id: 's1', setNumber: 1, reps: '12', load: '8', restSeconds: 60 },
        { id: 's2', setNumber: 2, reps: '12', load: '8', restSeconds: 60 },
        { id: 's3', setNumber: 3, reps: '12', load: '8', restSeconds: 60 },
      ],
    },
  ]);

  // Combination mode state
  const [isCombinationMode, setIsCombinationMode] = useState<boolean>(false);

  // Modals state
  const [showHeaderModal, setShowHeaderModal] = useState<boolean>(false);
  const [newHeaderTitle, setNewHeaderTitle] = useState<string>('');
  const [newHeaderIcon, setNewHeaderIcon] = useState<string>('shield');

  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogCategory, setCatalogCategory] = useState<string>('Todos');


  // Saving state
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, exercisesRes] = await Promise.all([
          apiClient.get('/students'),
          apiClient.get('/exercises'),
        ]);
        setStudents(studentsRes.data.students || []);
        setExercisesCatalog(exercisesRes.data.exercises || []);

        if (id) {
          try {
            const planRes = await apiClient.get(`/workouts/${id}`);
            const plan = planRes.data.workout || planRes.data.trainingPlan || planRes.data;
            if (plan) {
              setInfo({
                name: plan.name || 'Treino',
                startDate: plan.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
                endDate: plan.valid_until || new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
                notes: plan.instructions || '',
                releaseToStudent: plan.status === 'ativo',
                notifyExpiration: true,
                splitByWeekDay: false,
                recommendedDays: ['Segunda', 'Quarta', 'Sexta'],
                coverUrl: plan.cover_image_url || WORKOUT_COVER_PRESETS[0].url,
              });
              if (plan.student_id) setStudentId(plan.student_id);
            }
          } catch (fetchErr) {
            console.warn('Erro ao carregar treino existente:', fetchErr);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSaveWorkout = async () => {
    if (!info.name.trim()) {
      setErrorMessage('Informe o nome do treino.');
      return;
    }
    if (exercises.length === 0) {
      setErrorMessage('Adicione ao menos um exercício na ficha.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        studentId: studentId || (students[0]?.id ?? 'student-joao'),
        name: info.name,
        objective: 'Hipertrofia e Força',
        frequencyPerWeek: info.recommendedDays.length || 3,
        validUntil: info.endDate,
        instructions: info.notes,
        status: info.releaseToStudent ? 'ativo' : 'rascunho',
        coverImageUrl: info.coverUrl,
        exercises: exercises.map((ex, order) => ({
          name: ex.name,
          category: ex.category || ex.muscleGroup,
          order,
          combinationId: ex.combinationId || null,
          combinationLabel: ex.combinationLabel || null,
          plannedSets: ex.sets.length || 3,
          plannedReps: parseInt(ex.sets[0]?.reps) || 10,
          plannedLoad: parseFloat(ex.sets[0]?.load) || 0,
          loadUnit: 'kg',
          restSeconds: ex.sets[0]?.restSeconds || 60,
          observation: ex.observation || '',
          cadence: ex.cadence || '',
        })),
      };

      if (id) {
        await apiClient.put(`/training-plans/${id}`, payload);
      } else {
        await apiClient.post('/training-plans', payload);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        navigate('/treinos');
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Falha ao salvar e sincronizar o treino.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddHeader = () => {
    if (!newHeaderTitle.trim()) return;
    const newSec: WorkoutSectionHeader = {
      id: `sec-${Date.now()}`,
      title: newHeaderTitle.trim(),
      order: sections.length + 1,
      icon: newHeaderIcon,
    };
    setSections([...sections, newSec]);
    setNewHeaderTitle('');
    setShowHeaderModal(false);
  };

  const handleAddExerciseFromCatalog = (catalogItem: Exercise) => {
    const newEx: WorkoutExerciseItem = {
      id: `ex-${Date.now()}`,
      name: catalogItem.name,
      category: catalogItem.category,
      muscleGroup: catalogItem.category,
      thumbnailUrl: catalogItem.thumbnail_url || getExerciseImage(catalogItem),
      videoUrl: catalogItem.video_url,
      cadence: '3-0-1-0',
      observation: '',
      sectionId: sections[sections.length - 1]?.id,
      sets: [
        { id: 's1', setNumber: 1, reps: '10', load: '20', restSeconds: 60 },
        { id: 's2', setNumber: 2, reps: '10', load: '20', restSeconds: 60 },
        { id: 's3', setNumber: 3, reps: '10', load: '20', restSeconds: 60 },
      ],
    };
    setExercises([...exercises, newEx]);
    setShowCatalogModal(false);
  };

  const handleToggleBiSet = (index: number) => {
    if (index >= exercises.length - 1) return;
    const next = [...exercises];
    const current = next[index];
    const following = next[index + 1];

    if (current.combinationId) {
      current.combinationId = undefined;
      current.combinationLabel = undefined;
      following.combinationId = undefined;
      following.combinationLabel = undefined;
    } else {
      const comboId = `combo-${Date.now()}`;
      current.combinationId = comboId;
      current.combinationLabel = 'BI-SET';
      following.combinationId = comboId;
      following.combinationLabel = 'BI-SET';
    }
    setExercises(next);
  };

  const handleDuplicateExercise = (index: number) => {
    const target = exercises[index];
    const duplicated: WorkoutExerciseItem = {
      ...target,
      id: `ex-${Date.now()}`,
      name: `${target.name} (Cópia)`,
      sets: target.sets.map((s) => ({ ...s, id: `s-${Date.now()}-${Math.random()}` })),
    };
    const updated = [...exercises];
    updated.splice(index + 1, 0, duplicated);
    setExercises(updated);
  };

  const handleRemoveExercise = (index: number) => {
    const updated = exercises.filter((_, i) => i !== index);
    setExercises(updated);
  };

  // Volume Calculation
  const totalSets = useMemo(() => {
    return exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  }, [exercises]);

  const totalVolumeKg = useMemo(() => {
    return exercises.reduce((acc, ex) => {
      return (
        acc +
        ex.sets.reduce((sAcc, s) => {
          const load = parseFloat(s.load) || 0;
          const reps = parseInt(s.reps) || 0;
          return sAcc + load * reps;
        }, 0)
      );
    }, 0);
  }, [exercises]);

  const muscleGroupBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    exercises.forEach((ex) => {
      const group = ex.muscleGroup || ex.category || 'Outros';
      counts[group] = (counts[group] || 0) + ex.sets.length;
    });
    return Object.entries(counts).map(([group, count]) => ({ group, count }));
  }, [exercises]);

  const filteredCatalog = useMemo(() => {
    return exercisesCatalog.filter((ex) => {
      const matchesCat = catalogCategory === 'Todos' || ex.category === catalogCategory;
      const matchesSearch = !catalogSearch || ex.name.toLowerCase().includes(catalogSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [exercisesCatalog, catalogCategory, catalogSearch]);

  if (loadingInitial) return <Loader text="Carregando montador de treino..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      {/* 1. TOP HEADER (1:1 Mobile Workout Editor TopBar) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 0',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate('/treinos')}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
              {id ? 'Editar Treino' : 'Novo Treino'}
            </h1>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {info.name} • {exercises.length} exercícios
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleSaveWorkout}
            disabled={saving}
            className="btn btn-primary"
            style={{ padding: '8px 18px', fontSize: 13 }}
          >
            {saving ? (
              <span>Salvando...</span>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 size={16} />
                <span>Salvo!</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Salvar Ficha</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message Banner */}
      {errorMessage && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: 'var(--color-danger-subtle)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#F87171',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. 4-TAB NAVIGATION BAR (1:1 Mobile Tabs: Dados Gerais, Exercícios, Volume, Prévia) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-md)',
          padding: 4,
          border: '1px solid var(--border-color)',
        }}
      >
        {[
          { id: 'edit', label: 'Dados Gerais', icon: FileText },
          { id: 'exercises', label: `Exercícios (${exercises.length})`, icon: Dumbbell },
          { id: 'volume', label: 'Volume', icon: TrendingUp },
          { id: 'student-preview', label: 'Prévia Aluno', icon: Eye },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 4px',
                borderRadius: 'var(--radius-sm)',
                border: isActive ? '1px solid var(--accent-red)' : '1px solid transparent',
                backgroundColor: isActive ? 'rgba(217, 0, 0, 0.16)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DADOS GERAIS */}
      {activeTab === 'edit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Card: Capa e Nome */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Aluno da Consultoria</label>
              <select
                className="form-select"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.full_name} ({st.main_goal || 'Sem objetivo'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Nome da Ficha / Treino</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Treino A — Peito e Tríceps"
                value={info.name}
                onChange={(e) => setInfo({ ...info, name: e.target.value })}
              />
            </div>

            {/* Cover Presets */}
            <div className="form-group">
              <label className="form-label">Foto de Capa do Treino</label>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
                {WORKOUT_COVER_PRESETS.map((cov) => (
                  <div
                    key={cov.id}
                    onClick={() => setInfo({ ...info, coverUrl: cov.url })}
                    style={{
                      position: 'relative',
                      width: 120,
                      height: 70,
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: info.coverUrl === cov.url ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      flexShrink: 0,
                    }}
                  >
                    <img src={cov.url} alt={cov.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        padding: '2px 4px',
                        fontSize: 9,
                        color: 'white',
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                    >
                      {cov.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card: Validade e Dias */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Início da Vigência</label>
                <input
                  type="date"
                  className="form-input"
                  value={info.startDate}
                  onChange={(e) => setInfo({ ...info, startDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Término / Validade</label>
                <input
                  type="date"
                  className="form-input"
                  value={info.endDate}
                  onChange={(e) => setInfo({ ...info, endDate: e.target.value })}
                />
              </div>
            </div>

            {/* Recommended Days */}
            <div className="form-group">
              <label className="form-label">Dias Recomendados</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day) => {
                  const isSelected = info.recommendedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const updated = isSelected
                          ? info.recommendedDays.filter((d) => d !== day)
                          : [...info.recommendedDays, day];
                        setInfo({ ...info, recommendedDays: updated });
                      }}
                      className={`pill-filter ${isSelected ? 'active' : ''}`}
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Switches */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Liberar Acesso para o Aluno
                </span>
                <input
                  type="checkbox"
                  checked={info.releaseToStudent}
                  onChange={(e) => setInfo({ ...info, releaseToStudent: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Notificar Aluno na Expiração
                </span>
                <input
                  type="checkbox"
                  checked={info.notifyExpiration}
                  onChange={(e) => setInfo({ ...info, notifyExpiration: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
                />
              </label>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Observações Gerais do Treinador</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Ex: Aquecer 10min na esteira antes de iniciar a sessão. Manter hidratação constante."
                value={info.notes}
                onChange={(e) => setInfo({ ...info, notes: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXERCÍCIOS */}
      {activeTab === 'exercises' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Action Toolbar (1:1 Mobile Workout Toolbar) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowHeaderModal(true)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} />
                <span>Cabeçalho</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCatalogModal(true)}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} />
                <span>Adicionar Exercício</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setIsCombinationMode(!isCombinationMode)}
                className={`btn btn-sm ${isCombinationMode ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Link2 size={14} />
                <span>{isCombinationMode ? 'Concluir Bi-Set' : 'Combinar (Bi-Set)'}</span>
              </button>
            </div>
          </div>

          {/* Empty State */}
          {exercises.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                backgroundColor: 'var(--card-bg)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border-color)',
              }}
            >
              <Dumbbell size={36} color="var(--text-muted)" style={{ margin: '0 auto 10px auto' }} />
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                Nenhum exercício na ficha
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                Adicione cabeçalhos de grupos musculares e selecione exercícios da biblioteca.
              </p>
              <button
                type="button"
                onClick={() => setShowCatalogModal(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus size={14} /> Adicionar Exercício
              </button>
            </div>
          ) : (
            /* Prescribed Exercises & Sections List */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {exercises.map((ex, index) => {
                const isInBiSet = !!ex.combinationId;

                return (
                  <div
                    key={ex.id}
                    style={{
                      backgroundColor: 'var(--card-bg)',
                      border: isInBiSet ? '1px dashed var(--primary)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 18,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                      position: 'relative',
                    }}
                  >
                    {/* Bi-Set Ribbon */}
                    {isInBiSet && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -9,
                          left: 14,
                          backgroundColor: 'var(--primary)',
                          color: 'white',
                          fontSize: 9,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          letterSpacing: 0.5,
                        }}
                      >
                        {ex.combinationLabel || 'BI-SET'}
                      </div>
                    )}

                    {/* Exercise Header Row with Thumbnail Image */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            position: 'relative',
                            width: 48,
                            height: 48,
                            borderRadius: 'var(--radius-sm)',
                            overflow: 'hidden',
                            backgroundColor: '#161616',
                            border: '1px solid var(--border-color)',
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={ex.thumbnailUrl || getExerciseImage(ex)}
                            alt={ex.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300';
                            }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              bottom: 2,
                              left: 2,
                              backgroundColor: 'rgba(0, 0, 0, 0.75)',
                              color: '#FFFFFF',
                              fontSize: 9,
                              fontWeight: 800,
                              padding: '1px 4px',
                              borderRadius: 3,
                            }}
                          >
                            #{index + 1}
                          </span>
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                              {ex.name}
                            </span>
                            <span className="badge badge-neutral" style={{ fontSize: 9 }}>
                              {ex.muscleGroup}
                            </span>
                          </div>
                          {ex.cadence && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              Cadência: <strong style={{ color: 'var(--text-secondary)' }}>{ex.cadence}</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Controls: Bi-set, Duplicate, Remove */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {index < exercises.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleToggleBiSet(index)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, padding: '5px 8px' }}
                            title={isInBiSet ? 'Desfazer Bi-set' : 'Criar Bi-set'}
                          >
                            {isInBiSet ? <Unlink size={13} /> : <Link2 size={13} />}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDuplicateExercise(index)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '5px 8px' }}
                          title="Duplicar"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(index)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '5px 8px', color: 'var(--color-danger)' }}
                          title="Remover"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Sets List */}
                    <div
                      style={{
                        backgroundColor: 'var(--card-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 1fr 1fr 32px', gap: 10, fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        <span>Série</span>
                        <span>Reps</span>
                        <span>Carga (kg)</span>
                        <span>Descanso (s)</span>
                        <span></span>
                      </div>

                      {ex.sets.map((st, sIdx) => (
                        <div
                          key={st.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '48px 1fr 1fr 1fr 32px',
                            gap: 10,
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>
                            #{st.setNumber}
                          </span>
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '6px 10px', fontSize: 13, backgroundColor: 'var(--bg-primary)' }}
                            value={st.reps}
                            onChange={(e) => {
                              const updated = [...exercises];
                              updated[index].sets[sIdx].reps = e.target.value;
                              setExercises(updated);
                            }}
                          />
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '6px 10px', fontSize: 13, backgroundColor: 'var(--bg-primary)' }}
                            value={st.load}
                            onChange={(e) => {
                              const updated = [...exercises];
                              updated[index].sets[sIdx].load = e.target.value;
                              setExercises(updated);
                            }}
                          />
                          <input
                            type="number"
                            className="form-input"
                            style={{ padding: '6px 10px', fontSize: 13, backgroundColor: 'var(--bg-primary)' }}
                            value={st.restSeconds}
                            onChange={(e) => {
                              const updated = [...exercises];
                              updated[index].sets[sIdx].restSeconds = parseInt(e.target.value) || 0;
                              setExercises(updated);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (ex.sets.length <= 1) return;
                              const updated = [...exercises];
                              updated[index].sets = updated[index].sets.filter((_, i) => i !== sIdx);
                              setExercises(updated);
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Remover série"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ))}

                      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...exercises];
                            const lastSet = ex.sets[ex.sets.length - 1];
                            updated[index].sets.push({
                              id: `s-${Date.now()}`,
                              setNumber: ex.sets.length + 1,
                              reps: lastSet?.reps || '10',
                              load: lastSet?.load || '20',
                              restSeconds: lastSet?.restSeconds || 60,
                            });
                            setExercises(updated);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{
                            fontSize: 11,
                            padding: '4px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            color: 'var(--primary)',
                          }}
                        >
                          <Plus size={12} />
                          <span>Adicionar Série</span>
                        </button>
                      </div>
                    </div>

                    {/* Exercise Observation Note */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 10 }}>Observação / Técnica</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '8px 12px', fontSize: 13, backgroundColor: 'var(--bg-primary)' }}
                        placeholder="Ex: Cadência controlada na descida. Escápulas aduzidas."
                        value={ex.observation || ''}
                        onChange={(e) => {
                          const updated = [...exercises];
                          updated[index].observation = e.target.value;
                          setExercises(updated);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VOLUME */}
      {activeTab === 'volume' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
              Resumo de Volume de Carga
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ backgroundColor: 'var(--card-secondary)', padding: 14, borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Total de Séries
                </span>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', marginTop: 4 }}>
                  {totalSets}
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--card-secondary)', padding: 14, borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Tonelagem Estimada
                </span>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--primary)', marginTop: 4 }}>
                  {totalVolumeKg.toLocaleString()} kg
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
              Séries por Grupo Muscular
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {muscleGroupBreakdown.map((item) => (
                <div key={item.group}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-primary)' }}>{item.group}</span>
                    <span style={{ color: 'var(--primary)' }}>{item.count} séries</span>
                  </div>
                  <div style={{ height: 6, backgroundColor: 'var(--card-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: 'var(--primary)',
                        width: `${Math.min((item.count / totalSets) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRÉVIA DO ALUNO (1:1 Mobile Student Workout Screen Simulator) */}
      {activeTab === 'student-preview' && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: '#0D0D0E',
              borderRadius: 24,
              border: '4px solid #26262B',
              padding: '20px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
            }}
          >
            {/* Phone Header */}
            <div style={{ borderBottom: '1px solid #26262B', paddingBottom: 10 }}>
              <span className="badge badge-red" style={{ fontSize: 10 }}>
                {info.name}
              </span>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#FFFFFF', marginTop: 6 }}>
                {info.name}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {info.notes || 'Hipertrofia e Força'}
              </p>
            </div>

            {/* Exercises List in Mobile View */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
              {exercises.map((ex, idx) => (
                <div
                  key={ex.id}
                  style={{
                    padding: 12,
                    backgroundColor: '#141416',
                    borderRadius: 12,
                    border: ex.combinationId ? '1px solid var(--primary)' : '1px solid #26262B',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
                      {idx + 1}. {ex.name}
                    </span>
                    {ex.combinationId && (
                      <span className="badge badge-red" style={{ fontSize: 9 }}>
                        {ex.combinationLabel || 'BI-SET'}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                    <span><strong>{ex.sets.length}</strong> séries</span>
                    <span>•</span>
                    <span><strong>{ex.sets[0]?.reps || 10}</strong> reps</span>
                    <span>•</span>
                    <span><strong>{ex.sets[0]?.load || 0}kg</strong></span>
                  </div>
                  {ex.observation && (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                      Obs: {ex.observation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 6 }}
            >
              Iniciar Treino
            </button>
          </div>
        </div>
      )}

      {/* Modal: + Cabeçalho */}
      <Modal
        isOpen={showHeaderModal}
        onClose={() => setShowHeaderModal(false)}
        title="Adicionar Cabeçalho / Grupo"
        maxWidth={440}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Nome do Cabeçalho</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Peitoral & Tríceps"
              value={newHeaderTitle}
              onChange={(e) => setNewHeaderTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Modelos Rápidos</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SECTION_QUICK_PRESETS.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => {
                    setNewHeaderTitle(p.title);
                    setNewHeaderIcon(p.icon);
                  }}
                  className="pill-filter"
                  style={{ fontSize: 10, padding: '4px 8px' }}
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={() => setShowHeaderModal(false)}
              className="btn btn-secondary btn-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddHeader}
              className="btn btn-primary btn-sm"
            >
              Salvar Cabeçalho
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: + Exercício (Catalog Picker) */}
      <Modal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        title="Selecionar Exercício da Biblioteca"
        maxWidth={600}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder="Pesquisar exercício por nome..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
            />
          </div>

          {/* Categories */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {['Todos', 'Peito', 'Costas', 'Membros Inferiores', 'Braços', 'Ombros', 'Abs & Core', 'Cardio'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCatalogCategory(cat)}
                className={`pill-filter ${catalogCategory === cat ? 'active' : ''}`}
                style={{ fontSize: 11, padding: '4px 10px' }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Exercise Items List with Images */}
          <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredCatalog.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                Nenhum exercício encontrado.
              </div>
            ) : (
              filteredCatalog.map((item) => {
                const imgUrl = item.thumbnail_url || getExerciseImage(item);
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: 'var(--card-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          flexShrink: 0,
                          backgroundColor: '#141414',
                          border: '1px solid #282828',
                        }}
                      >
                        <img
                          src={imgUrl}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300';
                          }}
                        />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </span>
                        <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                          <span className="badge badge-neutral" style={{ fontSize: 9 }}>{item.category}</span>
                          {item.muscle_groups && item.muscle_groups.length > 0 && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {item.muscle_groups.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddExerciseFromCatalog(item)}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '6px 12px', fontSize: 11, flexShrink: 0 }}
                    >
                      <Plus size={13} />
                      <span>Selecionar</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
