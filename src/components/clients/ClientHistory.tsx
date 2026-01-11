'use client';

import { InteractionType } from '@/app/actions/history';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Phone,
    Mail,
    Users,
    MessageSquare,
    RefreshCcw,
    Clock,
    Calendar,
    Briefcase
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

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
    metadata?: {
        program_name?: string;
        program_id?: string;
        [key: string]: unknown;
    };
}

interface ClientHistoryProps {
    history: Interaction[];
    isCompact?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const interactionConfig: Record<InteractionType, { icon: any; color: string; bgColor: string }> = {
    call: { icon: Phone, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    email: { icon: Mail, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    meeting: { icon: Users, color: 'text-green-600', bgColor: 'bg-green-100' },
    note: { icon: MessageSquare, color: 'text-amber-600', bgColor: 'bg-amber-100' },
    status_change: { icon: RefreshCcw, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    other: { icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

export function ClientHistory({ history, isCompact = false }: ClientHistoryProps) {
    if (history.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No case history recorded yet.</p>
                {!isCompact && <p className="text-sm text-gray-400 mt-1">Interactions will appear here once logged.</p>}
            </div>
        );
    }

    // Group history by date (Today, Yesterday, Others)
    const todayHistory = history.filter(item => isToday(new Date(item.created_at)));
    const otherHistory = history.filter(item => !isToday(new Date(item.created_at)));

    const renderInteraction = (item: Interaction, isTodayItem: boolean) => {
        const config = interactionConfig[item.action_type] || interactionConfig.other;
        const Icon = config.icon;

        return (
            <div key={item.id} className="relative pl-0 sm:pl-12">
                {/* Timeline Dot/Icon */}
                <div className={`absolute left-0 sm:left-3 top-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full ${isTodayItem ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-50' : config.bgColor} flex items-center justify-center border-4 border-white z-10 hidden sm:flex`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isTodayItem ? 'text-white' : config.color}`} />
                </div>

                <Card className={`${isCompact ? 'border-none shadow-none bg-transparent' : 'hover:shadow-md transition-shadow'} ${isTodayItem ? 'border-blue-200 bg-blue-50/30' : ''}`}>
                    <CardContent className={isCompact ? 'p-0 pb-4' : 'p-4'}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className={`sm:hidden p-1.5 rounded-full ${config.bgColor}`}>
                                    <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                                </div>
                                <h4 className={`font-bold ${isTodayItem ? 'text-blue-900' : 'text-gray-900'}`}>
                                    {item.title}
                                </h4>
                                {!isCompact && (
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className={`capitalize text-[10px] sm:text-xs ${config.bgColor} ${config.color} border-none`}>
                                            {item.action_type.replace('_', ' ')}
                                        </Badge>
                                        {item.metadata?.program_name && (
                                            <Badge variant="outline" className="text-[10px] sm:text-xs bg-slate-100 text-slate-700 border-slate-200 flex items-center gap-1">
                                                <Briefcase className="w-3 h-3" />
                                                {item.metadata.program_name}
                                            </Badge>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Calendar className="w-3 h-3" />
                                <span>{format(new Date(item.created_at), 'MMM d, yyyy • h:mm a')}</span>
                            </div>
                        </div>

                        {item.description && (
                            <p className="text-sm text-gray-600 mb-2 leading-relaxed whitespace-pre-wrap">
                                {item.description}
                            </p>
                        )}

                        {item.profiles && !isCompact && (
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600 uppercase">
                                    {item.profiles.first_name[0]}{item.profiles.last_name[0]}
                                </div>
                                <span className="text-xs text-gray-500">
                                    Logged by <span className="font-medium text-gray-700">{item.profiles.first_name} {item.profiles.last_name}</span>
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <div className="relative space-y-8">
            {/* Timeline Line */}
            <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gray-200 hidden sm:block" />

            {/* Today's Activity Section */}
            {todayHistory.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pl-2 sm:pl-0 mb-4">
                        <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />
                        <h3 className="font-bold text-lg text-blue-900">Today&apos;s Activity</h3>
                    </div>
                    {todayHistory.map(item => renderInteraction(item, true))}
                </div>
            )}

            {/* Previous History Section */}
            {otherHistory.length > 0 && (
                <div className="space-y-4">
                    {todayHistory.length > 0 && (
                        <div className="flex items-center gap-2 pl-2 sm:pl-0 mt-8 mb-4">
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                            <h3 className="font-semibold text-gray-500">Previous Activity</h3>
                        </div>
                    )}
                    {otherHistory.map(item => renderInteraction(item, false))}
                </div>
            )}
        </div>
    );
}
