'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';

const INACTIVITY_LIMIT_MS = 60 * 1000; // 60 seconds

export function AutoLogout() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Only track activity if user is logged in
        if (!user) return;

        const resetTimer = () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(async () => {
                // Timer expired
                await signOut();
                router.push('/login');
                toast({
                    title: "Session Expired",
                    description: "You have been logged out due to inactivity.",
                    variant: "destructive",
                });
            }, INACTIVITY_LIMIT_MS);
        };

        // Events to track activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        // Setup listeners
        events.forEach(event => {
            document.addEventListener(event, resetTimer);
        });

        // Initial start
        resetTimer();

        // Cleanup
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            events.forEach(event => {
                document.removeEventListener(event, resetTimer);
            });
        };
    }, [user, signOut, router, toast]);

    // Render nothing
    return null;
}
