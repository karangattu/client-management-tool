'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2 } from 'lucide-react';

interface TaskCompleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (note?: string) => Promise<void>;
  taskTitle: string;
  isLoading?: boolean;
  /** Whether to show the optional note field */
  showNoteField?: boolean;
  /** Placeholder text for the note field */
  notePlaceholder?: string;
}

export function TaskCompleteDialog({
  isOpen,
  onClose,
  onConfirm,
  taskTitle,
  isLoading = false,
  showNoteField = true,
  notePlaceholder = "Add a brief note about how you completed this task (optional)",
}: TaskCompleteDialogProps) {
  const [note, setNote] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const handleConfirm = async () => {
    setLocalLoading(true);
    try {
      await onConfirm(note.trim() || undefined);
      setNote('');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !localLoading) {
      setNote('');
      onClose();
    }
  };

  const loading = isLoading || localLoading;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Complete Task
          </DialogTitle>
          <DialogDescription>
            Mark &quot;{taskTitle}&quot; as completed.
          </DialogDescription>
        </DialogHeader>

        {showNoteField && (
          <div className="space-y-2 py-4">
            <Label htmlFor="completion-note">Completion Note</Label>
            <Textarea
              id="completion-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={notePlaceholder}
              className="resize-none"
              rows={3}
              maxLength={500}
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              {note.length}/500 characters
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Complete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
