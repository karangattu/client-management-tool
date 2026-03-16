"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  BasicInfoSection,
  EducationSection,
  SkillsSection,
  WorkHistorySection,
  JobPreferencesSection,
  ResumeSection,
  JobSearchSection,
  BarriersSection,
  CommitmentSection,
  InternalUseSection,
} from "@/components/forms/employment-support";
import { useAuth } from "@/lib/auth-context";
import {
  employmentSupportIntakeSchema,
  defaultEmploymentSupportIntake,
  type EmploymentSupportIntakeForm as ESIFormType,
} from "@/lib/schemas/employment-support";
import { saveEmploymentSupportIntake } from "@/app/actions/employment-support";
import { getAllUsers } from "@/app/actions/users";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  User,
  GraduationCap,
  Wrench,
  Briefcase,
  Target,
  FileText,
  Search,
  ShieldAlert,
  Handshake,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPacificLocaleDate, formatPacificLocaleTime } from "@/lib/date-utils";

const FORM_STEPS = [
  { id: "basic", title: "Contact Info", icon: User },
  { id: "education", title: "Education", icon: GraduationCap },
  { id: "skills", title: "Skills", icon: Wrench },
  { id: "work", title: "Work History", icon: Briefcase },
  { id: "preferences", title: "Job Preferences", icon: Target },
  { id: "resume", title: "Resume", icon: FileText },
  { id: "search", title: "Job Search", icon: Search },
  { id: "barriers", title: "Barriers", icon: ShieldAlert },
  { id: "commitment", title: "Commitment", icon: Handshake },
  { id: "internal", title: "Internal Use", icon: ClipboardCheck },
];

const DRAFT_KEY = "employment-support-intake-draft";

interface EmploymentSupportIntakeFormProps {
  initialData?: ESIFormType;
  clientId: string;
  enrollmentId?: string;
  intakeId?: string;
  existingStatus?: string;
  submittedInfo?: { by: string; at: string } | null;
  onSuccess?: () => void;
}

