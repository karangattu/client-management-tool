'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
  Eye,
  EyeOff,
  Info,
  Users,
  Loader2,
  AlertCircle,
  Save,
  Home,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LanguageSelector } from '@/components/ui/language-selector';
import { useLanguage } from '@/lib/language-context';
import { US_STATES, ENGAGEMENT_LETTER_TEXT } from '@/lib/constants';

const DRAFT_KEY = 'client-portal-draft';

// Fields safe to persist (excludes passwords for security)
interface DraftData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  preferredLanguage: string;
  currentStep: number;
  agreed: boolean;
  lastSaved?: string;
}

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
  const [draftSaved, setDraftSaved] = useState(false);
  const [isHomeless, setIsHomeless] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    mailingAddress: '',
    preferredLanguage: 'english',
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const clearFieldError = (name: string) => {
    setStepErrors(prev => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    clearFieldError(e.target.name);
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    clearFieldError(name);
  };

  // Save draft to localStorage (debounced)
  const saveDraft = useCallback(() => {
    if (typeof window === 'undefined') return;

    const draftData: DraftData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      dateOfBirth: formData.dateOfBirth,
      street: formData.street,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      preferredLanguage: formData.preferredLanguage,
      currentStep,
      agreed,
      lastSaved: new Date().toISOString(),
    };

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    setDraftSaved(true);

    // Hide indicator after 2 seconds
    setTimeout(() => setDraftSaved(false), 2000);
  }, [formData, currentStep, agreed]);

  // Debounced save on form changes
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      // Only save if user has started filling the form
      if (formData.firstName || formData.lastName || formData.email) {
        saveDraft();
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, currentStep, agreed, saveDraft]);

  // Restore draft on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const draft: DraftData = JSON.parse(savedDraft);
        setFormData(prev => ({
          ...prev,
          firstName: draft.firstName || '',
          lastName: draft.lastName || '',
          email: draft.email || '',
          phone: draft.phone || '',
          dateOfBirth: draft.dateOfBirth || '',
          street: draft.street || '',
          city: draft.city || '',
          state: draft.state || '',
          zipCode: draft.zipCode || '',
          preferredLanguage: draft.preferredLanguage || 'english',
        }));
        setAgreed(draft.agreed || false);

        // The signature is never restored (passwords/signature excluded for
        // security), so a restored step 4 would dead-end. Only restore the
        // furthest step that can actually be sat on without the signature;
        // never step up from what the draft supports.
        let maxStep = 1;
        const step1Filled = draft.firstName && draft.lastName && draft.email;
        const step2Filled = draft.street && draft.city && draft.state && draft.zipCode;
        if (step1Filled && step2Filled) {
          maxStep = draft.agreed ? 3 : 2;
        }
        const clampedStep = Math.min(draft.currentStep || 1, maxStep);
        setCurrentStep(clampedStep);

        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ ...draft, currentStep: clampedStep })
        );
      } catch (e) {
        console.error('Error restoring draft:', e);
      }
    }
  }, []);

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

  // Modal a11y: Escape to close and initial focus on the cancel button
  useEffect(() => {
    if (!signatureOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSignatureOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);

    cancelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
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
    clearFieldError('signature');
  };

  const validateStep = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const emailPattern = /\S+@\S+\.\S+/;

    if (currentStep === 1) {
      if (!formData.firstName.trim()) {
        errs.firstName = t('clientPortal.errorFirstNameRequired');
      }
      if (!formData.lastName.trim()) {
        errs.lastName = t('clientPortal.errorLastNameRequired');
      }
      if (!formData.email.trim()) {
        errs.email = t('clientPortal.errorEmailRequired');
      } else if (!emailPattern.test(formData.email.trim())) {
        errs.email = t('clientPortal.errorEmailInvalid');
      }
      if (!formData.password) {
        errs.password = t('clientPortal.errorPasswordRequired');
      } else if (formData.password.length < 6) {
        errs.password = t('clientPortal.errorPasswordShort');
      }
      if (!formData.confirmPassword) {
        errs.confirmPassword = t('clientPortal.errorConfirmPasswordRequired');
      }
      if (!formData.dateOfBirth) {
        errs.dateOfBirth = t('clientPortal.errorDateOfBirth');
      }
    } else if (currentStep === 2) {
      if (!isHomeless) {
        if (!formData.street.trim()) {
          errs.street = t('clientPortal.errorStreetRequired');
        }
        if (!formData.city.trim()) {
          errs.city = t('clientPortal.errorCityRequired');
        }
        if (!formData.state) {
          errs.state = t('clientPortal.errorStateRequired');
        }
        if (!formData.zipCode.trim()) {
          errs.zipCode = t('clientPortal.errorZipRequired');
        }
      }
    } else if (currentStep === 3) {
      if (!agreed) {
        errs.agreement = t('clientPortal.errorAgreementRequired');
      }
    }

    return errs;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.firstName && formData.lastName && formData.email &&
          /\S+@\S+\.\S+/.test(formData.email) &&
          formData.dateOfBirth &&
          formData.password && formData.password === formData.confirmPassword &&
          formData.password.length >= 6;
      case 2:
        return isHomeless || (formData.street && formData.city && formData.state && formData.zipCode);
      case 3:
        return agreed;
      case 4:
        return signature !== null;
      default:
        return true;
    }
  };

  const handleNext = () => {
    const errs = validateStep();
    if (!canProceed() || Object.keys(errs).length > 0) {
      setStepErrors(errs);
      return;
    }
    setStepErrors({});
    setCurrentStep(prev => prev + 1);
  };

  const handleSubmitClick = () => {
    if (loading) return;
    if (canProceed()) {
      setStepErrors({});
      handleSubmit();
    } else {
      setStepErrors({ signature: t('clientPortal.errorSignatureRequired') });
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
        isHomeless,
        mailingAddress: formData.mailingAddress,
        preferredLanguage: formData.preferredLanguage,
        signature: signature || undefined,
        pdfData: pdfData,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Clear draft on successful submission
      if (typeof window !== 'undefined') {
        localStorage.removeItem(DRAFT_KEY);
      }

      // Sign out locally so the session doesn't linger on a shared computer
      try {
        const supabase = createClient();
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Non-critical — proceed regardless
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setCurrentStep(1);
    setAgreed(false);
    setSignature(null);
    setSignatureOpen(false);
    setIsHomeless(false);
    setError(null);
    setStepErrors({});
    setFormData({
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
      mailingAddress: '',
      preferredLanguage: 'english',
    });
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
            <h2 className="text-2xl font-bold mb-2">{t('clientPortal.successTitle')}</h2>
            <p className="text-gray-600 mb-4">
              {t('clientPortal.successText')}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {t('clientPortal.successNote')}
              <br />
              {t('clientPortal.successProfileText')}
            </p>

            <div className="flex gap-3 justify-center flex-wrap">
              <Button variant="outline" onClick={resetForm}>
                {t('clientPortal.registerAnother')}
              </Button>

              <Link href="/login">
                <Button variant="outline">{t('clientPortal.goToLogin')}</Button>
              </Link>

              {/* Direct link to profile completion - will prompt login if necessary */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/profile-completion">
                      <Button>{t('clientPortal.completeProfile')}</Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('clientPortal.completeProfileTooltip')}
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
            {draftSaved && (
              <div className="flex items-center gap-1 text-sm text-green-600 animate-pulse">
                <Save className="h-4 w-4" />
                <span>{t('clientPortal.draftSaved')}</span>
              </div>
            )}
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
                      <Button variant="ghost">{t('clientPortal.fullProfileCta')}</Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('clientPortal.fullProfileTooltip')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {t('clientPortal.stepOf', { current: String(currentStep), total: String(totalSteps) })}
            </span>
            <span className="text-sm text-gray-500">
              {t('clientPortal.percentComplete', { percent: String(Math.round(progress)) })}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2">
            <span className={`text-xs ${currentStep >= 1 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              {t('clientPortal.stepAccount')}
            </span>
            <span className={`text-xs ${currentStep >= 2 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              {t('clientPortal.stepAddress')}
            </span>
            <span className={`text-xs ${currentStep >= 3 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              {t('clientPortal.stepAgreement')}
            </span>
            <span className={`text-xs ${currentStep >= 4 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              {t('clientPortal.stepSign')}
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
                      aria-invalid={!!stepErrors.firstName}
                      aria-describedby={stepErrors.firstName ? 'firstName-error' : undefined}
                    />
                    {stepErrors.firstName && (
                      <p id="firstName-error" className="text-sm text-red-500">{stepErrors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('clients.lastName')} *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder={t('clients.lastName')}
                      aria-invalid={!!stepErrors.lastName}
                      aria-describedby={stepErrors.lastName ? 'lastName-error' : undefined}
                    />
                    {stepErrors.lastName && (
                      <p id="lastName-error" className="text-sm text-red-500">{stepErrors.lastName}</p>
                    )}
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
                    aria-invalid={!!stepErrors.email}
                    aria-describedby={stepErrors.email ? 'email-error' : undefined}
                  />
                  {stepErrors.email && (
                    <p id="email-error" className="text-sm text-red-500">{stepErrors.email}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('auth.password')} *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder={t('clientPortal.min6Characters')}
                        className="pr-10"
                        aria-invalid={!!stepErrors.password}
                        aria-describedby={stepErrors.password ? 'password-error' : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label={showPassword ? t('clientPortal.hidePasswordToggle') : t('clientPortal.showPasswordToggle')}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {stepErrors.password && (
                      <p id="password-error" className="text-sm text-red-500">{stepErrors.password}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('auth.confirmPassword')} *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder={t('auth.confirmPassword')}
                        className="pr-10"
                        aria-invalid={!!stepErrors.confirmPassword}
                        aria-describedby={stepErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(prev => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label={showConfirmPassword ? t('clientPortal.hidePasswordToggle') : t('clientPortal.showPasswordToggle')}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {stepErrors.confirmPassword && (
                      <p id="confirmPassword-error" className="text-sm text-red-500">{stepErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>
                {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-sm text-red-500">{t('clientPortal.passwordsDoNotMatch')}</p>
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
                    <Label htmlFor="dateOfBirth">{t('clients.dateOfBirth')} *</Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      aria-invalid={!!stepErrors.dateOfBirth}
                      aria-describedby={stepErrors.dateOfBirth ? 'dateOfBirth-error' : undefined}
                    />
                    {stepErrors.dateOfBirth && (
                      <p id="dateOfBirth-error" className="text-sm text-red-500">{stepErrors.dateOfBirth}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferred-language">{t('clientPortal.preferredLanguage')}</Label>
                  <Select
                    value={formData.preferredLanguage}
                    onValueChange={(value) => handleSelectChange('preferredLanguage', value)}
                  >
                    <SelectTrigger
                      id="preferred-language"
                      aria-labelledby="preferred-language"
                    >
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
                    <p className="font-medium">{t('clientPortal.infoSecureTitle')}</p>
                    <p className="mt-1">{t('clientPortal.infoSecureText')}</p>
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

                {/* No fixed address checkbox */}
                <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
                  <Checkbox
                    id="isHomeless"
                    checked={isHomeless}
                    onCheckedChange={(checked) => {
                      setIsHomeless(!!checked);
                      if (checked) {
                        setFormData(prev => ({ ...prev, street: '', city: '', state: '', zipCode: '' }));
                      }
                      clearFieldError('street');
                      clearFieldError('city');
                      clearFieldError('state');
                      clearFieldError('zipCode');
                    }}
                    className="border-orange-400 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                  />
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-orange-600 flex-shrink-0" />
                    <label htmlFor="isHomeless" className="text-sm font-medium text-orange-800 cursor-pointer leading-snug">
                      {t('clientPortal.homelessCheckbox')}
                    </label>
                  </div>
                </div>

                {isHomeless ? (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800">
                      {t('clientPortal.homelessNote')}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mailingAddress">{t('clientPortal.mailingAddressLabel')}</Label>
                      <Input
                        id="mailingAddress"
                        name="mailingAddress"
                        value={formData.mailingAddress}
                        onChange={handleInputChange}
                        placeholder={t('clientPortal.mailingAddressPlaceholder')}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="street">{t('clients.streetAddress')} *</Label>
                      <Input
                        id="street"
                        name="street"
                        value={formData.street}
                        onChange={handleInputChange}
                        placeholder="123 Main Street, Apt 4B"
                        aria-invalid={!!stepErrors.street}
                        aria-describedby={stepErrors.street ? 'street-error' : undefined}
                      />
                      {stepErrors.street && (
                        <p id="street-error" className="text-sm text-red-500">{stepErrors.street}</p>
                      )}
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
                          aria-invalid={!!stepErrors.city}
                          aria-describedby={stepErrors.city ? 'city-error' : undefined}
                        />
                        {stepErrors.city && (
                          <p id="city-error" className="text-sm text-red-500">{stepErrors.city}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">{t('clients.state')} *</Label>
                        <Select
                          value={formData.state}
                          onValueChange={(value) => handleSelectChange('state', value)}
                        >
                          <SelectTrigger id="state">
                            <SelectValue placeholder={t('clients.state')} />
                          </SelectTrigger>
                          <SelectContent>
                            {US_STATES.map((state) => (
                              <SelectItem key={state.value} value={state.value}>
                                {state.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {stepErrors.state && (
                          <p className="text-sm text-red-500">{stepErrors.state}</p>
                        )}
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
                        aria-invalid={!!stepErrors.zipCode}
                        aria-describedby={stepErrors.zipCode ? 'zipCode-error' : undefined}
                      />
                      {stepErrors.zipCode && (
                        <p id="zipCode-error" className="text-sm text-red-500">{stepErrors.zipCode}</p>
                      )}
                    </div>
                  </>
                )}
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
                    onCheckedChange={(checked) => {
                      setAgreed(checked as boolean);
                      if (checked) {
                        clearFieldError('agreement');
                      }
                    }}
                    className="mt-1"
                  />
                  <label htmlFor="agree" className="text-sm cursor-pointer">
                    <span className="font-medium">{t('clientPortal.agreementAccepted')}</span>
                    <p className="text-gray-500 mt-1">
                      {t('clientPortal.agreementAcceptedDesc')}
                    </p>
                  </label>
                </div>
                {stepErrors.agreement && (
                  <p className="text-sm text-red-500">{t('clientPortal.errorAgreementRequired')}</p>
                )}
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
                    {t('clientPortal.signingAs')} <span className="font-medium">{formData.firstName} {formData.lastName}</span>
                    <br />
                    {t('clients.email')}: <span className="font-medium">{formData.email}</span>
                  </p>
                </div>

                {signature ? (
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-2">{t('clientPortal.yourSignature')}</p>
                    <div className="bg-white border rounded p-2 flex justify-center">
                      <Image src={signature} alt={t('clientPortal.yourSignature')} width={300} height={96} className="max-h-24 object-contain" />
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
                  <div>
                    <Button
                      variant="outline"
                      className="w-full h-24 border-2 border-dashed"
                      onClick={() => setSignatureOpen(true)}
                    >
                      <div className="flex flex-col items-center">
                        <PenLine className="h-8 w-8 text-gray-400 mb-2" />
                        <span>{t('clientPortal.clickToSign')}</span>
                      </div>
                    </Button>
                    {stepErrors.signature && (
                      <p className="text-sm text-red-500 mt-2">{stepErrors.signature}</p>
                    )}
                  </div>
                )}

                {signature && (
                  <div className="bg-green-50 p-4 rounded-lg flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium">{t('clientPortal.readyToSubmit')}</p>
                      <p className="mt-1">{t('clientPortal.readyToSubmitDesc')}</p>
                    </div>
                  </div>
                )}

                {/* Signature Modal */}
                {signatureOpen && (
                  <div
                    className="fixed inset-0 flex items-center justify-center z-50 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Signature pad"
                  >
                    <div
                      className="absolute inset-0 bg-black/50"
                      onClick={() => setSignatureOpen(false)}
                    />
                    <Card className="relative w-full max-w-lg">
                      <CardHeader>
                        <CardTitle>{t('clientPortal.modalTitle')}</CardTitle>
                        <CardDescription>
                          {t('clientPortal.modalDesc')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                          <canvas
                            ref={canvasRef}
                            width={400}
                            height={150}
                            aria-label="Signature"
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
                            {t('clientPortal.modalClear')}
                          </Button>
                          <div className="flex gap-2">
                            <Button
                              ref={cancelRef}
                              variant="outline"
                              onClick={() => setSignatureOpen(false)}
                            >
                              {t('common.cancel')}
                            </Button>
                            <Button onClick={saveSignature}>
                              {t('clientPortal.saveSignature')}
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
            onClick={() => {
              setStepErrors({});
              setCurrentStep(prev => prev - 1);
            }}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>

          {currentStep < totalSteps ? (
            <Button onClick={handleNext}>
              {t('common.next')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              disabled={!canProceed() || loading}
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSubmitClick}
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
