'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { createClient } from '@/lib/supabase/client';
import { ParticipantDetailsSection } from '@/components/forms/sections/ParticipantDetailsSection';
import { EmergencyContactSection } from '@/components/forms/sections/EmergencyContactSection';
import { CaseManagementSection } from '@/components/forms/sections/CaseManagementSection';
import { DemographicsSection } from '@/components/forms/sections/DemographicsSection';
import { HouseholdSection } from '@/components/forms/sections/HouseholdSection';
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  FileText,
  Loader2,
  User,
  Users,
  Home,
  Phone,
  TrendingUp,
} from 'lucide-react';

export default function ProfileCompletionPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [clientData, setClientData] = useState<any>(null);
  const [existingData, setExistingData] = useState<any>({});
  const [formData, setFormData] = useState<any>({});

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchClientData();
    }
  }, [user, authLoading, router]);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Get client record linked to this user
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select(`
          *,
          emergency_contacts(*),
          case_management(*),
          demographics(*),
          household_members(*)
        `)
        .eq('portal_user_id', user?.id)
        .single();

      if (clientError && clientError.code !== 'PGRST116') {
        throw clientError;
      }

      if (client) {
        setClientData(client);
        
        // Populate existing data for pre-filling
        setExistingData({
          participantDetails: {
            firstName: client.first_name || '',
            lastName: client.last_name || '',
            middleName: client.middle_name || '',
            preferredName: client.preferred_name || '',
            dateOfBirth: client.date_of_birth || '',
            email: client.email || '',
            phone: client.phone || '',
            alternatePhone: client.alternate_phone || '',
            streetAddress: client.street_address || '',
            apartmentUnit: client.apartment_unit || '',
            city: client.city || '',
            state: client.state || '',
            zipCode: client.zip_code || '',
            mailingSameAsPhysical: client.mailing_same_as_physical || true,
            mailingStreetAddress: client.mailing_street_address || '',
            mailingCity: client.mailing_city || '',
            mailingState: client.mailing_state || '',
            mailingZipCode: client.mailing_zip_code || '',
          },
          emergencyContacts: client.emergency_contacts?.map((contact: any) => ({
            name: contact.name || '',
            relationship: contact.relationship || '',
            phone: contact.phone || '',
            alternatePhone: contact.alternate_phone || '',
            email: contact.email || '',
            isPrimary: contact.is_primary || false,
          })) || [],
          caseManagement: {
            housingStatus: client.case_management?.housing_status || '',
            primaryLanguage: client.case_management?.primary_language || 'English',
            secondaryLanguage: client.case_management?.secondary_language || '',
            needsInterpreter: client.case_management?.needs_interpreter || false,
            viSpdatScore: client.case_management?.vi_spdat_score || '',
            isVeteran: client.case_management?.is_veteran || false,
            isDisabled: client.case_management?.is_disabled || false,
            isDom: client.case_management?.is_domestic_violence_survivor || false,
            isHivAids: client.case_management?.is_hiv_aids || false,
            isChronicallyHomeless: client.case_management?.is_chronically_homeless || false,
            isSubstanceAbuse: client.case_management?.is_substance_abuse || false,
            isMentalHealth: client.case_management?.is_mental_health || false,
            receivesSnap: client.case_management?.receives_snap || false,
            receivesMedicaid: client.case_management?.receives_medicaid || false,
            receivesSsiSsdi: client.case_management?.receives_ssi_ssdi || false,
            receivesTanf: client.case_management?.receives_tanf || false,
            notes: client.case_management?.notes || '',
          },
          demographics: {
            gender: client.demographics?.gender || '',
            genderOther: client.demographics?.gender_other || '',
            ethnicity: client.demographics?.ethnicity || '',
            race: client.demographics?.race || [],
            maritalStatus: client.demographics?.marital_status || '',
            educationLevel: client.demographics?.education_level || '',
            employmentStatus: client.demographics?.employment_status || '',
            monthlyIncome: client.demographics?.monthly_income || '',
            incomeSource: client.demographics?.income_source || '',
          },
          household: client.household_members?.map((member: any) => ({
            firstName: member.first_name || '',
            lastName: member.last_name || '',
            relationship: member.relationship || '',
            dateOfBirth: member.date_of_birth || '',
            ssnLastFour: member.ssn_last_four || '',
            isDependent: member.is_dependent || false,
          })) || [],
        });

        // Set form data to existing data
        setFormData(existingData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const handleFormDataChange = (stepData: any) => {
    setFormData((prev: any) => ({
      ...prev,
      ...stepData,
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.participantDetails?.firstName && formData.participantDetails?.lastName;
      case 2:
        return formData.emergencyContacts?.length > 0;
      case 3:
        return true; // Case management - optional fields
      case 4:
        return true; // Demographics - optional fields
      case 5:
        return true; // Household - optional fields
      default:
        return true;
    }
  };

  const saveProgress = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      
      if (!clientData) return;

      // Update client record
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          first_name: formData.participantDetails?.firstName,
          last_name: formData.participantDetails?.lastName,
          middle_name: formData.participantDetails?.middleName,
          preferred_name: formData.participantDetails?.preferredName,
          date_of_birth: formData.participantDetails?.dateOfBirth,
          email: formData.participantDetails?.email,
          phone: formData.participantDetails?.phone,
          alternate_phone: formData.participantDetails?.alternatePhone,
          street_address: formData.participantDetails?.streetAddress,
          apartment_unit: formData.participantDetails?.apartmentUnit,
          city: formData.participantDetails?.city,
          state: formData.participantDetails?.state,
          zip_code: formData.participantDetails?.zipCode,
          mailing_same_as_physical: formData.participantDetails?.mailingSameAsPhysical,
          mailing_street_address: formData.participantDetails?.mailingStreetAddress,
          mailing_city: formData.participantDetails?.mailingCity,
          mailing_state: formData.participantDetails?.mailingState,
          mailing_zip_code: formData.participantDetails?.mailingZipCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientData.id);

      if (clientError) throw clientError;

      // Update or insert emergency contacts
      if (formData.emergencyContacts) {
        // Delete existing contacts
        await supabase.from('emergency_contacts').delete().eq('client_id', clientData.id);
        
        // Insert new contacts
        if (formData.emergencyContacts.length > 0) {
          const { error: contactsError } = await supabase
            .from('emergency_contacts')
            .insert(formData.emergencyContacts.map((contact: any, index: number) => ({
              client_id: clientData.id,
              name: contact.name,
              relationship: contact.relationship,
              phone: contact.phone,
              alternate_phone: contact.alternatePhone,
              email: contact.email,
              is_primary: index === 0, // First contact is primary
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })));

          if (contactsError) throw contactsError;
        }
      }

      // Update case management
      if (formData.caseManagement) {
        const { error: caseError } = await supabase
          .from('case_management')
          .upsert({
            client_id: clientData.id,
            housing_status: formData.caseManagement.housingStatus,
            primary_language: formData.caseManagement.primaryLanguage,
            secondary_language: formData.caseManagement.secondaryLanguage,
            needs_interpreter: formData.caseManagement.needsInterpreter,
            vi_spdat_score: formData.caseManagement.viSpdatScore,
            is_veteran: formData.caseManagement.isVeteran,
            is_disabled: formData.caseManagement.isDisabled,
            is_domestic_violence_survivor: formData.caseManagement.isDom,
            is_hiv_aids: formData.caseManagement.isHivAids,
            is_chronically_homeless: formData.caseManagement.isChronicallyHomeless,
            is_substance_abuse: formData.caseManagement.isSubstanceAbuse,
            is_mental_health: formData.caseManagement.isMentalHealth,
            receives_snap: formData.caseManagement.receivesSnap,
            receives_medicaid: formData.caseManagement.receivesMedicaid,
            receives_ssi_ssdi: formData.caseManagement.receivesSsiSsdi,
            receives_tanf: formData.caseManagement.receivesTanf,
            notes: formData.caseManagement.notes,
            updated_at: new Date().toISOString(),
          });

        if (caseError) throw caseError;
      }

      // Update demographics
      if (formData.demographics) {
        const { error: demoError } = await supabase
          .from('demographics')
          .upsert({
            client_id: clientData.id,
            gender: formData.demographics.gender,
            gender_other: formData.demographics.genderOther,
            ethnicity: formData.demographics.ethnicity,
            race: formData.demographics.race,
            marital_status: formData.demographics.maritalStatus,
            education_level: formData.demographics.educationLevel,
            employment_status: formData.demographics.employmentStatus,
            monthly_income: formData.demographics.monthlyIncome,
            income_source: formData.demographics.incomeSource,
            updated_at: new Date().toISOString(),
          });

        if (demoError) throw demoError;
      }

      // Update household members
      if (formData.household) {
        // Delete existing household members
        await supabase.from('household_members').delete().eq('client_id', clientData.id);
        
        // Insert new household members
        if (formData.household.length > 0) {
          const { error: householdError } = await supabase
            .from('household_members')
            .insert(formData.household.map((member: any) => ({
              client_id: clientData.id,
              first_name: member.firstName,
              last_name: member.lastName,
              relationship: member.relationship,
              date_of_birth: member.dateOfBirth,
              ssn_last_four: member.ssnLastFour,
              is_dependent: member.isDependent,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })));

          if (householdError) throw householdError;
        }
      }

      // Mark profile completion task as completed
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('client_id', clientData.id)
        .eq('title', 'Complete Profile Information')
        .eq('status', 'pending');

      if (tasks && tasks.length > 0) {
        await supabase
          .from('tasks')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            completed_by: user?.id,
          })
          .eq('id', tasks[0].id);
      }

    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      // Save progress before moving to next step
      try {
        await saveProgress();
        setCurrentStep(prev => prev + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save progress');
      }
    } else {
      // Final submission
      try {
        await saveProgress();
        setSuccess(true);
        
        // Redirect to dashboard after a delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save profile');
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Complete Your Profile" showBackButton={false} />
        <main className="container px-4 py-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading your profile...</span>
          </div>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Profile Complete" showBackButton={false} />
        <main className="container px-4 py-6 max-w-2xl mx-auto">
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              <div className="mb-6">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Profile Completed!</h2>
              <p className="text-gray-600 mb-6">
                Thank you for completing your profile information. A case manager will review your information and contact you soon.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Redirecting to dashboard in 3 seconds...
              </p>
              <Button onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1: return <User className="h-4 w-4" />;
      case 2: return <Phone className="h-4 w-4" />;
      case 3: return <FileText className="h-4 w-4" />;
      case 4: return <TrendingUp className="h-4 w-4" />;
      case 5: return <Users className="h-4 w-4" />;
      default: return <div className="h-4 w-4 rounded-full bg-current" />;
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return 'Personal Information';
      case 2: return 'Emergency Contact';
      case 3: return 'Case Information';
      case 4: return 'Demographics';
      case 5: return 'Household Members';
      default: return 'Step';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Complete Your Profile" showBackButton={false} />
      
      <main className="container px-4 py-6 max-w-4xl mx-auto">
        {/* Welcome Banner */}
        <div className="