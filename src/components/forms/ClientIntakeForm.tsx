"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  ParticipantDetailsSection,
  EmergencyContactSection,
  CaseManagementSection,
  DemographicsSection,
  HouseholdSection,
} from "@/components/forms/sections";
import {
  clientIntakeSchema,
  defaultClientIntakeForm,
  type ClientIntakeForm as ClientIntakeFormType,
} from "@/lib/schemas/validation";
import { saveClientIntake } from "@/app/actions/client";
import { getAllUsers } from "@/app/actions/users";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  AlertCircle,
  User,
  Phone,
  Briefcase,
  Users,
  FileText,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FORM_STEPS = [
  { id: "participant", title: "Participant", icon: User },
  { id: "emergency", title: "Emergency Contact", icon: Phone },
  { id: "case", title: "Case Management", icon: Briefcase },
  { id: "demographics", title: "Demographics", icon: FileText },
  { id: "household", title: "Household", icon: Users },
];

const DRAFT_KEY = "client-intake-draft";

interface ClientIntakeFormProps {
  initialData?: ClientIntakeFormType;
  clientId?: string;
}

export function ClientIntakeForm({ initialData, clientId }: ClientIntakeFormProps) {
  const hasSubmittedRef = useRef(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [caseManagers, setCaseManagers] = useState<{ value: string; label: string }[]>([]);
  const { toast } = useToast();

  const methods = useForm<ClientIntakeFormType>({
    resolver: zodResolver(clientIntakeSchema),
    defaultValues: initialData || defaultClientIntakeForm,
    mode: "onBlur",
  });

  const {
    handleSubmit,
    watch,
    formState: { errors, dirtyFields },
    reset,
    trigger,
  } = methods;

  // Load draft from localStorage
  useEffect(() => {
    if (!initialData && typeof window !== "undefined") {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          // Only restore if we haven't just submitted
          if (!hasSubmittedRef.current) {
            reset(parsed.data);
            setLastSaved(new Date(parsed.savedAt));
            toast({
              title: "Draft restored",
              description: "Your previous progress has been restored.",
            });
          }
        } catch {
          // Invalid draft, ignore
        }
      }
    }
  }, [initialData, reset, toast]);

  // Fetch case managers
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const result = await getAllUsers();
        if (result.success && result.data) {
          interface ProfileRecord {
            id: string;
            first_name: string;
            last_name: string;
            role: string;
          }
          const managers = (result.data as ProfileRecord[])
            .filter((u) => u.role === 'case_manager' || u.role === 'staff')
            .map((u) => ({
              value: u.id,
              label: `${u.first_name} ${u.last_name}`,
            }));
          setCaseManagers(managers);
        }
      } catch (err) {
        console.error("Error fetching case managers:", err);
      }
    };
    fetchManagers();
  }, []);

  // Auto-save draft
  const formData = watch();
  const saveDraft = useCallback(() => {
    // Don't save if we're submitting or have successfully submitted
    if (isSubmitting || hasSubmittedRef.current) return;

    if (typeof window !== "undefined" && Object.keys(dirtyFields).length > 0) {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          data: formData,
          savedAt: new Date().toISOString(),
        })
      );
      setLastSaved(new Date());
    }
  }, [formData, dirtyFields, isSubmitting]);

  useEffect(() => {
    const timer = setInterval(saveDraft, 30000); // Auto-save every 30 seconds
    return () => clearInterval(timer);
  }, [saveDraft]);

  // Save draft on blur
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveDraft();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [saveDraft]);

  const validateCurrentStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await trigger(fieldsToValidate as (keyof ClientIntakeFormType)[]);
    return isValid;
  };

  const getFieldsForStep = (step: number): string[] => {
    switch (step) {
      case 0:
        return ["participantDetails"];
      case 1:
        return ["emergencyContacts"];
      case 2:
        return ["caseManagement"];
      case 3:
        return ["demographics"];
      case 4:
        return ["household"];
      default:
        return [];
    }
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      saveDraft();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleStepClick = async (stepIndex: number) => {
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
    } else if (stepIndex === currentStep + 1) {
      const isValid = await validateCurrentStep();
      if (isValid) {
        setCurrentStep(stepIndex);
      }
    }
  };

  const onSubmit = async (data: ClientIntakeFormType) => {
    setIsSubmitting(true);
    try {
      const result = await saveClientIntake(data, clientId);
      if (result.success) {
        // Mark as submitted to prevent draft saving
        hasSubmittedRef.current = true;

        // Clear draft on successful save
        if (typeof window !== "undefined") {
          localStorage.removeItem(DRAFT_KEY);
        }
        toast({
          title: "Success!",
          description: clientId
            ? "Client information has been updated."
            : "New client has been created successfully.",
          variant: "success",
        });
        // Redirect to client list or detail page
        window.location.href = "/clients";
      } else {
        throw new Error(result.error || "Failed to save client");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasStepErrors = (stepIndex: number) => {
    const fields = getFieldsForStep(stepIndex);
    return fields.some((field) => {
      const fieldErrors = errors[field as keyof typeof errors];
      return fieldErrors && Object.keys(fieldErrors).length > 0;
    });
  };

  const progress = ((currentStep + 1) / FORM_STEPS.length) * 100;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Progress Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Client Intake Form</h1>
              <p className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {FORM_STEPS.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {lastSaved && (
                <span className="text-xs text-muted-foreground hidden sm:block">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={saveDraft}
              >
                <Save className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Save Draft</span>
              </Button>
            </div>
          </div>

          <Progress value={progress} className="h-2 mb-4" />

          {/* Step Indicators */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {FORM_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const hasError = hasStepErrors(index);

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepClick(index)}
                  disabled={index > currentStep + 1}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-w-fit",
                    isActive && "bg-primary text-primary-foreground",
                    !isActive &&
                    isCompleted &&
                    "bg-primary/10 text-primary hover:bg-primary/20",
                    !isActive &&
                    !isCompleted &&
                    "bg-muted text-muted-foreground",
                    index > currentStep + 1 && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {hasError ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{step.title}</span>
                  {hasError && (
                    <Badge variant="destructive" className="h-5 px-1.5">
                      !
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="min-h-[400px]">
          {currentStep === 0 && <ParticipantDetailsSection />}
          {currentStep === 1 && <EmergencyContactSection />}
          {currentStep === 2 && <CaseManagementSection caseManagers={caseManagers} />}
          {currentStep === 3 && <DemographicsSection />}
          {currentStep === 4 && <HouseholdSection />}
        </div>

        {/* Navigation Buttons */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t pt-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex-1 sm:flex-none"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep < FORM_STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="flex-1 sm:flex-none"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
