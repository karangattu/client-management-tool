"use client";

import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, CheckCircle2, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/forms/FormField";
import { useToast } from "@/components/ui/use-toast";
import { saveEmploymentFollowUp } from "@/app/actions/employment-support";
import {
  EMPLOYMENT_SCHEDULE_OPTIONS,
  JOB_SATISFACTION_OPTIONS,
  YES_NO_SOMETIMES_OPTIONS,
  YES_NOT_NOW_OPTIONS,
  defaultEmploymentFollowUp,
  employmentFollowUpSchema,
  type EmploymentFollowUpForm,
} from "@/lib/schemas/employment-follow-up";

interface EmploymentFollowUpIntakeFormProps {
  clientId: string;
  enrollmentId?: string;
  followUpId?: string;
  initialData?: EmploymentFollowUpForm;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function EmploymentFollowUpIntakeForm({
  clientId,
  enrollmentId,
  followUpId,
  initialData,
  onCancel,
  onSuccess,
}: EmploymentFollowUpIntakeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const methods = useForm<EmploymentFollowUpForm>({
    resolver: zodResolver(employmentFollowUpSchema),
    defaultValues: initialData || defaultEmploymentFollowUp,
    mode: "onBlur",
  });

  const { handleSubmit, watch } = methods;
  const hasTransportationChallenges = watch(
    "challenges.hasTransportationChallenges"
  );
  const hasCoworkerOrEmployerConflicts = watch(
    "challenges.hasCoworkerOrEmployerConflicts"
  );
  const hasUncoveredEmploymentCosts = watch(
    "challenges.hasUncoveredEmploymentCosts"
  );

  const onSubmit = async (data: EmploymentFollowUpForm) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const result = await saveEmploymentFollowUp({
        data,
        clientId,
        enrollmentId,
        followUpId,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to save follow-up");
      }

      toast({
        title: "Follow-up saved",
        description: "Employment follow-up responses have been recorded.",
        variant: "success",
      });
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Unable to save follow-up",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Current employment details and schedule
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              name="jobDetails.employer"
              label="Where are you currently working?"
            />
            <FormField name="jobDetails.jobTitle" label="What is your job title?" />
            <FormField
              name="jobDetails.startDate"
              label="What is the date you started working there?"
              type="date"
            />
            <FormField name="jobDetails.salary" label="What is your salary?" />
            <FormField
              name="jobDetails.schedule"
              label="Are you working full-time, part-time, or on a flexible schedule?"
              type="select"
              options={EMPLOYMENT_SCHEDULE_OPTIONS}
              placeholder="Select schedule"
              className="md:col-span-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job Satisfaction and Work Environment</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              name="satisfaction.jobSatisfaction"
              label="How satisfied are you with your current job?"
              type="select"
              options={JOB_SATISFACTION_OPTIONS}
              placeholder="Select satisfaction"
            />
            <FormField
              name="satisfaction.supervisorSupport"
              label="Do you feel supported by your supervisor or manager?"
              type="select"
              options={YES_NO_SOMETIMES_OPTIONS}
              placeholder="Select response"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Challenges and Barriers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              name="challenges.hasTransportationChallenges"
              label="Are you facing any challenges with transportation to your workplace?"
              type="checkbox"
            />
            {hasTransportationChallenges && (
              <FormField
                name="challenges.transportationExplanation"
                label="Please explain your transportation issues"
                type="textarea"
              />
            )}

            <FormField
              name="challenges.hasCoworkerOrEmployerConflicts"
              label="Are you facing any conflicts with coworkers and/or employers?"
              type="checkbox"
            />
            {hasCoworkerOrEmployerConflicts && (
              <FormField
                name="challenges.conflictExplanation"
                label="Please explain those conflicts"
                type="textarea"
              />
            )}

            <FormField
              name="challenges.hasUncoveredEmploymentCosts"
              label="Are you facing any employment-related costs that you cannot cover?"
              type="checkbox"
            />
            {hasUncoveredEmploymentCosts && (
              <FormField
                name="challenges.costExplanation"
                label="Please describe those costs"
                type="textarea"
              />
            )}

            <FormField
              name="challenges.neededSkillsOrTraining"
              label="Are there any skills or training that you think you need to perform better at your job?"
              type="textarea"
              placeholder="Digital skills, language resources, work-specific trainings, etc."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Stability</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              name="financialStability.canCoverBasicExpenses"
              label="Are you able to cover your basic living expenses with your current job?"
              type="select"
              options={YES_NO_SOMETIMES_OPTIONS}
              placeholder="Select response"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              name="nextSteps.wantsHousingAndSelfSufficiencyConnection"
              label="Can we connect you to our Housing Support Program and Self Sufficiency Program?"
              type="select"
              options={YES_NOT_NOW_OPTIONS}
              placeholder="Select response"
            />
            <FormField
              name="nextSteps.wantsCareerAdvancementSupport"
              label="Would you like additional support with career advancement, training, or education opportunities?"
              type="select"
              options={YES_NOT_NOW_OPTIONS}
              placeholder="Select response"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optional Open Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              name="feedback.additionalFeedback"
              label="Is there anything else you would like us to know about your work experience or the support you need?"
              type="textarea"
            />
          </CardContent>
        </Card>

        <div className="sticky bottom-0 z-20 flex justify-end gap-3 border-t bg-background/95 py-4 backdrop-blur">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : followUpId ? (
              <Save className="mr-2 h-4 w-4" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {followUpId ? "Update Follow-Up" : "Save Follow-Up"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
