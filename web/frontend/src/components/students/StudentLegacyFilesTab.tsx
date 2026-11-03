import React, { useEffect, useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  Calendar,
  ShieldCheck,
  FileCheck2,
  Image,
  AlertCircle,
  Plus,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { migrationApi } from '../../api/migrationApi';
import { LegacyImportedFile } from '../../types';
import { Modal } from '../common/Modal';
import { Loader } from '../common/Loader';
import { EmptyState } from '../common/EmptyState';

interface StudentLegacyFilesTabProps {
  studentId: string;
}

export const StudentLegacyFilesTab: React.FC<StudentLegacyFilesTabProps> = ({ studentId }) => {
  const [files, setFiles] = useState<LegacyImportedFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>('workout_sheet');
  const [sourcePlatform, setSourcePlatform] = useState<string>('MFIT');
  const [originalDate, setOriginalDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await migrationApi.getStudentLegacyFiles(studentId);
      setFiles(res.files || []);
    } catch (err) {
      console.error('Falha ao carregar arquivos legados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [studentId]);

  const handleDownload = async (file: LegacyImportedFile) => {
    try {
      await migrationApi.downloadLegacyFile(file.id, file.original_name);
    } catch (err) {
      console.error(err);
      alert('Falha ao baixar o arquivo legado.');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Por favor selecione um arquivo.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('category', category);
    formData.append('sourcePlatform', sourcePlatform);
    if (originalDate) formData.append('originalDate', originalDate);
    if (notes) formData.append('notes', notes);

    try {
      await migrationApi.uploadStudentLegacyFile(studentId, formData);
      setIsUploadOpen(false);
      setSelectedFile(null);
      setNotes('');
      fetchFiles();
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || 'Falha ao anexar arquivo legado.');
    } finally {
      setUploading(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'workout_sheet':
        return 'Ficha de Treino';
      case 'assessment':
        return 'Avaliação Física';
      case 'anamnesis':
        return 'Anamnese';
      case 'photo':
        return 'Foto / Evolução';
      case 'report':
        return 'Relatório';
      default:
        return 'Documento';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header da Aba */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Arquivos e Documentos Importados (Histórico Legado)
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Documentos originais de outras plataformas preservados integralmente sem perdas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsUploadOpen(true)}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '8px 14px' }}
        >
          <Plus size={16} /> Anexar Arquivo Legado
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px 0' }}>
          <Loader text="Carregando arquivos importados..." />
        </div>
      ) : files.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Nenhum arquivo legado importado para este aluno"
          description="Quando você importa fichas em PDF, laudos, fotos de avaliação ou planilhas antigas, os documentos originais ficam guardados com segurança aqui."
          actionLabel="Anexar Primeiro Documento"
          onAction={() => setIsUploadOpen(true)}
        />
      ) : (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Arquivo</th>
                  <th style={{ padding: '12px 16px' }}>Categoria</th>
                  <th style={{ padding: '12px 16px' }}>Origem</th>
                  <th style={{ padding: '12px 16px' }}>Data Original</th>
                  <th style={{ padding: '12px 16px' }}>Tamanho</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={16} style={{ color: 'var(--accent-red)' }} />
                        {file.original_name}
                      </div>
                      {file.notes && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{file.notes}</div>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-app)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)',
                          fontWeight: 600,
                        }}
                      >
                        {getCategoryLabel(file.category)}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {file.source_platform}
                    </td>

                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {file.original_date ? new Date(file.original_date).toLocaleDateString('pt-BR') : '—'}
                    </td>

                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {(file.file_size / 1024).toFixed(1)} KB
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDownload(file)}
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12 }}
                      >
                        <Download size={14} /> Baixar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Anexo Manual */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Anexar Arquivo Legado ao Aluno"
        maxWidth="500px"
      >
        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {uploadError && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontSize: 13 }}>
              {uploadError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Arquivo (PDF, Imagem, Planilha):
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Categoria do Documento:
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            >
              <option value="workout_sheet">Ficha de Treino Antiga</option>
              <option value="assessment">Avaliação Física Antiga</option>
              <option value="anamnesis">Anamnese / Histórico de Saúde</option>
              <option value="photo">Foto Postural / Evolução</option>
              <option value="report">Relatório de Evolução</option>
              <option value="document">Outro Documento</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Plataforma de Origem:
            </label>
            <input
              type="text"
              value={sourcePlatform}
              onChange={(e) => setSourcePlatform(e.target.value)}
              placeholder="Ex: MFIT, Avaliação Física PRO, Planilha..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Data Original do Documento (opcional):
            </label>
            <input
              type="date"
              value={originalDate}
              onChange={(e) => setOriginalDate(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Observações:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Ficha de treino passada pelo instrutor anterior..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: 13,
                resize: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsUploadOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading || !selectedFile}
            >
              {uploading ? 'Enviando...' : 'Anexar Documento'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

