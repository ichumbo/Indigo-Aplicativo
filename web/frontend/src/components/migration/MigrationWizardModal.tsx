import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Image,
  Archive,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Users,
  Dumbbell,
  FileCheck2,
  ShieldAlert,
  Loader2,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { migrationApi } from '../../api/migrationApi';
import { MigrationBatch, MigrationItem, MigrationSource } from '../../types';

interface MigrationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (batch: MigrationBatch) => void;
}

export const MigrationWizardModal: React.FC<MigrationWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Wizard Steps (1 a 9)
  // 1: Origem -> 2: Conteúdo -> 3: Upload -> 4: Análise -> 5: Mapeamento -> 6: Duplicidades -> 7: Prévia -> 8: Execução -> 9: Resultado
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [source, setSource] = useState<MigrationSource>('spreadsheet');
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([
    'students',
    'workouts',
    'assessments',
  ]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Staging & Processing State
  const [batch, setBatch] = useState<MigrationBatch | null>(null);
  const [stagingItems, setStagingItems] = useState<MigrationItem[]>([]);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<boolean>(false);
  const [executionSummary, setExecutionSummary] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sourcesList: { id: MigrationSource; name: string; desc: string; icon: any }[] = [
    {
      id: 'mfit',
      name: 'MFIT Personal',
      desc: 'Exportações e relatórios de alunos, treinos e avaliações do MFIT.',
      icon: Users,
    },
    {
      id: 'avaliacao_fisica_pro',
      name: 'Avaliação Física PRO',
      desc: 'Relatórios completos de composição corporal, dobras e perímetros.',
      icon: FileCheck2,
    },
    {
      id: 'spreadsheet',
      name: 'Planilhas Excel ou CSV',
      desc: 'Arquivos .xlsx ou .csv com alunos, treinos e medidas.',
      icon: FileSpreadsheet,
    },
    {
      id: 'pdf',
      name: 'Documentos e PDFs',
      desc: 'Fichas em PDF, laudos médicos e anamneses digitalizadas.',
      icon: FileText,
    },
    {
      id: 'images_zip',
      name: 'Fotos e Arquivo ZIP',
      desc: 'Pacote ZIP com fotos posturais e documentos para os alunos.',
      icon: Archive,
    },
    {
      id: 'other',
      name: 'Outro Aplicativo',
      desc: 'Arquivos de outros softwares ou fichas manuais.',
      icon: HelpCircle,
    },
  ];

  const contentOptions = [
    { id: 'students', label: 'Alunos e Contatos', desc: 'Nome, e-mail, celular, data de nascimento e objetivos' },
    { id: 'workouts', label: 'Treinos e Fichas', desc: 'Sessões, exercícios, séries, repetições e cargas' },
    { id: 'assessments', label: 'Avaliações Físicas', desc: 'Dobras, perímetros, peso e composição corporal' },
    { id: 'anamnesis', label: 'Anamnese e Saúde', desc: 'Histórico médico, lesões e perguntas do aluno' },
    { id: 'photos', label: 'Fotos e Evolução', desc: 'Fotos posturais e registros visuais' },
    { id: 'documents', label: 'Documentos e PDFs', desc: 'Preservação de arquivos originais em legado' },
  ];

  const handleToggleContent = (id: string) => {
    setSelectedContentTypes((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Enviar arquivo e criar lote
  const handleStartUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Por favor, selecione um arquivo para continuar.');
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    setCurrentStep(4); // Passo de Análise & Quarentena

    const formData = new FormData();
    formData.append('source', source);
    formData.append('file', selectedFile);

    try {
      const res = await migrationApi.uploadMigration(formData, (percent) => {
        setUploadProgress(percent);
      });

      setBatch(res.batch);

      // Carregar itens do lote
      const itemsRes = await migrationApi.getMigrationItems(res.batch.id);
      setStagingItems(itemsRes.data || []);

      // Se houver conflitos ou homônimos, direciona para o passo de duplicidades
      const hasConflicts = (itemsRes.data || []).some(
        (it) => it.match_status === 'conflict' || it.match_status === 'probable_match'
      );

      if (hasConflicts) {
        setCurrentStep(6); // Resolver Duplicidades
      } else {
        setCurrentStep(7); // Prévia Detalhada
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Falha ao enviar arquivo.');
      setCurrentStep(3); // Volta para upload
    } finally {
      setUploading(false);
    }
  };

  // Salvar decisões de duplicidades
  const handleSaveResolutions = async () => {
    if (!batch) return;
    try {
      await migrationApi.resolveConflicts(batch.id, resolutions);
      setCurrentStep(7); // Avançar para Prévia
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Falha ao salvar decisões.');
    }
  };

  // Confirmar migração definitiva
  const handleConfirmMigration = async () => {
    if (!batch) return;
    setConfirming(true);
    setErrorMessage(null);
    setCurrentStep(8); // Executando

    try {
      const res = await migrationApi.confirmMigration(batch.id);
      setExecutionSummary(res.summary);
      setBatch(res.batch);
      setCurrentStep(9); // Resultado & Conclusão
      onSuccess(res.batch);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Falha ao gravar a migração.');
      setCurrentStep(7); // Volta para prévia
    } finally {
      setConfirming(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedFile(null);
    setBatch(null);
    setStagingItems([]);
    setResolutions({});
    setExecutionSummary(null);
    setErrorMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={resetWizard} title="Central de Migração Assistida" maxWidth="840px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Barra de Progresso do Wizard */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-red)' }}>
            Etapa {currentStep} de 9
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {currentStep === 1 && 'Escolher Origem'}
            {currentStep === 2 && 'Conteúdo a Importar'}
            {currentStep === 3 && 'Enviar Arquivo'}
            {currentStep === 4 && 'Analisando em Quarentena'}
            {currentStep === 5 && 'Mapeamento de Colunas'}
            {currentStep === 6 && 'Reconciliação de Duplicidades'}
            {currentStep === 7 && 'Prévia de Gravação'}
            {currentStep === 8 && 'Gravando no DragonCorp'}
            {currentStep === 9 && 'Relatório e Próximos Passos'}
          </div>
        </div>

        {errorMessage && (
          <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#EF4444', fontSize: 13, display: 'flex', gap: 10 }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* ETAPA 1: ESCOLHER ORIGEM */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                De onde você deseja importar seus dados?
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Selecione o software ou formato de onde você possui suas informações salvas.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {sourcesList.map((item) => {
                const Icon = item.icon;
                const isSelected = source === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSource(item.id)}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isSelected ? 'rgba(217, 0, 0, 0.08)' : 'var(--bg-card)',
                      border: `1.5px solid ${isSelected ? 'var(--accent-red)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={22} style={{ color: isSelected ? 'var(--accent-red)' : 'var(--text-secondary)', marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCurrentStep(2)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}
              >
                Avançar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 2: SELECIONAR CONTEÚDO */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                Quais informações você quer trazer para o DragonCorp?
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Marque os tipos de dados contidos no seu material.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {contentOptions.map((opt) => {
                const isChecked = selectedContentTypes.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isChecked ? 'rgba(217, 0, 0, 0.05)' : 'var(--bg-card)',
                      border: `1px solid ${isChecked ? 'var(--accent-red)' : 'var(--border-subtle)'}`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleContent(opt.id)}
                      style={{ marginTop: 3, accentColor: 'var(--accent-red)' }}
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{opt.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{opt.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentStep(1)}
              >
                <ArrowLeft size={16} /> Voltar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCurrentStep(3)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                Avançar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 3: ENVIAR ARQUIVOS */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                Selecione ou arraste seu arquivo
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Formatos aceitos: <strong>.xlsx, .csv, .pdf, .zip, imagens</strong> (até 50MB).
              </p>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '36px 20px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-card)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv,.txt,.pdf,.zip,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <Upload size={36} style={{ color: 'var(--accent-red)' }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedFile ? selectedFile.name : 'Clique para selecionar ou arraste o arquivo aqui'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB • Arquivo pronto para envio`
                    : 'Garantia de segurança: nada será gravado diretamente no banco definitivo'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentStep(2)}
              >
                <ArrowLeft size={16} /> Voltar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStartUpload}
                disabled={!selectedFile || uploading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Enviando ({uploadProgress}%)
                  </>
                ) : (
                  <>
                    Enviar e Analisar <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 4: ANÁLISE EM QUARENTENA */}
        {currentStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 16, textAlign: 'center' }}>
            <Loader2 size={42} style={{ color: 'var(--accent-red)' }} className="animate-spin" />
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Analisando e Isolando Arquivos em Quarentena
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, maxWidth: 440 }}>
                Validando assinaturas digitais, extraindo linhas, normalizando e procurando duplicidades sem tocar no banco de dados ativo.
              </p>
            </div>
          </div>
        )}

        {/* ETAPA 6: RECONCILIAÇÃO DE DUPLICIDADES E HOMÔNIMOS */}
        {currentStep === 6 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                Resolução de Duplicidades e Homônimos
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Encontramos correspondências com alunos já existentes em sua carteira. Escolha a ação desejada para cada caso.
              </p>
            </div>

            <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stagingItems
                .filter((it) => it.match_status === 'conflict' || it.match_status === 'probable_match')
                .map((it) => {
                  const norm = it.normalized_data || {};
                  const decision = resolutions[it.id] || it.review_decision || 'create_new';

                  return (
                    <div
                      key={it.id}
                      style={{
                        padding: '14px',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>{norm.fullName}</strong>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {norm.email || 'Sem e-mail'} • {norm.phone || 'Sem telefone'}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            backgroundColor: it.match_status === 'conflict' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                            color: it.match_status === 'conflict' ? '#EF4444' : '#EAB308',
                            fontWeight: 700,
                          }}
                        >
                          {it.match_status === 'conflict' ? 'Homônimo Detectado' : 'Correspondência Provável'}
                        </span>
                      </div>

                      {it.warnings && it.warnings.length > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-app)', padding: '6px 10px', borderRadius: 4 }}>
                          {it.warnings[0]}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setResolutions({ ...resolutions, [it.id]: 'create_new' })}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${decision === 'create_new' ? 'var(--accent-red)' : 'var(--border-subtle)'}`,
                            backgroundColor: decision === 'create_new' ? 'rgba(217, 0, 0, 0.1)' : 'transparent',
                            color: decision === 'create_new' ? 'var(--accent-red)' : 'var(--text-secondary)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Criar Novo Aluno (Recomendado)
                        </button>

                        <button
                          type="button"
                          onClick={() => setResolutions({ ...resolutions, [it.id]: 'link_existing' })}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${decision === 'link_existing' ? 'var(--accent-red)' : 'var(--border-subtle)'}`,
                            backgroundColor: decision === 'link_existing' ? 'rgba(217, 0, 0, 0.1)' : 'transparent',
                            color: decision === 'link_existing' ? 'var(--accent-red)' : 'var(--text-secondary)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Vincular ao Cadastro Existente
                        </button>

                        <button
                          type="button"
                          onClick={() => setResolutions({ ...resolutions, [it.id]: 'ignore' })}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${decision === 'ignore' ? '#9CA3AF' : 'var(--border-subtle)'}`,
                            backgroundColor: decision === 'ignore' ? 'rgba(156, 163, 175, 0.1)' : 'transparent',
                            color: 'var(--text-muted)',
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          Ignorar este Aluno
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveResolutions}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                Avançar para Prévia <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 7: PRÉVIA DE GRAVAÇÃO */}
        {currentStep === 7 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                Conferência e Prévia de Gravação
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Verifique o que será criado no sistema antes de confirmar. Nada foi publicado ainda.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Alunos a Cadastrar</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                  {stagingItems.filter((i) => i.item_type === 'student').length}
                </div>
                <div style={{ fontSize: 11, color: '#EAB308', marginTop: 2 }}>Entrarão com convite pendente</div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-card)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Treinos Detectados</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                  {stagingItems.filter((i) => i.item_type === 'workout').length}
                </div>
                <div style={{ fontSize: 11, color: '#3B82F6', marginTop: 2 }}>Ficarão salvos em rascunho</div>
              </div>
            </div>

            <div style={{ maxHeight: '220px', overflowY: 'auto', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '8px' }}>Tipo</th>
                    <th style={{ padding: '8px' }}>Nome / Descrição</th>
                    <th style={{ padding: '8px' }}>Status</th>
                    <th style={{ padding: '8px' }}>Ação Planejada</th>
                  </tr>
                </thead>
                <tbody>
                  {stagingItems.slice(0, 15).map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                        {item.item_type === 'student' ? 'Aluno' : 'Treino'}
                      </td>
                      <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {item.normalized_data?.fullName || item.normalized_data?.exerciseName || '—'}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22C55E' }}>
                          Pronto
                        </span>
                      </td>
                      <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
                        {item.review_decision === 'create_new' ? 'Criar Novo' : 'Vincular'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentStep(3)}
              >
                <ArrowLeft size={16} /> Cancelar Lote
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmMigration}
                disabled={confirming}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px' }}
              >
                {confirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Confirmar e Importar para o DragonCorp
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 8: EXECUTANDO EM BACKGROUND */}
        {currentStep === 8 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 16, textAlign: 'center' }}>
            <Loader2 size={42} style={{ color: 'var(--accent-red)' }} className="animate-spin" />
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Gravando de Forma Transacional
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, maxWidth: 440 }}>
                Criando cadastros com convite pendente, salvando treinos como rascunho e gerando chaves de rollback.
              </p>
            </div>
          </div>
        )}

        {/* ETAPA 9: RESULTADO & CONCLUÍDO */}
        {currentStep === 9 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <CheckCircle2 size={32} style={{ color: '#22C55E' }} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Migração Concluída com Sucesso!
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Seus dados estão disponíveis no DragonCorp com segurança e possibilidade de desfazer em até 7 dias.
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Alunos Criados</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                  {executionSummary?.students_created ?? 0}
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-card)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Treinos em Rascunho</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                  {executionSummary?.workouts_created ?? 0}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={resetWizard}
                style={{ padding: '10px 24px' }}
              >
                Concluir e Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

