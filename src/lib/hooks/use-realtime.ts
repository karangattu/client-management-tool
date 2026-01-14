"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * Generic hook for subscribing to Supabase Realtime changes on a table.
 * Provides real-time updates for multi-device/multi-user scenarios.
 */
export function useRealtimeSubscription<T extends { id: string }>(
    table: string,
    filter?: { column: string; value: string },
    initialData?: T[]
) {
    const [data, setData] = useState<T[]>(initialData || []);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const handleChange = useCallback(
        (payload: RealtimePostgresChangesPayload<T>) => {
            console.log(`[Realtime] ${table} change:`, payload.eventType);

            if (payload.eventType === "INSERT") {
                setData((prev) => {
                    // Avoid duplicates
                    if (prev.some((item) => item.id === (payload.new as T).id)) {
                        return prev;
                    }
                    return [payload.new as T, ...prev];
                });
            } else if (payload.eventType === "UPDATE") {
                setData((prev) =>
                    prev.map((item) =>
                        item.id === (payload.new as T).id ? (payload.new as T) : item
                    )
                );
            } else if (payload.eventType === "DELETE") {
                setData((prev) =>
                    prev.filter((item) => item.id !== (payload.old as { id: string }).id)
                );
            }
        },
        [table]
    );

    useEffect(() => {
        const supabase = createClient();

        // Build filter string if provided
        const filterString = filter ? `${filter.column}=eq.${filter.value}` : undefined;

        const channel = supabase
            .channel(`${table}-changes-${filter?.value || "all"}`)
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
    }, [table, filter, handleChange]);

    // Function to update data optimistically
    const optimisticUpdate = useCallback((id: string, updates: Partial<T>) => {
        setData((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
        );
    }, []);

    // Function to add an item optimistically
    const optimisticAdd = useCallback((item: T) => {
        setData((prev) => [item, ...prev]);
    }, []);

    // Function to remove an item optimistically
    const optimisticRemove = useCallback((id: string) => {
        setData((prev) => prev.filter((item) => item.id !== id));
    }, []);

    // Function to set all data (for initial load or refresh)
    const setAllData = useCallback((newData: T[]) => {
        setData(newData);
    }, []);

    return {
        data,
        setData: setAllData,
        isSubscribed,
        optimisticUpdate,
        optimisticAdd,
        optimisticRemove,
    };
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
    clients?: { first_name: string; last_name: string } | null;
}

export function useRealtimeTasks(userId?: string, initialTasks?: RealtimeTask[]) {
    const filter = userId ? { column: "assigned_to", value: userId } : undefined;
    return useRealtimeSubscription<RealtimeTask>("tasks", filter, initialTasks);
}

/**
 * Hook specifically for alerts
 */
export interface RealtimeAlert {
    id: string;
    title: string;
    message?: string;
    alert_type: string;
    is_read: boolean;
    is_dismissed: boolean;
    created_at: string;
    user_id: string;
}

export function useRealtimeAlerts(userId?: string, initialAlerts?: RealtimeAlert[]) {
    const filter = userId ? { column: "user_id", value: userId } : undefined;
    return useRealtimeSubscription<RealtimeAlert>("alerts", filter, initialAlerts);
}

/**
 * Hook specifically for clients (for staff dashboards)
 */
export interface RealtimeClient {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    status: string;
    updated_at?: string;
}

export function useRealtimeClients(initialClients?: RealtimeClient[]) {
    return useRealtimeSubscription<RealtimeClient>("clients", undefined, initialClients);
}
