'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { submitSelfServiceApplication } from '@/app/actions/self-service';
import { type User } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle,
  PenLine,
  ArrowRight,
  ArrowLeft,
  Info,
  Users,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LanguageSelector } from '@/components/ui/language-selector';
import { useLanguage } from '@/lib/language-context';
import { US_STATES, ENGAGEMENT_LETTER_TEXT } from '@/lib/constants';


export default function ClientPortalPage() {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    preferredLanguage: 'english',
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

  // Fetch current user and verification status so we can show CTA and auto-redirect
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          setIsVerified(!!user.email_confirmed_at);
        } else {
          setCurrentUser(null);
          setIsVerified(false);
        }
      } catch {
        setCurrentUser(null);
        setIsVerified(false);
      }
    })();
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let x, y;

    if ('touches' in e) {
      x = (e.touches[0].clientX - rect.left) * scaleX;
      y = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let x, y;

    if ('touches' in e) {
      e.preventDefault();
      x = (e.touches[0].clientX - rect.left) * scaleX;
      y = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
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
        return formData.firstName && formData.lastName && formData.email &&
          formData.password && formData.password === formData.confirmPassword &&
          formData.password.length >= 6;
      case 2:
        return formData.street && formData.city && formData.state && formData.zipCode;
      case 3:
        return agreed;
      case 4:
        return signature !== null;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      let pdfData: string | undefined;
      // Generate PDF if signature is provided
      if (signature) {
        const { generateEngagementLetterPDF } = await import('@/lib/pdf-utils');
        const clientName = `${formData.firstName} ${formData.lastName}`;
        pdfData = generateEngagementLetterPDF(clientName, signature);
      }

      const result = await submitSelfServiceApplication({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        password: formData.password,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        preferredLanguage: formData.preferredLanguage,
        signature: signature || undefined,
        pdfData: pdfData,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setSuccess(true);

      // If the new user is already verified (rare), redirect them to complete profile
      if (result.userId) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email_confirmed_at) {
          router.push('/profile-completion');
        }
      }
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
            <p className="text-gray-600 mb-4">
              Thank you for registering. Please check your email to verify your account.
              A case manager will review your information and contact you soon.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              After verifying your email, you&apos;ll be able to complete your full profile with additional details (demographics, household, finances, and health).
            </p>

            <div className="flex gap-3 justify-center">
              <Link href="/login">
                <Button variant="outline">Go to Login</Button>
              </Link>

              {/* Direct link to profile completion - will prompt login if necessary */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/profile-completion">
                      <Button>Complete Your Profile</Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    You will be prompted to log in if you are not currently signed in. Finish the full intake to provide detailed information for your case.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container px-4 py-4 max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg">ClientHub</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <Link href="/login" className="text-sm text-blue-600 hover:underline">
              {t('auth.staffLogin')}
            </Link>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-3xl mx-auto">
        {/* Language selector at top of form */}
        <div className="mb-6">
          <LanguageSelector variant="full" />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">{t('clientPortal.title')}</h1>
          <p className="text-gray-600 mt-1">{t('clientPortal.description')}</p>

          {/* CTA for logged-in, verified clients to complete full profile */}
          {currentUser && isVerified && (
            <div className="mt-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/profile-completion">
                      <Button variant="ghost">Complete your full profile</Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    Complete the full intake (demographics, household, finances, and health) to finish your profile.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2">
            <span className={`text-xs ${currentStep >= 1 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              Account
            </span>
            <span className={`text-xs ${currentStep >= 2 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              Address
            </span>
            <span className={`text-xs ${currentStep >= 3 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              Agreement
            </span>
            <span className={`text-xs ${currentStep >= 4 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              Sign
            </span>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <Card>
          <CardContent className="pt-6">
            {/* Step 1: Account Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold">{t('clientPortal.step1Title')}</h2>
                  <p className="text-gray-500 mt-1">{t('intake.personalInfo')}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('clients.firstName')} *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder={t('clients.firstName')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('clients.lastName')} *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder={t('clients.lastName')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('clients.email')} *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('auth.password')} *</Label>
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
                    <Label htmlFor="confirmPassword">{t('auth.confirmPassword')} *</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder={t('auth.confirmPassword')}
                    />
                  </div>
                </div>
                {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-sm text-red-500">Passwords do not match</p>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('clients.phone')}</Label>
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
                    <Label htmlFor="dateOfBirth">{t('clients.dateOfBirth')}</Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

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
                      <SelectItem value="spanish">Spanish</SelectItem>
                      <SelectItem value="chinese">Chinese</SelectItem>
                      <SelectItem value="vietnamese">Vietnamese</SelectItem>
                      <SelectItem value="korean">Korean</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
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

            {/* Step 2: Address */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold">{t('clientPortal.step2Title')}</h2>
                  <p className="text-gray-500 mt-1">{t('intake.addressInfo')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="street">{t('clients.streetAddress')} *</Label>
                  <Input
                    id="street"
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    placeholder="123 Main Street, Apt 4B"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">{t('clients.city')} *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder={t('clients.city')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">{t('clients.state')} *</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => handleSelectChange('state', value)}
                    >
                      <SelectTrigger id="state">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">{t('clients.zipCode')} *</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    placeholder="12345"
                    className="max-w-[200px]"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Engagement Letter */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold">{t('clientPortal.step3Title')}</h2>
                  <p className="text-gray-500 mt-1">{t('clientPortal.agreementText')}</p>
                </div>

                <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto bg-gray-50">
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
                  <h2 className="text-xl font-semibold">{t('clientPortal.step4Title')}</h2>
                  <p className="text-gray-500 mt-1">{t('clientPortal.signatureLabel')}</p>
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
                      {t('clientPortal.clearSignature')}
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
                      <p className="mt-1">Your signature has been captured. Click &quot;Create Account&quot; to complete your registration.</p>
                    </div>
                  </div>
                )}

                {/* Signature Modal */}
                {signatureOpen && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg">
                      <CardHeader>
                        <CardTitle>Draw Your Signature</CardTitle>
                        <CardDescription>
                          Use your finger or mouse to draw your signature
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
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
                      </CardContent>
                    </Card>
                  </div>
                )}
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
            {t('common.back')}
          </Button>

          {currentStep < totalSteps ? (
            <Button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed()}
            >
              {t('common.next')}
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
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('clientPortal.submitApplication')}
                </>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
