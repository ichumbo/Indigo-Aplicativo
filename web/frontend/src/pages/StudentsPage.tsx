import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Dumbbell, MessageSquare, AlertCircle, Phone, ArrowRight } from 'lucide-react';
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

  // Counts for pills
  const totalCount = students.length;
  const activeCount = students.filter((s) => s.status === 'ativo').length;
  const inactiveCount = students.filter((s) => s.status === 'inativo').length;
  const pendingCount = students.filter((s) => s.status === 'pausado' || s.status === 'aguardando_inicio').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header (Prompt Item 18: Alunos + [+ Novo aluno]) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
            Alunos
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Gerenciamento completo dos alunos da consultoria DragonCorp
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ padding: '9px 18px', fontSize: 13, fontWeight: 700 }}
        >
          <Plus size={16} />
          <span>+ Novo Aluno</span>
        </button>
      </div>

      {/* Search Bar (Prompt Item 16: Busca Ampla e Rápida) */}
      <div style={{ position: 'relative', width: '100%' }}>
        <Search
          size={18}
          color="var(--accent-red)"
          style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          className="form-input"
          style={{
            paddingLeft: 46,
            height: 48,
            fontSize: 14,
            backgroundColor: 'var(--card-bg)',
            borderRadius: 'var(--radius-md)',
          }}
          placeholder="🔍 Pesquisar aluno, CPF, treino ou objetivo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Pill Filters (Prompt Item 17: Pills Horizontais) */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`pill-filter ${statusFilter === 'all' ? 'active' : ''}`}
        >
          <span>Todos</span>
          <span style={{ opacity: 0.8, fontSize: 11 }}>{totalCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ativo')}
          className={`pill-filter ${statusFilter === 'ativo' ? 'active' : ''}`}
        >
          <span>Ativos</span>
          <span style={{ opacity: 0.8, fontSize: 11 }}>{activeCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('pausado')}
          className={`pill-filter ${statusFilter === 'pausado' ? 'active' : ''}`}
        >
          <span>Pendentes</span>
          <span style={{ opacity: 0.8, fontSize: 11 }}>{pendingCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('inativo')}
          className={`pill-filter ${statusFilter === 'inativo' ? 'active' : ''}`}
        >
          <span>Inativos</span>
          <span style={{ opacity: 0.8, fontSize: 11 }}>{inactiveCount}</span>
        </button>
      </div>

      {/* Students List Table (Prompt Item 19: Lista de Alunos Desktop) */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40 }}>
            <Loader text="Carregando alunos..." />
          </div>
        ) : students.length === 0 ? (
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
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}></th>
                  <th>Aluno</th>
                  <th>Objetivo Principal</th>
                  <th>Treino Vigente</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações Rápidas</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st) => (
                  <tr
                    key={st.id}
                    onClick={() => navigate(`/alunos/${st.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <img
                        src={st.avatar_url || st.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'}
                        alt={st.full_name}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 'var(--radius-full)',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                        {st.full_name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {st.contact?.phone || st.contact?.email || 'Sem contato cadastrado'}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                        {st.main_goal}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-primary)' }}>
                        <Dumbbell size={14} color="var(--accent-red)" />
                        <span>{st.active_plans?.[0]?.name || 'Nenhuma ficha ativa'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${st.status === 'ativo' ? 'badge-green' : 'badge-neutral'}`}>
                        {st.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          onClick={() => navigate(`/treinos/novo?studentId=${st.id}`)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '5px 10px', fontSize: 11 }}
                          title="Montar treino para este aluno"
                        >
                          <Plus size={13} />
                          <span>Treino</span>
                        </button>
                        <button
                          onClick={() => navigate(`/alunos/${st.id}`)}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '5px 10px', fontSize: 11 }}
                        >
                          <span>Ver Perfil</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Novo Aluno */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Novo Aluno"
        maxWidth={560}
      >
        <form onSubmit={handleCreateStudent}>
          {formError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#F87171',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{formError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nome Completo *</label>
            <input
              type="text"
              className="form-input"
              value={newStudent.fullName}
              onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
              placeholder="Ex: João Silva da Rocha"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                type="email"
                className="form-input"
                value={newStudent.email}
                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                placeholder="aluno@email.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Telefone / WhatsApp *</label>
              <input
                type="text"
                className="form-input"
                value={newStudent.phone}
                onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Objetivo Principal *</label>
              <input
                type="text"
                className="form-input"
                value={newStudent.mainGoal}
                onChange={(e) => setNewStudent({ ...newStudent, mainGoal: e.target.value })}
                placeholder="Ex: Hipertrofia miofibrilar"
                required
              />
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
                <option value="other">Outro</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Anotações Iniciais da Anamnese</label>
            <textarea
              className="form-input"
              style={{ minHeight: 70, resize: 'vertical' }}
              value={newStudent.administrativeNotes}
              onChange={(e) => setNewStudent({ ...newStudent, administrativeNotes: e.target.value })}
              placeholder="Histórico prévio de treinos, restrições articulares..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
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
              {saving ? 'Cadastrando...' : 'Cadastrar Aluno'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
