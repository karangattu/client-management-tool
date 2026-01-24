'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { OnboardingProgress, getClientOnboardingSteps } from '@/components/clients/OnboardingProgress';
import { getClientStatusConfig } from '@/lib/status-config';
import { formatPacificLocaleDate } from '@/lib/date-utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  CheckSquare,
  ExternalLink,
  X,
} from 'lucide-react';

interface ClientSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  city?: string;
  state?: string;
  housing_status?: string;
  created_at: string;
  signed_engagement_letter_at?: string | null;
  intake_completed_at?: string | null;
  profile_completed_at?: string | null;
  is_veteran?: boolean;
  vi_spdat_score?: number;
  pending_tasks?: number;
  total_documents?: number;
}

interface ClientSummaryDrawerProps {
  clientId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ClientSummaryDrawer({ clientId, isOpen, onClose }: ClientSummaryDrawerProps) {
  const router = useRouter();
  const [client, setClient] = useState<ClientSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId || !isOpen) {
      setClient(null);
      return;
    }

    const fetchClient = async () => {
      setLoading(true);
      setError(null);
      
      const supabase = createClient();
      
      try {
        // Fetch client basic info
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select(`
            id, first_name, last_name, email, phone, status, city, state, 
            housing_status, created_at, signed_engagement_letter_at, 
            intake_completed_at, profile_completed_at, is_veteran, vi_spdat_score
          `)
          .eq('id', clientId)
          .single();

        if (clientError) throw clientError;

        // Fetch task count
        const { count: taskCount } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .in('status', ['pending', 'in_progress']);

        // Fetch document count
        const { count: docCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId);

        setClient({
          ...clientData,
          pending_tasks: taskCount || 0,
          total_documents: docCount || 0,
        });
      } catch (err) {
        console.error('Error fetching client summary:', err);
        setError('Failed to load client details');
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [clientId, isOpen]);

  const handleViewFull = () => {
    if (clientId) {
      router.push(`/clients/${clientId}`);
      onClose();
    }
  };

  const statusConfig = client ? getClientStatusConfig(client.status) : null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Client Summary</SheetTitle>
          </div>
          <SheetDescription>
            Quick view of client information
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <X className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">{error}</p>
            <Button variant="outline" className="mt-4" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : client ? (
          <div className="space-y-6 py-4">
            {/* Client Header */}
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xl flex-shrink-0">
                {client.first_name[0]}{client.last_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {client.first_name} {client.last_name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {statusConfig && (
                    <Badge className={statusConfig.classes}>
                      {statusConfig.label}
                    </Badge>
                  )}
                  {client.is_veteran && (
                    <Badge variant="outline" className="border-blue-500 text-blue-700">
                      Veteran
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Onboarding Progress */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-2 font-medium">Onboarding Progress</p>
              <OnboardingProgress 
                steps={getClientOnboardingSteps(client)} 
                compact={false}
                showLabels={true}
              />
            </div>

            <Separator />

            {/* Contact Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Contact Information</h4>
              
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{client.phone || 'No phone'}</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700 truncate">{client.email || 'No email'}</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">
                  {client.city && client.state 
                    ? `${client.city}, ${client.state}` 
                    : 'No location'}
                </span>
              </div>
            </div>

            <Separator />

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-orange-50 rounded-lg text-center">
                <CheckSquare className="h-5 w-5 text-orange-600 mx-auto mb-1" />
                <p className="text-lg font-semibold text-orange-800">{client.pending_tasks}</p>
                <p className="text-xs text-orange-600">Pending Tasks</p>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <FileText className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-semibold text-blue-800">{client.total_documents}</p>
                <p className="text-xs text-blue-600">Documents</p>
              </div>
            </div>

            {/* Additional Info */}
            {(client.vi_spdat_score || client.housing_status) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Additional Details</h4>
                  {client.vi_spdat_score && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">VI-SPDAT Score</span>
                      <Badge variant="outline">{client.vi_spdat_score}</Badge>
                    </div>
                  )}
                  {client.housing_status && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Housing Status</span>
                      <span className="text-gray-700 capitalize">{client.housing_status.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Client Since */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Calendar className="h-3 w-3" />
              Client since {formatPacificLocaleDate(client.created_at)}
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                className="flex-1"
                onClick={handleViewFull}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Full Profile
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
