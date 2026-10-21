import React, { useEffect, useState, useMemo, useRef } from 'react';
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
  Search,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Clock,
  Check,
  Share2,
  Sliders,
  Layers,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Info,
  User
} from 'lucide-react';
import { apiClient } from '../api/client';
import { StudentProfile, Exercise } from '../types';
import { Modal } from '../components/common/Modal';
import { Loader } from '../components/common/Loader';
import '../workout-editor.css';

export interface WorkoutSetDetail {
  id: string;
  setNumber: number;
  reps: string;
  load: string;
  restSeconds: number;
  notes?: string;
}

export interface WorkoutSubstitution {
  alternativeName: string;
  reason: string;
}

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
  substitutions?: WorkoutSubstitution[];
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

// Fallback images
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

  return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600';
};

const WORKOUT_COVER_PRESETS = [
  { id: 'chest', label: 'Força / Supino', url: 'https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?w=800&auto=format&fit=crop&q=60' },
  { id: 'back', label: 'Costas / Halteres', url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=60' },
  { id: 'legs', label: 'Pernas / Agachamento', url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=60' },
  { id: 'cardio', label: 'Cardio / Corrida', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=60' },
];

export const WorkoutEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const preselectedStudentId = searchParams.get('studentId') || searchParams.get('student_id') || '';

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [exercisesCatalog, setExercisesCatalog] = useState<Exercise[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  // Core Data
  const [studentId, setStudentId] = useState<string>(preselectedStudentId);
  const [info, setInfo] = useState<WorkoutGeneralInfo>({
    name: 'Treino A — Foco Hipertrofia',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
    notes: '',
    releaseToStudent: true,
    notifyExpiration: true,
    splitByWeekDay: false,
    recommendedDays: ['Segunda', 'Quarta', 'Sexta'],
    coverUrl: WORKOUT_COVER_PRESETS[0].url,
  });

  const [sections, setSections] = useState<WorkoutSectionHeader[]>([
    { id: 'sec-1', title: 'Aquecimento & Mobilidade', order: 1, icon: 'flame' },
    { id: 'sec-2', title: 'Exercícios Principais', order: 2, icon: 'shield' },
  ]);

  const [exercises, setExercises] = useState<WorkoutExerciseItem[]>([]);

  // UI Panels
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [showCatalogSidebar, setShowCatalogSidebar] = useState(true);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  // Catalog Filters
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('Todos');

  // Autosave and Change Tracking
  const [isDirty, setIsDirty] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);

  // Saving & Publishing States
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [publishedWorkout, setPublishedWorkout] = useState<any | null>(null);

  // Normalizer for accent-free search
  const normalizeText = (text: string) => {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  };

  // 1. Initial Data Load
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
                startDate: plan.start_at || plan.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
                endDate: plan.valid_until || new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
                notes: plan.notes || '',
                releaseToStudent: plan.status === 'ativo',
                notifyExpiration: true,
                splitByWeekDay: false,
                recommendedDays: ['Segunda', 'Quarta', 'Sexta'],
                coverUrl: plan.cover_image_url || WORKOUT_COVER_PRESETS[0].url,
              });
              if (plan.student_id) setStudentId(plan.student_id);

              const activeSession = plan.sessions?.[0];
              const activeVersion = activeSession?.active_version || activeSession?.versions?.[0];
              const loadedExercises = activeVersion?.exercises;
              if (Array.isArray(loadedExercises) && loadedExercises.length > 0) {
                setExercises(
                  loadedExercises.map((lex: any, idx: number) => ({
                    id: lex.id || `ex-${idx}`,
                    name: lex.name,
                    category: lex.muscle_group || 'Geral',
                    muscleGroup: lex.muscle_group || 'Geral',
                    cadence: lex.tempo || '3-0-1-0',
                    observation: lex.observation || '',
                    combinationId: lex.combination_id || undefined,
                    combinationLabel: lex.combination_label || undefined,
                    videoUrl: lex.video_url || undefined,
                    thumbnailUrl: getExerciseImage(lex),
                    sets: Array.isArray(lex.planned_set_details) && lex.planned_set_details.length > 0
                      ? lex.planned_set_details
                      : Array.from({ length: lex.planned_sets || 3 }).map((_, sIdx) => ({
                          id: `s-${sIdx + 1}`,
                          setNumber: sIdx + 1,
                          reps: String(lex.planned_reps || 10),
                          load: String(lex.planned_load || 20),
                          restSeconds: lex.rest_seconds || 60,
                        })),
                  }))
                );
              }
            }
          } catch (fetchErr) {
            console.warn('Erro ao carregar treino existente:', fetchErr);
          }
        } else {
          // Default initial exercise if brand new workout
          setExercises((prev) =>
            prev.length > 0
              ? prev
              : [
                  {
                    id: 'ex-init-1',
                    name: 'Supino Reto com Barra',
                    category: 'Peito',
                    muscleGroup: 'Peito',
                    cadence: '3-0-1-0',
                    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg',
                    observation: 'Escápulas firmes no banco. Controle na fase excêntrica.',
                    sets: [
                      { id: 's1', setNumber: 1, reps: '10', load: '30', restSeconds: 90 },
                      { id: 's2', setNumber: 2, reps: '10', load: '35', restSeconds: 90 },
                      { id: 's3', setNumber: 3, reps: '8', load: '40', restSeconds: 90 },
                    ],
                  },
                ]
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchData();
  }, [id]);

  // 2. Draft Storage Key
  const draftKey = `dragoncorp_workout_draft_${id || 'new'}`;

  // 3. Debounced Autosave to localStorage (FASE 19)
  useEffect(() => {
    if (loadingInitial) return;
    setIsDirty(true);

    const timer = setTimeout(() => {
      const draftPayload = { info, studentId, exercises, sections, updatedAt: new Date().toISOString() };
      localStorage.setItem(draftKey, JSON.stringify(draftPayload));
      setLastAutoSaveTime(new Date().toLocaleTimeString('pt-BR'));
    }, 1200);

    return () => clearTimeout(timer);
  }, [info, studentId, exercises, sections, loadingInitial, draftKey]);

  // 4. Warn beforeunload if unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // 5. Catalog Filter with Accent Insensitive Debounce
  const filteredCatalog = useMemo(() => {
    const q = normalizeText(catalogSearch);
    return exercisesCatalog.filter((ex) => {
      const matchesCat = catalogCategory === 'Todos' || ex.category === catalogCategory;
      const matchesSearch = !q || normalizeText(ex.name).includes(q) || normalizeText(ex.category).includes(q);
      return matchesCat && matchesSearch;
    });
  }, [exercisesCatalog, catalogCategory, catalogSearch]);

  // Exercise Actions
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
      sets: [
        { id: `s-${Date.now()}-1`, setNumber: 1, reps: '10', load: '20', restSeconds: 60 },
        { id: `s-${Date.now()}-2`, setNumber: 2, reps: '10', load: '20', restSeconds: 60 },
        { id: `s-${Date.now()}-3`, setNumber: 3, reps: '10', load: '20', restSeconds: 60 },
      ],
    };
    setExercises((prev) => [...prev, newEx]);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDuplicateExercise = (index: number) => {
    const target = exercises[index];
    const duplicated: WorkoutExerciseItem = {
      ...target,
      id: `ex-${Date.now()}`,
      name: `${target.name} (Cópia)`,
      sets: target.sets.map((s, idx) => ({ ...s, id: `s-${Date.now()}-${idx}` })),
    };
    const updated = [...exercises];
    updated.splice(index + 1, 0, duplicated);
    setExercises(updated);
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= exercises.length) return;
    const updated = [...exercises];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setExercises(updated);
  };

  // Series Spreadsheet Actions (FASE 13 & 14)
  const handleAddSet = (exerciseIndex: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const target = next[exerciseIndex];
      const lastSet = target.sets[target.sets.length - 1];
      const newSet: WorkoutSetDetail = {
        id: `s-${Date.now()}`,
        setNumber: target.sets.length + 1,
        reps: lastSet ? lastSet.reps : '10',
        load: lastSet ? lastSet.load : '20',
        restSeconds: lastSet ? lastSet.restSeconds : 60,
      };
      target.sets = [...target.sets, newSet];
      return next;
    });
  };

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const target = next[exerciseIndex];
      if (target.sets.length <= 1) return prev; // Keep at least 1 set
      target.sets = target.sets.filter((_, i) => i !== setIndex).map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      return next;
    });
  };

  const handleUpdateSetField = (exerciseIndex: number, setIndex: number, field: keyof WorkoutSetDetail, value: any) => {
    setExercises((prev) => {
      const next = [...prev];
      const target = next[exerciseIndex];
      target.sets = target.sets.map((s, i) => i === setIndex ? { ...s, [field]: value } : s);
      return next;
    });
  };

  const handleReplicateSetOneToAll = (exerciseIndex: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const target = next[exerciseIndex];
      if (!target.sets.length) return prev;
      const firstSet = target.sets[0];
      target.sets = target.sets.map((s) => ({
        ...s,
        load: firstSet.load,
        reps: firstSet.reps,
        restSeconds: firstSet.restSeconds,
      }));
      return next;
    });
  };

  // Bi-set / Tri-set Actions (FASE 15)
  const handleToggleBiSet = (index: number) => {
    if (index >= exercises.length - 1) return;
    const next = [...exercises];
    const current = next[index];
    const following = next[index + 1];

    if (current.combinationId) {
      // Unlink
      current.combinationId = undefined;
      current.combinationLabel = undefined;
      following.combinationId = undefined;
      following.combinationLabel = undefined;
    } else {
      // Link as BI-SET
      const comboId = `combo-${Date.now()}`;
      current.combinationId = comboId;
      current.combinationLabel = 'BI-SET';
      following.combinationId = comboId;
      following.combinationLabel = 'BI-SET';
    }
    setExercises(next);
  };

  // Pre-publication Validation (FASE 21)
  const validateWorkout = (): boolean => {
    const errors: string[] = [];
    if (!studentId) {
      errors.push('Selecione o aluno destinatário deste treino.');
    }
    if (!info.name.trim() || info.name.trim().length < 3) {
      errors.push('Informe um nome com pelo menos 3 caracteres para o treino.');
    }
    if (exercises.length === 0) {
      errors.push('Adicione ao menos um exercício à ficha de musculação.');
    }
    exercises.forEach((ex, i) => {
      if (!ex.sets || ex.sets.length === 0) {
        errors.push(`O exercício ${i + 1} (${ex.name}) precisa de pelo menos uma série.`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Save as Draft or Publish
  const handleSave = async (status: 'ativo' | 'rascunho') => {
    if (!validateWorkout()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (status === 'ativo') {
      setPublishing(true);
    } else {
      setSaving(true);
    }
    setErrorMessage(null);

    try {
      const sessionExercises = exercises.map((ex, order) => ({
        name: ex.name,
        muscleGroup: ex.category || ex.muscleGroup || 'Peito',
        order: order + 1,
        combinationId: ex.combinationId || null,
        combinationLabel: ex.combinationLabel || null,
        plannedSets: ex.sets.length || 3,
        plannedSetDetails: ex.sets,
        plannedReps: parseInt(ex.sets[0]?.reps) || 10,
        plannedLoad: parseFloat(ex.sets[0]?.load) || 0,
        loadUnit: 'kg',
        restSeconds: ex.sets[0]?.restSeconds || 60,
        observation: ex.observation || '',
        videoUrl: ex.videoUrl || null,
      }));

      const payload = {
        studentId: studentId,
        name: info.name.trim(),
        objective: 'Hipertrofia e Força',
        frequencyPerWeek: info.recommendedDays.length || 3,
        validUntil: info.endDate,
        notes: info.notes,
        status: status,
        coverImageUrl: info.coverUrl,
        sessions: [
          {
            name: info.name || 'Sessão Principal',
            identifier: 'Treino A',
            objective: 'Hipertrofia e Força',
            level: 'intermediario',
            exercises: sessionExercises,
          },
        ],
        exercises: sessionExercises,
      };

      let res;
      if (id) {
        res = await apiClient.put(`/workouts/${id}`, payload);
      } else {
        res = await apiClient.post('/workouts', payload);
      }

      // Clear local draft upon confirmed save
      localStorage.removeItem(draftKey);
      setIsDirty(false);

      if (status === 'ativo') {
        setPublishedWorkout(res.data.workout || payload);
      } else {
        alert('Rascunho de treino salvo com sucesso!');
        navigate('/treinos');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Falha ao salvar o treino. Verifique os campos e tente novamente.');
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const handleBackWithCheck = () => {
    if (isDirty) {
      const confirmLeave = window.confirm('Você possui alterações não salvas. Deseja realmente sair do montador de treino?');
      if (!confirmLeave) return;
    }
    navigate('/treinos');
  };

  if (loadingInitial) return <Loader text="Carregando montador de treino profissional..." />;

  const selectedStudentObj = students.find((s) => s.id === studentId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', minHeight: '100vh', paddingBottom: 60 }}>
      {/* 1. FIXED COMPACT STICKY HEADER (FASE 10) */}
      <div className="workout-sticky-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button
            type="button"
            onClick={handleBackWithCheck}
            className="admin-btn admin-btn-secondary"
            style={{ padding: '6px 10px' }}
            title="Voltar para a lista de treinos"
          >
            <ArrowLeft size={15} />
          </button>

          <div>
            <input
              type="text"
              value={info.name}
              onChange={(e) => setInfo({ ...info, name: e.target.value })}
              className="workout-header-title-input"
              placeholder="Nome da ficha de treino..."
              title="Clique para editar o nome da ficha"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#A1A1AA', paddingLeft: 8 }}>
              <span>{exercises.length} exercícios adicionados</span>
              <span>•</span>
              {lastAutoSaveTime ? (
                <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={11} /> Salvo auto às {lastAutoSaveTime}
                </span>
              ) : (
                <span>Rascunho local ativo</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Mobile Preview Toggle */}
          <button
            type="button"
            onClick={() => setShowMobilePreview(!showMobilePreview)}
            className="admin-btn admin-btn-secondary"
            style={{ 
              borderColor: showMobilePreview ? '#D90000' : '#2C2C2C',
              color: showMobilePreview ? '#FFFFFF' : '#A1A1AA',
              backgroundColor: showMobilePreview ? 'rgba(217, 0, 0, 0.15)' : '#1E1E1E'
            }}
          >
            <Smartphone size={14} color={showMobilePreview ? '#D90000' : 'currentColor'} />
            <span>Prévia Mobile</span>
          </button>

          {/* Toggle Catalog in desktop */}
          <button
            type="button"
            onClick={() => setShowCatalogSidebar(!showCatalogSidebar)}
            className="admin-btn admin-btn-secondary"
            title="Ocultar/Exibir Biblioteca de Exercícios"
          >
            <Dumbbell size={14} />
            <span>Biblioteca</span>
          </button>

          {/* Save Draft */}
          <button
            type="button"
            onClick={() => handleSave('rascunho')}
            disabled={saving || publishing}
            className="admin-btn admin-btn-secondary"
          >
            <Save size={14} />
            <span>{saving ? 'Gravando...' : 'Salvar Rascunho'}</span>
          </button>

          {/* Publish Main CTA */}
          <button
            type="button"
            onClick={() => handleSave('ativo')}
            disabled={saving || publishing}
            className="admin-btn admin-btn-primary"
            style={{ padding: '8px 20px', fontWeight: 800 }}
          >
            <CheckCircle2 size={15} />
            <span>{publishing ? 'Publicando...' : 'Publicar Treino'}</span>
          </button>
        </div>
      </div>

      {/* Validation Errors Notice (FASE 21) */}
      {validationErrors.length > 0 && (
        <div style={{ 
          backgroundColor: 'rgba(239, 68, 68, 0.12)', 
          border: '1px solid #EF4444', 
          borderRadius: 8, 
          padding: 14, 
          color: '#FCA5A5',
          fontSize: 12.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <AlertCircle size={16} color="#EF4444" />
            <span>Pendências para publicação do treino:</span>
          </div>
          <ul style={{ paddingLeft: 24, margin: 0 }}>
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {errorMessage && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: 8, padding: 14, color: '#FCA5A5', fontSize: 13 }}>
          {errorMessage}
        </div>
      )}

      {/* 2. TOP CONTEXT BAR: Student Selector & Expiration Dates (FASE 11) */}
      <div className="admin-card" style={{ padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'center' }}>
          {/* Student Selector */}
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#A1A1AA', marginBottom: 4, textTransform: 'uppercase' }}>
              Aluno Destinatário <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="admin-filter-select"
              style={{ width: '100%', borderColor: !studentId ? '#EF4444' : '#2C2C2C' }}
            >
              <option value="">Selecione o aluno...</option>
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.full_name} ({st.main_goal || 'Consultoria'})
                </option>
              ))}
            </select>
          </div>

          {/* Valid until date */}
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#A1A1AA', marginBottom: 4, textTransform: 'uppercase' }}>
              Validade da Ficha
            </label>
            <input
              type="date"
              value={info.endDate}
              onChange={(e) => setInfo({ ...info, endDate: e.target.value })}
              className="admin-filter-input"
              style={{ width: '100%' }}
            />
          </div>

          {/* Days per week */}
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#A1A1AA', marginBottom: 4, textTransform: 'uppercase' }}>
              Frequência Semanal
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => {
                const isSelected = info.recommendedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      const next = isSelected 
                        ? info.recommendedDays.filter((d) => d !== day)
                        : [...info.recommendedDays, day];
                      setInfo({ ...info, recommendedDays: next });
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 2px',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 4,
                      border: isSelected ? '1px solid #D90000' : '1px solid #282828',
                      backgroundColor: isSelected ? 'rgba(217, 0, 0, 0.2)' : '#1E1E1E',
                      color: isSelected ? '#FFFFFF' : '#71717A',
                      cursor: 'pointer'
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* General Notes */}
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#A1A1AA', marginBottom: 4, textTransform: 'uppercase' }}>
              Orientações Gerais do Treino
            </label>
            <input
              type="text"
              placeholder="Ex: Aquecer 5min no elíptico antes de iniciar..."
              value={info.notes}
              onChange={(e) => setInfo({ ...info, notes: e.target.value })}
              className="admin-filter-input"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* 3. WORKSPACE 3-AREA LAYOUT (FASE 9) */}
      <div className="workout-workspace-grid">
        {/* AREA 2: EXERCISE CATALOG SIDEBAR (FASE 12) */}
        {showCatalogSidebar && (
          <div className="workout-catalog-sidebar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Dumbbell size={16} color="#D90000" />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF' }}>Biblioteca de Exercícios</span>
              </div>
              <span style={{ fontSize: 11, color: '#71717A' }}>{filteredCatalog.length} itens</span>
            </div>

            {/* Catalog Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#71717A' }} />
              <input
                type="text"
                placeholder="Buscar (sem acentos)..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="admin-filter-input"
                style={{ width: '100%', paddingLeft: 32, fontSize: 12, height: 34 }}
              />
            </div>

            {/* Muscle Group Chips */}
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
              {['Todos', 'Peito', 'Costas', 'Pernas', 'Braços', 'Ombros', 'Core'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatalogCategory(cat)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 10.5,
                    fontWeight: 700,
                    border: catalogCategory === cat ? '1px solid #D90000' : '1px solid #282828',
                    backgroundColor: catalogCategory === cat ? '#D90000' : '#1C1C1C',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Exercises List */}
            <div className="workout-catalog-list">
              {filteredCatalog.length === 0 ? (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: '#71717A', fontSize: 12 }}>
                  Nenhum exercício encontrado.
                </div>
              ) : (
                filteredCatalog.slice(0, 40).map((exItem) => (
                  <div
                    key={exItem.id}
                    className="workout-catalog-item"
                    onClick={() => handleAddExerciseFromCatalog(exItem)}
                    title="Clique para adicionar imediatamente à ficha"
                  >
                    <img
                      src={exItem.thumbnail_url || getExerciseImage(exItem)}
                      alt={exItem.name}
                      style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover', backgroundColor: '#000' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exItem.name}
                      </div>
                      <div style={{ fontSize: 10.5, color: '#A1A1AA' }}>{exItem.category}</div>
                    </div>
                    <button
                      type="button"
                      style={{
                        backgroundColor: '#D90000',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 4,
                        width: 26,
                        height: 26,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                      title="Adicionar à ficha"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* AREA 3: PRESCRIPTION WORKSPACE (FASE 13 & 14) */}
        <div className="workout-prescription-area">
          {exercises.length === 0 ? (
            <div className="admin-card" style={{ padding: 40, textAlign: 'center' }}>
              <Dumbbell size={40} color="#71717A" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 16, color: '#FFFFFF', marginBottom: 6 }}>Nenhum exercício na ficha ainda</h3>
              <p style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 16 }}>
                Selecione exercícios na biblioteca lateral para compor a ficha de treino do aluno.
              </p>
            </div>
          ) : (
            exercises.map((ex, exIndex) => {
              const isBiSet = Boolean(ex.combinationId);
              return (
                <div
                  key={ex.id}
                  className={`workout-exercise-card ${isBiSet ? 'workout-biset-group' : ''}`}
                >
                  {/* Exercise Top Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: '50%', 
                        backgroundColor: '#1E1E1E', 
                        color: '#D90000', 
                        fontSize: 12, 
                        fontWeight: 800, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        {exIndex + 1}
                      </span>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>{ex.name}</h4>
                          {isBiSet && (
                            <span className="workout-biset-chip">
                              <Link2 size={10} /> {ex.combinationLabel || 'BI-SET'}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: '#71717A' }}>
                          {ex.category} • {ex.sets.length} séries planejadas
                        </span>
                      </div>
                    </div>

                    {/* Top Action Pills */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {/* Move Up/Down */}
                      <button
                        type="button"
                        onClick={() => handleMoveExercise(exIndex, 'up')}
                        disabled={exIndex === 0}
                        className="quick-pill-btn"
                        title="Mover para cima"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveExercise(exIndex, 'down')}
                        disabled={exIndex === exercises.length - 1}
                        className="quick-pill-btn"
                        title="Mover para baixo"
                      >
                        <ArrowDown size={12} />
                      </button>

                      {/* Bi-Set Conjugate Toggle */}
                      {exIndex < exercises.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleToggleBiSet(exIndex)}
                          className="quick-pill-btn"
                          style={{ color: isBiSet ? '#EF4444' : '#FFFFFF' }}
                          title="Agrupar com o próximo exercício em Bi-set"
                        >
                          {isBiSet ? <Unlink size={12} /> : <Link2 size={12} />}
                          <span>{isBiSet ? 'Desagrupar' : 'Bi-Set'}</span>
                        </button>
                      )}

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => handleDuplicateExercise(exIndex)}
                        className="quick-pill-btn"
                        title="Duplicar este exercício"
                      >
                        <Copy size={12} />
                      </button>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(exIndex)}
                        className="quick-pill-btn"
                        style={{ color: '#EF4444' }}
                        title="Remover exercício da ficha"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* SERIES SPREADSHEET TABLE (FASE 13 & 14) */}
                  <div className="series-table-container">
                    <table className="series-table">
                      <thead>
                        <tr>
                          <th style={{ width: 50 }}>Série</th>
                          <th style={{ width: 90 }}>Carga (kg)</th>
                          <th style={{ width: 90 }}>Reps</th>
                          <th style={{ width: 90 }}>Descanso</th>
                          <th>Observação / Variação da Série</th>
                          <th style={{ width: 40, textAlign: 'right' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {ex.sets.map((s, sIdx) => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 700, color: '#A1A1AA' }}>
                              #{s.setNumber}
                            </td>
                            <td>
                              <input
                                type="text"
                                value={s.load}
                                onChange={(e) => handleUpdateSetField(exIndex, sIdx, 'load', e.target.value)}
                                className="series-input-small"
                                placeholder="0"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={s.reps}
                                onChange={(e) => handleUpdateSetField(exIndex, sIdx, 'reps', e.target.value)}
                                className="series-input-small"
                                placeholder="10"
                              />
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input
                                  type="number"
                                  value={s.restSeconds}
                                  onChange={(e) => handleUpdateSetField(exIndex, sIdx, 'restSeconds', parseInt(e.target.value, 10) || 60)}
                                  className="series-input-small"
                                  style={{ width: 52 }}
                                />
                                <span style={{ fontSize: 10, color: '#71717A' }}>s</span>
                              </div>
                            </td>
                            <td>
                              <input
                                type="text"
                                value={s.notes || ''}
                                onChange={(e) => handleUpdateSetField(exIndex, sIdx, 'notes', e.target.value)}
                                placeholder="Ex: drop-set na última repetição..."
                                style={{
                                  width: '100%',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  color: '#D4D4D8',
                                  fontSize: 12,
                                  outline: 'none'
                                }}
                              />
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveSet(exIndex, sIdx)}
                                style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', padding: 2 }}
                                title="Excluir série"
                              >
                                <X size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Fast Action Buttons for Sets */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleAddSet(exIndex)}
                        className="quick-pill-btn"
                        style={{ color: '#FFFFFF', backgroundColor: '#222222' }}
                      >
                        <Plus size={12} />
                        <span>Adicionar Série</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReplicateSetOneToAll(exIndex)}
                        className="quick-pill-btn"
                        title="Copia os valores da série 1 para todas as séries deste exercício"
                      >
                        <Copy size={12} />
                        <span>Replicar Série 1 para Todas</span>
                      </button>
                    </div>

                    <div style={{ fontSize: 11, color: '#71717A' }}>
                      Cadência sugerida: <code style={{ color: '#D90000' }}>{ex.cadence || '3-0-1-0'}</code>
                    </div>
                  </div>

                  {/* General Exercise Observation */}
                  <div>
                    <input
                      type="text"
                      placeholder="Instrução técnica para o aluno (ex: não estender totalmente os cotovelos)..."
                      value={ex.observation || ''}
                      onChange={(e) => {
                        const next = [...exercises];
                        next[exIndex].observation = e.target.value;
                        setExercises(next);
                      }}
                      className="admin-filter-input"
                      style={{ width: '100%', fontSize: 12 }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. REAL-TIME MOBILE PREVIEW DRAWER (FASE 20) */}
      {showMobilePreview && (
        <div className="mobile-simulator-drawer">
          <div className="mobile-simulator-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Smartphone size={16} color="#D90000" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>Visão Real do Aluno (Mobile)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowMobilePreview(false)}
              style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          <div className="mobile-simulator-screen">
            {/* Mobile Header Mockup */}
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: 8, padding: 12, border: '1px solid #282828' }}>
              <div style={{ fontSize: 10, color: '#D90000', fontWeight: 800, textTransform: 'uppercase' }}>
                Treino Vigente
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', marginTop: 2 }}>
                {info.name}
              </div>
              <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 2 }}>
                Aluno: {selectedStudentObj?.full_name || 'Aluno'} • {exercises.length} exercícios
              </div>
            </div>

            {/* Mobile Exercises Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {exercises.map((ex, idx) => (
                <div
                  key={ex.id}
                  style={{
                    backgroundColor: '#161616',
                    border: ex.combinationId ? '1px solid #D90000' : '1px solid #242424',
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img
                      src={ex.thumbnailUrl}
                      alt={ex.name}
                      style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {idx + 1}. {ex.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#A1A1AA' }}>
                        {ex.sets.length} séries • Descanso {ex.sets[0]?.restSeconds || 60}s
                      </div>
                    </div>
                  </div>

                  {/* Sets Pills */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                    {ex.sets.map((s) => (
                      <span
                        key={s.id}
                        style={{
                          backgroundColor: '#222222',
                          color: '#FFFFFF',
                          fontSize: 9.5,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4
                        }}
                      >
                        {s.reps} reps @ {s.load}kg
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. SUCCESS CELEBRATION MODAL (FASE 22) */}
      {publishedWorkout && (
        <div className="admin-modal-overlay" style={{ zIndex: 1200 }}>
          <div className="admin-modal-card" style={{ maxWidth: 520, textAlign: 'center', padding: 28 }}>
            <div style={{ 
              width: 52, 
              height: 52, 
              borderRadius: '50%', 
              backgroundColor: 'rgba(16, 185, 129, 0.15)', 
              color: '#10B981',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={28} />
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', marginBottom: 6 }}>
              Treino Publicado com Sucesso!
            </h3>
            <p style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.5, marginBottom: 20 }}>
              A ficha <strong>{info.name}</strong> foi liberada e já está sincronizada em tempo real com o aplicativo mobile do aluno.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setPublishedWorkout(null);
                  setShowMobilePreview(true);
                }}
                className="admin-btn admin-btn-secondary"
                style={{ justifyContent: 'center' }}
              >
                <Smartphone size={14} />
                <span>Ver no Mobile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPublishedWorkout(null);
                  navigate(`/alunos/${studentId}`);
                }}
                className="admin-btn admin-btn-secondary"
                style={{ justifyContent: 'center' }}
              >
                <User size={14} />
                <span>Abrir Perfil do Aluno</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPublishedWorkout(null);
                  navigate('/treinos');
                }}
                className="admin-btn admin-btn-primary"
                style={{ gridColumn: 'span 2', justifyContent: 'center' }}
              >
                <span>Voltar à Lista de Treinos</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
