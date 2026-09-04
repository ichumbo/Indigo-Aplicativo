import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Dumbbell,
  FileCheck2,
  TrendingUp,
  MessageSquare,
  ShieldAlert,
  Calendar,
  Phone,
  Mail,
  Edit,
  Plus,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { StudentProfile } from '../types';
import { Loader } from '../components/common/Loader';

export const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'workouts' | 'assessments' | 'evolution' | 'notes'>('overview');
  const [noteText, setNoteText] = useState<string>('');
  const [savingNote, setSavingNote] = useState<boolean>(false);

  useEffect(() => {
    const fetchStudent = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/students/${id}`);
        setStudent(res.data.student);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id]);

  const handleAddNote = async () => {
    if (!noteText.trim() || !student) return;
    setSavingNote(true);
    try {
      const updatedNotes = [...(student.private_trainer_notes || []), noteText.trim()];
      await apiClient.put(`/students/${student.id}`, {
        privateTrainerNotes: updatedNotes,
      });
      setStudent({ ...student, private_trainer_notes: updatedNotes });
      setNoteText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) return <Loader text="Carregando perfil completo do aluno..." />;
  if (!student) return <div>Aluno não encontrado ou acesso negado.</div>;

  const plans = student.training_plans || [];
  const assessments = student.assessments || [];
  const executedSets = student.executed_sets || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Breadcrumb and Back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => navigate('/alunos')}
          className="btn btn-secondary btn-sm"
          style={{ padding: '6px 10px' }}
        >
          <ArrowLeft size={16} />
        </button>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Alunos</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{student.full_name}</span>
      </div>

      {/* Header Banner (Prompt Item 20: Perfil do Aluno Amplo) */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
          borderLeft: '4px solid var(--accent-red)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <img
            src={student.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160'}
            alt={student.full_name}
            style={{
              width: 68,
              height: 68,
              borderRadius: 'var(--radius-full)',
              objectFit: 'cover',
              border: '2px solid var(--border-color)',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', letterSpacing: -0.5 }}>
                {student.full_name}
              </h1>
              <span className={`badge ${student.status === 'ativo' ? 'badge-green' : 'badge-yellow'}`}>
                {student.status}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--accent-red)', fontWeight: 700 }}>
                Objetivo: {student.main_goal}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                Treino Atual: <strong>{plans[0]?.name || 'Sem ficha ativa'}</strong>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              {student.contact?.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={13} color="var(--accent-red)" /> {student.contact.phone}
                </span>
              )}
              {student.contact?.email && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={13} color="var(--text-muted)" /> {student.contact.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate(`/treinos/novo?studentId=${student.id}`)}
            className="btn btn-primary"
          >
            <Dumbbell size={16} />
            <span>Montar Treino</span>
          </button>
          <button
            onClick={() => navigate(`/avaliacoes`)}
            className="btn btn-secondary"
          >
            <FileCheck2 size={16} />
            <span>Nova Avaliação</span>
          </button>
          <button
            onClick={() => navigate(`/mensagens`)}
            className="btn btn-secondary"
          >
            <MessageSquare size={16} />
            <span>Chat</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          gap: 24,
        }}
      >
        {[
          { id: 'overview', label: 'Visão Geral' },
          { id: 'workouts', label: `Treinos (${plans.length})` },
          { id: 'assessments', label: `Avaliações (${assessments.length})` },
          { id: 'evolution', label: 'Evolução de Cargas' },
          { id: 'notes', label: 'Anotações do Treinador' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 4px',
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-red)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Anamnesis Card */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' }}>
              Anamnese Clínica & Restrições
            </h3>
            {student.anamnesis ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Qualidade do Sono:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{student.anamnesis.sleepQuality || 'Normal'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Nível de Estresse:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{student.anamnesis.stressLevel || 'Moderado'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Ingestão Hídrica:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{student.anamnesis.waterIntakeLiters || 2.5} L/dia</strong>
                </div>
                {student.anamnesis.currentPain && (
                  <div
                    style={{
                      padding: 10,
                      backgroundColor: 'var(--accent-red-subtle)',
                      border: '1px solid var(--accent-red-border)',
                      borderRadius: 'var(--radius-md)',
                      color: '#FF8A8A',
                      marginTop: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <ShieldAlert size={15} /> Atenção Médica / Ponto de Dor:
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12 }}>{student.anamnesis.currentPainDetails}</div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhuma resposta de anamnese registrada.</p>
            )}
          </div>

          {/* Follow-up Summary */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' }}>
              Acompanhamento & Frequência
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Frequência Planejada:</span>{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {student.follow_up_summary?.plannedTrainingFrequency || 4}x por semana
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Aderência Geral:</span>{' '}
                <strong style={{ color: 'var(--color-success)' }}>
                  {student.follow_up_summary?.adherencePercent || 92}%
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Observações Administrativas:</span>
                <p style={{ marginTop: 4, color: 'var(--text-secondary)' }}>
                  {student.administrative_notes || 'Sem anotações.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'workouts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {plans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              Nenhum treino cadastrado para este aluno.
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => navigate(`/treinos/novo?studentId=${student.id}`)}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={15} /> Montar Primeiro Treino
                </button>
              </div>
            </div>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{plan.name}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{plan.objective}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-green">{plan.status}</span>
                    <button
                      onClick={() => navigate(`/treinos/${plan.id}/editar`)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Edit size={14} /> Editar
                    </button>
                  </div>
                </div>

                {/* Sessions list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                  {plan.sessions?.map((session) => (
                    <div
                      key={session.id}
                      style={{
                        padding: 12,
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                        {session.active_version?.name || 'Sessão'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {session.active_version?.exercises?.length || 0} exercícios prescritos
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'assessments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {assessments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              Nenhuma avaliação física cadastrada.
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Peso (kg)</th>
                    <th>Gordura (%)</th>
                    <th>Massa Magra (kg)</th>
                    <th>IMC</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.assessment_date}</td>
                      <td><span className="badge badge-neutral">{a.type}</span></td>
                      <td>{a.body_composition?.weightKg || '-'} kg</td>
                      <td style={{ color: 'var(--accent-red)', fontWeight: 700 }}>
                        {a.body_composition?.bodyFatPercent || '-'}%
                      </td>
                      <td>{a.body_composition?.leanMassKg || '-'} kg</td>
                      <td>{a.body_composition?.bmi || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'evolution' && (
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' }}>
            Histórico Recente de Execuções e Cargas
          </h3>
          {executedSets.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Nenhuma execução sincronizada do aplicativo móvel até o momento.
            </p>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Exercício</th>
                    <th>Carga Executada</th>
                    <th>Repetições</th>
                    <th>Esforço (RPE)</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {executedSets.map((set) => (
                    <tr key={set.id}>
                      <td>{set.executed_at ? new Date(set.executed_at).toLocaleDateString('pt-BR') : '-'}</td>
                      <td style={{ fontWeight: 600 }}>{set.exercise_name}</td>
                      <td style={{ color: 'var(--accent-red)', fontWeight: 700 }}>
                        {set.executed_load} {set.load_unit}
                      </td>
                      <td>{set.executed_reps} reps</td>
                      <td>{set.effort ? `${set.effort}/10` : '-'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{set.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' }}>
            Anotações Privadas do Personal
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Estas anotações são visíveis apenas para você e nunca são exibidas no aplicativo do aluno.
          </p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Focar em amplitude completa no agachamento na próxima sessão..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddNote();
              }}
            />
            <button
              onClick={handleAddNote}
              disabled={savingNote || !noteText.trim()}
              className="btn btn-primary"
            >
              Adicionar
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(student.private_trainer_notes || []).map((note, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                }}
              >
                {note}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
