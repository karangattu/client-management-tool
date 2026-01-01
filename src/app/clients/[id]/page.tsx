'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  CheckSquare,
  Home,
  Edit,
  Upload,
  Plus,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Printer,
  TrendingUp,
} from 'lucide-react';
import { useAuth, canAccessFeature } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { getAllUsers } from '@/app/actions/users';
import { getClientHistory, InteractionType } from '@/app/actions/history';
import { ClientHistory } from '@/components/clients/ClientHistory';
import { LogInteractionDialog } from '@/components/clients/LogInteractionDialog';
import { PrintableCaseHistory } from '@/components/clients/PrintableCaseHistory';
import { SignEngagementLetterDialog } from '@/components/clients/SignEngagementLetterDialog';
import { updateTaskStatus } from '@/app/actions/tasks';
import { getPrograms, getClientEnrollments, upsertEnrollment, removeEnrollment, updateEnrollmentStatus, getEnrollmentActivity, Enrollment, Program } from '@/app/actions/programs';

interface ClientDetail {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  email: string;
  phone: string;
  status: string;
  profile_picture_url?: string;
  date_of_birth?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  housing_status?: string;
  vi_spdat_score?: number;
  is_veteran?: boolean;
  is_chronically_homeless?: boolean;
  created_at: string;
  signed_engagement_letter_at?: string | null;
}

interface Task {
  id: string;
  title: string;
  due_date: string;
  status: string;
  priority: string;
}

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  document_type: string;
  created_at: string;
  is_verified: boolean;
}

interface Activity {
  id: string;
  action: string;
  created_at: string;
  user_name?: string;
}

interface Interaction {
  id: string;
  action_type: InteractionType;
  title: string;
  description?: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  archived: 'bg-red-100 text-red-800',
};

const taskStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200">Urgent</Badge>;
    case 'high':
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200">High</Badge>;
    case 'medium':
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200">Medium</Badge>;
    case 'low':
      return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200">Low</Badge>;
    default:
      return <Badge variant="secondary">{priority}</Badge>;
  }
};

const getPriorityDotColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-600';
    case 'high': return 'bg-orange-500';
    case 'medium': return 'bg-amber-500';
    case 'low': return 'bg-slate-400';
    default: return 'bg-gray-400';
  }
};

