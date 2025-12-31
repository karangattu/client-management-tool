'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft, Menu, X, Bell, User, LogOut } from 'lucide-react';
import { useState } from 'react';
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
import { LanguageSelector } from '@/components/ui/language-selector';

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
  userName = 'Staff User',
  userRole = 'Case Manager',
}: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHomePage = pathname === '/' || pathname === '/dashboard';

  const handleBack = () => {
    router.back();
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

        {/* Right section - Language, Notifications and Profile */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <LanguageSelector />

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
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{userName}</span>
                  <span className="text-xs text-gray-500">{userRole}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/admin')}>
                <User className="mr-2 h-4 w-4" />
                User Management
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
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
