import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileCheck2,
  Dumbbell,
  CalendarCheck,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Modal } from '../components/common/Modal';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';

interface AgendaEvent {
  id: string;
  title: string;
  type: 'assessment' | 'training' | 'reassessment' | 'consultation' | string;
  date: string;
  time: string;
  student_id: string;
  student_name: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | string;
  notes?: string;
  detail?: string;
  startAt?: string;
  endAt?: string;
}

interface StudentOption {
  id: string;
  name?: string;
  full_name?: string;
  email?: string;
}

export const AgendaPage: React.FC = () => {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'assessment' | 'training' | 'reassessment'>('all');

  // Modal New Event
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'training' as string,
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    student_id: '',
    notes: '',
  });

  const normalizeEvent = (ev: any, index: number = 0): AgendaEvent => {
    const start = ev.startAt || ev.start_at || ev.date || '';
    let dateStr = ev.date || '';
    let timeStr = ev.time || '';
    if (!dateStr && typeof start === 'string' && start.includes('T')) {
      dateStr = start.split('T')[0];
      timeStr = start.split('T')[1]?.substring(0, 5) || '09:00';
    } else if (!dateStr && start) {
      dateStr = String(start);
    }
    if (!timeStr) timeStr = '09:00';

    let eventType = ev.type || 'training';
    if (eventType === 'session') eventType = 'training';

    return {
      id: String(ev.id || `evt-${index}-${Date.now()}`),
      title: ev.title || (eventType === 'assessment' ? 'Avaliação Física' : 'Sessão de Treino'),
      type: eventType,
      date: dateStr || new Date().toISOString().split('T')[0],
      time: timeStr,
      student_id: String(ev.student_id || ev.studentId || ''),
      student_name: ev.student_name || ev.studentName || 'Aluno',
      status: (ev.status || ev.statusLabel || 'Agendado').toLowerCase(),
      notes: ev.notes || ev.detail || '',
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [agendaRes, studentsRes] = await Promise.allSettled([
        apiClient.get('/agenda'),
        apiClient.get('/students'),
      ]);

      let rawAgendaList: any[] = [];
      if (agendaRes.status === 'fulfilled') {
        const d = agendaRes.value.data;
        if (Array.isArray(d)) {
          rawAgendaList = d;
        } else if (Array.isArray(d?.events)) {
          rawAgendaList = d.events;
        } else if (Array.isArray(d?.data)) {
          rawAgendaList = d.data;
        } else if (Array.isArray(d?.agenda)) {
          rawAgendaList = d.agenda;
        }
      }

      let rawStudentsList: any[] = [];
      if (studentsRes.status === 'fulfilled') {
        const d = studentsRes.value.data;
        if (Array.isArray(d)) {
          rawStudentsList = d;
        } else if (Array.isArray(d?.students)) {
          rawStudentsList = d.students;
        } else if (Array.isArray(d?.data)) {
          rawStudentsList = d.data;
        }
      }

      const normalized = rawAgendaList.map((ev, idx) => normalizeEvent(ev, idx));
      setEvents(normalized);
      setStudents(rawStudentsList);
    } catch (err: any) {
      console.error('Erro ao carregar agenda:', err);
      setError('Não foi possível carregar os dados da agenda. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id) {
      alert('Selecione um aluno para o agendamento.');
      return;
    }

    try {
      setSaving(true);
      const student = students.find((s: any) => s.id === formData.student_id);
      const studentName = (student as any)?.full_name || (student as any)?.name || 'Aluno';

      const payload = {
        title: formData.title || (formData.type === 'assessment' ? 'Avaliação Física' : 'Sessão de Treino'),
        detail: formData.notes || formData.title || 'Agendamento cadastrado via painel web.',
        notes: formData.notes,
        type: formData.type === 'training' ? 'session' : formData.type,
        startAt: `${formData.date}T${formData.time}:00`,
        date: formData.date,
        time: formData.time,
        studentId: formData.student_id,
        student_id: formData.student_id,
        studentName: studentName,
        student_name: studentName,
      };

      const res = await apiClient.post('/agenda', payload);
      const newRawEvent = res.data?.event || res.data?.data || res.data;
      const newEvent = normalizeEvent(newRawEvent, 0);

      setEvents((prev) => [newEvent, ...(Array.isArray(prev) ? prev : [])]);
      setIsModalOpen(false);
      setFormData({
        title: '',
        type: 'training',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        student_id: '',
        notes: '',
      });
    } catch (err: any) {
      console.error('Erro ao salvar agendamento:', err);
      alert('Erro ao criar agendamento. Verifique os campos preenchidos.');
    } finally {
      setSaving(false);
    }
  };

  const safeEvents = Array.isArray(events) ? events : [];

  const filteredEvents = safeEvents.filter((ev) => {
    if (selectedFilter !== 'all' && ev.type !== selectedFilter) return false;
    return true;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'assessment':
        return 'Avaliação Física';
      case 'reassessment':
        return 'Reavaliação';
      case 'consultation':
        return 'Consultoria';
      default:
        return 'Sessão de Treino';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'assessment':
        return 'var(--accent-red)';
      case 'reassessment':
        return '#eab308';
      case 'consultation':
        return '#3b82f6';
      default:
        return '#10b981';
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Agenda e Reavaliações
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '4px 0 0' }}>
            Gerencie sessões presenciais, reavaliações programadas e consultorias com seus alunos.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'var(--accent-red)',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
          >
            <Plus size={18} />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* 2. Top 4 Sleek Minimalist Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div className="stat-card-sleek">
          <div className="stat-card-sleek-header">
            <span className="stat-card-sleek-title">Total Agendados</span>
            <div className="icon-badge icon-badge-primary" style={{ width: 34, height: 34 }}>
              <CalendarIcon size={17} />
            </div>
          </div>
          <div>
            <div className="stat-card-sleek-value">{safeEvents.length}</div>
            <div className="stat-card-sleek-footer" style={{ marginTop: 4 }}>
              <span>Compromissos no período</span>
            </div>
          </div>
        </div>

        <div className="stat-card-sleek">
          <div className="stat-card-sleek-header">
            <span className="stat-card-sleek-title">Avaliações / Reaval.</span>
            <div className="icon-badge icon-badge-warning" style={{ width: 34, height: 34 }}>
              <FileCheck2 size={17} />
            </div>
          </div>
          <div>
            <div className="stat-card-sleek-value" style={{ color: 'var(--color-warning)' }}>
              {safeEvents.filter((e) => e.type === 'assessment' || e.type === 'reassessment').length}
            </div>
            <div className="stat-card-sleek-footer" style={{ marginTop: 4, color: 'var(--color-warning)', fontWeight: 700 }}>
              <span>Sessões antropométricas</span>
            </div>
          </div>
        </div>

        <div className="stat-card-sleek">
          <div className="stat-card-sleek-header">
            <span className="stat-card-sleek-title">Treinos Presenciais</span>
            <div className="icon-badge icon-badge-info" style={{ width: 34, height: 34 }}>
              <Dumbbell size={17} />
            </div>
          </div>
          <div>
            <div className="stat-card-sleek-value" style={{ color: 'var(--color-info)' }}>
              {safeEvents.filter((e) => e.type === 'training' || e.type === 'session').length}
            </div>
            <div className="stat-card-sleek-footer" style={{ marginTop: 4 }}>
              <span>Acompanhamento em sala</span>
            </div>
          </div>
        </div>

        <div className="stat-card-sleek">
          <div className="stat-card-sleek-header">
            <span className="stat-card-sleek-title">Confirmados / Concluídos</span>
            <div className="icon-badge icon-badge-success" style={{ width: 34, height: 34 }}>
              <CheckCircle2 size={17} />
            </div>
          </div>
          <div>
            <div className="stat-card-sleek-value" style={{ color: 'var(--color-success)' }}>
              {safeEvents.filter((e) => e.status === 'completed' || e.status === 'confirmed' || e.status === 'confirmado').length}
            </div>
            <div className="stat-card-sleek-footer" style={{ marginTop: 4, color: 'var(--color-success)', fontWeight: 700 }}>
              <span>Atendimentos confirmados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 16px',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(
            [
              { id: 'all', label: 'Todos os Compromissos' },
              { id: 'assessment', label: 'Avaliações' },
              { id: 'reassessment', label: 'Reavaliações' },
              { id: 'training', label: 'Treinos Presenciais' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              style={{
                backgroundColor: selectedFilter === filter.id ? 'var(--card-highlighted)' : 'transparent',
                color: selectedFilter === filter.id ? '#FFFFFF' : 'var(--text-muted)',
                border: selectedFilter === filter.id ? '1px solid var(--accent-red)' : '1px solid var(--border-color)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
            Total: {filteredEvents.length} registros
          </span>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
          <Loader text="Carregando compromissos da agenda..." />
        </div>
      ) : error ? (
        <div
          style={{
            backgroundColor: 'var(--color-danger-subtle)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            color: '#FF6B6B',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <AlertCircle size={20} color="var(--accent-red)" />
          <span>{error}</span>
          <button
            onClick={loadData}
            style={{
              marginLeft: 'auto',
              backgroundColor: 'transparent',
              color: 'var(--accent-red)',
              border: '1px solid var(--accent-red)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            Tentar Novamente
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title="Nenhum agendamento encontrado"
          description="Você não possui compromissos cadastrados para este filtro."
          actionLabel="Criar Agendamento"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: 18,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    className="icon-badge"
                    style={{
                      width: 36,
                      height: 36,
                      backgroundColor: `${getTypeBadgeColor(ev.type)}18`,
                      borderColor: `${getTypeBadgeColor(ev.type)}40`,
                      color: getTypeBadgeColor(ev.type),
                    }}
                  >
                    {ev.type === 'training' ? <Dumbbell size={16} /> : <FileCheck2 size={16} />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {ev.title || getTypeLabel(ev.type)}
                    </h3>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: getTypeBadgeColor(ev.type),
                        marginTop: 2,
                      }}
                    >
                      {getTypeLabel(ev.type)}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    color:
                      ev.status === 'completed' || ev.status === 'confirmed' || ev.status === 'confirmado'
                        ? 'var(--color-success)'
                        : 'var(--text-muted)',
                  }}
                >
                  {ev.status === 'completed' ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                  <span style={{ textTransform: 'capitalize' }}>{ev.status || 'Agendado'}</span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--card-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontSize: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={13} color="var(--text-muted)" />
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{ev.student_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarIcon size={13} color="var(--text-muted)" />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {ev.date} às {ev.time}
                  </span>
                </div>
                {ev.notes && (
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--divider)', paddingTop: 6 }}>
                    "{ev.notes}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Agendamento */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Agendamento"
        subtitle="Agende uma sessão, avaliação ou consultoria com seu aluno"
        maxWidth={550}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleCreateEvent}
              style={{
                backgroundColor: 'var(--accent-red)',
                border: 'none',
                color: '#fff',
                padding: '8px 20px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Salvando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Aluno *
            </label>
            <select
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              required
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
              }}
            >
              <option value="">Selecione um aluno...</option>
              {students.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.name} {s.email ? `(${s.email})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Tipo de Compromisso *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
              }}
            >
              <option value="training">Sessão de Treino Presencial</option>
              <option value="assessment">Avaliação Física</option>
              <option value="reassessment">Reavaliação Periódica</option>
              <option value="consultation">Consultoria / Feedback</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Título ou Descrição Curta
            </label>
            <input
              type="text"
              placeholder="Ex: Treino de Força / Reavaliação Antropométrica"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Data *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 14,
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Horário *
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 14,
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Observações / Metas da Sessão
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Focar em amplitude de movimento e registrar cargas."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                resize: 'vertical',
              }}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
