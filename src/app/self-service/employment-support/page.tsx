import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Briefcase, FileSignature, UserRoundPlus } from 'lucide-react';

const highlights = [
  {
    icon: UserRoundPlus,
    title: 'Create only what you need',
    description:
      'Start with an Employment Support account and client profile without filling out the full general intake first.',
  },
  {
    icon: FileSignature,
    title: 'Agreement letter still required',
    description:
      'You will review and sign the program agreement during registration before staff can begin working with you.',
  },
  {
    icon: Briefcase,
    title: 'Move straight into employment planning',
    description:
      'After signup, your next step is the Employment Support questionnaire so staff can assess readiness and follow-up needs.',
  },
];

export default function EmploymentSupportSelfRegistrationPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f5fbf7_0%,_#ffffff_38%,_#f8fafc_100%)] text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
          <div className="space-y-6">
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
              Employment Support Registration
            </Badge>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                Start with Employment Support without completing the full intake upfront.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                This entry point is for clients who only need Employment Support right now.
                You will create your account, sign the agreement letter, and continue directly
                into the Employment Support questionnaire.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/client-portal?program=employment-support">
                  Start Employment Support registration
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>

            <p className="text-sm text-slate-500">
              Need the standard multi-program intake instead? <Link href="/self-service" className="font-medium text-emerald-700 underline underline-offset-4">Use the general self-service application</Link>.
            </p>
          </div>

          <Card className="overflow-hidden border-emerald-100 bg-white/90 shadow-xl shadow-emerald-100/50">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-emerald-700">
                  What to expect
                </p>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p>1. Create your account and basic profile.</p>
                  <p>2. Review and sign the Employment Support agreement letter.</p>
                  <p>3. Complete the Employment Support questionnaire in your portal.</p>
                </div>
              </div>

              <div className="space-y-4">
                {highlights.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.title} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                      <div className="rounded-xl bg-white p-3 text-emerald-700 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h2 className="font-semibold text-slate-900">{item.title}</h2>
                        <p className="text-sm leading-6 text-slate-600">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}