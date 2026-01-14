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
  FinancialSection,
  BenefitsHealthSection,
} from "@/components/forms/sections";
import { useAuth } from "@/lib/auth-context";
import {
  clientIntakeSchema,
  defaultClientIntakeForm,
  type ClientIntakeForm as ClientIntakeFormType,
} from "@/lib/schemas/validation";
import { saveClientIntake } from "@/app/actions/client";
import { completeTaskByTitle } from "@/app/actions/tasks";
import { getAllUsers } from "@/app/actions/users";
import { calculateBenefits } from "@/lib/benefitsEngine";
import { EligibilityPanel } from "@/components/forms/EligibilityPanel";
import { useMemo } from "react";
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
  DollarSign,
  HeartPulse,
  Sparkles,
  Edit,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const FORM_STEPS = [
  { id: "participant", title: "Personal Info", icon: User },
  { id: "emergency", title: "Emergency", icon: Phone },
  { id: "demographics", title: "Demographics", icon: FileText },
  { id: "household", title: "Household", icon: Users },
  { id: "financial", title: "Financials", icon: DollarSign },
  { id: "health", title: "Benefits & Health", icon: HeartPulse },
  { id: "case", title: "Case Details", icon: Briefcase },
];

const DRAFT_KEY = "client-intake-draft";

interface ClientIntakeFormProps {
  initialData?: ClientIntakeFormType;
  clientId?: string;
  showStaffFields?: boolean;
}

