'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';
import type { SessionMaterial } from '../types/live-session.types';

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

export function useSessionMaterials(sessionId: string) {
  const [materials, setMaterials] = useState<SessionMaterial[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [tick, setTick]           = useState(0);

  useEffect(() => {
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
    const res = await apiClient.get<{ signedUrl: string }>(
      API_ENDPOINTS.SESSION_MATERIAL_URL(sessionId, materialId),
    );
    return res.data!.signedUrl;
  }, [sessionId]);

  const uploadMaterial = useCallback(
    (file: File, onProgress?: (pct: number) => void): Promise<SessionMaterial> => {
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('material', file);

        const xhr = new XMLHttpRequest();
        const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001';

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
