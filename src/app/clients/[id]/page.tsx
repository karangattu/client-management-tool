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
} from 'lucide-react';
import { useAuth, canAccessFeature } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';

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

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params);
  const { profile } = useAuth();
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
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

  const supabase = createClient();

  useEffect(() => {
    const fetchClientData = async () => {
      setLoading(true);
      try {
        // Fetch client
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();

        if (clientError) throw clientError;
        setClient(clientData);

        // Fetch tasks for this client
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, title, due_date, status, priority')
          .eq('client_id', clientId)
          .order('due_date', { ascending: true })
          .limit(10);

        setTasks(tasksData || []);

        // Fetch documents for this client
        const { data: docsData } = await supabase
          .from('documents')
          .select('id, file_name, document_type, created_at, is_verified')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(10);

        setDocuments(docsData || []);

        // Fetch recent activity from audit log
        const { data: activityData } = await supabase
          .from('audit_log')
          .select('id, action, created_at, old_values, new_values')
          .eq('table_name', 'clients')
          .eq('record_id', clientId)
          .order('created_at', { ascending: false })
          .limit(10);

        setActivities(activityData?.map(a => ({
          id: a.id,
          action: formatAuditAction(a.action),
          created_at: a.created_at,
          user_name: 'System', // Audit log doesn't include user name, would need separate join
        })) || []);

        // Fetch case manager if assigned
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

    fetchClientData();
  }, [clientId, supabase]);

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
        .select('id, file_name, document_type, created_at, is_verified')
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
  }; if (loading) {
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
                      <Button onClick={() => router.push(`/clients/${client.id}/edit`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
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
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Home className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold capitalize">{client.housing_status || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">Housing Status</p>
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
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="intake">Intake</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
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

                {/* Recent Activity */}
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
              </div>
            </TabsContent>

            {/* Intake Tab */}
            <TabsContent value="intake" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Intake Information</CardTitle>
                    {canEdit && (
                      <Button variant="outline" onClick={() => router.push(`/clients/${client.id}/edit`)}>
                        <Edit className="h-4 w-4 mr-2" /> Edit Intake
                      </Button>
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
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-4">
                            <input type="checkbox" className="h-5 w-5 rounded border-gray-300" />
                            <div>
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
                            <Button variant="outline" size="sm">View</Button>
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

            {/* History Tab */}
            <TabsContent value="history" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Activity History</CardTitle>
                </CardHeader>
                <CardContent>
                  {activities.length > 0 ? (
                    <div className="space-y-4">
                      {activities.map((item, index) => (
                        <div key={item.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            {index < activities.length - 1 && (
                              <div className="w-0.5 h-full bg-gray-200 my-1" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="font-medium capitalize">{item.action}</p>
                            <p className="text-sm text-gray-500">
                              {item.user_name} • {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold">No Activity</h3>
                      <p className="text-gray-500 mt-1">Activity will be recorded as changes are made</p>
                    </div>
                  )}
                </CardContent>
              </Card>
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
        </main>
      </div>
    </TooltipProvider>
  );
}
