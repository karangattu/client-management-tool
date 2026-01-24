'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  Search,
  Filter,
  Archive,
  Edit,
  Eye,
  Users,
  RefreshCw,
  MoreVertical,
  Mail,
  Phone,
  Copy,
  Check,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuth, canAccessFeature } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { deleteClientRecord } from '@/app/actions/user-deletion';
import { type Program } from '@/lib/types';
import { CLIENT_STATUS_CONFIG, getClientStatusConfig } from '@/lib/status-config';
import { ClientSummaryDrawer } from '@/components/clients/ClientSummaryDrawer';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  intake_completed_at: string | null;
  program_enrollments?: { program_id: string; status: string }[];
  case_management?: { non_cash_benefits: string[] }[];
}

// Using unified status config from status-config.ts
const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: CLIENT_STATUS_CONFIG.active.label, color: CLIENT_STATUS_CONFIG.active.classes },
  pending: { label: CLIENT_STATUS_CONFIG.pending.label, color: CLIENT_STATUS_CONFIG.pending.classes },
  inactive: { label: CLIENT_STATUS_CONFIG.inactive.label, color: CLIENT_STATUS_CONFIG.inactive.classes },
  archived: { label: CLIENT_STATUS_CONFIG.archived.label, color: CLIENT_STATUS_CONFIG.archived.classes },
};

