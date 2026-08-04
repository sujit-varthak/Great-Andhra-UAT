import { AdvertisementForm } from '@/components/AdvertisementForm';

export const metadata = {
  title: 'New Advertisement',
};

export default function NewAdvertisementPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Create New Advertisement</h1>
      </div>
      <AdvertisementForm />
    </div>
  );
}
