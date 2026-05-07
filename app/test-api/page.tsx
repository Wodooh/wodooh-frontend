'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useHealth } from '@/lib/hooks/use-health';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface ResponseSnapshot {
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  body: unknown;
  receivedAt: string;
}

const PRESETS: Array<{ label: string; method: HttpMethod; url: string; body?: string }> = [
  {
    label: 'Login (admin)',
    method: 'POST',
    url: '/auth/login',
    body: JSON.stringify({ email: 'admin@wodooh.com', password: 'Password123' }, null, 2),
  },
  { label: 'List users', method: 'GET', url: '/admin/users?page=1&limit=5' },
  { label: 'Health', method: 'GET', url: '/health' },
];

function statusPalette(status: number) {
  if (status === 0) {
    return 'bg-[#FEE2E2] text-[#991B1B] border-[#991B1B]';
  }
  if (status >= 200 && status < 300) {
    return 'bg-[#DCFCE7] text-[#166534] border-[#166534]';
  }
  if (status >= 400 && status < 500) {
    return 'bg-[#FEF3C7] text-[#92400E] border-[#92400E]';
  }
  if (status >= 500) {
    return 'bg-[#FEE2E2] text-[#991B1B] border-[#991B1B]';
  }
  return 'bg-[#DBEAFE] text-[#1E3A5F] border-[#1E3A5F]';
}

function statusLabel(status: number, statusText: string) {
  if (status === 0) return 'NETWORK ERROR';
  return `${status} ${statusText || ''}`.trim().toUpperCase();
}

