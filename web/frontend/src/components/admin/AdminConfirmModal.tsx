import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface AdminConfirmModalProps {
  isOpen: boolean;
  title: string;
  impactNotice: string;
  affectedUser?: string;
  requiredConfirmText?: string;
  confirmButtonText?: string;
  isDestructive?: boolean;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

export const AdminConfirmModal: React.FC<AdminConfirmModalProps> = ({
  isOpen,
  title,
  impactNotice,
  affectedUser,
  requiredConfirmText,
  confirmButtonText = 'Confirmar Ação',
  isDestructive = false,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfirmTextValid = !requiredConfirmText || confirmInput.trim() === requiredConfirmText;
  const isReasonValid = reason.trim().length >= 4;
  const canSubmit = isConfirmTextValid && isReasonValid && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    setError(null);
    try {
      await onConfirm(reason);
      setReason('');
      setConfirmInput('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Falha ao processar ação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isDestructive && <AlertTriangle size={20} color="#EF4444" />}
            <h3 className="admin-modal-title">{title}</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isLoading}
            style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {affectedUser && (
          <div style={{ fontSize: 13, color: '#A1A1AA' }}>
            Usuário afetado: <strong style={{ color: '#FFFFFF' }}>{affectedUser}</strong>
          </div>
        )}

        <div style={{ 
          backgroundColor: isDestructive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
          border: `1px solid ${isDestructive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
          padding: '12px 14px',
          borderRadius: 6,
          fontSize: 12.5,
          color: isDestructive ? '#FCA5A5' : '#93C5FD',
          lineHeight: 1.4
        }}>
          <strong>Impacto operacional:</strong> {impactNotice}
        </div>

        {error && (
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.2)', 
            border: '1px solid #EF4444', 
            padding: '10px 12px', 
            borderRadius: 6, 
            color: '#FCA5A5', 
            fontSize: 12.5 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 6 }}>
              Motivo obrigatório (registrado em trilha de auditoria):
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo desta ação administrativa..."
              required
              rows={3}
              style={{
                width: '100%',
                backgroundColor: 'var(--admin-bg-elevated)',
                border: '1px solid var(--admin-border)',
                borderRadius: 6,
                color: '#FFFFFF',
                padding: '10px',
                fontSize: 13,
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          {requiredConfirmText && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 6 }}>
                Para confirmar, digite <span style={{ color: '#EF4444', fontWeight: 700 }}>{requiredConfirmText}</span> abaixo:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={requiredConfirmText}
                required
                style={{
                  width: '100%',
                  backgroundColor: 'var(--admin-bg-elevated)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: 6,
                  color: '#FFFFFF',
                  padding: '9px 12px',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`admin-btn ${isDestructive ? 'admin-btn-danger' : 'admin-btn-primary'}`}
              disabled={!canSubmit}
            >
              {isLoading ? 'Processando...' : confirmButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
