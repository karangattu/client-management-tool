'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useAuth, canAccessFeature } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { uploadProfilePicture } from '@/lib/supabase/storage';
import { US_STATES } from '@/lib/constants';

interface ClientData {
  first_name: string;
  last_name: string;
  preferred_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;

  status: string;
  profile_picture_url?: string;
  assigned_case_manager?: string;
}

interface CaseManager {
  id: string;
  first_name: string;
  last_name: string;
}

export default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params);
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [clientData, setClientData] = useState<ClientData>({
    first_name: '',
    last_name: '',
    preferred_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    status: 'active',
  });

  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [caseManagers, setCaseManagers] = useState<CaseManager[]>([]);

  const supabase = createClient();

  useEffect(() => {
    const fetchClient = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();

        if (error) throw error;

        if (data) {
          setClientData({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            preferred_name: data.preferred_name || '',
            email: data.email || '',
            phone: data.phone || '',
            date_of_birth: data.date_of_birth || '',
            street_address: data.street_address || '',
            city: data.city || '',
            state: data.state || '',
            zip_code: data.zip_code || '',

            status: data.status || 'active',
            profile_picture_url: data.profile_picture_url,
          });
          if (data.profile_picture_url) {
            setProfilePicturePreview(data.profile_picture_url);
          }
          if (data.assigned_case_manager) {
            setClientData(prev => ({ ...prev, assigned_case_manager: data.assigned_case_manager }));
          }
        }
      } catch (err) {
        console.error('Error fetching client:', err);
        setError('Failed to load client data');
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
    fetchCaseManagers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const fetchCaseManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('role', ['staff', 'case_manager'])
        .order('first_name');

      if (error) throw error;
      setCaseManagers(data || []);
    } catch (err) {
      console.error('Error fetching case managers:', err);
    }
  };

  const handleChange = (field: keyof ClientData, value: string | boolean) => {
    setClientData(prev => ({ ...prev, [field]: value }));
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setProfilePictureFile(file);
      setProfilePicturePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientData.first_name || !clientData.last_name || !clientData.email || !clientData.phone) {
      setError('First name, last name, email, and phone are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let profilePictureUrl = clientData.profile_picture_url;

      // Upload profile picture if changed
      if (profilePictureFile) {
        setLoading(true); // Show general loading or keep saving state
        const { url, error: uploadError } = await uploadProfilePicture(profilePictureFile, clientId, 'client');

        if (uploadError) {
          throw new Error(`Failed to upload profile picture: ${uploadError}`);
        }

        if (url) {
          profilePictureUrl = url;
        }
      }

      const { error } = await supabase
        .from('clients')
        .update({
          first_name: clientData.first_name,
          last_name: clientData.last_name,
          preferred_name: clientData.preferred_name || null,
          email: clientData.email,
          phone: clientData.phone,
          date_of_birth: clientData.date_of_birth || null,
          street_address: clientData.street_address || null,
          city: clientData.city || null,
          state: clientData.state || null,
          zip_code: clientData.zip_code || null,
          status: clientData.status,
          profile_picture_url: profilePictureUrl,
          updated_at: new Date().toISOString(),
          assigned_case_manager: clientData.assigned_case_manager || null,
        })
        .eq('id', clientId);

      if (error) throw error;

      // Log the update
      await supabase.from('audit_log').insert({
        user_id: profile?.id,
        action: 'client_updated',
        table_name: 'clients',
        record_id: clientId,
        new_values: { updated_by: `${profile?.first_name} ${profile?.last_name}` },
      });

      setSuccess(true);
      setTimeout(() => {
        router.push(`/clients/${clientId}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  const canEdit = canAccessFeature(profile?.role || 'client', 'staff');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Loading..." showBackButton />
        <main className="container px-4 py-6 max-w-3xl mx-auto">
          <Skeleton className="h-96" />
        </main>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Access Denied" showBackButton />
        <main className="container px-4 py-6">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-500">You don&apos;t have permission to edit clients.</p>
              <Button className="mt-4" onClick={() => router.back()}>Go Back</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Edit Client" showBackButton />
        <main className="container px-4 py-6 max-w-3xl mx-auto">
          <Skeleton className="h-96" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Edit Client" showBackButton />

      <main className="container px-4 py-6 max-w-3xl mx-auto">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Client updated successfully! Redirecting...
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {/* Profile Picture */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Picture
              </CardTitle>
              <CardDescription>Upload a photo of the client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border">
                  {profilePicturePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profilePicturePreview}
                      alt="Profile preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="max-w-sm"
                    />
                    {profilePicturePreview && profilePicturePreview !== clientData.profile_picture_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setProfilePictureFile(null);
                          setProfilePicturePreview(clientData.profile_picture_url || null);
                        }}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    JPG, PNG or GIF. Max 5MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Basic client details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    value={clientData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    value={clientData.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    placeholder="Last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Name</Label>
                  <Input
                    value={clientData.preferred_name}
                    onChange={(e) => handleChange('preferred_name', e.target.value)}
                    placeholder="Nickname"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={clientData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    type="tel"
                    value={clientData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={clientData.date_of_birth}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Address</CardTitle>
              <CardDescription>Client&apos;s current address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Street Address</Label>
                <Input
                  value={clientData.street_address}
                  onChange={(e) => handleChange('street_address', e.target.value)}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={clientData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select
                    value={clientData.state}
                    onValueChange={(value) => handleChange('state', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ZIP Code</Label>
                  <Input
                    value={clientData.zip_code}
                    onChange={(e) => handleChange('zip_code', e.target.value)}
                    placeholder="12345"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status & Case Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Status & Case Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client Status</Label>
                  <Select
                    value={clientData.status}
                    onValueChange={(value) => handleChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assigned Case Manager</Label>
                <Select
                  value={clientData.assigned_case_manager || "unassigned"}
                  onValueChange={(value) => handleChange('assigned_case_manager', value === "unassigned" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a case manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {caseManagers.map((cm) => (
                      <SelectItem key={cm.id} value={cm.id}>
                        {cm.first_name} {cm.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* These fields are part of case management, not basic client info */}
              {/* Housing Status, VI-SPDAT, Veteran, and Chronically Homeless */}
              {/* should be managed in a separate case management section */}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div >
  );
}