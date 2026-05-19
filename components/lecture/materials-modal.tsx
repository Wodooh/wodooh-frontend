'use client';

import { useState, useCallback } from 'react';
import { useSectionMaterials } from '@/lib/hooks/use-session-materials';
import { PdfViewer } from './pdf-viewer';
import type { SessionMaterial } from '@/lib/types/live-session.types';

interface MaterialsModalProps {
  sectionId: string;
  sectionLabel?: string;
  mode: 'instructor' | 'student';
  onClose: () => void;
}

function formatBytes(b: number): string {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function MaterialsModal({ sectionId, sectionLabel, mode, onClose }: MaterialsModalProps) {
  const { materials, loading, error, getSignedUrl, deleteMaterial } = useSectionMaterials(sectionId);
  const [previewMaterial, setPreviewMaterial] = useState<SessionMaterial | null>(null);
  const [previewUrl, setPreviewUrl]           = useState<string | null>(null);
  const [previewPage, setPreviewPage]         = useState(1);
  const [previewTotal, setPreviewTotal]       = useState(0);
  const [loadingPreview, setLoadingPreview]   = useState(false);
  const [deleting, setDeleting]               = useState<string | null>(null);
  const [previewError, setPreviewError]       = useState<string | null>(null);

  const openPreview = useCallback(async (m: SessionMaterial) => {
    if (!m._id || !m.fileId) return;
    // We need sessionId — it's embedded in fileId: "lectures/<sessionId>_..."
    const sessionIdFromFileId = m.fileId.split('/')[1]?.split('_')[0] ?? '';
    setPreviewMaterial(m);
    setPreviewPage(1);
    setPreviewTotal(0);
    setPreviewUrl(null);
    setPreviewError(null);
    setLoadingPreview(true);
    try {
      const url = await getSignedUrl(sessionIdFromFileId, m._id);
      setPreviewUrl(url);
    } catch {
      setPreviewError('Could not load preview.');
    } finally {
      setLoadingPreview(false);
    }
  }, [getSignedUrl]);

  const closePreview = () => {
    setPreviewMaterial(null);
    setPreviewUrl(null);
    setPreviewPage(1);
    setPreviewTotal(0);
  };

  const handleDelete = async (m: SessionMaterial) => {
    if (!m._id) return;
    const sessionIdFromFileId = m.fileId.split('/')[1]?.split('_')[0] ?? '';
    setDeleting(m._id);
    try {
      await deleteMaterial(sessionIdFromFileId, m._id);
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (m: SessionMaterial) => {
    if (!m._id) return;
    const sessionIdFromFileId = m.fileId.split('/')[1]?.split('_')[0] ?? '';
    try {
      const url = await getSignedUrl(sessionIdFromFileId, m._id);
      const a = document.createElement('a');
      a.href = url;
      a.download = m.filename;
      a.click();
    } catch { /* ignore */ }
  };

  const extBadge = (format: string) => {
    const color = format === 'pdf' ? '#e53e3e' : '#dd6b20';
    return (
      <span style={{
        display: 'inline-block', padding: '1px 6px',
        borderRadius: 4, fontSize: 10, fontWeight: 700,
        background: `${color}22`, color, fontFamily: 'monospace',
        letterSpacing: 0.5, textTransform: 'uppercase',
      }}>
        {format}
      </span>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Section materials"
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, pointerEvents: 'none',
        }}
      >
        <div
          className="nx-card"
          style={{
            width: '100%', maxWidth: previewMaterial ? 820 : 560,
            maxHeight: '85vh',
            display: 'flex', flexDirection: 'column',
            pointerEvents: 'auto',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div className="nx-card-head" style={{ flexShrink: 0 }}>
            <div>
              <h2 className="nx-card-title">
                {previewMaterial ? previewMaterial.filename : 'Section materials'}
              </h2>
              {!previewMaterial && sectionLabel && (
                <p className="nx-card-sub">{sectionLabel}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {previewMaterial && (
                <button className="nx-btn nx-btn-ghost" onClick={closePreview}>
                  ← Back
                </button>
              )}
              <button className="nx-btn nx-btn-ghost" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 0 16px' }}>
            {previewMaterial ? (
              /* ── PDF Preview ── */
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {loadingPreview && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <span className="nx-spin" />
                  </div>
                )}
                {previewError && (
                  <p style={{ textAlign: 'center', color: 'var(--nx-danger)', padding: 20 }}>
                    {previewError}
                  </p>
                )}
                {previewUrl && (
                  <>
                    <div style={{ flex: 1, minHeight: 400 }}>
                      <PdfViewer
                        url={previewUrl}
                        page={previewPage}
                        onLoadSuccess={setPreviewTotal}
                      />
                    </div>
                    {previewTotal > 1 && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 12, padding: '12px 0 0',
                      }}>
                        <button
                          className="nx-btn nx-btn-ghost"
                          onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                          disabled={previewPage <= 1}
                        >
                          ← Prev
                        </button>
                        <span style={{ fontSize: 13, color: 'var(--nx-fg-muted)' }}>
                          {previewPage} / {previewTotal}
                        </span>
                        <button
                          className="nx-btn nx-btn-ghost"
                          onClick={() => setPreviewPage(p => Math.min(previewTotal, p + 1))}
                          disabled={previewPage >= previewTotal}
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* ── Materials list ── */
              loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <span className="nx-spin" />
                </div>
              ) : error ? (
                <p style={{ textAlign: 'center', color: 'var(--nx-danger)', padding: 20 }}>{error}</p>
              ) : materials.length === 0 ? (
                <div className="nx-empty" style={{ padding: 40 }}>
                  <div className="nx-empty-title">No materials yet</div>
                  <div className="nx-empty-sub">
                    {mode === 'instructor'
                      ? 'Materials are uploaded when starting a live session.'
                      : 'No materials have been shared for this section yet.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {materials.map(m => (
                    <div
                      key={m._id ?? m.fileId}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 20px',
                        borderBottom: '1px solid var(--nx-border)',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          {extBadge(m.format)}
                          <span style={{
                            fontSize: 14, fontWeight: 500, color: 'var(--nx-fg)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {m.filename}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--nx-fg-muted)' }}>
                          {formatBytes(m.sizeBytes)} · {formatDate(m.uploadedAt)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          className="nx-btn nx-btn-ghost"
                          style={{ fontSize: 12, padding: '4px 10px' }}
                          onClick={() => openPreview(m)}
                        >
                          Preview
                        </button>
                        <button
                          className="nx-btn nx-btn-ghost"
                          style={{ fontSize: 12, padding: '4px 10px' }}
                          onClick={() => handleDownload(m)}
                        >
                          Download
                        </button>
                        {mode === 'instructor' && (
                          <button
                            className="nx-btn nx-btn-ghost"
                            style={{ fontSize: 12, padding: '4px 10px', color: 'var(--nx-danger)' }}
                            onClick={() => handleDelete(m)}
                            disabled={deleting === m._id}
                          >
                            {deleting === m._id ? '…' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}