// Component to display enrollment activity log
function EnrollmentActivityLog({ enrollmentId }: { enrollmentId: string }) {
  const [activity, setActivity] = useState<Array<{
    id: string;
    old_status: string | null;
    new_status: string;
    changed_at: string;
    notes: string | null;
    changed_by_profile: { first_name: string; last_name: string } | null;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);
      const result = await getEnrollmentActivity(enrollmentId);
      if (result.success) {
        setActivity(result.data || []);
      }
      setLoading(false);
    };
    fetchActivity();
  }, [enrollmentId]);

  if (loading) {
    return <p className="text-sm text-gray-500 py-2">Loading activity...</p>;
  }

  if (activity.length === 0) {
    return <p className="text-sm text-gray-500 py-2">No activity recorded yet.</p>;
  }

  return (
    <div className="mt-3 space-y-2">
      {activity.map((entry) => (
        <div key={entry.id} className="text-xs text-gray-600 flex items-start gap-2 py-1 border-b border-gray-100 last:border-0">
          <span className="text-gray-400 whitespace-nowrap">
            {new Date(entry.changed_at).toLocaleString()}
          </span>
          <span>
            {entry.old_status ? (
              <>
                <span className="capitalize">{entry.old_status}</span>
                <span className="mx-1">→</span>
                <span className="capitalize font-medium">{entry.new_status}</span>
              </>
            ) : (
              <span className="capitalize font-medium">{entry.new_status}</span>
            )}
          </span>
          {entry.changed_by_profile && (
            <span className="text-gray-400">
              by {entry.changed_by_profile.first_name} {entry.changed_by_profile.last_name}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params);
  const { profile } = useAuth();
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [assignedCaseManager, setAssignedCaseManager] = useState<string>('');
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newTaskData, setNewTaskData] = useState({ title: '', description: '', due_date: '', priority: 'medium' });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocumentType, setUploadDocumentType] = useState<string>('id');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [availableCaseManagers, setAvailableCaseManagers] = useState<{ id: string; name: string }[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assigningLoading, setAssigningLoading] = useState(false);
  const [taskUpdating, setTaskUpdating] = useState<string | null>(null);
  const [availablePrograms, setAvailablePrograms] = useState<Program[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [showProgramDialog, setShowProgramDialog] = useState(false);
  const [programLoading, setProgramLoading] = useState(false);
  const [newEnrollment, setNewEnrollment] = useState({
    programId: '',
    status: 'interested',
    startDate: '',
    endDate: '',
    volunteerId: '',
    notes: ''
  });
  const [volunteers, setVolunteers] = useState<{ id: string; name: string }[]>([]);

  const supabase = createClient();

  useEffect(() => {
    const fetchClientData = async () => {
      setLoading(true);
      try {
        const [
          { data: clientData, error: clientError },
          { data: tasksData },
          { data: docsData },
          activityDataResult,
          historyData,
          enrollmentsData,
          programsData
        ] = await Promise.all([
          supabase.from('clients').select('*').eq('id', clientId).single(),
          supabase.from('tasks').select('id, title, due_date, status, priority').eq('client_id', clientId).order('due_date', { ascending: true }).limit(10),
          supabase.from('documents').select('id, file_name, file_path, document_type, created_at, is_verified').eq('client_id', clientId).order('created_at', { ascending: false }).limit(10),
          profile?.role === 'admin'
            ? supabase.from('audit_log').select('id, action, created_at').eq('table_name', 'clients').eq('record_id', clientId).order('created_at', { ascending: false }).limit(10)
            : Promise.resolve({ data: [] }),
          getClientHistory(clientId),
          getClientEnrollments(clientId),
          getPrograms()
        ]);

        if (clientError) throw clientError;
        setClient(clientData);
        setTasks(tasksData || []);
        setDocuments(docsData || []);
        setEnrollments((enrollmentsData?.success ? enrollmentsData.data : []) as Enrollment[]);
        setAvailablePrograms((programsData?.success ? programsData.data : []) as Program[]);
        setInteractions((historyData?.success ? historyData.data : []) as Interaction[]);

        const activityData = (activityDataResult as any)?.data || [];
        setActivities(activityData.map((a: any) => ({
          id: a.id,
          action: formatAuditAction(a.action),
          created_at: a.created_at,
          user_name: 'System',
        })) || []);

        // Fetch case manager name if assigned
        if (clientData?.assigned_case_manager) {
          const { data: cmData } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', clientData.assigned_case_manager)
            .single();

          if (cmData) {
            setAssignedCaseManager(`${cmData.first_name} ${cmData.last_name}`);
          }
        }
      } catch (err) {
        console.error('Error fetching client:', err);
      } finally {
        setLoading(false);
      }
    };

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
          const allStaff = (result.data as ProfileRecord[])
            .filter((u) => u.role !== 'client')
            .map((u) => ({ id: u.id, name: `${u.first_name} ${u.last_name}` }));

          setAvailableCaseManagers(allStaff.filter(s => {
            const user = (result.data as ProfileRecord[]).find(u => u.id === s.id);
            return user?.role === 'case_manager' || user?.role === 'staff' || user?.role === 'admin';
          }));
          setVolunteers(allStaff);
        }
      } catch (err) {
        console.error('Error fetching managers:', err);
      }
    };

    fetchClientData();
    fetchManagers();
  }, [clientId, supabase]);

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    setTaskUpdating(taskId);

    // Optimistically update UI
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus } : t
    ));

    try {
      const result = await updateTaskStatus(taskId, newStatus as any, clientId);
      if (!result.success) {
        // Revert on error
        setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: currentStatus } : t
        ));
        alert('Failed to update task status');
      }
    } catch (err) {
      console.error('Error toggling task:', err);
      // Revert on error
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: currentStatus } : t
      ));
    } finally {
      setTaskUpdating(null);
    }
  };

  const handleUpsertEnrollment = async () => {
    if (!newEnrollment.programId) {
      alert('Please select a program');
      return;
    }
    setProgramLoading(true);
    try {
      const result = await upsertEnrollment({
        clientId,
        programId: newEnrollment.programId,
        status: newEnrollment.status,
        startDate: newEnrollment.startDate,
        endDate: newEnrollment.endDate,
        volunteerId: newEnrollment.volunteerId || null,
        notes: newEnrollment.notes
      });

      if (result.success) {
        // Refresh enrollments
        const enrollResult = await getClientEnrollments(clientId);
        if (enrollResult.success) {
          setEnrollments(enrollResult.data as Enrollment[]);
        }
        setShowProgramDialog(false);
        setNewEnrollment({
          programId: '',
          status: 'interested',
          startDate: '',
          endDate: '',
          volunteerId: '',
          notes: ''
        });
      } else {
        alert(result.error || 'Failed to save enrollment');
      }
    } catch (error) {
      console.error('Error saving enrollment:', error);
      alert('An unexpected error occurred');
    } finally {
      setProgramLoading(false);
    }
  };

  const handleRemoveEnrollment = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to remove this enrollment?')) return;

    try {
      const result = await removeEnrollment(enrollmentId, clientId);
      if (result.success) {
        setEnrollments(prev => prev.filter(e => e.id !== enrollmentId));
      } else {
        alert(result.error || 'Failed to remove enrollment');
      }
    } catch (error) {
      console.error('Error removing enrollment:', error);
      alert('An unexpected error occurred');
    }
  };

  const refreshHistory = async () => {
    const result = await getClientHistory(clientId);
    if (result.success) {
      setInteractions(result.data as Interaction[]);
    }
  };

  const refreshDocuments = async () => {
    const { data: docsData } = await supabase
      .from('documents')
      .select('id, file_name, document_type, created_at, is_verified, file_path')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (docsData) {
      setDocuments(docsData as Document[]);
    }
  };

  const handleViewDocument = async (doc: Document) => {
    try {
      if (!doc.file_path) {
        alert('Document file path not available.');
        return;
      }
      const { data, error } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(doc.file_path, 3600);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error('Error viewing document:', err);
      alert('Failed to open document. Please try again.');
    }
  };

  const handleAssignManager = async (managerId: string) => {
    if (!managerId) return;
    setAssigningLoading(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ assigned_case_manager: managerId })
        .eq('id', clientId);

      if (error) throw error;

      // Update local state
      const manager = availableCaseManagers.find(m => m.id === managerId);
      if (manager) {
        setAssignedCaseManager(manager.name);
      }

      // Log the assignment
      await supabase.from('audit_log').insert({
        user_id: profile?.id,
        action: 'case_manager_assigned',
        table_name: 'client',
        record_id: clientId,
        new_values: { manager_id: managerId, manager_name: manager?.name },
      });

      setShowAssignDialog(false);
      alert('Case manager assigned successfully');
    } catch (err) {
      console.error('Error assigning manager:', err);
      alert('Failed to assign case manager');
    } finally {
      setAssigningLoading(false);
    }
  };

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskData.title || !newTaskData.due_date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase.from('tasks').insert({
        title: newTaskData.title,
        description: newTaskData.description || null,
        client_id: clientId,
        due_date: newTaskData.due_date,
        priority: newTaskData.priority,
        status: 'pending',
        assigned_to: profile?.id,
        assigned_by: profile?.id,
      });

      if (error) throw error;

      // Reset form and close dialog
      setNewTaskData({ title: '', description: '', due_date: '', priority: 'medium' });
      setShowTaskDialog(false);

      // Refresh tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, due_date, status, priority')
        .eq('client_id', clientId)
        .order('due_date', { ascending: true });

      setTasks(tasksData || []);
    } catch (err) {
      console.error('Error creating task:', err);
      alert('Failed to create task');
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadFile) {
      alert('Please select a file');
      return;
    }

    setUploading(true);
    try {
      // Import the upload function
      const { uploadClientDocument } = await import('@/lib/supabase/storage');

      console.log('Starting upload:', { fileName: uploadFile.name, size: uploadFile.size, type: uploadDocumentType });

      // Upload file to Supabase Storage and get document record
      const { document: documentRecord, error: uploadError } = await uploadClientDocument(
        uploadFile,
        clientId,
        uploadDocumentType as 'id' | 'income' | 'housing' | 'medical' | 'legal' | 'consent' | 'engagement_letter' | 'other',
        uploadDescription || undefined
      );

      console.log('Upload result:', { documentRecord, uploadError });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert(`Upload failed: ${uploadError}`);
        setUploading(false);
        return;
      }

      if (!documentRecord) {
        console.error('No document record returned');
        alert('Upload failed');
        setUploading(false);
        return;
      }

      console.log('Saving document metadata to database...');

      // Save document metadata to database
      const { error: dbError } = await supabase.from('documents').insert({
        client_id: clientId,
        file_name: documentRecord.file_name,
        document_type: uploadDocumentType,
        file_path: documentRecord.file_path,
        file_size: documentRecord.file_size,
        mime_type: documentRecord.mime_type,
        description: uploadDescription || null,
        uploaded_by: profile?.id,
        is_verified: false,
      });

      console.log('Database insert result:', { dbError });

      if (dbError) {
        console.error('Error saving document metadata:', dbError);
        alert('File uploaded but failed to save record. Error: ' + dbError.message);
        setUploading(false);
        return;
      }

      console.log('Refreshing documents list...');

      // Refresh documents list
      const { data: docsData } = await supabase
        .from('documents')
        .select('id, file_name, file_path, document_type, created_at, is_verified')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10);

      setDocuments(docsData || []);

      // Reset form and close dialog
      setUploadFile(null);
      setUploadDocumentType('id');
      setUploadDescription('');
      setShowUploadDialog(false);
      setUploading(false);
      console.log('Upload complete!');
      alert('Document uploaded successfully!');
    } catch (err) {
      console.error('Error uploading document:', err);
      alert('An error occurred while uploading: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setUploading(false);
    }
  };

  const canEdit = canAccessFeature(profile?.role || 'client', 'staff');

  const formatAuditAction = (action: string): string => {
    const actionMap: Record<string, string> = {
      INSERT: 'Created client record',
      UPDATE: 'Updated client information',
      DELETE: 'Deleted client record',
    };
    return actionMap[action] || action;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Loading..." showBackButton />
        <main className="container px-4 py-6 max-w-7xl mx-auto">
          <Skeleton className="h-48 mb-6" />
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
          <Skeleton className="h-96" />
        </main>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Client Not Found" showBackButton />
        <main className="container px-4 py-6 max-w-7xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Client Not Found</h2>
              <p className="text-gray-500 mb-4">The client you&apos;re looking for doesn&apos;t exist or has been archived.</p>
              <Button onClick={() => router.push('/clients')}>Back to Clients</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        <AppHeader title={`${client.first_name} ${client.last_name}`} showBackButton />

        <main className="container px-4 py-6 max-w-7xl mx-auto">
          {/* Client Header Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Profile Picture */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                    {client.profile_picture_url ? (
                      <Image
                        src={client.profile_picture_url}
                        alt={client.first_name}
                        width={96}
                        height={96}
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-blue-600" />
                    )}
                  </div>
                </div>

                {/* Client Info */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        {client.first_name} {client.last_name}
                        {client.preferred_name && (
                          <span className="text-gray-500 font-normal text-lg ml-2">
                            &quot;{client.preferred_name}&quot;
                          </span>
                        )}
                      </h1>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge className={statusColors[client.status] || 'bg-gray-100 text-gray-800'}>
                          {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                        </Badge>

                        <SignEngagementLetterDialog
                          clientId={client.id}
                          clientName={`${client.first_name} ${client.last_name}`}
                          isSigned={!!client.signed_engagement_letter_at}
                          signedAt={client.signed_engagement_letter_at}
                          onSuccess={() => {
                            refreshDocuments();
                            // Also refresh client data for the badge
                            supabase.from('clients').select('signed_engagement_letter_at').eq('id', clientId).single().then(({ data }) => {
                              if (data) setClient(prev => prev ? { ...prev, signed_engagement_letter_at: data.signed_engagement_letter_at } : null);
                            });
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {!client.signed_engagement_letter_at && (
                          <Badge variant="destructive" className="animate-pulse">
                            Pending Signature
                          </Badge>
                        )}
                        {client.is_veteran && (
                          <Badge variant="outline" className="border-blue-500 text-blue-700">
                            Veteran
                          </Badge>
                        )}
                        {client.vi_spdat_score && (
                          <Badge variant="outline">
                            VI-SPDAT: {client.vi_spdat_score}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => router.push(`/clients/${client.id}/edit`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Quick Edit
                        </Button>
                        <Button onClick={() => router.push(`/clients/${client.id}/edit-intake`)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Edit Full Intake
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Contact Info with Copy Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => copyToClipboard(client.phone, 'phone')}
                          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          <span className="text-sm">{client.phone}</span>
                          {copiedField === 'phone' ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 opacity-50" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {copiedField === 'phone' ? 'Copied!' : 'Click to copy phone'}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => copyToClipboard(client.email, 'email')}
                          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                        >
                          <Mail className="h-4 w-4" />
                          <span className="text-sm truncate">{client.email}</span>
                          {copiedField === 'email' ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 opacity-50" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {copiedField === 'email' ? 'Copied!' : 'Click to copy email'}
                      </TooltipContent>
                    </Tooltip>

                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">{client.city || 'No city'}, {client.state || 'N/A'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="h-4 w-4" />
                      <span className="text-sm">CM: {assignedCaseManager || 'Unassigned'}</span>
                      {!assignedCaseManager && canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => setShowAssignDialog(true)}
                        >
                          Assign
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <CheckSquare className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendingTasks}</p>
                    <p className="text-xs text-gray-500">Pending Tasks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{documents.length}</p>
                    <p className="text-xs text-gray-500">Documents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">
                      {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-gray-500">Client Since</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{client.status || 'Active'}</p>
                    <p className="text-xs text-gray-500">Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="intake">Intake</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="programs">Programs</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Tasks To Do */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Tasks To Do</CardTitle>
                      {canEdit && (
                        <Button variant="outline" size="sm" onClick={() => setShowTaskDialog(true)}>
                          <Plus className="h-4 w-4 mr-1" /> Add Task
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {tasks.length > 0 ? (
                      <div className="space-y-3">
                        {tasks.slice(0, 5).map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${getPriorityDotColor(task.priority)}`} />
                              <div>
                                <p className="font-medium text-sm">{task.title}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge className={taskStatusColors[task.status] || 'bg-gray-100 text-gray-800'}>
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No tasks yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Activity (Admin Only) */}
                {profile?.role === 'admin' && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activities.length > 0 ? (
                        <div className="space-y-3">
                          {activities.slice(0, 5).map((item) => (
                            <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm capitalize">{item.action}</p>
                                <p className="text-xs text-gray-500">
                                  {item.user_name} • {new Date(item.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No activity recorded</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Intake Tab */}
            <TabsContent value="intake" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Intake Information</CardTitle>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => router.push(`/clients/${client.id}/edit`)}>
                          <Edit className="h-4 w-4 mr-2" /> Quick Edit
                        </Button>
                        <Button onClick={() => router.push(`/clients/${client.id}/edit-intake`)}>
                          <FileText className="h-4 w-4 mr-2" /> Edit Full Intake
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3">Personal Information</h3>
                      <dl className="space-y-2">
                        <div className="flex justify-between py-2 border-b">
                          <dt className="text-gray-500">Full Name</dt>
                          <dd className="font-medium">{client.first_name} {client.last_name}</dd>
                        </div>
                        {client.date_of_birth && (
                          <div className="flex justify-between py-2 border-b">
                            <dt className="text-gray-500">Date of Birth</dt>
                            <dd className="font-medium">{new Date(client.date_of_birth).toLocaleDateString()}</dd>
                          </div>
                        )}
                        <div className="flex justify-between py-2 border-b items-center">
                          <dt className="text-gray-500">Email</dt>
                          <dd className="font-medium flex items-center gap-2">
                            {client.email}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button onClick={() => copyToClipboard(client.email, 'intake-email')}>
                                  {copiedField === 'intake-email' ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Copy className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Copy email</TooltipContent>
                            </Tooltip>
                          </dd>
                        </div>
                        <div className="flex justify-between py-2 border-b items-center">
                          <dt className="text-gray-500">Phone</dt>
                          <dd className="font-medium flex items-center gap-2">
                            {client.phone}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button onClick={() => copyToClipboard(client.phone, 'intake-phone')}>
                                  {copiedField === 'intake-phone' ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Copy className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Copy phone</TooltipContent>
                            </Tooltip>
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Address</h3>
                      <dl className="space-y-2">
                        <div className="flex justify-between py-2 border-b">
                          <dt className="text-gray-500">Street</dt>
                          <dd className="font-medium">{client.street_address || 'Not provided'}</dd>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <dt className="text-gray-500">City</dt>
                          <dd className="font-medium">{client.city || 'Not provided'}</dd>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <dt className="text-gray-500">State</dt>
                          <dd className="font-medium">{client.state || 'Not provided'}</dd>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <dt className="text-gray-500">ZIP Code</dt>
                          <dd className="font-medium">{client.zip_code || 'Not provided'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Tasks</CardTitle>
                    {canEdit && (
                      <Button onClick={() => setShowTaskDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Add Task
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {tasks.length > 0 ? (
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors ${task.status === 'completed' ? 'bg-gray-50 opacity-75' : ''}`}
                        >
                          <div className="flex items-center gap-4">
                            <input
                              type="checkbox"
                              className="h-5 w-5 rounded border-gray-300 cursor-pointer"
                              checked={task.status === 'completed'}
                              onChange={() => handleToggleTask(task.id, task.status)}
                              disabled={taskUpdating === task.id}
                            />
                            <div className={task.status === 'completed' ? 'line-through text-gray-400' : ''}>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-gray-500">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getPriorityBadge(task.priority)}
                            <Badge className={taskStatusColors[task.status] || 'bg-gray-100 text-gray-800'}>
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CheckSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold">No Tasks</h3>
                      <p className="text-gray-500 mt-1">Add tasks to track client progress</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Documents</CardTitle>
                    {canEdit && (
                      <Button onClick={() => setShowUploadDialog(true)}>
                        <Upload className="h-4 w-4 mr-2" /> Upload Document
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {documents.length > 0 ? (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{doc.file_name}</p>
                              <p className="text-sm text-gray-500">
                                {doc.document_type.toUpperCase()} • Uploaded {new Date(doc.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {doc.is_verified ? (
                              <Badge className="bg-green-100 text-green-800">Verified</Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800">Pending Verification</Badge>
                            )}
                            <Button variant="outline" size="sm" onClick={() => handleViewDocument(doc)}>View</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold">No Documents</h3>
                      <p className="text-gray-500 mt-1">Upload documents to the client file</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Programs Tab */}
            <TabsContent value="programs" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Program Enrollments</CardTitle>
                    {canEdit && (
                      <Button onClick={() => setShowProgramDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" /> New Enrollment
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {enrollments.length > 0 ? (
                    <div className="space-y-4">
                      {enrollments.map((enrollment) => (
                        <Card key={enrollment.id} className="border">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="font-bold text-lg">{enrollment.programs.name}</h4>
                                <p className="text-sm text-gray-500">{enrollment.programs.category}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {canEdit ? (
                                  <Select
                                    value={enrollment.status}
                                    onValueChange={async (newStatus) => {
                                      if (newStatus !== enrollment.status) {
                                        await updateEnrollmentStatus({
                                          enrollmentId: enrollment.id,
                                          clientId: clientId,
                                          oldStatus: enrollment.status,
                                          newStatus: newStatus
                                        });
                                        // Refresh enrollments
                                        const result = await getClientEnrollments(clientId);
                                        if (result.success) {
                                          setEnrollments(result.data as Enrollment[]);
                                        }
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="w-[140px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="interested">Interested</SelectItem>
                                      <SelectItem value="applying">Applying</SelectItem>
                                      <SelectItem value="enrolled">Enrolled</SelectItem>
                                      <SelectItem value="completed">Completed</SelectItem>
                                      <SelectItem value="denied">Denied</SelectItem>
                                      <SelectItem value="withdrawn">Withdrawn</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge className="capitalize">{enrollment.status.replace('_', ' ')}</Badge>
                                )}
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleRemoveEnrollment(enrollment.id)}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="text-gray-400">Start Date:</span>
                                <span className="ml-2">{enrollment.start_date ? new Date(enrollment.start_date).toLocaleDateString() : 'Not set'}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Volunteer:</span>
                                <span className="ml-2 text-blue-600">
                                  {enrollment.volunteer ? `${enrollment.volunteer.first_name} ${enrollment.volunteer.last_name}` : 'Unassigned'}
                                </span>
                              </div>
                            </div>
                            {enrollment.notes && (
                              <p className="mt-3 text-sm italic text-gray-500 border-t pt-2">{enrollment.notes}</p>
                            )}
                            {/* Activity Log Section */}
                            <details className="mt-4 border-t pt-3">
                              <summary className="text-sm font-medium cursor-pointer text-blue-600 hover:underline">
                                View Activity Log
                              </summary>
                              <EnrollmentActivityLog enrollmentId={enrollment.id} />
                            </details>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold">No Enrollments</h3>
                      <p className="text-gray-500 mt-1">Enroll this client in programs to track their progress</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-6">
              <div className="grid grid-cols-1 gap-6">
                <Card className="print:hidden">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-bold">Case History & interactions</CardTitle>
                    <div className="flex gap-2">
                      <LogInteractionDialog
                        clientId={clientId}
                        clientName={`${client.first_name} ${client.last_name}`}
                        onSuccess={refreshHistory}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ClientHistory history={interactions} />
                  </CardContent>
                </Card>

                {profile?.role === 'admin' && (
                  <Card className="print:hidden">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold">System Audit Logs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activities.length > 0 ? (
                        <div className="space-y-4">
                          {activities.map((item, index) => (
                            <div key={item.id} className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <div className="w-2 h-2 rounded-full bg-gray-300" />
                                {index < activities.length - 1 && (
                                  <div className="w-0.5 h-full bg-gray-100 my-1" />
                                )}
                              </div>
                              <div className="flex-1 pb-4">
                                <p className="font-medium text-sm capitalize">{item.action}</p>
                                <p className="text-xs text-gray-500">
                                  {item.user_name} • {new Date(item.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No system activity recorded</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Printable Section - only shown when needed or in print */}
                <div className="hidden print:block border-t pt-8 mt-8">
                  <PrintableCaseHistory
                    client={client}
                    history={interactions}
                    tasks={tasks}
                  />
                </div>

                {/* Print Trigger Button */}
                <div className="flex justify-center mt-4 print:hidden">
                  <Button variant="outline" onClick={() => window.print()} className="gap-2">
                    <Printer className="w-4 h-4" />
                    Download/Print Case Summary
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Add Task Dialog */}
          <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Add a new task for {client?.first_name} {client?.last_name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="task-title">Task Title *</Label>
                  <Input
                    id="task-title"
                    placeholder="Enter task title"
                    value={newTaskData.title}
                    onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-description">Description</Label>
                  <Input
                    id="task-description"
                    placeholder="Enter task description"
                    value={newTaskData.description}
                    onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-due-date">Due Date *</Label>
                  <Input
                    id="task-due-date"
                    type="date"
                    value={newTaskData.due_date}
                    onChange={(e) => setNewTaskData({ ...newTaskData, due_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-priority">Priority</Label>
                  <Select value={newTaskData.priority} onValueChange={(value) => setNewTaskData({ ...newTaskData, priority: value })}>
                    <SelectTrigger id="task-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowTaskDialog(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleCreateTask}>
                  Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Assign Case Manager Dialog */}
          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Assign Case Manager</DialogTitle>
                <DialogDescription>
                  Select a staff member to manage this client&apos;s case.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Manager Name</Label>
                  <Select onValueChange={(value) => handleAssignManager(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCaseManagers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAssignDialog(false)} disabled={assigningLoading}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Upload Document Dialog */}
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a document for {client?.first_name} {client?.last_name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="document-type">Document Type *</Label>
                  <Select value={uploadDocumentType} onValueChange={setUploadDocumentType} disabled={uploading}>
                    <SelectTrigger id="document-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="id">Identification</SelectItem>
                      <SelectItem value="income">Income Verification</SelectItem>
                      <SelectItem value="housing">Housing</SelectItem>
                      <SelectItem value="medical">Medical</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="consent">Consent Form</SelectItem>
                      <SelectItem value="engagement_letter">Engagement Letter</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document-file">Select File *</Label>
                  <Input
                    id="document-file"
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    disabled={uploading}
                  />
                  <p className="text-sm text-gray-500">Supported: PDF, Word, Excel, Images (Max 25MB)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document-description">Description (Optional)</Label>
                  <Input
                    id="document-description"
                    placeholder="e.g., State ID, Pay stub from January 2024"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    disabled={uploading}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)} disabled={uploading}>
                  Cancel
                </Button>
                <Button type="button" disabled={!uploadFile || uploading} onClick={handleUploadDocument}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Program Enrollment Dialog */}
          <Dialog open={showProgramDialog} onOpenChange={setShowProgramDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Enroll in Program</DialogTitle>
                <DialogDescription>
                  Select a program from the catalog to enroll this client.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Program *</Label>
                  <Select value={newEnrollment.programId} onValueChange={(val) => setNewEnrollment({ ...newEnrollment, programId: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a program" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePrograms.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={newEnrollment.status} onValueChange={(val) => setNewEnrollment({ ...newEnrollment, status: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interested">Interested</SelectItem>
                        <SelectItem value="applying">Applying</SelectItem>
                        <SelectItem value="enrolled">Enrolled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="denied">Denied</SelectItem>
                        <SelectItem value="withdrawn">Withdrawn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assigned Volunteer</Label>
                    <Select value={newEnrollment.volunteerId} onValueChange={(val) => setNewEnrollment({ ...newEnrollment, volunteerId: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select volunteer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {volunteers.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={newEnrollment.startDate}
                      onChange={(e) => setNewEnrollment({ ...newEnrollment, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={newEnrollment.endDate}
                      onChange={(e) => setNewEnrollment({ ...newEnrollment, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    placeholder="Any specific notes or requirements"
                    value={newEnrollment.notes}
                    onChange={(e) => setNewEnrollment({ ...newEnrollment, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowProgramDialog(false)} disabled={programLoading}>
                  Cancel
                </Button>
                <Button onClick={handleUpsertEnrollment} disabled={programLoading}>
                  {programLoading ? 'Saving...' : 'Enroll Client'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </TooltipProvider >
  );
}