import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Award,
  Save,
  CheckCircle2,
  User,
  Smartphone,
  Lock,
  Camera,
  Check,
  Palette,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  generateBrandTokens,
  applyBrandTheme,
  isValidHex,
  normalizeHex,
} from '../utils/color-contrast-utils';

const COLOR_PRESETS = [
  { id: 'crimson', name: 'Vermelho Dragon', hex: '#D90000' },
  { id: 'electric-blue', name: 'Azul Elétrico', hex: '#2563EB' },
  { id: 'emerald', name: 'Verde Esmeralda', hex: '#10B981' },
  { id: 'amber', name: 'Ouro / Âmbar', hex: '#F59E0B' },
  { id: 'purple', name: 'Roxo Cyber', hex: '#8B5CF6' },
  { id: 'cyan', name: 'Ciano Neon', hex: '#06B6D4' },
  { id: 'pink', name: 'Rosa Intenso', hex: '#EC4899' },
  { id: 'orange', name: 'Laranja Sunset', hex: '#F97316' },
];

export const SettingsPage: React.FC = () => {
  const { user, trainerProfile, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'subscription' | 'sync' | 'security'>('profile');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [crefNumber, setCrefNumber] = useState<string>('');
  const [crefState, setCrefState] = useState<string>('SP');
  const [bio, setBio] = useState<string>('');
  const [instagram, setInstagram] = useState<string>('');
  const [workingHours, setWorkingHours] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Branding State
  const [primaryColor, setPrimaryColor] = useState<string>(() => {
    return localStorage.getItem('dragoncorp_brand_primary') || '#D90000';
  });
  const [businessName, setBusinessName] = useState<string>('Consultoria Personalizada');
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');

  const brandTokens = generateBrandTokens(primaryColor);

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

  const handleColorSelect = (hex: string) => {
    const normalized = normalizeHex(hex);
    setPrimaryColor(normalized);
    applyBrandTheme(normalized);
    localStorage.setItem('dragoncorp_brand_primary', normalized);
  };

  const handleResetBranding = () => {
    handleColorSelect('#D90000');
    setCustomLogoUrl('');
    setBusinessName('Consultoria Personalizada');
  };

  const trainerAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: '100%' }}>
      {/* 1. Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.4 }}>
          Configurações da Conta
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          Gerenciamento do perfil profissional, identidade visual customizada, credenciais de CREF e plano PRO.
        </p>
      </div>

      {/* 2. Top Settings Navigation Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid #222222', paddingBottom: 10 }}>
        {[
          { key: 'profile', label: 'Perfil Profissional', icon: User },
          { key: 'branding', label: 'Identidade Visual & Cores', icon: Palette },
          { key: 'subscription', label: 'Plano DragonCorp PRO', icon: Award },
          { key: 'sync', label: 'DragonSync™ Mobile', icon: Smartphone },
          { key: 'security', label: 'Segurança & Acesso', icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                fontWeight: 700,
                border: isActive ? '1px solid var(--accent-red)' : '1px solid #252525',
                backgroundColor: isActive ? 'var(--accent-red)' : '#161616',
                color: isActive ? 'var(--text-on-primary, #FFFFFF)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PERFIL */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Trainer Profile Overview Card */}
          <div
            style={{
              backgroundColor: '#141414',
              border: '1px solid #222222',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                <img
                  src={trainerAvatar}
                  alt="Personal Trainer"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 'var(--radius-md)',
                    objectFit: 'cover',
                    border: '1px solid #2A2A2A',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    width: 20,
                    height: 20,
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #141414',
                  }}
                  title="Treinador Verificado Online"
                >
                  <Check size={11} color="#FFFFFF" strokeWidth={3} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {name || 'Personal DragonCorp'}
                  </h2>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      backgroundColor: '#D90000',
                      color: '#FFFFFF',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  >
                    PRO
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: '#34D399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ShieldCheck size={14} />
                    CREF {crefNumber ? `${crefNumber}/${crefState}` : '123456-G/SP'} (Verificado)
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    • Treinador Oficial DragonCorp
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#1E1E1E',
                border: '1px solid #2C2C2C',
                color: 'var(--text-secondary)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Camera size={13} />
              <span>Alterar Foto</span>
            </button>
          </div>

          {/* Form Fields Card */}
          <div
            style={{
              backgroundColor: '#141414',
              border: '1px solid #222222',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', borderBottom: '1px solid #222222', paddingBottom: 10 }}>
              Dados Cadastrais & Especialidades
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#181818',
                    border: '1px solid #282828',
                    borderRadius: 'var(--radius-sm)',
                    padding: '9px 12px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 90000-0000"
                  style={{
                    width: '100%',
                    backgroundColor: '#181818',
                    border: '1px solid #282828',
                    borderRadius: 'var(--radius-sm)',
                    padding: '9px 12px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Número do CREF
                </label>
                <input
                  type="text"
                  value={crefNumber}
                  onChange={(e) => setCrefNumber(e.target.value)}
                  placeholder="Ex: 123456-G"
                  style={{
                    width: '100%',
                    backgroundColor: '#181818',
                    border: '1px solid #282828',
                    borderRadius: 'var(--radius-sm)',
                    padding: '9px 12px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                  UF do CREF
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={crefState}
                  onChange={(e) => setCrefState(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    backgroundColor: '#181818',
                    border: '1px solid #282828',
                    borderRadius: 'var(--radius-sm)',
                    padding: '9px 12px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                Biografia Profissional & Especialidades
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ex: Especialista em Fisiologia do Exercício, Hipertrofia e Reabilitação de Lesões..."
                rows={3}
                style={{
                  width: '100%',
                  backgroundColor: '#181818',
                  border: '1px solid #282828',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Instagram Profissional
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@personaldragoncorp"
                  style={{
                    width: '100%',
                    backgroundColor: '#181818',
                    border: '1px solid #282828',
                    borderRadius: 'var(--radius-sm)',
                    padding: '9px 12px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Horários de Atendimento
                </label>
                <input
                  type="text"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  placeholder="Ex: Segunda a Sexta das 06:00 às 21:00"
                  style={{
                    width: '100%',
                    backgroundColor: '#181818',
                    border: '1px solid #282828',
                    borderRadius: 'var(--radius-sm)',
                    padding: '9px 12px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Bottom Form Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 14,
                borderTop: '1px solid #222222',
                marginTop: 6,
              }}
            >
              {savedSuccess ? (
                <span style={{ color: '#34D399', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} /> Configurações salvas com sucesso!
                </span>
              ) : (
                <span />
              )}

              <button
                type="submit"
                disabled={saving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 800,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#D90000',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#B30000')}
                onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#D90000')}
              >
                <Save size={15} />
                <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB: BRANDING & IDENTIDADE VISUAL */}
      {activeTab === 'branding' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Main Customizer Card */}
          <div
            style={{
              backgroundColor: '#141414',
              border: '1px solid #222222',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--accent-red-subtle, rgba(217, 0, 0, 0.12))',
                    border: '1px solid var(--accent-red-border, rgba(217, 0, 0, 0.35))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-red)',
                  }}
                >
                  <Palette size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Identidade Visual & Cores da Consultoria
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                    Personalize a cor principal e o logotipo da sua consultoria. O sistema opera exclusivamente em Dark Mode.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetBranding}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#1C1C1C',
                  border: '1px solid #282828',
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={13} />
                <span>Restaurar Padrão DragonCorp</span>
              </button>
            </div>

            {/* Presets Grid */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
                Paletas Recomendadas de Alta Performance
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                {COLOR_PRESETS.map((preset) => {
                  const isSelected = primaryColor.toUpperCase() === preset.hex.toUpperCase();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleColorSelect(preset.hex)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isSelected ? '#222222' : '#181818',
                        border: isSelected ? `2px solid ${preset.hex}` : '1px solid #282828',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          backgroundColor: preset.hex,
                          flexShrink: 0,
                          border: '1px solid rgba(255,255,255,0.2)',
                        }}
                      />
                      <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom HEX and Contrast Ratio Evaluation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Código HEX Personalizado
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => handleColorSelect(e.target.value)}
                    style={{
                      width: 44,
                      height: 38,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: '#181818',
                      border: '1px solid #282828',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => handleColorSelect(e.target.value)}
                    placeholder="#D90000"
                    maxLength={7}
                    style={{
                      flex: 1,
                      backgroundColor: '#181818',
                      border: '1px solid #282828',
                      borderRadius: 'var(--radius-sm)',
                      padding: '9px 12px',
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Acessibilidade & Contraste WCAG 2.1
                </label>
                <div
                  style={{
                    backgroundColor: '#181818',
                    border: '1px solid #282828',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Contraste no Fundo Dark:</span>
                    <strong style={{ marginLeft: 6, color: brandTokens.isAccessibleOnDark ? '#34D399' : '#F59E0B' }}>
                      {brandTokens.contrastOnDark}:1 ({brandTokens.isAccessibleOnDark ? 'Aprovado AA' : 'Baixo Contraste'})
                    </strong>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: brandTokens.isAccessibleOnDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: brandTokens.isAccessibleOnDark ? '#34D399' : '#F59E0B',
                    }}
                  >
                    Texto {brandTokens.brandOnPrimary === '#FFFFFF' ? 'Branco' : 'Preto'}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Component Preview */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
                Pré-Visualização em Tempo Real dos Elementos da Interface
              </label>
              <div
                style={{
                  backgroundColor: '#0F0F0F',
                  border: '1px solid #222222',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  style={{
                    backgroundColor: 'var(--accent-red)',
                    color: 'var(--text-on-primary, #FFFFFF)',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Sparkles size={15} />
                  <span>Botão Principal</span>
                </button>

                <div
                  style={{
                    backgroundColor: 'var(--accent-red-subtle)',
                    border: '1px solid var(--accent-red-border)',
                    color: 'var(--accent-red)',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Badge / Tag Ativa
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--accent-red-subtle)',
                    borderLeft: '3px solid var(--accent-red)',
                    color: 'var(--accent-red)',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <Palette size={16} />
                  <span>Item Selecionado do Menu</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ASSINATURA */}
      {activeTab === 'subscription' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              backgroundColor: '#141414',
              border: '1px solid rgba(217, 0, 0, 0.4)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: '#D90000',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Award size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                      Plano DragonCorp PRO
                    </h3>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: '#34D399',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      ATIVO
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Acesso irrestrito a todas as ferramentas profissionais do ecossistema DragonCorp.
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Limite de Alunos
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#34D399', marginTop: 2 }}>
                  Ilimitados
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
                backgroundColor: '#181818',
                border: '1px solid #222222',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
              }}
            >
              {[
                'Alunos & Prescrições Ilimitadas',
                'DragonSync™ Live com App dos Alunos',
                'Montador Biomecânico de Treinos & Bi-sets',
                'Protocolos Aeróbios & Conconi',
                'Avaliações Físicas & Dobras Cutâneas',
                'Gráficos de Sobrecarga & 1RM Estimado',
              ].map((feat, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)' }}>
                  <Check size={15} color="#34D399" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DRAGONSYNC */}
      {activeTab === 'sync' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              backgroundColor: '#141414',
              border: '1px solid #222222',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34D399',
                }}
              >
                <Smartphone size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Motor DragonSync™ de Sincronização Mobile
                  </h3>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#10B981', fontWeight: 700 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981' }} />
                    Conectado
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Garante envio imediato de fichas, execuções de séries em tempo real e notificações push para os alunos.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              <div style={{ backgroundColor: '#181818', border: '1px solid #222222', padding: '14px 16px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Latência Média</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#34D399', marginTop: 2 }}>&lt; 85 ms</div>
              </div>
              <div style={{ backgroundColor: '#181818', border: '1px solid #222222', padding: '14px 16px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>App Mobile Compatível</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>DragonCorp iOS / Android v2.4</div>
              </div>
              <div style={{ backgroundColor: '#181818', border: '1px solid #222222', padding: '14px 16px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Protocolo de Rede</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#38BDF8', marginTop: 2 }}>WebSocket / REST TLS 1.3</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SEGURANÇA */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              backgroundColor: '#141414',
              border: '1px solid #222222',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
              Segurança & Credenciais de Acesso
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Altere sua senha de acesso ou encerre sessões ativas no ecossistema DragonCorp.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16, maxWidth: 640 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Nova Senha
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    backgroundColor: '#181818',
                    border: '1px solid #282828',
                    borderRadius: 'var(--radius-sm)',
                    padding: '9px 12px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    backgroundColor: '#181818',
                    border: '1px solid #282828',
                    borderRadius: 'var(--radius-sm)',
                    padding: '9px 12px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ paddingTop: 12 }}>
              <button
                type="button"
                style={{
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#1E1E1E',
                  border: '1px solid #2C2C2C',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                Atualizar Senha de Acesso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
