"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { FilePen, CheckCircle2 } from "lucide-react";
import { ENGAGEMENT_LETTER_TEXT } from "@/lib/constants";
import { SignaturePadDialog, SignatureDisplay } from '@/components/ui/signature-pad';
import { signEngagementLetter } from "@/app/actions/signature";
import { Label } from "@/components/ui/label";
import { formatPacificLocaleDate } from "@/lib/date-utils";

interface SignEngagementLetterDialogProps {
    clientId: string;
    clientName: string;
    isSigned: boolean;
    signedAt?: string | null;
    onSuccess?: () => void;
}

export function SignEngagementLetterDialog({
    clientId,
    clientName,
    isSigned,
    signedAt,
    onSuccess
}: SignEngagementLetterDialogProps) {
    const [open, setOpen] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [signature, setSignature] = useState<string | null>(null);
    const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
    const { toast } = useToast();

    const handleSign = async () => {
        if (!agreed || !signature) return;

        setLoading(true);
        try {
            // Generate PDF using shared utility
            const { generateEngagementLetterPDF } = await import('@/lib/pdf-utils');
            const pdfBase64 = generateEngagementLetterPDF(clientName, signature);

            const result = await signEngagementLetter(clientId, pdfBase64, signature, clientName);
            if (result.success) {
                toast({
                    title: "Success",
                    description: "Engagement letter signed and PDF generated.",
                });
                if (onSuccess) onSuccess();
                setOpen(false);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to sign",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (isSigned) {
        return (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                <CheckCircle2 className="w-4 h-4" />
                <span>Signed on {signedAt ? formatPacificLocaleDate(signedAt) : 'N/A'}</span>
            </div>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700">
                    <FilePen className="w-4 h-4" />
                    Sign Engagement Letter
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Sign Engagement Letter</DialogTitle>
                    <DialogDescription>
                        Review the letter with {clientName} and have them confirm agreement below.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                        {ENGAGEMENT_LETTER_TEXT}
                    </div>
                </div>

                <div className="p-6 pt-2 border-t bg-slate-50/50">
                    <div className="flex items-start space-x-3 mb-6">
                        <Checkbox
                            id="staff-agreement"
                            checked={agreed}
                            onCheckedChange={(checked) => setAgreed(checked as boolean)}
                            className="mt-1"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <label
                                htmlFor="staff-agreement"
                                className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Client Confirmed Agreement
                            </label>
                            <p className="text-sm text-muted-foreground">
                                I confirm that {clientName} has reviewed the terms and verbally/digitally agreed to them in my presence.
                            </p>
                        </div>
                    </div>

                    {agreed && (
                        <div className="space-y-4 mb-6">
                            <Label className="text-sm font-semibold">Client Digital Signature</Label>
                            <SignatureDisplay
                                signature={signature}
                                onRequestSign={() => setSignatureDialogOpen(true)}
                                onClear={() => setSignature(null)}
                                signerName={clientName}
                            />
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSign}
                            disabled={!agreed || !signature || loading}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            {loading ? "Saving Record..." : "Record Digital Signature"}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>

            <SignaturePadDialog
                open={signatureDialogOpen}
                onOpenChange={setSignatureDialogOpen}
                onSave={setSignature}
                title="Client Signature"
                description={`Please have ${clientName} sign below.`}
            />
        </Dialog>
    );
}
