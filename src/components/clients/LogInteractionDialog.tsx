'use client';

import { useState, useEffect } from 'react';
import { logClientInteraction, InteractionType } from '@/app/actions/history';
import { getPrograms, Program } from '@/app/actions/programs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Mail, Users, MessageSquare, Clock, Plus, Loader2, LucideIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface LogInteractionDialogProps {
    clientId: string;
    clientName: string;
    onSuccess?: () => void;
}

const interactionTypes: { value: InteractionType; label: string; icon: LucideIcon }[] = [
    { value: 'note', label: 'Internal Note', icon: MessageSquare },
    { value: 'call', label: 'Phone Call', icon: Phone },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'meeting', label: 'Face-to-Face Meeting', icon: Users },
    { value: 'other', label: 'Other Interaction', icon: Clock },
];

export function LogInteractionDialog({ clientId, clientName, onSuccess }: LogInteractionDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [programs, setPrograms] = useState<Program[]>([]);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        type: 'note' as InteractionType,
        title: '',
        description: '',
        programId: 'none',
    });

    useEffect(() => {
        if (open) {
            getPrograms().then(result => {
                if (result.success && result.data) {
                    setPrograms(result.data);
                }
            });
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) return;

        setLoading(true);
        try {
            const selectedProgram = programs.find(p => p.id === formData.programId);
            const metadata = selectedProgram ? {
                program_id: selectedProgram.id,
                program_name: selectedProgram.name
            } : {};

            const result = await logClientInteraction({
                clientId,
                actionType: formData.type,
                title: formData.title,
                description: formData.description,
                metadata,
            });

            if (result.success) {
                toast({
                    title: "Interaction logged",
                    description: `Successfully recorded ${formData.type} for ${clientName}`,
                });
                setOpen(false);
                setFormData({ type: 'note', title: '', description: '', programId: 'none' });
                if (onSuccess) onSuccess();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to log interaction",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Log Interaction
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Log Interaction</DialogTitle>
                        <DialogDescription>
                            Record a new touchpoint or note for {clientName}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="type">Interaction Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value) => setFormData({ ...formData, type: value as InteractionType })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {interactionTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            <div className="flex items-center gap-2">
                                                <type.icon className="w-4 h-4 text-gray-500" />
                                                {type.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="program">Related Program (Optional)</Label>
                            <Select
                                value={formData.programId}
                                onValueChange={(value) => setFormData({ ...formData, programId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select program" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {programs.map((program) => (
                                        <SelectItem key={program.id} value={program.id}>
                                            {program.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="title">Summary / Title</Label>
                            <Input
                                id="title"
                                placeholder="Briefly describe the interaction"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Details (Optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="Add more detailed notes about what was discussed..."
                                className="min-h-[120px]"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !formData.title}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Interaction
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
