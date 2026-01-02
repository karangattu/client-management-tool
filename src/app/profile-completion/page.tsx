"use client";

import { useEffect, useState } from "react";
import { ClientIntakeForm } from "@/components/forms/ClientIntakeForm";
import { getCurrentUserProfile } from "@/app/actions/users";
import { getClientByUserId, getClientFullData } from "@/app/actions/client";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/layout/AppHeader";

export default function ProfileCompletionPage() {
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | undefined>();
  const [initialData, setInitialData] = useState<any>(null);
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
          if (fullDataResult.success) {
            setInitialData(fullDataResult.data);
          }
        } else {
          // New client record needed? 
          // We set default shared values from profile
          setInitialData({
            participantDetails: {
              firstName: userResult.data.first_name || "",
              lastName: userResult.data.last_name || "",
              email: userResult.data.email || "",
            }
          });
        }
      } catch (err) {
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/30">
        <AppHeader />
        <main className="container max-w-5xl py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive font-medium">{error}</p>
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
          initialData={initialData}
          clientId={clientId}
          showStaffFields={false}
        />
      </main>
    </div>
  );
}
