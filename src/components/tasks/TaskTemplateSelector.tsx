'use client';

import { useState } from 'react';
import { 
    ClipboardList, 
    FileText, 
    CheckSquare, 
    Phone, 
    Home, 
    FileSearch,
    Building,
    Users,
    Shield,
    ExternalLink,
    FolderClosed,
    Send,
    Bell,
    MessageCircle,
    ChevronRight,
    Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle 
} from '@/components/ui/dialog';
import { 
    TaskTemplate, 
    getTemplatesByCategory, 
    getCategoryLabel,
    calculateDueDate
} from '@/lib/task-templates';

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    ClipboardList,
    FileText,
    CheckSquare,
    Phone,
    Home,
    FileSearch,
    Building,
    Users,
    Shield,
    ExternalLink,
    FolderClosed,
    Send,
    Bell,
    MessageCircle,
};

interface TaskTemplateSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTemplate: (template: TaskTemplate & { calculatedDueDate: string }) => void;
}

export function TaskTemplateSelector({
    isOpen,
    onClose,
    onSelectTemplate,
}: TaskTemplateSelectorProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const templatesByCategory = getTemplatesByCategory();
    const categories = Object.keys(templatesByCategory);

    const handleTemplateSelect = (template: TaskTemplate) => {
        onSelectTemplate({
            ...template,
            calculatedDueDate: calculateDueDate(template),
        });
        onClose();
        setSelectedCategory(null);
    };

    const getIcon = (iconName: string) => {
        const Icon = iconMap[iconName] || FileText;
        return Icon;
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-500 text-white hover:bg-red-600';
            case 'high': return 'bg-orange-500 text-white hover:bg-orange-600';
            case 'medium': return 'bg-blue-500 text-white hover:bg-blue-600';
            default: return 'bg-gray-500 text-white hover:bg-gray-600';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => { onClose(); setSelectedCategory(null); }}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-yellow-500" />
                        Use a Task Template
                    </DialogTitle>
                    <DialogDescription>
                        Choose a template to quickly create a standardized task with pre-filled information.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[500px] pr-4">
                    {!selectedCategory ? (
                        // Category Selection
                        <div className="grid grid-cols-2 gap-3">
                            {categories.map((category) => {
                                const templates = templatesByCategory[category];
                                const firstTemplate = templates[0];
                                const Icon = getIcon(firstTemplate.icon);
                                
                                return (
                                    <Card 
                                        key={category}
                                        className="cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors"
                                        onClick={() => setSelectedCategory(category)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                                        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{getCategoryLabel(category)}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {templates.length} template{templates.length !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        // Template Selection within Category
                        <div className="space-y-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedCategory(null)}
                                className="mb-2"
                            >
                                ← Back to Categories
                            </Button>
                            
                            <h3 className="font-semibold text-lg mb-3">
                                {getCategoryLabel(selectedCategory)}
                            </h3>

                            {templatesByCategory[selectedCategory].map((template) => {
                                const Icon = getIcon(template.icon);
                                
                                return (
                                    <Card 
                                        key={template.id}
                                        className="cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors"
                                        onClick={() => handleTemplateSelect(template)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                                                    <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <p className="font-medium">{template.name}</p>
                                                        <Badge className={getPriorityColor(template.defaultPriority)}>
                                                            {template.defaultPriority}
                                                        </Badge>
                                                        {template.requiresClient && (
                                                            <Badge variant="outline" className="text-xs border-gray-400 text-gray-700 dark:text-gray-300">
                                                                Requires client
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-2">
                                                        {template.description}
                                                    </p>
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                        <span>Due in {template.defaultDueDays} days</span>
                                                        {template.tags && template.tags.length > 0 && (
                                                            <span className="flex items-center gap-1">
                                                                {template.tags.slice(0, 2).map(tag => (
                                                                    <span key={tag} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded text-xs font-medium">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

                <div className="flex justify-between items-center pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                        Templates help ensure consistent task creation
                    </p>
                    <Button variant="outline" onClick={() => { onClose(); setSelectedCategory(null); }}>
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Mini button to open template selector
 */
export function UseTemplateButton({ onClick }: { onClick: () => void }) {
    return (
        <Button
            variant="outline"
            size="sm"
            onClick={onClick}
            className="gap-2"
        >
            <Sparkles className="h-4 w-4" />
            Use Template
        </Button>
    );
}
