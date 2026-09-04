import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2, Plus, ArrowRightLeft, Calendar, User as UserIcon, AlertCircle } from 'lucide-react';
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [studentId, setStudentId] = useState<string>('');
  const [assessmentDate, setAssessmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<string>('periodica');
  const [weightKg, setWeightKg] = useState<number>(75);
  const [heightCm, setHeightCm] = useState<number>(175);
  const [bodyFatPercent, setBodyFatPercent] = useState<number>(15);
  const [waistCm, setWaistCm] = useState<number>(82);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
            Avaliações Físicas
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Registro de composição corporal, perímetros, dobras e comparativos longitudinais.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {assessments.length >= 2 && (
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="btn btn-secondary"
            >
              <ArrowRightLeft size={16} />
              <span>Comparar Avaliações</span>
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>Nova Avaliação</span>
          </button>
        </div>
      </div>

      {loading ? (
        <Loader text="Carregando avaliações físicas..." />
      ) : assessments.length === 0 ? (
        <EmptyState
          icon={<FileCheck2 size={40} />}
          title="Nenhuma avaliação registrada"
          description="Cadastre a avaliação inicial dos seus alunos com cálculo automático de IMC, massa magra e gordura."
          actionLabel="Criar Primeira Avaliação"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Aluno</th>
                <th>Tipo</th>
                <th>Peso (kg)</th>
                <th>Gordura Corporal</th>
                <th>Massa Magra</th>
                <th>IMC</th>
                <th style={{ textAlign: 'right' }}>Parecer Técnico</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => {
                const comp = a.body_composition || {};

                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                        <Calendar size={14} color="var(--text-muted)" />
                        <span>{a.assessment_date}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <UserIcon size={14} color="var(--accent-red)" />
                        <span style={{ fontWeight: 600 }}>{a.student?.full_name || 'Aluno'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{a.type}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {comp.weightKg ? `${comp.weightKg} kg` : '-'}
                    </td>
                    <td style={{ color: 'var(--accent-red)', fontWeight: 700 }}>
                      {comp.bodyFatPercent ? `${comp.bodyFatPercent}%` : '-'}
                    </td>
                    <td>
                      {comp.leanMassKg ? `${comp.leanMassKg} kg` : '-'}
                    </td>
                    <td>
                      {comp.bmi || '-'}
                    </td>
                    <td style={{ textAlign: 'right', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)', fontSize: 12 }}>
                      {a.conclusion || 'Sem parecer registrado.'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Nova Avaliação */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Avaliação Física DragonCorp"
        maxWidth={640}
      >
        {formError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              backgroundColor: 'var(--color-danger-subtle)',
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
              className="btn btn-primary"
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
                  {a.assessment_date} — {a.student?.full_name} ({a.body_composition?.weightKg} kg)
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
                  {a.assessment_date} — {a.student?.full_name} ({a.body_composition?.weightKg} kg)
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
              className="btn btn-primary"
            >
              Comparar Agora
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
