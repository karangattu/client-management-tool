'use client';

import { InteractionType } from '@/app/actions/history';
import { format } from 'date-fns';
import { Printer, CheckSquare, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface Task {
    id: string;
    title: string;
    description?: string;
    status: string;
    due_date?: string;
}

interface ClientInfo {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
}

interface PrintableCaseHistoryProps {
    client: ClientInfo;
    history: Interaction[];
    tasks: Task[];
}

export function PrintableCaseHistory({ client, history, tasks }: PrintableCaseHistoryProps) {
    const handlePrint = () => {
        window.print();
    };

    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

    return (
        <>
            {/* Print Button (Hidden during print) */}
            <div className="flex justify-end mb-4 print:hidden">
                <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    Print Case History
                </Button>
            </div>

            {/* Printable Content */}
            <div className="bg-white p-0 sm:p-8 print:p-0 print:block print-content">
                {/* Header Section */}
                <div className="border-b-2 border-gray-900 pb-6 mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-black uppercase tracking-tight">Case History Progress Report</h1>
                        <p className="text-gray-600 mt-1">Generated on {format(new Date(), 'MMMM d, yyyy')}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold">{client.first_name} {client.last_name}</h2>
                        {client.email && <div className="text-sm text-gray-600">{client.email}</div>}
                        {client.phone && <div className="text-sm text-gray-600">{client.phone}</div>}
                    </div>
                </div>

                {/* Pending Tasks Section */}
                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
                        <CheckSquare className="w-5 h-5 text-black" />
                        <h3 className="text-lg font-bold uppercase">Pending Tasks & Next Steps</h3>
                    </div>
                    {pendingTasks.length > 0 ? (
                        <div className="grid gap-3">
                            {pendingTasks.map((task) => (
                                <div key={task.id} className="border border-gray-200 p-3 rounded flex items-start gap-4">
                                    <div className="w-5 h-5 border-2 border-gray-400 rounded mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold text-gray-900">{task.title}</p>
                                        {task.description && <p className="text-sm text-gray-600 mt-0.5">{task.description}</p>}
                                        {task.due_date && (
                                            <p className="text-xs text-gray-500 mt-1 font-medium">
                                                Target Date: {format(new Date(task.due_date), 'MMM d, yyyy')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic text-sm">No pending tasks at this time.</p>
                    )}
                </div>

                {/* Interaction History Section */}
                <div>
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
                        <Clock className="w-5 h-5 text-black" />
                        <h3 className="text-lg font-bold uppercase">Activity & Interaction Log</h3>
                    </div>
                    {history.length > 0 ? (
                        <div className="space-y-6">
                            {history.map((item) => (
                                <div key={item.id} className="relative pl-6 border-l-2 border-gray-200 pb-2">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-gray-900" />
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-gray-900 text-base">{item.title}</h4>
                                        <span className="text-xs font-bold text-gray-500 uppercase">
                                            {format(new Date(item.created_at), 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">
                                        Type: {item.action_type.replace('_', ' ')}
                                        {item.profiles && ` • By: ${item.profiles.first_name} ${item.profiles.last_name}`}
                                    </div>
                                    {item.description && (
                                        <p className="text-sm text-gray-700 leading-relaxed italic">
                                            &quot;{item.description}&quot;
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic text-sm">No activity history recorded yet.</p>
                    )}
                </div>

                {/* Print Footer */}
                <div className="mt-12 pt-8 border-t border-gray-200 text-center text-xs text-gray-400">
                    <p>Internal Housing Management System - Case History Summary</p>
                    <p className="mt-1">This document is confidential and intended for case management purposes only.</p>
                </div>
            </div>

            {/* Global Print Styles */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-content, .print-content * {
                        visibility: visible;
                    }
                    .print-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    /* Simplified approach: just hide non-print elements in the parent */
                    header, footer, nav, button, .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </>
    );
}
