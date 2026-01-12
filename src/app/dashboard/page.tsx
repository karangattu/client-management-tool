'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { AnimatePresence, motion } from "framer-motion";
import { NavigationTile, NavigationTileGrid } from '@/components/layout/NavigationTile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth, canAccessFeature } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
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
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useToast } from "@/components/ui/use-toast";
import { LanguageSelector } from '@/components/ui/language-selector';
import { useLanguage } from '@/lib/language-context';
import { completeTask, claimTask, assignTask } from '@/app/actions/tasks';
import { getClientHistory, InteractionType } from '@/app/actions/history';
import { getAllUsers } from '@/app/actions/users';
import { ClientHistory } from '@/components/clients/ClientHistory';
import { PrintableCaseHistory } from '@/components/clients/PrintableCaseHistory';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    pendingTasks: 0,
    openTasks: 0,
    upcomingEvents: 0,
    unreadAlerts: 0,
  });
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [openTasksToClaim, setOpenTasksToClaim] = useState<OpenTask[]>([]);
  const [clientTasks, setClientTasks] = useState<ClientTask[]>([]);
  const [clientEvents, setClientEvents] = useState<ClientEvent[]>([]);
  const [clientInteractions, setClientInteractions] = useState<Interaction[]>([]);
  const [clientDocuments, setClientDocuments] = useState<Array<{ id: string; file_name: string; document_type: string; status?: string; created_at: string; file_path: string }>>([]);
  const [currentClient, setCurrentClient] = useState<{ id: string; first_name: string; last_name: string;[key: string]: unknown } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [listsLoading, setListsLoading] = useState(true);
  const [focusLoading, setFocusLoading] = useState(true);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [focusItems, setFocusItems] = useState<FocusItem[]>([]);
  const { t } = useLanguage();
  const { toast } = useToast();

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
      fetchDashboardData();
    } else if (user && !profile) {
      // If profile is missing but user exists, we wait or specific error UI handles it
      // We can ensure loaders are off if we aren't going to fetch
      setStatsLoading(false);
      setListsLoading(false);
      setFocusLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, authLoading]);

  const fetchDashboardData = async () => {
    if (!user) return;

    // Set all loading states at start
    setStatsLoading(true);
    setListsLoading(true);
    setFocusLoading(true);

    const supabase = createClient();

    try {
      // 1. Fetch Stats (Parallel)
      const statsPromise = Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('assigned_to', user?.id).in('status', ['pending', 'in_progress']),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).is('assigned_to', null).eq('status', 'pending'),
        supabase.from('calendar_events').select('*', { count: 'exact', head: true }).gte('start_time', new Date().toISOString()),
        supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('user_id', user?.id).eq('is_read', false),
      ]);

      // 2. Fetch Lists (Parallel)
      const listsPromise = Promise.all([
        supabase.from('tasks').select(`
            id, title, due_date, priority, clients (*)
          `).not('due_date', 'is', null).gte('due_date', new Date().toISOString()).order('due_date', { ascending: true }).limit(5),
        supabase.from('tasks').select(`
            id, title, description, priority, due_date, clients (*)
          `).is('assigned_to', null).eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
        // Fetch staff
        supabase.from('profiles').select('id, first_name, last_name').neq('role', 'client').order('first_name')
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
          `).eq('assigned_to', user?.id).in('status', ['pending', 'in_progress']).or(`due_date.lte.${tomorrowISO}`).order('due_date', { ascending: true }).limit(10),
        supabase.from('calendar_events').select(`
            id, title, start_time, description, clients (*)
          `).gte('start_time', todayISO).lt('start_time', tomorrowISO).order('start_time', { ascending: true }).limit(5),
        supabase.from('alerts').select(`
            id, title, message, priority, created_at, clients (*)
          `).eq('user_id', user?.id).eq('is_read', false).order('created_at', { ascending: false }).limit(5)
      ]);

      // Execute all major groups in parallel
      const [statsResults, listsResults, focusResults] = await Promise.all([
        statsPromise,
        listsPromise,
        focusPromise
      ]);

      // --- Process Stats ---
      const [
        { count: totalClients },
        { count: activeClients },
        { count: pendingTasks },
        { count: openTasks },
        { count: upcomingEvents },
        { count: unreadAlerts }
      ] = statsResults;

      setStats({
        totalClients: totalClients || 0,
        activeClients: activeClients || 0,
        pendingTasks: pendingTasks || 0,
        openTasks: openTasks || 0,
        upcomingEvents: upcomingEvents || 0,
        unreadAlerts: unreadAlerts || 0,
      });

      // --- Process Lists ---
      const [
        { data: deadlineData },
        { data: openTasksData },
        { data: staffData }
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
        setOpenTasksToClaim((openTasksData as any[]).map(task => ({
          ...task,
          clients: Array.isArray(task.clients) ? task.clients[0] : task.clients
        })) as OpenTask[]);
      }

      if (staffData) {
        setStaff(staffData.map(u => ({
          id: u.id,
          name: `${u.first_name} ${u.last_name}`
        })));
      }

      // --- Process Focus Items ---
      const [
        { data: urgentTasks },
        { data: todayEvents },
        { data: activeAlerts }
      ] = focusResults;

      const focus: FocusItem[] = [];

      if (urgentTasks) {
        (urgentTasks as any[]).forEach((task) => {
          const client = Array.isArray(task.clients) ? task.clients[0] : task.clients;
          const isOverdue = task.due_date && new Date(task.due_date) < new Date();
          focus.push({
            id: task.id,
            type: 'task',
            title: task.title,
            description: task.description,
            time: task.due_date ? new Date(task.due_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : undefined,
            priority: isOverdue ? 'urgent' : (task.priority || 'medium') as 'urgent' | 'high' | 'medium' | 'low',
            client_name: client ? `${client.first_name} ${client.last_name}` : undefined,
            status: task.status,
          });
        });
      }

      if (todayEvents) {
        (todayEvents as any[]).forEach((event) => {
          const client = Array.isArray(event.clients) ? event.clients[0] : event.clients;
          focus.push({
            id: event.id,
            type: 'event',
            title: event.title,
            description: event.description,
            time: new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            priority: 'medium',
            client_name: client ? `${client.first_name} ${client.last_name}` : undefined,
          });
        });
      }

      if (activeAlerts) {
        (activeAlerts as any[]).forEach((alert) => {
          const client = Array.isArray(alert.clients) ? alert.clients[0] : alert.clients;
          focus.push({
            id: alert.id,
            type: 'alert',
            title: alert.title,
            description: alert.message,
            time: new Date(alert.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            priority: (alert.priority || 'high') as 'urgent' | 'high' | 'medium' | 'low',
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
    try {
      const result = await completeTask(taskId);
      if (result.success) {
        // Trigger confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        toast({
          title: "Task Completed",
          description: "Good job! Task marked as done.",
        });

        // Optimistic update or refetch
        fetchDashboardData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to complete task",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error completing task:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const handleClaimTask = async (taskId: string) => {
    try {
      const result = await claimTask(taskId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Task claimed successfully",
        });
        fetchDashboardData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to claim task",
          variant: "destructive"
        });
      }
    } catch (error) {
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
    await signOut();
    router.push('/login');
  };

  // Show loading state while auth is loading - THIS IS OKAY TO KEEP BLOCKING
  if (authLoading || !user) {
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
                <Button onClick={() => window.location.reload()} variant="outline">
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
  const isVolunteer = profile.role === 'volunteer';
  const isClient = profile.role === 'client';

  // Role-based tile visibility
  const canViewClients = canAccessFeature(profile.role, 'volunteer');
  const canCreateIntake = canAccessFeature(profile.role, 'staff');
  const canViewCalendar = canAccessFeature(profile.role, 'volunteer');
  const canViewTasks = canAccessFeature(profile.role, 'volunteer');
  const canViewHousing = canAccessFeature(profile.role, 'staff');
  const canViewDocuments = canAccessFeature(profile.role, 'volunteer');
  const canViewAlerts = true; // Everyone can view their alerts
  const canViewAdmin = isAdmin;

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

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
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        title={t('dashboard.title')}
        showBackButton={false}
        alertCount={stats.unreadAlerts}
      />

      <main className="container px-4 py-6 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t('auth.welcomeBack')}, {profile.first_name}!
            </h1>
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
            {clientTasks.some(task =>
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
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {focusItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 p-2 rounded-lg ${item.type === 'task' ? 'bg-blue-100 text-blue-600' :
                          item.type === 'event' ? 'bg-purple-100 text-purple-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                          {item.type === 'task' ? <CheckSquare className="h-4 w-4" /> :
                            item.type === 'event' ? <Calendar className="h-4 w-4" /> :
                              <AlertCircle className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{item.title}</p>
                          {item.description && (
                            <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {item.time && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {item.time}
                              </span>
                            )}
                            {item.client_name && (
                              <span className="text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-100 rounded-full">
                                {item.client_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(item.priority, item.status)}
                        {item.type === 'task' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 rounded-full hover:bg-green-50 hover:text-green-600"
                            onClick={() => handleCompleteTask(item.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>
        )}

        {/* Navigation Tiles */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quickActions')}</h2>
        <NavigationTileGrid>
          {/* Command Center - Primary action for staff */}
          {!isClient && (
            <NavigationTile
              title="Command Center"
              description="All tasks, events & alerts"
              icon={Bell}
              href="/command-center"
              color="red"
              badge={stats.pendingTasks + stats.unreadAlerts > 0 ? stats.pendingTasks + stats.unreadAlerts : undefined}
            />
          )}
          {canViewClients && (
            <NavigationTile
              title={t('clients.title')}
              description="View and manage client records"
              icon={Users}
              href="/clients"
              color="blue"
              badge={stats.totalClients > 0 ? stats.totalClients : undefined}
            />
          )}
          {canViewCalendar && (
            <NavigationTile
              title={t('calendar.title')}
              description="Appointments and deadlines"
              icon={Calendar}
              href="/calendar"
              color="purple"
              badge={stats.upcomingEvents > 0 ? stats.upcomingEvents : undefined}
            />
          )}
          {canViewTasks && (
            <NavigationTile
              title={t('tasks.title')}
              description={isVolunteer || isCaseManager ? "View & claim open tasks" : "Manage tasks"}
              icon={CheckSquare}
              href="/tasks"
              color="orange"
              badge={stats.pendingTasks > 0 ? stats.pendingTasks : undefined}
            />
          )}
          {(isVolunteer || isCaseManager) && stats.openTasks > 0 && (
            <NavigationTile
              title={t('tasks.openToClaim')}
              description="Claim available tasks"
              icon={Hand}
              href="/tasks?filter=open"
              color="cyan"
              badge={stats.openTasks}
            />
          )}
          {canViewDocuments && (
            <NavigationTile
              title={t('documents.title')}
              description="Document management"
              icon={FileText}
              href="/documents"
              color="amber"
            />
          )}
          {canViewAdmin && (
            <NavigationTile
              title={t('admin.title')}
              description="User management & settings"
              icon={Settings}
              href="/admin"
              color="gray"
            />
          )}
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
                    {clientTasks.map((task) => (
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
                              Due: {new Date(task.due_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
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
                    {clientEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{event.title}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(event.start_time).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })} at {new Date(event.start_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
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
                    {clientDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 text-sm truncate">{doc.file_name}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(doc.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
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
                            {new Date(deadline.due_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
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
                              <span className={`text-xs px-2 py-0.5 rounded-full ${new Date(task.due_date) < new Date() ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                                Due {new Date(task.due_date).toLocaleDateString()}
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
                              {staff.map((s) => (
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
  );
}
