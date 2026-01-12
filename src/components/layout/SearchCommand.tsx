"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    Calendar,
    CreditCard,
    Settings,
    User,
    Users,
    LayoutDashboard,
    CheckSquare,
    Search,
    Plus,
    Home,
    FileText
} from "lucide-react";

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SearchCommand() {
    const [open, setOpen] = React.useState(false);
    const [clients, setClients] = React.useState<{ id: string; first_name: string; last_name: string }[]>([]);
    const router = useRouter();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    React.useEffect(() => {
        if (open) {
            const fetchClients = async () => {
                const supabase = createClient();
                const { data } = await supabase
                    .from("clients")
                    .select("id, first_name, last_name")
                    .limit(10); // Limit for performance in search

                if (data) {
                    setClients(data);
                }
            };

            fetchClients();
        }
    }, [open]);

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false);
        command();
    }, []);

    return (
        <>
            <Button
                variant="outline"
                className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2 text-muted-foreground"
                onClick={() => setOpen(true)}
            >
                <Search className="h-4 w-4 xl:mr-2" />
                <span className="hidden xl:inline-flex">Search clients...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>

                    <CommandGroup heading="Suggestions">
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/clients"))}>
                            <Users className="mr-2 h-4 w-4" />
                            <span>Clients</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/tasks"))}>
                            <CheckSquare className="mr-2 h-4 w-4" />
                            <span>Tasks</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/calendar"))}>
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>Calendar</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Quick Actions">
                        <CommandItem onSelect={() => runCommand(() => router.push("/client-intake"))}>
                            <Plus className="mr-2 h-4 w-4" />
                            <span>New Client Intake</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    {clients.length > 0 && (
                        <CommandGroup heading="Clients">
                            {clients.map((client) => (
                                <CommandItem
                                    key={client.id}
                                    onSelect={() => runCommand(() => router.push(`/clients/${client.id}`))}
                                >
                                    <User className="mr-2 h-4 w-4" />
                                    <span>{client.first_name} {client.last_name}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    <CommandSeparator />

                    <CommandGroup heading="Settings">
                        <CommandItem onSelect={() => runCommand(() => router.push("/profile"))}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                            <CommandShortcut>⇧⌘P</CommandShortcut>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    );
}
