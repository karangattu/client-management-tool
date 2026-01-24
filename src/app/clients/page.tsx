import { getClientsWithCursor, getActivePrograms } from '@/app/actions/client';
import { ClientsList } from '@/components/clients/ClientsList';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Server Component - Clients Page
 * Fetches initial data on the server for better performance
 * Uses cursor-based pagination for scalability
 */
export default async function ClientsPage() {
  // Authenticate user on server
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/login');
  }

  // Fetch initial clients and programs on server
  const [clientsResult, programsResult] = await Promise.all([
    getClientsWithCursor({ limit: 50 }),
    getActivePrograms(),
  ]);

  const initialClients = clientsResult.success ? clientsResult.data : [];
  const initialPrograms = programsResult.success ? programsResult.data : [];
  const initialHasMore = clientsResult.hasMore || false;
  const initialCursor = clientsResult.nextCursor || null;

  return (
    <ClientsList
      initialClients={initialClients}
      initialPrograms={initialPrograms}
      initialHasMore={initialHasMore}
      initialCursor={initialCursor}
    />
  );
}
