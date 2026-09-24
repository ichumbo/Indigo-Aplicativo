import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  Heart,
  Flame,
  Plus,
  Trash2,
  Search,
  X,
  Gauge,
  Smartphone,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { StudentProfile } from '../types';
import { Modal } from '../components/common/Modal';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';

export const ProtocolsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedStudentId = searchParams.get('student_id') || '';

  const [protocols, setProtocols] = useState<any[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>(preselectedStudentId);
  const [search, setSearch] = useState<string>('');

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [studentId, setStudentId] = useState<string>(preselectedStudentId);
  const [title, setTitle] = useState<string>('PROTOCOLO AERÓBIO & CONCONI');
  const [type] = useState<string>('aerobio');
  const [protocolDate, setProtocolDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [warmupText, setWarmupText] = useState<string>('5 minutos de aquecimento na esteira - 4 a 6km/h (progressivo)');

  // Conconi metrics
  const [deflectionHR, setDeflectionHR] = useState<number>(156);
  const [deflectionSpeed, setDeflectionSpeed] = useState<number>(6.5);
  const [maxHR, setMaxHR] = useState<number>(172);
  const [vo2Max, setVo2Max] = useState<number>(42.5);

  // Days Prescription
  const [daysPrescription, setDaysPrescription] = useState<any[]>([
    {
      id: 'dp-1',
      dayOfWeek: 'Segunda',
      intervalsCount: 4,
      activeDurationMinutes: 3,
      activeSpeedKmh: 5.6,
      pauseDurationMinutes: 2,
      pauseSpeedKmh: 3.0,
      totalVolumeMinutes: 20,
      description: '4x 3 minutos ativos a 5.6 km/h e 2 minutos pausa ativa a 3.0 km/h. (Volume total de 20 minutos)',
    },
    {
      id: 'dp-2',
      dayOfWeek: 'Quarta',
      intervalsCount: 5,
      activeDurationMinutes: 3,
      activeSpeedKmh: 6.0,
      pauseDurationMinutes: 2,
      pauseSpeedKmh: 3.2,
      totalVolumeMinutes: 25,
      description: '5x 3 minutos ativos a 6.0 km/h e 2 minutos pausa ativa a 3.2 km/h. (Volume total de 25 minutos)',
    },
  ]);

  const [generalNotes, setGeneralNotes] = useState<string>(
    'O protocolo será atualizado a cada duas semanas, desde que cada treino seja realizado duas vezes.'
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProtocols = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStudentFilter) params.append('student_id', selectedStudentFilter);

      const [protoRes, stdRes] = await Promise.all([
        apiClient.get(`/protocols?${params.toString()}`),
        apiClient.get('/students'),
      ]);

      setProtocols(protoRes.data.protocols || []);
      setStudents(stdRes.data.students || []);

      if (stdRes.data.students?.length > 0 && !studentId) {
        setStudentId(stdRes.data.students[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProtocols();
  }, [selectedStudentFilter]);

  const handleAddDay = (dayName: string) => {
    const newDay = {
      id: `dp-${Date.now()}`,
      dayOfWeek: dayName,
      intervalsCount: 4,
      activeDurationMinutes: 3,
      activeSpeedKmh: 5.8,
      pauseDurationMinutes: 2,
      pauseSpeedKmh: 3.0,
      totalVolumeMinutes: 20,
      description: `4x 3 minutos ativos a 5.8 km/h e 2 minutos pausa a 3.0 km/h no(a) ${dayName}.`,
    };
    setDaysPrescription([...daysPrescription, newDay]);
  };

  const handleRemoveDay = (index: number) => {
    const updated = [...daysPrescription];
    updated.splice(index, 1);
    setDaysPrescription(updated);
  };

  const handleCreateProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      setFormError('Selecione um aluno para atribuir o protocolo.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      student_id: studentId,
      title,
      type,
      protocol_date: protocolDate,
      warmup_text: warmupText,
      conconi_test_result: {
        environment: 'esteira',
        deflectionHeartRate: deflectionHR,
        deflectionSpeedKmh: deflectionSpeed,
        maxHeartRate: maxHR,
        vo2MaxEstimate: vo2Max,
        zones: {
          z1Recovery: '105 a 125 bpm (< 5.0 km/h)',
          z2Aerobic: '126 a 145 bpm (5.0 a 6.0 km/h)',
          z3Threshold: '146 a 156 bpm (6.0 a 6.5 km/h)',
          z4Vo2Max: '157 a 166 bpm (6.6 a 7.5 km/h)',
          z5Anaerobic: '> 167 bpm (> 7.5 km/h)',
        },
      },
      days_prescription: daysPrescription,
      general_notes: generalNotes,
      status: 'ativo',
    };

    try {
      await apiClient.post('/protocols', payload);
      setIsModalOpen(false);
      fetchProtocols();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Erro ao prescrever protocolo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProtocol = async (id: string) => {
    if (!confirm('Deseja excluir este protocolo?')) return;
    try {
      await apiClient.delete(`/protocols/${id}`);
      fetchProtocols();
    } catch {
      alert('Erro ao excluir protocolo.');
    }
  };

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

  const getProtocolImage = (proto: any) => {
    if (proto.type === 'conconi' || proto.title?.toLowerCase().includes('conconi')) {
      return 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400';
    }
    return 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400';
  };

  const getStudentAvatar = (studentName?: string) => {
    if (studentName?.toLowerCase().includes('mariana')) {
      return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150';
    }
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
  };

  const filteredProtocols = useMemo(() => {
    return protocols.filter((p) => {
      const title = p.title || '';
      const student = p.student_name || '';
      const notes = p.general_notes || '';
      const q = search.toLowerCase();
      return title.toLowerCase().includes(q) || student.toLowerCase().includes(q) || notes.toLowerCase().includes(q);
    });
  }, [protocols, search]);

  const totalCount = protocols.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: '100%' }}>
      {/* 1. Header: Title + Subtitle + Action CTA */}
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
            Protocolos Aeróbios & Conconi
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Prescrição de treinos cardiovasculares com zonas de frequência cardíaca sincronizados na tela do aluno.
          </p>
        </div>

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
          <span>Prescrever Protocolo</span>
        </button>
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
              Protocolos Ativos
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
            <Activity size={18} />
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
              FC Limiar Padrão
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              156 bpm
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
              color: 'var(--text-primary)',
            }}
          >
            <Heart size={18} />
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
              VO2Max Estimado
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              42.5 ml/kg
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
              color: 'var(--text-primary)',
            }}
          >
            <Gauge size={18} />
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
              Sincronização Mobile
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#10B981' }} />
              Tempo Real
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
              color: 'var(--text-primary)',
            }}
          >
            <Smartphone size={18} />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
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
            placeholder="Buscar por protocolo, aluno ou observação..."
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

        {/* Filter by Student */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Filtrar Aluno:
          </span>
          <select
            value={selectedStudentFilter}
            onChange={(e) => setSelectedStudentFilter(e.target.value)}
            style={{
              backgroundColor: '#1A1A1A',
              border: '1px solid #2A2A2A',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: 12,
              color: 'var(--text-primary)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Todos os Alunos</option>
            {students.map((st) => (
              <option key={st.id} value={st.id}>
                {st.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Protocols List */}
      {loading ? (
        <div style={{ padding: 60 }}>
          <Loader text="Carregando protocolos..." />
        </div>
      ) : filteredProtocols.length === 0 ? (
        <div
          style={{
            backgroundColor: '#141414',
            border: '1px solid #222222',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 24px',
          }}
        >
          <EmptyState
            icon={<Activity size={40} />}
            title="Nenhum protocolo encontrado"
            description="Prescreva o primeiro protocolo aeróbio ou Conconi para seus alunos."
            actionLabel="+ Prescrever Protocolo"
            onAction={() => setIsModalOpen(true)}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
          {filteredProtocols.map((proto) => {
            const conconi = proto.conconi_test_result || {};

            return (
              <div
                key={proto.id}
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
                {/* Header Row: Heart Icon + Title + Student + Status Badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
                      <img
                        src={getProtocolImage(proto)}
                        alt={proto.title}
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400';
                        }}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 'var(--radius-sm)',
                          objectFit: 'cover',
                          border: '1px solid #2A2A2A',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: -2,
                          right: -2,
                          width: 18,
                          height: 18,
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: '#D90000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                        }}
                      >
                        <Heart size={10} fill="#FFFFFF" />
                      </div>
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {proto.title}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <img
                          src={getStudentAvatar(proto.student_name)}
                          alt={proto.student_name || 'Aluno'}
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
                          }}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 'var(--radius-xs)',
                            objectFit: 'cover',
                            border: '1px solid #2A2A2A',
                          }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                          Aluno: <strong style={{ color: 'var(--text-primary)' }}>{proto.student_name}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        color: '#34D399',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                      }}
                    >
                      ATIVO
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteProtocol(proto.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 4,
                        borderRadius: 'var(--radius-sm)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                      title="Excluir protocolo"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Conconi 4 Metrics Bar */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 8,
                    backgroundColor: '#181818',
                    border: '1px solid #222222',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      FC Limiar
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                      {conconi.deflectionHeartRate || 156} bpm
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Velocidade
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                      {conconi.deflectionSpeedKmh || 6.5} km/h
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      FC Máxima
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                      {conconi.maxHeartRate || 172} bpm
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      VO2Max
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                      {conconi.vo2MaxEstimate || 42.5}
                    </div>
                  </div>
                </div>

                {/* Aquecimento */}
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    backgroundColor: '#181818',
                    border: '1px solid #222222',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Flame size={14} color="#F59E0B" />
                  <span>
                    <strong style={{ color: 'var(--text-primary)' }}>Aquecimento:</strong> {proto.warmup_text}
                  </span>
                </div>

                {/* Prescrição Semanal dos Dias */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(proto.days_prescription || []).map((day: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#181818',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 12,
                        borderLeft: '3px solid var(--primary)',
                        borderTop: '1px solid #222222',
                        borderRight: '1px solid #222222',
                        borderBottom: '1px solid #222222',
                      }}
                    >
                      <strong style={{ color: '#FFFFFF' }}>{day.dayOfWeek}:</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{day.description}</span>
                    </div>
                  ))}
                </div>

                {/* Observações e Sincronização Mobile */}
                {proto.general_notes && (
                  <div
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid #202020',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 11,
                      color: 'var(--text-muted)',
                    }}
                  >
                    <strong>Observação Oficial:</strong> {proto.general_notes}
                  </div>
                )}

                {/* Footer: Date & Sync Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #1E1E1E',
                    paddingTop: 10,
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Início: {formatDate(proto.protocol_date)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#34D399', fontWeight: 600 }}>
                    <Smartphone size={12} />
                    <span>Sincronizado no App Mobile</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Prescrever Protocolo (Minimalist Form) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Prescrever Protocolo Aeróbio & Conconi"
        maxWidth={640}
      >
        <form onSubmit={handleCreateProtocol} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {formError && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#F87171',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              {formError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Aluno *</label>
              <select
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="form-select"
              >
                <option value="">Selecione um aluno...</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Data de Início *</label>
              <input
                required
                type="date"
                value={protocolDate}
                onChange={(e) => setProtocolDate(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Título do Protocolo *</label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Instruções de Aquecimento</label>
            <input
              type="text"
              value={warmupText}
              onChange={(e) => setWarmupText(e.target.value)}
              className="form-input"
            />
          </div>

          {/* Test Conconi Metrics */}
          <div style={{ padding: 14, backgroundColor: '#181818', border: '1px solid #262626', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.4, marginBottom: 10 }}>
              Dados do Teste Conconi & Limiares
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">FC Limiar (bpm)</label>
                <input
                  type="number"
                  value={deflectionHR}
                  onChange={(e) => setDeflectionHR(Number(e.target.value))}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Velocidade (km/h)</label>
                <input
                  type="number"
                  step="0.1"
                  value={deflectionSpeed}
                  onChange={(e) => setDeflectionSpeed(Number(e.target.value))}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">FC Máx (bpm)</label>
                <input
                  type="number"
                  value={maxHR}
                  onChange={(e) => setMaxHR(Number(e.target.value))}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">VO2Max Est.</label>
                <input
                  type="number"
                  step="0.1"
                  value={vo2Max}
                  onChange={(e) => setVo2Max(Number(e.target.value))}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Prescrição dos Dias */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Prescrição Semanal (Dias)</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleAddDay(d)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: '#1E1E1E',
                      border: '1px solid #282828',
                      color: 'var(--text-secondary)',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + {d}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {daysPrescription.map((dp, idx) => (
                <div key={dp.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: 12, color: 'var(--primary)', width: 64 }}>
                    {dp.dayOfWeek}:
                  </span>
                  <input
                    type="text"
                    value={dp.description}
                    onChange={(e) => {
                      const updated = [...daysPrescription];
                      updated[idx].description = e.target.value;
                      setDaysPrescription(updated);
                    }}
                    className="form-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveDay(idx)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: '#1E1E1E',
                      border: '1px solid #282828',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Observação Padrão do Aluno</label>
            <textarea
              rows={2}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="form-textarea"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !studentId}
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
              {saving ? 'Prescrevendo...' : 'Salvar e Sincronizar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
