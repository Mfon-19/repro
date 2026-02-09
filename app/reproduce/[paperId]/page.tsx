import { notFound } from 'next/navigation';

import ReproduceClient from '@/components/ReproduceClient';

type ReproducePageProps = {
  params: Promise<{
    paperId?: string;
  }>;
};

export default async function ReproducePage({ params }: ReproducePageProps) {
  const { paperId } = await params;
  if (!paperId) {
    notFound();
  }
  return <ReproduceClient paperId={paperId} />;
}
