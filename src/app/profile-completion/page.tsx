"use client";

import { useEffect, useState } from "react";
import { ClientIntakeForm } from "@/components/forms/ClientIntakeForm";
import { getCurrentUserProfile } from "@/app/actions/users";
import { getClientByUserId, getClientFullData } from "@/app/actions/client";
import {
  ClientIntakeForm as ClientIntakeFormType,
  defaultClientIntakeForm
} from "@/lib/schemas/validation";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/layout/AppHeader";
import Link from "next/link";

export default function ProfileCompletionPage() {
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | undefined>();
  const [initialData, setInitialData] = useState<ClientIntakeFormType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const userResult = await getCurrentUserProfile();
        if (!userResult.success || !userResult.data) {
          setError("Session expired. Please log in again.");
          return;
        }

        const clientResult = await getClientByUserId(userResult.data.id);
        if (clientResult.success && clientResult.data) {
          setClientId(clientResult.data.id);
          const fullDataResult = await getClientFullData(clientResult.data.id);
          if (fullDataResult.success && fullDataResult.data) {
            setInitialData(fullDataResult.data);
          }
        } else {
          // New client record needed? 
          // We set default shared values from profile
          setInitialData({
            ...defaultClientIntakeForm,
            participantDetails: {
              ...defaultClientIntakeForm.participantDetails,
              firstName: userResult.data.first_name || "",
              lastName: userResult.data.last_name || "",
              email: userResult.data.email || "",
            }
          });
        }
      } catch {
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Loading your profile...</p>
            <Button variant="outline" onClick={() => window.location.reload()} size="sm">
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/30">
        <AppHeader />
        <main className="container max-w-5xl py-8 px-4">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-8 pb-8">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold mb-2">Unable to Load Profile</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
                <Link href="/login">
                  <Button className="w-full">Go to Login</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader />
      <main className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Complete Your Profile</h1>
          <p className="text-muted-foreground mt-2">
            Please provide your details to help us serve you better. This information will only be used by our team to manage your case.
          </p>
        </div>

        <ClientIntakeForm
          initialData={initialData || undefined}
          clientId={clientId}
          showStaffFields={false}
        />
      </main>
    </div>
  );
}
