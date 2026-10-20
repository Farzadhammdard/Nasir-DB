import { redirect } from 'next/navigation';

const sections = ['dashboard', 'bills', 'customers', 'dues', 'payments', 'expenses', 'reports', 'notifications', 'settings'];

export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}

export default async function SectionPage({ params }) {
  const { section } = await params;
  if (!sections.includes(section)) return null;
  if (section === 'payments') redirect('/dues');
  return null;
}