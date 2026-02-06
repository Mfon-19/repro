'use client';

import dynamic from 'next/dynamic';

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false });

type PdfViewerClientProps = {
  fileUrl: string;
  height?: number;
};

export default function PdfViewerClient(props: PdfViewerClientProps) {
  return <PdfViewer {...props} />;
}
