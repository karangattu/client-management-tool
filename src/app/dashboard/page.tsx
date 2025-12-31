'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
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
  Home,
  FileText,
  Bell,
  Settings,
  TrendingUp,
  Clock,
  LogOut,
  Hand,
  AlertCircle,
  User,
} from 'lucide-react';
import { LanguageSelector } from '@/components/ui/language-selector';
import { useLanguage } from '@/lib/language-context';

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

interface Activity {
  id: string;
  action: string;
  table_name?: string;
  entity_type: string;
  created_at: string;
  details: Record<string, unknown>;
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [clientTasks, setClientTasks] = useState<ClientTask[]>([]);
  const [clientEvents, setClientEvents] = useState<ClientEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const fetchDashboardData = async () => {
    const supabase = createClient();
    setLoading(true);

    try {
      // Check if user is a client - fetch client-specific data
      if (profile?.role === 'client') {
        // First, get the client record linked to this user
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('portal_user_id', user?.id)
          .single();

        if (clientData) {
          // Fetch tasks related to this client
          const { data: tasksData } = await supabase
            .from('tasks')
            .select('id, title, description, status, priority, due_date')
            .eq('client_id', clientData.id)
            .in('status', ['pending', 'in_progress'])
            .order('due_date', { ascending: true })
            .limit(10);

          if (tasksData) {
            setClientTasks(tasksData);
          }

          // Fetch upcoming calendar events for this client
          const { data: eventsData } = await supabase
            .from('calendar_events')
            .select('id, title, start_time, location')
            .eq('client_id', clientData.id)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(5);

          if (eventsData) {
            setClientEvents(eventsData);
          }

          // Client stats
          setStats(prev => ({
            ...prev,
            pendingTasks: tasksData?.length || 0,
            upcomingEvents: eventsData?.length || 0,
          }));
        }

        // Fetch unread alerts for client
        const { count: unreadAlerts } = await supabase
          .from('alerts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user?.id)
          .eq('is_read', false);

        setStats(prev => ({ ...prev, unreadAlerts: unreadAlerts || 0 }));

      } else {
        // Staff/admin data fetching - Parallelize for performance
        const [
          { count: totalClients },
          { count: activeClients },
          { count: pendingTasks },
          { count: openTasks },
          { count: upcomingEvents },
          { count: unreadAlerts },
          { data: deadlineData },
          { data: activityData }
        ] = await Promise.all([
          supabase.from('clients').select('*', { count: 'exact', head: true }),
          supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('assigned_to', user?.id).in('status', ['pending', 'in_progress']),
          supabase.from('tasks').select('*', { count: 'exact', head: true }).is('assigned_to', null).eq('status', 'pending'),
          supabase.from('calendar_events').select('*', { count: 'exact', head: true }).gte('start_time', new Date().toISOString()),
          supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('user_id', user?.id).eq('is_read', false),
          supabase.from('tasks').select(`
            id, title, due_date, priority, clients (first_name, last_name)
          `).not('due_date', 'is', null).gte('due_date', new Date().toISOString()).order('due_date', { ascending: true }).limit(5),
          supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(5)
        ]);

        setStats({
          totalClients: totalClients || 0,
          activeClients: activeClients || 0,
          pendingTasks: pendingTasks || 0,
          openTasks: openTasks || 0,
          upcomingEvents: upcomingEvents || 0,
          unreadAlerts: unreadAlerts || 0,
        });

        if (deadlineData) {
          interface DeadlineQueryResult {
            id: string;
            title: string;
            due_date: string;
            priority: string;
            clients: { first_name: string; last_name: string } | null;
          }
          setDeadlines((deadlineData as unknown as DeadlineQueryResult[]).map((d) => ({
            id: d.id,
            title: d.title,
            due_date: d.due_date,
            priority: d.priority,
            client_name: d.clients ? `${d.clients.first_name} ${d.clients.last_name}` : undefined,
          })));
        }

        if (activityData) {
          setActivities(activityData);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (authLoading || !profile) {
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

  const formatActivityAction = (activity: Activity) => {
    // Map of custom actions to friendly names
    const customActions: Record<string, string> = {
      'client_created': 'Created new client',
      'client_updated': 'Updated client profile',
      'client_self_registration': 'New client self-registered',
      'task_created': 'Created new task',
      'task_completed': 'Completed a task',
      'task_claimed': 'Claimed a task',
      'task_archived': 'Archived a task',
      'document_uploaded': 'Uploaded document',
      'housing_application_created': 'Created housing application',
    };

    // Check for custom action first
    if (customActions[activity.action]) {
      return customActions[activity.action];
    }

    // Map table names to friendly entity names
    const tableNames: Record<string, string> = {
      'clients': 'client record',
      'tasks': 'task',
      'profiles': 'user profile',
      'documents': 'document',
      'calendar_events': 'calendar event',
      'housing_applications': 'housing application',
      'case_management': 'case details',
      'alerts': 'alert',
      'demographics': 'demographics',
      'emergency_contacts': 'emergency contact',
      'household_members': 'household member',
    };

    // Map raw SQL actions to friendly verbs
    const actionVerbs: Record<string, string> = {
      'INSERT': 'Created',
      'UPDATE': 'Updated',
      'DELETE': 'Deleted',
    };

    const verb = actionVerbs[activity.action] || activity.action;
    const entity = activity.table_name ? (tableNames[activity.table_name] || activity.table_name) : 'record';

    return `${verb} ${entity}`;
  };

  const formatEntityType = (activity: Activity) => {
    // Map table names to friendly category names
    const categories: Record<string, string> = {
      'clients': 'Client Management',
      'tasks': 'Tasks',
      'profiles': 'User Management',
      'documents': 'Documents',
      'calendar_events': 'Calendar',
      'housing_applications': 'Housing',
      'case_management': 'Case Management',
      'alerts': 'Notifications',
    };

    if (activity.table_name && categories[activity.table_name]) {
      return categories[activity.table_name];
    }
    if (activity.entity_type && categories[activity.entity_type]) {
      return categories[activity.entity_type];
    }
    return activity.table_name || activity.entity_type || 'System';
  };

  const formatTimeAgo = (dateString: string) => {
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
        title="Dashboard"
        showBackButton={false}
        alertCount={stats.unreadAlerts}
      />

      <main className="container px-4 py-6 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Welcome back, {profile.first_name}!
            </h1>
            <p className="text-gray-600 mt-1">
              {isClient
                ? "View your case status and upcoming appointments."
                : "Here's what's happening with your clients today."
              }
            </p>
            <Badge variant="outline" className="mt-2 capitalize">
              {profile.role.replace('_', ' ')}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Client-specific: Language Selector and Profile Completion Prompt */}
        {isClient && (
          <div className="space-y-4 mb-8">
            {/* Language Selector */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Language Preference</p>
                    <p className="text-xs text-gray-500">Select your preferred language</p>
                  </div>
                  <LanguageSelector />
                </div>
              </CardContent>
            </Card>

            {/* Profile Completion Prompt - Show if there are pending profile tasks */}
            {clientTasks.some(task => task.title.toLowerCase().includes('profile')) && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-amber-900">Complete Your Profile</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Please complete your profile information to help us serve you better. 
                        This includes emergency contacts, housing status, and other important details.
                      </p>
                      <Button 
                        className="mt-3 bg-amber-600 hover:bg-amber-700"
                        size="sm"
                        onClick={() => router.push('/profile-completion')}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Complete Profile
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
                    <p className="text-sm text-gray-600">Active Tasks</p>
                    <div className="text-2xl font-bold text-orange-600">
                      {loading ? <Skeleton className="h-8 w-12" /> : stats.pendingTasks}
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
                    <p className="text-sm text-gray-600">Appointments</p>
                    <div className="text-2xl font-bold text-purple-600">
                      {loading ? <Skeleton className="h-8 w-12" /> : stats.upcomingEvents}
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
                    <p className="text-sm text-gray-600">Total Clients</p>
                    <div className="text-2xl font-bold text-gray-900">
                      {loading ? <Skeleton className="h-8 w-12" /> : stats.totalClients}
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
                    <p className="text-sm text-gray-600">Active Clients</p>
                    <div className="text-2xl font-bold text-green-600">
                      {loading ? <Skeleton className="h-8 w-12" /> : stats.activeClients}
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
                    <p className="text-sm text-gray-600">My Tasks</p>
                    <div className="text-2xl font-bold text-orange-600">
                      {loading ? <Skeleton className="h-8 w-12" /> : stats.pendingTasks}
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
                    <p className="text-sm text-gray-600">Open Tasks</p>
                    <div className="text-2xl font-bold text-purple-600">
                      {loading ? <Skeleton className="h-8 w-12" /> : stats.openTasks}
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

        {/* Navigation Tiles */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <NavigationTileGrid>
          {canViewClients && (
            <NavigationTile
              title="Clients"
              description="View and manage client records"
              icon={Users}
              href="/clients"
              color="blue"
              badge={stats.totalClients > 0 ? stats.totalClients : undefined}
            />
          )}
          {canCreateIntake && (
            <NavigationTile
              title="New Intake"
              description="Start a new client intake"
              icon={UserPlus}
              href="/client-intake"
              color="green"
            />
          )}
          {canViewCalendar && (
            <NavigationTile
              title="Calendar"
              description="Appointments and deadlines"
              icon={Calendar}
              href="/calendar"
              color="purple"
              badge={stats.upcomingEvents > 0 ? stats.upcomingEvents : undefined}
            />
          )}
          {canViewTasks && (
            <NavigationTile
              title="Tasks"
              description={isVolunteer || isCaseManager ? "View & claim open tasks" : "Manage tasks"}
              icon={CheckSquare}
              href="/tasks"
              color="orange"
              badge={stats.pendingTasks > 0 ? stats.pendingTasks : undefined}
            />
          )}
          {(isVolunteer || isCaseManager) && stats.openTasks > 0 && (
            <NavigationTile
              title="Open Tasks"
              description="Claim available tasks"
              icon={Hand}
              href="/tasks?filter=open"
              color="cyan"
              badge={stats.openTasks}
            />
          )}
          {canViewHousing && (
            <NavigationTile
              title="Housing"
              description="Housing applications"
              icon={Home}
              href="/housing"
              color="cyan"
            />
          )}
          {canViewDocuments && (
            <NavigationTile
              title="Documents"
              description="Document management"
              icon={FileText}
              href="/documents"
              color="amber"
            />
          )}
          {canViewAlerts && (
            <NavigationTile
              title="Alerts"
              description="Notifications & reminders"
              icon={Bell}
              href="/alerts"
              color="red"
              badge={stats.unreadAlerts > 0 ? stats.unreadAlerts : undefined}
            />
          )}
          {canViewAdmin && (
            <NavigationTile
              title="Admin"
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
                  My Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
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
                        {getPriorityBadge(task.priority, task.status)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">No active tasks</p>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Appointments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  Upcoming Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
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
                  <p className="text-gray-500 text-sm text-center py-4">No upcoming appointments</p>
                )}
              </CardContent>
            </Card>
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
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
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

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : activities.length > 0 ? (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {formatActivityAction(activity)}
                          </p>
                          <p className="text-xs text-gray-500">{formatEntityType(activity)}</p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(activity.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}