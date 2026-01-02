import { ClientIntakeForm } from "@/components/forms/ClientIntakeForm";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getClientFullData } from "@/app/actions/client";
import { ClientIntakeForm as ClientIntakeFormType } from "@/lib/schemas/validation";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ClientIntakePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const clientId = typeof resolvedSearchParams.clientId === 'string' ? resolvedSearchParams.clientId : undefined;
  
  // If no clientId provided, try to get the current user's client record
  let resolvedClientId = clientId;
  let initialData: ClientIntakeFormType | undefined = undefined;
  let showBackButton = true;

  if (!resolvedClientId) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Get the client record for this user
      const { data: clientData, error } = await supabase
        .from('clients')
        .select('id')
        .eq('portal_user_id', user.id)
        .single();
      
      if (clientData) {
        resolvedClientId = clientData.id;
        showBackButton = false; // Clients should go back to their portal
      }
    }
  }

  if (resolvedClientId) {
    const result = await getClientFullData(resolvedClientId);
    if (result.success && result.data) {
      initialData = result.data;
    } else {
      // Handle error or redirect if client not found
      console.error("Failed to fetch client data:", result.error);
    }
  }

  // If no client found, redirect to client portal
  if (!resolvedClientId) {
    redirect('/client-portal');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="mb-6">
          {showBackButton ? (
            <Link href="/clients">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Button>
            </Link>
          ) : (
            <Link href="/my-portal">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to My Portal
              </Button>
            </Link>
          )}
        </div>
        <ClientIntakeForm initialData={initialData} clientId={resolvedClientId} />
        <Toaster />
      </div>
    </div>
  );
}