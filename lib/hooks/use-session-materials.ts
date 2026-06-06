'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';
import type { SessionMaterial } from '../types/live-session.types';

/**
 * Attach a previously-uploaded library file to an existing session without
 * re-uploading. The server copies the storage object to a new path and
 * creates a fresh SessionMaterial row.
 */
export async function attachLibraryMaterialToSession(
  sessionId: string,
  sourceMaterialId: string,
): Promise<void> {
  const res = await apiClient.post(
    API_ENDPOINTS.SESSION_MATERIAL_ATTACH(sessionId),
    { sourceMaterialId },
  );
  if (res.status !== 'success') {
    throw new Error(res.message ?? 'Failed to attach material from library');
  }
}

/** Upload a file to an existing session with XHR progress tracking. */
export function uploadFileToSession(
  sessionId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('material', file);

    const xhr = new XMLHttpRequest();
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001').replace(/\/$/, '');

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }

    xhr.open('POST', `${baseUrl}/sessions/${sessionId}/materials`);
    const token = apiClient.getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        try {
          const body = JSON.parse(xhr.responseText);
          reject(new Error(body.message ?? 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

interface ApiMaterial {
  _id: string;
  fileId: string;
  originalName: string;
  format: 'pdf' | 'pptx';
  sizeBytes: number;
  totalPages: number;
  uploadedAt: string;
}

function mapMaterial(m: ApiMaterial): SessionMaterial {
  return {
    _id:          m._id,
    fileId:       m.fileId,
    filename:     m.originalName,
    originalName: m.originalName,
    format:       m.format,
    sizeBytes:    m.sizeBytes,
    totalPages:   m.totalPages,
    uploadedAt:   m.uploadedAt,
  };
}

export function useSessionMaterials(sessionId: string | undefined) {
  const [materials, setMaterials] = useState<SessionMaterial[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [tick, setTick]           = useState(0);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);

    apiClient.get<ApiMaterial[]>(API_ENDPOINTS.SESSION_MATERIALS(sessionId))
      .then(res => {
        if (cancelled) return;
        setMaterials((res.data ?? []).map(mapMaterial));
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load materials');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [sessionId, tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  const getSignedUrl = useCallback(async (materialId: string): Promise<string> => {
    if (!sessionId) return Promise.reject(new Error('No session ID'));
    const res = await apiClient.get<{ signedUrl: string }>(
      API_ENDPOINTS.SESSION_MATERIAL_URL(sessionId, materialId),
    );
    return res.data!.signedUrl;
  }, [sessionId]);

  const uploadMaterial = useCallback(
    (file: File, onProgress?: (pct: number) => void): Promise<SessionMaterial> => {
      if (!sessionId) return Promise.reject(new Error('No session ID'));
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('material', file);

        const xhr = new XMLHttpRequest();
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001').replace(/\/$/, '');

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.open('POST', `${baseUrl}/sessions/${sessionId}/materials`);

        const token = apiClient.getToken();
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const body = JSON.parse(xhr.responseText);
              resolve(mapMaterial(body.data as ApiMaterial));
              refetch();
            } catch {
              reject(new Error('Invalid server response'));
            }
          } else {
            try {
              const body = JSON.parse(xhr.responseText);
              reject(new Error(body.message ?? 'Upload failed'));
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
      });
    },
    [sessionId, refetch],
  );

  const deleteMaterial = useCallback(async (materialId: string): Promise<void> => {
    if (!sessionId) return;
    await apiClient.delete(API_ENDPOINTS.SESSION_MATERIAL_DEL(sessionId, materialId));
    refetch();
  }, [sessionId, refetch]);

  return { materials, loading, error, refetch, getSignedUrl, uploadMaterial, deleteMaterial };
}

// ── Instructor library — all their uploads across all courses/sections ─────────
export interface LibraryMaterial {
  _id: string;
  fileId: string;
  originalName: string;
  format: 'pdf' | 'pptx';
  sizeBytes: number;
  totalPages: number;
  uploadedAt: string;
  sessionId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  sectionDbId: string;
  sectionDisplayId: string;
}

export function useInstructorLibrary() {
  const [materials, setMaterials] = useState<LibraryMaterial[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [tick, setTick]           = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    apiClient.get<LibraryMaterial[]>(API_ENDPOINTS.INSTRUCTOR_LIBRARY)
      .then(res => {
        if (cancelled) return;
        setMaterials(res.data ?? []);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load library');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  const getSignedUrl = useCallback(async (sessionId: string, materialId: string): Promise<string> => {
    const res = await apiClient.get<{ signedUrl: string }>(
      API_ENDPOINTS.SESSION_MATERIAL_URL(sessionId, materialId),
    );
    return res.data!.signedUrl;
  }, []);

  return { materials, loading, error, refetch, getSignedUrl };
}

// ── Section-level aggregation (for Materials modal on My Courses) ─────────────
export function useSectionMaterials(sectionId: string | null) {
  const [materials, setMaterials] = useState<SessionMaterial[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [tick, setTick]           = useState(0);

  useEffect(() => {
    if (!sectionId) return;
    let cancelled = false;
    setLoading(true);

    apiClient.get<ApiMaterial[]>(API_ENDPOINTS.SECTION_MATERIALS(sectionId))
      .then(res => {
        if (cancelled) return;
        setMaterials((res.data ?? []).map(mapMaterial));
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load materials');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [sectionId, tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  const getSignedUrl = useCallback(async (sessionId: string, materialId: string): Promise<string> => {
    const res = await apiClient.get<{ signedUrl: string }>(
      API_ENDPOINTS.SESSION_MATERIAL_URL(sessionId, materialId),
    );
    return res.data!.signedUrl;
  }, []);

  const deleteMaterial = useCallback(async (sessionId: string, materialId: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.SESSION_MATERIAL_DEL(sessionId, materialId));
    refetch();
  }, [refetch]);

  return { materials, loading, error, refetch, getSignedUrl, deleteMaterial };
}
