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
  TrendingDown,
  Scale,
  Eye,
  X,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { PhysicalAssessment, StudentProfile } from '../types';
import { Modal } from '../components/common/Modal';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';

export const AssessmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');

  // Detail Modal State
  const [selectedAssessmentForDetail, setSelectedAssessmentForDetail] = useState<PhysicalAssessment | null>(null);

  // New Assessment Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [studentId, setStudentId] = useState<string>('');
  const [assessmentDate, setAssessmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [type] = useState<string>('periodica');
  const [weightKg, setWeightKg] = useState<number>(78);
  const [heightCm, setHeightCm] = useState<number>(175);
  const [bodyFatPercent, setBodyFatPercent] = useState<number>(16);
  const [waistCm, setWaistCm] = useState<number>(80);
  const [chestCm, setChestCm] = useState<number>(98);
  const [armCm, setArmCm] = useState<number>(36);
  const [conclusion, setConclusion] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Compare selector
  const [compareFirst, setCompareFirst] = useState<string>('');
  const [compareSecond, setCompareSecond] = useState<string>('');
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const [assRes, stRes] = await Promise.all([
        apiClient.get('/assessments'),
        apiClient.get('/students'),
      ]);
      setAssessments(assRes.data.assessments || []);
      setStudents(stRes.data.students || []);
      if (stRes.data.students?.length > 0 && !studentId) {
        setStudentId(stRes.data.students[0].id);
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

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      await apiClient.post('/assessments', {
        studentId,
        assessmentDate,
        type,
        bodyComposition: {
          weightKg,
          heightCm,
          bodyFatPercent,
          method: 'dobras',
        },
        perimeters: {
          waist: waistCm,
          chest: chestCm,
          rightArmContracted: armCm,
        },
        conclusion,
      });

      setIsModalOpen(false);
      fetchAssessments();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Falha ao salvar avaliação.');
    } finally {
      setSaving(false);
    }
  };

  const handleGoCompare = () => {
    if (!compareFirst || !compareSecond) {
      alert('Selecione as duas avaliações para comparar.');
      return;
    }
    navigate(`/avaliacoes/comparativo?first=${compareFirst}&second=${compareSecond}`);
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

  const getStudentAvatar = (student?: any) => {
    if (student?.avatar_url) return student.avatar_url;
    if (student?.avatar) return student.avatar;
    if (student?.full_name?.toLowerCase().includes('mariana')) {
      return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150';
    }
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
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

  // Quick stats
  const totalCount = assessments.length;
  const avgWeight = assessments.length
    ? Math.round((assessments.reduce((acc, a) => acc + (a.body_composition?.weightKg || 0), 0) / assessments.length) * 10) / 10
    : 0;
  const avgFat = assessments.length
    ? Math.round((assessments.reduce((acc, a) => acc + (a.body_composition?.bodyFatPercent || 0), 0) / assessments.length) * 10) / 10
    : 0;
  const latestDate = assessments[0]?.assessment_date ? formatDate(assessments[0].assessment_date) : '-';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: '100%' }}>
      {/* 1. Header: Title + Subtitle + Action Buttons */}
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
            Avaliações Físicas
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Registro de composição corporal, perímetros, dobras cutâneas e comparativos longitudinais.
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

          {assessments.length >= 2 && (
            <button
              onClick={() => setIsCompareModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#1C1C1C',
                color: 'var(--text-primary)',
                border: '1px solid #2A2A2A',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#252525')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1C1C1C')}
            >
              <ArrowRightLeft size={15} />
              <span>Comparar Avaliações</span>
            </button>
          )}

          {/* Solid Minimalist CTA Button (No Gradient) */}
          <button
            onClick={() => setIsModalOpen(true)}
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
            <span>Nova Avaliação</span>
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
              Total Avaliações
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
              color: 'var(--text-secondary)',
            }}
          >
            <FileCheck2 size={18} />
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
              Peso Médio
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              {avgWeight} kg
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
              color: '#38BDF8',
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
              Gordura Média (%BF)
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#FBBF24', marginTop: 2 }}>
              {avgFat}%
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FBBF24',
            }}
          >
            <TrendingDown size={18} />
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
              Última Realizada
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#34D399', marginTop: 4 }}>
              {latestDate}
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
            <Calendar size={18} />
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
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Buscar por aluno ou parecer técnico..."
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

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', overflowX: 'auto' }}>
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border: typeFilter === 'all' ? '1px solid #D90000' : '1px solid #282828',
              backgroundColor: typeFilter === 'all' ? '#D90000' : '#1A1A1A',
              color: typeFilter === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            Todas ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('periodica')}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border: typeFilter === 'periodica' ? '1px solid #D90000' : '1px solid #282828',
              backgroundColor: typeFilter === 'periodica' ? '#D90000' : '#1A1A1A',
              color: typeFilter === 'periodica' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            Periódicas
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('inicial')}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border: typeFilter === 'inicial' ? '1px solid #D90000' : '1px solid #282828',
              backgroundColor: typeFilter === 'inicial' ? '#D90000' : '#1A1A1A',
              color: typeFilter === 'inicial' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            Iniciais
          </button>
        </div>

        {/* Filter by Student */}
        {students.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Aluno:
            </span>
            <select
              value={selectedStudentFilter}
              onChange={(e) => setSelectedStudentFilter(e.target.value)}
              style={{
                backgroundColor: '#1A1A1A',
                border: '1px solid #2A2A2A',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                fontSize: 12,
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Todos os Alunos</option>
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.full_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 4. Content Area: Grid vs Table View */}
      {loading ? (
        <div style={{ padding: 60 }}>
          <Loader text="Carregando avaliações físicas..." />
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div
          style={{
            backgroundColor: '#141414',
            border: '1px solid #222222',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 24px',
          }}
        >
          <EmptyState
            icon={<FileCheck2 size={40} />}
            title="Nenhuma avaliação encontrada"
            description={
              search || typeFilter !== 'all' || selectedStudentFilter !== 'all'
                ? 'Nenhum resultado corresponde aos filtros selecionados.'
                : 'Cadastre a avaliação inicial dos seus alunos com cálculo automático de IMC, massa magra e gordura.'
            }
            actionLabel={search ? undefined : '+ Nova Avaliação'}
            onAction={search ? undefined : () => setIsModalOpen(true)}
          />
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW (Modern Responsive Cards) */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 16,
          }}
        >
          {filteredAssessments.map((a) => {
            const comp = a.body_composition || {};
            const studentName = a.student?.full_name || 'Aluno DragonCorp';

            return (
              <div
                key={a.id}
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
                {/* Card Header: Student + Date + Type Badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                      src={getStudentAvatar(a.student)}
                      alt={studentName}
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
                      }}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 'var(--radius-sm)',
                        objectFit: 'cover',
                        border: '1px solid #2A2A2A',
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {studentName}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                        <Calendar size={12} />
                        <span>{formatDate(a.assessment_date)}</span>
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
                        a.type === 'inicial'
                          ? 'rgba(59, 130, 246, 0.12)'
                          : 'rgba(16, 185, 129, 0.12)',
                      color: a.type === 'inicial' ? '#38BDF8' : '#34D399',
                      border:
                        a.type === 'inicial'
                          ? '1px solid rgba(59, 130, 246, 0.25)'
                          : '1px solid rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    {a.type || 'Periódica'}
                  </span>
                </div>

                {/* 4 Metrics Clean Minimalist Box */}
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
                      Peso Corporal
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                      {comp.weightKg ? `${comp.weightKg} kg` : '-'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Gordura (%BF)
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#FBBF24', marginTop: 2 }}>
                      {comp.bodyFatPercent ? `${comp.bodyFatPercent}%` : '-'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Massa Magra
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#34D399', marginTop: 2 }}>
                      {comp.leanMassKg ? `${comp.leanMassKg} kg` : '-'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Índice IMC
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                      {comp.bmi || '-'}
                    </div>
                  </div>
                </div>

                {/* Technical Note Preview */}
                {a.conclusion && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      backgroundColor: '#181818',
                      border: '1px solid #222222',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    💬 {a.conclusion}
                  </div>
                )}

                {/* Card Action Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 4,
                    borderTop: '1px solid #1E1E1E',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCompareFirst(a.id);
                      setIsCompareModalOpen(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: '#1E1E1E',
                      border: '1px solid #282828',
                      color: 'var(--text-secondary)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowRightLeft size={12} />
                    <span>Comparar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAssessmentForDetail(a)}
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
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2E2E2E';
                      e.currentTarget.style.borderColor = '#444444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#242424';
                      e.currentTarget.style.borderColor = '#333333';
                    }}
                  >
                    <Eye size={13} />
                    <span>Ver Relatório</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW (Clean & Formatted Dates) */
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
                  Data
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Aluno
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Tipo
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Peso (kg)
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Gordura (%BF)
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Massa Magra
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  IMC
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Parecer Técnico
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'right' }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAssessments.map((a) => {
                const comp = a.body_composition || {};

                return (
                  <tr
                    key={a.id}
                    style={{ borderBottom: '1px solid #1C1C1C', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#181818')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text-primary)' }}>
                        <Calendar size={13} color="var(--text-muted)" />
                        <span>{formatDate(a.assessment_date)}</span>
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={getStudentAvatar(a.student)}
                          alt={a.student?.full_name || 'Aluno'}
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
                          }}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 'var(--radius-sm)',
                            objectFit: 'cover',
                            border: '1px solid #2A2A2A',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {a.student?.full_name || 'Aluno DragonCorp'}
                        </span>
                      </div>
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
                            a.type === 'inicial'
                              ? 'rgba(59, 130, 246, 0.12)'
                              : 'rgba(16, 185, 129, 0.12)',
                          color: a.type === 'inicial' ? '#38BDF8' : '#34D399',
                        }}
                      >
                        {a.type || 'Periódica'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {comp.weightKg ? `${comp.weightKg} kg` : '-'}
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#FBBF24' }}>
                      {comp.bodyFatPercent ? `${comp.bodyFatPercent}%` : '-'}
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#34D399' }}>
                      {comp.leanMassKg ? `${comp.leanMassKg} kg` : '-'}
                    </td>

                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {comp.bmi || '-'}
                    </td>

                    <td
                      style={{
                        padding: '12px 16px',
                        maxWidth: 220,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'var(--text-muted)',
                        fontSize: 12,
                      }}
                    >
                      {a.conclusion || 'Sem parecer registrado.'}
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedAssessmentForDetail(a)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#242424',
                          border: '1px solid #333333',
                          color: '#FFFFFF',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Detalhes Completos da Avaliação */}
      <Modal
        isOpen={Boolean(selectedAssessmentForDetail)}
        onClose={() => setSelectedAssessmentForDetail(null)}
        title={`Relatório de Avaliação Física`}
        maxWidth={580}
      >
        {selectedAssessmentForDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header info */}
            <div
              style={{
                backgroundColor: '#1E1E1E',
                border: '1px solid #2A2A2A',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={getStudentAvatar(selectedAssessmentForDetail.student)}
                  alt={selectedAssessmentForDetail.student?.full_name || 'Aluno'}
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius-sm)',
                    objectFit: 'cover',
                    border: '1px solid #333333',
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selectedAssessmentForDetail.student?.full_name || 'Aluno'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Data: {formatDate(selectedAssessmentForDetail.assessment_date)} • Tipo: {selectedAssessmentForDetail.type?.toUpperCase()}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const id = selectedAssessmentForDetail.id;
                  setSelectedAssessmentForDetail(null);
                  setCompareFirst(id);
                  setIsCompareModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#262626',
                  border: '1px solid #333',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <ArrowRightLeft size={13} />
                <span>Comparar</span>
              </button>
            </div>

            {/* Composição Corporal */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.4, marginBottom: 8 }}>
                Composição Corporal & Métricas
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div style={{ backgroundColor: '#181818', border: '1px solid #262626', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Peso Total</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                    {selectedAssessmentForDetail.body_composition?.weightKg || '-'} kg
                  </div>
                </div>

                <div style={{ backgroundColor: '#181818', border: '1px solid #262626', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>% Gordura</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#FBBF24', marginTop: 2 }}>
                    {selectedAssessmentForDetail.body_composition?.bodyFatPercent || '-'}%
                  </div>
                </div>

                <div style={{ backgroundColor: '#181818', border: '1px solid #262626', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Massa Magra</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#34D399', marginTop: 2 }}>
                    {selectedAssessmentForDetail.body_composition?.leanMassKg || '-'} kg
                  </div>
                </div>

                <div style={{ backgroundColor: '#181818', border: '1px solid #262626', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Altura</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                    {selectedAssessmentForDetail.body_composition?.heightCm || '-'} cm
                  </div>
                </div>

                <div style={{ backgroundColor: '#181818', border: '1px solid #262626', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>IMC</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                    {selectedAssessmentForDetail.body_composition?.bmi || '-'}
                  </div>
                </div>

                <div style={{ backgroundColor: '#181818', border: '1px solid #262626', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Método</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                    {selectedAssessmentForDetail.body_composition?.method?.toUpperCase() || 'DOBRAS'}
                  </div>
                </div>
              </div>
            </div>

            {/* Perímetros */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.4, marginBottom: 8 }}>
                Perímetros & Circunferências
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div style={{ backgroundColor: '#181818', border: '1px solid #262626', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Cintura</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                    {selectedAssessmentForDetail.perimeters?.waist ? `${selectedAssessmentForDetail.perimeters.waist} cm` : '80.0 cm'}
                  </div>
                </div>

                <div style={{ backgroundColor: '#181818', border: '1px solid #262626', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Tórax</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                    {selectedAssessmentForDetail.perimeters?.chest ? `${selectedAssessmentForDetail.perimeters.chest} cm` : '98.0 cm'}
                  </div>
                </div>

                <div style={{ backgroundColor: '#181818', border: '1px solid #262626', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Braço Contraído</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                    {selectedAssessmentForDetail.perimeters?.rightArmContracted ? `${selectedAssessmentForDetail.perimeters.rightArmContracted} cm` : '36.0 cm'}
                  </div>
                </div>
              </div>
            </div>

            {/* Parecer Técnico */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.4, marginBottom: 6 }}>
                Parecer Técnico & Recomendações
              </div>
              <div
                style={{
                  backgroundColor: '#181818',
                  border: '1px solid #262626',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  lineHeight: 1.5,
                }}
              >
                {selectedAssessmentForDetail.conclusion || 'Nenhum parecer técnico detalhado foi registrado nesta avaliação.'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedAssessmentForDetail(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#242424',
                  border: '1px solid #333',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Nova Avaliação (Clean Minimalist Form) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Avaliação Física"
        maxWidth={620}
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

        <form onSubmit={handleCreateAssessment}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Aluno *</label>
              <select
                className="form-select"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Data da Avaliação *</label>
              <input
                type="date"
                className="form-input"
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Peso (kg) *</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={weightKg}
                onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Altura (cm) *</label>
              <input
                type="number"
                className="form-input"
                value={heightCm}
                onChange={(e) => setHeightCm(parseInt(e.target.value) || 0)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">% Gordura *</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={bodyFatPercent}
                onChange={(e) => setBodyFatPercent(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Cintura (cm)</label>
              <input
                type="number"
                step="0.5"
                className="form-input"
                value={waistCm}
                onChange={(e) => setWaistCm(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tórax (cm)</label>
              <input
                type="number"
                step="0.5"
                className="form-input"
                value={chestCm}
                onChange={(e) => setChestCm(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Braço Contraído (cm)</label>
              <input
                type="number"
                step="0.5"
                className="form-input"
                value={armCm}
                onChange={(e) => setArmCm(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Conclusão e Recomendações do Personal</label>
            <textarea
              className="form-textarea"
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              placeholder="Ex: Excelente evolução. Manter ingestão proteica e foco em deltoides..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
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
              {saving ? 'Salvando...' : 'Salvar Avaliação'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Comparador */}
      <Modal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        title="Selecionar Avaliações para Comparar"
        maxWidth={480}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Avaliação Anterior (Base)</label>
            <select
              className="form-select"
              value={compareFirst}
              onChange={(e) => setCompareFirst(e.target.value)}
            >
              <option value="">Selecione a primeira...</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatDate(a.assessment_date)} — {a.student?.full_name} ({a.body_composition?.weightKg} kg)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Avaliação Posterior (Atual)</label>
            <select
              className="form-select"
              value={compareSecond}
              onChange={(e) => setCompareSecond(e.target.value)}
            >
              <option value="">Selecione a segunda...</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatDate(a.assessment_date)} — {a.student?.full_name} ({a.body_composition?.weightKg} kg)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
            <button
              type="button"
              onClick={() => setIsCompareModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGoCompare}
              style={{
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 800,
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#D90000',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Comparar Agora
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
