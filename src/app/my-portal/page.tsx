'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    User,
    FileText,
    Upload,
    LogOut,
    CheckCircle,
    Clock,
    Loader2,
    AlertCircle,
    Bell,
    ClipboardList,
    PenLine,
    ArrowRight,
    X,
    AlertTriangle,
    ShieldCheck,
} from 'lucide-react';
import { uploadClientDocument, ALLOWED_DOCUMENT_TYPES, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZES } from '@/lib/supabase/storage';
import { SignaturePadDialog, SignatureDisplay } from '@/components/ui/signature-pad';
import { signEngagementLetter } from '@/app/actions/signature';
import { completeTaskByTitle } from '@/app/actions/tasks';
import { ENGAGEMENT_LETTER_TEXT } from '@/lib/constants';
import { jsPDF } from 'jspdf';

interface ClientInfo {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    signed_engagement_letter_at: string | null;
    date_of_birth: string | null;
    intake_completed_at: string | null;
}

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    due_date: string | null;
    category: string | null;
    assigner?: {
        first_name: string;
        last_name: string;
    };
}

interface AlertItem {
    id: string;
    title: string;
    message: string | null;
    alert_type: string;
    is_read: boolean;
    created_at: string;
}

interface Document {
    id: string;
    file_name: string;
    document_type: string;
    created_at: string;
    is_verified: boolean;
}

const DOCUMENT_TYPES = [
    { value: 'id', label: 'Identification' },
    { value: 'income', label: 'Income Verification' },
    { value: 'housing', label: 'Housing Documents' },
    { value: 'medical', label: 'Medical Records' },
    { value: 'legal', label: 'Legal Documents' },
    { value: 'other', label: 'Other' },
];

