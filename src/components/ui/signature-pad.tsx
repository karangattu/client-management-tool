'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { RotateCcw, Check, PenLine, BadgeCheck } from 'lucide-react';
import Image from 'next/image';
import { formatPacificLocaleDate } from '@/lib/date-utils';

interface SignaturePadProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (signatureDataUrl: string) => void;
    title?: string;
    description?: string;
}

export function SignaturePadDialog({
    open,
    onOpenChange,
    onSave,
    title = 'Draw Your Signature',
    description = 'Use your finger or mouse to draw your signature below.',
}: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Initialize canvas
    useEffect(() => {
        if (open && canvasRef.current) {
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
    }, [open]);

    const getCoordinates = useCallback((
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
        canvas: HTMLCanvasElement
    ) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        if ('touches' in e) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY,
            };
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }, []);

    const startDrawing = useCallback((
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(x, y);
    }, [getCoordinates]);

    const draw = useCallback((
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if ('touches' in e) {
            e.preventDefault();
        }

        const { x, y } = getCoordinates(e, canvas);
        ctx.lineTo(x, y);
        ctx.stroke();
    }, [isDrawing, getCoordinates]);

    const stopDrawing = useCallback(() => {
        setIsDrawing(false);
    }, []);

    const clearSignature = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    const saveSignature = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
        onOpenChange(false);
    }, [onSave, onOpenChange]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                        <canvas
                            ref={canvasRef}
                            width={400}
                            height={150}
                            className="w-full touch-none cursor-crosshair bg-white"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                    </div>
                    <div className="flex justify-between">
                        <Button variant="outline" onClick={clearSignature}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Clear
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button onClick={saveSignature}>
                                <Check className="h-4 w-4 mr-2" />
                                Save Signature
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface SignatureDisplayProps {
    signature: string | null;
    onRequestSign: () => void;
    onClear: () => void;
    signerName?: string;
    className?: string;
}

export function SignatureDisplay({
    signature,
    onRequestSign,
    onClear,
    signerName,
    className,
}: SignatureDisplayProps) {
    if (signature) {
        return (
            <div className={`border rounded-xl p-6 bg-white shadow-sm ring-1 ring-gray-200 ${className || ''}`}>
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-gray-700">Digital Signature Captured</p>
                    <BadgeCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div className="bg-gray-50 border rounded-lg p-4 flex justify-center">
                    <Image src={signature} alt="Your signature" width={300} height={96} className="max-h-24 object-contain" />
                </div>
                <div className="flex justify-between items-center mt-4">
                    <p className="text-xs text-gray-500 italic">
                        {signerName ? `Signed by ${signerName} on ` : 'Signed on '}
                        {formatPacificLocaleDate(new Date())}
                    </p>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-red-600 h-8 gap-1"
                        onClick={() => {
                            onClear();
                            onRequestSign();
                        }}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Redraw
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Button
            variant="outline"
            className={`w-full h-32 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all rounded-xl group ${className || ''}`}
            onClick={onRequestSign}
        >
            <div className="flex flex-col items-center">
                <PenLine className="h-10 w-10 text-gray-400 group-hover:text-blue-500 mb-2 transition-colors" />
                <span className="font-medium text-gray-600 group-hover:text-blue-600">Click to sign</span>
                <p className="text-xs text-gray-400 mt-1">Draw using mouse or touch</p>
            </div>
        </Button>
    );
}
