"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/forms/FormField";

export function SkillsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
            C
          </span>
          Skills Assessment
        </CardTitle>
        <CardDescription>
          Technical, language, and other transferable skills
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          name="skills.technicalSkills"
          label="Do you have any technical skills (computer, tools, software, equipment, etc.)?"
          type="textarea"
          placeholder="Describe your technical skills"
        />

        <FormField
          name="skills.languageSkills"
          label="Do you have any language skills (languages spoken and proficiency level)?"
          type="textarea"
          placeholder="e.g. Spanish (fluent), Mandarin (conversational)"
        />

        <FormField
          name="skills.otherSkills"
          label="What other skills do you feel confident in?"
          type="textarea"
          placeholder="Describe any additional skills"
        />
      </CardContent>
    </Card>
  );
}
