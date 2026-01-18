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
  let role: string | undefined;
  let showStaffFields = true;

  if (!resolvedClientId) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If not authenticated, send to login so staff can sign in and create an intake
    if (!user) {
      // Preserve intended destination so user can come back after sign in
      redirect('/login?redirect=/client-intake');
    } else {
      // Fetch profile role to decide behavior
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      role = profile?.role as string | undefined;

      if (role === 'client') {
        // Client users should go to their portal if they don't have a client record
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('portal_user_id', user.id)
          .single();

        if (clientData) {
          resolvedClientId = clientData.id;
          showBackButton = false; // Clients should go back to their portal
        } else {
          redirect('/client-portal');
        }
      }
      // For staff/admin/case_manager roles, allow opening a blank intake to create a new client
    }
  }

  showStaffFields = role ? role !== 'client' : true;

  if (resolvedClientId) {
    const result = await getClientFullData(resolvedClientId);
    if (result.success && result.data) {
      initialData = result.data;
    } else {
      // Handle error or redirect if client not found
      console.error("Failed to fetch client data:", result.error);
    }
  }

  // If no clientId, staff/admin/case_manager can create a new client with undefined initialData

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
        <ClientIntakeForm initialData={initialData} clientId={resolvedClientId} showStaffFields={showStaffFields} />
        <Toaster />
      </div>
    </div>
  );
}