export default function MyPortalPage() {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [client, setClient] = useState<ClientInfo | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Upload state
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadDocumentType, setUploadDocumentType] = useState<string>('id');
    const [uploadDescription, setUploadDescription] = useState('');
    const [uploading, setUploading] = useState(false);

    // Engagement letter signing state
    const [showEngagementLetter, setShowEngagementLetter] = useState(false);
    const [signatureOpen, setSignatureOpen] = useState(false);
    const [signature, setSignature] = useState<string | null>(null);
    const [signing, setSigning] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                router.push('/login');
                return;
            }

            if (!user.email_confirmed_at) {
                setError('Please verify your email address before accessing the portal.');
                setLoading(false);
                return;
            }

            // Fetch client record
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('id, first_name, last_name, email, signed_engagement_letter_at, date_of_birth, intake_completed_at')
                .eq('portal_user_id', user.id)
                .single();

            if (clientError || !clientData) {
                setError('No client account found. Please complete registration first.');
                setLoading(false);
                return;
            }

            setClient(clientData);

            // Fetch tasks assigned to this user with assigner info
            const { data: tasksData } = await supabase
                .from('tasks')
                .select(`
                    id, title, description, status, priority, due_date, category,
                    assigner:profiles!assigned_by(first_name, last_name)
                `)
                .eq('assigned_to', user.id)
                .in('status', ['pending', 'in_progress'])
                .order('priority', { ascending: false })
                .order('due_date', { ascending: true });

            setTasks(tasksData as unknown as Task[] || []);

            // Fetch alerts for this user
            const { data: alertsData } = await supabase
                .from('alerts')
                .select('id, title, message, alert_type, is_read, created_at')
                .eq('user_id', user.id)
                .eq('is_dismissed', false)
                .order('created_at', { ascending: false })
                .limit(5);

            setAlerts(alertsData || []);

            // Fetch documents
            const { data: docsData } = await supabase
                .from('documents')
                .select('id, file_name, document_type, created_at, is_verified')
                .eq('client_id', clientData.id)
                .order('created_at', { ascending: false });

            setDocuments(docsData || []);
        } catch (err) {
            console.error('Error fetching client data:', err);
            setError('An error occurred while loading your information.');
        } finally {
            setLoading(false);
        }
    }, [supabase, router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleDismissAlert = async (alertId: string) => {
        await supabase
            .from('alerts')
            .update({ is_dismissed: true })
            .eq('id', alertId);
        setAlerts(prev => prev.filter(a => a.id !== alertId));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!ALLOWED_DOCUMENT_TYPES.includes(file.type) && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
                alert('Invalid file type. Please upload a PDF, Word document, Excel file, or image.');
                return;
            }
            if (file.size > MAX_FILE_SIZES.DOCUMENT) {
                alert('File too large. Maximum size is 25MB.');
                return;
            }
            setUploadFile(file);
        }
    };

    const handleUploadDocument = async () => {
        if (!uploadFile || !client) return;

        setUploading(true);
        try {
            const { document: documentRecord, error: uploadError } = await uploadClientDocument(
                uploadFile,
                client.id,
                uploadDocumentType as 'id' | 'income' | 'housing' | 'medical' | 'legal' | 'other',
                uploadDescription || undefined
            );

            if (uploadError || !documentRecord) {
                alert(`Upload failed: ${uploadError || 'Unknown error'}`);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();

            await supabase.from('documents').insert({
                client_id: client.id,
                file_name: documentRecord.file_name,
                document_type: uploadDocumentType,
                file_path: documentRecord.file_path,
                file_size: documentRecord.file_size,
                mime_type: documentRecord.mime_type,
                description: uploadDescription || null,
                uploaded_by: user?.id,
                is_verified: false,
            });

            // Refresh data
            await fetchData();

            setUploadFile(null);
            setUploadDocumentType('id');
            setUploadDescription('');
            setShowUploadDialog(false);
        } catch (err) {
            console.error('Error uploading document:', err);
            alert('An error occurred while uploading.');
        } finally {
            setUploading(false);
        }
    };

    const openDocument = async (doc: Document) => {
        try {
            // We need to fetch the file path from the documents table to be sure,
            // but the doc object we have from the fetch in useEffect doesn't definitely have it.
            // Let's re-fetch the specific document to get the file_path if it's missing from the type definition above
            // Or we can just include file_path in the initial select.
            // For now, let's assume we need to get the signed URL.

            // Wait, the doc object defined in interface Document doesn't have file_path.
            // I should update the interface and the select query first, but to be safe/quick:
            const { data: docData, error } = await supabase
                .from('documents')
                .select('file_path')
                .eq('id', doc.id)
                .single();

            if (error || !docData) {
                console.error('Error fetching document path:', error);
                alert('Could not open document.');
                return;
            }

            const { getDocumentSignedUrl } = await import('@/lib/supabase/storage');
            const { url: signedUrl, error: urlError } = await getDocumentSignedUrl(docData.file_path);

            if (urlError || !signedUrl) {
                console.error('Error getting signed URL:', urlError);
                alert('Could not open document.');
                return;
            }

            window.open(signedUrl, '_blank');
        } catch (err) {
            console.error('Error opening document:', err);
            alert('An error occurred while opening the document.');
        }
    };

    const handleSignEngagementLetter = async () => {
        if (!signature || !client) return;

        setSigning(true);
        try {
            // Generate PDF
            const { generateEngagementLetterPDF } = await import('@/lib/pdf-utils');
            const clientName = `${client.first_name} ${client.last_name}`;
            const pdfData = generateEngagementLetterPDF(clientName, signature);

            const result = await signEngagementLetter(client.id, pdfData, signature, clientName);

            if (result.success) {
                // Update client state immediately
                setClient(prev => prev ? { ...prev, signed_engagement_letter_at: new Date().toISOString() } : null);

                // Complete the task
                await completeTaskByTitle(client.id, 'Sign Engagement Letter');

                // Refresh data
                await fetchData();
                setShowEngagementLetter(false);
                setSignature(null);
            } else {
                alert('Failed to sign engagement letter. Please try again.');
            }
        } catch (err) {
            console.error('Error signing engagement letter:', err);
            alert('An error occurred. Please try again.');
        } finally {
            setSigning(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getTaskAction = (task: Task) => {
        if (task.title.toLowerCase().includes('intake')) {
            return { href: '/client-intake', label: 'Complete Form' };
        }
        if (task.title.toLowerCase().includes('engagement letter') || task.title.toLowerCase().includes('sign')) {
            return { onClick: () => setShowEngagementLetter(true), label: 'Sign Now' };
        }
        return null;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center">
                    <CardContent className="pt-8 pb-8">
                        <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Access Error</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <Link href="/login">
                            <Button>Go to Login</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const urgentTasks = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high');
    const needsEngagementLetter = !client?.signed_engagement_letter_at;
    const needsIntakeForm = !client?.intake_completed_at;

    // Calculate onboarding progress
    const steps = [
        { label: 'Account Created', completed: true },
        { label: 'Engagement Letter', completed: !needsEngagementLetter },
        { label: 'Intake Form', completed: !needsIntakeForm },
    ];
    const completedSteps = steps.filter(s => s.completed).length;
    const progressPercentage = (completedSteps / steps.length) * 100;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b shadow-sm sticky top-0 z-10">
                <div className="container px-4 py-4 max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg">My Portal</h1>
                            <p className="text-sm text-gray-500">Welcome, {client?.first_name}</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={handleSignOut} size="sm">
                        <LogOut className="h-4 w-4 mr-2" /> Sign Out
                    </Button>
                </div>
            </header>

            <main className="container px-4 py-6 max-w-4xl mx-auto space-y-6">

                {/* Onboarding Progress Card */}
                {progressPercentage < 100 && (
                    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg text-blue-900">Account Setup Progress</CardTitle>
                            <CardDescription className="text-blue-700">Complete these steps to fully activate your profile.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium text-blue-900 mb-1">
                                    <span>{completedSteps} of {steps.length} completed</span>
                                    <span>{Math.round(progressPercentage)}%</span>
                                </div>
                                <Progress value={progressPercentage} className="h-2 bg-blue-200" />
                                <div className="flex justify-between mt-2">
                                    {steps.map((step, idx) => (
                                        <div key={idx} className={`flex items-center gap-1.5 text-xs ${step.completed ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                                            {step.completed ? (
                                                <CheckCircle className="h-3.5 w-3.5" />
                                            ) : (
                                                <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300" />
                                            )}
                                            {step.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Alerts Banner */}
                {alerts.length > 0 && (
                    <div className="space-y-2">
                        {alerts.map((alert) => (
                            <Alert key={alert.id} className="bg-blue-50 border-blue-200 shadow-sm">
                                <Bell className="h-4 w-4 text-blue-600" />
                                <AlertTitle className="text-blue-800">{alert.title}</AlertTitle>
                                <AlertDescription className="text-blue-700 flex items-center justify-between">
                                    <span>{alert.message}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 hover:bg-blue-100 rounded-full"
                                        onClick={() => handleDismissAlert(alert.id)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        ))}
                    </div>
                )}

                {/* Action Required Section */}
                {(urgentTasks.length > 0 || needsEngagementLetter || needsIntakeForm) && (
                    <Card className="border-l-4 border-l-orange-500 shadow-md">
                        <CardHeader className="pb-3 bg-orange-50/30">
                            <CardTitle className="flex items-center gap-2 text-orange-800 text-lg">
                                <AlertTriangle className="h-5 w-5" />
                                Action Required
                            </CardTitle>
                            <CardDescription className="text-orange-700">
                                Please address these items as soon as possible.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-4">
                            {needsEngagementLetter && (
                                <div className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm border-orange-100">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-orange-100 rounded-full">
                                            <PenLine className="h-5 w-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Sign Engagement Letter</p>
                                            <p className="text-sm text-gray-500">Required to receive services.</p>
                                        </div>
                                    </div>
                                    <Button size="sm" onClick={() => setShowEngagementLetter(true)}>
                                        Sign Now
                                        <ArrowRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            )}

                            {needsIntakeForm && (
                                <Link href="/client-intake">
                                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm border-orange-100 hover:shadow-md transition-shadow cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-orange-100 rounded-full">
                                                <ClipboardList className="h-5 w-5 text-orange-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">Complete Intake Form</p>
                                                <p className="text-sm text-gray-500">Help us understand your needs.</p>
                                            </div>
                                        </div>
                                        <Button size="sm">
                                            Start Form
                                            <ArrowRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                                </Link>
                            )}

                            {urgentTasks.map((task) => {
                                // Skip duplicates if manually rendered above
                                if (task.title.toLowerCase().includes('sign engagement') && needsEngagementLetter) return null;
                                if (task.title.toLowerCase().includes('intake') && needsIntakeForm) return null;

                                const action = getTaskAction(task);
                                return (
                                    <div
                                        key={task.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-lg border shadow-sm"
                                    >
                                        <div className="flex items-start gap-4 mb-3 sm:mb-0">
                                            <div className="p-2.5 bg-orange-100 rounded-full mt-1 sm:mt-0">
                                                <AlertCircle className="h-5 w-5 text-orange-600" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-semibold text-gray-900">{task.title}</p>
                                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none text-[10px] px-1.5 h-5">
                                                        Urgent
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-0.5">{task.description}</p>
                                                {task.assigner && (
                                                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        Assigned by {task.assigner.first_name} {task.assigner.last_name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {action && (
                                            action.href ? (
                                                <Link href={action.href}>
                                                    <Button size="sm">
                                                        {action.label}
                                                        <ArrowRight className="h-4 w-4 ml-1" />
                                                    </Button>
                                                </Link>
                                            ) : (
                                                <Button size="sm" onClick={action.onClick}>
                                                    {action.label}
                                                    <ArrowRight className="h-4 w-4 ml-1" />
                                                </Button>
                                            )
                                        )}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* All Tasks Section */}
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-blue-600" />
                                My Tasks
                            </CardTitle>
                            <CardDescription>To-do items assigned to you</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {tasks.length > 0 ? tasks.map((task) => {
                                // Filter out urgent ones already shown above to avoid clutter? 
                                // Actually, let's keep them but maybe styled differently, or just show non-urgent here.
                                // For simplicity, we show all, but maybe user wants a unified list.
                                // Let's filter out the ones already displayed in "Action Required" if they are urgent.
                                const isUrgent = task.priority === 'urgent' || task.priority === 'high';
                                if (isUrgent) return null;

                                const action = getTaskAction(task);
                                return (
                                    <div
                                        key={task.id}
                                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="outline" className={getPriorityColor(task.priority)}>
                                                {task.priority}
                                            </Badge>
                                            {task.due_date && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(task.due_date).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-medium text-gray-900">{task.title}</p>
                                        {task.description && (
                                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                                        )}

                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                            {task.assigner ? (
                                                <p className="text-xs text-gray-400">
                                                    From: {task.assigner.first_name} {task.assigner.last_name}
                                                </p>
                                            ) : (
                                                <span />
                                            )}

                                            {action && (
                                                action.href ? (
                                                    <Link href={action.href}>
                                                        <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700">
                                                            {action.label}
                                                        </Button>
                                                    </Link>
                                                ) : (
                                                    <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700" onClick={action.onClick}>
                                                        {action.label}
                                                    </Button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                                    <CheckCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">You're all caught up!</p>
                                    <p className="text-xs text-gray-400 mt-1">No pending tasks.</p>
                                </div>
                            )}
                            {/* If all tasks were urgent and filtered out, show empty state */}
                            {tasks.length > 0 && tasks.every(t => t.priority === 'urgent' || t.priority === 'high') && (
                                <div className="text-center py-4">
                                    <p className="text-sm text-gray-500">See "Action Required" above for urgent items.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Documents Section */}
                    <Card className="h-full">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-purple-600" />
                                        My Documents
                                    </CardTitle>
                                    <CardDescription>Files you've uploaded</CardDescription>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => setShowUploadDialog(true)}>
                                    <Upload className="h-4 w-4 mr-2" /> Upload
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {documents.length > 0 ? documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer"
                                    onClick={() => openDocument(doc)}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                                            <FileText className="h-4 w-4 text-purple-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-900 text-sm truncate group-hover:text-blue-600 underline-offset-4 group-hover:underline">
                                                {doc.file_name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {doc.document_type.replace(/_/g, ' ').toUpperCase()} • {new Date(doc.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    {doc.is_verified ? (
                                        <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium">
                                            <ShieldCheck className="h-3 w-3" />
                                            Verified
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs font-medium">
                                            <Clock className="h-3 w-3" />
                                            Pending
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                                    <Upload className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">No documents yet</p>
                                    <Button variant="link" size="sm" onClick={() => setShowUploadDialog(true)} className="mt-1">
                                        Upload your first document
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Upload Dialog */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                        <DialogDescription>
                            Upload a document to share with your case manager.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Document Type *</Label>
                            <Select value={uploadDocumentType} onValueChange={setUploadDocumentType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOCUMENT_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Select File *</Label>
                            <Input
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                onChange={handleFileChange}
                            />
                            <p className="text-xs text-gray-500">
                                Supported: PDF, Word, Excel, Images (Max 25MB)
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Description (Optional)</Label>
                            <Input
                                placeholder="Brief description of the document"
                                value={uploadDescription}
                                onChange={(e) => setUploadDescription(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={uploading}>
                            Cancel
                        </Button>
                        <Button onClick={handleUploadDocument} disabled={!uploadFile || uploading}>
                            {uploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
                                </>
                            ) : (
                                'Upload'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Engagement Letter Dialog */}
            <Dialog open={showEngagementLetter} onOpenChange={setShowEngagementLetter}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Engagement Letter</DialogTitle>
                        <DialogDescription>
                            Please review and sign the engagement letter below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto bg-gray-50">
                            <pre className="whitespace-pre-wrap text-sm font-sans">
                                {ENGAGEMENT_LETTER_TEXT}
                            </pre>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-base font-semibold">Your Signature</Label>
                            <SignatureDisplay
                                signature={signature}
                                onRequestSign={() => setSignatureOpen(true)}
                                onClear={() => setSignature(null)}
                                signerName={`${client?.first_name} ${client?.last_name}`}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEngagementLetter(false)} disabled={signing}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSignEngagementLetter}
                            disabled={!signature || signing}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {signing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" /> Sign & Submit
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Signature Pad Dialog */}
            <SignaturePadDialog
                open={signatureOpen}
                onOpenChange={setSignatureOpen}
                onSave={setSignature}
                title="Draw Your Signature"
                description="Use your finger or mouse to sign below."
            />
        </div>
    );
}
