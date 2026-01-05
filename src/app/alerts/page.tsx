'use client';

import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle,
  Calendar,
  FileText,
  Home,
  User,
  Settings,
  Archive,
  CheckCheck,
  MailOpen,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  client_id: string | null;
  priority: string;
  due_date: string | null;
  is_read: boolean;
  created_at: string;
  client?: { first_name: string; last_name: string };
}

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const supabase = createClient();

  useEffect(() => {
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchAlerts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          client:clients(first_name, last_name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;
  const highPriorityCount = alerts.filter(a => a.priority === 'high' && !a.is_read).length;

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !alert.is_read;
    return alert.type === activeTab;
  });

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      setAlerts(prev => prev.map(a =>
        a.id === id ? { ...a, is_read: true } : a
      ));
    } catch (err) {
      console.error('Error marking alert as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = alerts.filter(a => !a.is_read).map(a => a.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const archiveAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error archiving alert:', err);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'benefit_renewal':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'task_due':
        return <Clock className="h-5 w-5 text-red-500" />;
      case 'document_uploaded':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'housing_update':
        return <Home className="h-5 w-5 text-green-500" />;
      case 'appointment':
        return <Calendar className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High Priority</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low':
        return <Badge className="bg-gray-100 text-gray-800">Low</Badge>;
      default:
        return null;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Alerts & Notifications" showBackButton />

      <main className="container px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Bell className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{alerts.length}</p>
                  <p className="text-sm text-gray-500">Total Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unreadCount}</p>
                  <p className="text-sm text-gray-500">Unread</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{highPriorityCount}</p>
                  <p className="text-sm text-gray-500">High Priority</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{alerts.filter(a => a.is_read).length}</p>
                  <p className="text-sm text-gray-500">Read</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Tabs and List */}
        <Card>
          <CardHeader className="pb-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">
                  All
                  {alerts.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{alerts.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Unread
                  {unreadCount > 0 && (
                    <Badge className="ml-2 bg-red-500">{unreadCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="benefit_renewal">Benefits</TabsTrigger>
                <TabsTrigger value="task_due">Tasks</TabsTrigger>
              </TabsList>

              <CardContent className="pt-4">
                <TabsContent value={activeTab} className="mt-0">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-20" />
                      ))}
                    </div>
                  ) : filteredAlerts.length > 0 ? (
                    <div className="space-y-2">
                      {filteredAlerts.map(alert => (
                        <div
                          key={alert.id}
                          className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${alert.is_read ? 'bg-white' : 'bg-blue-50 border-blue-200'
                            } hover:bg-gray-50`}
                        >
                          <div className="flex-shrink-0 mt-1">
                            {getAlertIcon(alert.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className={`font-medium ${!alert.is_read ? 'text-blue-900' : ''}`}>
                                    {alert.title}
                                  </p>
                                  {!alert.is_read && (
                                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{alert.message}</p>
                              </div>
                              {getPriorityBadge(alert.priority)}
                            </div>

                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              {alert.client && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {alert.client.first_name} {alert.client.last_name}
                                </span>
                              )}
                              <span>{formatTime(alert.created_at)}</span>
                              {alert.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Due: {new Date(alert.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {!alert.is_read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => markAsRead(alert.id)}
                                title="Mark as read"
                              >
                                <MailOpen className="h-4 w-4 text-blue-600 hover:text-blue-700" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => archiveAlert(alert.id)}
                              title="Archive"
                            >
                              <Archive className="h-4 w-4 text-gray-400 hover:text-orange-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No notifications</p>
                      <p className="text-sm text-gray-400 mt-1">
                        You&apos;re all caught up!
                      </p>
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </CardHeader>
        </Card>


      </main>
    </div>
  );
}
