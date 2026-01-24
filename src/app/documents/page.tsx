import DocumentsClient from '@/components/documents/DocumentsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Server Component - Documents Page
 * Delegates to client component for now, but provides foundation for
 * server-side data fetching in future iterations
 */
export default function DocumentsPage() {
  return <DocumentsClient />;
}
