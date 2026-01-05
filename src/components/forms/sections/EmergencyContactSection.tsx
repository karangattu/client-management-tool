"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/FormField";
import { RELATIONSHIPS } from "@/lib/constants";
import { Plus, Trash2, Users } from "lucide-react";
import type { ClientIntakeForm } from "@/lib/schemas/validation";
import { defaultEmergencyContact } from "@/lib/schemas/validation";
import { useToast } from "@/components/ui/use-toast";

export function EmergencyContactSection() {
  const { control, watch, getValues } = useFormContext<ClientIntakeForm>();
  const { toast } = useToast();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "emergencyContacts",
  });

  const { fields: householdFields, append: appendHousehold } = useFieldArray({
    control,
    name: "household.members",
  });

  const addAsHouseholdMember = (index: number) => {
    const contact = getValues(`emergencyContacts.${index}`);

    if (!contact.name) {
      toast({
        title: "Missing information",
        description: "Please enter the contact's name first.",
        variant: "destructive",
      });
      return;
    }

    // Check if already added as household member
    const existingMembers = getValues("household.members") || [];
    const alreadyExists = existingMembers.some(
      (member) => member.name.toLowerCase() === contact.name.toLowerCase()
    );

    if (alreadyExists) {
      toast({
        title: "Already added",
        description: `${contact.name} is already a household member.`,
        variant: "default",
      });
      return;
    }

    // Add to household members
    appendHousehold({
      id: crypto.randomUUID(),
      name: contact.name,
      relationship: contact.relationship || "",
      dateOfBirth: "",
      gender: "",
      race: [],
    });

    toast({
      title: "Added to household",
      description: `${contact.name} has been added as a household member. You can edit their details in the Household step.`,
      variant: "success",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
            2
          </span>
          Emergency Contact Information
        </CardTitle>
        <CardDescription>
          Provide at least one emergency contact. You can add multiple contacts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="relative p-4 border rounded-lg bg-muted/30"
          >
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            <div className="space-y-4">
              <h4 className="font-medium">Emergency Contact {index + 1}</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name={`emergencyContacts.${index}.name`}
                  label="Full Name"
                  placeholder="Contact's full name"
                  required
                />
                <FormField
                  name={`emergencyContacts.${index}.relationship`}
                  label="Relationship"
                  type="select"
                  options={RELATIONSHIPS}
                  placeholder="Select relationship"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name={`emergencyContacts.${index}.phone`}
                  label="Phone Number"
                  type="tel"
                  placeholder="(555) 123-4567"
                  required
                />
                <FormField
                  name={`emergencyContacts.${index}.email`}
                  label="Email Address"
                  type="email"
                  placeholder="contact@example.com"
                />
              </div>

              {/* Add as Household Member Button */}
              <div className="pt-2 border-t mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addAsHouseholdMember(index)}
                  className="text-primary hover:text-primary"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Add as Household Member
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Add this contact to the household roster if they live with the client
                </p>
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => append(defaultEmergencyContact)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Emergency Contact
        </Button>
      </CardContent>
    </Card>
  );
}
