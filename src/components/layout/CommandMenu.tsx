"use client"

import * as React from "react"
import {
    Calendar,
    User,
    Search,
    CheckSquare,
    Users,
    LayoutDashboard,
    PlusCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"

export function CommandMenu() {
    const [open, setOpen] = React.useState(false)
    const router = useRouter()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    return (
        <>
            <div className="fixed bottom-4 right-4 z-50 md:hidden">
                <button
                    onClick={() => setOpen(true)}
                    className="bg-primary text-primary-foreground h-12 w-12 rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
                    aria-label="Open Command Menu"
                >
                    <Search className="h-6 w-6" />
                </button>
            </div>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Suggestions">
                        <CommandItem onSelect={() => runCommand(() => router.push('/dashboard'))}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push('/clients'))}>
                            <Users className="mr-2 h-4 w-4" />
                            <span>Clients</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push('/tasks'))}>
                            <CheckSquare className="mr-2 h-4 w-4" />
                            <span>Tasks</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push('/calendar'))}>
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>Calendar</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Quick Actions">
                        <CommandItem onSelect={() => runCommand(() => router.push('/client-intake'))}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            <span>New Intake</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push('/profile'))}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                            <CommandShortcut>⌘P</CommandShortcut>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
