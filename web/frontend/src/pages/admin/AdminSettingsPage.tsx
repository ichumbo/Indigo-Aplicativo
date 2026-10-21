import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Power, 
  Smartphone, 
  ShieldAlert,
  Sliders
} from 'lucide-react';
import { adminClient } from '../../api/adminClient';
import { AdminGlobalSettings } from '../../types/admin';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminSettingsPage: React.FC = () => {
  const { isSuperAdmin } = useAdminAuth();

  const [settings, setSettings] = useState<AdminGlobalSettings>({
    maintenance_mode: false,
    maintenance_message: '',
    enable_hydration_module: true,
    enable_photo_assessments: true,
    enable_chat_messaging: true,
    enable_auto_notifications: true,
    allow_public_registration: true,
    max_active_students_per_trainer: 50,
    min_required_app_version: '1.0.0',
    recommended_app_version: '1.0.0',
  });

  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await adminClient.get('/settings');
      if (res.data.settings) {
        setSettings(res.data.settings);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Falha ao buscar configurações.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('O motivo da alteração é obrigatório para a auditoria.');
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const payload = {
        ...settings,
        reason: reason.trim(),
      };
      const res = await adminClient.put('/settings', payload);
      setMessage({ type: 'success', text: res.data.message || 'Configurações atualizadas com sucesso!' });
      setReason('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao salvar alterações.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Configurações Globais da Operação</h1>
          <p className="admin-page-subtitle">
            Parâmetros de execução em tempo de execução, trava de versão mínima e modo de manutenção.
          </p>
        </div>

        <button 
          className="admin-btn admin-btn-secondary" 
          onClick={fetchSettings} 
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? 'admin-spin' : ''} />
          Atualizar
        </button>
      </div>

      {message && (
        <div style={{ 
          backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
          border: `1px solid ${message.type === 'success' ? '#10B981' : '#EF4444'}`, 
          borderRadius: 8, 
          padding: 14, 
          marginBottom: 18, 
          color: message.type === 'success' ? '#A7F3D0' : '#FCA5A5',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          {/* Card 1: Modo Manutenção */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Power size={18} color={settings.maintenance_mode ? '#EF4444' : '#10B981'} />
                <h3 className="admin-card-title">Modo de Manutenção</h3>
              </div>
              <span className={`admin-badge ${settings.maintenance_mode ? 'admin-badge-danger' : 'admin-badge-success'}`}>
                {settings.maintenance_mode ? 'ATIVO' : 'DESATIVADO'}
              </span>
            </div>

            <p style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 16 }}>
              Quando ativo, o aplicativo e a plataforma web bloqueiam requisições de alunos e personals com mensagem informativa.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <input
                type="checkbox"
                id="maintenance_mode"
                checked={settings.maintenance_mode}
                onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: '#D90000', cursor: 'pointer' }}
                disabled={!isSuperAdmin}
              />
              <label htmlFor="maintenance_mode" style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', cursor: 'pointer' }}>
                Ativar bloqueio geral para manutenção
              </label>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 6 }}>
                Mensagem exibida aos usuários:
              </label>
              <textarea
                rows={2}
                value={settings.maintenance_message}
                onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
                className="admin-filter-input"
                style={{ width: '100%', height: 'auto' }}
                disabled={!isSuperAdmin}
              />
            </div>
          </div>

          {/* Card 2: Portões de Versão do App Mobile */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Smartphone size={18} color="#D90000" />
                <h3 className="admin-card-title">Controle de Versões Mobile</h3>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 16 }}>
              Define a versão mínima compatível para exigir atualização via App Store / Google Play Store.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>
                  Versão Mínima Obrigatória
                </label>
                <input
                  type="text"
                  value={settings.min_required_app_version}
                  onChange={(e) => setSettings({ ...settings, min_required_app_version: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%' }}
                  disabled={!isSuperAdmin}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>
                  Versão Recomendada
                </label>
                <input
                  type="text"
                  value={settings.recommended_app_version}
                  onChange={(e) => setSettings({ ...settings, recommended_app_version: e.target.value })}
                  className="admin-filter-input"
                  style={{ width: '100%' }}
                  disabled={!isSuperAdmin}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Feature Flags do Sistema */}
          <div className="admin-card" style={{ gridColumn: 'span 2' }}>
            <div className="admin-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sliders size={18} color="#3B82F6" />
                <h3 className="admin-card-title">Módulos & Recursos Operacionais</h3>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="enable_hydration"
                  checked={settings.enable_hydration_module}
                  onChange={(e) => setSettings({ ...settings, enable_hydration_module: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: '#D90000' }}
                  disabled={!isSuperAdmin}
                />
                <label htmlFor="enable_hydration" style={{ fontSize: 13, color: '#FFFFFF' }}>Módulo de Hidratação</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="enable_photo"
                  checked={settings.enable_photo_assessments}
                  onChange={(e) => setSettings({ ...settings, enable_photo_assessments: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: '#D90000' }}
                  disabled={!isSuperAdmin}
                />
                <label htmlFor="enable_photo" style={{ fontSize: 13, color: '#FFFFFF' }}>Fotos em Avaliações Físicas</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="enable_chat"
                  checked={settings.enable_chat_messaging}
                  onChange={(e) => setSettings({ ...settings, enable_chat_messaging: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: '#D90000' }}
                  disabled={!isSuperAdmin}
                />
                <label htmlFor="enable_chat" style={{ fontSize: 13, color: '#FFFFFF' }}>Chat e Mensagens em Tempo Real</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="enable_notif"
                  checked={settings.enable_auto_notifications}
                  onChange={(e) => setSettings({ ...settings, enable_auto_notifications: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: '#D90000' }}
                  disabled={!isSuperAdmin}
                />
                <label htmlFor="enable_notif" style={{ fontSize: 13, color: '#FFFFFF' }}>Notificações Automáticas Push</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="allow_reg"
                  checked={settings.allow_public_registration}
                  onChange={(e) => setSettings({ ...settings, allow_public_registration: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: '#D90000' }}
                  disabled={!isSuperAdmin}
                />
                <label htmlFor="allow_reg" style={{ fontSize: 13, color: '#FFFFFF' }}>Cadastro Público Aberto</label>
              </div>
            </div>

            {/* Reason and Save button */}
            {isSuperAdmin && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #262626' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 6 }}>
                  Motivo Obrigatório da Alteração (registrado na trilha de auditoria):
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Habilitação de versão mínima após atualização da App Store..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="admin-filter-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={isSaving || !reason.trim()}
                  >
                    <Save size={14} />
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