export function EmploymentSupportIntakeForm({
  initialData,
  clientId,
  enrollmentId,
  intakeId,
  existingStatus,
  submittedInfo,
  onSuccess,
}: EmploymentSupportIntakeFormProps) {
  const { profile } = useAuth();
  const isStaff = profile?.role !== "client";
  const hasSubmittedRef = useRef(false);
  const currentIntakeIdRef = useRef<string | undefined>(intakeId);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraftToDb, setIsSavingDraftToDb] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [staffOptions, setStaffOptions] = useState<{ value: string; label: string }[]>([]);
  const { toast } = useToast();

  const methods = useForm<ESIFormType>({
    resolver: zodResolver(employmentSupportIntakeSchema),
    defaultValues: initialData || defaultEmploymentSupportIntake,
    mode: "onBlur",
  });

  const {
    handleSubmit,
    watch,
    formState: { errors, dirtyFields },
    reset,
    trigger,
  } = methods;

  // Load draft from localStorage (only for new forms without existing data)
  useEffect(() => {
    if (!initialData && typeof window !== "undefined") {
      const draftKey = `${DRAFT_KEY}-${clientId}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (!hasSubmittedRef.current) {
            reset(parsed.data);
            setLastSaved(new Date(parsed.savedAt));
            setDraftRestored(true);
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
  }, [initialData, reset, toast, clientId]);

  // Fetch staff/volunteers for Internal Use section
  useEffect(() => {
    if (!isStaff) return;
    const fetchStaff = async () => {
      try {
        const result = await getAllUsers();
        if (result.success && result.data) {
          interface ProfileRecord {
            id: string;
            first_name: string;
            last_name: string;
            role: string;
          }
          const staff = (result.data as ProfileRecord[])
            .filter((u) => ["admin", "case_manager", "staff", "volunteer"].includes(u.role))
            .map((u) => ({
              value: u.id,
              label: `${u.first_name} ${u.last_name}`,
            }));
          setStaffOptions(staff);
        }
      } catch (err) {
        console.error("Error fetching staff:", err);
      }
    };
    fetchStaff();
  }, [isStaff]);

  // Auto-save draft
  const formData = watch();
  const saveDraft = useCallback(() => {
    if (isSubmitting || hasSubmittedRef.current) return;
    if (typeof window !== "undefined" && Object.keys(dirtyFields).length > 0) {
      const draftKey = `${DRAFT_KEY}-${clientId}`;
      localStorage.setItem(
        draftKey,
        JSON.stringify({ data: formData, savedAt: new Date().toISOString() })
      );
      setLastSaved(new Date());
    }
  }, [formData, dirtyFields, isSubmitting, clientId]);

  useEffect(() => {
    const timer = setInterval(saveDraft, 10000);
    return () => clearInterval(timer);
  }, [saveDraft]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveDraft();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [saveDraft]);

  // Visible steps based on role
  const visibleSteps = useMemo(
    () => FORM_STEPS.filter((step) => (isStaff ? true : step.id !== "internal")),
    [isStaff]
  );

  const getFieldsForStep = (step: number): string[] => {
    const stepId = visibleSteps[step]?.id;
    switch (stepId) {
      case "basic": return ["basicInfo"];
      case "education": return ["education"];
      case "skills": return ["skills"];
      case "work": return ["workExperience"];
      case "preferences": return ["jobPreferences"];
      case "resume": return ["resume"];
      case "search": return ["jobSearch"];
      case "barriers": return ["barriers"];
      case "commitment": return ["commitment"];
      case "internal": return ["internalUse"];
      default: return [];
    }
  };

  const validateCurrentStep = async () => {
    const fields = getFieldsForStep(currentStep);
    if (fields.length === 0) return true;
    try {
      return await trigger(fields as (keyof ESIFormType)[]);
    } catch {
      return false;
    }
  };

  const handleNext = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentStep >= visibleSteps.length - 1) return;
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
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (stepIndex === currentStep + 1) {
      const isValid = await validateCurrentStep();
      if (isValid) {
        setCurrentStep(stepIndex);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast({
          title: "Please complete this step",
          description: "Fix any errors before proceeding.",
          variant: "destructive",
        });
      }
    }
  };

  const onSubmit = async (data: ESIFormType) => {
    if (isSubmitting || hasSubmittedRef.current) return;
    setIsSubmitting(true);
    saveDraft();

    // Strip internal-use fields for client submissions
    const submitData = isStaff ? data : { ...data, internalUse: defaultEmploymentSupportIntake.internalUse };

    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await saveEmploymentSupportIntake({
          data: submitData,
          clientId,
          enrollmentId,
          intakeId: currentIntakeIdRef.current,
        });

        if (result.success) {
          hasSubmittedRef.current = true;
          if (typeof window !== "undefined") {
            localStorage.removeItem(`${DRAFT_KEY}-${clientId}`);
          }

          toast({
            title: "Success!",
            description: intakeId
              ? "Employment Support Intake has been updated."
              : "Employment Support Intake has been submitted.",
            variant: "success",
          });

          if (onSuccess) {
            setTimeout(onSuccess, 500);
          }
          return;
        } else {
          throw new Error(result.error || "Failed to save");
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");
        console.error(`Attempt ${attempt} failed:`, lastError.message);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    setIsSubmitting(false);
    toast({
      title: "Error",
      description: lastError
        ? `${lastError.message}. Your progress has been saved as a draft.`
        : "Something went wrong. Please try again.",
      variant: "destructive",
    });
  };

  const saveDraftToDb = async () => {
    if (isSavingDraftToDb || isSubmitting || hasSubmittedRef.current) return;
    saveDraft();
    setIsSavingDraftToDb(true);
    try {
      const formData = methods.getValues();
      const submitData = isStaff
        ? formData
        : { ...formData, internalUse: defaultEmploymentSupportIntake.internalUse };
      const result = await saveEmploymentSupportIntake({
        data: submitData,
        clientId,
        enrollmentId,
        intakeId: currentIntakeIdRef.current,
        asDraft: true,
      });
      if (result.success) {
        if (result.intakeId) currentIntakeIdRef.current = result.intakeId;
        toast({ title: "Draft saved", description: "Your progress has been saved." });
      } else {
        toast({ title: "Could not save draft", description: result.error || "Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not save draft", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSavingDraftToDb(false);
    }
  };

  const hasStepErrors = (stepIndex: number) => {
    const fields = getFieldsForStep(stepIndex);
    return fields.some((field) => {
      const fieldErrors = errors[field as keyof typeof errors];
      return fieldErrors && Object.keys(fieldErrors).length > 0;
    });
  };

  const progress = ((currentStep + 1) / visibleSteps.length) * 100;
  const atFinalStep = currentStep >= visibleSteps.length - 1;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !atFinalStep) e.preventDefault();
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="space-y-6">
        {/* Progress Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Employment Support Intake</h1>
              <p className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {visibleSteps.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {existingStatus && (
                <Badge
                  variant={existingStatus === "submitted" ? "default" : existingStatus === "reviewed" ? "secondary" : "outline"}
                >
                  {existingStatus.charAt(0).toUpperCase() + existingStatus.slice(1)}
                </Badge>
              )}
              {lastSaved && (
                <span className="text-xs text-muted-foreground hidden sm:block">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <Button type="button" variant="outline" size="sm" onClick={saveDraftToDb} disabled={isSavingDraftToDb}>
                {isSavingDraftToDb ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                <span className="hidden sm:inline">Save Draft</span>
              </Button>
            </div>
          </div>

          <Progress value={progress} className="h-2 mb-4" />

          {/* Submission Banner */}
          {submittedInfo && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">
                Submitted by {submittedInfo.by} on {submittedInfo.at}
              </span>
            </div>
          )}

          {/* Draft Restored Banner */}
          {draftRestored && lastSaved && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-800">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Continuing from draft saved {formatPacificLocaleDate(lastSaved)} at{" "}
                  {formatPacificLocaleTime(lastSaved)}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                onClick={() => {
                  localStorage.removeItem(`${DRAFT_KEY}-${clientId}`);
                  reset(defaultEmploymentSupportIntake);
                  setDraftRestored(false);
                  setLastSaved(null);
                  setCurrentStep(0);
                  toast({ title: "Draft cleared", description: "Starting fresh." });
                }}
              >
                Start Fresh
              </Button>
            </div>
          )}

          {/* Step Indicators */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            {visibleSteps.map((step, index) => {
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
                    !isActive && isCompleted && "bg-primary/5 text-primary hover:bg-primary/10",
                    !isActive && !isCompleted && "bg-muted/50 text-muted-foreground hover:bg-muted",
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
        <div className="min-h-[400px]">
          {visibleSteps[currentStep]?.id === "basic" && <BasicInfoSection />}
          {visibleSteps[currentStep]?.id === "education" && <EducationSection />}
          {visibleSteps[currentStep]?.id === "skills" && <SkillsSection />}
          {visibleSteps[currentStep]?.id === "work" && <WorkHistorySection />}
          {visibleSteps[currentStep]?.id === "preferences" && <JobPreferencesSection />}
          {visibleSteps[currentStep]?.id === "resume" && <ResumeSection />}
          {visibleSteps[currentStep]?.id === "search" && <JobSearchSection />}
          {visibleSteps[currentStep]?.id === "barriers" && <BarriersSection />}
          {visibleSteps[currentStep]?.id === "commitment" && <CommitmentSection />}
          {visibleSteps[currentStep]?.id === "internal" && <InternalUseSection staffOptions={staffOptions} />}
        </div>

        {/* Navigation */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t py-4 -mx-4 px-4 sm:mx-0 sm:px-0 z-50">
          <div className="flex justify-between gap-4 max-w-7xl mx-auto">
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

            {!atFinalStep ? (
              <Button type="button" onClick={handleNext} className="flex-1 sm:flex-none">
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {intakeId ? "Update" : "Submit"}
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
