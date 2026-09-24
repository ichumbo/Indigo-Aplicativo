import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            backgroundColor: 'var(--bg-app, #0A0A0A)',
            color: 'var(--text-primary, #FFFFFF)',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '540px',
              width: '100%',
              padding: '32px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              border: '1px solid var(--border-color, #262626)',
              backgroundColor: 'var(--card-bg, #141414)',
              borderRadius: 'var(--radius-lg, 12px)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            }}
          >
            <div
              className="icon-badge icon-badge-danger"
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <div>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--text-primary, #FFFFFF)',
                  margin: '0 0 8px',
                }}
              >
                {this.props.fallbackTitle || 'Ocorreu uma instabilidade nesta tela'}
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary, #A1A1AA)',
                  margin: 0,
                  lineHeight: '1.5',
                }}
              >
                {this.props.fallbackMessage ||
                  'Não se preocupe, seus dados estão seguros. Você pode tentar recarregar a visualização ou navegar para a tela inicial.'}
              </p>
            </div>

            {this.state.error && (
              <div
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'rgba(217, 0, 0, 0.08)',
                  border: '1px solid rgba(217, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  textAlign: 'left',
                  fontSize: '12px',
                  color: '#FF6B6B',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '120px',
                }}
              >
                {this.state.error.toString()}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '12px',
                width: '100%',
                justifyContent: 'center',
                marginTop: '8px',
              }}
            >
              <button
                onClick={this.handleReset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  backgroundColor: 'var(--accent-red, #D90000)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s ease',
                }}
              >
                <RefreshCw size={15} />
                Recarregar Página
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary, #FFFFFF)',
                  border: '1px solid var(--border-color, #262626)',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <Home size={15} />
                Ir ao Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
