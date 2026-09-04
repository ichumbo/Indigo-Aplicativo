import React, { useEffect, useState } from 'react';
import { ShieldCheck, CreditCard, Save, CheckCircle2, User, Award } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/common/Loader';

export const SettingsPage: React.FC = () => {
  const { user, trainerProfile, subscription, refreshProfile } = useAuth();

  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [crefNumber, setCrefNumber] = useState<string>('');
  const [crefState, setCrefState] = useState<string>('SP');
  const [bio, setBio] = useState<string>('');
  const [instagram, setInstagram] = useState<string>('');
  const [workingHours, setWorkingHours] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
    if (trainerProfile) {
      setCrefNumber(trainerProfile.cref_number || '');
      setCrefState(trainerProfile.cref_state || 'SP');
      setBio(trainerProfile.bio || '');
      setInstagram(trainerProfile.instagram || '');
      setWorkingHours(trainerProfile.working_hours || '');
    }
  }, [user, trainerProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await apiClient.put('/profile', {
        name,
        phone,
        crefNumber,
        crefState,
        bio,
        instagram,
        workingHours,
      });
      await refreshProfile();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert('Falha ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 840, margin: '0 auto' }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
          Configurações da Conta
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Dados profissionais, verificação de CREF e status da assinatura DragonCorp.
        </p>
      </div>

      {/* Subscription Card */}
      <div
        className="card"
        style={{
          border: '1px solid var(--accent-red-border)',
          backgroundColor: 'rgba(229, 9, 20, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-red)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Plano DragonCorp PRO
                </h3>
                <span className="badge badge-green">Ativo</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                Alunos ilimitados • Prescrição Web completa • Histórico de cargas integrado
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Limite de Alunos
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-success)' }}>
              Ilimitados
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="card">
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 18 }}>
          Informações do Personal Trainer
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Nome Completo</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Telefone / WhatsApp</label>
            <input
              type="text"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Número do CREF</label>
            <input
              type="text"
              className="form-input"
              value={crefNumber}
              onChange={(e) => setCrefNumber(e.target.value)}
              placeholder="Ex: 123456-G"
            />
          </div>

          <div className="form-group">
            <label className="form-label">UF do CREF</label>
            <input
              type="text"
              maxLength={2}
              className="form-input"
              value={crefState}
              onChange={(e) => setCrefState(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Biografia Profissional & Especialidades</label>
          <textarea
            className="form-textarea"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Ex: Especialista em hipertrofia e reabilitação de lesões..."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Instagram Profissional</label>
            <input
              type="text"
              className="form-input"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@seu.perfil"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Horários de Atendimento</label>
            <input
              type="text"
              className="form-input"
              value={workingHours}
              onChange={(e) => setWorkingHours(e.target.value)}
              placeholder="Ex: Seg a Sex das 06h às 21h"
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
          {savedSuccess ? (
            <span style={{ color: 'var(--color-success)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} /> Configurações salvas com sucesso!
            </span>
          ) : <span />}

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
          >
            <Save size={15} />
            <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
