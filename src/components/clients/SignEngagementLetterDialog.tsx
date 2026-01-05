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
import { useRef, useEffect } from "react";
import { jsPDF } from "jspdf";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { FilePen, CheckCircle2, PenLine, RotateCcw } from "lucide-react";
import { ENGAGEMENT_LETTER_TEXT } from "@/lib/constants";
import { signEngagementLetter } from "@/app/actions/signature";

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
    const [isDrawing, setIsDrawing] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { toast } = useToast();

    // Initialize canvas
    useEffect(() => {
        if (open && canvasRef.current && agreed) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }
        }
    }, [open, agreed]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;

        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;

        if ('touches' in e) {
            e.preventDefault();
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setSignature(null);
    };

    const saveSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dataUrl = canvas.toDataURL('image/png');
        setSignature(dataUrl);
    };

    const handleSign = async () => {
        if (!agreed || !signature) return;

        setLoading(true);
        try {
            // Generate PDF on the client side
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);

            // Title
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("ENGAGEMENT LETTER AND CONSENT FOR SERVICES", margin, 30);

            // Client Info
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text(`Client: ${clientName}`, margin, 45);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, 52);

            // Content
            doc.setFontSize(10);
            const splitText = doc.splitTextToSize(ENGAGEMENT_LETTER_TEXT, contentWidth);
            doc.text(splitText, margin, 65);

            // Signature Section
            // Approximate height of text to position signature
            const textLines = splitText.length;
            const textHeight = textLines * 5; // 5 units per line roughly
            const signatureY = Math.min(65 + textHeight + 20, 250);

            doc.line(margin, signatureY, pageWidth - margin, signatureY);
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("CLIENT SIGNATURE", margin, signatureY + 10);

            // Embed signature image
            doc.addImage(signature, 'PNG', margin, signatureY + 15, 60, 25);
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.text(`Digitally signed by ${clientName} on ${new Date().toLocaleString()}`, margin, signatureY + 45);

            const pdfBase64 = doc.output('datauristring').split(',')[1];

            const result = await signEngagementLetter(clientId, pdfBase64, signature);
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
                <span>Signed on {signedAt ? new Date(signedAt).toLocaleDateString() : 'N/A'}</span>
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
                            {signature ? (
                                <div className="border border-slate-200 rounded-lg p-3 bg-white relative group">
                                    <Image
                                        src={signature}
                                        alt="Client signature"
                                        width={550}
                                        height={150}
                                        className="max-h-24 w-auto mx-auto"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => setSignature(null)}
                                    >
                                        <RotateCcw className="w-4 h-4 text-slate-400 hover:text-red-500" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-1 bg-white">
                                    <canvas
                                        ref={canvasRef}
                                        width={550}
                                        height={150}
                                        className="w-full h-[150px] touch-none cursor-crosshair"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                    <div className="flex justify-between items-center p-2 bg-slate-50 border-t">
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <PenLine className="w-3 h-3" />
                                            Draw signature above
                                        </span>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" onClick={clearSignature} className="h-7 text-xs">
                                                Clear
                                            </Button>
                                            <Button size="sm" onClick={saveSignature} className="h-7 text-xs bg-slate-800 hover:bg-slate-900">
                                                Confirm Signature
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
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
        </Dialog>
    );
}
