import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string | number;
  preventOutsideClose?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 600,
  preventOutsideClose = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }
    };

    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);

      // Auto-focus first focusable element after modal opens
      setTimeout(() => {
        const firstInput = modalRef.current?.querySelector<HTMLElement>(
          'input, select, textarea, button:not([title="Fechar"])'
        );
        firstInput?.focus();
      }, 50);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElement.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const parsedMaxWidth = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 'clamp(8px, 2.5vw, 24px)',
        boxSizing: 'border-box',
      }}
      onClick={() => {
        if (!preventOutsideClose) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={modalRef}
        style={{
          backgroundColor: 'var(--card-bg, #161616)',
          border: '1px solid var(--border-color, #262626)',
          borderRadius: 'var(--radius-lg, 16px)',
          width: '100%',
          maxWidth: `min(${parsedMaxWidth}, 100%)`,
          maxHeight: 'min(92vh, calc(100dvh - 20px))',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(217, 0, 0, 0.08)',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div
          style={{
            padding: 'clamp(12px, 2vw, 16px) clamp(14px, 3vw, 20px)',
            borderBottom: '1px solid var(--border-color, #262626)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--card-bg, #161616)',
            flexShrink: 0,
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3
              style={{
                fontSize: 'clamp(15px, 3vw, 17px)',
                fontWeight: 800,
                color: 'var(--text-primary, #FFFFFF)',
                margin: 0,
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary, #A1A1AA)',
                  margin: '3px 0 0 0',
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            title="Fechar"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #71717A)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 'var(--radius-sm, 8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s, background-color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FFFFFF';
              e.currentTarget.style.backgroundColor = '#222222';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted, #71717A)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div
          style={{
            padding: 'clamp(14px, 3vw, 20px)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            flex: 1,
            minWidth: 0,
          }}
        >
          {children}
        </div>

        {/* Optional Fixed Footer */}
        {footer && (
          <div
            style={{
              padding: 'clamp(10px, 2vw, 14px) clamp(14px, 3vw, 20px)',
              borderTop: '1px solid var(--border-color, #262626)',
              backgroundColor: 'var(--input-bg, #121212)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              gap: 10,
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
