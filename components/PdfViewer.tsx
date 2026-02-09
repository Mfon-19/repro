'use client';

import { Worker, Viewer } from '@react-pdf-viewer/core';

const pdfjsVersion = '3.11.174';
const workerUrl = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.js`;

type PdfViewerProps = {
  fileUrl: string;
  height?: number;
};

export default function PdfViewer({ fileUrl, height = 520 }: PdfViewerProps) {
  if (!fileUrl) {
    return (
      <div className="border border-[var(--border)] bg-black/60 p-4 text-xs text-[#666]">
        NO_PDF_AVAILABLE
      </div>
    );
  }

  return (
    <div className="border border-[var(--border)] bg-black/60" style={{ height }}>
      <Worker workerUrl={workerUrl}>
        <Viewer fileUrl={fileUrl} />
      </Worker>
    </div>
  );
}
