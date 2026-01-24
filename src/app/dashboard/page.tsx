'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import dynamic from 'next/dynamic';
import { AppHeader } from '@/components/layout/AppHeader';
import { NavigationTile, NavigationTileGrid } from '@/components/layout/NavigationTile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth, canAccessFeature } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { formatPacificFriendly, formatPacificTime, formatPacificDueDate, formatPacificDateTime, getPacificNow, toPacificDate } from '@/lib/date-utils';
import { DailyTriageMode, useDailyTriageMode } from '@/components/layout/DailyTriageMode';
import {
  Users,
  UserPlus,
  Calendar,
  CheckSquare,
  FileText,
  Bell,
  Settings,
  TrendingUp,
  Clock,
  LogOut,
  Hand,
  AlertCircle,
  Check,
  Printer,
  CheckCircle,
  Plus,
  Sun,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { celebrateSuccess } from '@/lib/confetti-utils';
import { useToast } from "@/components/ui/use-toast";
import { LanguageSelector } from '@/components/ui/language-selector';
import { useLanguage } from '@/lib/language-context';
import { completeTask, claimTask, assignTask } from '@/app/actions/tasks';
import { InteractionType } from '@/app/actions/history';
import { ClientHistory } from '@/components/clients/ClientHistory';
import { PrintableCaseHistory } from '@/components/clients/PrintableCaseHistory';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Lazy load animated components to reduce initial bundle
const AnimatedFocusItems = dynamic(() => 
  import('@/components/dashboard/AnimatedFocusItems').then(mod => ({ default: mod.AnimatedFocusItems })), 
  { 
    ssr: false,
    loading: () => <Skeleton className="h-32" />
  }
);

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

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  pendingTasks: number;
  openTasks: number;
  upcomingEvents: number;
  unreadAlerts: number;
}

interface Deadline {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  client_name?: string;
}

interface OpenTask {
  id: string;
  title: string;
  description?: string;
  priority: string;
  due_date: string;
  client_id?: string;
  assigned_to?: string;
  status?: string;
  clients?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface ClientTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
}

interface ClientEvent {
  id: string;
  title: string;
  start_time: string;
  location?: string;
}

// Today's Focus unified item type
interface FocusItem {
  id: string;
  type: 'task' | 'event' | 'alert';
  title: string;
  description?: string;
  time?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  client_name?: string;
  status?: string;
}

