import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  Dumbbell,
  Copy,
  Link2,
  Unlink,
  GripVertical,
  Sidebar as SidebarIcon,
  Sparkles,
  Command,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { StudentProfile, Exercise } from '../types';
import { Modal } from '../components/common/Modal';
import { Loader } from '../components/common/Loader';

interface PrescribedExerciseState {
  tempId: string;
  exerciseCatalogId?: string;
  name: string;
  muscleGroup: string;
  combinationId?: string;
  combinationLabel?: string;
  plannedSets: number;
  plannedReps: number;
  plannedLoad: number;
  loadUnit: string;
  restSeconds: number;
  observation?: string;
  unilateral: boolean;
  warmupSet: boolean;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  exercises: Array<{
    name: string;
    muscleGroup: string;
    plannedSets: number;
    plannedReps: number;
    plannedLoad: number;
    restSeconds: number;
    observation?: string;
    combinationId?: string;
    combinationLabel?: string;
  }>;
}

const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'tpl-abc-peito',
    name: 'Treino A — Peito, Ombros e Tríceps',
    category: 'Hipertrofia / ABC',
    description: 'Foco em cadeia anterior: peitoral completo, deltoide lateral e tríceps com Bi-set final.',
    exercises: [
      { name: 'Supino Reto com Barra', muscleGroup: 'Peito', plannedSets: 4, plannedReps: 8, plannedLoad: 30, restSeconds: 90, observation: 'Cadência 3-0-1-0. Controle a descida.' },
      { name: 'Supino Inclinado com Halteres', muscleGroup: 'Peito', plannedSets: 4, plannedReps: 10, plannedLoad: 22, restSeconds: 60, observation: 'Alongamento completo no ponto de transição.' },
      { name: 'Crucifixo Máquina', muscleGroup: 'Peito', plannedSets: 3, plannedReps: 12, plannedLoad: 45, restSeconds: 45, observation: 'Pausa isométrica de 1s no pico de contração.' },
      { name: 'Elevação Lateral com Halteres', muscleGroup: 'Ombros', plannedSets: 4, plannedReps: 12, plannedLoad: 10, restSeconds: 45, observation: 'Cotovelos levemente flexionados.' },
      { name: 'Tríceps Pulley Barra Reta', muscleGroup: 'Braços', plannedSets: 3, plannedReps: 10, plannedLoad: 25, restSeconds: 0, observation: 'Bi-set com corda', combinationId: 'biset-triceps', combinationLabel: 'BI-SET' },
      { name: 'Tríceps Corda na Polia', muscleGroup: 'Braços', plannedSets: 3, plannedReps: 12, plannedLoad: 15, restSeconds: 60, observation: 'Abrir a corda no final do movimento', combinationId: 'biset-triceps', combinationLabel: 'BI-SET' },
    ],
  },
  {
    id: 'tpl-abc-costas',
    name: 'Treino B — Costas, Posterior de Ombro e Bíceps',
    category: 'Hipertrofia / ABC',
    description: 'Puxadas verticais, remadas horizontais e bíceps completo.',
    exercises: [
      { name: 'Puxada Frontal na Polia', muscleGroup: 'Costas', plannedSets: 4, plannedReps: 10, plannedLoad: 50, restSeconds: 60, observation: 'Foco na depressão e adução das escápulas.' },
      { name: 'Remada Curvada com Barra', muscleGroup: 'Costas', plannedSets: 4, plannedReps: 8, plannedLoad: 25, restSeconds: 90, observation: 'Tronco firme a 45 graus.' },
      { name: 'Remada Baixa no Triângulo', muscleGroup: 'Costas', plannedSets: 3, plannedReps: 12, plannedLoad: 45, restSeconds: 60, observation: 'Alongar bem as dorsais na fase excêntrica.' },
      { name: 'Crucifixo Inverso no Peck Deck', muscleGroup: 'Ombros', plannedSets: 3, plannedReps: 12, plannedLoad: 30, restSeconds: 45, observation: 'Isolamento de deltoide posterior.' },
      { name: 'Rosca Direta com Barra W', muscleGroup: 'Braços', plannedSets: 4, plannedReps: 10, plannedLoad: 12, restSeconds: 60, observation: 'Sem balanço do tronco.' },
      { name: 'Rosca Martelo com Halteres', muscleGroup: 'Braços', plannedSets: 3, plannedReps: 12, plannedLoad: 12, restSeconds: 45, observation: 'Foco em braquiorradial e braquial.' },
    ],
  },
  {
    id: 'tpl-abc-pernas',
    name: 'Treino C — Membros Inferiores Completo',
    category: 'Membros Inferiores',
    description: 'Quadríceps, isquiotibiais, glúteos e panturrilhas em alto rendimento.',
    exercises: [
      { name: 'Agachamento Livre com Barra', muscleGroup: 'Membros Inferiores', plannedSets: 4, plannedReps: 8, plannedLoad: 40, restSeconds: 90, observation: 'Profundidade paralela ou além. Manter postura.' },
      { name: 'Leg Press 45º', muscleGroup: 'Membros Inferiores', plannedSets: 4, plannedReps: 10, plannedLoad: 140, restSeconds: 75, observation: 'Pés na largura dos ombros no meio da plataforma.' },
      { name: 'Cadeira Extensora', muscleGroup: 'Membros Inferiores', plannedSets: 3, plannedReps: 12, plannedLoad: 50, restSeconds: 45, observation: 'Pausa de 1s na contração máxima.' },
      { name: 'Mesa Flexora', muscleGroup: 'Membros Inferiores', plannedSets: 4, plannedReps: 10, plannedLoad: 35, restSeconds: 60, observation: 'Quadril pressionado contra o banco.' },
      { name: 'Gêmeos em Pé no Degrau', muscleGroup: 'Membros Inferiores', plannedSets: 4, plannedReps: 15, plannedLoad: 20, restSeconds: 45, observation: 'Amplitude máxima de subida e descida.' },
    ],
  },
  {
    id: 'tpl-full-body-iniciante',
    name: 'Hipertrofia Iniciante — Full Body',
    category: 'Adaptação e Base',
    description: 'Estrutura fundamental de grandes grupos para adesão e rápida progressão motora.',
    exercises: [
      { name: 'Leg Press 45º', muscleGroup: 'Membros Inferiores', plannedSets: 3, plannedReps: 12, plannedLoad: 60, restSeconds: 60, observation: 'Foco na biomecânica e respiração.' },
      { name: 'Puxada Frontal na Polia', muscleGroup: 'Costas', plannedSets: 3, plannedReps: 12, plannedLoad: 30, restSeconds: 60, observation: 'Puxar até o nível do queixo/peito superior.' },
      { name: 'Supino Máquina Articulado', muscleGroup: 'Peito', plannedSets: 3, plannedReps: 12, plannedLoad: 25, restSeconds: 60, observation: 'Confortável e seguro para ombros.' },
      { name: 'Elevação Lateral com Halteres', muscleGroup: 'Ombros', plannedSets: 3, plannedReps: 12, plannedLoad: 6, restSeconds: 45, observation: 'Carga moderada.' },
      { name: 'Prancha Abdominal Isométrica', muscleGroup: 'Abs & Core', plannedSets: 3, plannedReps: 30, plannedLoad: 0, restSeconds: 45, observation: 'Segurar por 30 segundos mantendo abdômen contraído.' },
    ],
  },
];

