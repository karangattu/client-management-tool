import TasksClient from '@/components/tasks/TasksClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Server Component - Tasks Page
 * Delegates to client component for now, but provides foundation for
 * server-side data fetching in future iterations
 */
export default function TasksPage() {
  return <TasksClient />;
}
