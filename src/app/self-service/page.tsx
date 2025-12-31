'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  CheckCircle,
  PenLine,
  Upload,
  ArrowRight,
  ArrowLeft,
  Info,
  AlertTriangle,
} from 'lucide-react';

// Engagement Letter Content
const engagementLetterContent = `
ENGAGEMENT LETTER AND CONSENT FOR SERVICES

Welcome to our Client Management Services. This letter outlines our agreement to provide services to you.

SERVICES PROVIDED:
We agree to provide the following services:
• Case management and support services
• Housing assistance and referrals
• Benefits enrollment assistance
• Document management and storage
• Connection to community resources

YOUR RESPONSIBILITIES:
As a client, you agree to:
• Provide accurate and truthful information
• Notify us of any changes to your contact information
• Attend scheduled appointments
• Actively participate in your case plan

CONFIDENTIALITY:
All information you provide will be kept confidential in accordance with applicable privacy laws. Your information will only be shared with your written consent or as required by law.

RELEASE OF INFORMATION:
By signing this agreement, you authorize us to:
• Collect and store your personal information
• Share information with partner organizations as needed for your services
• Contact you regarding your case and services

DIGITAL SIGNATURE CONSENT:
By providing your electronic signature below, you acknowledge that:
• Your electronic signature has the same legal effect as a handwritten signature
• You have read and understood this engagement letter
• You consent to receive services as described above

This agreement is effective upon signing and remains in effect until terminated by either party.
`;

export default function SelfServiceIntakePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  // Initialize canvas
  useEffect(() => {
    if (signatureOpen && canvasRef.current) {
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
  }, [signatureOpen]);

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
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    setSignature(dataUrl);
    setSignatureOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.firstName && formData.lastName && formData.email;
      case 2:
        return true; // Document upload is optional
      case 3:
        return agreed;
      case 4:
        return signature !== null;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Client Self-Service" showBackButton={false} />

      <main className="container px-4 py-6 max-w-3xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2">
            <span className={`text-xs ${currentStep >= 1 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              Basic Info
            </span>
            <span className={`text-xs ${currentStep >= 2 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              Documents
            </span>
            <span className={`text-xs ${currentStep >= 3 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              Agreement
            </span>
            <span className={`text-xs ${currentStep >= 4 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              Sign
            </span>
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="pt-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold">Welcome! Let&apos;s get started</h2>
                  <p className="text-gray-500 mt-1">Please provide your basic information</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your.email@example.com"
                  />
                  <p className="text-xs text-gray-500">
                    We&apos;ll send important updates to this email
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Your information is secure</p>
                    <p className="mt-1">All data is encrypted and stored securely in compliance with privacy regulations.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Document Upload */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold">Upload Documents</h2>
                  <p className="text-gray-500 mt-1">Upload any supporting documents (optional)</p>
                </div>

                <div className="grid gap-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="font-medium">Drop files here or click to upload</p>
                    <p className="text-sm text-gray-500 mt-1">
                      PDF, JPG, PNG up to 10MB each
                    </p>
                    <Button variant="outline" className="mt-4">
                      Select Files
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recommended documents:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Photo ID (Driver&apos;s License, State ID, Passport)
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Proof of Income (Pay stubs, benefits letter)
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Proof of Address (Utility bill, mail)
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Don&apos;t have documents right now?</p>
                    <p className="mt-1">No problem! You can skip this step and upload documents later from your client portal.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Engagement Letter */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold">Review & Agree</h2>
                  <p className="text-gray-500 mt-1">Please read the engagement letter carefully</p>
                </div>

                <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto bg-gray-50">
                  <pre className="whitespace-pre-wrap text-sm font-sans">
                    {engagementLetterContent}
                  </pre>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <Checkbox
                    id="agree"
                    checked={agreed}
                    onCheckedChange={(checked) => setAgreed(checked as boolean)}
                    className="mt-1"
                  />
                  <label htmlFor="agree" className="text-sm cursor-pointer">
                    <span className="font-medium">I have read and agree to the terms</span>
                    <p className="text-gray-500 mt-1">
                      By checking this box, you acknowledge that you have read, understood, and agree to the engagement letter and consent for services.
                    </p>
                  </label>
                </div>
              </div>
            )}

            {/* Step 4: Digital Signature */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold">Sign to Complete</h2>
                  <p className="text-gray-500 mt-1">Provide your digital signature below</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-4">
                    Signing as: <span className="font-medium">{formData.firstName} {formData.lastName}</span>
                    <br />
                    Email: <span className="font-medium">{formData.email}</span>
                  </p>
                </div>

                {signature ? (
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-2">Your Signature:</p>
                    <div className="bg-white border rounded p-2 flex justify-center">
                      <Image src={signature} alt="Your signature" width={300} height={96} className="max-h-24 object-contain" />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setSignature(null);
                        setSignatureOpen(true);
                      }}
                    >
                      Clear & Re-sign
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-24 border-2 border-dashed"
                    onClick={() => setSignatureOpen(true)}
                  >
                    <div className="flex flex-col items-center">
                      <PenLine className="h-8 w-8 text-gray-400 mb-2" />
                      <span>Click to sign</span>
                    </div>
                  </Button>
                )}

                {signature && (
                  <div className="bg-green-50 p-4 rounded-lg flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium">Ready to submit!</p>
                      <p className="mt-1">Your signature has been captured. Click &quot;Submit&quot; to complete your registration.</p>
                    </div>
                  </div>
                )}

                {/* Signature Dialog */}
                <Dialog open={signatureOpen} onOpenChange={setSignatureOpen}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Draw Your Signature</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">
                        Use your finger or mouse to draw your signature in the box below.
                      </p>
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
                          Clear
                        </Button>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setSignatureOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={saveSignature}>
                            Save Signature
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < totalSteps ? (
            <Button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed()}
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              disabled={!canProceed()}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit Application
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}