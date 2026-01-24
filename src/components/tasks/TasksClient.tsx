'use client';

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Fuse from 'fuse.js';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Clock,
  User,
  CheckCircle,
  Circle,
  AlertCircle,
  Hand,
  Archive,
  Loader2,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth, canAccessFeature } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { assignTask } from '@/app/actions/tasks';
import { getAllUsers } from '@/app/actions/users';
import { TaskTemplateSelector } from '@/components/tasks/TaskTemplateSelector';
import type { TaskTemplate } from '@/lib/task-templates';
import { formatPacificLocaleDate } from '@/lib/date-utils';
import { useRealtimeAllTasks, type RealtimeTask } from '@/lib/hooks/use-realtime';
import { useToast } from '@/components/ui/use-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  client_id: string | null;
  assigned_to: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  category: string;
  created_at: string;
  completed_at?: string | null;
  completed_by?: string | null;
  completed_by_role?: 'client' | 'case_manager' | 'admin' | 'system' | null;
  client?: { first_name: string; last_name: string };
  assignee?: { first_name: string; last_name: string };
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

function TasksContent() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('filter') || (profile?.role === 'admin' ? 'open' : 'all');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter === 'open' ? 'open' : 'all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    client_id: '',
    priority: 'medium',
    due_date: '',
    category: 'general',
  });
  
  // Task template selector state
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);

  const supabase = createClient();

  // Realtime subscription for tasks - enables multi-user sync
  const { isSubscribed: isRealtimeConnected } = useRealtimeAllTasks(
    tasks as unknown as RealtimeTask[],
    {
      onInsert: useCallback((newTask: RealtimeTask) => {
        setTasks((prev) => {
          if (prev.some((t) => t.id === newTask.id)) return prev;
          return [newTask as unknown as Task, ...prev];
        });
        toast({
          title: 'New Task Created',
          description: `"${newTask.title}" was added`,
        });
      }, [toast]),
      onUpdate: useCallback((updatedTask: RealtimeTask) => {
        setTasks((prev) =>
          prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } as Task : t))
        );
        // Show toast for status changes
        if (updatedTask.status === 'completed') {
          toast({
            title: 'Task Completed',
            description: `"${updatedTask.title}" was marked complete`,
          });
        }
      }, [toast]),
      onDelete: useCallback((deletedId: string) => {
        setTasks((prev) => prev.filter((t) => t.id !== deletedId));
      }, []),
    }
  );

  useEffect(() => {
    if (profile) {
      fetchTasks();
      fetchClients();
      fetchStaff();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const fetchStaff = async () => {
    const result = await getAllUsers();
    if (result.success && result.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const staffList = (result.data as any[])
        .filter(u => u.role !== 'client')
        .map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}` }));
      setStaff(staffList);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          client_id,
          assigned_to,
          assigned_by,
          status,
          priority,
          due_date,
          completed_at,
          completed_by,
          completed_by_role,
          category,
          tags,
          created_at,
          updated_at,
          client:clients(first_name, last_name),
          assignee:profiles!tasks_assigned_to_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50); // Add pagination limit

      if (error) throw error;
      // Flatten the nested relationship structure
      const tasks = (data || []).map((task: {
        client?: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
        assignee?: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
      }) => ({
        ...task,
        client: Array.isArray(task.client) ? task.client[0] : task.client,
        assignee: Array.isArray(task.assignee) ? task.assignee[0] : task.assignee,
      }));
      setTasks(tasks as Task[]);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .order('last_name');

      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  // Fuzzy search for clients
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) {
      return clients;
    }

    const fuse = new Fuse(clients, {
      keys: ['first_name', 'last_name'],
      threshold: 0.3, // Allows for typos
      minMatchCharLength: 1,
    });

    return fuse.search(clientSearchQuery).map(result => result.item);
  }, [clients, clientSearchQuery]);

  const handleClaimTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          assigned_to: user?.id,
          status: 'in_progress'
        })
        .eq('id', taskId);

      if (error) throw error;

      // Log the action
      await supabase.from('audit_log').insert({
        user_id: user?.id,
        action: 'task_claimed',
        entity_type: 'task',
        entity_id: taskId,
      });

      fetchTasks();
    } catch (err) {
      console.error('Error claiming task:', err);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user?.id || null,
          completed_by_role: ['admin', 'case_manager', 'staff', 'volunteer'].includes(profile?.role || '') ? (profile?.role as any) : 'system'
        })
        .eq('id', taskId)
        .eq('assigned_to', user?.id || null);

      if (error) throw error;

      await supabase.from('audit_log').insert({
        user_id: user?.id,
        action: 'task_completed',
        entity_type: 'task',
        entity_id: taskId,
      });

      fetchTasks();
    } catch (err) {
      console.error('Error completing task:', err);
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'archived' })
        .eq('id', taskId);

      if (error) throw error;

      await supabase.from('audit_log').insert({
        user_id: user?.id,
        action: 'task_archived',
        entity_type: 'task',
        entity_id: taskId,
      });

      fetchTasks();
    } catch (err) {
      console.error('Error archiving task:', err);
    }
  };

  const handleAssignTask = async (taskId: string, staffId: string) => {
    try {
      const result = await assignTask(taskId, staffId);
      if (result.success) {
        fetchTasks();
      } else {
        alert(result.error || "Failed to assign task");
      }
    } catch (err) {
      console.error('Error assigning task:', err);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: TaskTemplate & { calculatedDueDate: string }) => {
    setNewTask({
      title: template.suggestedTitle,
      description: template.suggestedDescription,
      client_id: '', // User will select client
      priority: template.defaultPriority,
      due_date: template.calculatedDueDate,
      category: template.category,
    });
    setCreateOpen(true);
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      setError('Task title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase.from('tasks').insert({
        title: newTask.title,
        description: newTask.description,
        client_id: newTask.client_id || null,
        priority: newTask.priority,
        due_date: newTask.due_date || null,
        category: newTask.category,
        assigned_by: user?.id,
        status: 'pending',
      });

      if (error) throw error;

      await supabase.from('audit_log').insert({
        user_id: user?.id,
        action: 'task_created',
        entity_type: 'task',
        details: { title: newTask.title },
      });

      setCreateOpen(false);
      setNewTask({
        title: '',
        description: '',
        client_id: '',
        priority: 'medium',
        due_date: '',
        category: 'general',
      });
      setClientSearchQuery('');
      fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'open') {
      matchesStatus = task.assigned_to === null && task.status === 'pending';
    } else if (statusFilter === 'mine') {
      matchesStatus = task.assigned_to === user?.id;
    } else if (statusFilter !== 'all') {
      matchesStatus = task.status === statusFilter;
    }

    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    open: tasks.filter(t => t.assigned_to === null && t.status === 'pending').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
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

  const canCreateTasks = canAccessFeature(profile?.role || 'client', 'case_manager');
  const canClaimTasks = ['admin', 'case_manager', 'staff', 'volunteer'].includes(profile?.role || '');

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Tasks" showBackButton />

      <main className="container px-4 py-6">
        {/* Header with realtime status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Tasks</h1>
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
                  ? 'Real-time sync active - task updates appear automatically' 
                  : 'Connecting to real-time updates...'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Hand className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-700">{stats.open}</p>
                  <p className="text-sm text-purple-600">Open to Claim</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <Circle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-gray-500">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                  <p className="text-sm text-gray-500">In Progress</p>
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
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-sm text-gray-500">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="open">Open to Claim</SelectItem>
                <SelectItem value="mine">My Tasks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {canCreateTasks && (
              <>
                {/* Template Selector */}
                <TaskTemplateSelector
                  isOpen={templateSelectorOpen}
                  onClose={() => setTemplateSelectorOpen(false)}
                  onSelectTemplate={handleTemplateSelect}
                />
                
                {/* Use Template Button */}
                <Button variant="outline" onClick={() => setTemplateSelectorOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Template
                </Button>
                
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input
                        value={newTask.title}
                        onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Task title"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={newTask.description}
                        onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Task description"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Client</Label>
                        <div className="space-y-2">
                          {newTask.client_id ? (
                            // Show selected client
                            <div className="border rounded-md p-2 bg-blue-50">
                              <div className="text-sm font-medium text-blue-900">
                                {clients.find(c => c.id === newTask.client_id)?.first_name} {clients.find(c => c.id === newTask.client_id)?.last_name}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewTask(prev => ({ ...prev, client_id: '' }));
                                  setClientSearchQuery('');
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                              >
                                Change
                              </button>
                            </div>
                          ) : (
                            // Show search dropdown
                            <>
                              <Input
                                placeholder="Search clients by name..."
                                value={clientSearchQuery}
                                onChange={(e) => setClientSearchQuery(e.target.value)}
                                className="h-9"
                              />
                              <div className="border rounded-md max-h-48 overflow-y-auto">
                                <div className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => { setNewTask(prev => ({ ...prev, client_id: '' })); setClientSearchQuery(''); }}>
                                  <div className="text-sm font-medium">No client</div>
                                </div>
                                {filteredClients.length > 0 ? (
                                  filteredClients.map(client => (
                                    <div
                                      key={client.id}
                                      className="p-2 hover:bg-gray-100 cursor-pointer border-t"
                                      onClick={() => {
                                        setNewTask(prev => ({ ...prev, client_id: client.id }));
                                        setClientSearchQuery('');
                                      }}
                                    >
                                      <div className="text-sm font-medium">{client.first_name} {client.last_name}</div>
                                    </div>
                                  ))
                                ) : clientSearchQuery.trim() ? (
                                  <div className="p-2 text-center text-xs text-gray-500 border-t">
                                    No clients found
                                  </div>
                                ) : null}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select
                          value={newTask.priority}
                          onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value }))}
                        >
                          <SelectTrigger>
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Due Date</Label>
                        <Input
                          type="date"
                          value={newTask.due_date}
                          onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={newTask.category}
                          onValueChange={(value) => setNewTask(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="documentation">Documentation</SelectItem>
                            <SelectItem value="housing">Housing</SelectItem>
                            <SelectItem value="benefits">Benefits</SelectItem>
                            <SelectItem value="follow_up">Follow Up</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <p className="text-sm text-gray-500">
                      Leave unassigned to allow case managers to claim this task.
                    </p>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => { setCreateOpen(false); setClientSearchQuery(''); }}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateTask} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Task'
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Open Tasks Alert */}
        {canClaimTasks && stats.open > 0 && statusFilter !== 'open' && (
          <Alert className="mb-6 bg-purple-50 border-purple-200">
            <Hand className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-800">
              There are <strong>{stats.open} open tasks</strong> available to claim.{' '}
              <Button
                variant="link"
                className="p-0 h-auto text-purple-700 font-semibold"
                onClick={() => setStatusFilter('open')}
              >
                View open tasks
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Tasks List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {statusFilter === 'open' ? 'Open Tasks (Available to Claim)' : 'Tasks'} ({filteredTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : filteredTasks.length > 0 ? (
              <div className="space-y-3">
                {filteredTasks.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-4 p-4 border rounded-lg transition-colors ${task.assigned_to === null && task.status === 'pending'
                      ? 'border-purple-200 bg-purple-50 hover:bg-purple-100'
                      : 'hover:bg-gray-50'
                      }`}
                  >
                    <div className="mt-1">
                      {getStatusIcon(task.status)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                        {getPriorityBadge(task.priority)}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                        {task.client && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.client.first_name} {task.client.last_name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due: {formatPacificLocaleDate(task.due_date)}
                          </span>
                        )}
                        {task.completed_at && task.status === 'completed' && (
                          <Badge variant="outline" className="text-xs">
                            Completed by {task.completed_by_role === 'client' ? 'client' : task.completed_by_role === 'admin' ? 'admin' : 'case manager'}
                          </Badge>
                        )}
                        {task.assignee ? (
                          <Badge variant="outline" className="text-xs">
                            Assigned to: {task.assignee.first_name} {task.assignee.last_name}
                          </Badge>
                        ) : (
                          <Badge className="bg-purple-100 text-purple-800 text-xs">
                            <Hand className="h-3 w-3 mr-1" />
                            Open to claim
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Claim and Assign buttons for open tasks */}
                      {canClaimTasks && !task.assigned_to && task.status === 'pending' && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={() => handleClaimTask(task.id)}
                          >
                            <Hand className="h-4 w-4 mr-1" />
                            Claim
                          </Button>
                          <Select onValueChange={(val) => handleAssignTask(task.id, val)}>
                            <SelectTrigger className="h-9 w-[110px] text-xs">
                              <SelectValue placeholder="Assign" />
                            </SelectTrigger>
                            <SelectContent>
                              {staff.map((s) => (
                                <SelectItem key={s.id} value={s.id} className="text-xs">
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Complete button for assigned tasks */}
                      {task.assigned_to === user?.id && task.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleCompleteTask(task.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canClaimTasks && !task.assigned_to && (
                            <DropdownMenuItem onClick={() => handleClaimTask(task.id)}>
                              <Hand className="h-4 w-4 mr-2" />
                              Claim Task
                            </DropdownMenuItem>
                          )}
                          {task.assigned_to === user?.id && task.status !== 'completed' && (
                            <DropdownMenuItem onClick={() => handleCompleteTask(task.id)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Complete
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleArchiveTask(task.id)}
                            className="text-orange-600"
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No tasks found</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">
                  {statusFilter === 'open'
                    ? 'There are no open tasks available to claim right now.'
                    : 'Try adjusting your search or filters.'
                  }
                </p>
                {canCreateTasks && (
                  <Button
                    variant="outline"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Task
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
    </TooltipProvider>
  );
}

export default function TasksClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Tasks" />
        <main className="container px-4 py-6 max-w-7xl mx-auto">
          <Skeleton className="h-96" />
        </main>
      </div>
    }>
      <TasksContent />
    </Suspense>
  );
}