export default function DashboardPage() {
  const { user, profile, loading: authLoading, error: authError, signOut, retryAuth } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    pendingTasks: 0,
    openTasks: 0,
    upcomingEvents: 0,
    unreadAlerts: 0,
  });
  const [onboardingCounts, setOnboardingCounts] = useState({
    registered: 0,
    profile: 0,
    engagement: 0,
    intake: 0,
  });
  const [intakeIncompleteCount, setIntakeIncompleteCount] = useState(0);
  const [newSelfRegistrations, setNewSelfRegistrations] = useState<Array<{ id: string; first_name: string; last_name: string; created_at: string }>>([]);

  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [openTasksToClaim, setOpenTasksToClaim] = useState<OpenTask[]>([]);
  const [clientTasks] = useState<ClientTask[]>([]);
  const [clientEvents] = useState<ClientEvent[]>([]);
  const [clientInteractions] = useState<Interaction[]>([]);
  const [clientDocuments] = useState<Array<{ id: string; file_name: string; document_type: string; status?: string; created_at: string; file_path: string }>>([]);
  const [currentClient] = useState<{ id: string; first_name: string; last_name: string;[key: string]: unknown } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [listsLoading, setListsLoading] = useState(true);
  const [focusLoading, setFocusLoading] = useState(true);
  const [staffMembers, setStaffMembers] = useState<{ id: string; name: string }[]>([]);
  const [focusItems, setFocusItems] = useState<FocusItem[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const { t } = useLanguage();
  const { toast } = useToast();
  
  // Daily Triage Mode
  const { showTriage, completeTriage, openTriage, closeTriage } = useDailyTriageMode();
  const [triageTasksChecked, setTriageTasksChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (profile?.role === 'client') {
      router.push('/my-portal');
      return;
    }

    // Only start fetching if we have user AND profile (since logic depends on role)
    if (user && profile) {
      // Check if user has a valid staff/admin role to view dashboard
      const validRoles = ['admin', 'case_manager', 'staff', 'volunteer'];
      if (validRoles.includes(profile.role)) {
        fetchDashboardData();
      } else {
        // Unknown role - clear loading states and show error
        console.error('[Dashboard] Unknown role:', profile.role);
        setStatsLoading(false);
        setListsLoading(false);
        setFocusLoading(false);
        toast({
          title: "Access Error",
          description: `Role "${profile.role}" is not recognized. Please contact an administrator.`,
          variant: "destructive"
        });
      }
    } else if (user && !profile) {
      // If profile is missing but user exists, we wait or specific error UI handles it
      // We can ensure loaders are off if we aren't going to fetch
      setStatsLoading(false);
      setListsLoading(false);
      setFocusLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, authLoading]);

  // Real-time subscription for tasks - syncs changes across devices
  useEffect(() => {
    if (!user || authLoading) return;

    const supabase = createClient();
    let taskChannel: RealtimeChannel | null = null;
    let clientChannel: RealtimeChannel | null = null;
    let alertChannel: RealtimeChannel | null = null;

    const setupRealtimeSubscription = () => {
      // Tasks realtime subscription
      taskChannel = supabase
        .channel('dashboard-tasks-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
          },
          (payload: { eventType: string; new: OpenTask; old: { id: string; status?: string; assigned_to?: string } }) => {
            console.log('[Realtime] Task change detected:', payload.eventType);

            if (payload.eventType === 'INSERT') {
              const newTask = payload.new as OpenTask;
              // Add to open tasks if unassigned
              if (!newTask.assigned_to) {
                setOpenTasksToClaim(prev => [newTask, ...prev]);
                setStats(prev => ({ ...prev, openTasks: prev.openTasks + 1 }));
              }
              // Add to deadlines if assigned to current user and has due date
              if (newTask.assigned_to === user.id && newTask.due_date) {
                setDeadlines(prev => [{
                  id: newTask.id,
                  title: newTask.title,
                  due_date: newTask.due_date,
                  priority: newTask.priority,
                }, ...prev].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
              }
              // Show toast for new tasks
              toast({
                title: "New Task",
                description: `Task "${newTask.title}" was created`,
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedTask = payload.new as OpenTask;
              const oldTask = payload.old as { id: string; status?: string; assigned_to?: string };

              // If task was completed, remove from lists
              if (updatedTask.status === 'completed') {
                setDeadlines(prev => prev.filter(d => d.id !== updatedTask.id));
                setOpenTasksToClaim(prev => prev.filter(t => t.id !== updatedTask.id));
                setFocusItems(prev => prev.filter(f => f.id !== updatedTask.id));
              }
              // If task was claimed by someone else, remove from open tasks
              if (updatedTask.assigned_to && !oldTask.assigned_to) {
                setOpenTasksToClaim(prev => prev.filter(t => t.id !== updatedTask.id));
                setStats(prev => ({ ...prev, openTasks: Math.max(0, prev.openTasks - 1) }));
              }
              // If task was assigned to current user, add to deadlines
              if (updatedTask.assigned_to === user.id && oldTask.assigned_to !== user.id && updatedTask.due_date) {
                setDeadlines(prev => {
                  if (prev.some(d => d.id === updatedTask.id)) return prev;
                  return [{
                    id: updatedTask.id,
                    title: updatedTask.title,
                    due_date: updatedTask.due_date,
                    priority: updatedTask.priority,
                  }, ...prev].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
                });
                toast({
                  title: "Task Assigned",
                  description: `"${updatedTask.title}" was assigned to you`,
                });
              }
            } else if (payload.eventType === 'DELETE') {
              const deletedId = (payload.old as { id: string }).id;
              setDeadlines(prev => prev.filter(d => d.id !== deletedId));
              setOpenTasksToClaim(prev => prev.filter(t => t.id !== deletedId));
              setFocusItems(prev => prev.filter(f => f.id !== deletedId));
            }
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] Subscribed to tasks channel');
            setIsRealtimeConnected(true);
          }
        });

      // Clients realtime subscription for stats updates
      clientChannel = supabase
        .channel('dashboard-clients-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'clients' },
          (payload: { eventType: string; new: { id: string; first_name: string; last_name: string; created_at: string; onboarding_status?: string; status?: string } }) => {
            console.log('[Realtime] Client change detected:', payload.eventType);
            if (payload.eventType === 'INSERT') {
              const newClient = payload.new;
              setStats(prev => ({ ...prev, totalClients: prev.totalClients + 1, activeClients: prev.activeClients + 1 }));
              if (newClient.onboarding_status === 'registered') {
                setNewSelfRegistrations(prev => [{ id: newClient.id, first_name: newClient.first_name, last_name: newClient.last_name, created_at: newClient.created_at }, ...prev].slice(0, 5));
                setOnboardingCounts(prev => ({ ...prev, registered: prev.registered + 1 }));
              }
              toast({ title: "New Client", description: `${newClient.first_name} ${newClient.last_name} was added` });
            } else if (payload.eventType === 'UPDATE') {
              // Refresh stats on client updates
              const updatedClient = payload.new;
              if (updatedClient.status === 'inactive') {
                setStats(prev => ({ ...prev, activeClients: Math.max(0, prev.activeClients - 1) }));
              }
            }
          }
        )
        .subscribe();

      // Alerts realtime subscription
      alertChannel = supabase
        .channel('dashboard-alerts-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'alerts', filter: `user_id=eq.${user.id}` },
          (payload: { eventType: string; new: { id: string; title: string; is_read: boolean } }) => {
            console.log('[Realtime] Alert change detected:', payload.eventType);
            if (payload.eventType === 'INSERT') {
              const newAlert = payload.new;
              if (!newAlert.is_read) {
                setStats(prev => ({ ...prev, unreadAlerts: prev.unreadAlerts + 1 }));
              }
              toast({ title: "New Alert", description: newAlert.title });
            } else if (payload.eventType === 'UPDATE') {
              const updatedAlert = payload.new;
              if (updatedAlert.is_read) {
                setStats(prev => ({ ...prev, unreadAlerts: Math.max(0, prev.unreadAlerts - 1) }));
              }
            }
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      setIsRealtimeConnected(false);
      if (taskChannel) supabase.removeChannel(taskChannel);
      if (clientChannel) supabase.removeChannel(clientChannel);
      if (alertChannel) supabase.removeChannel(alertChannel);
    };
  }, [user, authLoading, toast]);

  const fetchDashboardData = async () => {
    if (!user) return;

    // Set all loading states at start
    setStatsLoading(true);
    setListsLoading(true);
    setFocusLoading(true);

    const supabase = createClient();
    console.log('[Dashboard] Fetching dashboard data for user:', user.id, 'role:', profile?.role);

    try {
      // 1. Fetch Stats (Parallel)
      const nowIso = new Date().toISOString();
      const statsPromise = supabase.rpc('dashboard_summary', { current_user_id: user?.id });

      // 2. Fetch Lists (Parallel)
      const listsPromise = Promise.all([
        supabase.from('tasks').select(`
            id, title, due_date, priority, clients (first_name, last_name)
          `).not('due_date', 'is', null).gte('due_date', nowIso).order('due_date', { ascending: true }).limit(5),
        supabase.from('tasks').select(`
            id, title, description, priority, due_date, clients (first_name, last_name)
          `).is('assigned_to', null).eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
        // Fetch staff
        supabase.from('profiles').select('id, first_name, last_name').neq('role', 'client').order('first_name'),
        // Recent self-registrations
        supabase.from('clients').select('id, first_name, last_name, created_at').eq('onboarding_status', 'registered').order('created_at', { ascending: false }).limit(5)
      ]);

      // 3. Fetch Focus Items (Parallel)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowISO = tomorrow.toISOString();

      const focusPromise = Promise.all([
        supabase.from('tasks').select(`
            id, title, description, priority, due_date, status, clients (*)
          `).eq('assigned_to', user?.id).in('status', ['pending', 'in_progress']).order('due_date', { ascending: true }).limit(10),
        supabase.from('calendar_events').select(`
            id, title, start_time, description, clients (*)
          `).gte('start_time', todayISO).lt('start_time', tomorrowISO).order('start_time', { ascending: true }).limit(5),
        supabase.from('alerts').select(`
            id, title, message, alert_type, created_at, clients (*)
          `).eq('user_id', user?.id).eq('is_read', false).order('created_at', { ascending: false }).limit(5)
      ]);

      // Execute all major groups in parallel
      const [statsResults, listsResults, focusResults] = await Promise.all([
        statsPromise,
        listsPromise,
        focusPromise
      ]);

      // Log any errors from stats query
      if (statsResults.error) {
        console.error('[Dashboard] Stats query error:', statsResults.error);
      }

      // Log any errors from lists queries
      listsResults.forEach((result, index) => {
        if (result.error) {
          console.error(`[Dashboard] Lists query ${index} error:`, result.error);
        }
      });

      // Log any errors from focus queries
      focusResults.forEach((result, index) => {
        if (result.error) {
          console.error(`[Dashboard] Focus query ${index} error:`, result.error);
        }
      });

      // --- Process Stats ---
      const statsPayload = statsResults.data as {
        totalClients?: number;
        activeClients?: number;
        pendingTasks?: number;
        openTasks?: number;
        upcomingEvents?: number;
        unreadAlerts?: number;
        registered?: number;
        profile?: number;
        engagement?: number;
        intake?: number;
        intakeIncomplete?: number;
      } | null;

      setStats({
        totalClients: statsPayload?.totalClients || 0,
        activeClients: statsPayload?.activeClients || 0,
        pendingTasks: statsPayload?.pendingTasks || 0,
        openTasks: statsPayload?.openTasks || 0,
        upcomingEvents: statsPayload?.upcomingEvents || 0,
        unreadAlerts: statsPayload?.unreadAlerts || 0,
      });

      setOnboardingCounts({
        registered: statsPayload?.registered || 0,
        profile: statsPayload?.profile || 0,
        engagement: statsPayload?.engagement || 0,
        intake: statsPayload?.intake || 0,
      });
      setIntakeIncompleteCount(statsPayload?.intakeIncomplete || 0);

      // --- Process Lists ---
      const [
        { data: deadlineData },
        { data: openTasksData },
        { data: staffData },
        { data: selfRegistrationData }
      ] = listsResults;

      if (deadlineData) {
        type DeadlineRow = { id: string; title: string; due_date: string; priority: string; clients?: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null };
        setDeadlines((deadlineData as unknown as DeadlineRow[]).map((d) => {
          const client = Array.isArray(d.clients) ? d.clients[0] : d.clients;
          return {
            id: d.id,
            title: d.title,
            due_date: d.due_date,
            priority: d.priority,
            client_name: client ? `${client.first_name} ${client.last_name}` : undefined,
          };
        }));
      }

      if (openTasksData) {
        setOpenTasksToClaim((openTasksData as Array<{ id: string; title: string; description?: string | null; priority: string; due_date: string; client_id?: string | null; assigned_to?: string | null; status?: string | null; clients?: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null }>).map((task) => ({
          ...task,
          clients: Array.isArray(task.clients) ? task.clients[0] : task.clients
        })) as OpenTask[]);
      }

      if (staffData) {
        setStaffMembers((staffData as Array<{ id: string; first_name: string; last_name: string }>).map((staffMember) => ({
          id: staffMember.id,
          name: `${staffMember.first_name} ${staffMember.last_name}`
        })));
      }

      if (selfRegistrationData) {
        setNewSelfRegistrations(selfRegistrationData as Array<{ id: string; first_name: string; last_name: string; created_at: string }>);
      }

      // --- Process Focus Items ---
      const [
        focusTasks,
        focusEvents,
        focusAlerts
      ] = focusResults;

      const focus: FocusItem[] = [];

      if (focusTasks.data) {
        (focusTasks.data as Array<{ id: string; title: string; description?: string | null; due_date?: string | null; priority?: string | null; status?: string | null; clients?: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null }>).forEach((task) => {
          const client = Array.isArray(task.clients) ? task.clients[0] : task.clients;
          const isOverdue = task.due_date && toPacificDate(task.due_date) < getPacificNow();
          focus.push({
            id: task.id,
            type: 'task',
            title: task.title,
            description: task.description ?? undefined,
            time: task.due_date ?? undefined,
            priority: isOverdue ? 'urgent' : (task.priority || 'medium') as 'urgent' | 'high' | 'medium' | 'low',
            client_name: client ? `${client.first_name} ${client.last_name}` : undefined,
            status: task.status ?? undefined,
          });
        });
      }

      if (focusEvents.data) {
        (focusEvents.data as Array<{ id: string; title: string; description?: string | null; start_time: string; clients?: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null }>).forEach((event) => {
          const client = Array.isArray(event.clients) ? event.clients[0] : event.clients;
          focus.push({
            id: event.id,
            type: 'event',
            title: event.title,
            description: event.description ?? undefined,
            time: event.start_time,
            priority: 'medium',
            client_name: client ? `${client.first_name} ${client.last_name}` : undefined,
          });
        });
      }

      if (focusAlerts.data) {
        (focusAlerts.data as Array<{ id: string; title: string; message?: string | null; created_at: string; alert_type?: string | null; clients?: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null }>).forEach((alert) => {
          const client = Array.isArray(alert.clients) ? alert.clients[0] : alert.clients;
          focus.push({
            id: alert.id,
            type: 'alert',
            title: alert.title,
            description: alert.message ?? undefined,
            time: alert.created_at,
            priority: alert.alert_type === 'deadline' ? 'urgent' : 'high',
            client_name: client ? `${client.first_name} ${client.last_name}` : undefined,
          });
        });
      }

      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      focus.sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]);
      setFocusItems(focus);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error loading dashboard",
        description: "Some data may be missing. Please refresh.",
        variant: "destructive"
      });
    } finally {
      // Ensure ALL loading states are cleared guarantees
      setStatsLoading(false);
      setListsLoading(false);
      setFocusLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    // Optimistic update - immediately remove from UI
    const previousDeadlines = [...deadlines];
    const previousFocusItems = [...focusItems];

    setDeadlines(prev => prev.filter(d => d.id !== taskId));
    setFocusItems(prev => prev.filter(f => f.id !== taskId));
    setStats(prev => ({ ...prev, pendingTasks: Math.max(0, prev.pendingTasks - 1) }));

    try {
      const result = await completeTask(taskId);
      if (result.success) {
        // Trigger confetti (lazy-loaded)
        celebrateSuccess();

        toast({
          title: "Task Completed",
          description: "Good job! Task marked as done.",
        });
      } else {
        // Rollback on failure
        setDeadlines(previousDeadlines);
        setFocusItems(previousFocusItems);
        setStats(prev => ({ ...prev, pendingTasks: prev.pendingTasks + 1 }));

        toast({
          title: "Error",
          description: result.error || "Failed to complete task",
          variant: "destructive"
        });
      }
    } catch (error) {
      // Rollback on error
      setDeadlines(previousDeadlines);
      setFocusItems(previousFocusItems);
      setStats(prev => ({ ...prev, pendingTasks: prev.pendingTasks + 1 }));

      console.error("Error completing task:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const handleClaimTask = async (taskId: string) => {
    // Optimistic update - move from open tasks to claimed
    const previousOpenTasks = [...openTasksToClaim];
    const claimedTask = openTasksToClaim.find(t => t.id === taskId);

    setOpenTasksToClaim(prev => prev.filter(t => t.id !== taskId));
    setStats(prev => ({ ...prev, openTasks: Math.max(0, prev.openTasks - 1) }));

    try {
      const result = await claimTask(taskId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Task claimed successfully",
        });

        // Add to deadlines if it has a due date
        if (claimedTask?.due_date) {
          const clientName = claimedTask.clients
            ? `${claimedTask.clients.first_name} ${claimedTask.clients.last_name}`
            : undefined;
          setDeadlines(prev => [{
            id: claimedTask.id,
            title: claimedTask.title,
            due_date: claimedTask.due_date,
            priority: claimedTask.priority,
            client_name: clientName,
          }, ...prev].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
        }
      } else {
        // Rollback on failure
        setOpenTasksToClaim(previousOpenTasks);
        setStats(prev => ({ ...prev, openTasks: prev.openTasks + 1 }));

        toast({
          title: "Error",
          description: result.error || "Failed to claim task",
          variant: "destructive"
        });
      }
    } catch (error) {
      // Rollback on error
      setOpenTasksToClaim(previousOpenTasks);
      setStats(prev => ({ ...prev, openTasks: prev.openTasks + 1 }));

      console.error("Error claiming task:", error);
      toast({
        title: "Error",
        description: "Failed to claim task",
        variant: "destructive"
      });
    }
  };

  const handleAssignTask = async (taskId: string, staffId: string) => {
    try {
      const result = await assignTask(taskId, staffId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Task assigned successfully",
        });
        fetchDashboardData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to assign task",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error assigning task:", error);
      toast({
        title: "Error",
        description: "Failed to assign task",
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      // Always redirect to login, even if signOut fails
      window.location.href = '/login';
    }
  };

  // Show auth error state with retry option
  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Dashboard" showBackButton={false} />
        <main className="container px-4 py-6 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-5 w-5" />
                Connection Issue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                We had trouble connecting to the authentication service. This is usually temporary.
              </p>
              <p className="text-sm text-gray-500">
                Error: {authError}
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={retryAuth} className="w-full">
                  Try Again
                </Button>
                <Button onClick={() => router.push('/login')} variant="outline" className="w-full">
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Dashboard" showBackButton={false} />
        <main className="container px-4 py-6 max-w-7xl mx-auto">
          <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If no user after loading completes, the useEffect will redirect to login
  // Just return null here to prevent rendering while redirect happens
  if (!user) {
    return null;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Dashboard" showBackButton={false} />
        <main className="container px-4 py-6 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Profile Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                We could not find a profile associated with your account. This may happen if your account creation did not complete successfully.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={retryAuth} variant="outline">
                  Retry
                </Button>
                <Button onClick={handleSignOut} variant="destructive">
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isAdmin = profile.role === 'admin';
  const isCaseManager = profile.role === 'case_manager';
  const isClient = profile.role === 'client';
  const canViewClients = canAccessFeature(profile.role, 'case_manager');
  const canCreateIntake = canAccessFeature(profile.role, 'case_manager');
  const canViewCalendar = canAccessFeature(profile.role, 'case_manager');
  const canViewTasks = canAccessFeature(profile.role, 'case_manager');
  const canViewDocuments = canAccessFeature(profile.role, 'case_manager');
  const canViewAdmin = isAdmin;

  const getPriorityBadge = (priority: string, status?: string) => {
    if (status === 'in_progress') {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">In Progress</Badge>;
    }
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
        return <Badge variant="secondary" className="capitalize">{priority}</Badge>;
    }
  };

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gray-50">
      {/* Daily Triage Mode Overlay */}
      <DailyTriageMode
        isOpen={showTriage && !isClient && !statsLoading}
        onClose={closeTriage}
        userName={profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'there'}
        urgentTasks={focusItems
          .filter(item => item.type === 'task' && ['urgent', 'high'].includes(item.priority))
          .map(item => ({
            id: item.id,
            title: item.title,
            clientName: item.client_name,
            priority: item.priority as 'urgent' | 'high' | 'medium',
            dueDate: item.time,
            completed: triageTasksChecked.has(item.id),
          }))}
        alerts={focusItems
          .filter(item => item.type === 'alert')
          .map(item => ({
            id: item.id,
            message: item.title,
            type: item.priority === 'urgent' ? 'urgent' as const : 'warning' as const,
          }))}
        appointmentsToday={focusItems.filter(item => item.type === 'event').length}
        pendingFollowUps={stats.pendingTasks}
        onTaskToggle={(taskId, checked) => {
          setTriageTasksChecked(prev => {
            const next = new Set(prev);
            if (checked) next.add(taskId);
            else next.delete(taskId);
            return next;
          });
        }}
        onStartDay={completeTriage}
      />

      <AppHeader
        title={t('dashboard.title')}
        showBackButton={false}
        alertCount={stats.unreadAlerts}
      />

      <main className="container px-4 py-6 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {t('auth.welcomeBack')}, {profile.first_name}!
              </h1>
              {/* Live indicator */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={`${isRealtimeConnected ? 'border-green-500 text-green-600 bg-green-50' : 'border-gray-300 text-gray-400'}`}
                  >
                    {isRealtimeConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                    Live
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isRealtimeConnected ? 'Realtime sync active - changes from other users appear automatically' : 'Connecting to realtime...'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-gray-600 mt-1">
              {isClient
                ? t('dashboard.clientWelcome')
                : t('dashboard.staffWelcome')
              }
            </p>
            <Badge variant="outline" className="mt-2 capitalize">
              {profile.role.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex gap-2">
            {/* Start Day button for staff */}
            {!isClient && (
              <Button variant="outline" onClick={openTriage} className="gap-2">
                <Sun className="h-4 w-4" />
                <span className="hidden sm:inline">Start Day</span>
              </Button>
            )}
            {canCreateIntake && (
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <NextLink href="/client-intake">
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('dashboard.newIntake')}
                </NextLink>
              </Button>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('auth.signOut')}
            </Button>
          </div>
        </div>

        {/* Get Started State for New Accounts (0 Clients) */}
        {!isClient && !authLoading && !statsLoading && stats.totalClients === 0 && (
          <div className="mb-10">
            <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white overflow-hidden relative">
              {/* Background pattern */}
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Users className="h-64 w-64 text-blue-600" />
              </div>

              <CardContent className="p-8 relative z-10">
                <div className="max-w-xl">
                  <div className="bg-blue-600 text-white p-3 rounded-lg inline-block mb-4 shadow-lg shadow-blue-200">
                    <Plus className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Let&apos;s get you started!</h2>
                  <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                    Your dashboard is looking a little empty. The first step to managing your practice is adding your first client. It only takes a minute.
                  </p>

                  <div className="flex gap-4">
                    <Button
                      size="lg"
                      onClick={() => router.push('/client-intake')}
                      className="shadow-lg shadow-blue-200 hover:shadow-xl transition-all"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Add Your First Client
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => router.push('/clients')}
                    >
                      Explore Clients
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Client-specific: Language Selector and Profile Completion Prompt */}
        {isClient && (
          <div className="space-y-4 mb-8">
            {/* Language Selector */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t('dashboard.languagePref')}</p>
                    <p className="text-xs text-gray-500">{t('dashboard.selectLang')}</p>
                  </div>
                  <LanguageSelector />
                </div>
              </CardContent>
            </Card>

            {/* Profile Completion Prompt - Show if there are pending profile/intake tasks */}
            {clientTasks.some((task: ClientTask) =>
              task.title.toLowerCase().includes('profile') ||
              task.title.toLowerCase().includes('intake')
            ) && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-amber-900">{t('dashboard.completeProfile')}</p>
                        <p className="text-sm text-amber-700 mt-1">
                          {t('dashboard.completeProfileDesc')}
                        </p>
                        <Button asChild
                          className="mt-3 w-full bg-amber-600 hover:bg-amber-700"
                          size="sm"
                        >
                          <NextLink href="/profile-completion">
                            {t('dashboard.profileAction')}
                          </NextLink>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>
        )}

        {/* Stats Cards - Client-specific */}
        {isClient && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('dashboard.activeTasks')}</p>
                    <div className="text-2xl font-bold text-orange-600">
                      {statsLoading ? <Skeleton className="h-8 w-12" /> : stats.pendingTasks}
                    </div>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <CheckSquare className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('dashboard.appointments')}</p>
                    <div className="text-2xl font-bold text-purple-600">
                      {statsLoading ? <Skeleton className="h-8 w-12" /> : stats.upcomingEvents}
                    </div>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats Cards - Only show for staff roles */}
        {!isClient && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('dashboard.totalClients')}</p>
                    <div className="text-2xl font-bold text-gray-900">
                      {statsLoading ? <Skeleton className="h-8 w-12" /> : stats.totalClients}
                    </div>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('dashboard.activeClients')}</p>
                    <div className="text-2xl font-bold text-green-600">
                      {statsLoading ? <Skeleton className="h-8 w-12" /> : stats.activeClients}
                    </div>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('dashboard.myTasks')}</p>
                    <div className="text-2xl font-bold text-orange-600">
                      {statsLoading ? <Skeleton className="h-8 w-12" /> : stats.pendingTasks}
                    </div>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <CheckSquare className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('dashboard.openTasks')}</p>
                    <div className="text-2xl font-bold text-purple-600">
                      {statsLoading ? <Skeleton className="h-8 w-12" /> : stats.openTasks}
                    </div>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Hand className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Today's Focus Section - Staff Only */}
        {!isClient && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-blue-600" />
              Today&apos;s Focus
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    New Self-Registrations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {listsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-10" />
                      ))}
                    </div>
                  ) : newSelfRegistrations.length > 0 ? (
                    <div className="space-y-2">
                      {newSelfRegistrations.map((client) => (
                        <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                          <div>
                            <p className="font-medium text-gray-900">
                              {client.first_name} {client.last_name}
                            </p>
                            <p className="text-xs text-gray-500">Registered {formatPacificFriendly(client.created_at, true)}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => router.push(`/clients/${client.id}`)}>
                            Review
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No new self-registrations today.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Onboarding Pipeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Registered</span>
                    <span className="font-semibold">{onboardingCounts.registered}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Profile</span>
                    <span className="font-semibold">{onboardingCounts.profile}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Engagement</span>
                    <span className="font-semibold">{onboardingCounts.engagement}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Intake</span>
                    <span className="font-semibold">{onboardingCounts.intake}</span>
                  </div>
                  <div className="pt-2 border-t text-sm flex items-center justify-between">
                    <span>Intake incomplete</span>
                    <span className="font-semibold text-orange-600">{intakeIncompleteCount}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {focusLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : focusItems.length === 0 ? (
              <Card className="bg-gray-50 border-dashed">
                <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                  <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                  <p className="text-gray-500 max-w-sm mt-1 mb-4">
                    You have no urgent tasks, alerts, or events requiring immediate attention.
                  </p>
                  <Button variant="outline" onClick={() => router.push('/tasks')}>
                    View All Tasks
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <AnimatedFocusItems
                items={focusItems}
                formatTime={formatPacificFriendly}
                getPriorityBadge={getPriorityBadge}
              />
              {focusItems.length > 3 && (
                <div className="mt-4 text-center">
                  <Button 
                    variant="link" 
                    className="text-blue-600"
                    onClick={() => router.push('/command-center')}
                  >
                    View all {focusItems.length} items →
                  </Button>
                </div>
              )}
              </>
            )}
          </div>
        )}


        {/* Navigation Tiles */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quickActions')}</h2>
        <NavigationTileGrid>
          {/* Command Center - Primary action for staff */}
          <NavigationTile
            title="Command Center"
            description="All tasks, events & alerts"
            icon={Bell}
            href="/command-center"
            color="red"
            badge={stats.pendingTasks + stats.unreadAlerts > 0 ? stats.pendingTasks + stats.unreadAlerts : undefined}
            minimumRole="staff"
            userRole={profile.role}
          />
          <NavigationTile
            title={t('clients.title')}
            description="View and manage client records"
            icon={Users}
            href="/clients"
            color="blue"
            badge={stats.totalClients > 0 ? stats.totalClients : undefined}
            minimumRole="case_manager"
            userRole={profile.role}
          />
          <NavigationTile
            title={t('calendar.title')}
            description="Appointments and deadlines"
            icon={Calendar}
            href="/calendar"
            color="purple"
            badge={stats.upcomingEvents > 0 ? stats.upcomingEvents : undefined}
            minimumRole="case_manager"
            userRole={profile.role}
          />
          <NavigationTile
            title={t('tasks.title')}
            description={isCaseManager || isAdmin ? "View & claim open tasks" : "Manage tasks"}
            icon={CheckSquare}
            href="/tasks"
            color="orange"
            badge={stats.pendingTasks > 0 ? stats.pendingTasks : undefined}
            minimumRole="case_manager"
            userRole={profile.role}
          />
          {stats.openTasks > 0 && (
            <NavigationTile
              title={t('tasks.openToClaim')}
              description="Claim available tasks"
              icon={Hand}
              href="/tasks?filter=open"
              color="cyan"
              badge={stats.openTasks}
              allowedRoles={['admin', 'case_manager']}
              userRole={profile.role}
            />
          )}
          <NavigationTile
            title={t('documents.title')}
            description="Document management"
            icon={FileText}
            href="/documents"
            color="amber"
            minimumRole="case_manager"
            userRole={profile.role}
          />
          <NavigationTile
            title={t('admin.title')}
            description="User management & settings"
            icon={Settings}
            href="/admin"
            color="gray"
            allowedRoles={['admin']}
            userRole={profile.role}
          />
        </NavigationTileGrid>

        {/* Client Dashboard Section - Tasks and Appointments */}
        {isClient && (
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {/* My Tasks */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-orange-500" />
                  {t('dashboard.myTasks')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {focusLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : clientTasks.length > 0 ? (
                  <div className="space-y-3">
                    {clientTasks.map((task: ClientTask) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-gray-500 line-clamp-1">{task.description}</p>
                          )}
                          {task.due_date && (
                            <p className="text-xs text-gray-400 mt-1">
                              {formatPacificDueDate(task.due_date)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(task.priority, task.status)}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-green-600"
                            onClick={() => handleCompleteTask(task.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">{t('dashboard.noActiveTasks')}</p>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Appointments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  {t('dashboard.upcomingAppointments')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {focusLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : clientEvents.length > 0 ? (
                  <div className="space-y-3">
                    {clientEvents.map((event: ClientEvent) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{event.title}</p>
                          <p className="text-xs text-gray-500">
                            {formatPacificFriendly(event.start_time, true)}
                          </p>
                          {event.location && (
                            <p className="text-xs text-gray-400 mt-1">{event.location}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">{t('dashboard.noAppointments')}</p>
                )}
              </CardContent>
            </Card>

            {/* My Documents */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-amber-500" />
                  My Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {focusLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : clientDocuments.length > 0 ? (
                  <div className="space-y-2">
                    {clientDocuments.map((doc: { id: string; file_name: string; document_type: string; created_at: string }) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 text-sm truncate">{doc.file_name}</p>
                            <p className="text-xs text-gray-500">
                              {formatPacificFriendly(doc.created_at)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0 ml-2">
                          {doc.document_type?.replace(/_/g, ' ') || 'Document'}
                        </Badge>
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 mt-4 text-center">
                      Your documents are securely stored
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-6">No documents yet</p>
                )}
              </CardContent>
            </Card>

            {/* Case History (Checkpoints) */}
            <Card className="md:col-span-2 print:hidden">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  My Case History & Progress
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
                  <Printer className="w-4 h-4" />
                  {t('common.print') || 'Print'}
                </Button>
              </CardHeader>
              <CardContent>
                {focusLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => <Skeleton key={i} className="h-24" />)}
                  </div>
                ) : (
                  <ClientHistory history={clientInteractions} isCompact />
                )}
              </CardContent>
            </Card>

            {/* Printable View - only shown during print */}
            <div className="hidden print:block md:col-span-2">
              {currentClient && (
                <PrintableCaseHistory
                  client={currentClient}
                  history={clientInteractions}
                  tasks={clientTasks as Array<{ id: string; title: string; description?: string; status: string; due_date?: string }>}
                />
              )}
            </div>
          </div>
        )}

        {/* Bottom Section - Deadlines and Activity (Staff Only) */}
        {!isClient && (
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-red-500" />
                  {t('dashboard.upcomingDeadlines')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {listsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : deadlines.length > 0 ? (
                  <div className="space-y-3">
                    {deadlines.map((deadline) => (
                      <div
                        key={deadline.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{deadline.title}</p>
                          <p className="text-xs text-gray-500">
                            {deadline.client_name && `${deadline.client_name} • `}
                            {formatPacificDueDate(deadline.due_date)}
                          </p>
                        </div>
                        {getPriorityBadge(deadline.priority)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">No upcoming deadlines</p>
                )}
              </CardContent>
            </Card>

            {/* Open Tasks to Claim */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Hand className="h-5 w-5 text-blue-500" />
                  Open Tasks to Claim
                </CardTitle>
              </CardHeader>
              <CardContent>
                {listsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton className="h-20 w-full" key={i} />
                    ))}
                  </div>
                ) : openTasksToClaim.length > 0 ? (
                  <div className="space-y-3">
                    {openTasksToClaim.map((task) => (
                      <div
                        key={task.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-gray-100 rounded-lg hover:border-blue-200 hover:shadow-sm transition-all"
                      >
                        <div className="flex-1 min-w-0 mb-3 sm:mb-0 mr-4">
                          <div className="flex items-center gap-2 mb-1">
                            {getPriorityBadge(task.priority)}
                            {task.due_date && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${toPacificDate(task.due_date) < getPacificNow() ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                                {formatPacificDueDate(task.due_date)}
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-gray-900 truncate">
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{task.description}</p>
                          )}
                          {task.clients && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                              <Users className="h-3 w-3" />
                              <span>{task.clients.first_name} {task.clients.last_name}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 mt-2 sm:mt-0">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 shadow-sm"
                            onClick={() => handleClaimTask(task.id)}
                          >
                            Claim Task
                          </Button>
                          <Select onValueChange={(val) => handleAssignTask(task.id, val)}>
                            <SelectTrigger className="h-9 w-[110px] text-xs bg-gray-50 border-gray-200">
                              <SelectValue placeholder="Assign To..." />
                            </SelectTrigger>
                            <SelectContent>
                              {staffMembers.map((s: { id: string; name: string }) => (
                                <SelectItem key={s.id} value={s.id} className="text-xs">
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-3 opacity-50" />
                    <p className="text-gray-900 font-medium">All caught up!</p>
                    <p className="text-sm text-gray-500 mt-1">There are no open tasks to claim right now.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
    </TooltipProvider>
  );
}
