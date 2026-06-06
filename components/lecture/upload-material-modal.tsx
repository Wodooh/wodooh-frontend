'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useSessionMaterials, useInstructorLibrary } from '@/lib/hooks/use-session-materials';
import type { LibraryMaterial } from '@/lib/hooks/use-session-materials';
import apiClient from '@/lib/api/client';
import API_ENDPOINTS from '@/lib/api/endpoints';
import type { SessionMaterial } from '@/lib/types/live-session.types';

interface UploadMaterialModalProps {
  /** Omit when showing the modal before a session exists (pre-session mode). */
  sessionId?: string;
  sectionId: string;
  courseId?: string;
  /** Called after a successful upload in in-session mode. */
  onSuccess?: (material: SessionMaterial, fromLibrary?: boolean) => void;
  /**
   * Pre-session mode: called when the instructor confirms a file choice.
   * The parent must create the session, upload if `file` is provided, then navigate.
   * Throw to show an error inside the modal.
   */
  onStart?: (
    file: File | null,
    lib: LibraryMaterial | null,
    setProgress: (p: number) => void,
  ) => Promise<void>;
  onCancel: () => void;
}

type Tab = 'upload' | 'library';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

interface CourseFolder {
  courseId: string;
  courseCode: string;
  courseName: string;
  sections: SectionFolder[];
  totalFiles: number;
}

interface SectionFolder {
  sectionDbId: string;
  sectionDisplayId: string;
  materials: LibraryMaterial[];
}

