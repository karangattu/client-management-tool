import { ClientIntakeForm } from "@/components/forms/ClientIntakeForm";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getClientFullData } from "@/app/actions/client";
import { ClientIntakeForm as ClientIntakeFormType } from "@/lib/schemas/validation";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ClientIntakePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const clientId = typeof resolvedSearchParams.clientId === 'string' ? resolvedSearchParams.clientId : undefined;

  let initialData: ClientIntakeFormType | undefined = undefined;

  if (clientId) {
    const result = await getClientFullData(clientId);
    if (result.success && result.data) {
      initialData = result.data;
    } else {
      // Handle error or redirect if client not found
      console.error("Failed to fetch client data:", result.error);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Link href="/clients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Button>
          </Link>
        </div>
        <ClientIntakeForm initialData={initialData} clientId={clientId} />
        <Toaster />
      </div>
    </div>
  );
}
