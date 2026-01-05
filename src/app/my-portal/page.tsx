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

            // Fetch tasks assigned to this user
            const { data: tasksData } = await supabase
                .from('tasks')
                .select('id, title, description, status, priority, due_date, category')
                .eq('assigned_to', user.id)
                .in('status', ['pending', 'in_progress'])
                .order('priority', { ascending: false })
                .order('due_date', { ascending: true });

            setTasks(tasksData || []);

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

    const handleSignEngagementLetter = async () => {
        if (!signature || !client) return;

        setSigning(true);
        try {
            // Generate PDF
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);

            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("ENGAGEMENT LETTER AND CONSENT FOR SERVICES", margin, 30);

            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text(`Client: ${client.first_name} ${client.last_name}`, margin, 45);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, 52);

            doc.setFontSize(10);
            const splitText = doc.splitTextToSize(ENGAGEMENT_LETTER_TEXT, contentWidth);
            doc.text(splitText, margin, 65);

            const textLines = splitText.length;
            const textHeight = textLines * 5;
            let signatureY = 65 + textHeight + 20;

            const pageHeight = doc.internal.pageSize.getHeight();
            if (signatureY + 60 > pageHeight) {
                doc.addPage();
                signatureY = margin;
            }

            doc.line(margin, signatureY, pageWidth - margin, signatureY);
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("CLIENT SIGNATURE", margin, signatureY + 10);

            doc.addImage(signature, 'PNG', margin, signatureY + 15, 60, 25);
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.text(`Digitally signed by ${client.first_name} ${client.last_name} on ${new Date().toLocaleString()}`, margin, signatureY + 45);

            const pdfData = doc.output('datauristring').split(',')[1];

            const result = await signEngagementLetter(client.id, pdfData, signature);

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
        if (task.title === 'Complete Intake Form') {
            return { href: '/client-intake', label: 'Complete Form' };
        }
        if (task.title === 'Sign Engagement Letter') {
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
                    <Button variant="outline" onClick={handleSignOut}>
                        <LogOut className="h-4 w-4 mr-2" /> Sign Out
                    </Button>
                </div>
            </header>

            <main className="container px-4 py-6 max-w-4xl mx-auto space-y-6">
                {/* Alerts Banner */}
                {alerts.length > 0 && (
                    <div className="space-y-2">
                        {alerts.map((alert) => (
                            <Alert key={alert.id} className="bg-blue-50 border-blue-200">
                                <Bell className="h-4 w-4 text-blue-600" />
                                <AlertTitle className="text-blue-800">{alert.title}</AlertTitle>
                                <AlertDescription className="text-blue-700 flex items-center justify-between">
                                    <span>{alert.message}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 hover:bg-blue-100"
                                        onClick={() => handleDismissAlert(alert.id)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        ))}
                    </div>
                )}

                {/* Urgent Tasks Section - Decoupled from Task records to ensure visibility */}
                {(urgentTasks.length > 0 || needsEngagementLetter || needsIntakeForm || !client?.date_of_birth) && (
                    <Card className="border-orange-200 bg-orange-50/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-orange-800">
                                <AlertTriangle className="h-5 w-5" />
                                Action Required
                            </CardTitle>
                            <CardDescription className="text-orange-700">
                                Please complete these items to finish setting up your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Explicit Intake Form Action */}
                            {needsIntakeForm && (
                                <Link href="/client-intake">
                                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-100 rounded-lg">
                                                <ClipboardList className="h-5 w-5 text-orange-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Complete Intake Form</p>
                                                <p className="text-sm text-gray-500">Help us understand your needs and eligibility</p>
                                            </div>
                                        </div>
                                        <Button size="sm">
                                            Complete Form
                                            <ArrowRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                                </Link>
                            )}

                            {/* Explicit Engagement Letter Action */}
                            {needsEngagementLetter && (
                                <div className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-100 rounded-lg">
                                            <PenLine className="h-5 w-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Sign Engagement Letter</p>
                                            <p className="text-sm text-gray-500">Please review and sign to proceed with services</p>
                                        </div>
                                    </div>
                                    <Button size="sm" onClick={() => setShowEngagementLetter(true)}>
                                        Sign Now
                                        <ArrowRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            )}

                            {/* Explicit Intake Form Action (if we suspect intake is needed but task missing) */}
                            {/* We check if tasks already include it to avoid duplicates, or just render tasks below */}

                            {urgentTasks.map((task) => {
                                // unexpected duplication check: if we manually rendered above, skip those tasks
                                if (task.title === 'Sign Engagement Letter' && needsEngagementLetter) return null;
                                if (task.title === 'Complete Intake Form' && needsIntakeForm) return null;

                                const action = getTaskAction(task);
                                return (
                                    <div
                                        key={task.id}
                                        className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-100 rounded-lg">
                                                {task.title.includes('Intake') ? (
                                                    <ClipboardList className="h-5 w-5 text-orange-600" />
                                                ) : (
                                                    <PenLine className="h-5 w-5 text-orange-600" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium">{task.title}</p>
                                                <p className="text-sm text-gray-500">{task.description}</p>
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

                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-lg ${client?.signed_engagement_letter_at ? 'bg-green-100' : 'bg-yellow-100'}`}>
                                    {client?.signed_engagement_letter_at ? (
                                        <CheckCircle className="h-6 w-6 text-green-600" />
                                    ) : (
                                        <Clock className="h-6 w-6 text-yellow-600" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Engagement Letter</p>
                                    <p className="font-semibold">
                                        {client?.signed_engagement_letter_at ? 'Signed' : 'Pending'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <ClipboardList className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Open Tasks</p>
                                    <p className="font-semibold">{tasks.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <FileText className="h-6 w-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Documents</p>
                                    <p className="font-semibold">{documents.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* All Tasks Section */}
                {tasks.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>My Tasks</CardTitle>
                            <CardDescription>Tasks assigned to you by your case manager</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {tasks.map((task) => {
                                const action = getTaskAction(task);
                                return (
                                    <div
                                        key={task.id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Badge className={getPriorityColor(task.priority)}>
                                                {task.priority}
                                            </Badge>
                                            <div>
                                                <p className="font-medium">{task.title}</p>
                                                {task.due_date && (
                                                    <p className="text-sm text-gray-500">
                                                        Due: {new Date(task.due_date).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {action && (
                                            action.href ? (
                                                <Link href={action.href}>
                                                    <Button variant="outline" size="sm">
                                                        {action.label}
                                                    </Button>
                                                </Link>
                                            ) : (
                                                <Button variant="outline" size="sm" onClick={action.onClick}>
                                                    {action.label}
                                                </Button>
                                            )
                                        )}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}

                {/* Documents Section */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>My Documents</CardTitle>
                                <CardDescription>Upload and manage your documents</CardDescription>
                            </div>
                            <Button onClick={() => setShowUploadDialog(true)}>
                                <Upload className="h-4 w-4 mr-2" /> Upload
                            </Button>
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
                                                    {doc.document_type.toUpperCase()} • {new Date(doc.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        {doc.is_verified ? (
                                            <Badge className="bg-green-100 text-green-800">Verified</Badge>
                                        ) : (
                                            <Badge className="bg-yellow-100 text-yellow-800">
                                                <Clock className="h-3 w-3 mr-1" /> Pending
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold">No Documents Yet</h3>
                                <p className="text-gray-500 mt-1">
                                    Upload documents to share with your case manager
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
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
