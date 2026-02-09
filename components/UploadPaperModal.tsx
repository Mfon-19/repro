'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type UploadResult = {
  id?: string;
  status?: string;
  message?: string;
  stage?: string;
  progress_pct?: number;
  error?: string;
};

export default function UploadPaperModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<UploadResult | null>(null);

  const apiBase = useMemo(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    return base || '';
  }, []);

  const resetState = useCallback(() => {
    setError('');
    setResult(null);
  }, []);

  const closeModal = useCallback(() => {
    if (busy) {
      return;
    }
    setOpen(false);
    resetState();
  }, [busy, resetState]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (busy) {
        return;
      }

      const form = event.currentTarget;
      const fileInput = form.elements.namedItem('paper') as HTMLInputElement | null;
      const titleInput = form.elements.namedItem('title') as HTMLInputElement | null;

      if (!fileInput?.files?.length) {
        setError('SELECT A PDF TO UPLOAD.');
        return;
      }

      setBusy(true);
      setError('');
      setResult(null);

      try {
        const formData = new FormData();
        formData.append('paper', fileInput.files[0]);
        if (titleInput?.value) {
          formData.append('title', titleInput.value);
        }

        const response = await fetch(`${apiBase}/api/jobs`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        const data = await response.json();
        if (!response.ok) {
          if (response.status === 401) {
            setError('LOGIN REQUIRED.');
          } else {
            setError(data?.message || 'UPLOAD FAILED.');
          }
          setResult(null);
          return;
        }

        const jobId = data?.id;
        form.reset();
        if (!jobId) {
          setError('UPLOAD FAILED.');
          return;
        }

        const finalizeResponse = await fetch(`${apiBase}/api/jobs/${jobId}/finalize`, {
          method: 'POST',
          credentials: 'include',
        });
        const finalizeData = await finalizeResponse.json().catch(() => ({}));

        if (!finalizeResponse.ok) {
          if (finalizeResponse.status === 401) {
            setError('LOGIN REQUIRED.');
          } else {
            setError(finalizeData?.message || 'FAILED TO QUEUE JOB.');
          }
          setResult({
            id: jobId,
            status: data?.status,
            stage: data?.stage,
            message: data?.message || 'UPLOAD ACCEPTED.',
          });
          return;
        }

        setResult({
          id: jobId,
          status: finalizeData?.status || data?.status || 'queued',
          stage: finalizeData?.stage || data?.stage || 'queued',
          progress_pct: finalizeData?.progress_pct || data?.progress_pct || 0,
          message: 'GENERATING SCAFFOLD...',
        });

        const poll = async () => {
          const response = await fetch(`${apiBase}/api/jobs/${jobId}`, {
            credentials: 'include',
          });
          if (!response.ok) {
            throw new Error('FAILED TO LOAD JOB STATUS.');
          }
          return (await response.json()) as UploadResult & {
            status?: string;
            progress_pct?: number;
            error?: string;
          };
        };

        while (true) {
          const status = await poll();
          setResult((prev) => ({
            ...prev,
            id: jobId,
            status: status?.status || prev?.status,
            stage: status?.stage || prev?.stage,
            progress_pct: status?.progress_pct ?? prev?.progress_pct,
            message: status?.status === 'completed' ? 'READY.' : 'GENERATING SCAFFOLD...',
            error: status?.error || prev?.error,
          }));

          if (status?.status === 'completed') {
            break;
          }
          if (status?.status === 'failed') {
            throw new Error(status?.error || 'JOB FAILED.');
          }

          await new Promise((resolve) => setTimeout(resolve, 4000));
        }

        closeModal();
        router.push(`/reproduce/${jobId}`);
      } catch {
        setError('NETWORK ERROR. TRY AGAIN.');
      } finally {
        setBusy(false);
      }
    },
    [apiBase, busy, closeModal, router]
  );

  return (
    <>
      <button className="btn-solid text-xs px-6 py-3" onClick={() => setOpen(true)}>
        UPLOAD_PAPER
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80" onClick={closeModal} />

          <div className="relative z-10 w-full max-w-lg border border-[var(--border)] bg-[var(--background)] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">UPLOAD_PAPER</h2>
              <button className="text-xs text-[#666] hover:text-[var(--accent)]" onClick={closeModal}>
                CLOSE
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-[#666] block mb-2">TITLE (OPTIONAL)</label>
                <input
                  name="title"
                  type="text"
                  placeholder="RAFT / 1988"
                  className="w-full bg-transparent border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="text-xs text-[#666] block mb-2">PDF_FILE</label>
                <input
                  name="paper"
                  type="file"
                  accept="application/pdf"
                  className="w-full text-xs text-[#666] border border-[var(--border)] p-3 file:mr-4 file:border-0 file:bg-[var(--foreground)] file:text-[var(--background)] file:px-3 file:py-2 file:font-bold"
                />
              </div>

              {error && <div className="text-xs text-red-400">{error}</div>}

              {result && (
                <div className="text-xs text-[#666] border border-[var(--border)] p-3">
                  <div>STATUS: {result.status || 'QUEUED'}</div>
                  {result.stage && <div>STAGE: {result.stage}</div>}
                  {typeof result.progress_pct === 'number' && <div>PROGRESS: {result.progress_pct}%</div>}
                  <div>ID: {result.id || 'PENDING'}</div>
                  <div>{result.message}</div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="btn-outline text-xs px-4 py-2"
                  onClick={closeModal}
                  disabled={busy}
                >
                  CANCEL
                </button>
                <button type="submit" className="btn-solid text-xs px-4 py-2" disabled={busy}>
                  {busy ? 'PROCESSING...' : 'START'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
