'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  CheckCircle,
  PenLine,
  Upload,
  ArrowRight,
  ArrowLeft,
  Info,
  AlertTriangle,
  Loader2,
  AlertCircle,
  RotateCcw,
  BadgeCheck,
  Users
} from 'lucide-react';
import { LanguageSelector } from '@/components/ui/language-selector';
import { submitSelfServiceApplication } from '@/app/actions/self-service';
import { ENGAGEMENT_LETTER_TEXT } from '@/lib/constants';
import { formatPacificLocaleDate } from '@/lib/date-utils';

// Simple header for public self-service page - NO client search
function SelfServiceHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="container flex h-14 md:h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">Client Self-Service</span>
        </div>
        <Link href="/login">
          <Button variant="outline" size="sm">
            Already have an account? Sign In
          </Button>
        </Link>
      </div>
    </header>
  );
}

export default function SelfServiceIntakePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
    preferredLanguage: 'english',
    street: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const totalSteps = 2;
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

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.firstName &&
          formData.lastName &&
          formData.email &&
          formData.phone &&
          formData.dateOfBirth &&
          formData.password &&
          formData.password.length >= 6;
      case 2:
        return agreed;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Generate PDF only when signature is captured
      let pdfData = undefined;
      if (signature) {
        const { generateEngagementLetterPDF } = await import('@/lib/pdf-utils');
        pdfData = generateEngagementLetterPDF(`${formData.firstName} ${formData.lastName}`, signature);
      }

      const result = await submitSelfServiceApplication({
        ...formData,
        signature: signature || undefined,
        pdfData
      });

      if (!result.success) {
        throw new Error(result.error || 'Registration failed');
      }

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?registered=true');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mb-6">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Registration Complete!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for registering. Please check your email to verify your account.
              After logging in, you can complete your profile information.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Redirecting to login in 3 seconds...
            </p>
            <Link href="/login?registered=true">
              <Button>Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SelfServiceHeader />

      <main className="container px-4 py-6 max-w-3xl mx-auto">
        {/* Language selector at top of form */}
        <div className="mb-6">
          <LanguageSelector variant="full" />
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
              Engagement Letter
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

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      placeholder="Street address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="City"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="State"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      placeholder="ZIP code"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Min. 6 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>
                {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-sm text-red-500">Passwords do not match</p>
                )}
                {formData.password && formData.password.length < 6 && (
                  <p className="text-sm text-red-500">Password must be at least 6 characters</p>
                )}

                <div className="space-y-2">
                  <Label>Preferred Language</Label>
                  <Select
                    value={formData.preferredLanguage}
                    onValueChange={(value) => handleSelectChange('preferredLanguage', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="spanish">Spanish / Español</SelectItem>
                      <SelectItem value="chinese">Chinese / 中文</SelectItem>
                      <SelectItem value="vietnamese">Vietnamese / Tiếng Việt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">You can finish intake later</p>
                    <p className="mt-1">Complete the rest of your intake after signing in. We&apos;ll guide you step by step.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Quick Consent (optional) */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold">Engagement Letter</h2>
                  <p className="text-gray-500 mt-1">Please review and sign to continue</p>
                </div>

                <div className="border rounded-lg p-4 max-h-[260px] overflow-y-auto bg-gray-50">
                  <pre className="whitespace-pre-wrap text-sm font-sans">
                    {ENGAGEMENT_LETTER_TEXT}
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
                      Please sign below to complete your registration.
                    </p>
                  </label>
                </div>

                {signature ? (
                  <div className="border rounded-xl p-6 bg-white shadow-sm ring-1 ring-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-medium text-gray-700">Digital Signature Captured</p>
                      <BadgeCheck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="bg-gray-50 border rounded-lg p-4 flex justify-center">
                      <Image src={signature} alt="Your signature" width={300} height={96} className="max-h-24 object-contain" />
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <p className="text-xs text-gray-500 italic">Signed on {formatPacificLocaleDate(new Date())}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-red-600 h-8 gap-1"
                        onClick={() => {
                          setSignature(null);
                          setSignatureOpen(true);
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Redraw
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-32 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all rounded-xl group"
                    onClick={() => setSignatureOpen(true)}
                  >
                    <div className="flex flex-col items-center">
                      <PenLine className="h-10 w-10 text-gray-400 group-hover:text-blue-500 mb-2 transition-colors" />
                      <span className="font-medium text-gray-600 group-hover:text-blue-600">Click to sign engagement letter</span>
                      <p className="text-xs text-gray-400 mt-1">Draw using mouse or touch</p>
                    </div>
                  </Button>
                )}

                {signature && (
                  <div className="bg-green-50 p-4 rounded-lg flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium">Ready to submit!</p>
                      <p className="mt-1">Your signature has been captured. Click "Create Account" to finish.</p>
                    </div>
                  </div>
                )}

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
              disabled={!canProceed() || loading}
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSubmit}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
