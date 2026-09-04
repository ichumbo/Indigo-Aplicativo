import React from 'react';

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
