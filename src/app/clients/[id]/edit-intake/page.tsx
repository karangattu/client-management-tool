'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, User } from 'lucide-react';
import { useAuth, canAccessFeature } from '@/lib/auth-context';
import { ClientIntakeForm } from '@/components/forms/ClientIntakeForm';
import { getClientFullData } from '@/app/actions/client';
import type { ClientIntakeForm as ClientIntakeFormType } from '@/lib/schemas/validation';

export default function EditClientIntakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params);
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientData, setClientData] = useState<ClientIntakeFormType | null>(null);
  const [clientName, setClientName] = useState<string>('');

  const canEdit = canAccessFeature(profile?.role || 'client', 'staff');

  useEffect(() => {
    const fetchClientData = async () => {
      setLoading(true);
      try {
        const result = await getClientFullData(clientId);
        if (result.success && result.data) {
          setClientData(result.data);
          setClientName(`${result.data.participantDetails.firstName} ${result.data.participantDetails.lastName}`);
        } else {
          setError(result.error || 'Failed to load client data');
        }
      } catch (err) {
        console.error('Error fetching client:', err);
        setError('Failed to load client data');
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [clientId]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Loading..." showBackButton />
        <main className="container px-4 py-6 max-w-7xl mx-auto">
          <Skeleton className="h-96" />
        </main>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Access Denied" showBackButton />
        <main className="container px-4 py-6">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-500">You don&apos;t have permission to edit clients.</p>
              <Button className="mt-4" onClick={() => router.back()}>Go Back</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Loading..." showBackButton />
        <main className="container px-4 py-6 max-w-7xl mx-auto">
          <Skeleton className="h-96" />
        </main>
      </div>
    );
  }

  if (error || !clientData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Error" showBackButton />
        <main className="container px-4 py-6">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Failed to load client data'}</AlertDescription>
          </Alert>
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Unable to Load Client</h2>
              <p className="text-gray-500 mb-4">There was a problem loading this client&apos;s information.</p>
              <Button onClick={() => router.push('/clients')}>Back to Clients</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        title={`Edit Intake: ${clientName}`}
        showBackButton
      />

      <main className="container px-4 py-6 max-w-7xl mx-auto">
        <ClientIntakeForm
          initialData={clientData}
          clientId={clientId}
          showStaffFields={true}
        />
      </main>
    </div>
  );
}