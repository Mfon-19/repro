import ReproduceClient from '@/components/ReproduceClient';

type ReproducePageProps = {
  params: {
    paperId: string;
  };
};

export default function ReproducePage({ params }: ReproducePageProps) {
  return <ReproduceClient paperId={params.paperId} />;
}
