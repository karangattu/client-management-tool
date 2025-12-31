'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { NavigationTile, NavigationTileGrid } from '@/components/layout/NavigationTile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Home,
  FileText,
  Users,
  Clock,
  CheckCircle,
  Plus,
  Search,
  Filter,
  Building,
  ClipboardList,
  TrendingUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';

interface HousingApplication {
  id: string;
  client_name: string;
  program: string;
  status: string;
  submitted_at: string | null;
  checklist_progress: number;
  waitlist_position: number | null;
  move_in_date?: string;
}

interface HousingProgram {
  id: string;
  name: string;
  type: string;
  capacity: number;
  current: number;
  waitlist: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
  under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800' },
  waitlist: { label: 'Waitlist', color: 'bg-purple-100 text-purple-800' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  denied: { label: 'Denied', color: 'bg-red-100 text-red-800' },
  housed: { label: 'Housed', color: 'bg-emerald-100 text-emerald-800' },
};

export default function HousingPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<HousingApplication[]>([]);
  const [programs, setPrograms] = useState<HousingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchHousingData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const fetchHousingData = async () => {
    setLoading(true);
    try {
      // Fetch housing applications
      const { data: appData, error: appError } = await supabase
        .from('housing_applications')
        .select(`
          id,
          status,
          applied_at,
          waitlist_position,
          move_in_date,
          housing_program_id,
          client_id,
          clients (first_name, last_name),
          housing_programs (name)
        `)
        .order('applied_at', { ascending: false });

      if (appError) throw appError;
      interface HousingAppQueryResult {
        id: string;
        status: string | null;
        applied_at: string | null;
        waitlist_position: number | null;
        move_in_date: string | null;
        housing_program_id: string | null;
        client_id: string | null;
        clients: { first_name: string; last_name: string } | null;
        housing_programs: { name: string } | null;
      }

      const formattedApps = ((appData as unknown) as HousingAppQueryResult[])?.map((app) => ({
        id: app.id,
        client_name: app.clients ? `${app.clients.first_name} ${app.clients.last_name}` : 'Unknown',
        program: app.housing_programs?.name || 'Unknown Program',
        status: app.status || 'draft',
        submitted_at: app.applied_at,
        checklist_progress: 100, // TODO: Calculate from checklist items
        waitlist_position: app.waitlist_position,
        move_in_date: app.move_in_date || undefined,
      })) || [];

      setApplications(formattedApps);

      // Fetch housing programs
      const { data: progData, error: progError } = await supabase
        .from('housing_programs')
        .select('*');

      if (progError) throw progError;

      interface HousingProgQueryResult {
        id: string;
        name: string;
        program_type: string | null;
        total_units: number | null;
        available_units: number | null;
      }

      const formattedProgs = ((progData as unknown) as HousingProgQueryResult[])?.map((prog) => ({
        id: prog.id,
        name: prog.name,
        type: prog.program_type || 'Other',
        capacity: prog.total_units || 0,
        current: prog.available_units || 0,
        waitlist: 0, // Would need to count from applications
      })) || [];

      setPrograms(formattedProgs);
    } catch (err) {
      console.error('Error fetching housing data:', err);
      setApplications([]);
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const stats = {
    totalApplications: applications.length,
    pending: applications.filter(a => ['draft', 'submitted', 'under_review'].includes(a.status)).length,
    waitlist: applications.filter(a => a.status === 'waitlist').length,
    housed: applications.filter(a => a.status === 'housed' || a.status === 'approved').length,
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.client_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Housing" />
        <main className="container px-4 py-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Housing" />

      <main className="container px-4 py-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalApplications}</p>
                  <p className="text-xs text-gray-500">Total Applications</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{stats.waitlist}</p>
                  <p className="text-xs text-gray-500">On Waitlist</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Home className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.housed}</p>
                  <p className="text-xs text-gray-500">Housed/Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <NavigationTileGrid>
          <NavigationTile
            title="New Application"
            description="Start a new housing application"
            icon={Plus}
            href="/housing/new"
            color="green"
          />
          <NavigationTile
            title="Housing Programs"
            description="View available programs and capacity"
            icon={Building}
            href="/housing/programs"
            color="blue"
          />
          <NavigationTile
            title="Document Checklist"
            description="Manage housing documentation"
            icon={ClipboardList}
            href="/housing/checklist"
            color="purple"
          />
        </NavigationTileGrid>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="programs">Programs</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Applications */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Recent Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {applications.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No applications found</p>
                    ) : (
                      applications.slice(0, 4).map((app: HousingApplication) => (
                        <div
                          key={app.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-sm">{app.client_name}</p>
                            <p className="text-xs text-gray-500">{app.program}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={statusConfig[app.status]?.color || 'bg-gray-100 text-gray-800'}>
                              {statusConfig[app.status]?.label || app.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Program Capacity */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Program Capacity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {programs.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No programs found</p>
                    ) : (
                      programs.map((program: HousingProgram) => {
                        const occupancyPercent = program.capacity > 0 ? (program.current / program.capacity) * 100 : 0;
                        return (
                          <div key={program.id}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{program.name}</span>
                              <span className="text-xs text-gray-500">
                                {program.current}/{program.capacity}
                              </span>
                            </div>
                            <Progress value={occupancyPercent} className="h-2" />
                            {program.waitlist > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                {program.waitlist} on waitlist
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Applications by Status */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    Application Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-gray-600">
                        {applications.filter((a: HousingApplication) => a.status === 'draft').length}
                      </p>
                      <p className="text-sm text-gray-500">Draft</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {applications.filter((a: HousingApplication) => a.status === 'under_review').length}
                      </p>
                      <p className="text-sm text-gray-500">Under Review</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {applications.filter((a: HousingApplication) => a.status === 'waitlist').length}
                      </p>
                      <p className="text-sm text-gray-500">Waitlist</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {applications.filter((a: HousingApplication) => a.status === 'approved').length}
                      </p>
                      <p className="text-sm text-gray-500">Approved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="mt-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search applications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="waitlist">Waitlist</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="denied">Denied</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Application
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredApplications.map(app => (
                    <div
                      key={app.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{app.client_name}</p>
                          <Badge className={statusConfig[app.status].color}>
                            {statusConfig[app.status].label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{app.program}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Checklist:</span>
                            <Progress value={app.checklist_progress} className="w-20 h-2" />
                            <span className="text-xs text-gray-500">{app.checklist_progress}%</span>
                          </div>
                          {app.waitlist_position && (
                            <span className="text-xs text-purple-600">
                              Waitlist #{app.waitlist_position}
                            </span>
                          )}
                          {app.submitted_at && (
                            <span className="text-xs text-gray-500">
                              Submitted: {new Date(app.submitted_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 md:mt-0">
                        <Button variant="outline" size="sm">View</Button>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Programs Tab */}
          <TabsContent value="programs" className="mt-6">
            <div className="grid md:grid-cols-2 gap-4">
              {programs.length === 0 ? (
                <Card className="md:col-span-2">
                  <CardContent className="py-8">
                    <p className="text-center text-gray-500">No housing programs found</p>
                  </CardContent>
                </Card>
              ) : (
                programs.map((program: HousingProgram) => {
                  const occupancyPercent = program.capacity > 0 ? (program.current / program.capacity) * 100 : 0;
                  const isNearCapacity = occupancyPercent >= 90;

                  return (
                    <Card key={program.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{program.name}</CardTitle>
                            <Badge variant="outline" className="mt-1">{program.type}</Badge>
                          </div>
                          {isNearCapacity ? (
                            <Badge className="bg-red-100 text-red-800">Near Capacity</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">Available</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-gray-600">Occupancy</span>
                              <span className="text-sm font-medium">
                                {program.current} / {program.capacity}
                              </span>
                            </div>
                            <Progress
                              value={occupancyPercent}
                              className={`h-3 ${isNearCapacity ? '[&>div]:bg-red-500' : ''}`}
                            />
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {program.waitlist} on waitlist
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-gray-600">
                                {program.capacity - program.current} available
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button variant="outline" size="sm" className="flex-1">View Details</Button>
                            <Button size="sm" className="flex-1">Add to Waitlist</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
