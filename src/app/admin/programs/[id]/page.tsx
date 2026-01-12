'use client';

import { useState, useEffect, use } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, CheckCircle, AlertCircle, ArrowLeft, Loader2, Pencil } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { getPrograms, getProgramTasks, addProgramTask, updateProgramTask, deleteProgramTask, Program, ProgramTask } from '@/app/actions/programs';

export default function ProgramDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [program, setProgram] = useState<Program | null>(null);
    const [tasks, setTasks] = useState<ProgramTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingTask, setEditingTask] = useState<ProgramTask | null>(null);

    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'medium',
        daysDueOffset: 7,
        isRequired: true
    });

    useEffect(() => {
        loadData();
    }, [id]);

    useEffect(() => {
        if (!createOpen) {
            setEditingTask(null);
            setNewTask({
                title: '',
                description: '',
                priority: 'medium',
                daysDueOffset: 7,
                isRequired: true
            });
        }
    }, [createOpen]);

    async function loadData() {
        // We need to fetch the specific program. 
        // Since getPrograms fetches all, we filter. Or we could add a specific getProgram(id) action.
        // Optimized for now: just fetch all and find (cached).
        const progResult = await getPrograms();
        if (progResult.success && progResult.data) {
            const p = progResult.data.find(p => p.id === id);
            setProgram(p || null);
        }

        const taskResult = await getProgramTasks(id);
        if (taskResult.success && taskResult.data) {
            setTasks(taskResult.data);
        }
        setLoading(false);
    }

    const handleSaveTask = async () => {
        if (!newTask.title.trim()) return;
        setSaving(true);

        let result;

        if (editingTask) {
            result = await updateProgramTask({
                taskId: editingTask.id,
                title: newTask.title,
                description: newTask.description,
                priority: newTask.priority,
                daysDueOffset: Number(newTask.daysDueOffset),
                isRequired: newTask.isRequired
            });
        } else {
            result = await addProgramTask({
                programId: id,
                title: newTask.title,
                description: newTask.description,
                priority: newTask.priority,
                daysDueOffset: Number(newTask.daysDueOffset),
                isRequired: newTask.isRequired
            });
        }

        if (result.success) {
            setCreateOpen(false);
            loadData();
        } else {
            alert(editingTask ? "Failed to update task" : "Failed to add task");
        }
        setSaving(false);
    };

    const handleEditClick = (task: ProgramTask) => {
        setEditingTask(task);
        setNewTask({
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            daysDueOffset: task.days_due_offset,
            isRequired: task.is_required
        });
        setCreateOpen(true);
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this template task?')) return;
        await deleteProgramTask(taskId);
        loadData();
    };

    if (loading) return <div className="p-8"><Skeleton className="h-12 w-full mb-4" /><Skeleton className="h-64 w-full" /></div>;
    if (!program) return <div className="p-8">Program not found</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <AppHeader title={`Configure: ${program.name}`} showBackButton />

            <main className="container px-4 py-6">
                <div className="mb-6">
                    <Link href="/admin/programs" className="text-sm text-blue-600 hover:underline flex items-center mb-2">
                        <ArrowLeft className="h-3 w-3 mr-1" /> Back to Programs
                    </Link>
                    <p className="text-gray-500">{program.description}</p>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Default Tasks</CardTitle>
                        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Task Template
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{editingTask ? 'Edit Task Template' : 'Add Default Task'}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label>Task Title</Label>
                                        <Input
                                            value={newTask.title}
                                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                            placeholder="e.g. Upload Income Verification"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Textarea
                                            value={newTask.description}
                                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                            placeholder="Task details..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Priority</Label>
                                            <Select
                                                value={newTask.priority}
                                                onValueChange={(val) => setNewTask({ ...newTask, priority: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="low">Low</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="high">High</SelectItem>
                                                    <SelectItem value="urgent">Urgent</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Due Date Offset (Days)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={newTask.daysDueOffset}
                                                onChange={(e) => setNewTask({ ...newTask, daysDueOffset: parseInt(e.target.value) || 0 })}
                                            />
                                            <p className="text-xs text-gray-500">Days after enrollment</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                                        <Button onClick={handleSaveTask} disabled={saving}>
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingTask ? 'Save Changes' : 'Add Template')}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        {tasks.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
                                No default tasks configured for this program yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tasks.map((task) => (
                                    <div key={task.id} className="flex items-start justify-between p-4 bg-white border rounded-lg hover:shadow-sm">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold">{task.title}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {task.days_due_offset} days
                                                </Badge>
                                                <Badge className={`
                          text-xs 
                          ${task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                                        task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-gray-100 text-gray-700'}
                        `}>
                                                    {task.priority}
                                                </Badge>
                                            </div>
                                            {task.description && (
                                                <p className="text-sm text-gray-500">{task.description}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleEditClick(task)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteTask(task.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