export default function TestApiPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001';

  const { data: healthData, loading: healthLoading, isHealthy } = useHealth();

  const [method, setMethod] = useState<HttpMethod>('POST');
  const [url, setUrl] = useState<string>(`${apiBase}/auth/login`);
  const [headersText, setHeadersText] = useState<string>('Content-Type: application/json');
  const [bodyText, setBodyText] = useState<string>(
    JSON.stringify({ email: 'admin@wodooh.com', password: 'Password123' }, null, 2),
  );

  const [response, setResponse] = useState<ResponseSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string>('');

  useEffect(() => {
    setGeneratedAt(new Date().toUTCString());
  }, []);

  const parsedHeaders = useMemo(() => {
    const out: Record<string, string> = {};
    headersText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const colon = line.indexOf(':');
        if (colon === -1) return;
        const key = line.slice(0, colon).trim();
        const value = line.slice(colon + 1).trim();
        if (key) out[key] = value;
      });
    return out;
  }, [headersText]);

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setMethod(preset.method);
    setUrl(`${apiBase}${preset.url}`);
    setBodyText(preset.body ?? '');
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    const start = performance.now();

    try {
      const init: RequestInit = { method, headers: parsedHeaders };
      if (method !== 'GET' && method !== 'DELETE' && bodyText.trim().length > 0) {
        init.body = bodyText;
      }
      const res = await fetch(url, init);
      const durationMs = Math.round(performance.now() - start);
      const headersObj: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        headersObj[k] = v;
      });
      const contentType = res.headers.get('content-type') ?? '';
      const body = contentType.includes('application/json') ? await res.json() : await res.text();
      setResponse({
        status: res.status,
        statusText: res.statusText,
        durationMs,
        headers: headersObj,
        body,
        receivedAt: new Date().toUTCString(),
      });
      if (!res.ok) {
        const fallback =
          typeof body === 'object' && body !== null && 'message' in body
            ? String((body as Record<string, unknown>).message ?? '')
            : '';
        setError(fallback || `Request failed (${res.status})`);
      }
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      setError(err instanceof Error ? err.message : 'Unknown network error');
      setResponse({
        status: 0,
        statusText: 'Network Error',
        durationMs,
        headers: {},
        body: { error: err instanceof Error ? err.message : 'Unknown network error' },
        receivedAt: new Date().toUTCString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-screen-xl mx-auto px-6 py-8">
      <nav aria-label="Breadcrumb" className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
          Internal / API Test
        </p>
      </nav>

      <header className="mb-8 flex flex-wrap items-center gap-4">
        <h1 className="font-nf-serif text-4xl lg:text-6xl font-bold tracking-tight">
          API Playground
        </h1>
        <span
          role="status"
          className="border border-[#92400E] text-[#92400E] bg-[#FEF3C7] font-mono text-xs uppercase tracking-widest px-2 py-0.5"
        >
          Internal Only
        </span>
      </header>

      <p className="font-nf-serif text-base text-neutral-700 leading-relaxed max-w-3xl mb-6">
        Compose ad-hoc requests against the Wodooh backend. Authoritative for engineering
        diagnostics; not exposed in production builds.
      </p>

      <section
        aria-label="Health probe"
        className="border-2 border-[#111111] bg-[#F9F9F7] p-6 mb-10 academic-texture"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-nf-condensed text-xs uppercase tracking-widest text-neutral-500 mb-1">
              Backend Health Probe
            </p>
            <p className="font-nf-mono text-xs text-neutral-600 break-all">{apiBase}/health</p>
          </div>
          {healthLoading ? (
            <span
              role="status"
              className="font-nf-mono text-xs px-2 py-0.5 uppercase tracking-wide bg-[#DBEAFE] text-[#1E3A5F] border border-[#1E3A5F]"
            >
              Probing
            </span>
          ) : (
            <span
              role="status"
              className={`font-nf-mono text-xs px-2 py-0.5 uppercase tracking-wide border ${
                isHealthy
                  ? 'bg-[#DCFCE7] text-[#166534] border-[#166534]'
                  : 'bg-[#FEE2E2] text-[#991B1B] border-[#991B1B]'
              }`}
            >
              {isHealthy ? '200 Healthy' : 'Unreachable'}
            </span>
          )}
        </div>
        <pre className="mt-4 font-nf-mono text-xs leading-relaxed overflow-x-auto bg-[#F5F5F5] border border-[#E5E5E0] p-4 whitespace-pre-wrap break-all">
{JSON.stringify(healthData ?? { status: 'awaiting' }, null, 2)}
        </pre>
      </section>

      <section aria-label="Request presets" className="mb-6">
        <p className="font-nf-condensed text-xs uppercase tracking-widest text-neutral-500 mb-2">
          Presets
        </p>
        <div className="flex flex-wrap gap-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className="border border-[#111111] text-[#111111] font-nf-sans text-xs uppercase tracking-widest px-4 py-2 hover:bg-[#111111] hover:text-[#F9F9F7] transition-colors duration-200 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2"
            >
              <span className="font-nf-condensed mr-2">{preset.method}</span>
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <p className="font-nf-mono text-xs text-neutral-400 mb-4 uppercase tracking-widest">
        Wodooh Internal Tools · API Playground · Generated: {generatedAt || '—'}
      </p>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        aria-label="API request composer"
      >
        <section
          aria-label="Request"
          className="border-2 border-[#111111] bg-[#F9F9F7] p-6"
        >
          <h2 className="font-nf-serif text-2xl font-semibold mb-6">Request</h2>

          <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 mb-6">
            <div>
              <label
                htmlFor="method"
                className="font-nf-sans text-xs uppercase tracking-widest text-neutral-600 block mb-1"
              >
                Method
              </label>
              <select
                id="method"
                value={method}
                onChange={(event) => setMethod(event.target.value as HttpMethod)}
                style={{ borderRadius: 0 }}
                className="border-b-2 border-[#111111] bg-transparent px-3 py-2 font-nf-mono text-sm w-full min-h-[44px] focus-visible:bg-[#F0F0F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 transition-colors duration-200"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="url"
                className="font-nf-sans text-xs uppercase tracking-widest text-neutral-600 block mb-1"
              >
                Request URL
              </label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                required
                style={{ borderRadius: 0 }}
                className="border-b-2 border-[#111111] bg-transparent px-3 py-2 font-nf-mono text-sm w-full min-h-[44px] focus-visible:bg-[#F0F0F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 transition-colors duration-200"
                placeholder="http://localhost:5001/auth/login"
              />
            </div>
          </div>

          <div className="mb-6">
            <label
              htmlFor="headers"
              className="font-nf-sans text-xs uppercase tracking-widest text-neutral-600 block mb-1"
            >
              Headers
            </label>
            <textarea
              id="headers"
              value={headersText}
              onChange={(event) => setHeadersText(event.target.value)}
              rows={4}
              spellCheck={false}
              style={{ borderRadius: 0 }}
              className="border-2 border-[#111111] bg-transparent px-3 py-2 font-mono text-xs leading-relaxed w-full focus-visible:bg-[#F0F0F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 transition-colors duration-200"
              placeholder="Content-Type: application/json&#10;Authorization: Bearer ..."
            />
            <p className="font-nf-mono text-[10px] text-neutral-500 mt-1 uppercase tracking-widest">
              One header per line · Key : Value
            </p>
          </div>

          <div className="mb-6">
            <label
              htmlFor="body"
              className="font-nf-sans text-xs uppercase tracking-widest text-neutral-600 block mb-1"
            >
              Body (JSON)
            </label>
            <textarea
              id="body"
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              rows={10}
              spellCheck={false}
              disabled={method === 'GET' || method === 'DELETE'}
              style={{ borderRadius: 0 }}
              className="border-2 border-[#111111] bg-transparent px-3 py-2 font-mono text-xs leading-relaxed w-full focus-visible:bg-[#F0F0F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 transition-colors duration-200 disabled:bg-[#F0F0F0] disabled:text-neutral-400 disabled:cursor-not-allowed"
              placeholder='{ "email": "admin@wodooh.com", "password": "Password123" }'
            />
          </div>

          <div className="flex items-center gap-4 border-t border-[#E5E5E0] pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#111111] text-[#F9F9F7] border border-transparent font-nf-sans font-medium uppercase tracking-widest text-xs px-6 py-3 hover:bg-white hover:text-[#111111] hover:border-[#111111] transition-all duration-200 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Send Request'}
            </button>
            <span className="font-nf-mono text-xs text-neutral-500 uppercase tracking-widest">
              <span className="font-nf-condensed text-[#111111] mr-2">{method}</span>
              <span className="break-all">{url || '—'}</span>
            </span>
          </div>
        </section>

        <section
          aria-label="Response"
          className="border-2 border-[#111111] bg-[#F9F9F7] p-6 academic-texture relative"
        >
          <h2 className="font-nf-serif text-2xl font-semibold mb-6">Response</h2>

          {!response && !loading && !error && (
            <p className="font-nf-mono text-xs text-neutral-500 uppercase tracking-widest">
              Awaiting first request…
            </p>
          )}

          {loading && (
            <p
              role="status"
              aria-live="polite"
              className="font-nf-mono text-xs uppercase tracking-widest text-neutral-700"
            >
              Dispatching request…
            </p>
          )}

          {response && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  role="status"
                  className={`font-nf-mono text-xs px-2 py-0.5 uppercase tracking-wide border ${statusPalette(
                    response.status,
                  )}`}
                >
                  {statusLabel(response.status, response.statusText)}
                </span>
                <span className="font-nf-mono text-xs text-neutral-600 uppercase tracking-widest">
                  {response.durationMs} ms
                </span>
                <span className="font-nf-mono text-xs text-neutral-500 uppercase tracking-widest">
                  {response.receivedAt}
                </span>
              </div>

              <div className="border-b border-[#E5E5E0] pb-4">
                <p className="font-nf-condensed text-xs uppercase tracking-widest text-neutral-500 mb-2">
                  Headers
                </p>
                {Object.keys(response.headers).length === 0 ? (
                  <p className="font-nf-mono text-xs text-neutral-500">— No headers —</p>
                ) : (
                  <dl className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-4 gap-y-1">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <div key={key} className="contents">
                        <dt className="font-nf-mono text-xs text-neutral-500 break-all">{key}</dt>
                        <dd className="font-nf-mono text-xs text-[#111111] break-all">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>

              <div>
                <p className="font-nf-condensed text-xs uppercase tracking-widest text-neutral-500 mb-2">
                  Body
                </p>
                <pre className="font-mono text-xs leading-relaxed overflow-x-auto bg-[#F5F5F5] border border-[#E5E5E0] p-4 whitespace-pre-wrap break-all">
{typeof response.body === 'string'
                    ? response.body
                    : JSON.stringify(response.body, null, 2)}
                </pre>
              </div>

              {error && (
                <div
                  role="alert"
                  className="border border-[#991B1B] bg-[#FEE2E2] text-[#991B1B] p-4"
                >
                  <p className="font-nf-condensed text-xs uppercase tracking-widest mb-1">
                    Request Error
                  </p>
                  <p className="font-nf-mono text-xs break-all">{error}</p>
                </div>
              )}
            </div>
          )}

          {!response && error && (
            <div
              role="alert"
              className="border border-[#991B1B] bg-[#FEE2E2] text-[#991B1B] p-4"
            >
              <p className="font-nf-condensed text-xs uppercase tracking-widest mb-1">
                Request Error
              </p>
              <p className="font-nf-mono text-xs break-all">{error}</p>
            </div>
          )}
        </section>
      </form>

      <div className="py-6 text-center font-nf-mono text-xs text-neutral-400 tracking-[1em] uppercase">
        · · · · ·
      </div>
    </main>
  );
}
