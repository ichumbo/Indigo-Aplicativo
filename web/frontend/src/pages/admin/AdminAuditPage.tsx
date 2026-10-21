import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X,
  FileCode,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { adminClient } from '../../api/adminClient';
import { AdminAuditItem } from '../../types/admin';

export const AdminAuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditItem[]>([]);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AdminAuditItem | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (level) params.append('level', level);
      params.append('page', page.toString());
      params.append('per_page', '20');

      const res = await adminClient.get(`/audit?${params.toString()}`);
      setLogs(res.data.data || []);
      setTotal(res.data.meta?.total || 0);
      setTotalPages(res.data.meta?.last_page || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao carregar trilha de auditoria.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, level, page]);

  const formatLevel = (lvl: string) => {
    switch (lvl) {
      case 'alert': return <span className="admin-badge admin-badge-danger">Alerta</span>;
      case 'warning': return <span className="admin-badge admin-badge-warning">Aviso</span>;
      case 'success': return <span className="admin-badge admin-badge-success">Sucesso</span>;
      default: return <span className="admin-badge admin-badge-info">Info</span>;
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Trilha Imutável de Auditoria</h1>
          <p className="admin-page-subtitle">
            Registro de segurança com correlação de eventos, IP, user-agent e diffs sanitizados.
          </p>
        </div>

        <button 
          className="admin-btn admin-btn-secondary" 
          onClick={fetchLogs} 
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? 'admin-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Filter Bar */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: '#71717A' }} />
            <input
              type="text"
              placeholder="Buscar por ação, correlation ID, ator ou ID afetado..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="admin-filter-input"
              style={{ width: '100%', paddingLeft: 36 }}
            />
          </div>

          <select 
            value={level} 
            onChange={(e) => { setLevel(e.target.value); setPage(1); }}
            className="admin-filter-select"
          >
            <option value="">Severidade: Todas</option>
            <option value="info">Info</option>
            <option value="warning">Aviso (Warning)</option>
            <option value="alert">Alerta Crítico</option>
          </select>

          {(search || level) && (
            <button
              className="admin-btn admin-btn-secondary"
              onClick={() => { setSearch(''); setLevel(''); setPage(1); }}
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: 8, padding: 14, marginBottom: 18, color: '#FCA5A5' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ação Auditada</th>
              <th>Severidade</th>
              <th>Motivo / Descrição</th>
              <th>Entidade Alvo</th>
              <th>Correlation ID</th>
              <th>Data & Hora</th>
              <th style={{ textAlign: 'right' }}>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1, 2, 3, 4].map((i) => (
                <tr key={i}><td colSpan={7}><div className="admin-skeleton" style={{ height: 24, width: '100%' }} /></td></tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="admin-empty-state">
                    <ShieldAlert size={32} color="#71717A" />
                    <div className="admin-empty-title">Nenhum evento localizado</div>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: 13 }}>{log.action}</div>
                    <div style={{ fontSize: 10.5, color: '#71717A' }}>
                      Ator: {log.actor_id || 'Sistema/Admin'}
                    </div>
                  </td>
                  <td>{formatLevel(log.level)}</td>
                  <td style={{ fontSize: 12.5, color: '#A1A1AA', maxWidth: 280 }}>
                    {log.reason || log.details || '-'}
                  </td>
                  <td style={{ fontSize: 11.5, color: '#D4D4D8', fontFamily: 'monospace' }}>
                    {log.target_id ? log.target_id.substring(0, 12) + '...' : '-'}
                  </td>
                  <td style={{ fontSize: 11, color: '#71717A', fontFamily: 'monospace' }}>
                    {log.correlation_id ? log.correlation_id.substring(0, 8) + '...' : '-'}
                  </td>
                  <td style={{ fontSize: 12, color: '#A1A1AA' }}>
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="admin-btn admin-btn-secondary"
                      style={{ padding: '4px 8px' }}
                      onClick={() => setSelectedLog(log)}
                      title="Ver Dados Sanitizados e Payload Completo"
                    >
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="admin-pagination-bar">
        <div className="admin-pagination-info">
          Total de {total} registros imutáveis
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="admin-btn admin-btn-secondary"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          <button
            className="admin-btn admin-btn-secondary"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage(page + 1)}
          >
            Próxima <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={20} color="#D90000" />
                <h3 className="admin-modal-title">Evento: {selectedLog.action}</h3>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12.5, marginBottom: 16 }}>
              <div>
                <span style={{ color: '#71717A', display: 'block' }}>Correlation ID:</span>
                <code style={{ color: '#D90000' }}>{selectedLog.correlation_id || 'N/A'}</code>
              </div>
              <div>
                <span style={{ color: '#71717A', display: 'block' }}>Data e Hora:</span>
                <span style={{ color: '#FFFFFF' }}>{new Date(selectedLog.created_at).toLocaleString('pt-BR')}</span>
              </div>
              <div>
                <span style={{ color: '#71717A', display: 'block' }}>IP de Origem:</span>
                <span style={{ color: '#FFFFFF' }}>{selectedLog.ip_address || '127.0.0.1'}</span>
              </div>
              <div>
                <span style={{ color: '#71717A', display: 'block' }}>User Agent:</span>
                <span style={{ color: '#A1A1AA', fontSize: 11 }}>{selectedLog.user_agent || 'DragonCorp Admin Portal'}</span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#A1A1AA', display: 'block', marginBottom: 4 }}>Motivo Registrado</span>
              <div style={{ backgroundColor: '#141414', padding: '8px 12px', borderRadius: 6, fontSize: 13, color: '#FFFFFF' }}>
                {selectedLog.reason || selectedLog.details || 'Ação operacional regular'}
              </div>
            </div>

            {selectedLog.old_values && (
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', display: 'block', marginBottom: 4 }}>
                  Valores Anteriores (Sanitizados)
                </span>
                <pre style={{ backgroundColor: '#0A0A0A', padding: 10, borderRadius: 6, fontSize: 11, color: '#FCA5A5', overflowX: 'auto' }}>
                  {JSON.stringify(selectedLog.old_values, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.new_values && (
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981', display: 'block', marginBottom: 4 }}>
                  Valores Novos (Sanitizados)
                </span>
                <pre style={{ backgroundColor: '#0A0A0A', padding: 10, borderRadius: 6, fontSize: 11, color: '#86EFAC', overflowX: 'auto' }}>
                  {JSON.stringify(selectedLog.new_values, null, 2)}
                </pre>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="admin-btn admin-btn-secondary" onClick={() => setSelectedLog(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
