import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px dashed var(--border-color)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {icon && <div style={{ color: 'var(--text-muted)', marginBottom: 16 }}>{icon}</div>}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 400, marginBottom: actionLabel ? 20 : 0 }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn btn-primary btn-sm">
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export const Loader: React.FC<{ text?: string }> = ({ text = 'Carregando dados...' }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: '3px solid var(--border-color)',
          borderTopColor: 'var(--accent-red)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{text}</span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