export function ClientIntakeForm({ initialData, clientId, showStaffFields: _showStaffFields = true }: ClientIntakeFormProps) {
  const { profile } = useAuth();
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

  // Dynamic Benefits Calculation
  const benefits = useMemo(() => calculateBenefits(formData), [formData]);

  const validateCurrentStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    if (fieldsToValidate.length === 0) return true;

    try {
      const isValid = await trigger(fieldsToValidate as (keyof ClientIntakeFormType)[]);
      return isValid;
    } catch (error) {
      console.error("Validation error:", error);
      return false;
    }
  };

  const getFieldsForStep = (step: number): string[] => {
    switch (step) {
      case 0: // Personal Info
        return ["participantDetails"];
      case 1: // Emergency Contact
        return ["emergencyContacts"];
      case 2: // Demographics
        return ["demographics.race", "demographics.genderIdentity", "demographics.ethnicity", "demographics.maritalStatus", "demographics.language"];
      case 3: // Household
        return ["household"];
      case 4: // Financial
        return ["demographics.employmentStatus", "demographics.monthlyIncome", "demographics.incomeSource", "demographics.veteranStatus", "demographics.disabilityStatus"];
      case 5: // Benefits & Health
        return ["caseManagement.healthInsurance", "caseManagement.healthInsuranceType", "caseManagement.nonCashBenefits", "caseManagement.healthStatus"];
      case 6: // Case Details
        return ["caseManagement.clientManager", "caseManagement.clientStatus", "caseManagement.housingStatus", "caseManagement.primaryLanguage"];
      default:
        return [];
    }
  };

  const handleNext = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (currentStep >= FORM_STEPS.length - 1) {
      return; // Don't proceed if on last step
    }

    const isValid = await validateCurrentStep();
    if (isValid) {
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
    // Allow going back to any previous step freely
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // Allow going to next step only if current step is valid
    else if (stepIndex === currentStep + 1) {
      const isValid = await validateCurrentStep();
      if (isValid) {
        setCurrentStep(stepIndex);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast({
          title: "Please complete this step",
          description: "Fix any errors before proceeding to the next step.",
          variant: "destructive",
        });
      }
    }
  };

  const onSubmit = async (data: ClientIntakeFormType) => {
    // Prevent double submission
    if (isSubmitting || hasSubmittedRef.current) {
      console.log('Submission already in progress or completed');
      return;
    }
    
    setIsSubmitting(true);
    
    // Save draft before submission as backup
    saveDraft();
    
    // Retry logic for robustness
    let lastError: Error | null = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Submission attempt ${attempt}/${maxRetries}`);
        
        const result = await saveClientIntake(data, clientId);
        
        if (result.success) {
          // Mark as submitted to prevent draft saving
          hasSubmittedRef.current = true;

          // Clear draft on successful save
          if (typeof window !== "undefined") {
            localStorage.removeItem(DRAFT_KEY);
          }
          
          // Create/Complete task on successful submission (non-blocking)
          if (profile?.role === 'client' || (clientId)) {
            try {
              await completeTaskByTitle(clientId || result.clientId!, "Complete Full Intake Form");
            } catch (taskError) {
              console.error("Failed to complete task:", taskError);
              // Don't block redirect if task completion fails
            }
          }

          toast({
            title: "Success!",
            description: clientId
              ? "Client information has been updated."
              : "New client has been created successfully.",
            variant: "success",
          });
          
          // Redirect based on user role with small delay to ensure toast shows
          setTimeout(() => {
            if (profile?.role === 'client') {
              window.location.href = "/my-portal";
            } else {
              window.location.href = "/clients";
            }
          }, 500);
          
          return; // Success - exit retry loop
        } else {
          throw new Error(result.error || "Failed to save client");
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`Attempt ${attempt} failed:`, lastError.message);
        
        // If not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Progressive backoff
        }
      }
    }
    
    // All retries failed
    setIsSubmitting(false);
    toast({
      title: "Error",
      description: lastError
        ? `${lastError.message}. Your progress has been saved as a draft.`
        : "Something went wrong. Your progress has been saved as a draft. Please try again.",
      variant: "destructive",
    });
  };

  const hasStepErrors = (stepIndex: number) => {
    const fields = getFieldsForStep(stepIndex);
    return fields.some((field) => {
      const fieldErrors = errors[field as keyof typeof errors];
      return fieldErrors && Object.keys(fieldErrors).length > 0;
    });
  };

  const progress = ((currentStep + 1) / FORM_STEPS.length) * 100;

  // Compute subtitle for new vs edit intake
  const isEdit = !!clientId;
  const clientName = initialData?.participantDetails
    ? `${initialData.participantDetails.firstName} ${initialData.participantDetails.lastName}`.trim()
    : "";
  const subtitle = isEdit
    ? clientName
      ? `Editing intake for ${clientName}`
      : "Editing existing client intake"
    : "Create a new client intake (staff/admin only)";

  // Prevent form submission on Enter key (except on last step)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && currentStep < FORM_STEPS.length - 1) {
      e.preventDefault();
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={handleKeyDown}
        className="space-y-6"
      >
        {/* Progress Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Client Intake Form</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {isEdit ? (
                  <Edit className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Plus className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="truncate">{subtitle}</span>
              </p>
              {!isEdit && (
                <p className="text-xs text-muted-foreground mt-1">Staff/volunteers: You can create a client record on behalf of someone who cannot self-register.</p>
              )}
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
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
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
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all min-w-fit whitespace-nowrap",
                    isActive && "bg-primary text-primary-foreground shadow-sm",
                    !isActive &&
                    isCompleted &&
                    "bg-primary/5 text-primary hover:bg-primary/10",
                    !isActive &&
                    !isCompleted &&
                    "bg-muted/50 text-muted-foreground hover:bg-muted",
                    index > currentStep + 1 && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="relative">
                    {hasError ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <StepIcon className="h-4 w-4" />
                    )}
                  </div>
                  <span>{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 xl:col-span-9 min-h-[400px]">
            {currentStep === 0 && <ParticipantDetailsSection />}
            {currentStep === 1 && <EmergencyContactSection />}
            {currentStep === 2 && <DemographicsSection />}
            {currentStep === 3 && <HouseholdSection />}
            {currentStep === 4 && <FinancialSection />}
            {currentStep === 5 && <BenefitsHealthSection />}
            {currentStep === 6 && <CaseManagementSection caseManagers={caseManagers} />}
          </div>

          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
            <div className="sticky top-24">
              <EligibilityPanel results={benefits} />
            </div>
          </aside>
        </div>

        {/* Navigation Buttons & Mobile Panel Toggle */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t py-4 -mx-4 px-4 sm:mx-0 sm:px-0 z-50">
          <div className="flex items-center gap-4 max-w-7xl mx-auto">
            {/* Mobile Benefit Toggle */}
            <div className="lg:hidden">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="relative group">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    {benefits.filter(r => r.isEligible).length > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-purple-600">
                        {benefits.filter(r => r.isEligible).length}
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[calc(100vw-2rem)] rounded-xl h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Recommended Benefits</DialogTitle>
                  </DialogHeader>
                  <EligibilityPanel results={benefits} />
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex flex-1 justify-between gap-4">
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
        </div>
      </form>
    </FormProvider>
  );
}
