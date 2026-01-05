"use client";

import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RELATIONSHIPS, GENDER_OPTIONS, RACE_OPTIONS } from "@/lib/constants";
import { Plus, Trash2, Edit2, Users } from "lucide-react";
import type { ClientIntakeForm, HouseholdMember } from "@/lib/schemas/validation";

export function HouseholdSection() {
  const { control } = useFormContext<ClientIntakeForm>();
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "household.members",
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentMember, setCurrentMember] = useState<Partial<HouseholdMember>>({
    name: "",
    relationship: "",
    dateOfBirth: "",
    gender: "",
    race: [],
  });

  const handleAddMember = () => {
    setEditingIndex(null);
    setCurrentMember({
      name: "",
      relationship: "",
      dateOfBirth: "",
      gender: "",
      race: [],
    });
    setDialogOpen(true);
  };

  const handleEditMember = (index: number) => {
    setEditingIndex(index);
    setCurrentMember({ ...fields[index] });
    setDialogOpen(true);
  };

  const handleSaveMember = () => {
    if (!currentMember.name || !currentMember.relationship) return;

    const memberData: HouseholdMember = {
      id: currentMember.id || crypto.randomUUID(),
      name: currentMember.name,
      relationship: currentMember.relationship,
      dateOfBirth: currentMember.dateOfBirth,
      gender: currentMember.gender,
      race: currentMember.race,
    };

    if (editingIndex !== null) {
      update(editingIndex, memberData);
    } else {
      append(memberData);
    }

    setDialogOpen(false);
    setCurrentMember({
      name: "",
      relationship: "",
      dateOfBirth: "",
      gender: "",
      race: [],
    });
  };

  const handleRaceChange = (value: string, checked: boolean) => {
    const currentRace = currentMember.race || [];
    if (checked) {
      setCurrentMember({ ...currentMember, race: [...currentRace, value] });
    } else {
      setCurrentMember({
        ...currentMember,
        race: currentRace.filter((r) => r !== value),
      });
    }
  };

  const getRelationshipLabel = (value: string) =>
    RELATIONSHIPS.find((r) => r.value === value)?.label || value;

  const getGenderLabel = (value: string) =>
    GENDER_OPTIONS.find((g) => g.value === value)?.label || value;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
            3
          </span>
          Household
        </CardTitle>
        <CardDescription>
          Track household composition and family members
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="font-medium text-lg mb-1">No household members</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Add family members or others living in the household
            </p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddMember}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Household Member
                </Button>
              </DialogTrigger>
              <MemberDialog
                currentMember={currentMember}
                setCurrentMember={setCurrentMember}
                handleSaveMember={handleSaveMember}
                handleRaceChange={handleRaceChange}
                editingIndex={editingIndex}
              />
            </Dialog>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-sm">
                      Name
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-sm">
                      Relationship
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-sm hidden md:table-cell">
                      DOB
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-sm hidden lg:table-cell">
                      Gender
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-sm">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr key={field.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <span className="font-medium">{field.name}</span>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline">
                          {getRelationshipLabel(field.relationship)}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 hidden md:table-cell">
                        {field.dateOfBirth || "—"}
                      </td>
                      <td className="py-3 px-2 hidden lg:table-cell">
                        {field.gender ? getGenderLabel(field.gender) : "—"}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditMember(index)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleAddMember}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Household Member
                </Button>
              </DialogTrigger>
              <MemberDialog
                currentMember={currentMember}
                setCurrentMember={setCurrentMember}
                handleSaveMember={handleSaveMember}
                handleRaceChange={handleRaceChange}
                editingIndex={editingIndex}
              />
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface MemberDialogProps {
  currentMember: Partial<HouseholdMember>;
  setCurrentMember: (member: Partial<HouseholdMember>) => void;
  handleSaveMember: () => void;
  handleRaceChange: (value: string, checked: boolean) => void;
  editingIndex: number | null;
}

function MemberDialog({
  currentMember,
  setCurrentMember,
  handleSaveMember,
  handleRaceChange,
  editingIndex,
}: MemberDialogProps) {
  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {editingIndex !== null ? "Edit" : "Add"} Household Member
        </DialogTitle>
        <DialogDescription>
          Enter the details for this household member
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="member-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="member-name"
            value={currentMember.name || ""}
            onChange={(e) =>
              setCurrentMember({ ...currentMember, name: e.target.value })
            }
            placeholder="Full name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-relationship">
            Relationship to Client <span className="text-destructive">*</span>
          </Label>
          <Select
            value={currentMember.relationship || ""}
            onValueChange={(value) =>
              setCurrentMember({ ...currentMember, relationship: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select relationship" />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIPS.map((rel) => (
                <SelectItem key={rel.value} value={rel.value}>
                  {rel.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="member-dob">Date of Birth</Label>
            <Input
              id="member-dob"
              type="date"
              value={currentMember.dateOfBirth || ""}
              onChange={(e) =>
                setCurrentMember({
                  ...currentMember,
                  dateOfBirth: e.target.value,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-gender">Gender</Label>
            <Select
              value={currentMember.gender || ""}
              onValueChange={(value) =>
                setCurrentMember({ ...currentMember, gender: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((gender) => (
                  <SelectItem key={gender.value} value={gender.value}>
                    {gender.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Race/Ethnicity (Select all that apply)</Label>
          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
            {RACE_OPTIONS.map((race) => (
              <div key={race.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`race-${race.value}`}
                  checked={(currentMember.race || []).includes(race.value)}
                  onCheckedChange={(checked) =>
                    handleRaceChange(race.value, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`race-${race.value}`}
                  className="text-sm cursor-pointer"
                >
                  {race.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          onClick={handleSaveMember}
          disabled={!currentMember.name || !currentMember.relationship}
        >
          {editingIndex !== null ? "Update" : "Add"} Member
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
