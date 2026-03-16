"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Briefcase,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { getEmploymentSupportIntake } from "@/app/actions/employment-support";
import { dbRowToFormData } from "@/lib/schemas/employment-support";
import { EmploymentSupportIntakeForm } from "@/components/forms/EmploymentSupportIntakeForm";
import type { EmploymentSupportIntakeForm as ESIFormType } from "@/lib/schemas/employment-support";

interface IntakeData {
  id: string;
  formData: ESIFormType;
  status: string;
  enrollmentId?: string;
  submittedInfo: { by: string; at: string } | null;
}

export default function EmploymentSupportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [intakeData, setIntakeData] = useState<IntakeData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      // Verify client role
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData?.role && profileData.role !== "client") {
        router.push("/dashboard");
        return;
      }

      // Get client record
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id")
        .eq("portal_user_id", user.id)
        .single();

      if (clientError || !clientData) {
        setError("No client account found.");
        setLoading(false);
        return;
      }

      setClientId(clientData.id);

      // Fetch intake using server action
      const result = await getEmploymentSupportIntake(clientData.id);

      if (result.success && result.data) {
        const row = result.data;
        const formData = dbRowToFormData(row as Record<string, unknown>);

        const submittedBy = row.submitted_by_profile
          ? `${(row.submitted_by_profile as { first_name: string; last_name: string }).first_name} ${(row.submitted_by_profile as { first_name: string; last_name: string }).last_name}`
          : null;

        setIntakeData({
          id: row.id,
          formData,
          status: row.status,
          enrollmentId: row.program_enrollment_id || undefined,
          submittedInfo:
            submittedBy && row.submitted_at
              ? { by: submittedBy, at: row.submitted_at }
              : null,
        });
      } else {
        // No intake found — client is not enrolled in Employment Support
        setIntakeData(null);
      }
    } catch (err) {
      console.error("Error fetching employment support data:", err);
      setError("An error occurred while loading your data.");
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSuccess = () => {
    toast({
      title: "Questionnaire submitted",
      description: "Your case manager will review your responses.",
    });
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-4" />
            <p className="text-gray-600">
              Loading Employment Support Intake...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link href="/my-portal">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Portal
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p className="text-gray-600 mb-4">No client account found.</p>
            <Link href="/my-portal">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Portal
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container px-4 py-4 max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/my-portal">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> My Portal
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-emerald-600" />
              <h1 className="font-bold text-lg">Employment Support Intake</h1>
            </div>
          </div>
          {intakeData && (
            <Badge
              variant="outline"
              className={
                intakeData.status === "draft"
                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                  : intakeData.status === "submitted"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-green-50 text-green-700 border-green-200"
              }
            >
              {intakeData.status === "draft"
                ? "Draft"
                : intakeData.status === "submitted"
                  ? "Submitted"
                  : "Reviewed"}
            </Badge>
          )}
        </div>
      </header>

      <main className="container px-4 py-6 max-w-4xl mx-auto">
        {!intakeData ? (
          <>
            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
              <Briefcase className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800">
                Fill out this questionnaire to help your case manager support your job search. Your answers help us understand your goals, experience, and what support you need.
              </p>
            </div>
            <EmploymentSupportIntakeForm
              clientId={clientId}
              onSuccess={handleSuccess}
            />
          </>
        ) : (
          <>
            {intakeData.status === "reviewed" && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">
                    Your questionnaire has been reviewed
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Your case manager has reviewed your responses. You can still
                    update your information if anything has changed.
                  </p>
                </div>
              </div>
            )}

            <EmploymentSupportIntakeForm
              initialData={intakeData.formData}
              clientId={clientId}
              enrollmentId={intakeData.enrollmentId}
              intakeId={intakeData.id}
              existingStatus={intakeData.status}
              submittedInfo={intakeData.submittedInfo}
              onSuccess={handleSuccess}
            />
          </>
        )}
      </main>
    </div>
  );
}
