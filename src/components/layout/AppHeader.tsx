'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft, Menu, X, Bell, User, LogOut } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  alertCount?: number;
  userName?: string;
  userRole?: string;
}

export function AppHeader({
  title,
  showBackButton = true,
  alertCount = 0,
  userName,
  userRole,
}: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, loading: authLoading, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clientIntakeIncomplete, setClientIntakeIncomplete] = useState<boolean | null>(null);

  const isHomePage = pathname === '/' || pathname === '/dashboard';

  // Check if logged-in client has an incomplete intake
  useEffect(() => {
    const checkIntake = async () => {
      if (!profile || profile.role !== 'client') {
        setClientIntakeIncomplete(null);
        return;
      }

      try {
        const supabase = createClient();
        const { data: client } = await supabase
          .from('clients')
          .select('id, intake_completed_at')
          .eq('portal_user_id', profile.id)
          .single();

        if (client) setClientIntakeIncomplete(!client.intake_completed_at);
        else setClientIntakeIncomplete(true);
      } catch (err) {
        setClientIntakeIncomplete(null);
      }
    };

    checkIntake();
  }, [profile]);

  // Use passed props or fall back to profile data
  const displayName = userName || (authLoading ? 'Loading...' : (profile ? `${profile.first_name} ${profile.last_name}` : 'User'));
  const displayRole = userRole || (authLoading ? 'Please wait' : (profile?.role ? profile.role.replace('_', ' ') : 'Guest'));
  const avatarUrl = profile?.profile_picture_url;

  const handleBack = () => {
    router.back();
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="container flex h-14 md:h-16 items-center justify-between px-4">
        {/* Left section - Back button or Menu */}
        <div className="flex items-center gap-2">
          {showBackButton && !isHomePage ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="md:hidden"
              aria-label="Go back"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          )}

          {/* Desktop back button */}
          {showBackButton && !isHomePage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="hidden md:flex items-center gap-1 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}

          {/* Logo/Title */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push('/dashboard')}
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CM</span>
            </div>
            <span className="hidden sm:block font-semibold text-gray-900">
              {title || 'Client Manager'}
            </span>
          </div>
        </div>

        {/* Right section - Notifications and Profile */}
        <div className="flex items-center gap-2">
          {/* If client hasn't completed intake, show CTA */}
          {profile?.role === 'client' && clientIntakeIncomplete && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/profile-completion')}
                    className="hidden sm:inline-flex ml-2"
                  >
                    Complete Profile
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Finish the full intake to add demographics, household, financial, and medical details.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => router.push('/alerts')}
            aria-label="View alerts"
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {alertCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {alertCount > 9 ? '9+' : alertCount}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 ml-2">
                <div className="relative h-8 w-8 rounded-full overflow-hidden bg-gray-200">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={displayName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{displayName}</span>
                  <span className="text-xs text-capitalize text-gray-500">{displayRole}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              {profile?.role === 'admin' && (
                <DropdownMenuItem onClick={() => router.push('/admin')}>
                  <User className="mr-2 h-4 w-4" />
                  User Management
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t bg-white p-4">
          <ul className="space-y-2">
            <li>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  router.push('/dashboard');
                  setMobileMenuOpen(false);
                }}
              >
                Dashboard
              </Button>
            </li>
            <li>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  router.push('/clients');
                  setMobileMenuOpen(false);
                }}
              >
                Clients
              </Button>
            </li>
            <li>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  router.push('/calendar');
                  setMobileMenuOpen(false);
                }}
              >
                Calendar
              </Button>
            </li>
            <li>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  router.push('/tasks');
                  setMobileMenuOpen(false);
                }}
              >
                Tasks
              </Button>
            </li>
            <li>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  router.push('/housing');
                  setMobileMenuOpen(false);
                }}
              >
                Housing
              </Button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
