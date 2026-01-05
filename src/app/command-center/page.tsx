'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { completeTask, claimTask } from '@/app/actions/tasks';
import {
    CheckSquare,
    Calendar,
    Bell,
    User,
    Check,
    Clock,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Unified item structure for command center
interface CommandItem {
    id: string;
    type: 'task' | 'event' | 'alert';
    title: string;
    description?: string;
    due_date?: string;
    start_time?: string;
    priority: string;
    status?: string;
    is_read?: boolean;
    is_completed?: boolean;
    client_id?: string;
    client_name?: string;
}

// Client group structure
interface ClientGroup {
    client_id: string;
    client_name: string;
    items: CommandItem[];
    urgentCount: number;
}

export default function CommandCenterPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<CommandItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCompleted, setShowCompleted] = useState(false);
    const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }
        fetchCommandCenterData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading]);

    const fetchCommandCenterData = async () => {
        const supabase = createClient();
        setLoading(true);

        try {
            const [
                { data: tasks },
                { data: events },
                { data: alerts }
            ] = await Promise.all([
                // All my tasks (pending and completed for toggle)
                supabase.from('tasks').select(`
          id, title, description, priority, due_date, status, client_id, clients (first_name, last_name)
        `).or(`assigned_to.eq.${user?.id},assigned_to.is.null`).order('due_date', { ascending: true }),
                // Upcoming events (next 7 days)
                supabase.from('calendar_events').select(`
          id, title, description, start_time, client_id, clients (first_name, last_name)
        `).gte('start_time', new Date().toISOString()).lte('start_time', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()).order('start_time', { ascending: true }),
                // All alerts for this user
                supabase.from('alerts').select(`
          id, title, message, priority, is_read, created_at, client_id, clients (first_name, last_name)
        `).eq('user_id', user?.id).order('created_at', { ascending: false })
            ]);

            const allItems: CommandItem[] = [];

            if (tasks) {
                tasks.forEach((task) => {
                    const taskTyped = task as { id: string; title: string; description?: string; due_date?: string; priority?: string; status?: string; client_id?: string; clients?: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null };
                    const client = Array.isArray(taskTyped.clients) ? taskTyped.clients[0] : taskTyped.clients;
                    allItems.push({
                        id: taskTyped.id,
                        type: 'task',
                        title: taskTyped.title,
                        description: taskTyped.description,
                        due_date: taskTyped.due_date,
                        priority: taskTyped.priority || 'medium',
                        status: taskTyped.status,
                        is_completed: taskTyped.status === 'completed',
                        client_id: taskTyped.client_id,
                        client_name: client ? `${client.first_name} ${client.last_name}` : 'Unassigned',
                    });
                });
            }

            if (events) {
                events.forEach((event) => {
                    const eventTyped = event as { id: string; title: string; description?: string; start_time: string; client_id?: string; clients?: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null };
                    const client = Array.isArray(eventTyped.clients) ? eventTyped.clients[0] : eventTyped.clients;
                    allItems.push({
                        id: eventTyped.id,
                        type: 'event',
                        title: eventTyped.title,
                        description: eventTyped.description,
                        start_time: eventTyped.start_time,
                        priority: 'medium',
                        client_id: eventTyped.client_id,
                        client_name: client ? `${client.first_name} ${client.last_name}` : 'General',
                    });
                });
            }

            if (alerts) {
                alerts.forEach((alert) => {
                    const alertTyped = alert as { id: string; title: string; message?: string; priority?: string; is_read?: boolean; client_id?: string; clients?: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null };
                    const client = Array.isArray(alertTyped.clients) ? alertTyped.clients[0] : alertTyped.clients;
                    allItems.push({
                        id: alertTyped.id,
                        type: 'alert',
                        title: alertTyped.title,
                        description: alertTyped.message,
                        priority: alertTyped.priority || 'high',
                        is_read: alertTyped.is_read,
                        is_completed: alertTyped.is_read,
                        client_id: alertTyped.client_id,
                        client_name: client ? `${client.first_name} ${client.last_name}` : 'System',
                    });
                });
            }

            setItems(allItems);

            // Auto-expand clients with urgent items
            const urgentClientIds = new Set<string>();
            allItems.forEach(item => {
                if ((item.priority === 'urgent' || item.priority === 'high') && !item.is_completed) {
                    urgentClientIds.add(item.client_id || 'unassigned');
                }
            });
            setExpandedClients(urgentClientIds);

        } catch (error) {
            console.error('Error fetching command center data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter and group items
    const filteredItems = useMemo(() => {
        let filtered = items;

        // Filter by completion status
        if (!showCompleted) {
            filtered = filtered.filter(item => !item.is_completed);
        }

        // Filter by type
        if (activeTab !== 'all') {
            filtered = filtered.filter(item => item.type === activeTab);
        }

        return filtered;
    }, [items, showCompleted, activeTab]);

    // Group by client
    const clientGroups = useMemo(() => {
        const groups: Record<string, ClientGroup> = {};

        filteredItems.forEach(item => {
            const clientKey = item.client_id || 'unassigned';
            const clientName = item.client_name || 'Unassigned';

            if (!groups[clientKey]) {
                groups[clientKey] = {
                    client_id: clientKey,
                    client_name: clientName,
                    items: [],
                    urgentCount: 0,
                };
            }

            groups[clientKey].items.push(item);
            if (item.priority === 'urgent' || item.priority === 'high') {
                groups[clientKey].urgentCount++;
            }
        });

        // Sort groups: clients with urgent items first, then alphabetically
        return Object.values(groups).sort((a, b) => {
            if (a.urgentCount !== b.urgentCount) return b.urgentCount - a.urgentCount;
            return a.client_name.localeCompare(b.client_name);
        });
    }, [filteredItems]);

    const { toast } = useToast();

    // ... (rest of the component)

    const handleCompleteTask = async (taskId: string) => {
        // Optimistic update
        setItems(prev => prev.map(item =>
            item.id === taskId ? { ...item, is_completed: true, status: 'completed' } : item
        ));

        toast({
            title: "Task Completed",
            description: "The task has been marked as complete.",
            duration: 3000,
        });

        try {
            const result = await completeTask(taskId);
            if (!result.success) {
                // Revert on failure
                setItems(prev => prev.map(item =>
                    item.id === taskId ? { ...item, is_completed: false, status: 'pending' } : item
                ));
                toast({
                    title: "Error",
                    description: "Failed to complete task. Please try again.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error completing task:', error);
            // Revert on error
            setItems(prev => prev.map(item =>
                item.id === taskId ? { ...item, is_completed: false, status: 'pending' } : item
            ));
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        }
    };

    const handleDismissAlert = async (alertId: string) => {
        // Optimistic update - remove from list (or mark read if you want to keep it but hide it based on filter)
        // Since the current logic relies on `is_read` for filtering, let's mark it read.
        setItems(prev => prev.map(item =>
            item.id === alertId ? { ...item, is_read: true, is_completed: true } : item
        ));

        toast({
            title: "Alert Dismissed",
            description: "The alert has been removed.",
            duration: 2000,
        });

        const supabase = createClient();
        try {
            const { error } = await supabase.from('alerts').update({ is_read: true }).eq('id', alertId);
            if (error) {
                // Revert
                setItems(prev => prev.map(item =>
                    item.id === alertId ? { ...item, is_read: false, is_completed: false } : item
                ));
                toast({
                    title: "Error",
                    description: "Failed to dismiss alert.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error dismissing alert:', error);
            // Revert
            setItems(prev => prev.map(item =>
                item.id === alertId ? { ...item, is_read: false, is_completed: false } : item
            ));
        }
    };

    const handleClaimTask = async (taskId: string) => {
        // Optimistic update
        setItems(prev => prev.map(item =>
            item.id === taskId ? { ...item, client_name: 'Assigned to you' } : item
        ));
        // Note: Claiming might change "assigned_to" which isn't directly visible in the item list logic 
        // derived from "assigned_to.eq.${user?.id},assigned_to.is.null", 
        // but it effectively moves it to "My Tasks".
        // For visual feedback, just a toast is mostly enough if the list doesn't fundamentally change structure immediately,
        // but if we want to reflect it, we'd assume it's now assigned.

        toast({
            title: "Task Claimed",
            description: "You have successfully claimed this task.",
            duration: 3000,
        });

        try {
            const result = await claimTask(taskId);
            if (!result.success) {
                toast({
                    title: "Error",
                    description: result.error || "Failed to claim task",
                    variant: "destructive",
                });
                // Re-fetch to ensure state is correct since claiming is complex
                fetchCommandCenterData();
            }
        } catch (error) {
            console.error('Error claiming task:', error);
            fetchCommandCenterData();
        }
    };

    const toggleClientExpand = (clientId: string) => {
        const newExpanded = new Set(expandedClients);
        if (newExpanded.has(clientId)) {
            newExpanded.delete(clientId);
        } else {
            newExpanded.add(clientId);
        }
        setExpandedClients(newExpanded);
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return <Badge className="bg-red-100 text-red-800 border-red-200">Urgent</Badge>;
            case 'high':
                return <Badge className="bg-orange-100 text-orange-800 border-orange-200">High</Badge>;
            case 'medium':
                return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Medium</Badge>;
            case 'low':
                return <Badge className="bg-slate-100 text-slate-800 border-slate-200">Low</Badge>;
            default:
                return null;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'task':
                return <CheckSquare className="h-4 w-4 text-orange-500" />;
            case 'event':
                return <Calendar className="h-4 w-4 text-purple-500" />;
            case 'alert':
                return <Bell className="h-4 w-4 text-red-500" />;
            default:
                return null;
        }
    };

    const formatDueDate = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return <span className="text-red-600 font-medium">Overdue</span>;
        if (diffDays === 0) return <span className="text-amber-600 font-medium">Today</span>;
        if (diffDays === 1) return 'Tomorrow';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Stats
    const stats = useMemo(() => {
        const pending = items.filter(i => !i.is_completed);
        return {
            total: pending.length,
            tasks: pending.filter(i => i.type === 'task').length,
            events: pending.filter(i => i.type === 'event').length,
            alerts: pending.filter(i => i.type === 'alert').length,
            urgent: pending.filter(i => i.priority === 'urgent' || i.priority === 'high').length,
        };
    }, [items]);

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-gray-50">
                <AppHeader title="Command Center" showBackButton />
                <main className="container px-4 py-6 max-w-5xl mx-auto">
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <AppHeader
                title="Command Center"
                showBackButton
                alertCount={stats.alerts}
            />

            <main className="container px-4 py-6 max-w-5xl mx-auto">
                {/* Header with stats */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
                            <p className="text-gray-600 text-sm mt-1">
                                All your tasks, events, and alerts in one place
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="show-completed"
                                checked={showCompleted}
                                onCheckedChange={(checked) => setShowCompleted(checked as boolean)}
                            />
                            <Label htmlFor="show-completed" className="text-sm text-gray-600 cursor-pointer">
                                Show completed
                            </Label>
                        </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-4 gap-3 mb-6">
                        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                            <CardContent className="py-3 px-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-2xl font-bold text-orange-700">{stats.tasks}</div>
                                    <CheckSquare className="h-5 w-5 text-orange-500" />
                                </div>
                                <p className="text-xs text-orange-600">Tasks</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                            <CardContent className="py-3 px-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-2xl font-bold text-purple-700">{stats.events}</div>
                                    <Calendar className="h-5 w-5 text-purple-500" />
                                </div>
                                <p className="text-xs text-purple-600">Events</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                            <CardContent className="py-3 px-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-2xl font-bold text-red-700">{stats.alerts}</div>
                                    <Bell className="h-5 w-5 text-red-500" />
                                </div>
                                <p className="text-xs text-red-600">Alerts</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                            <CardContent className="py-3 px-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-2xl font-bold text-amber-700">{stats.urgent}</div>
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                </div>
                                <p className="text-xs text-amber-600">Urgent</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filter tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                            <TabsTrigger value="task">Tasks ({stats.tasks})</TabsTrigger>
                            <TabsTrigger value="event">Events ({stats.events})</TabsTrigger>
                            <TabsTrigger value="alert">Alerts ({stats.alerts})</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Client-grouped items */}
                <div className="space-y-4">
                    {loading ? (
                        <>
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
                        </>
                    ) : clientGroups.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No items to show</p>
                                <p className="text-sm text-gray-400 mt-1">
                                    {showCompleted ? 'No items found' : 'All tasks are complete and alerts dismissed'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        clientGroups.map(group => (
                            <Card key={group.client_id} className={cn(
                                "transition-all",
                                group.urgentCount > 0 && "border-l-4 border-l-red-400"
                            )}>
                                <CardHeader
                                    className="pb-2 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => toggleClientExpand(group.client_id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            {expandedClients.has(group.client_id) ? (
                                                <ChevronDown className="h-4 w-4 text-gray-400" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-gray-400" />
                                            )}
                                            <User className="h-4 w-4 text-gray-500" />
                                            {group.client_name}
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            {group.urgentCount > 0 && (
                                                <Badge variant="destructive" className="text-xs">
                                                    {group.urgentCount} urgent
                                                </Badge>
                                            )}
                                            <Badge variant="secondary" className="text-xs">
                                                {group.items.length} items
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>

                                {expandedClients.has(group.client_id) && (
                                    <CardContent className="pt-2">
                                        <div className="space-y-2">
                                            {group.items.map(item => (
                                                <div
                                                    key={`${item.type}-${item.id}`}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded-lg border transition-all",
                                                        item.is_completed
                                                            ? "bg-gray-50 opacity-60"
                                                            : "bg-white hover:bg-gray-50"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        {getTypeIcon(item.type)}
                                                        <div className="min-w-0 flex-1">
                                                            <p className={cn(
                                                                "font-medium text-sm truncate",
                                                                item.is_completed && "line-through text-gray-400"
                                                            )}>
                                                                {item.title}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                {item.due_date && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="h-3 w-3" />
                                                                        {formatDueDate(item.due_date)}
                                                                    </span>
                                                                )}
                                                                {item.start_time && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="h-3 w-3" />
                                                                        {new Date(item.start_time).toLocaleString('en-US', {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            hour: 'numeric',
                                                                            minute: '2-digit',
                                                                        })}
                                                                    </span>
                                                                )}
                                                                {item.description && (
                                                                    <span className="truncate max-w-[200px]">{item.description}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 ml-2">
                                                        {getPriorityBadge(item.priority)}

                                                        {!item.is_completed && (
                                                            <>
                                                                {item.type === 'task' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 p-0 text-gray-400 hover:text-green-600"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleCompleteTask(item.id);
                                                                        }}
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                                {item.type === 'alert' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDismissAlert(item.id);
                                                                        }}
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
