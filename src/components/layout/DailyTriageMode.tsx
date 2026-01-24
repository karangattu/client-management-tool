'use client';

import { useState, useEffect } from 'react';
import { 
    Sun, 
    CheckCircle2, 
    AlertTriangle, 
    Clock, 
    Users, 
    Calendar,
    ArrowRight,
    ChevronRight,
    ListChecks,
    Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { getPacificHour, formatPacificFullDate, formatPacificLocaleDate, getPacificNow } from '@/lib/date-utils';

interface TriageTask {
    id: string;
    title: string;
    clientName?: string;
    priority: 'urgent' | 'high' | 'medium';
    dueDate?: string;
    completed: boolean;
}

interface TriageAlert {
    id: string;
    message: string;
    type: 'warning' | 'info' | 'urgent';
    clientId?: string;
}

interface DailyTriageModeProps {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
    urgentTasks: TriageTask[];
    alerts: TriageAlert[];
    appointmentsToday: number;
    pendingFollowUps: number;
    onTaskToggle: (taskId: string, completed: boolean) => void;
    onStartDay: () => void;
}

export function DailyTriageMode({
    isOpen,
    onClose,
    userName,
    urgentTasks,
    alerts,
    appointmentsToday,
    pendingFollowUps,
    onTaskToggle,
    onStartDay,
}: DailyTriageModeProps) {
    const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());
    const [triageStep, setTriageStep] = useState<'overview' | 'tasks' | 'ready'>('overview');

    const greeting = () => {
        const hour = getPacificHour();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const urgentCount = urgentTasks.filter(t => t.priority === 'urgent').length;
    const completedCount = checkedTasks.size;
    const totalUrgent = urgentTasks.length;
    const progress = totalUrgent > 0 ? (completedCount / totalUrgent) * 100 : 100;

    const handleTaskCheck = (taskId: string, checked: boolean) => {
        const newChecked = new Set(checkedTasks);
        if (checked) {
            newChecked.add(taskId);
        } else {
            newChecked.delete(taskId);
        }
        setCheckedTasks(newChecked);
        onTaskToggle(taskId, checked);
    };

    const handleContinue = () => {
        if (triageStep === 'overview') {
            setTriageStep('tasks');
        } else if (triageStep === 'tasks') {
            setTriageStep('ready');
        } else {
            onStartDay();
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 z-50 overflow-auto">
            <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
                <div className="w-full max-w-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-500/20 mb-4">
                            <Sun className="h-8 w-8 text-yellow-600 dark:text-yellow-300" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            {greeting()}, {userName.split(' ')[0]}!
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300 mt-2">
                            {formatPacificFullDate()}
                        </p>
                    </div>

                    {/* Overview Step */}
                    {triageStep === 'overview' && (
                        <div className="space-y-4">
                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <Card className="bg-white/90 dark:bg-slate-800 dark:border-slate-700 backdrop-blur">
                                    <CardContent className="p-4 text-center">
                                        <AlertTriangle className={`h-6 w-6 mx-auto mb-2 ${urgentCount > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`} />
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{urgentCount}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-300">Urgent</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-white/90 dark:bg-slate-800 dark:border-slate-700 backdrop-blur">
                                    <CardContent className="p-4 text-center">
                                        <ListChecks className="h-6 w-6 mx-auto mb-2 text-orange-500 dark:text-orange-400" />
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalUrgent}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-300">Today&apos;s Tasks</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-white/90 dark:bg-slate-800 dark:border-slate-700 backdrop-blur">
                                    <CardContent className="p-4 text-center">
                                        <Calendar className="h-6 w-6 mx-auto mb-2 text-blue-500 dark:text-blue-400" />
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{appointmentsToday}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-300">Appointments</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-white/90 dark:bg-slate-800 dark:border-slate-700 backdrop-blur">
                                    <CardContent className="p-4 text-center">
                                        <Users className="h-6 w-6 mx-auto mb-2 text-green-500 dark:text-green-400" />
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingFollowUps}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-300">Follow-ups</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Alerts */}
                            {alerts.length > 0 && (
                                <Card className="bg-white/90 dark:bg-slate-800 dark:border-slate-700 backdrop-blur border-yellow-200 dark:border-yellow-600">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2 text-gray-900 dark:text-white">
                                            <Bell className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                            Alerts Requiring Attention
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {alerts.slice(0, 3).map((alert) => (
                                            <div 
                                                key={alert.id}
                                                className={`flex items-center gap-3 p-2 rounded-lg text-sm ${
                                                    alert.type === 'urgent' 
                                                        ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-100'
                                                        : alert.type === 'warning'
                                                        ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-100'
                                                        : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-100'
                                                }`}
                                            >
                                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                                <span className="flex-1">{alert.message}</span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* Tasks Step */}
                    {triageStep === 'tasks' && (
                        <Card className="bg-white/90 dark:bg-slate-800 dark:border-slate-700 backdrop-blur">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
                                    <span>Priority Tasks for Today</span>
                                    <Badge variant={progress === 100 ? 'default' : 'secondary'} className="dark:bg-slate-700 dark:text-white">
                                        {completedCount}/{totalUrgent} reviewed
                                    </Badge>
                                </CardTitle>
                                <CardDescription className="dark:text-gray-300">
                                    Review these tasks and mark which ones you&apos;ll address today
                                </CardDescription>
                                <Progress value={progress} className="mt-2 dark:bg-slate-700" />
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {urgentTasks.length === 0 ? (
                                    <div className="text-center py-8 text-gray-600 dark:text-gray-300">
                                        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500 dark:text-green-400" />
                                        <p className="font-medium text-gray-900 dark:text-white">All caught up!</p>
                                        <p className="text-sm">No urgent tasks for today</p>
                                    </div>
                                ) : (
                                    urgentTasks.map((task) => (
                                        <div 
                                            key={task.id}
                                            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                                                checkedTasks.has(task.id)
                                                    ? 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700'
                                                    : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600'
                                            }`}
                                        >
                                            <Checkbox
                                                checked={checkedTasks.has(task.id)}
                                                onCheckedChange={(checked) => 
                                                    handleTaskCheck(task.id, checked as boolean)
                                                }
                                                className="mt-1 dark:border-gray-400"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`font-medium ${
                                                        checkedTasks.has(task.id) ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
                                                    }`}>
                                                        {task.title}
                                                    </span>
                                                    <Badge 
                                                        variant={
                                                            task.priority === 'urgent' ? 'destructive' : 
                                                            task.priority === 'high' ? 'default' : 'secondary'
                                                        }
                                                        className="text-xs"
                                                    >
                                                        {task.priority}
                                                    </Badge>
                                                </div>
                                                {task.clientName && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                                        Client: {task.clientName}
                                                    </p>
                                                )}
                                                {task.dueDate && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                                        <Clock className="h-3 w-3" />
                                                        Due: {formatPacificLocaleDate(task.dueDate)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Ready Step */}
                    {triageStep === 'ready' && (
                        <Card className="bg-white/90 dark:bg-slate-800 dark:border-slate-700 backdrop-blur text-center">
                            <CardContent className="py-12">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-500/20 mb-6">
                                    <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">You&apos;re Ready!</h2>
                                <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                                    You&apos;ve reviewed {completedCount} priority items. 
                                    Your day is planned and you&apos;re set to make an impact.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <Link href="/tasks">
                                        <Button variant="outline" className="gap-2 w-full sm:w-auto">
                                            <ListChecks className="h-4 w-4" />
                                            View All Tasks
                                        </Button>
                                    </Link>
                                    <Link href="/clients">
                                        <Button variant="outline" className="gap-2 w-full sm:w-auto">
                                            <Users className="h-4 w-4" />
                                            View Clients
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between items-center mt-6">
                        <Button 
                            variant="ghost" 
                            onClick={onClose}
                            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        >
                            Skip for now
                        </Button>
                        <Button onClick={handleContinue} className="gap-2">
                            {triageStep === 'overview' && 'Review Tasks'}
                            {triageStep === 'tasks' && (completedCount === totalUrgent || totalUrgent === 0 ? 'Continue' : `Continue (${completedCount}/${totalUrgent})`)}
                            {triageStep === 'ready' && 'Start My Day'}
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Progress Dots */}
                    <div className="flex justify-center gap-2 mt-6">
                        {['overview', 'tasks', 'ready'].map((step) => (
                            <div
                                key={step}
                                className={`w-2 h-2 rounded-full transition-colors ${
                                    step === triageStep 
                                        ? 'bg-blue-500 dark:bg-blue-400' 
                                        : 'bg-gray-300 dark:bg-gray-500'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Hook to manage Daily Triage Mode state
 */
export function useDailyTriageMode() {
    const [showTriage, setShowTriage] = useState(false);
    const TRIAGE_KEY = 'lastTriageDate';

    useEffect(() => {
        const lastTriage = localStorage.getItem(TRIAGE_KEY);
        const today = getPacificNow().toDateString();
        
        // Show triage if not done today and it's before noon
        const hour = getPacificHour();
        if (lastTriage !== today && hour < 12) {
            // Small delay to let dashboard load first
            const timer = setTimeout(() => setShowTriage(true), 500);
            return () => clearTimeout(timer);
        }
    }, []);

    const completeTriage = () => {
        localStorage.setItem(TRIAGE_KEY, getPacificNow().toDateString());
        setShowTriage(false);
    };

    const openTriage = () => setShowTriage(true);
    const closeTriage = () => setShowTriage(false);

    return {
        showTriage,
        completeTriage,
        openTriage,
        closeTriage,
    };
}