export function UploadMaterialModal({ sessionId, sectionId, courseId, onSuccess, onStart, onCancel }: UploadMaterialModalProps) {
  const { uploadMaterial }                                          = useSessionMaterials(sessionId);
  const { materials: libraryMaterials, loading: libLoading, getSignedUrl } = useInstructorLibrary();

  const [tab, setTab]             = useState<Tab>('upload');
  const [file, setFile]           = useState<File | null>(null);
  const [progress, setProgress]   = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [libSearch, setLibSearch] = useState('');
  const [selectedLib, setSelectedLib] = useState<LibraryMaterial | null>(null);
  const [cancelling, setCancelling]   = useState(false);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-expand the current course when library loads
  useEffect(() => {
    if (courseId && libraryMaterials.length > 0) {
      setExpandedCourses(prev => new Set([...prev, courseId]));
      // Also expand current section
      if (sectionId) setExpandedSections(prev => new Set([...prev, sectionId]));
    }
  }, [courseId, sectionId, libraryMaterials.length]);

  const courseFolders = useMemo<CourseFolder[]>(() => {
    const map = new Map<string, CourseFolder>();
    for (const m of libraryMaterials) {
      if (!map.has(m.courseId)) {
        map.set(m.courseId, {
          courseId: m.courseId,
          courseCode: m.courseCode ?? '—',
          courseName: m.courseName ?? 'Unknown course',
          sections: [],
          totalFiles: 0,
        });
      }
      const course = map.get(m.courseId)!;
      let section = course.sections.find(s => s.sectionDbId === m.sectionDbId);
      if (!section) {
        section = { sectionDbId: m.sectionDbId, sectionDisplayId: m.sectionDisplayId ?? m.sectionDbId, materials: [] };
        course.sections.push(section);
      }
      section.materials.push(m);
      course.totalFiles++;
    }
    return Array.from(map.values()).sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  }, [libraryMaterials]);

  const toggleCourse = (cid: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(cid)) { next.delete(cid); } else { next.add(cid); }
      return next;
    });
  };

  const toggleSection = (sid: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sid)) { next.delete(sid); } else { next.add(sid); }
      return next;
    });
  };

  const filteredFlat = useMemo(() => {
    if (!libSearch) return null; // null = use folder tree
    const q = libSearch.toLowerCase();
    return libraryMaterials.filter(m => m.originalName.toLowerCase().includes(q));
  }, [libSearch, libraryMaterials]);

  const accept = '.pdf,application/pdf';

  const handleFile = useCallback((f: File) => {
    setError(null);
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf') { setError('Only PDF files are allowed.'); return; }
    if (f.size > 50 * 1024 * 1024) { setError('File exceeds the 50 MB limit.'); return; }
    setFile(f);
    setProgress(0);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, [handleFile]);

  const handleUpload = async () => {
    if (uploading) return;
    setError(null);

    // ── Pre-session mode ────────────────────────────────────────────────────────
    // onStart is provided: delegate session creation + upload to the parent.
    if (onStart) {
      setUploading(true);
      setProgress(0);
      try {
        await onStart(
          tab === 'upload' ? file : null,
          tab === 'library' ? selectedLib : null,
          setProgress,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start session.');
        setUploading(false);
      }
      return;
    }

    // ── In-session mode (session already exists) ────────────────────────────────
    if (tab === 'library' && selectedLib) {
      try {
        const url = await getSignedUrl(selectedLib.sessionId, selectedLib._id);
        onSuccess?.({
          _id: selectedLib._id,
          fileId: selectedLib.fileId,
          filename: selectedLib.originalName,
          originalName: selectedLib.originalName,
          format: selectedLib.format,
          sizeBytes: selectedLib.sizeBytes,
          totalPages: selectedLib.totalPages,
          uploadedAt: selectedLib.uploadedAt,
          signedUrl: url,
        }, true);
      } catch {
        setError('Could not load the selected file. Please try uploading a new one.');
      }
      return;
    }

    if (!file) return;
    setUploading(true);
    try {
      const material = await uploadMaterial(file, setProgress);
      onSuccess?.(material, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setUploading(false);
    }
  };

  const handleCancel = async () => {
    // Pre-session mode: no session was created, nothing to end.
    if (!sessionId) {
      onCancel();
      return;
    }
    // In-session mode: end the session that was already created.
    setCancelling(true);
    try {
      await apiClient.patch(API_ENDPOINTS.SESSION_END(sessionId));
    } catch { /* if end fails, still let them go back */ }
    setCancelling(false);
    onCancel();
  };

  const uploadReady = tab === 'upload' ? Boolean(file && !uploading) : Boolean(selectedLib);
  const ext = file?.name.split('.').pop()?.toUpperCase() ?? '';

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(10,11,16,0.65)',
        backdropFilter: 'blur(10px) saturate(120%)',
        WebkitBackdropFilter: 'blur(10px) saturate(120%)',
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'grid', placeItems: 'center', padding: 20,
      }}>
        <div className="nx-card" style={{
          width: '100%', maxWidth: 520,
          maxHeight: 'calc(100vh - 40px)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            padding: '16px 18px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: '1px solid var(--nx-border)',
            flexShrink: 0,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              display: 'grid', placeItems: 'center',
              background: 'color-mix(in oklab, var(--accent) 15%, var(--nx-surface))',
              color: 'var(--accent)', flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em', color: 'var(--nx-fg)' }}>
              Upload slide
            </span>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 2, padding: 4,
            margin: '16px 18px 14px',
            background: 'var(--nx-surface)',
            border: '1px solid var(--nx-border)',
            borderRadius: 6, flexShrink: 0,
          }}>
            {(['upload', 'library'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  height: 28, padding: '0 10px', border: 0,
                  background: tab === t ? 'var(--nx-surface-raised)' : 'transparent',
                  color: tab === t ? 'var(--nx-fg)' : 'var(--nx-fg-muted)',
                  fontSize: 12.5, fontWeight: 500,
                  borderRadius: 4, cursor: 'pointer',
                  boxShadow: tab === t ? 'var(--nx-shadow-sm, 0 1px 2px rgba(0,0,0,0.06))' : 'none',
                  transition: 'all 0.1s',
                }}
              >
                {t === 'upload' ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Upload new
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                    From library
                    {libraryMaterials.length > 0 && (
                      <span style={{
                        fontFamily: 'monospace', fontSize: 10.5,
                        padding: '1px 5px', borderRadius: 4,
                        background: 'var(--nx-surface)', color: 'var(--nx-fg-muted)',
                      }}>
                        {libraryMaterials.length}
                      </span>
                    )}
                    {libLoading && <span className="nx-spin" style={{ width: 11, height: 11 }} />}
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 18px 18px' }}>

            {/* Upload pane */}
            {tab === 'upload' && (
              <div>
                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => !uploading && inputRef.current?.click()}
                  style={{
                    position: 'relative',
                    border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--nx-border)'}`,
                    borderRadius: 8, padding: '22px 18px',
                    background: dragging
                      ? 'color-mix(in oklab, var(--accent) 9%, var(--nx-surface))'
                      : 'var(--nx-surface)',
                    display: 'flex', alignItems: 'center', gap: 14,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    transition: 'border-color 0.1s, background 0.1s',
                  }}
                >
                  <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} disabled={uploading} />

                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    display: 'grid', placeItems: 'center',
                    background: 'color-mix(in oklab, var(--accent) 15%, var(--nx-surface))',
                    color: 'var(--accent)',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--nx-fg)' }}>
                      Drop your slide here
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--nx-fg-muted)', marginTop: 2 }}>
                      or <span style={{ color: 'var(--accent)' }}>click to browse</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--nx-fg-muted)', textAlign: 'center' }}>
                  <b style={{ fontWeight: 500, color: 'var(--nx-fg)' }}>PDF</b> · up to 50 MB
                </div>

                {/* Selected file pill */}
                {file && (
                  <div style={{
                    marginTop: 10, padding: '8px 10px',
                    background: 'var(--nx-surface)',
                    border: '1px solid var(--nx-border)',
                    borderRadius: 6,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--nx-success, #10b981)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11.5, color: 'var(--nx-fg)' }}>
                      {file.name}
                    </span>
                    <span style={{ color: 'var(--nx-fg-muted)', fontSize: 11.5 }}>{formatBytes(file.size)}</span>
                    {!uploading && (
                      <button
                        onClick={e => { e.stopPropagation(); setFile(null); }}
                        style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 2, color: 'var(--nx-fg-muted)', lineHeight: 1 }}
                        aria-label="Remove file"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                  </div>
                )}

                {/* Upload progress */}
                {uploading && (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ height: 5, borderRadius: 99, background: 'var(--nx-border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width 0.2s' }} />
                    </div>
                    <span style={{ fontSize: 11.5, color: 'var(--nx-fg-muted)', textAlign: 'right' }}>
                      {progress < 100 ? `Uploading… ${progress}%` : 'Processing…'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Library pane */}
            {tab === 'library' && (
              <div>
                {/* Search */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: 'var(--nx-surface)', border: '1px solid var(--nx-border)',
                  borderRadius: 6, padding: '0 10px', height: 30,
                  marginBottom: 10,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--nx-fg-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    type="text"
                    placeholder="Search slides…"
                    value={libSearch}
                    onChange={e => setLibSearch(e.target.value)}
                    style={{ border: 0, background: 'transparent', outline: 0, width: '100%', fontSize: 12.5, color: 'var(--nx-fg)' }}
                  />
                </div>

                {/* Tree / list */}
                <div style={{ border: '1px solid var(--nx-border)', borderRadius: 6, background: 'var(--nx-surface-raised)', overflow: 'hidden' }}>
                  {libLoading ? (
                    <div style={{ padding: '28px 12px', textAlign: 'center' }}><span className="nx-spin" /></div>
                  ) : libraryMaterials.length === 0 ? (
                    <div style={{ padding: '28px 12px', textAlign: 'center', fontSize: 12, color: 'var(--nx-fg-muted)' }}>
                      No previous uploads found.
                    </div>
                  ) : filteredFlat !== null ? (
                    /* Search results: flat list */
                    filteredFlat.length === 0 ? (
                      <div style={{ padding: '28px 12px', textAlign: 'center', fontSize: 12, color: 'var(--nx-fg-muted)' }}>
                        No slides match &ldquo;{libSearch}&rdquo;.
                      </div>
                    ) : (
                      filteredFlat.map((m, i) => (
                        <LibFileRow
                          key={m._id}
                          m={m}
                          isSelected={selectedLib?._id === m._id}
                          isLast={i === filteredFlat.length - 1}
                          indent={0}
                          onSelect={() => setSelectedLib(selectedLib?._id === m._id ? null : m)}
                          showContext
                        />
                      ))
                    )
                  ) : (
                    /* Folder tree */
                    courseFolders.map((course, ci) => {
                      const isOpen = expandedCourses.has(course.courseId);
                      const isCurrentCourse = course.courseId === courseId;
                      return (
                        <div key={course.courseId}>
                          {/* Course row */}
                          <div
                            onClick={() => toggleCourse(course.courseId)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '8px 12px',
                              borderBottom: (isOpen || ci < courseFolders.length - 1) ? '1px solid var(--nx-border)' : 'none',
                              background: isCurrentCourse
                                ? 'color-mix(in oklab, var(--accent) 6%, var(--nx-surface-raised))'
                                : 'var(--nx-surface-raised)',
                              cursor: 'pointer',
                              userSelect: 'none',
                            }}
                          >
                            <span style={{ color: 'var(--nx-fg-muted)', fontSize: 10, transition: 'transform 0.15s', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                            </svg>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--nx-fg)' }}>
                                {course.courseCode}
                              </span>
                              <span style={{ fontSize: 12, color: 'var(--nx-fg-muted)', marginLeft: 6 }}>
                                {course.courseName}
                              </span>
                            </div>
                            <span style={{ fontFamily: 'monospace', fontSize: 10.5, color: 'var(--nx-fg-muted)', flexShrink: 0 }}>
                              {course.totalFiles} file{course.totalFiles !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Sections */}
                          {isOpen && course.sections.map((sec, si) => {
                            const secOpen = expandedSections.has(sec.sectionDbId);
                            const isCurrentSec = sec.sectionDbId === sectionId;
                            return (
                              <div key={sec.sectionDbId}>
                                {/* Section row */}
                                <div
                                  onClick={() => toggleSection(sec.sectionDbId)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '6px 12px 6px 28px',
                                    borderBottom: '1px solid var(--nx-border)',
                                    background: isCurrentSec
                                      ? 'color-mix(in oklab, var(--accent) 4%, var(--nx-surface-raised))'
                                      : 'color-mix(in oklab, var(--nx-bg) 40%, var(--nx-surface-raised))',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                  }}
                                >
                                  <span style={{ color: 'var(--nx-fg-muted)', fontSize: 9, transition: 'transform 0.15s', display: 'inline-block', transform: secOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--nx-fg-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                                  </svg>
                                  <span style={{ flex: 1, fontSize: 12, color: isCurrentSec ? 'var(--accent)' : 'var(--nx-fg-muted)', fontWeight: isCurrentSec ? 600 : 400 }}>
                                    Section {sec.sectionDisplayId}
                                    {isCurrentSec && <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>(current)</span>}
                                  </span>
                                  <span style={{ fontFamily: 'monospace', fontSize: 10.5, color: 'var(--nx-fg-muted)', flexShrink: 0 }}>
                                    {sec.materials.length}
                                  </span>
                                </div>

                                {/* Files */}
                                {secOpen && sec.materials.map((m, mi) => (
                                  <LibFileRow
                                    key={m._id}
                                    m={m}
                                    isSelected={selectedLib?._id === m._id}
                                    isLast={mi === sec.materials.length - 1 && si === course.sections.length - 1}
                                    indent={44}
                                    onSelect={() => setSelectedLib(selectedLib?._id === m._id ? null : m)}
                                    showContext={false}
                                  />
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                marginTop: 10, fontSize: 11.5, color: 'var(--nx-danger, #e5484d)',
                padding: '8px 10px',
                background: 'color-mix(in oklab, var(--nx-danger, #e5484d) 8%, var(--nx-surface))',
                border: '1px solid color-mix(in oklab, var(--nx-danger, #e5484d) 30%, var(--nx-border))',
                borderRadius: 6,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--nx-border)',
            display: 'flex', justifyContent: 'flex-end', gap: 8,
            background: 'var(--nx-surface)',
            flexShrink: 0,
          }}>
            <button
              className="nx-btn nx-btn-ghost"
              onClick={handleCancel}
              disabled={cancelling || uploading}
            >
              {cancelling ? 'Cancelling…' : sessionId ? 'Cancel session' : 'Cancel'}
            </button>
            <button
              className="nx-btn nx-btn-primary"
              onClick={handleUpload}
              disabled={!uploadReady}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {uploading ? (
                <><span className="nx-spin" style={{ width: 13, height: 13 }} /> {onStart ? 'Starting…' : 'Uploading…'}</>
              ) : onStart ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                  Start session
                </>
              ) : tab === 'library' ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                  Use selected
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

interface LibFileRowProps {
  m: LibraryMaterial;
  isSelected: boolean;
  isLast: boolean;
  indent: number;
  onSelect: () => void;
  showContext: boolean;
}

function LibFileRow({ m, isSelected, isLast, indent, onSelect, showContext }: LibFileRowProps) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: `8px 12px 8px ${12 + indent}px`,
        borderBottom: isLast ? 'none' : '1px solid var(--nx-border)',
        background: isSelected ? 'color-mix(in oklab, var(--accent) 9%, var(--nx-surface-raised))' : 'transparent',
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 28, height: 32, borderRadius: 4, flexShrink: 0,
        display: 'grid', placeItems: 'center',
        fontFamily: 'monospace', fontSize: 8.5, fontWeight: 600,
        background: m.format === 'pdf'
          ? 'color-mix(in oklab, #d97706 10%, var(--nx-surface))'
          : 'color-mix(in oklab, #c2410c 10%, var(--nx-surface))',
        border: `1px solid ${m.format === 'pdf' ? 'color-mix(in oklab, #d97706 25%, var(--nx-border))' : 'color-mix(in oklab, #c2410c 25%, var(--nx-border))'}`,
        color: m.format === 'pdf' ? '#d97706' : '#c2410c',
        letterSpacing: '0.02em',
      }}>
        {m.format.toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--nx-fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {m.originalName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--nx-fg-muted)', marginTop: 1 }}>
          {showContext && <><span style={{ marginRight: 4 }}>{m.courseCode} · §{m.sectionDisplayId}</span>·<span style={{ marginLeft: 4 }}></span></>}
          {formatBytes(m.sizeBytes)} · {formatDate(m.uploadedAt)}
        </div>
      </div>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
        border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--nx-border)'}`,
        background: isSelected ? 'var(--accent)' : 'var(--nx-surface)',
        boxShadow: isSelected ? 'inset 0 0 0 3px var(--nx-surface-raised)' : 'none',
      }} />
    </div>
  );
}
