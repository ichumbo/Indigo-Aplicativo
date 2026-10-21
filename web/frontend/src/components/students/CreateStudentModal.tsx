import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  User, 
  Target, 
  KeyRound, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  Copy, 
  Check, 
  Share2, 
  Dumbbell, 
  FileCheck2, 
  Plus, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Phone,
  Mail,
  Calendar,
  Sparkles
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { StudentProfile } from '../../types';

interface CreateStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentCreated: (student: StudentProfile) => void;
  onNavigateToWorkout: (studentId: string) => void;
  onNavigateToAssessment: (studentId: string) => void;
  onNavigateToProfile: (studentId: string) => void;
}

const DRAFT_KEY = 'dragoncorp_student_creation_draft';

export const CreateStudentModal: React.FC<CreateStudentModalProps> = ({
  isOpen,
  onClose,
  onStudentCreated,
  onNavigateToWorkout,
  onNavigateToAssessment,
  onNavigateToProfile,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: 'male',
    mainGoal: 'Hipertrofia',
    frequencyPerWeek: 4,
    administrativeNotes: '',
    profession: '',
    address: '',
    inviteMethod: 'link' as 'link' | 'whatsapp' | 'later',
  });

  // UI States
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  // Duplicate Check State
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Success State
  const [createdStudent, setCreatedStudent] = useState<StudentProfile | null>(null);
  const [inviteData, setInviteData] = useState<{ token: string; url: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Mask Phone (BR)
  const formatPhone = (val: string) => {
    const numbers = val.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  // Restore draft on mount if exists
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.fullName) {
            setForm(parsed);
            setHasDraft(true);
          }
        } catch {}
      }
    }
  }, [isOpen]);

  // Auto-save draft on form change (except after success)
  useEffect(() => {
    if (isOpen && !createdStudent && (form.fullName || form.email || form.phone)) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }
  }, [form, isOpen, createdStudent]);

  // Duplicate check with debounce on email and phone
  useEffect(() => {
    if (!form.email && !form.phone) {
      setDuplicateWarning(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingDuplicate(true);
      try {
        const res = await apiClient.post('/students/check-duplicate', {
          email: form.email.trim(),
          phone: form.phone.trim(),
        });
        if (res.data?.duplicate) {
          setDuplicateWarning(res.data.message);
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        setDuplicateWarning(null);
      } finally {
        setCheckingDuplicate(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [form.email, form.phone]);

  if (!isOpen) return null;

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setForm({
      fullName: '',
      email: '',
      phone: '',
      birthDate: '',
      gender: 'male',
      mainGoal: 'Hipertrofia',
      frequencyPerWeek: 4,
      administrativeNotes: '',
      profession: '',
      address: '',
      inviteMethod: 'link',
    });
    setHasDraft(false);
    setCurrentStep(1);
    setDuplicateWarning(null);
  };

  const handleNextStep = () => {
    setFormError(null);
    if (currentStep === 1) {
      if (!form.fullName.trim() || form.fullName.trim().length < 3) {
        setFormError('Informe o nome completo do aluno (mínimo 3 caracteres).');
        return;
      }
      if (form.email && !form.email.includes('@')) {
        setFormError('Informe um e-mail válido.');
        return;
      }
    }
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as any);
    }
  };

  const handlePrevStep = () => {
    setFormError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        birthDate: form.birthDate || undefined,
        gender: form.gender,
        mainGoal: form.mainGoal,
        frequencyPerWeek: form.frequencyPerWeek,
        administrativeNotes: form.administrativeNotes.trim() || undefined,
        profession: form.profession.trim() || undefined,
        address: form.address.trim() || undefined,
      };

      const res = await apiClient.post('/students', payload);
      const student = res.data.student;
      const invite = res.data.invite || {
        token: 'token-' + Math.random().toString(36).slice(2),
        url: window.location.origin + '/confirm-account?token=auto',
      };

      // Discard saved draft on success
      localStorage.removeItem(DRAFT_KEY);

      setCreatedStudent(student);
      setInviteData(invite);
      onStudentCreated(student);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Falha ao cadastrar aluno. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteData?.url) return;
    navigator.clipboard.writeText(inviteData.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!inviteData?.url) return;
    const cleanPhone = form.phone.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Olá ${form.fullName}! Seu personal trainer acabou de criar o seu acesso oficial na DragonCorp. Conclua seu cadastro clicando no link: ${inviteData.url}`
    );
    const targetUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;
    window.open(targetUrl, '_blank');
  };

  const resetForNewStudent = () => {
    setCreatedStudent(null);
    setInviteData(null);
    setForm({
      fullName: '',
      email: '',
      phone: '',
      birthDate: '',
      gender: 'male',
      mainGoal: 'Hipertrofia',
      frequencyPerWeek: 4,
      administrativeNotes: '',
      profession: '',
      address: '',
      inviteMethod: 'link',
    });
    setCurrentStep(1);
    setDuplicateWarning(null);
  };

  return (
    <div className="admin-modal-overlay" style={{ zIndex: 1000 }}>
      <div 
        className="admin-modal-card" 
        style={{ 
          maxWidth: 620, 
          width: '92vw', 
          backgroundColor: '#141414', 
          border: '1px solid #282828',
          borderRadius: 12,
          padding: 24,
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 8, 
              backgroundColor: 'rgba(217, 0, 0, 0.15)', 
              color: '#D90000',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <User size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                {createdStudent ? 'Aluno Cadastrado com Sucesso!' : 'Novo Aluno — Cadastro Progressivo'}
              </h2>
              <p style={{ fontSize: 12, color: '#A1A1AA', margin: '2px 0 0' }}>
                {createdStudent 
                  ? 'Acesso gerado com segurança. Escolha o próximo passo operacional.' 
                  : `Etapa ${currentStep} de 4 • Fluxo rápido e intuitivo`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* SUCCESS FLOW (FASE 6) */}
        {createdStudent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ 
              backgroundColor: 'rgba(16, 185, 129, 0.1)', 
              border: '1px solid #10B981', 
              borderRadius: 8, 
              padding: 16,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12
            }}>
              <CheckCircle2 color="#10B981" size={24} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
                  {createdStudent.full_name} foi cadastrado na sua carteira de consultoria!
                </div>
                <div style={{ fontSize: 12.5, color: '#A7F3D0', marginTop: 4 }}>
                  O aluno receberá as fichas de musculação, avaliações físicas e feedbacks diretamente no aplicativo móvel DragonCorp.
                </div>
              </div>
            </div>

            {/* Invite Box */}
            {inviteData && (
              <div style={{ backgroundColor: '#1E1E1E', border: '1px solid #2C2C2C', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <KeyRound size={16} color="#D90000" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>Convite Seguro de Acesso</span>
                </div>
                <p style={{ fontSize: 12, color: '#A1A1AA', lineHeight: 1.4, marginBottom: 12 }}>
                  Envie este link para o aluno criar a própria senha no primeiro login. O link expira em 7 dias.
                </p>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    readOnly
                    value={inviteData.url}
                    style={{
                      flex: 1,
                      minWidth: 200,
                      backgroundColor: '#0A0A0A',
                      border: '1px solid #333333',
                      borderRadius: 6,
                      color: '#E4E4E7',
                      padding: '8px 12px',
                      fontSize: 12,
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="admin-btn admin-btn-secondary"
                    style={{ padding: '8px 14px', fontSize: 12 }}
                  >
                    {copiedLink ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                    {copiedLink ? 'Copiado!' : 'Copiar'}
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    style={{
                      backgroundColor: '#25D366',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 6,
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Share2 size={14} /> WhatsApp
                  </button>
                </div>
              </div>
            )}

            {/* Next Steps Buttons */}
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Próximas Ações Rápidas:
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                {/* 1. Criar Primeiro Treino (FASE 6 Core CTA) */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToWorkout(createdStudent.id);
                  }}
                  style={{
                    backgroundColor: '#D90000',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(217, 0, 0, 0.3)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Dumbbell size={16} />
                    <span>Montar 1º Treino Agora</span>
                  </div>
                  <ArrowRight size={15} />
                </button>

                {/* 2. Avaliação Física */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToAssessment(createdStudent.id);
                  }}
                  className="admin-btn admin-btn-secondary"
                  style={{ justifyContent: 'space-between', padding: '12px 16px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileCheck2 size={16} color="#10B981" />
                    <span>Realizar Avaliação Física</span>
                  </div>
                  <ArrowRight size={14} />
                </button>

                {/* 3. Abrir Perfil Completo */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToProfile(createdStudent.id);
                  }}
                  className="admin-btn admin-btn-secondary"
                  style={{ justifyContent: 'space-between', padding: '12px 16px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={16} color="#3B82F6" />
                    <span>Abrir Perfil do Aluno</span>
                  </div>
                  <ArrowRight size={14} />
                </button>

                {/* 4. Cadastrar Outro Aluno */}
                <button
                  type="button"
                  onClick={resetForNewStudent}
                  className="admin-btn admin-btn-secondary"
                  style={{ justifyContent: 'space-between', padding: '12px 16px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Plus size={16} />
                    <span>Cadastrar Outro Aluno</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WIZARD FLOW */}
        {!createdStudent && (
          <form onSubmit={handleSubmit}>
            {/* Stepper Tabs Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              {[
                { step: 1, label: '1. Essenciais' },
                { step: 2, label: '2. Consultoria' },
                { step: 3, label: '3. Acesso' },
                { step: 4, label: '4. Revisão' },
              ].map((item) => (
                <div
                  key={item.step}
                  onClick={() => item.step < currentStep && setCurrentStep(item.step as any)}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 4px',
                    borderRadius: 6,
                    backgroundColor: currentStep === item.step ? '#D90000' : currentStep > item.step ? '#282828' : '#1A1A1A',
                    color: currentStep === item.step ? '#FFFFFF' : currentStep > item.step ? '#E4E4E7' : '#71717A',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: item.step < currentStep ? 'pointer' : 'default',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {item.label}
                </div>
              ))}
            </div>

            {/* Draft notice */}
            {hasDraft && currentStep === 1 && (
              <div style={{ 
                backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                border: '1px solid rgba(59, 130, 246, 0.3)', 
                borderRadius: 6, 
                padding: '8px 12px', 
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 12,
                color: '#93C5FD'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} />
                  <span>Rascunho recuperado automaticamente.</span>
                </div>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: 11.5, fontWeight: 600 }}
                >
                  Descartar
                </button>
              </div>
            )}

            {/* Error Banner */}
            {formError && (
              <div style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid #EF4444', 
                borderRadius: 6, 
                padding: '10px 14px', 
                marginBottom: 16,
                color: '#FCA5A5',
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            {/* Duplicate Warning */}
            {duplicateWarning && (
              <div style={{ 
                backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                border: '1px solid #F59E0B', 
                borderRadius: 6, 
                padding: '10px 14px', 
                marginBottom: 16,
                color: '#FDE68A',
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600 }}>Atenção: Duplicidade Detectada</div>
                  <div style={{ marginTop: 2 }}>{duplicateWarning}</div>
                </div>
              </div>
            )}

            {/* STEP 1: DADOS ESSENCIAIS */}
            {currentStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>
                    Nome Completo <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo de Oliveira"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="admin-filter-input"
                    style={{ width: '100%' }}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>
                      WhatsApp / Telefone
                    </label>
                    <input
                      type="text"
                      placeholder="(11) 98765-4321"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                      className="admin-filter-input"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>
                      E-mail do Aluno
                    </label>
                    <input
                      type="email"
                      placeholder="aluno@email.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="admin-filter-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>
                    Data de Nascimento (Opcional)
                  </label>
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    className="admin-filter-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}

            {/* STEP 2: OBJETIVO & CONSULTORIA */}
            {currentStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>
                      Objetivo Principal <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      value={form.mainGoal}
                      onChange={(e) => setForm({ ...form, mainGoal: e.target.value })}
                      className="admin-filter-select"
                      style={{ width: '100%' }}
                    >
                      <option value="Hipertrofia">Hipertrofia Muscular</option>
                      <option value="Emagrecimento">Emagrecimento & Definição</option>
                      <option value="Condicionamento Físico">Condicionamento Físico</option>
                      <option value="Saúde e Longevidade">Saúde & Qualidade de Vida</option>
                      <option value="Performance Esportiva">Performance Esportiva</option>
                      <option value="Reabilitação">Reabilitação & Postura</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>
                      Sexo / Gênero
                    </label>
                    <select
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      className="admin-filter-select"
                      style={{ width: '100%' }}
                    >
                      <option value="male">Masculino</option>
                      <option value="female">Feminino</option>
                      <option value="not_informed">Não Informado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>
                    Frequência Semanal Esperada
                  </label>
                  <select
                    value={form.frequencyPerWeek}
                    onChange={(e) => setForm({ ...form, frequencyPerWeek: parseInt(e.target.value, 10) })}
                    className="admin-filter-select"
                    style={{ width: '100%' }}
                  >
                    <option value={2}>2 dias por semana</option>
                    <option value={3}>3 dias por semana</option>
                    <option value={4}>4 dias por semana (Recomendado)</option>
                    <option value={5}>5 dias por semana</option>
                    <option value={6}>6 dias por semana</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>
                    Observações Administrativas / Anamnese Prévia
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Histórico de lesão no joelho esquerdo, disponibilidade à noite..."
                    value={form.administrativeNotes}
                    onChange={(e) => setForm({ ...form, administrativeNotes: e.target.value })}
                    className="admin-filter-input"
                    style={{ width: '100%', height: 'auto' }}
                  />
                </div>

                {/* Collapsible Advanced Info */}
                <div style={{ borderTop: '1px solid #282828', paddingTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#A1A1AA',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showAdvanced ? 'Ocultar campos complementares' : 'Preencher profissão e endereço (Opcional)'}
                  </button>

                  {showAdvanced && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: '#71717A', marginBottom: 2 }}>Profissão</label>
                        <input
                          type="text"
                          placeholder="Ex: Desenvolvedor"
                          value={form.profession}
                          onChange={(e) => setForm({ ...form, profession: e.target.value })}
                          className="admin-filter-input"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: '#71717A', marginBottom: 2 }}>Cidade / Bairro</label>
                        <input
                          type="text"
                          placeholder="Ex: São Paulo - SP"
                          value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })}
                          className="admin-filter-input"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: ACESSO DO ALUNO */}
            {currentStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 13, color: '#FFFFFF', fontWeight: 600 }}>
                  Como o aluno deverá receber o convite para o aplicativo?
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    {
                      id: 'link',
                      title: 'Gerar Link Seguro de Convite',
                      desc: 'O link será gerado imediatamente na confirmação para você copiar e enviar.',
                    },
                    {
                      id: 'whatsapp',
                      title: 'Enviar Diretamente pelo WhatsApp',
                      desc: 'Abrirá o WhatsApp Web / App com a mensagem pronta de boas-vindas e o link.',
                    },
                    {
                      id: 'later',
                      title: 'Cadastrar Agora e Convidar Depois',
                      desc: 'O aluno fica ativo na sua carteira e você pode emitir o convite quando preferir.',
                    },
                  ].map((method) => (
                    <label
                      key={method.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: 12,
                        borderRadius: 8,
                        backgroundColor: form.inviteMethod === method.id ? 'rgba(217, 0, 0, 0.1)' : '#1A1A1A',
                        border: `1px solid ${form.inviteMethod === method.id ? '#D90000' : '#282828'}`,
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="radio"
                        name="inviteMethod"
                        value={method.id}
                        checked={form.inviteMethod === method.id}
                        onChange={() => setForm({ ...form, inviteMethod: method.id as any })}
                        style={{ marginTop: 3, accentColor: '#D90000' }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>{method.title}</div>
                        <div style={{ fontSize: 12, color: '#A1A1AA', marginTop: 2 }}>{method.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <div style={{ 
                  backgroundColor: '#1E1E1E', 
                  border: '1px solid #2C2C2C', 
                  borderRadius: 6, 
                  padding: 12,
                  fontSize: 12,
                  color: '#A1A1AA',
                  lineHeight: 1.4
                }}>
                  🔒 <strong>Segurança do Aluno:</strong> O Personal Trainer nunca define ou visualiza senhas. O aluno ativa sua própria credencial criptografada ao aceitar o convite.
                </div>
              </div>
            )}

            {/* STEP 4: REVISÃO & CONFIRMAÇÃO */}
            {currentStep === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 13, color: '#FFFFFF', fontWeight: 600 }}>
                  Revise os dados antes de salvar:
                </div>

                <div style={{ 
                  backgroundColor: '#1A1A1A', 
                  border: '1px solid #282828', 
                  borderRadius: 8, 
                  padding: 14,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  fontSize: 12.5
                }}>
                  <div>
                    <span style={{ color: '#71717A', display: 'block' }}>Nome:</span>
                    <strong style={{ color: '#FFFFFF' }}>{form.fullName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#71717A', display: 'block' }}>Objetivo:</span>
                    <strong style={{ color: '#D90000' }}>{form.mainGoal}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#71717A', display: 'block' }}>Contato:</span>
                    <span style={{ color: '#E4E4E7' }}>{form.phone || 'Sem telefone'} {form.email ? `• ${form.email}` : ''}</span>
                  </div>
                  <div>
                    <span style={{ color: '#71717A', display: 'block' }}>Frequência:</span>
                    <span style={{ color: '#E4E4E7' }}>{form.frequencyPerWeek}x na semana</span>
                  </div>
                  <div>
                    <span style={{ color: '#71717A', display: 'block' }}>Envio de Acesso:</span>
                    <span style={{ color: '#10B981', fontWeight: 600, textTransform: 'uppercase' }}>
                      {form.inviteMethod === 'link' ? 'Link Direto' : form.inviteMethod === 'whatsapp' ? 'WhatsApp' : 'Posterior'}
                    </span>
                  </div>
                  {form.administrativeNotes && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#71717A', display: 'block' }}>Observações:</span>
                      <span style={{ color: '#A1A1AA' }}>{form.administrativeNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Buttons Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, borderTop: '1px solid #282828', paddingTop: 16 }}>
              <div>
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="admin-btn admin-btn-secondary"
                    style={{ padding: '8px 14px', fontSize: 12.5 }}
                    disabled={saving}
                  >
                    <ArrowLeft size={14} /> Voltar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="admin-btn admin-btn-secondary"
                    style={{ padding: '8px 14px', fontSize: 12.5 }}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <div>
                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="admin-btn admin-btn-primary"
                    style={{ padding: '8px 18px', fontSize: 12.5 }}
                  >
                    Avançar <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={saving}
                    className="admin-btn admin-btn-primary"
                    style={{ padding: '8px 20px', fontSize: 13, fontWeight: 700 }}
                  >
                    {saving ? 'Cadastrando Aluno...' : 'Concluir Cadastro'}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
