import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Dumbbell,
  MessageSquare,
  AlertCircle,
  Phone,
  ArrowRight,
  MoreHorizontal,
  Activity,
  Calendar,
  Trophy,
  FileCheck2,
  X,
  User,
  LayoutGrid,
  List,
  Mail,
  Clock,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { StudentProfile } from '../types';
import { Modal } from '../components/common/Modal';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';

export const StudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'adherence'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedStudentForMenu, setSelectedStudentForMenu] = useState<StudentProfile | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newStudent, setNewStudent] = useState({
    fullName: '',
    email: '',
    phone: '',
    mainGoal: '',
    gender: 'male',
    profession: '',
    administrativeNotes: '',
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const res = await apiClient.get(`/students?${params.toString()}`);
      setStudents(res.data.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchStudents();
    }, 180);
    return () => clearTimeout(timeout);
  }, [search, statusFilter]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      await apiClient.post('/students', newStudent);
      setIsModalOpen(false);
      setNewStudent({
        fullName: '',
        email: '',
        phone: '',
        mainGoal: '',
        gender: 'male',
        profession: '',
        administrativeNotes: '',
      });
      fetchStudents();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Falha ao cadastrar aluno.');
    } finally {
      setSaving(false);
    }
  };

  const totalCount = students.length;
  const activeCount = students.filter((s) => s.status === 'ativo').length;
  const inactiveCount = students.filter((s) => s.status === 'inativo').length;
  const pendingCount = students.filter((s) => s.status === 'pausado' || s.status === 'aguardando_inicio').length;

  // Sorting
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      if (sortBy === 'name') {
        return (a.full_name || '').localeCompare(b.full_name || '');
      }
      if (sortBy === 'adherence') {
        const adhA = a.follow_up_summary?.adherencePercent ?? 90;
        const adhB = b.follow_up_summary?.adherencePercent ?? 90;
        return adhB - adhA;
      }
      return 0;
    });
  }, [students, sortBy]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: '100%' }}>
      {/* 1. Header Section: Title + Subtitle + Stats Capsules + New Student CTA */}
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
            Alunos
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Acompanhe o progresso, gerencie treinos e acesse o histórico completo dos seus alunos.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* View Mode Switcher */}
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
            <span>Novo Aluno</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Stat Counters */}
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
              Total de Alunos
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
            <Users size={18} />
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
              Alunos Ativos
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#34D399', marginTop: 2 }}>
              {activeCount}
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
            <CheckCircle2 size={18} />
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
              Aguardando / Pausados
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#FBBF24', marginTop: 2 }}>
              {pendingCount}
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
            <Clock size={18} />
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
              Inativos
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-muted)', marginTop: 2 }}>
              {inactiveCount}
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
              color: 'var(--text-muted)',
            }}
          >
            <AlertCircle size={18} />
          </div>
        </div>
      </div>

      {/* 3. Minimal Search and Filter Toolbar */}
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
        {/* Search Box */}
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Buscar por nome, objetivo, e-mail ou telefone..."
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
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border: statusFilter === 'all' ? '1px solid #D90000' : '1px solid #282828',
              backgroundColor: statusFilter === 'all' ? '#D90000' : '#1A1A1A',
              color: statusFilter === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
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
              backgroundColor: statusFilter === 'ativo' ? '#D90000' : '#1A1A1A',
              color: statusFilter === 'ativo' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            Ativos ({activeCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pausado')}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border: statusFilter === 'pausado' ? '1px solid #D90000' : '1px solid #282828',
              backgroundColor: statusFilter === 'pausado' ? '#D90000' : '#1A1A1A',
              color: statusFilter === 'pausado' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            Pendentes ({pendingCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('inativo')}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border: statusFilter === 'inativo' ? '1px solid #D90000' : '1px solid #282828',
              backgroundColor: statusFilter === 'inativo' ? '#D90000' : '#1A1A1A',
              color: statusFilter === 'inativo' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            Inativos ({inactiveCount})
          </button>
        </div>

        {/* Sort Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Ordem:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
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
            <option value="name">Nome (A-Z)</option>
            <option value="recent">Mais Recentes</option>
            <option value="adherence">Maior Aderência</option>
          </select>
        </div>
      </div>

      {/* 4. Content Area: Grid vs Table View */}
      {loading ? (
        <div style={{ padding: 60 }}>
          <Loader text="Carregando alunos..." />
        </div>
      ) : sortedStudents.length === 0 ? (
        <div
          style={{
            backgroundColor: '#141414',
            border: '1px solid #222222',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 24px',
          }}
        >
          <EmptyState
            title="Nenhum aluno encontrado"
            description={
              search
                ? 'Nenhum resultado corresponde à sua pesquisa.'
                : 'Cadastre o primeiro aluno da sua consultoria para começar.'
            }
            actionLabel={search ? undefined : '+ Novo Aluno'}
            onAction={search ? undefined : () => setIsModalOpen(true)}
          />
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW (2-3 Responsive Columns on Desktop) */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 16,
          }}
        >
          {sortedStudents.map((st) => {
            const adherence = st.follow_up_summary?.adherencePercent ?? 94;
            const frequency = st.follow_up_summary?.plannedTrainingFrequency || 4;
            const currentPlan = st.active_plans?.[0]?.name || 'Hipertrofia e Força';
            const phone = st.contact?.phone || '';

            return (
              <div
                key={st.id}
                style={{
                  backgroundColor: '#141414',
                  border: '1px solid #222222',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  transition: 'border-color 0.2s ease, transform 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#383838';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#222222';
                }}
              >
                {/* Card Header: Avatar + Name + Status Badge + More Menu */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div
                    onClick={() => navigate(`/alunos/${st.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1, minWidth: 0 }}
                  >
                    <img
                      src={st.avatar_url || st.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
                      alt={st.full_name}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 'var(--radius-full)',
                        objectFit: 'cover',
                        border: '1.5px solid #2A2A2A',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {st.full_name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: 1,
                        }}
                      >
                        {st.main_goal || 'Hipertrofia e Condicionamento'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor:
                          st.status === 'ativo'
                            ? 'rgba(16, 185, 129, 0.12)'
                            : st.status === 'aguardando_inicio' || st.status === 'pausado'
                            ? 'rgba(245, 158, 11, 0.12)'
                            : 'rgba(239, 68, 68, 0.12)',
                        color:
                          st.status === 'ativo'
                            ? '#34D399'
                            : st.status === 'aguardando_inicio' || st.status === 'pausado'
                            ? '#FBBF24'
                            : '#F87171',
                        border:
                          st.status === 'ativo'
                            ? '1px solid rgba(16, 185, 129, 0.25)'
                            : st.status === 'aguardando_inicio' || st.status === 'pausado'
                            ? '1px solid rgba(245, 158, 11, 0.25)'
                            : '1px solid rgba(239, 68, 68, 0.25)',
                      }}
                    >
                      {st.status === 'ativo' ? 'Ativo' : st.status === 'pausado' ? 'Pausado' : 'Inativo'}
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedStudentForMenu(st)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#1E1E1E',
                        border: '1px solid #282828',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      title="Mais opções"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>

                {/* Metrics 2x2 Clean Minimalist Box */}
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
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Dumbbell size={11} color="var(--primary)" /> Ficha Ativa
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {currentPlan}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} color="#34D399" /> Frequência
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                      {frequency}x / semana
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Trophy size={11} color="#FBBF24" /> Aderência
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#34D399', marginTop: 2 }}>
                      {adherence}% consistente
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Activity size={11} color="#38BDF8" /> Último Treino
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                      Hoje às 09:30
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 4,
                    borderTop: '1px solid #1E1E1E',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {phone && (
                      <button
                        type="button"
                        onClick={() => window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#1E1E1E',
                          border: '1px solid #282828',
                          color: '#34D399',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        title="Conversar no WhatsApp"
                      >
                        <Phone size={13} />
                        <span>WhatsApp</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => navigate(`/treinos/novo?studentId=${st.id}`)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#1E1E1E',
                        border: '1px solid #282828',
                        color: 'var(--text-primary)',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title="Montar treino para este aluno"
                    >
                      <Plus size={13} color="var(--primary)" />
                      <span>Treino</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/alunos/${st.id}`)}
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
                    <span>Ver Perfil</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW (Dense Minimalist View) */
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
                  Aluno
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Objetivo
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Ficha Atual
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Aderência
                </th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'right' }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((st) => {
                const adherence = st.follow_up_summary?.adherencePercent ?? 94;
                const currentPlan = st.active_plans?.[0]?.name || 'Hipertrofia e Força';
                const phone = st.contact?.phone || '';

                return (
                  <tr
                    key={st.id}
                    style={{ borderBottom: '1px solid #1C1C1C', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#181818')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div
                        onClick={() => navigate(`/alunos/${st.id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                      >
                        <img
                          src={st.avatar_url || st.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={st.full_name}
                          style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{st.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{st.contact?.email || 'aluno@dragoncorp.com'}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor:
                            st.status === 'ativo'
                              ? 'rgba(16, 185, 129, 0.12)'
                              : st.status === 'pausado'
                              ? 'rgba(245, 158, 11, 0.12)'
                              : 'rgba(239, 68, 68, 0.12)',
                          color:
                            st.status === 'ativo'
                              ? '#34D399'
                              : st.status === 'pausado'
                              ? '#FBBF24'
                              : '#F87171',
                        }}
                      >
                        {st.status === 'ativo' ? 'Ativo' : st.status === 'pausado' ? 'Pausado' : 'Inativo'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {st.main_goal || 'Hipertrofia'}
                    </td>

                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {currentPlan}
                    </td>

                    <td style={{ padding: '12px 16px', color: '#34D399', fontWeight: 700 }}>
                      {adherence}% consistente
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {phone && (
                          <button
                            type="button"
                            onClick={() => window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank')}
                            style={{
                              padding: '5px 8px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: '#1E1E1E',
                              border: '1px solid #2A2A2A',
                              color: '#34D399',
                              cursor: 'pointer',
                            }}
                            title="WhatsApp"
                          >
                            <Phone size={13} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => navigate(`/alunos/${st.id}`)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: '#242424',
                            border: '1px solid #333333',
                            color: '#FFFFFF',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Ver Perfil
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedStudentForMenu(st)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: '#1E1E1E',
                            border: '1px solid #2A2A2A',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                          }}
                        >
                          <MoreHorizontal size={13} />
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

      {/* Modal: Novo Aluno (Minimalist Form) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Novo Aluno"
        maxWidth={540}
      >
        <form onSubmit={handleCreateStudent}>
          {formError && (
            <div
              style={{
                padding: '10px 14px',
                marginBottom: 16,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
              <span>{formError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nome Completo *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="Ex: João da Silva"
              value={newStudent.fullName}
              onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">WhatsApp / Telefone</label>
              <input
                type="text"
                className="form-input"
                placeholder="(11) 98765-4321"
                value={newStudent.phone}
                onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                type="email"
                className="form-input"
                placeholder="aluno@email.com"
                value={newStudent.email}
                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Objetivo Principal</label>
              <select
                className="form-select"
                value={newStudent.mainGoal}
                onChange={(e) => setNewStudent({ ...newStudent, mainGoal: e.target.value })}
              >
                <option value="">Selecione...</option>
                <option value="Hipertrofia">Hipertrofia</option>
                <option value="Emagrecimento">Emagrecimento / Definição</option>
                <option value="Condicionamento Físico">Condicionamento Físico</option>
                <option value="Saúde e Longevidade">Saúde e Longevidade</option>
                <option value="Performance Esportiva">Performance Esportiva</option>
                <option value="Reabilitação">Reabilitação</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Sexo</label>
              <select
                className="form-select"
                value={newStudent.gender}
                onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
              >
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
                <option value="not_informed">Não Informado</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
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
              {saving ? 'Cadastrando...' : 'Salvar Aluno'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Student Action Menu */}
      <Modal
        isOpen={Boolean(selectedStudentForMenu)}
        onClose={() => setSelectedStudentForMenu(null)}
        title={selectedStudentForMenu?.full_name || 'Ações do Aluno'}
        maxWidth={420}
      >
        {selectedStudentForMenu && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                const id = selectedStudentForMenu.id;
                setSelectedStudentForMenu(null);
                navigate(`/alunos/${id}`);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#1C1C1C',
                border: '1px solid #282828',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <User size={16} color="var(--primary)" />
              <span>Ver Perfil Completo do Aluno</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const id = selectedStudentForMenu.id;
                setSelectedStudentForMenu(null);
                navigate(`/treinos/novo?studentId=${id}`);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#1C1C1C',
                border: '1px solid #282828',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Dumbbell size={16} color="var(--primary)" />
              <span>Montar Novo Treino</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const id = selectedStudentForMenu.id;
                setSelectedStudentForMenu(null);
                navigate(`/avaliacoes`);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#1C1C1C',
                border: '1px solid #282828',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <FileCheck2 size={16} color="#34D399" />
              <span>Realizar Avaliação Física</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const id = selectedStudentForMenu.id;
                setSelectedStudentForMenu(null);
                navigate(`/mensagens`);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#1C1C1C',
                border: '1px solid #282828',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <MessageSquare size={16} color="#38BDF8" />
              <span>Enviar Mensagem</span>
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
