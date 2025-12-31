'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NavigationTileProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
  badge?: number;
  disabled?: boolean;
}

export function NavigationTile({
  title,
  description,
  icon: Icon,
  href,
  color,
  badge,
  disabled = false,
}: NavigationTileProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300',
    green: 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300',
    purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-300',
    orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300',
    pink: 'bg-pink-50 border-pink-200 hover:bg-pink-100 hover:border-pink-300',
    cyan: 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100 hover:border-cyan-300',
    amber: 'bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300',
    red: 'bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300',
    gray: 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300',
  };

  const iconColorClasses: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    orange: 'text-orange-600 bg-orange-100',
    pink: 'text-pink-600 bg-pink-100',
    cyan: 'text-cyan-600 bg-cyan-100',
    amber: 'text-amber-600 bg-amber-100',
    red: 'text-red-600 bg-red-100',
    gray: 'text-gray-600 bg-gray-100',
  };

  const badgeColorClasses: Record<string, string> = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600',
    pink: 'bg-pink-600',
    cyan: 'bg-cyan-600',
    amber: 'bg-amber-600',
    red: 'bg-red-600',
    gray: 'bg-gray-600',
  };

  if (disabled) {
    return (
      <div
        className={`relative p-4 md:p-6 rounded-xl border-2 transition-all duration-200 opacity-50 cursor-not-allowed ${colorClasses[color] || colorClasses.gray}`}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${iconColorClasses[color] || iconColorClasses.gray}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base md:text-lg">{title}</h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{description}</p>
          </div>
        </div>
        <Badge className="absolute top-3 right-3 bg-gray-400">Coming Soon</Badge>
      </div>
    );
  }

  return (
    <Link href={href} className="block">
      <div
        className={`relative p-4 md:p-6 rounded-xl border-2 transition-all duration-200 active:scale-[0.98] ${colorClasses[color] || colorClasses.gray}`}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${iconColorClasses[color] || iconColorClasses.gray}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base md:text-lg">{title}</h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{description}</p>
          </div>
        </div>
        {badge !== undefined && badge > 0 && (
          <Badge
            className={`absolute top-3 right-3 ${badgeColorClasses[color] || badgeColorClasses.gray} text-white`}
          >
            {badge}
          </Badge>
        )}
      </div>
    </Link>
  );
}

interface NavigationTileGridProps {
  children: React.ReactNode;
}

export function NavigationTileGrid({ children }: NavigationTileGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  );
}
