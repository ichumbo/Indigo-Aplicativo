import { apiClient } from './client';
import {
  MigrationBatch,
  MigrationItem,
  LegacyImportedFile,
} from '../types';

export const migrationApi = {
  getMigrations: async (status?: string): Promise<{ batches: MigrationBatch[]; total: number; guides: Record<string, any> }> => {
    const params = new URLSearchParams();
    if (status && status !== 'all') {
      params.append('status', status);
    }
    const res = await apiClient.get(`/migrations?${params.toString()}`);
    return res.data;
  },

  getMigration: async (id: string): Promise<{ batch: MigrationBatch; can_rollback: boolean }> => {
    const res = await apiClient.get(`/migrations/${id}`);
    return res.data;
  },

  getMigrationItems: async (
    id: string,
    params?: { type?: string; needs_review?: boolean; page?: number }
  ): Promise<{ data: MigrationItem[]; total: number; current_page: number; last_page: number }> => {
    const query = new URLSearchParams();
    if (params?.type && params.type !== 'all') query.append('type', params.type);
    if (params?.needs_review) query.append('needs_review', '1');
    if (params?.page) query.append('page', params.page.toString());

    const res = await apiClient.get(`/migrations/${id}/items?${query.toString()}`);
    return res.data;
  },

  downloadTemplate: async (type: string): Promise<void> => {
    const res = await apiClient.get(`/migrations/templates/${type}`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `modelo_${type}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  uploadMigration: async (
    formData: FormData,
    onProgress?: (percent: number) => void
  ): Promise<{ batch: MigrationBatch; message: string }> => {
    const res = await apiClient.post('/migrations/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress?.(percent);
        }
      },
    });
    return res.data;
  },

  mapColumns: async (id: string, mapping: Record<string, string>): Promise<{ batch: MigrationBatch; message: string }> => {
    const res = await apiClient.post(`/migrations/${id}/map-columns`, { mapping });
    return res.data;
  },

  resolveConflicts: async (id: string, resolutions: Record<string, string>): Promise<{ batch: MigrationBatch; message: string }> => {
    const res = await apiClient.post(`/migrations/${id}/resolve-conflicts`, { resolutions });
    return res.data;
  },

  confirmMigration: async (id: string): Promise<{ success: boolean; message: string; summary: any; batch: MigrationBatch }> => {
    const res = await apiClient.post(`/migrations/${id}/confirm`);
    return res.data;
  },

  rollbackMigration: async (id: string, reason?: string): Promise<{ success: boolean; message: string; batch: MigrationBatch }> => {
    const res = await apiClient.post(`/migrations/${id}/rollback`, { reason });
    return res.data;
  },

  requestAssistedMigration: async (data: {
    source: string;
    estimatedStudents: number;
    notes?: string;
    contactPhone?: string;
  }): Promise<{ ticket_id: string; message: string }> => {
    const res = await apiClient.post('/migrations/assisted-request', data);
    return res.data;
  },

  getStudentLegacyFiles: async (studentId: string): Promise<{ files: LegacyImportedFile[]; total: number }> => {
    const res = await apiClient.get(`/students/${studentId}/legacy-files`);
    return res.data;
  },

  uploadStudentLegacyFile: async (studentId: string, formData: FormData): Promise<{ file: LegacyImportedFile; message: string }> => {
    const res = await apiClient.post(`/students/${studentId}/legacy-files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  downloadLegacyFile: async (id: string, fileName: string): Promise<void> => {
    const res = await apiClient.get(`/legacy-files/${id}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
