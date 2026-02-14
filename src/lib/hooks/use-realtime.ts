"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * Configuration options for realtime subscriptions
 */
interface RealtimeOptions<T> {
    /** Called when a new record is inserted */
    onInsert?: (record: T) => void;
    /** Called when a record is updated */
    onUpdate?: (record: T, oldRecord: Partial<T>) => void;
    /** Called when a record is deleted */
    onDelete?: (id: string) => void;
    /** Whether to show toast notifications for changes */
    showToasts?: boolean;
    /** Custom sort function to apply after changes */
    sortFn?: (a: T, b: T) => number;
}

/**
 * Generic hook for subscribing to Supabase Realtime changes on a table.
 * Provides real-time updates for multi-device/multi-user scenarios.
 */
export function useRealtimeSubscription<T extends { id: string }>(
    table: string,
    filter?: { column: string; value: string },
    initialData?: T[],
    options?: RealtimeOptions<T>
) {
    const [data, setData] = useState<T[]>(initialData || []);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [lastEvent, setLastEvent] = useState<{ type: string; id: string; timestamp: number } | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const optionsRef = useRef(options);
    
    // Keep options ref updated
    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    const handleChange = useCallback(
        (payload: RealtimePostgresChangesPayload<T>) => {
            console.log(`[Realtime] ${table} change:`, payload.eventType);
            const opts = optionsRef.current;

            if (payload.eventType === "INSERT") {
                const newRecord = payload.new as T;
                setData((prev) => {
                    // Avoid duplicates
                    if (prev.some((item) => item.id === newRecord.id)) {
                        return prev;
                    }
                    const newData = [newRecord, ...prev];
                    return opts?.sortFn ? newData.sort(opts.sortFn) : newData;
                });
                setLastEvent({ type: 'INSERT', id: newRecord.id, timestamp: Date.now() });
                opts?.onInsert?.(newRecord);
            } else if (payload.eventType === "UPDATE") {
                const updatedRecord = payload.new as T;
                const oldRecord = payload.old as Partial<T>;
                setData((prev) => {
                    const newData = prev.map((item) =>
                        item.id === updatedRecord.id ? updatedRecord : item
                    );
                    return opts?.sortFn ? newData.sort(opts.sortFn) : newData;
                });
                setLastEvent({ type: 'UPDATE', id: updatedRecord.id, timestamp: Date.now() });
                opts?.onUpdate?.(updatedRecord, oldRecord);
            } else if (payload.eventType === "DELETE") {
                const deletedId = (payload.old as { id: string }).id;
                setData((prev) => prev.filter((item) => item.id !== deletedId));
                setLastEvent({ type: 'DELETE', id: deletedId, timestamp: Date.now() });
                opts?.onDelete?.(deletedId);
            }
        },
        [table]
    );

    const filterColumn = filter?.column;
    const filterValue = filter?.value;
    const filterString = filterColumn && filterValue ? `${filterColumn}=eq.${filterValue}` : undefined;

    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel(`${table}-changes-${filterValue || "all"}-${Date.now()}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table,
                    filter: filterString,
                },
                handleChange
            )
            .subscribe((status: string) => {
                if (status === "SUBSCRIBED") {
                    setIsSubscribed(true);
                    console.log(`[Realtime] Subscribed to ${table}`);
                } else if (status === "CHANNEL_ERROR") {
                    console.error(`[Realtime] Channel error for ${table}`);
                    setIsSubscribed(false);
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
                setIsSubscribed(false);
            }
        };
    }, [table, filterValue, filterString, handleChange]);

    // Sync initial data when it changes
    useEffect(() => {
        if (initialData) {
            setData(initialData);
        }
    }, [initialData]);

    // Function to update data optimistically
    const optimisticUpdate = useCallback((id: string, updates: Partial<T>) => {
        setData((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
        );
    }, []);

    // Function to add an item optimistically
    const optimisticAdd = useCallback((item: T) => {
        setData((prev) => {
            if (prev.some((existing) => existing.id === item.id)) {
                return prev;
            }
            return [item, ...prev];
        });
    }, []);

    // Function to remove an item optimistically
    const optimisticRemove = useCallback((id: string) => {
        setData((prev) => prev.filter((item) => item.id !== id));
    }, []);

    // Function to set all data (for initial load or refresh)
    const setAllData = useCallback((newData: T[]) => {
        setData(newData);
    }, []);

    // Function to refresh data manually (force re-subscribe)
    const refresh = useCallback(() => {
        if (initialData) {
            setData(initialData);
        }
    }, [initialData]);

    return {
        data,
        setData: setAllData,
        isSubscribed,
        lastEvent,
        optimisticUpdate,
        optimisticAdd,
        optimisticRemove,
        refresh,
    };
}

/**
 * Hook for subscribing to multiple tables at once
 * Useful for pages that need to track changes across related entities
 */
export function useMultiTableRealtime(
    tables: string[],
    onAnyChange?: (table: string, eventType: string, record: unknown) => void
) {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const channelsRef = useRef<RealtimeChannel[]>([]);

    useEffect(() => {
        const supabase = createClient();
        const channels: RealtimeChannel[] = [];

        tables.forEach((table) => {
            const channel = supabase
                .channel(`multi-${table}-${Date.now()}`)
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table,
                    },
                    (payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
                        console.log(`[Realtime Multi] ${table} change:`, payload.eventType);
                        onAnyChange?.(table, payload.eventType, payload.new || payload.old);
                    }
                )
                .subscribe((status: string) => {
                    if (status === "SUBSCRIBED") {
                        console.log(`[Realtime Multi] Subscribed to ${table}`);
                    }
                });
            channels.push(channel);
        });

        channelsRef.current = channels;
        setIsSubscribed(true);

        return () => {
            channels.forEach((channel) => {
                supabase.removeChannel(channel);
            });
            channelsRef.current = [];
            setIsSubscribed(false);
        };
    }, [tables, onAnyChange]);

    return { isSubscribed };
}

/**
 * Hook specifically for tasks with common task structure
 */
export interface RealtimeTask {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    due_date?: string;
    client_id?: string;
    assigned_to?: string;
    assigned_by?: string;
    category?: string;
    completed_at?: string;
    completed_by?: string;
    created_at?: string;
    updated_at?: string;
    clients?: { first_name: string; last_name: string } | null;
    assignee?: { first_name: string; last_name: string } | null;
}

export function useRealtimeTasks(
    userId?: string, 
    initialTasks?: RealtimeTask[],
    options?: RealtimeOptions<RealtimeTask>
) {
    const filter = userId ? { column: "assigned_to", value: userId } : undefined;
    return useRealtimeSubscription<RealtimeTask>("tasks", filter, initialTasks, options);
}

/**
 * Hook for all tasks without filtering (for staff dashboards)
 */
export function useRealtimeAllTasks(
    initialTasks?: RealtimeTask[],
    options?: RealtimeOptions<RealtimeTask>
) {
    return useRealtimeSubscription<RealtimeTask>("tasks", undefined, initialTasks, options);
}

/**
 * Hook specifically for alerts
 */
export interface RealtimeAlert {
    id: string;
    title: string;
    message?: string;
    alert_type: string;
    priority?: string;
    is_read: boolean;
    is_dismissed?: boolean;
    created_at: string;
    user_id: string;
    client_id?: string;
    due_date?: string;
}

export function useRealtimeAlerts(
    userId?: string, 
    initialAlerts?: RealtimeAlert[],
    options?: RealtimeOptions<RealtimeAlert>
) {
    const filter = userId ? { column: "user_id", value: userId } : undefined;
    return useRealtimeSubscription<RealtimeAlert>("alerts", filter, initialAlerts, options);
}

/**
 * Hook specifically for clients (for staff dashboards)
 */
export interface RealtimeClient {
    id: string;
    first_name: string;
    last_name: string;
    preferred_name?: string;
    email?: string;
    phone?: string;
    status: string;
    housing_status?: string;
    created_at?: string;
    updated_at?: string;
    intake_completed_at?: string | null;
    program_enrollments?: { program_id: string; status: string }[];
    case_management?: { non_cash_benefits: string[] }[];
}

export function useRealtimeClients(
    initialClients?: RealtimeClient[],
    options?: RealtimeOptions<RealtimeClient>
) {
    return useRealtimeSubscription<RealtimeClient>("clients", undefined, initialClients, options);
}

/**
 * Hook specifically for documents
 */
export interface RealtimeDocument {
    id: string;
    file_name: string;
    document_type: string;
    status: string;
    client_id: string;
    created_at: string;
    verified_by?: string;
    verified_at?: string;
    rejection_reason?: string;
    file_path?: string;
    is_verified?: boolean;
}

export function useRealtimeDocuments(
    clientId?: string,
    initialDocuments?: RealtimeDocument[],
    options?: RealtimeOptions<RealtimeDocument>
) {
    const filter = clientId ? { column: "client_id", value: clientId } : undefined;
    return useRealtimeSubscription<RealtimeDocument>("documents", filter, initialDocuments, options);
}

/**
 * Hook for all documents without filtering
 */
export function useRealtimeAllDocuments(
    initialDocuments?: RealtimeDocument[],
    options?: RealtimeOptions<RealtimeDocument>
) {
    return useRealtimeSubscription<RealtimeDocument>("documents", undefined, initialDocuments, options);
}

/**
 * Hook specifically for calendar events
 */
export interface RealtimeCalendarEvent {
    id: string;
    title: string;
    start_time: string;
    end_time?: string;
    event_type: string;
    client_id?: string;
    user_id?: string;
    all_day?: boolean;
    description?: string;
    location?: string;
}

export function useRealtimeCalendarEvents(
    userId?: string,
    initialEvents?: RealtimeCalendarEvent[],
    options?: RealtimeOptions<RealtimeCalendarEvent>
) {
    const filter = userId ? { column: "user_id", value: userId } : undefined;
    return useRealtimeSubscription<RealtimeCalendarEvent>("calendar_events", filter, initialEvents, options);
}

/**
 * Hook for all calendar events
 */
export function useRealtimeAllCalendarEvents(
    initialEvents?: RealtimeCalendarEvent[],
    options?: RealtimeOptions<RealtimeCalendarEvent>
) {
    return useRealtimeSubscription<RealtimeCalendarEvent>("calendar_events", undefined, initialEvents, options);
}

/**
 * Hook for program enrollments
 */
export interface RealtimeProgramEnrollment {
    id: string;
    client_id: string;
    program_id: string;
    status: string;
    enrolled_at?: string;
    completed_at?: string;
    notes?: string;
}

export function useRealtimeProgramEnrollments(
    clientId?: string,
    initialEnrollments?: RealtimeProgramEnrollment[],
    options?: RealtimeOptions<RealtimeProgramEnrollment>
) {
    const filter = clientId ? { column: "client_id", value: clientId } : undefined;
    return useRealtimeSubscription<RealtimeProgramEnrollment>("program_enrollments", filter, initialEnrollments, options);
}

/**
 * Hook for client interactions/history
 */
export interface RealtimeInteraction {
    id: string;
    client_id: string;
    user_id: string;
    action_type: string;
    title: string;
    description?: string;
    created_at: string;
    metadata?: Record<string, unknown>;
}

export function useRealtimeInteractions(
    clientId: string,
    initialInteractions?: RealtimeInteraction[],
    options?: RealtimeOptions<RealtimeInteraction>
) {
    const filter = { column: "client_id", value: clientId };
    return useRealtimeSubscription<RealtimeInteraction>("client_interactions", filter, initialInteractions, options);
}

/**
 * Hook for housing applications
 */
export interface RealtimeHousingApplication {
    id: string;
    client_id: string;
    program_id?: string;
    status?: string;
    submitted_at?: string;
    waitlist_position?: number;
    move_in_date?: string;
    application_data?: Record<string, unknown>;
    created_at?: string;
    updated_at?: string;
}

export function useRealtimeHousingApplications(
    clientId?: string,
    initialApplications?: RealtimeHousingApplication[],
    options?: RealtimeOptions<RealtimeHousingApplication>
) {
    const filter = clientId ? { column: "client_id", value: clientId } : undefined;
    return useRealtimeSubscription<RealtimeHousingApplication>("housing_applications", filter, initialApplications, options);
}

/**
 * Custom hook for presence - shows who's online and viewing the same data
 */
export function useRealtimePresence(channelName: string, userId: string, userMeta?: Record<string, unknown>) {
    const [onlineUsers, setOnlineUsers] = useState<Array<{ id: string; meta?: Record<string, unknown> }>>([]);
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        const supabase = createClient();

        const channel = supabase.channel(channelName, {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const users = Object.entries(state).map(([id, presences]) => ({
                    id,
                    meta: (presences as Array<{ meta?: Record<string, unknown> }>)[0]?.meta,
                }));
                setOnlineUsers(users);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string; newPresences: unknown[] }) => {
                console.log(`[Presence] ${key} joined`, newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }: { key: string; leftPresences: unknown[] }) => {
                console.log(`[Presence] ${key} left`, leftPresences);
            })
            .subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ user_id: userId, ...userMeta });
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [channelName, userId, userMeta]);

    return { onlineUsers };
}
