'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type UploadResult = {
  id?: string;
  status?: string;
  message?: string;
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
    setOpen(false);
    resetState();
  }, [resetState]);

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

        const response = await fetch(`${apiBase}/api/v1/papers`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data?.message || 'UPLOAD FAILED.');
          setResult(null);
          return;
        }

        const paperID = data?.id;
        form.reset();
        if (paperID) {
          closeModal();
          router.push(`/reproduce/${paperID}`);
          return;
        }
        setResult({
          id: paperID,
          status: data?.status,
          message: data?.message || 'UPLOAD ACCEPTED.',
        });
      } catch (err) {
        setError('NETWORK ERROR. TRY AGAIN.');
      } finally {
        setBusy(false);
      }
    },
    [apiBase, busy]
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
                  {busy ? 'UPLOADING...' : 'START'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
