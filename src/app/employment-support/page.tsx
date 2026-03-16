'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { formatPacificLocaleDate } from '@/lib/date-utils';
import {
  Briefcase,
  CircleAlert,
  ClipboardList,
  Clock,
  ExternalLink,
  Search,
  UserRound,
} from 'lucide-react';
import {
  getEmploymentSupportQueue,
  type EmploymentSupportQueueItem,
} from '@/app/actions/employment-support';

const intakeStatusConfig: Record<string, { label: string; className: string }> = {
  not_started: {
    label: 'Not started',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  draft: {
    label: 'Draft',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  reviewed: {
    label: 'Reviewed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

const readinessConfig: Record<string, { label: string; className: string }> = {
  ready: {
    label: 'Ready to proceed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  needs_preparation: {
    label: 'Needs preparation',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  refer_back_later: {
    label: 'Refer back later',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  unreviewed: {
    label: 'Awaiting staff review',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

const enrollmentStatusLabels: Record<string, string> = {
  interested: 'Interested',
  applying: 'Applying',
  enrolled: 'Enrolled',
  completed: 'Completed',
  denied: 'Denied',
  withdrawn: 'Withdrawn',
};

function getIntakeStatus(item: EmploymentSupportQueueItem) {
  return item.intake?.status || 'not_started';
}

function getReadinessStatus(item: EmploymentSupportQueueItem) {
  return item.intake?.readinessStatus || 'unreviewed';
}

export default function EmploymentSupportQueuePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [queue, setQueue] = useState<EmploymentSupportQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [intakeFilter, setIntakeFilter] = useState('all');
  const [readinessFilter, setReadinessFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!authLoading && profile?.role === 'client') {
      router.push('/my-portal');
      return;
    }
  }, [authLoading, profile?.role, router, user]);

  useEffect(() => {
    if (authLoading || !user || profile?.role === 'client') {
      return;
    }

    const loadQueue = async () => {
      setLoading(true);
      setError(null);

      const result = await getEmploymentSupportQueue();

      if (!result.success) {
        setError(result.error || 'Unable to load Employment Support queue.');
        setQueue([]);
        setLoading(false);
        return;
      }

      setQueue(result.data || []);
      setLoading(false);
    };

    loadQueue();
  }, [authLoading, profile?.role, user]);

  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      const fullName = `${item.client.firstName} ${item.client.lastName}`.toLowerCase();
      const matchesSearch =
        searchQuery.trim().length === 0 ||
        fullName.includes(searchQuery.toLowerCase()) ||
        (item.client.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.client.phone || '').toLowerCase().includes(searchQuery.toLowerCase());

      const intakeStatus = getIntakeStatus(item);
      const readinessStatus = getReadinessStatus(item);

      const matchesIntake = intakeFilter === 'all' || intakeStatus === intakeFilter;
      const matchesReadiness = readinessFilter === 'all' || readinessStatus === readinessFilter;

      return matchesSearch && matchesIntake && matchesReadiness;
    });
  }, [intakeFilter, queue, readinessFilter, searchQuery]);

  const stats = useMemo(() => {
    const readyCount = queue.filter((item) => getReadinessStatus(item) === 'ready').length;
    const submittedCount = queue.filter((item) => getIntakeStatus(item) === 'submitted').length;
    const followupCount = queue.filter((item) => {
      if (!item.intake?.nextFollowupDate) {
        return false;
      }

      return new Date(item.intake.nextFollowupDate).getTime() <= Date.now();
    }).length;

    return {
      total: queue.length,
      submitted: submittedCount,
      ready: readyCount,
      followups: followupCount,
    };
  }, [queue]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Employment Support" />
        <main className="container max-w-7xl px-4 py-6 mx-auto space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Employment Support" />

      <main className="container max-w-7xl px-4 py-6 mx-auto space-y-6">
        <section className="rounded-3xl border border-emerald-100 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_45%),linear-gradient(135deg,_#f7fdf9,_#edfdf4)] p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                Staff Queue
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Employment Support pipeline
                </h1>
                <p className="text-sm leading-6 text-slate-600">
                  Review enrolled clients, see who has submitted their intake,
                  and identify follow-up work without digging through the main
                  client list.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="bg-white/80">
                <Link href="/clients">Open client directory</Link>
              </Button>
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/client-intake">Add new client</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-500">Active in queue</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{stats.submitted}</p>
                <p className="text-sm text-slate-500">Submitted intakes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{stats.ready}</p>
                <p className="text-sm text-slate-500">Ready to proceed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-rose-100 p-3 text-rose-700">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{stats.followups}</p>
                <p className="text-sm text-slate-500">Follow-ups due</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by client, email, or phone"
                  className="pl-9"
                />
              </div>
              <Select value={intakeFilter} onValueChange={setIntakeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by intake status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All intake states</SelectItem>
                  <SelectItem value="not_started">Not started</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={readinessFilter} onValueChange={setReadinessFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by readiness" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All readiness states</SelectItem>
                  <SelectItem value="unreviewed">Awaiting staff review</SelectItem>
                  <SelectItem value="ready">Ready to proceed</SelectItem>
                  <SelectItem value="needs_preparation">Needs preparation</SelectItem>
                  <SelectItem value="refer_back_later">Refer back later</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-start gap-3 p-5 text-red-800">
              <CircleAlert className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-medium">Unable to load Employment Support queue</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredQueue.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <Briefcase className="h-10 w-10 text-slate-300" />
              <div className="space-y-1">
                <p className="text-lg font-medium text-slate-900">No matching clients</p>
                <p className="text-sm text-slate-500">
                  Adjust the filters or add a new Employment Support client from the
                  main clients page.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <section className="space-y-4">
            {filteredQueue.map((item) => {
              const intakeStatus = getIntakeStatus(item);
              const readinessStatus = getReadinessStatus(item);
              const intakeBadge = intakeStatusConfig[intakeStatus] || intakeStatusConfig.not_started;
              const readinessBadge = readinessConfig[readinessStatus] || readinessConfig.unreviewed;
              const clientName = `${item.client.firstName} ${item.client.lastName}`.trim();

              return (
                <Card key={item.enrollmentId} className="overflow-hidden border-slate-200 shadow-sm">
                  <CardHeader className="border-b border-slate-100 bg-white/70 pb-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-xl text-slate-900">{clientName || 'Unnamed client'}</CardTitle>
                          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                            {enrollmentStatusLabels[item.enrollmentStatus] || item.enrollmentStatus}
                          </Badge>
                          <Badge variant="outline" className={intakeBadge.className}>
                            {intakeBadge.label}
                          </Badge>
                          <Badge variant="outline" className={readinessBadge.className}>
                            {readinessBadge.label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                          <span>Client status: {item.client.status}</span>
                          {item.client.email ? <span>{item.client.email}</span> : null}
                          {item.client.phone ? <span>{item.client.phone}</span> : null}
                        </div>
                      </div>

                      <Button asChild variant="outline" className="w-full lg:w-auto">
                        <Link href={`/clients/${item.client.id}`}>
                          Open client
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="grid gap-4 p-5 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                        Assigned staff
                      </p>
                      <p className="text-sm text-slate-700">
                        {item.assignedStaff
                          ? `${item.assignedStaff.firstName} ${item.assignedStaff.lastName}`
                          : 'Unassigned'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                        Next follow-up
                      </p>
                      <p className="text-sm text-slate-700">
                        {item.intake?.nextFollowupDate
                          ? formatPacificLocaleDate(item.intake.nextFollowupDate)
                          : 'No date set'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                        Last queue activity
                      </p>
                      <p className="text-sm text-slate-700">
                        {item.intake?.updatedAt
                          ? formatPacificLocaleDate(item.intake.updatedAt)
                          : item.updatedAt
                            ? formatPacificLocaleDate(item.updatedAt)
                            : 'No activity yet'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}