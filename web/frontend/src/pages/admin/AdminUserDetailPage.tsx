import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  LogOut, 
  KeyRound, 
  Download, 
  FileText, 
  Clock, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Activity, 
  ShieldCheck, 
  Phone, 
  Mail, 
  Calendar, 
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { adminClient } from '../../api/adminClient';
import { AdminUserDetail, AdminAuditItem } from '../../types/admin';
import { AdminConfirmModal } from '../../components/admin/AdminConfirmModal';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminUserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin, hasPermission } = useAdminAuth();

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'account' | 'relationships' | 'subscription' | 'activity' | 'support'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalAction, setModalAction] = useState<'suspend' | 'reactivate' | 'revoke' | 'reset_password' | 'anonymize' | null>(null);

  const fetchUserDetail = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminClient.get(`/users/${id}`);
      setDetail(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao carregar detalhes completos do usuário.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetail();
  }, [id]);

  const handleConfirmAction = async (reason: string) => {
    if (!modalAction || !detail) return;

    if (modalAction === 'suspend') {
      await adminClient.post(`/users/${detail.user.id}/suspend`, { reason });
    } else if (modalAction === 'reactivate') {
      await adminClient.post(`/users/${detail.user.id}/reactivate`, { reason });
    } else if (modalAction === 'revoke') {
      await adminClient.post(`/users/${detail.user.id}/revoke-sessions`, { reason });
    } else if (modalAction === 'reset_password') {
      await adminClient.post(`/users/${detail.user.id}/password-reset`, { reason });
    } else if (modalAction === 'anonymize') {
      await adminClient.post(`/users/${detail.user.id}/anonymize`, { reason, confirmation: 'ANONIMIZAR' });
    }

    setModalAction(null);
    fetchUserDetail();
  };

  const handleExportData = () => {
    if (!detail) return;
    const blob = new Blob([JSON.stringify(detail, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dragoncorp-lgpd-portabilidade-${detail.user.id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div className="admin-spin" style={{ width: 32, height: 32, border: '3px solid #2C2C2C', borderTopColor: '#D90000', borderRadius: '50%', margin: '0 auto 16px' }} />
        <p style={{ color: '#A1A1AA', fontSize: 13 }}>Carregando perfil administrativo auditado...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="admin-card" style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <AlertTriangle size={36} color="#EF4444" style={{ margin: '0 auto 12px' }} />
        <h2 style={{ fontSize: 18, color: '#FFFFFF', marginBottom: 8 }}>Erro ao carregar usuário</h2>
        <p style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 20 }}>{error || 'Usuário não encontrado.'}</p>
        <button className="admin-btn admin-btn-secondary" onClick={() => navigate('/admin/users')}>
          <ArrowLeft size={14} /> Voltar à Lista
        </button>
      </div>
    );
  }

  const { user, trainer_profile, student_profile, trainer_students, student_trainers, subscription, activity_timeline } = detail;

  return (
    <div>
      {/* Back button */}
      <div style={{ marginBottom: 16 }}>
        <button 
          className="admin-btn admin-btn-secondary" 
          onClick={() => navigate('/admin/users')}
          style={{ padding: '6px 12px' }}
        >
          <ArrowLeft size={14} /> Voltar para Usuários
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ 
              width: 56, 
              height: 56, 
              borderRadius: '50%', 
              backgroundColor: '#1F1F1F', 
              border: '2px solid #D90000',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 18,
              color: '#FFFFFF'
            }}>
              {user.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{user.name}</h1>
                <span className={`admin-badge ${user.status === 'ACTIVE' ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                  {user.status}
                </span>
                <span className="admin-badge admin-badge-info">
                  {user.role}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#71717A', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>ID: <code style={{ color: '#A1A1AA' }}>{user.id}</code></span>
                <span>•</span>
                <span>E-mail: <strong style={{ color: '#D4D4D8' }}>{user.email}</strong></span>
                {user.phone && (
                  <>
                    <span>•</span>
                    <span>Tel: <strong style={{ color: '#D4D4D8' }}>{user.phone}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {user.status === 'SUSPENDED' ? (
              <button
                className="admin-btn admin-btn-secondary"
                style={{ color: '#10B981' }}
                onClick={() => setModalAction('reactivate')}
              >
                <UserCheck size={14} /> Reativar
              </button>
            ) : (
              <button
                className="admin-btn admin-btn-secondary"
                style={{ color: '#EF4444' }}
                onClick={() => setModalAction('suspend')}
              >
                <UserX size={14} /> Suspender
              </button>
            )}

            <button
              className="admin-btn admin-btn-secondary"
              onClick={() => setModalAction('revoke')}
              title="Desconectar todas as sessões ativas"
            >
              <LogOut size={14} /> Revogar Sessões
            </button>

            <button
              className="admin-btn admin-btn-secondary"
              onClick={() => setModalAction('reset_password')}
              title="Enviar link seguro de recuperação de senha"
            >
              <KeyRound size={14} /> Redefinir Senha
            </button>

            <button
              className="admin-btn admin-btn-secondary"
              onClick={handleExportData}
              title="Exportar Portabilidade LGPD em JSON"
            >
              <Download size={14} /> Exportar LGPD
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="admin-tabs-nav">
        {[
          { id: 'overview', label: 'Resumo Operacional' },
          { id: 'account', label: 'Conta & Segurança' },
          { id: 'relationships', label: user.role === 'TRAINER' ? 'Alunos Vinculados' : 'Personal Responsável' },
          { id: 'subscription', label: 'Assinatura & Loja' },
          { id: 'activity', label: `Trilha de Atividade (${activity_timeline.length})` },
          { id: 'support', label: 'Suporte & LGPD' },
        ].map((t) => (
          <button
            key={t.id}
            className={`admin-tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Resumo Operacional */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div className="admin-card">
            <h3 className="admin-card-title" style={{ marginBottom: 12 }}>Indicadores Chave</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid #262626', paddingBottom: 8 }}>
                <span style={{ color: '#71717A' }}>Sessões ativas registradas:</span>
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{user.sessions_count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid #262626', paddingBottom: 8 }}>
                <span style={{ color: '#71717A' }}>E-mail validado:</span>
                <span style={{ color: user.is_email_verified ? '#10B981' : '#F59E0B', fontWeight: 600 }}>
                  {user.is_email_verified ? 'Sim' : 'Pendente de verificação'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid #262626', paddingBottom: 8 }}>
                <span style={{ color: '#71717A' }}>Plano atual:</span>
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{subscription?.plan_id || 'Básico (Free)'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#71717A' }}>Canal de faturamento:</span>
                <span style={{ color: '#FFFFFF', fontWeight: 600, textTransform: 'capitalize' }}>
                  {subscription?.provider || 'Nenhum'} ({subscription?.environment || 'N/A'})
                </span>
              </div>
            </div>
          </div>

          <div className="admin-card">
            <h3 className="admin-card-title" style={{ marginBottom: 12 }}>Identidade de Atuação</h3>
            {user.role === 'TRAINER' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div>CREF: <strong style={{ color: '#FFFFFF' }}>{trainer_profile?.cref_number || 'Não informado'} ({trainer_profile?.cref_state || 'UF'})</strong></div>
                <div>Status do CREF: <span className="admin-badge admin-badge-info">{trainer_profile?.cref_verification_status || 'PENDENTE'}</span></div>
                <div>Código do Personal: <code style={{ color: '#D90000' }}>{user.trainer_code || user.professional_id || 'N/A'}</code></div>
                <div>Alunos Ativos no Vínculo: <strong style={{ color: '#10B981' }}>{trainer_students?.length || 0}</strong></div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div>Objetivo Principal: <strong style={{ color: '#FFFFFF' }}>{student_profile?.main_goal || 'Hipertrofia e Condicionamento'}</strong></div>
                <div>Data de Nascimento: <span style={{ color: '#D4D4D8' }}>{student_profile?.birth_date || 'Não informada'}</span></div>
                <div>Gênero: <span style={{ color: '#D4D4D8' }}>{student_profile?.gender || 'Não informado'}</span></div>
                <div>Personal Vinculado: <strong style={{ color: '#3B82F6' }}>{student_trainers?.[0]?.trainer?.name || 'Sem personal no momento'}</strong></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Conta & Segurança */}
      {activeTab === 'account' && (
        <div className="admin-card">
          <h3 className="admin-card-title" style={{ marginBottom: 16 }}>Dados Cadastrais e Autenticação</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, fontSize: 13 }}>
            <div>
              <span style={{ color: '#71717A', display: 'block', marginBottom: 4 }}>Nome Completo</span>
              <div style={{ color: '#FFFFFF', fontWeight: 600 }}>{user.name}</div>
            </div>
            <div>
              <span style={{ color: '#71717A', display: 'block', marginBottom: 4 }}>E-mail Sanitizado</span>
              <div style={{ color: '#FFFFFF', fontWeight: 600 }}>{user.email}</div>
            </div>
            <div>
              <span style={{ color: '#71717A', display: 'block', marginBottom: 4 }}>Telefone Sanitizado</span>
              <div style={{ color: '#FFFFFF', fontWeight: 600 }}>{user.phone || 'Não cadastrado'}</div>
            </div>
            <div>
              <span style={{ color: '#71717A', display: 'block', marginBottom: 4 }}>CPF Mascarado (LGPD)</span>
              <div style={{ color: '#FFFFFF', fontWeight: 600 }}>{user.cpf || 'Não fornecido'}</div>
            </div>
            <div>
              <span style={{ color: '#71717A', display: 'block', marginBottom: 4 }}>Data de Cadastro Oficial</span>
              <div style={{ color: '#FFFFFF' }}>{user.created_at ? new Date(user.created_at).toLocaleString('pt-BR') : '-'}</div>
            </div>
            <div>
              <span style={{ color: '#71717A', display: 'block', marginBottom: 4 }}>Último Acesso Registrado</span>
              <div style={{ color: '#FFFFFF' }}>{user.last_access_at ? new Date(user.last_access_at).toLocaleString('pt-BR') : 'Nunca acessou'}</div>
            </div>
          </div>

          <div style={{ 
            marginTop: 24, 
            padding: 16, 
            backgroundColor: '#1E1E1E', 
            borderRadius: 6, 
            border: '1px solid #2C2C2C' 
          }}>
            <h4 style={{ fontSize: 13, color: '#EF4444', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} /> Política de Segurança DragonCorp
            </h4>
            <p style={{ fontSize: 12.5, color: '#A1A1AA', lineHeight: 1.5 }}>
              Por diretriz de arquitetura e conformidade técnica, senhas de usuários nunca são armazenadas em texto puro e jamais podem ser lidas ou visualizadas por administradores. Para auxiliar o usuário, utilize o botão <strong>Redefinir Senha</strong> que envia um link seguro para o endereço oficial do usuário.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Relacionamentos (Vínculos) */}
      {activeTab === 'relationships' && (
        <div className="admin-card">
          <h3 className="admin-card-title" style={{ marginBottom: 14 }}>
            {user.role === 'TRAINER' ? 'Alunos Atualmente Vinculados' : 'Histórico de Treinador'}
          </h3>

          {user.role === 'TRAINER' ? (
            (!trainer_students || trainer_students.length === 0) ? (
              <div className="admin-empty-state">
                <Users size={32} color="#71717A" />
                <div className="admin-empty-title">Nenhum aluno vinculado a este Personal</div>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>Status do Vínculo</th>
                      <th style={{ textAlign: 'right' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainer_students.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{item.student?.name || 'Aluno'}</div>
                          <div style={{ fontSize: 11, color: '#71717A' }}>{item.student?.email}</div>
                        </td>
                        <td>
                          <span className={`admin-badge ${item.status === 'active' ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="admin-btn admin-btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11.5 }}
                            onClick={() => navigate(`/admin/users/${item.student_id}`)}
                          >
                            Abrir Perfil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            (!student_trainers || student_trainers.length === 0) ? (
              <div className="admin-empty-state">
                <Users size={32} color="#71717A" />
                <div className="admin-empty-title">Aluno sem personal associado no momento</div>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Personal Trainer</th>
                      <th>CREF / Código</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {student_trainers.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{item.trainer?.name || 'Treinador'}</div>
                          <div style={{ fontSize: 11, color: '#71717A' }}>{item.trainer?.email}</div>
                        </td>
                        <td style={{ fontSize: 12, color: '#A1A1AA' }}>
                          {item.trainer?.professional_id || 'N/A'}
                        </td>
                        <td>
                          <span className={`admin-badge ${item.status === 'active' ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="admin-btn admin-btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11.5 }}
                            onClick={() => navigate(`/admin/users/${item.trainer_id}`)}
                          >
                            Abrir Perfil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}

      {/* Tab 4: Assinatura & Loja */}
      {activeTab === 'subscription' && (
        <div className="admin-card">
          <h3 className="admin-card-title" style={{ marginBottom: 16 }}>Assinatura Oficial nas Lojas (In-App Purchases)</h3>
          {!subscription ? (
            <div className="admin-empty-state">
              <CreditCard size={36} color="#71717A" />
              <div className="admin-empty-title">Nenhuma assinatura paga vinculada</div>
              <div className="admin-empty-desc">Este usuário encontra-se no plano gratuito básico ou sem assinatura ativa.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, fontSize: 13 }}>
              <div>
                <span style={{ color: '#71717A', display: 'block', marginBottom: 4 }}>Plano DragonCorp</span>
                <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 14 }}>{subscription.plan_id}</div>
              </div>
              <div>
                <span style={{ color: '#71717A', display: 'block', marginBottom: 4 }}>Provedor Oficial</span>
                <div style={{ color: '#FFFFFF', fontWeight: 600, textTransform: 'uppercase' }}>{subscription.provider}</div>
              </div>
              <div>
                <span style={{ color: '#71717A', display: 'block', marginBottom: 4 }}>Ambiente</span>
                <div style={{ color: subscription.environment === 'production' ? '#10B981' : '#F59E0B', fontWeight: 700 }}>
                  {subscription.environment === 'production' ? 'Produção (Real)' : 'Sandbox / Testes'}
                </div>
              </div>
              <div>
                <span style={{ color: '#71717A', display: 'block', marginBottom: 4 }}>Status Validado</span>
                <span className={`admin-badge ${subscription.status === 'active' ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                  {subscription.status}
                </span>
              </div>
              <div>
                <span style={{ color: '#71717A', display: 'block', marginBottom: 4 }}>Product ID na Loja</span>
                <code style={{ color: '#D90000' }}>{subscription.product_id || 'com.dragoncorp.pro'}</code>
              </div>
              <div>
                <span style={{ color: '#71717A', display: 'block', marginBottom: 4 }}>Limite de Alunos do Plano</span>
                <div style={{ color: '#FFFFFF', fontWeight: 600 }}>{subscription.student_limit} alunos</div>
              </div>
              <div>
                <span style={{ color: '#71717A', display: 'block', marginBottom: 4 }}>Início do Período</span>
                <div style={{ color: '#D4D4D8' }}>
                  {subscription.current_period_start ? new Date(subscription.current_period_start).toLocaleDateString('pt-BR') : '-'}
                </div>
              </div>
              <div>
                <span style={{ color: '#71717A', display: 'block', marginBottom: 4 }}>Próxima Renovação / Fim</span>
                <div style={{ color: '#D4D4D8' }}>
                  {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR') : '-'}
                </div>
              </div>
              <div>
                <span style={{ color: '#71717A', display: 'block', marginBottom: 4 }}>Última Validação no Backend</span>
                <div style={{ color: '#71717A' }}>
                  {subscription.last_verified_at ? new Date(subscription.last_verified_at).toLocaleString('pt-BR') : 'Sem registro'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Trilha de Atividade Auditada */}
      {activeTab === 'activity' && (
        <div className="admin-card">
          <h3 className="admin-card-title" style={{ marginBottom: 16 }}>Trilha Imutável de Eventos Administrativos</h3>
          {activity_timeline.length === 0 ? (
            <div className="admin-empty-state">
              <Clock size={32} color="#71717A" />
              <div className="admin-empty-title">Nenhum evento registrado para este usuário</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activity_timeline.map((act) => (
                <div 
                  key={act.id} 
                  style={{ 
                    borderLeft: '3px solid #D90000', 
                    paddingLeft: 14, 
                    paddingTop: 4, 
                    paddingBottom: 4 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>{act.action}</span>
                    <span style={{ fontSize: 11, color: '#71717A' }}>
                      {new Date(act.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#A1A1AA', marginTop: 2 }}>
                    Motivo: <strong style={{ color: '#E4E4E7' }}>{act.reason || 'Ação operacional regular'}</strong>
                  </div>
                  {act.correlation_id && (
                    <div style={{ fontSize: 10.5, color: '#71717A', fontFamily: 'monospace' }}>
                      ID Correlação: {act.correlation_id}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Suporte & LGPD */}
      {activeTab === 'support' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="admin-card">
            <h3 className="admin-card-title" style={{ marginBottom: 8 }}>Direitos do Titular — LGPD (Lei Geral de Proteção de Dados)</h3>
            <p style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.5, marginBottom: 16 }}>
              A plataforma DragonCorp permite a exportação integral de dados cadastrais (Art. 18, V) e a solicitação formal de anonimização definitiva (Art. 18, VI). Registros fiscais e auditorias legais são preservados em conformidade regulatória.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button 
                className="admin-btn admin-btn-secondary" 
                onClick={handleExportData}
              >
                <Download size={14} /> Exportar Relatório de Portabilidade (JSON)
              </button>

              <button 
                className="admin-btn admin-btn-danger" 
                onClick={() => setModalAction('anonymize')}
              >
                <AlertTriangle size={14} /> Solicitar Anonimização Definitiva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {modalAction === 'suspend' && (
        <AdminConfirmModal
          isOpen={true}
          title="Suspender Acesso do Usuário"
          impactNotice="O usuário terá o status alterado para SUSPENDED e não conseguirá autenticar nas plataformas."
          affectedUser={`${user.name} (${user.email})`}
          requiredConfirmText="SUSPENDER"
          confirmButtonText="Confirmar Suspensão"
          isDestructive={true}
          onConfirm={handleConfirmAction}
          onClose={() => setModalAction(null)}
        />
      )}

      {modalAction === 'reactivate' && (
        <AdminConfirmModal
          isOpen={true}
          title="Reativar Conta do Usuário"
          impactNotice="O status será redefinido para ACTIVE e as permissões de acesso ao aplicativo serão restabelecidas."
          affectedUser={`${user.name} (${user.email})`}
          confirmButtonText="Reativar Acesso"
          onConfirm={handleConfirmAction}
          onClose={() => setModalAction(null)}
        />
      )}

      {modalAction === 'revoke' && (
        <AdminConfirmModal
          isOpen={true}
          title="Revogar Todas as Sessões Ativas"
          impactNotice="Todos os tokens OAuth e bearer ativos deste usuário serão revogados instantaneamente."
          affectedUser={`${user.name} (${user.email})`}
          confirmButtonText="Revogar Sessões"
          isDestructive={true}
          onConfirm={handleConfirmAction}
          onClose={() => setModalAction(null)}
        />
      )}

      {modalAction === 'reset_password' && (
        <AdminConfirmModal
          isOpen={true}
          title="Redefinição Segura de Senha"
          impactNotice="Será gerado um token criptografado com disparo de e-mail ao titular para definição de nova credencial."
          affectedUser={`${user.name} (${user.email})`}
          confirmButtonText="Disparar E-mail de Recuperação"
          onConfirm={handleConfirmAction}
          onClose={() => setModalAction(null)}
        />
      )}

      {modalAction === 'anonymize' && (
        <AdminConfirmModal
          isOpen={true}
          title="Anonimização Irreversível de Dados (LGPD)"
          impactNotice="Esta operação substitui o nome, e-mail, telefone e identificadores pessoais por hashes anônimos irreversíveis. A conta será desativada para sempre."
          affectedUser={`${user.name} (${user.email})`}
          requiredConfirmText="ANONIMIZAR"
          confirmButtonText="Executar Anonimização Permanente"
          isDestructive={true}
          onConfirm={handleConfirmAction}
          onClose={() => setModalAction(null)}
        />
      )}
    </div>
  );
};
