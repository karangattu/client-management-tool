'use client';

import { Progress } from '@/components/ui/progress';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OnboardingStep {
  label: string;
  completed: boolean;
  description?: string;
}

interface OnboardingProgressProps {
  steps: OnboardingStep[];
  /** Compact mode for inline/card display */
  compact?: boolean;
  /** Show step labels */
  showLabels?: boolean;
  className?: string;
}

export function OnboardingProgress({
  steps,
  compact = false,
  showLabels = true,
  className,
}: OnboardingProgressProps) {
  const completedSteps = steps.filter(s => s.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Progress value={progressPercentage} className="h-1.5 flex-1 max-w-24 bg-gray-200" />
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {completedSteps}/{steps.length}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-sm font-medium mb-1">
        <span>{completedSteps} of {steps.length} completed</span>
        <span>{Math.round(progressPercentage)}%</span>
      </div>
      <Progress value={progressPercentage} className="h-2" />
      {showLabels && (
        <div className="flex justify-between mt-2">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex items-center gap-1.5 text-xs",
                step.completed ? 'text-green-600 font-medium' : 'text-gray-500'
              )}
            >
              {step.completed ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300" />
              )}
              {step.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Standard onboarding steps for clients
 */
export function getClientOnboardingSteps(client: {
  signed_engagement_letter_at?: string | null;
  intake_completed_at?: string | null;
  profile_completed_at?: string | null;
}): OnboardingStep[] {
  return [
    { label: 'Account Created', completed: true },
    { label: 'Engagement Letter', completed: !!client.signed_engagement_letter_at },
    { label: 'Intake Form', completed: !!client.intake_completed_at },
  ];
}

/**
 * Extended onboarding steps including profile completion
 */
export function getExtendedOnboardingSteps(client: {
  signed_engagement_letter_at?: string | null;
  intake_completed_at?: string | null;
  profile_completed_at?: string | null;
}): OnboardingStep[] {
  return [
    { label: 'Account', completed: true },
    { label: 'Engagement', completed: !!client.signed_engagement_letter_at },
    { label: 'Intake', completed: !!client.intake_completed_at },
    { label: 'Profile', completed: !!client.profile_completed_at },
  ];
}
