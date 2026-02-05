'use client';

import { AnimatePresence, motion } from "framer-motion";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Calendar, AlertCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FocusItem {
  id: string;
  title: string;
  description?: string;
  type: 'task' | 'event' | 'alert';
  time?: string;
  priority: string;
  status?: string;
  client_name?: string;
}

interface AnimatedFocusItemProps {
  items: FocusItem[];
  formatTime: (time: string, includeTime: boolean) => string;
  getPriorityBadge: (priority: string, status?: string) => React.ReactNode;
}

export function AnimatedFocusItems({ items, formatTime, getPriorityBadge }: AnimatedFocusItemProps) {
  const router = useRouter();
  
  return (
    <AnimatePresence mode="popLayout">
      <div className="space-y-3">
        {items.slice(0, 3).map((item, index) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-1 p-2 rounded-lg ${
                item.type === 'task' ? 'bg-blue-100 text-blue-600' :
                item.type === 'event' ? 'bg-purple-100 text-purple-600' :
                'bg-orange-100 text-orange-600'
              }`}>
                {item.type === 'task' ? <CheckSquare className="h-4 w-4" /> :
                  item.type === 'event' ? <Calendar className="h-4 w-4" /> :
                  <AlertCircle className="h-4 w-4" />}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {item.time && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(item.time, true)}
                    </span>
                  )}
                  {item.client_name && (
                    <span className="text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-100 rounded-full">
                      {item.client_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getPriorityBadge(item.priority, item.status)}
              {item.type === 'task' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => router.push(`/tasks`)}
                >
                  View
                </Button>
              )}
              {item.type === 'event' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => router.push('/calendar')}
                >
                  View
                </Button>
              )}
              {item.type === 'alert' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => router.push('/alerts')}
                >
                  View
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}
