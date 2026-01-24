'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FileText,
  Upload,
  Search,
  Filter,
  MoreVertical,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Image as ImageIcon,
  File,
  FileSpreadsheet,
  FolderOpen,
  User,
  Calendar,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { formatPacificLocaleDate } from '@/lib/date-utils';
import { useRealtimeAllDocuments, type RealtimeDocument } from '@/lib/hooks/use-realtime';
import { useToast } from '@/components/ui/use-toast';

interface Document {
  id: string;
  name: string;
  type: string;
  status: string;
  client_id: string;
  clientName?: string;
  created_at: string;
  size?: string;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  file_path?: string;
}

const documentTypes = [
  { value: 'identification', label: 'Identification' },
  { value: 'income', label: 'Income Verification' },
  { value: 'housing', label: 'Housing Documents' },
  { value: 'benefits', label: 'Benefits Documents' },
  { value: 'medical', label: 'Medical Records' },
  { value: 'legal', label: 'Legal Documents' },
  { value: 'other', label: 'Other' },
];

export default function DocumentsClient() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);

  // Action states
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const supabase = createClient();

  // Realtime subscription for documents - enables multi-user sync
  const { isSubscribed: isRealtimeConnected } = useRealtimeAllDocuments(
    documents as unknown as RealtimeDocument[],
    {
      onInsert: useCallback((newDoc: RealtimeDocument) => {
        setDocuments((prev) => {
          if (prev.some((d) => d.id === newDoc.id)) return prev;
          return [{
            id: newDoc.id,
            name: newDoc.file_name,
            type: newDoc.document_type || 'other',
            status: newDoc.status || 'pending',
            client_id: newDoc.client_id,
            created_at: newDoc.created_at,
            file_path: newDoc.file_path,
          }, ...prev];
        });
        toast({
          title: 'New Document Uploaded',
          description: `"${newDoc.file_name}" was added`,
        });
      }, [toast]),
      onUpdate: useCallback((updatedDoc: RealtimeDocument) => {
        setDocuments((prev) =>
          prev.map((d) => d.id === updatedDoc.id ? {
            ...d,
            status: updatedDoc.status,
            verified_by: updatedDoc.verified_by,
            verified_at: updatedDoc.verified_at,
            rejection_reason: updatedDoc.rejection_reason,
          } : d)
        );
        if (updatedDoc.status === 'verified') {
          toast({
            title: 'Document Verified',
            description: `A document was verified`,
          });
        }
      }, [toast]),
      onDelete: useCallback((deletedId: string) => {
        setDocuments((prev) => prev.filter((d) => d.id !== deletedId));
      }, []),
    }
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          file_name,
          document_type,
          status,
          client_id,
          created_at,
          verified_by,
          verified_at,
          file_path,
          rejection_reason,
          clients (first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50); // Add pagination limit

      if (error) throw error;

      interface DocumentQueryResult {
        id: string;
        file_name: string;
        document_type: string | null;
        status: string | null;
        client_id: string;
        created_at: string;
        verified_by: string | null;
        verified_at: string | null;
        file_path: string | null;
        rejection_reason: string | null;
        clients: { first_name: string; last_name: string } | null;
      }

      const formattedDocs = (data as unknown as DocumentQueryResult[])?.map((doc) => ({
        id: doc.id,
        name: doc.file_name,
        type: doc.document_type || 'other',
        status: doc.status || 'pending',
        client_id: doc.client_id,
        clientName: doc.clients ? `${doc.clients.first_name} ${doc.clients.last_name}` : 'Unknown',
        created_at: doc.created_at,
        verified_by: doc.verified_by || undefined,
        verified_at: doc.verified_at || undefined,
        rejection_reason: doc.rejection_reason || undefined,
        file_path: doc.file_path || undefined,
      })) || [];

      setDocuments(formattedDocs);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (doc: Document) => {
    setProcessingId(doc.id);
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'verified',
          is_verified: true,
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', doc.id);

      if (error) throw error;

      // Update local state
      setDocuments(prev => prev.map(d =>
        d.id === doc.id
          ? { ...d, status: 'verified', verified_at: new Date().toISOString() }
          : d
      ));
    } catch (err) {
      console.error('Error verifying document:', err);
      alert('Failed to verify document');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = (doc: Document) => {
    setSelectedDoc(doc);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedDoc) return;
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessingId(selectedDoc.id);
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'rejected',
          is_verified: false,
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('id', selectedDoc.id);

      if (error) throw error;

      // Update local state
      setDocuments(prev => prev.map(d =>
        d.id === selectedDoc.id
          ? { ...d, status: 'rejected', rejection_reason: rejectionReason, verified_at: new Date().toISOString() }
          : d
      ));

      setRejectDialogOpen(false);
      setSelectedDoc(null);
    } catch (err) {
      console.error('Error rejecting document:', err);
      alert('Failed to reject document');
    } finally {
      setProcessingId(null);
    }
  };

  const handleView = async (doc: Document) => {
    if (!doc.file_path) {
      alert('File path is missing');
      return;
    }

    try {
      console.log('Attempting to view document:', { 
        file_path: doc.file_path, 
        name: doc.name,
        type: doc.type,
        client_id: doc.client_id
      });
      
      // Use server action to get signed URL (handles auth and uses service role)
      const { getDocumentSignedUrlAction } = await import('@/app/actions/documents');
      const { url, error } = await getDocumentSignedUrlAction(doc.file_path);
      
      if (error) {
        console.error('Storage error:', error);
        if (error.includes('Object not found') || error.includes('not found')) {
          alert('Document file not found in storage. The file may have been moved or deleted.');
        } else if (error.includes('Access denied')) {
          alert('You don\'t have permission to view this document.');
        } else {
          alert(`Failed to access document: ${error}`);
        }
        return;
      }
      
      if (!url) {
        alert('Failed to generate document URL');
        return;
      }

      window.open(url, '_blank');
    } catch (err) {
      console.error('Error viewing document:', err);
      alert('Failed to open document. Please try again.');
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) return;

    setProcessingId(doc.id);
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      // Update local state
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.clientName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: documents.length,
    pending: documents.filter(d => d.status === 'pending').length,
    verified: documents.filter(d => d.status === 'verified').length,
    rejected: documents.filter(d => d.status === 'rejected').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <ImageIcon className="h-8 w-8 text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Documents" showBackButton />

      <main className="container px-4 py-6">
        {/* Header with realtime status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Documents</h1>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                  isRealtimeConnected 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {isRealtimeConnected ? (
                    <>
                      <Wifi className="h-3 w-3" />
                      <span>Live</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3" />
                      <span>Connecting...</span>
                    </>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isRealtimeConnected 
                  ? 'Real-time sync active - document updates appear automatically' 
                  : 'Connecting to real-time updates...'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <FolderOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-gray-500">Total Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-gray-500">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.verified}</p>
                  <p className="text-sm text-gray-500">Verified</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                  <p className="text-sm text-gray-500">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search documents or clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {documentTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Client</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">John Doe</SelectItem>
                        <SelectItem value="2">Maria Garcia</SelectItem>
                        <SelectItem value="3">Robert Johnson</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Document Type</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="font-medium">Drop files here or click to upload</p>
                    <p className="text-sm text-gray-500 mt-1">
                      PDF, JPG, PNG up to 10MB each
                    </p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setUploadOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setUploadOpen(false)}>
                      Upload Document
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documents ({filteredDocuments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredDocuments.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <button
                    type="button"
                    className="flex-shrink-0 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={() => handleView(doc)}
                    aria-label={`View ${doc.name}`}
                  >
                    {getFileIcon(doc.name)}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        type="button"
                        className="font-medium truncate hover:text-blue-600 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                        onClick={() => handleView(doc)}
                      >
                        {doc.name}
                      </button>
                      {getStatusBadge(doc.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {doc.clientName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {doc.created_at ? formatPacificLocaleDate(doc.created_at) : 'N/A'}
                      </span>
                      <span>{doc.size || 'N/A'}</span>
                      <Badge variant="outline" className="text-xs">
                        {documentTypes.find(t => t.value === doc.type)?.label || doc.type}
                      </Badge>
                    </div>
                    {doc.status === 'rejected' && doc.rejection_reason && (
                      <p className="text-sm text-red-600 mt-1">
                        Reason: {doc.rejection_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {doc.status === 'pending' && (
                      <div className="hidden md:flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleVerify(doc)}
                          disabled={processingId === doc.id}
                        >
                          {processingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleRejectClick(doc)}
                          disabled={processingId === doc.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(doc)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        {doc.status === 'pending' && (
                          <>
                            <DropdownMenuItem className="md:hidden text-green-600" onClick={() => handleVerify(doc)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Verify
                            </DropdownMenuItem>
                            <DropdownMenuItem className="md:hidden text-red-600" onClick={() => handleRejectClick(doc)}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(doc)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}

              {filteredDocuments.length === 0 && (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No documents found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Try adjusting your search or filters
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rejection Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Document</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this document.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection (e.g., blurred image, incorrect document type, expired)"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleConfirmReject} disabled={!rejectionReason.trim() || !!processingId}>
                {processingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Reject Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
    </TooltipProvider>
  );
}
