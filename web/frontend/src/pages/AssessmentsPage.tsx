import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  Plus,
  ArrowRightLeft,
  Calendar,
  AlertCircle,
  Search,
  LayoutGrid,
  List,
  Scale,
  Eye,
  X,
  Printer,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Activity,
  User,
  Zap,
  Dumbbell,
  Percent,
  Layers,
  Ruler,
  Camera,
  Award,
  HeartPulse,
  FileText,
  Sparkles,
  CalendarCheck,
  FileEdit,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Clock,
  Users,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { PhysicalAssessment, StudentProfile } from '../types';
import { Modal } from '../components/common/Modal';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import {
  BodyCompositionProtocolId,
  PROTOCOLS_LIST,
  calculateComposition,
  SkinfoldValues,
  BodyPerimeters,
  BioimpedanceValues,
} from '../utils/body-composition-protocols';
import { printAssessmentReport } from '../utils/assessment-report-pdf';

export const AssessmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, trainerProfile } = useAuth();
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');

  // Detail Modal State
  const [selectedAssessmentForDetail, setSelectedAssessmentForDetail] = useState<PhysicalAssessment | null>(null);

  // Compare selector
  const [compareFirst, setCompareFirst] = useState<string>('');
  const [compareSecond, setCompareSecond] = useState<string>('');
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  // --- NEW ASSESSMENT WIZARD STATE (8 STEPS) ---
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [savingAssessment, setSavingAssessment] = useState<boolean>(false);
  const [wizardError, setWizardError] = useState<string | null>(null);

  // Step 1: Basic
  const [wStudentId, setWStudentId] = useState<string>('');
  const [wDate, setWDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [wType, setWType] = useState<string>('periodica');
  const [wWeightKg, setWWeightKg] = useState<number>(75);
  const [wHeightCm, setWHeightCm] = useState<number>(175);
  const [wAge, setWAge] = useState<number>(28);
  const [wGender, setWGender] = useState<'male' | 'female'>('male');

  // Step 2: Protocol
  const [wProtocol, setWProtocol] = useState<BodyCompositionProtocolId>('jackson-pollock-7');

  // Step 3: Skinfolds
  const [wSkinfolds, setWSkinfolds] = useState<SkinfoldValues>({
    chest: 12,
    midaxillary: 14,
    triceps: 15,
    subscapular: 16,
    abdominal: 22,
    suprailiac: 18,
    thigh: 16,
    calf: 10,
  });

  // Bioimpedance fields if protocol === 'bioimpedance'
  const [wBioimpedance, setWBioimpedance] = useState<BioimpedanceValues>({
    bodyFatPercent: 16.5,
    visceralFat: 4,
    boneMassKg: 3.2,
    basalMetabolicRateKcal: 1750,
    metabolicAge: 25,
  });

  // Step 4: Perimeters
  const [wPerimeters, setWPerimeters] = useState<BodyPerimeters>({
    neck: 38,
    chest: 98,
    waist: 82,
    abdomen: 86,
    hip: 100,
    rightArmRelaxed: 35,
    rightArmContracted: 38,
    leftArmRelaxed: 35,
    leftArmContracted: 37.5,
    rightForearm: 29,
    leftForearm: 29,
    rightThigh: 56,
    leftThigh: 56,
    rightCalf: 37,
    leftCalf: 37,
  });

  // Step 5: Postural & Photos
  const [wPosturalNotes, setWPosturalNotes] = useState<string>('');
  const [wPhotoConsent, setWPhotoConsent] = useState<boolean>(true);

  // Step 6: Functional & Cardio
  const [wWellsBenchCm, setWWellsBenchCm] = useState<number>(32);
  const [wPushUpsReps, setWPushUpsReps] = useState<number>(28);
  const [wSitUpsReps, setWSitUpsReps] = useState<number>(35);
  const [wVo2Max, setWVo2Max] = useState<number>(42.5);

  // Step 8: Conclusion & Next Date
  const [wConclusion, setWConclusion] = useState<string>('');
  const [wNextReassessmentDate, setWNextReassessmentDate] = useState<string>(
    new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]
  );

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const [assRes, stRes] = await Promise.all([
        apiClient.get('/assessments'),
        apiClient.get('/students'),
      ]);
      const listAssessments = assRes.data.assessments || [];
      const listStudents = stRes.data.students || [];

      setAssessments(listAssessments);
      setStudents(listStudents);
      if (listStudents.length > 0 && !wStudentId) {
        setWStudentId(listStudents[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  // Update gender/age when selected student changes
  const handleStudentSelect = (stdId: string) => {
    setWStudentId(stdId);
    const selected = students.find((s) => s.id === stdId);
    if (selected) {
      if (selected.gender === 'female') setWGender('female');
      else setWGender('male');
    }
  };

  // Instant calculated composition
  const calculatedResults = useMemo(() => {
    return calculateComposition(
      wProtocol,
      wGender,
      wAge,
      wWeightKg,
      wHeightCm,
      wSkinfolds,
      wBioimpedance
    );
  }, [wProtocol, wGender, wAge, wWeightKg, wHeightCm, wSkinfolds, wBioimpedance]);

  const handleFinishAssessment = async () => {
    setSavingAssessment(true);
    setWizardError(null);

    try {
      const payload = {
        studentId: wStudentId,
        assessmentDate: wDate,
        type: wType,
        generalInfo: {
          age: wAge,
          gender: wGender,
          heightCm: wHeightCm,
          weightKg: wWeightKg,
          nextReassessmentDate: wNextReassessmentDate,
        },
        bodyComposition: {
          protocolId: wProtocol,
          weightKg: wWeightKg,
          heightCm: wHeightCm,
          bodyFatPercent: calculatedResults.bodyFatPercent,
          fatMassKg: calculatedResults.fatMassKg,
          leanMassKg: calculatedResults.leanMassKg,
          bmi: calculatedResults.bmi,
          idealWeightKg: calculatedResults.idealWeightKg,
          classification: calculatedResults.classification,
          bodyDensity: calculatedResults.bodyDensity,
          method: wProtocol === 'bioimpedance' ? 'bioimpedance' : 'dobras',
        },
        skinfolds: wProtocol !== 'bioimpedance' ? wSkinfolds : undefined,
        perimeters: wPerimeters,
        functional: {
          wellsBenchCm: wWellsBenchCm,
          pushUpsReps: wPushUpsReps,
          sitUpsReps: wSitUpsReps,
        },
        cardio: {
          vo2Max: wVo2Max,
        },
        postural: {
          notes: wPosturalNotes,
          photoConsent: wPhotoConsent,
        },
        conclusion: wConclusion,
      };

      await apiClient.post('/assessments', payload);
      setIsWizardOpen(false);
      setWizardStep(1);
      fetchAssessments();
    } catch (err: any) {
      setWizardError(err.response?.data?.message || 'Falha ao salvar avaliação física completa.');
    } finally {
      setSavingAssessment(false);
    }
  };

  const handleGoCompare = () => {
    if (!compareFirst || !compareSecond) {
      alert('Selecione as duas avaliações para comparar.');
      return;
    }
    navigate(`/avaliacoes/comparativo?first=${compareFirst}&second=${compareSecond}`);
  };

  const handlePrintAssessment = (assessment: PhysicalAssessment) => {
    const student = assessment.student;
    const comp = (assessment.body_composition || {}) as Record<string, any>;

    printAssessmentReport({
      trainerName: user?.name || 'Personal DragonCorp',
      trainerCref: trainerProfile?.cref_number ? `${trainerProfile.cref_number}/${trainerProfile.cref_state || 'SP'}` : undefined,
      businessName: 'DragonCorp',
      primaryColor: localStorage.getItem('dragoncorp_brand_primary') || '#D90000',
      studentName: student?.full_name || 'Aluno',
      studentGender: (student?.gender as any) || 'male',
      studentAge: 28,
      assessmentDate: assessment.assessment_date,
      type: assessment.type,
      protocolName: comp.protocolId || 'Pollock 7 Dobras',
      weightKg: comp.weightKg || 75,
      heightCm: comp.heightCm || 175,
      bmi: comp.bmi || 24.5,
      bmiClassification: 'Normal',
      bodyFatPercent: comp.bodyFatPercent || 16,
      fatMassKg: comp.fatMassKg || 12,
      leanMassKg: comp.leanMassKg || 63,
      idealWeightKg: comp.idealWeightKg || 72,
      classification: comp.classification || 'Bom / Adequado',
      skinfolds: assessment.skinfolds as any,
      perimeters: assessment.perimeters as any,
      conclusion: assessment.conclusion || '',
    });
  };

  // Helper date formatter
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

  // Filtered assessments
  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      const studentName = a.student?.full_name || '';
      const notes = a.conclusion || '';
      const q = search.toLowerCase();
      const matchesSearch = studentName.toLowerCase().includes(q) || notes.toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || a.type?.toLowerCase() === typeFilter.toLowerCase();
      const matchesStudent = selectedStudentFilter === 'all' || a.student_id === selectedStudentFilter;
      return matchesSearch && matchesType && matchesStudent;
    });
  }, [assessments, search, typeFilter, selectedStudentFilter]);

  // Statistics
  const totalCount = assessments.length;
  const avgWeight = useMemo(() => {
    if (assessments.length === 0) return 0;
    const sum = assessments.reduce((acc, curr) => acc + (curr.body_composition?.weightKg || 0), 0);
    return Math.round((sum / assessments.length) * 10) / 10;
  }, [assessments]);

  const avgBodyFat = useMemo(() => {
    if (assessments.length === 0) return 0;
    const sum = assessments.reduce((acc, curr) => acc + (curr.body_composition?.bodyFatPercent || 0), 0);
    return Math.round((sum / assessments.length) * 10) / 10;
  }, [assessments]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: '100%' }}>
      {/* 1. Header Section */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="icon-badge icon-badge-primary" style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)' }}>
            <Activity size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.4, margin: 0 }}>
              Avaliações Físicas
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, marginBottom: 0 }}>
              Protocolos de composição corporal, dobras cutâneas, perímetros e relatórios de evolução longitudinal.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* View Mode Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-xs)',
                backgroundColor: viewMode === 'grid' ? 'var(--card-highlighted)' : 'transparent',
                color: viewMode === 'grid' ? '#FFFFFF' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Visualização em Cards"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-xs)',
                backgroundColor: viewMode === 'table' ? 'var(--card-highlighted)' : 'transparent',
                color: viewMode === 'table' ? '#FFFFFF' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Visualização em Tabela"
            >
              <List size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCompareModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 14px',
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'border-color 0.15s ease',
            }}
          >
            <ArrowRightLeft size={15} color="var(--text-muted)" />
            <span>Comparar Avaliações</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setWizardStep(1);
              setIsWizardOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 800,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-red)',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <Plus size={16} />
            <span>Nova Avaliação</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Sleek Minimalist Stat Cards */}
      <div className="stats-grid-4">
        <div className="stat-card-sleek">
          <div className="stat-card-sleek-header">
            <span className="stat-card-sleek-title">Total Registradas</span>
            <div className="icon-badge icon-badge-primary" style={{ width: 32, height: 32 }}>
              <FileCheck2 size={16} />
            </div>
          </div>
          <div>
            <div className="stat-card-sleek-value">{totalCount}</div>
            <div className="stat-card-sleek-footer" style={{ marginTop: 4 }}>
              <TrendingUp size={13} color="var(--color-success)" />
              <span>Histórico longitudinal ativo</span>
            </div>
          </div>
        </div>

        <div className="stat-card-sleek">
          <div className="stat-card-sleek-header">
            <span className="stat-card-sleek-title">Média de Peso</span>
            <div className="icon-badge icon-badge-info" style={{ width: 32, height: 32 }}>
              <Scale size={16} />
            </div>
          </div>
          <div>
            <div className="stat-card-sleek-value">{avgWeight} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>kg</span></div>
            <div className="stat-card-sleek-footer" style={{ marginTop: 4 }}>
              <span>Base dos alunos avaliados</span>
            </div>
          </div>
        </div>

        <div className="stat-card-sleek">
          <div className="stat-card-sleek-header">
            <span className="stat-card-sleek-title">Gordura Média</span>
            <div className="icon-badge icon-badge-warning" style={{ width: 32, height: 32 }}>
              <Percent size={16} />
            </div>
          </div>
          <div>
            <div className="stat-card-sleek-value">{avgBodyFat} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>%</span></div>
            <div className="stat-card-sleek-footer" style={{ marginTop: 4 }}>
              <span>Protocolo Pollock / Siri</span>
            </div>
          </div>
        </div>

        <div className="stat-card-sleek">
          <div className="stat-card-sleek-header">
            <span className="stat-card-sleek-title">Próximas Reavaliações</span>
            <div className="icon-badge icon-badge-success" style={{ width: 32, height: 32 }}>
              <CalendarCheck size={16} />
            </div>
          </div>
          <div>
            <div className="stat-card-sleek-value">60 <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>dias</span></div>
            <div className="stat-card-sleek-footer" style={{ marginTop: 4 }}>
              <span>Ciclo padrão de acompanhamento</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filters Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 'min(100%, 260px)', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 14px',
              flex: 1,
              minWidth: 'min(100%, 200px)',
              maxWidth: 380,
            }}
          >
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar por aluno, tipo ou parecer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              value={selectedStudentFilter}
              onChange={(e) => setSelectedStudentFilter(e.target.value)}
              style={{
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Todos os Alunos</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Todas' },
            { id: 'periodica', label: 'Periódicas' },
            { id: 'inicial', label: 'Iniciais' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              style={{
                backgroundColor: typeFilter === tab.id ? 'var(--card-highlighted)' : 'transparent',
                color: typeFilter === tab.id ? '#FFFFFF' : 'var(--text-muted)',
                border: typeFilter === tab.id ? '1px solid var(--accent-red)' : '1px solid transparent',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Main Assessments Content */}
      {loading ? (
        <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
          <Loader text="Carregando avaliações físicas e protocolos..." />
        </div>
      ) : filteredAssessments.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="Nenhuma avaliação encontrada"
          description="Cadastre a primeira avaliação física para acompanhar as dobras cutâneas e bioimpedância dos seus alunos."
          actionLabel="Nova Avaliação"
          onAction={() => {
            setWizardStep(1);
            setIsWizardOpen(true);
          }}
        />
      ) : viewMode === 'grid' ? (
        /* GRID VIEW WITH SLEEK MINIMALIST CARDS */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 16 }}>
          {filteredAssessments.map((item) => {
            const comp = item.body_composition || {};
            const initials = (item.student?.full_name || 'AL')
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  padding: 20,
                }}
              >
                {/* Card Header with Avatar & Student Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--card-secondary)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 800,
                        color: 'var(--primary-light)',
                      }}
                    >
                      {initials}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {item.student?.full_name || 'Aluno'}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-xs)',
                            backgroundColor: 'var(--accent-red-subtle)',
                            color: 'var(--accent-red)',
                          }}
                        >
                          {item.type || 'Periódica'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={12} />
                          {formatDate(item.assessment_date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--card-secondary)',
                      border: '1px solid var(--border-color)',
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    <Layers size={11} />
                    <span>{comp.method || 'Pollock 7'}</span>
                  </div>
                </div>

                {/* Metrics Pill Matrix with Icons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <div className="metric-pill-sleek">
                    <div className="metric-pill-sleek-label">
                      <Scale size={12} color="var(--text-muted)" />
                      <span>Peso</span>
                    </div>
                    <div className="metric-pill-sleek-value">
                      {comp.weightKg || '-'} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>kg</span>
                    </div>
                  </div>

                  <div className="metric-pill-sleek">
                    <div className="metric-pill-sleek-label">
                      <Percent size={12} color="var(--color-warning)" />
                      <span>% Gordura</span>
                    </div>
                    <div className="metric-pill-sleek-value" style={{ color: 'var(--accent-red)' }}>
                      {comp.bodyFatPercent ? `${comp.bodyFatPercent}%` : '-'}
                    </div>
                  </div>

                  <div className="metric-pill-sleek">
                    <div className="metric-pill-sleek-label">
                      <Dumbbell size={12} color="var(--color-success)" />
                      <span>M. Magra</span>
                    </div>
                    <div className="metric-pill-sleek-value" style={{ color: 'var(--color-success)' }}>
                      {comp.leanMassKg || '-'} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>kg</span>
                    </div>
                  </div>
                </div>

                {item.conclusion && (
                  <div
                    style={{
                      backgroundColor: 'var(--card-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <FileText size={13} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                      "{item.conclusion.length > 90 ? `${item.conclusion.slice(0, 90)}...` : item.conclusion}"
                    </p>
                  </div>
                )}

                {/* Card Bottom Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--divider)' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedAssessmentForDetail(item)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--card-secondary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Eye size={14} color="var(--text-muted)" />
                    <span>Ver Relatório</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrintAssessment(item)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--card-secondary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}
                    title="Imprimir Laudo PDF"
                  >
                    <Printer size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="table-responsive-container" style={{ backgroundColor: '#141414', border: '1px solid #222222', borderRadius: 'var(--radius-lg)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13, minWidth: 700 }}>
            <thead>
              <tr style={{ backgroundColor: '#181818', borderBottom: '1px solid #222222', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Aluno</th>
                <th style={{ padding: '12px 16px' }}>Data</th>
                <th style={{ padding: '12px 16px' }}>Tipo</th>
                <th style={{ padding: '12px 16px' }}>Peso</th>
                <th style={{ padding: '12px 16px' }}>% Gordura</th>
                <th style={{ padding: '12px 16px' }}>Massa Magra</th>
                <th style={{ padding: '12px 16px' }}>IMC</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssessments.map((a) => {
                const comp = a.body_composition || {};
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid #1E1E1E' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {a.student?.full_name || 'Aluno'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{formatDate(a.assessment_date)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, backgroundColor: '#222', color: 'var(--text-secondary)' }}>
                        {a.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{comp.weightKg || '-'} kg</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 700 }}>
                      {comp.bodyFatPercent ? `${comp.bodyFatPercent}%` : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 700 }}>
                      {comp.leanMassKg ? `${comp.leanMassKg} kg` : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{comp.bmi || '-'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setSelectedAssessmentForDetail(a)}
                          style={{
                            padding: '5px 10px',
                            fontSize: 12,
                            backgroundColor: '#1E1E1E',
                            border: '1px solid #2A2A2A',
                            color: 'var(--text-primary)',
                            borderRadius: 4,
                            cursor: 'pointer',
                          }}
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintAssessment(a)}
                          style={{
                            padding: '5px 10px',
                            fontSize: 12,
                            backgroundColor: '#1E1E1E',
                            border: '1px solid #2A2A2A',
                            color: 'var(--text-muted)',
                            borderRadius: 4,
                            cursor: 'pointer',
                          }}
                        >
                          <Printer size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- 5. MODAL: WIZARD DE NOVA AVALIAÇÃO FÍSICA (8 ETAPAS COMPLETAS) --- */}
      <Modal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        title={`Nova Avaliação Física — Etapa ${wizardStep} de 8`}
        subtitle="Protocolos antropométricos, dobras, perímetros e cálculos em tempo real"
        maxWidth={820}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 10 }}>
            {wizardStep > 1 ? (
              <button
                type="button"
                onClick={() => setWizardStep(wizardStep - 1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--card-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                  transition: 'all 0.15s ease',
                }}
              >
                <ChevronLeft size={16} />
                <span>Voltar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsWizardOpen(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}
              >
                Cancelar
              </button>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              {wizardStep < 8 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep(wizardStep + 1)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 22px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--accent-red)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <span>Próxima Etapa</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={savingAssessment}
                  onClick={handleFinishAssessment}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 24px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-success)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: savingAssessment ? 'not-allowed' : 'pointer',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{savingAssessment ? 'Salvando Avaliação...' : 'Finalizar e Salvar'}</span>
                </button>
              )}
            </div>
          </div>
        }
      >
        {/* Sleek Horizontal Stepper Bar with Icons */}
        <div className="stepper-bar-sleek" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 6 }}>
          {[
            { step: 1, label: 'Identificação', icon: User },
            { step: 2, label: 'Protocolo', icon: Layers },
            { step: 3, label: 'Dobras / Bio', icon: Activity },
            { step: 4, label: 'Perímetros', icon: Ruler },
            { step: 5, label: 'Postura', icon: Camera },
            { step: 6, label: 'Testes', icon: HeartPulse },
            { step: 7, label: 'Resultados', icon: Award },
            { step: 8, label: 'Parecer', icon: CheckCircle2 },
          ].map((item) => {
            const Icon = item.icon;
            const isCurrent = wizardStep === item.step;
            const isCompleted = wizardStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setWizardStep(item.step)}
                className={`stepper-step-pill ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                style={{ flexShrink: 0 }}
              >
                <Icon size={12} />
                <span>{item.step}. {item.label}</span>
              </button>
            );
          })}
        </div>

        {wizardError && (
          <div style={{ backgroundColor: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', padding: 12, borderRadius: 'var(--radius-sm)', color: '#FF6B6B', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            <span>{wizardError}</span>
          </div>
        )}

        {/* ETAPA 1: ALUNO & IDENTIFICAÇÃO */}
        {wizardStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Card 1: Identificação */}
            <div className="section-card">
              <div className="section-card-header">
                <div className="icon-badge">
                  <User size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Vínculo do Aluno e Data
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                    Selecione o aluno e a data oficial da avaliação antropométrica
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Aluno *</label>
                  <select
                    className="form-select"
                    value={wStudentId}
                    onChange={(e) => handleStudentSelect(e.target.value)}
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.main_goal || 'Geral'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Data da Avaliação *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={wDate}
                    onChange={(e) => setWDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Biometria Inicial */}
            <div className="section-card">
              <div className="section-card-header">
                <div className="icon-badge">
                  <Scale size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Dados Biométricos Iniciais
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                    Medidas corporais de entrada essenciais para os cálculos de densidade corporal
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Peso Atual (kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={wWeightKg}
                    onChange={(e) => setWWeightKg(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Altura (cm) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={wHeightCm}
                    onChange={(e) => setWHeightCm(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Idade (anos) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={wAge}
                    onChange={(e) => setWAge(parseInt(e.target.value) || 18)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Sexo Biológico *</label>
                  <select
                    className="form-select"
                    value={wGender}
                    onChange={(e) => setWGender(e.target.value as any)}
                  >
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 2: PROTOCOLO */}
        {wizardStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="section-card-header">
              <div className="icon-badge">
                <Layers size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Escolha do Protocolo Científico
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Selecione o protocolo de composição corporal que será aplicado nas dobras ou bioimpedância
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 12 }}>
              {PROTOCOLS_LIST.map((proto) => {
                const isSelected = wProtocol === proto.id;
                return (
                  <div
                    key={proto.id}
                    onClick={() => setWProtocol(proto.id)}
                    className={`selectable-card-sleek ${isSelected ? 'active' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="icon-badge" style={{ width: 28, height: 28 }}>
                          <FileText size={14} />
                        </div>
                        <strong style={{ fontSize: 13, color: isSelected ? 'var(--primary-light)' : '#FFFFFF' }}>{proto.name}</strong>
                      </div>
                      {isSelected && (
                        <span className="badge badge-red" style={{ fontSize: 10 }}>
                          ATIVO
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {proto.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ETAPA 3: DOBRAS OU BIOIMPEDÂNCIA */}
        {wizardStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="section-card-header">
              <div className="icon-badge">
                <Activity size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Medição Antropométrica — {PROTOCOLS_LIST.find((p) => p.id === wProtocol)?.name}
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Insira as espessuras cutâneas em milímetros com adipômetro calibrado
                </p>
              </div>
            </div>

            {wProtocol === 'bioimpedance' ? (
              <div className="section-card">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">% de Gordura da Balança (%) *</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={wBioimpedance.bodyFatPercent}
                      onChange={(e) => setWBioimpedance({ ...wBioimpedance, bodyFatPercent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Gordura Visceral (Nível)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={wBioimpedance.visceralFat}
                      onChange={(e) => setWBioimpedance({ ...wBioimpedance, visceralFat: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="section-card">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 12 }}>
                  {(
                    [
                      { key: 'chest', label: 'Peitoral (mm)' },
                      { key: 'midaxillary', label: 'Axilar Média (mm)' },
                      { key: 'triceps', label: 'Tríceps (mm)' },
                      { key: 'subscapular', label: 'Subescapular (mm)' },
                      { key: 'abdominal', label: 'Abdômen (mm)' },
                      { key: 'suprailiac', label: 'Supra-ilíaca (mm)' },
                      { key: 'thigh', label: 'Coxa (mm)' },
                      { key: 'calf', label: 'Panturrilha (mm)' },
                    ] as const
                  ).map((item) => (
                    <div key={item.key} className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">{item.label}</label>
                      <input
                        type="number"
                        step="0.5"
                        className="form-input"
                        value={wSkinfolds[item.key] || ''}
                        onChange={(e) => setWSkinfolds({ ...wSkinfolds, [item.key]: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ETAPA 4: PERÍMETROS */}
        {wizardStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="section-card-header">
              <div className="icon-badge">
                <Ruler size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Perímetros e Circunferências Corporais (cm)
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Medições com fita antropométrica inelástica
                </p>
              </div>
            </div>

            <div className="section-card">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 12 }}>
                {(
                  [
                    { key: 'chest', label: 'Tórax / Peitoral' },
                    { key: 'waist', label: 'Cintura' },
                    { key: 'abdomen', label: 'Abdômen' },
                    { key: 'hip', label: 'Quadril' },
                    { key: 'rightArmContracted', label: 'Braço D. Contraído' },
                    { key: 'leftArmContracted', label: 'Braço E. Contraído' },
                    { key: 'rightThigh', label: 'Coxa Direita' },
                    { key: 'leftThigh', label: 'Coxa Esquerda' },
                    { key: 'rightCalf', label: 'Panturrilha D.' },
                  ] as const
                ).map((item) => (
                  <div key={item.key} className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{item.label} (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-input"
                      value={wPerimeters[item.key] || ''}
                      onChange={(e) => setWPerimeters({ ...wPerimeters, [item.key]: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 5: POSTURA & FOTOS */}
        {wizardStep === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="section-card-header">
              <div className="icon-badge">
                <Camera size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Avaliação Postural e Registro Fotográfico
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Registro visual das 4 vistas anatômicas e notas posturais
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: 12 }}>
              {['Frente', 'Costas', 'Perfil Direito', 'Perfil Esquerdo'].map((view) => (
                <div
                  key={view}
                  className="section-card"
                  style={{
                    padding: 16,
                    textAlign: 'center',
                    borderStyle: 'dashed',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div className="icon-badge" style={{ width: 32, height: 32 }}>
                    <Camera size={14} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>{view}</span>
                  <span style={{ fontSize: 11, color: 'var(--primary-light)', fontWeight: 600, cursor: 'pointer' }}>+ Foto</span>
                </div>
              ))}
            </div>

            <div className="section-card">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Apontamentos da Avaliação Postural</label>
                <textarea
                  rows={3}
                  className="form-textarea"
                  placeholder="Ex: Leve escoliose lombar, anteriorização de ombros..."
                  value={wPosturalNotes}
                  onChange={(e) => setWPosturalNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 6: TESTES FUNCIONAIS */}
        {wizardStep === 6 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="section-card-header">
              <div className="icon-badge">
                <HeartPulse size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Testes Motores, Funcionais e Cardiorrespiratórios
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Avaliação de flexibilidade, resistência muscular e capacidade aeróbia
                </p>
              </div>
            </div>

            <div className="section-card">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 14 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Flexibilidade / Banco de Wells (cm)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={wWellsBenchCm}
                    onChange={(e) => setWWellsBenchCm(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Teste de Flexões de Braço (Reps)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={wPushUpsReps}
                    onChange={(e) => setWPushUpsReps(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Resistência Abdominal 1 min (Reps)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={wSitUpsReps}
                    onChange={(e) => setWSitUpsReps(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">VO2 Máx Estimado (mL/kg/min)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={wVo2Max}
                    onChange={(e) => setWVo2Max(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 7: RESULTADOS CALCULADOS */}
        {wizardStep === 7 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="section-card-header">
              <div className="icon-badge">
                <Award size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Resultados Antropométricos Calculados
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Valores calculados em tempo real pela equação de Siri e tabelas ACSM
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 14 }}>
              <div className="stat-card-sleek" style={{ borderColor: 'var(--border-light)' }}>
                <div className="stat-card-sleek-header">
                  <span className="stat-card-sleek-title">% Gordura</span>
                  <div className="icon-badge" style={{ width: 32, height: 32 }}>
                    <Percent size={16} />
                  </div>
                </div>
                <div>
                  <div className="stat-card-sleek-value" style={{ color: '#FFFFFF' }}>
                    {calculatedResults.bodyFatPercent}%
                  </div>
                  <div className="stat-card-sleek-footer" style={{ marginTop: 4, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {calculatedResults.classification}
                  </div>
                </div>
              </div>

              <div className="stat-card-sleek">
                <div className="stat-card-sleek-header">
                  <span className="stat-card-sleek-title">Massa Magra</span>
                  <div className="icon-badge" style={{ width: 32, height: 32 }}>
                    <Dumbbell size={16} />
                  </div>
                </div>
                <div>
                  <div className="stat-card-sleek-value" style={{ color: '#FFFFFF' }}>
                    {calculatedResults.leanMassKg} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>kg</span>
                  </div>
                  <div className="stat-card-sleek-footer" style={{ marginTop: 4 }}>
                    Músculos, ossos e vísceras
                  </div>
                </div>
              </div>

              <div className="stat-card-sleek">
                <div className="stat-card-sleek-header">
                  <span className="stat-card-sleek-title">Massa Gorda</span>
                  <div className="icon-badge" style={{ width: 32, height: 32 }}>
                    <Scale size={16} />
                  </div>
                </div>
                <div>
                  <div className="stat-card-sleek-value" style={{ color: '#FFFFFF' }}>
                    {calculatedResults.fatMassKg} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>kg</span>
                  </div>
                  <div className="stat-card-sleek-footer" style={{ marginTop: 4 }}>
                    Peso Alvo: ~{calculatedResults.idealWeightKg} kg
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 8: CONCLUSÃO & REAVALIAÇÃO */}
        {wizardStep === 8 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="section-card-header">
              <div className="icon-badge">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Parecer Técnico e Próxima Reavaliação
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Finalize a avaliação registrando seu parecer profissional e a data de retorno
                </p>
              </div>
            </div>

            <div className="section-card">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Parecer Clínico e Metas para o Aluno</label>
                <textarea
                  rows={4}
                  className="form-textarea"
                  placeholder="Ex: Excelente evolução em massa magra (+1.2kg). Foco nas próximas 8 semanas em redução de percentual lipídico e mobilidade de quadril."
                  value={wConclusion}
                  onChange={(e) => setWConclusion(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: '14px 0 0' }}>
                <label className="form-label">Data Programada para Próxima Reavaliação</label>
                <input
                  type="date"
                  className="form-input"
                  value={wNextReassessmentDate}
                  onChange={(e) => setWNextReassessmentDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* --- 6. MODAL: DETALHES DA AVALIAÇÃO & RELATÓRIO --- */}
      {selectedAssessmentForDetail && (
        <Modal
          isOpen={!!selectedAssessmentForDetail}
          onClose={() => setSelectedAssessmentForDetail(null)}
          title={`Laudo da Avaliação — ${selectedAssessmentForDetail.student?.full_name}`}
          subtitle={`Realizada em ${formatDate(selectedAssessmentForDetail.assessment_date)} (${selectedAssessmentForDetail.type})`}
          maxWidth={750}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 10 }}>
              <button
                type="button"
                onClick={() => handlePrintAssessment(selectedAssessmentForDetail)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 6,
                  backgroundColor: 'var(--accent-red)',
                  color: '#FFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <Printer size={15} />
                <span>Imprimir Laudo PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAssessmentForDetail(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  backgroundColor: '#1E1E1E',
                  border: '1px solid #282828',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Fechar
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Composição Corporal */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: 10 }}>
              <div style={{ backgroundColor: '#181818', padding: 12, borderRadius: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Peso</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#FFF' }}>
                  {selectedAssessmentForDetail.body_composition?.weightKg || '-'} kg
                </div>
              </div>
              <div style={{ backgroundColor: '#181818', padding: 12, borderRadius: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>% Gordura</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#FFF' }}>
                  {selectedAssessmentForDetail.body_composition?.bodyFatPercent ? `${selectedAssessmentForDetail.body_composition?.bodyFatPercent}%` : '-'}
                </div>
              </div>
              <div style={{ backgroundColor: '#181818', padding: 12, borderRadius: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Massa Magra</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#FFF' }}>
                  {selectedAssessmentForDetail.body_composition?.leanMassKg ? `${selectedAssessmentForDetail.body_composition?.leanMassKg} kg` : '-'}
                </div>
              </div>
              <div style={{ backgroundColor: '#181818', padding: 12, borderRadius: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>IMC</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#FFF' }}>
                  {selectedAssessmentForDetail.body_composition?.bmi || '-'}
                </div>
              </div>
            </div>

            {selectedAssessmentForDetail.conclusion && (
              <div style={{ backgroundColor: '#181818', border: '1px solid #282828', borderRadius: 6, padding: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Parecer do Treinador:
                </span>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {selectedAssessmentForDetail.conclusion}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* --- 7. MODAL: COMPARAR AVALIAÇÕES --- */}
      <Modal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        title="Comparativo Longitudinal de Avaliações"
        subtitle="Selecione duas avaliações para comparar a evolução de composição corporal"
        maxWidth={580}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsCompareModalOpen(false)}
              style={{ padding: '8px 16px', borderRadius: 6, backgroundColor: 'transparent', border: '1px solid #282828', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGoCompare}
              style={{ padding: '8px 20px', borderRadius: 6, backgroundColor: 'var(--accent-red)', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer' }}
            >
              Comparar Agora
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Primeira Avaliação (Base / Anterior) *
            </label>
            <select
              value={compareFirst}
              onChange={(e) => setCompareFirst(e.target.value)}
              style={{ width: '100%', backgroundColor: '#181818', border: '1px solid #282828', color: '#FFF', padding: '9px 12px', borderRadius: 6 }}
            >
              <option value="">Selecione uma avaliação...</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.student?.full_name} — {formatDate(a.assessment_date)} ({a.body_composition?.bodyFatPercent}%G)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Segunda Avaliação (Atual / Evolução) *
            </label>
            <select
              value={compareSecond}
              onChange={(e) => setCompareSecond(e.target.value)}
              style={{ width: '100%', backgroundColor: '#181818', border: '1px solid #282828', color: '#FFF', padding: '9px 12px', borderRadius: 6 }}
            >
              <option value="">Selecione uma avaliação...</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.student?.full_name} — {formatDate(a.assessment_date)} ({a.body_composition?.bodyFatPercent}%G)
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};