export default function ClientsPage() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [clientToArchive, setClientToArchive] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [previewClientId, setPreviewClientId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const supabase = createClient();

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      // Build query with server-side filters
      let query = supabase
        .from('clients')
        .select('*, program_enrollments(*), case_management(*)')
        .order('created_at', { ascending: false })
        .limit(50); // Add pagination limit

      // Apply status filter on server-side for better performance
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: clientsData, error: clientsError } = await query;

      if (clientsError) throw clientsError;

      // Fetch active programs for the filter
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (programsError) throw programsError;

      setClients(clientsData || []);
      setPrograms(programsData || []);
      // Initialize filteredClients with server-filtered results
      setFilteredClients(clientsData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, statusFilter]);

  useEffect(() => {
    if (profile) {
      fetchClients();
    }
  }, [fetchClients, profile, statusFilter]); // Re-fetch when status filter changes

  const fuse = useMemo(() => {
    return new Fuse<Client>(clients, {
      keys: ['first_name', 'last_name', 'email', 'phone'],
      threshold: 0.3,
      minMatchCharLength: 1,
    });
  }, [clients]);

  const programOptions: SearchableSelectOption[] = useMemo(() => {
    const options: SearchableSelectOption[] = [
      { value: 'all', label: 'All Programs' }
    ];
    programs.forEach((p) => {
      options.push({
        value: p.id,
        label: p.name,
        group: p.category || 'Other'
      });
    });
    return options;
  }, [programs]);

  // Debounced search query state
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search input (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let filtered = clients;

    // Apply search filter with fuzzy matching (debounced)
    if (debouncedSearchQuery) {
      const results = fuse.search(debouncedSearchQuery);
      filtered = results.map(({ item }) => item);
    }

    // Status filtering is handled server-side in fetchClients(),
    // so the clients array contains only records matching the selected status filter

    // Apply program filter (client-side due to join complexity)
    if (programFilter !== 'all') {
      filtered = filtered.filter((client) =>
        client.program_enrollments?.some(enrollment => enrollment.program_id === programFilter)
      );
    }

    setFilteredClients(filtered);
  }, [debouncedSearchQuery, programFilter, clients, fuse]);

  const handleArchive = async () => {
    if (!clientToArchive) return;

    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'archived' })
        .eq('id', clientToArchive.id);

      if (error) throw error;

      // Log the archive action
      await supabase.from('audit_log').insert({
        user_id: profile?.id,
        action: 'client_archived',
        table_name: 'client',
        record_id: clientToArchive.id,
        new_values: { client_name: `${clientToArchive.first_name} ${clientToArchive.last_name}` },
      });

      setClients(clients.filter((c) => c.id !== clientToArchive.id));
    } catch (err) {
      console.error('Error archiving client:', err);
    } finally {
      setArchiveDialogOpen(false);
      setClientToArchive(null);
    }
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;

    // Verify confirmation text
    const expectedText = `DELETE ${clientToDelete.first_name.toUpperCase()} ${clientToDelete.last_name.toUpperCase()}`;
    if (deleteConfirmText !== expectedText) {
      setError('Confirmation text does not match');
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const result = await deleteClientRecord(clientToDelete.id);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete client');
      }

      setDeleteDialogOpen(false);
      setClientToDelete(null);
      setDeleteConfirmText('');

      // Refresh clients list
      setTimeout(() => {
        fetchClients();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
    } finally {
      setDeleting(false);
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

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const canCreateClients = canAccessFeature(profile?.role || 'client', 'case_manager');
  const canEditClients = canAccessFeature(profile?.role || 'client', 'case_manager');

  const stats = {
    total: clients.length,
    active: clients.filter((c) => c.status === 'active').length,
    pending: clients.filter((c) => c.status === 'pending').length,
    inactive: clients.filter((c) => c.status === 'inactive').length,
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Clients" showBackButton />

        <main className="container px-4 py-6">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">Client Directory</h1>
              <p className="text-gray-500">Manage client records and information</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchClients}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {canCreateClients && (
                <Link href="/client-intake">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Client
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-gray-500">Total Clients</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                <p className="text-sm text-gray-500">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-gray-500">{stats.inactive}</p>
                <p className="text-sm text-gray-500">Inactive</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col xl:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <SearchableSelect
                    options={programOptions}
                    value={programFilter}
                    onValueChange={setProgramFilter}
                    placeholder="All Programs"
                    searchPlaceholder="Search programs..."
                    className="w-full sm:w-[200px]"
                    grouped
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {clients.length === 0 ? 'No clients yet' : 'No clients found'}
                </h3>
                <p className="text-sm text-gray-500 mb-6 text-center">
                  {clients.length === 0
                    ? 'Get started by adding your first client.'
                    : 'Try adjusting your search or filter criteria.'}
                </p>
                {clients.length === 0 && canCreateClients && (
                  <Link href="/client-intake">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Client
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client) => (
                <Card key={client.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
                          {client.first_name[0]}{client.last_name[0]}
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">
                              {client.first_name} {client.last_name}
                            </h3>
                            {getStatusBadge(client.status)}
                            {client.intake_completed_at ? (
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                                <Check className="h-3 w-3 mr-1" />
                                Intake Complete
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">
                                Intake In Progress
                              </Badge>
                            )}
                          </div>

                          {/* Contact info with copy buttons */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => copyToClipboard(client.email, `email-${client.id}`)}
                                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                >
                                  <Mail className="h-3 w-3" />
                                  <span>{client.email}</span>
                                  {copiedField === `email-${client.id}` ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3 opacity-50" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {copiedField === `email-${client.id}` ? 'Copied!' : 'Click to copy email'}
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => copyToClipboard(client.phone, `phone-${client.id}`)}
                                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                >
                                  <Phone className="h-3 w-3" />
                                  <span>{client.phone}</span>
                                  {copiedField === `phone-${client.id}` ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3 opacity-50" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {copiedField === `phone-${client.id}` ? 'Copied!' : 'Click to copy phone'}
                              </TooltipContent>
                            </Tooltip>
                          </div>

                          <p className="text-xs text-gray-400">
                            Added {new Date(client.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setPreviewClientId(client.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          Quick View
                        </Button>
                        <Link href={`/clients/${client.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEditClients && (
                              <DropdownMenuItem asChild>
                                <Link href={`/clients/${client.id}/edit`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-orange-600"
                              onClick={() => {
                                setClientToArchive(client);
                                setArchiveDialogOpen(true);
                              }}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                            {profile?.role === 'admin' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setClientToDelete(client);
                                  setDeleteConfirmText('');
                                  setError(null);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Archive Confirmation Dialog */}
          <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Archive Client</DialogTitle>
                <DialogDescription>
                  Are you sure you want to archive {clientToArchive?.first_name} {clientToArchive?.last_name}?
                  Archived clients can be restored later by an administrator.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setArchiveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="default" className="bg-orange-600 hover:bg-orange-700" onClick={handleArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Client Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Permanently Delete Client
                </DialogTitle>
                <DialogDescription>
                  This action cannot be undone. All data associated with this client will be permanently deleted.
                </DialogDescription>
              </DialogHeader>

              {clientToDelete && (
                <div className="space-y-4 py-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="font-medium text-sm mb-2">Client to delete:</p>
                    <p className="font-semibold">{clientToDelete.first_name} {clientToDelete.last_name}</p>
                    <p className="text-sm text-gray-600">{clientToDelete.email}</p>
                  </div>

                  <div className="space-y-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="font-medium text-sm">What will be deleted:</p>
                    <ul className="text-sm space-y-1 text-gray-700">
                      <li>• Client record and all intake data</li>
                      <li>• All uploaded documents and signatures</li>
                      <li>• Task assignments and calendar events</li>
                      <li>• Case management notes and history</li>
                      <li>• Household and emergency contact information</li>
                      <li>• Benefits and programs information</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      To confirm deletion, type: <span className="font-mono text-red-600 font-bold">DELETE {clientToDelete.first_name.toUpperCase()} {clientToDelete.last_name.toUpperCase()}</span>
                    </Label>
                    <Input
                      placeholder="Type confirmation text above"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      disabled={deleting}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDeleteDialogOpen(false);
                        setClientToDelete(null);
                        setDeleteConfirmText('');
                        setError(null);
                      }}
                      disabled={deleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={
                        deleting ||
                        deleteConfirmText !== `DELETE ${clientToDelete.first_name.toUpperCase()} ${clientToDelete.last_name.toUpperCase()}`
                      }
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Permanently Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Client Summary Drawer */}
          <ClientSummaryDrawer
            clientId={previewClientId}
            isOpen={!!previewClientId}
            onClose={() => setPreviewClientId(null)}
          />
        </main>
      </div>
    </TooltipProvider>
  );
}