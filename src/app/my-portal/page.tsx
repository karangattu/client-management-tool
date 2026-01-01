'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { uploadClientDocument, ALLOWED_DOCUMENT_TYPES, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZES } from '@/lib/supabase/storage';

interface ClientInfo {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    signed_engagement_letter_at: string | null;
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
    const [documents, setDocuments] = useState<Document[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Upload state
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadDocumentType, setUploadDocumentType] = useState<string>('id');
    const [uploadDescription, setUploadDescription] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const fetchClientData = async () => {
            setLoading(true);
            try {
                // Get current user
                const { data: { user }, error: authError } = await supabase.auth.getUser();

                if (authError || !user) {
                    router.push('/login');
                    return;
                }

                // Check if email is verified
                if (!user.email_confirmed_at) {
                    setError('Please verify your email address before accessing the portal.');
                    setLoading(false);
                    return;
                }

                // Fetch client record linked to this user
                const { data: clientData, error: clientError } = await supabase
                    .from('clients')
                    .select('id, first_name, last_name, email, signed_engagement_letter_at')
                    .eq('portal_user_id', user.id)
                    .single();

                if (clientError || !clientData) {
                    setError('No client account found. Please complete registration first.');
                    setLoading(false);
                    return;
                }

                setClient(clientData);

                // Fetch documents for this client
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
        };

        fetchClientData();
    }, [supabase, router]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!ALLOWED_DOCUMENT_TYPES.includes(file.type) && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
                alert('Invalid file type. Please upload a PDF, Word document, Excel file, or image.');
                return;
            }
            // Validate file size
            if (file.size > MAX_FILE_SIZES.DOCUMENT) {
                alert('File too large. Maximum size is 25MB.');
                return;
            }
            setUploadFile(file);
        }
    };

    const handleUploadDocument = async () => {
        if (!uploadFile || !client) {
            alert('Please select a file');
            return;
        }

        setUploading(true);
        try {
            // Upload file to storage
            const { document: documentRecord, error: uploadError } = await uploadClientDocument(
                uploadFile,
                client.id,
                uploadDocumentType as 'id' | 'income' | 'housing' | 'medical' | 'legal' | 'other',
                uploadDescription || undefined
            );

            if (uploadError || !documentRecord) {
                alert(`Upload failed: ${uploadError || 'Unknown error'}`);
                setUploading(false);
                return;
            }

            // Get current user for uploaded_by field
            const { data: { user } } = await supabase.auth.getUser();

            // Save document metadata to database
            const { error: dbError } = await supabase.from('documents').insert({
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

            if (dbError) {
                console.error('Error saving document metadata:', dbError);
                alert('File uploaded but failed to save record.');
                setUploading(false);
                return;
            }

            // Refresh documents list
            const { data: docsData } = await supabase
                .from('documents')
                .select('id, file_name, document_type, created_at, is_verified')
                .eq('client_id', client.id)
                .order('created_at', { ascending: false });

            setDocuments(docsData || []);

            // Reset form and close dialog
            setUploadFile(null);
            setUploadDocumentType('id');
            setUploadDescription('');
            setShowUploadDialog(false);
            alert('Document uploaded successfully!');
        } catch (err) {
            console.error('Error uploading document:', err);
            alert('An error occurred while uploading.');
        } finally {
            setUploading(false);
        }
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
                        <div className="mb-6">
                            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                                <AlertCircle className="h-8 w-8 text-red-600" />
                            </div>
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b shadow-sm">
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

            <main className="container px-4 py-8 max-w-4xl mx-auto">
                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <CheckCircle className="h-6 w-6 text-green-600" />
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
                                    <FileText className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Documents Uploaded</p>
                                    <p className="font-semibold">{documents.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Documents Section */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>My Documents</CardTitle>
                                <CardDescription>Upload and manage your documents</CardDescription>
                            </div>
                            <Button onClick={() => setShowUploadDialog(true)}>
                                <Upload className="h-4 w-4 mr-2" /> Upload Document
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
                                                    {doc.document_type.toUpperCase()} • Uploaded {new Date(doc.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {doc.is_verified ? (
                                                <Badge className="bg-green-100 text-green-800">Verified</Badge>
                                            ) : (
                                                <Badge className="bg-yellow-100 text-yellow-800">
                                                    <Clock className="h-3 w-3 mr-1" /> Pending Review
                                                </Badge>
                                            )}
                                        </div>
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
        </div>
    );
}
