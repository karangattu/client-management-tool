'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Fuse from 'fuse.js';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  User,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  event_type: string;
  client_id?: string;
  client_name?: string;
  color?: string;
  all_day?: boolean;
  description?: string;
}

interface Alert {
  id: string;
  title: string;
  message?: string;
  alert_type: string;
  trigger_at: string;
  client_id?: string;
  client_name?: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

const eventTypeColors: Record<string, string> = {
  benefit_renewal: 'bg-red-100 text-red-800 border-red-200',
  appointment: 'bg-blue-100 text-blue-800 border-blue-200',
  follow_up: 'bg-purple-100 text-purple-800 border-purple-200',
  deadline: 'bg-amber-100 text-amber-800 border-amber-200',
  document_expiry: 'bg-orange-100 text-orange-800 border-orange-200',
  custom: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [newEvent, setNewEvent] = useState({
    title: '',
    event_type: 'appointment',
    date: '',
    time: '',
    client_id: '',
    description: '',
  });

  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchEvents();
      fetchClients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          description,
          start_time,
          end_time,
          event_type,
          all_day,
          client_id,
          clients (first_name, last_name)
        `)
        .order('start_time', { ascending: true });

      if (error) throw error;
      interface EventQueryResult {
        id: string;
        title: string;
        description: string | null;
        start_time: string;
        end_time: string | null;
        event_type: string | null;
        all_day: boolean | null;
        client_id: string | null;
        clients: { first_name: string; last_name: string } | null;
      }

      const formattedEvents = (data as unknown as EventQueryResult[])?.map((event) => ({
        id: event.id,
        title: event.title,
        start_time: event.start_time,
        end_time: event.end_time || undefined,
        event_type: event.event_type || 'custom',
        client_id: event.client_id || undefined,
        client_name: event.clients ? `${event.clients.first_name} ${event.clients.last_name}` : undefined,
        all_day: event.all_day || undefined,
        description: event.description || undefined,
      })) || [];

      setEvents(formattedEvents);

      // Fetch active alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('alerts')
        .select(`
          id,
          title,
          message,
          alert_type,
          trigger_at,
          client_id,
          clients (first_name, last_name)
        `)
        .eq('is_dismissed', false)
        .order('trigger_at', { ascending: true })
        .limit(5);

      if (alertsError) throw alertsError;

      interface AlertQueryResult {
        id: string;
        title: string;
        message: string | null;
        alert_type: string;
        trigger_at: string;
        client_id: string | null;
        clients: { first_name: string; last_name: string } | null;
      }

      const formattedAlerts = (alertsData as unknown as AlertQueryResult[])?.map((alert) => ({
        id: alert.id,
        title: alert.title,
        message: alert.message || undefined,
        alert_type: alert.alert_type,
        trigger_at: alert.trigger_at,
        client_id: alert.client_id || undefined,
        client_name: alert.clients ? `${alert.clients.first_name} ${alert.clients.last_name}` : undefined,
      })) || [];

      setAlerts(formattedAlerts);
    } catch (err) {
      console.error('Error fetching events and alerts:', err);
      setEvents([]);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .order('last_name');

      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  // Fuzzy search for clients
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) {
      return clients;
    }

    const fuse = new Fuse(clients, {
      keys: ['first_name', 'last_name'],
      threshold: 0.3,
      minMatchCharLength: 1,
    });

    return fuse.search(clientSearchQuery).map(result => result.item);
  }, [clients, clientSearchQuery]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEvent.title || !newEvent.date) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const startTime = newEvent.time ? `${newEvent.date}T${newEvent.time}` : `${newEvent.date}T00:00`;

      const { error } = await supabase
        .from('calendar_events')
        .insert({
          title: newEvent.title,
          event_type: newEvent.event_type,
          start_time: startTime,
          client_id: newEvent.client_id || null,
          description: newEvent.description || null,
        });

      if (error) throw error;

      // Reset form and close dialog
      setNewEvent({
        title: '',
        event_type: 'appointment',
        date: '',
        time: '',
        client_id: '',
        description: '',
      });
      setClientSearchQuery('');
      setIsAddEventOpen(false);

      // Refresh events
      fetchEvents();
    } catch (err) {
      console.error('Error creating event:', err);
      alert('Failed to create event');
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const days = getDaysInMonth(currentDate);

  // Get upcoming events for the sidebar
  const upcomingEvents = events
    .filter((event: CalendarEvent) => new Date(event.start_time) >= new Date())
    .sort((a: CalendarEvent, b: CalendarEvent) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Calendar" />
        <main className="container px-4 py-6 max-w-7xl mx-auto">
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Calendar" />

      <main className="container px-4 py-6 max-w-7xl mx-auto">
        {/* Header with navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold min-w-[180px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={view === 'month' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setView('month')}
              >
                Month
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setView('week')}
              >
                Week
              </Button>
              <Button
                variant={view === 'day' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setView('day')}
              >
                Day
              </Button>
            </div>

            <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                </DialogHeader>
                <form className="space-y-4 mt-4" onSubmit={handleCreateEvent}>
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title *</Label>
                    <Input
                      id="title"
                      placeholder="Enter event title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Event Type</Label>
                    <Select value={newEvent.event_type} onValueChange={(value) => setNewEvent({ ...newEvent, event_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="appointment">Appointment</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                        <SelectItem value="deadline">Deadline</SelectItem>
                        <SelectItem value="benefit_renewal">Benefit Renewal</SelectItem>
                        <SelectItem value="custom">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newEvent.date}
                        onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={newEvent.time}
                        onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Client (Optional)</Label>
                    <div className="space-y-2">
                      {newEvent.client_id ? (
                        // Show selected client
                        <div className="border rounded-md p-2 bg-blue-50">
                          <div className="text-sm font-medium text-blue-900">
                            {clients.find(c => c.id === newEvent.client_id)?.first_name} {clients.find(c => c.id === newEvent.client_id)?.last_name}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewEvent(prev => ({ ...prev, client_id: '' }));
                              setClientSearchQuery('');
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        // Show search dropdown only when searching
                        <>
                          <Input
                            placeholder="Search clients by name..."
                            value={clientSearchQuery}
                            onChange={(e) => setClientSearchQuery(e.target.value)}
                            className="h-9"
                          />
                          {clientSearchQuery.trim() && (
                            <div className="border rounded-md max-h-48 overflow-y-auto">
                              <div
                                className="p-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => { setNewEvent(prev => ({ ...prev, client_id: '' })); setClientSearchQuery(''); }}
                              >
                                <div className="text-sm font-medium">No client</div>
                              </div>
                              {filteredClients.length > 0 ? (
                                filteredClients.map(client => (
                                  <div
                                    key={client.id}
                                    className="p-2 hover:bg-gray-100 cursor-pointer border-t"
                                    onClick={() => {
                                      setNewEvent(prev => ({ ...prev, client_id: client.id }));
                                      setClientSearchQuery('');
                                    }}
                                  >
                                    <div className="text-sm font-medium">{client.first_name} {client.last_name}</div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-2 text-center text-xs text-gray-500 border-t">
                                  No clients found
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Add details..."
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => { setIsAddEventOpen(false); setClientSearchQuery(''); }}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Event</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Calendar Grid */}
          <Card className="lg:col-span-3">
            <CardContent className="p-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="min-h-[100px] bg-gray-50 rounded" />;
                  }

                  const dayEvents = getEventsForDate(day);
                  const isSelected = selectedDate && day.getTime() === selectedDate.getTime();

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[100px] p-1 border rounded cursor-pointer transition-colors ${isToday(day)
                          ? 'bg-blue-50 border-blue-300'
                          : isSelected
                            ? 'bg-gray-100 border-gray-400'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className="text-xs p-1 rounded truncate"
                            style={{ backgroundColor: event.color + '20', color: event.color }}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Sidebar - Upcoming Events */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-blue-500" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingEvents.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No upcoming events</p>
                  ) : (
                    upcomingEvents.map((event: CalendarEvent) => (
                      <div
                        key={event.id}
                        className={`p-3 rounded-lg border ${eventTypeColors[event.event_type as keyof typeof eventTypeColors] || eventTypeColors.custom}`}
                      >
                        <p className="font-medium text-sm">{event.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs opacity-80">
                          <Clock className="h-3 w-3" />
                          {new Date(event.start_time).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                        {event.client_name && (
                          <div className="flex items-center gap-2 mt-1 text-xs opacity-80">
                            <User className="h-3 w-3" />
                            {event.client_name}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Event Types Legend */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Event Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm">Benefit Renewal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm">Appointment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-sm">Follow-up</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm">Deadline</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alerts Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-red-500" />
                  Active Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alerts.length > 0 ? (
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-2 border rounded text-sm ${alert.alert_type === 'benefit_renewal'
                            ? 'bg-red-50 border-red-200'
                            : alert.alert_type === 'document_expiry'
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-blue-50 border-blue-200'
                          }`}
                      >
                        <p
                          className={`font-medium ${alert.alert_type === 'benefit_renewal'
                              ? 'text-red-800'
                              : alert.alert_type === 'document_expiry'
                                ? 'text-amber-800'
                                : 'text-blue-800'
                            }`}
                        >
                          {alert.title}
                        </p>
                        <p
                          className={`text-xs ${alert.alert_type === 'benefit_renewal'
                              ? 'text-red-600'
                              : alert.alert_type === 'document_expiry'
                                ? 'text-amber-600'
                                : 'text-blue-600'
                            }`}
                        >
                          {alert.client_name && `${alert.client_name} - `}
                          {alert.message || new Date(alert.trigger_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No active alerts</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}