export const WorkoutEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const preselectedStudentId = searchParams.get('studentId') || '';

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [exercisesCatalog, setExercisesCatalog] = useState<Exercise[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  // Form State
  const [studentId, setStudentId] = useState<string>(preselectedStudentId);
  const [workoutName, setWorkoutName] = useState<string>('Treino A — Peito e Tríceps');
  const [objective, setObjective] = useState<string>('Hipertrofia e Força');
  const [notes, setNotes] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>('');
  const [frequencyPerWeek, setFrequencyPerWeek] = useState<number>(4);

  // Prescribed Exercises in current session
  const [exercises, setExercises] = useState<PrescribedExerciseState[]>([]);

  // Drag & Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Unsaved Changes Tracking
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Two-column layout mode for wide desktop
  const [showSideCatalog, setShowSideCatalog] = useState<boolean>(true);
  const [sideCatalogSearch, setSideCatalogSearch] = useState<string>('');
  const [sideCatalogCategory, setSideCatalogCategory] = useState<string>('Todos');

  // Exercise Picker Modal State (for standard or mobile-web)
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [pickerCategory, setPickerCategory] = useState<string>('Todos');

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);

  // Saving State
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ref to track latest state for shortcut
  const handleSaveWorkoutRef = useRef<() => void>(() => {});

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
          const workoutRes = await apiClient.get(`/workouts/${id}`);
          const w = workoutRes.data.workout;
          setStudentId(w.student_id);
          setWorkoutName(w.name);
          setObjective(w.objective);
          setNotes(w.notes || '');
          setValidUntil(w.valid_until || '');
          setFrequencyPerWeek(w.frequency_per_week || 4);

          const firstSession = w.sessions?.[0];
          const activeVersion = firstSession?.active_version;
          if (activeVersion?.exercises) {
            setExercises(
              activeVersion.exercises.map((e: any) => ({
                tempId: 'ex-' + Math.random().toString(36).substring(2, 9),
                exerciseCatalogId: e.exercise_catalog_id,
                name: e.name,
                muscleGroup: e.muscle_group,
                combinationId: e.combination_id,
                combinationLabel: e.combination_label,
                plannedSets: e.planned_sets || 4,
                plannedReps: e.planned_reps || 10,
                plannedLoad: e.planned_load || 0,
                loadUnit: e.load_unit || 'kg',
                restSeconds: e.rest_seconds || 60,
                observation: e.observation || '',
                unilateral: !!e.unilateral,
                warmupSet: !!e.warmup_set,
              }))
            );
          }
        } else {
          if (studentsRes.data.students?.length > 0 && !preselectedStudentId) {
            setStudentId(studentsRes.data.students[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchData();
  }, [id, preselectedStudentId]);

  // Prevent accidental navigation when dirty
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

  // Keyboard Shortcuts (Ctrl+S / Cmd+S to save, Ctrl+D / Cmd+D to duplicate, Esc to close modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveWorkoutRef.current();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (exercises.length > 0) {
          handleDuplicateExercise(exercises.length - 1);
        }
      } else if (e.key === 'Escape') {
        setIsPickerOpen(false);
        setIsTemplateModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exercises]);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleAddExerciseFromCatalog = (catalogItem: Exercise) => {
    const newPrescription: PrescribedExerciseState = {
      tempId: 'ex-' + Math.random().toString(36).substring(2, 9),
      exerciseCatalogId: catalogItem.id,
      name: catalogItem.name,
      muscleGroup: catalogItem.category,
      plannedSets: 4,
      plannedReps: 10,
      plannedLoad: 20,
      loadUnit: 'kg',
      restSeconds: 60,
      observation: '',
      unilateral: false,
      warmupSet: false,
    };
    setExercises((prev) => [...prev, newPrescription]);
    setIsPickerOpen(false);
    markDirty();
  };

  const handleApplyTemplate = (tpl: WorkoutTemplate) => {
    setWorkoutName(tpl.name);
    setObjective(tpl.category);
    setNotes(tpl.description);

    const mapped = tpl.exercises.map((e) => ({
      tempId: 'ex-' + Math.random().toString(36).substring(2, 9),
      name: e.name,
      muscleGroup: e.muscleGroup,
      plannedSets: e.plannedSets,
      plannedReps: e.plannedReps,
      plannedLoad: e.plannedLoad,
      loadUnit: 'kg',
      restSeconds: e.restSeconds,
      observation: e.observation || '',
      combinationId: e.combinationId,
      combinationLabel: e.combinationLabel,
      unilateral: false,
      warmupSet: false,
    }));

    setExercises(mapped);
    setIsTemplateModalOpen(false);
    markDirty();
  };

  const handleRemoveExercise = (index: number) => {
    const updated = [...exercises];
    updated.splice(index, 1);
    setExercises(updated);
    markDirty();
  };

  const handleDuplicateExercise = (index: number) => {
    const orig = exercises[index];
    const copy: PrescribedExerciseState = {
      ...orig,
      tempId: 'ex-' + Math.random().toString(36).substring(2, 9),
      name: orig.name + ' (Variação)',
    };
    const updated = [...exercises];
    updated.splice(index + 1, 0, copy);
    setExercises(updated);
    markDirty();
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...exercises];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setExercises(updated);
    markDirty();
  };

  const handleMoveDown = (index: number) => {
    if (index === exercises.length - 1) return;
    const updated = [...exercises];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setExercises(updated);
    markDirty();
  };

  // Native HTML5 Drag and Drop Reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const updated = [...exercises];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setExercises(updated);
    setDraggedIndex(null);
    markDirty();
  };

  const handleToggleBiSet = (index: number) => {
    if (index >= exercises.length - 1) {
      alert('Para criar um Bi-set, selecione um exercício que possua outro logo em seguida.');
      return;
    }
    const current = exercises[index];
    const next = exercises[index + 1];

    const updated = [...exercises];
    if (current.combinationId && current.combinationId === next.combinationId) {
      // Desagrupar
      updated[index].combinationId = undefined;
      updated[index].combinationLabel = undefined;
      updated[index + 1].combinationId = undefined;
      updated[index + 1].combinationLabel = undefined;
    } else {
      // Agrupar em Bi-set
      const combId = 'biset-' + Math.random().toString(36).substring(2, 7);
      updated[index].combinationId = combId;
      updated[index].combinationLabel = 'BI-SET';
      updated[index].restSeconds = 0; // sem descanso intermediário
      updated[index + 1].combinationId = combId;
      updated[index + 1].combinationLabel = 'BI-SET';
    }
    setExercises(updated);
    markDirty();
  };

  const updateExerciseField = (index: number, field: keyof PrescribedExerciseState, value: any) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
    markDirty();
  };

  const handleSaveWorkout = async () => {
    setErrorMessage(null);

    if (!studentId) {
      setErrorMessage('Selecione um aluno para este treino.');
      return;
    }
    if (!workoutName.trim()) {
      setErrorMessage('Informe o nome do treino.');
      return;
    }
    if (exercises.length === 0) {
      setErrorMessage('Adicione pelo menos um exercício ao treino.');
      return;
    }

    setSaving(true);

    const payload = {
      studentId,
      name: workoutName,
      objective,
      notes,
      validUntil: validUntil || null,
      frequencyPerWeek,
      sessions: [
        {
          name: workoutName,
          identifier: 'Treino A',
          objective,
          muscleGroups: Array.from(new Set(exercises.map((e) => e.muscleGroup))),
          exercises: exercises.map((e) => ({
            name: e.name,
            exerciseCatalogId: e.exerciseCatalogId,
            muscleGroup: e.muscleGroup,
            combinationId: e.combinationId || null,
            combinationLabel: e.combinationLabel || null,
            plannedSets: e.plannedSets,
            plannedReps: e.plannedReps,
            plannedLoad: e.plannedLoad,
            loadUnit: e.loadUnit,
            restSeconds: e.restSeconds,
            observation: e.observation || null,
            unilateral: e.unilateral,
            warmupSet: e.warmupSet,
          })),
        },
      ],
    };

    try {
      if (id) {
        await apiClient.put(`/workouts/${id}`, payload);
      } else {
        await apiClient.post('/workouts', payload);
      }
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => {
        navigate('/treinos');
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Falha ao salvar o treino. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  handleSaveWorkoutRef.current = handleSaveWorkout;

  const handleCancel = () => {
    if (isDirty) {
      const confirmLeave = window.confirm('Existem alterações não salvas. Deseja sair sem salvar?');
      if (!confirmLeave) return;
    }
    navigate('/treinos');
  };

  if (loadingInitial) return <Loader text="Carregando editor de alta performance..." />;

  const categories = ['Todos', 'Peito', 'Costas', 'Membros Inferiores', 'Braços', 'Ombros', 'Abs & Core'];

  const filteredSideCatalog = exercisesCatalog.filter((ex) => {
    const matchesCategory = sideCatalogCategory === 'Todos' || ex.category === sideCatalogCategory;
    const matchesSearch = ex.name.toLowerCase().includes(sideCatalogSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredModalCatalog = exercisesCatalog.filter((ex) => {
    const matchesCategory = pickerCategory === 'Todos' || ex.category === pickerCategory;
    const matchesSearch = ex.name.toLowerCase().includes(pickerSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1400, margin: '0 auto' }}>
      {/* Top Bar Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleCancel}
            className="btn btn-secondary btn-sm"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
                {id ? 'Editar Treino' : 'Montador Rápido de Treino'}
              </h1>
              {isDirty && (
                <span
                  style={{
                    backgroundColor: 'rgba(229, 9, 20, 0.15)',
                    color: 'var(--accent-red)',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--accent-red)' }} />
                  Não salvo
                </span>
              )}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Prescreva com velocidade no teclado (Ctrl+S para salvar, Ctrl+D para duplicar).
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Toggle Side Catalog */}
          <button
            type="button"
            onClick={() => setShowSideCatalog(!showSideCatalog)}
            className="btn btn-secondary btn-sm"
            title="Alternar biblioteca rápida em tela dividida"
          >
            <SidebarIcon size={15} />
            <span>{showSideCatalog ? 'Ocultar Biblioteca' : 'Biblioteca Rápida'}</span>
          </button>

          {/* Templates button */}
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ color: 'var(--text-primary)' }}
          >
            <Sparkles size={15} color="var(--accent-red)" />
            <span>Modelos Prontos</span>
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-secondary btn-sm"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSaveWorkout}
            disabled={saving}
            className="btn btn-primary"
            style={{ padding: '8px 20px', fontSize: 13 }}
            title="Salvar e sincronizar no aplicativo (Ctrl+S)"
          >
            {saving ? (
              <span>Salvando...</span>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 size={16} />
                <span>Salvo e Sincronizado!</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Salvar Treino</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Feedback */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            backgroundColor: 'var(--color-danger-subtle)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#F87171',
            fontSize: 13,
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Parameters Card */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Aluno Destinatário *</label>
            <select
              className="form-select"
              value={studentId}
              onChange={(e) => { setStudentId(e.target.value); markDirty(); }}
            >
              <option value="">Selecione um aluno...</option>
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.full_name} ({st.main_goal})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nome da Ficha / Sessão *</label>
            <input
              type="text"
              className="form-input"
              value={workoutName}
              onChange={(e) => { setWorkoutName(e.target.value); markDirty(); }}
              placeholder="Ex: Treino A — Peito e Tríceps"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Objetivo da Prescrição</label>
            <input
              type="text"
              className="form-input"
              value={objective}
              onChange={(e) => { setObjective(e.target.value); markDirty(); }}
              placeholder="Ex: Hipertrofia miofibrilar"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Validade da Prescrição</label>
            <input
              type="date"
              className="form-input"
              value={validUntil}
              onChange={(e) => { setValidUntil(e.target.value); markDirty(); }}
            />
          </div>
        </div>
      </div>

      {/* Main Content: Split Two-Column Builder or Full-Width */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showSideCatalog ? '330px 1fr' : '1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Left Column: Quick Exercise Catalog Panel (Instant Search) */}
        {showSideCatalog && (
          <div
            className="card"
            style={{
              padding: 16,
              position: 'sticky',
              top: 80,
              maxHeight: 'calc(100vh - 100px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Dumbbell size={16} color="var(--accent-red)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Biblioteca Rápida
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {filteredSideCatalog.length} itens
              </span>
            </div>

            {/* Instant Search input */}
            <input
              type="text"
              className="form-input"
              style={{ fontSize: 12, padding: '7px 10px' }}
              placeholder="Pesquisar (ex: 'sup', 'leg')..."
              value={sideCatalogSearch}
              onChange={(e) => setSideCatalogSearch(e.target.value)}
            />

            {/* Category pills */}
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
              {['Todos', 'Peito', 'Costas', 'Membros Inferiores', 'Braços'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSideCatalogCategory(cat)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 10,
                    fontWeight: 600,
                    border: '1px solid var(--border-color)',
                    backgroundColor: sideCatalogCategory === cat ? 'var(--accent-red)' : 'var(--bg-primary)',
                    color: sideCatalogCategory === cat ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat === 'Membros Inferiores' ? 'Pernas' : cat}
                </button>
              ))}
            </div>

            {/* Catalog List */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                overflowY: 'auto',
                paddingRight: 4,
                maxHeight: 'calc(100vh - 280px)',
              }}
            >
              {filteredSideCatalog.map((ex) => (
                <div
                  key={ex.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontSize: 12,
                  }}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {ex.name}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ex.category}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddExerciseFromCatalog(ex)}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '4px 8px', fontSize: 11, flexShrink: 0 }}
                    title="Adicionar ao treino atual"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right Column: Workout Prescriptions List */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Prescrição de Exercícios ({exercises.length})
              </h2>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Arraste o ícone ☰ para reordenar, ou use os botões para Bi-set e duplicação.
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus size={14} />
                <span>Adicionar Exercício</span>
              </button>
            </div>
          </div>

          {exercises.length === 0 ? (
            <div
              style={{
                padding: '48px 20px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border-color)',
              }}
            >
              <Dumbbell size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                Nenhum exercício na ficha
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Selecione exercícios pela barra lateral ou carregue um modelo pronto para acelerar.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="btn btn-secondary btn-sm"
                >
                  <Sparkles size={14} color="var(--accent-red)" />
                  <span>Usar Modelo Pronto</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={14} /> Selecionar Exercícios
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {exercises.map((ex, index) => {
                const isInBiSet = !!ex.combinationId;

                return (
                  <div
                    key={ex.tempId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={() => { if (dragOverIndex === index) setDragOverIndex(null); }}
                    onDrop={(e) => handleDrop(e, index)}
                    style={{
                      backgroundColor: dragOverIndex === index ? 'rgba(217, 0, 0, 0.05)' : 'var(--card-bg)',
                      border: dragOverIndex === index
                        ? '2px dashed var(--accent-red)'
                        : isInBiSet
                        ? '1px dashed var(--accent-red)'
                        : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: 16,
                      position: 'relative',
                      opacity: draggedIndex === index ? 0.4 : 1,
                      transition: 'opacity 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
                      cursor: 'default',
                    }}
                  >
                    {/* Bi-Set Ribbon */}
                    {isInBiSet && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -9,
                          left: 14,
                          backgroundColor: 'var(--accent-red)',
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

                    {/* Exercise Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Drag Handle */}
                        <div
                          style={{
                            cursor: 'grab',
                            display: 'flex',
                            alignItems: 'center',
                            color: 'var(--text-muted)',
                            padding: '2px 4px',
                          }}
                          title="Arrastar e soltar para reordenar"
                        >
                          <GripVertical size={16} />
                        </div>

                        {/* Number Index */}
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-secondary)',
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {index + 1}
                        </span>

                        <div>
                          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                            {ex.name}
                          </span>
                          <span className="badge badge-neutral" style={{ marginLeft: 8, fontSize: 10 }}>
                            {ex.muscleGroup}
                          </span>
                        </div>
                      </div>

                      {/* Controls: Bi-set, reorder, duplicate, remove */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {index < exercises.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleToggleBiSet(index)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            title={isInBiSet ? 'Desagrupar Bi-set' : 'Agrupar com o próximo exercício'}
                          >
                            {isInBiSet ? <Unlink size={13} /> : <Link2 size={13} />}
                            <span>{isInBiSet ? 'Desfazer Bi-set' : 'Criar Bi-set'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: 6 }}
                          title="Subir"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === exercises.length - 1}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: 6 }}
                          title="Descer"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateExercise(index)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: 6 }}
                          title="Duplicar exercício (Ctrl+D)"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(index)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: 6, color: 'var(--color-danger)' }}
                          title="Remover exercício"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Inline Form Parameters Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>Séries</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: 13 }}
                          value={ex.plannedSets}
                          onChange={(e) => updateExerciseField(index, 'plannedSets', parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>Repetições</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: 13 }}
                          value={ex.plannedReps}
                          onChange={(e) => updateExerciseField(index, 'plannedReps', parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>Carga Alvo ({ex.loadUnit})</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: 13 }}
                          value={ex.plannedLoad}
                          onChange={(e) => updateExerciseField(index, 'plannedLoad', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>Descanso (segundos)</label>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: 13 }}
                          value={ex.restSeconds}
                          onChange={(e) => updateExerciseField(index, 'restSeconds', parseInt(e.target.value) || 0)}
                        />
                      </div>

                      <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>Observação / Cadência</label>
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: 13 }}
                          placeholder="Ex: Cadência 3-0-1-0. Pausa de 1s na contração."
                          value={ex.observation}
                          onChange={(e) => updateExerciseField(index, 'observation', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="btn btn-secondary btn-sm"
                >
                  <Plus size={14} /> Adicionar Outro Exercício
                </button>
                <button
                  type="button"
                  onClick={handleSaveWorkout}
                  disabled={saving}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '6px 18px' }}
                >
                  <Save size={14} /> Salvar Treino
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Exercise Picker Catalog */}
      <Modal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        title="Biblioteca de Exercícios DragonCorp"
        maxWidth={760}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Search & Category Filter */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              style={{ flex: 1, minWidth: 200 }}
              placeholder="Pesquisar por nome (ex: supino, leg, remada)..."
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              autoFocus
            />

            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setPickerCategory(cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 12,
                    fontWeight: 600,
                    border: '1px solid var(--border-color)',
                    backgroundColor: pickerCategory === cat ? 'var(--accent-red)' : 'var(--bg-primary)',
                    color: pickerCategory === cat ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog List */}
          <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredModalCatalog.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                Nenhum exercício encontrado com estes critérios.
              </div>
            ) : (
              filteredModalCatalog.map((ex) => (
                <div
                  key={ex.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                      {ex.name}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <span className="badge badge-neutral" style={{ fontSize: 10 }}>{ex.category}</span>
                      {(ex.tags || []).slice(0, 2).map((t) => (
                        <span key={t} style={{ fontSize: 10, color: 'var(--text-muted)' }}>#{t}</span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddExerciseFromCatalog(ex)}
                    className="btn btn-primary btn-sm"
                  >
                    <Plus size={14} /> Selecionar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Modal: Pre-Built Templates Picker */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Modelos de Treino DragonCorp"
        maxWidth={760}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Selecione uma estrutura pronta para preencher o treino em 1 clique. Você poderá editar séries, cargas e repetições livremente após carregar.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {WORKOUT_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                style={{
                  padding: 16,
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {tpl.name}
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                      {tpl.category}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {tpl.description}
                  </p>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
                    <strong>{tpl.exercises.length} exercícios:</strong>{' '}
                    {tpl.exercises.map((e) => e.name).join(', ')}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="btn btn-primary btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  <Sparkles size={14} /> Usar Modelo
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
