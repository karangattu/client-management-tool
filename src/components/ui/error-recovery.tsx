'use client';

import { AlertCircle, RefreshCw, Home, ArrowLeft, Mail, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface RecoveryAction {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ReactNode;
    variant?: 'default' | 'outline' | 'ghost' | 'secondary';
    external?: boolean;
}

interface ErrorRecoveryProps {
    title?: string;
    description?: string;
    errorCode?: string;
    actions?: RecoveryAction[];
    showDefaultActions?: boolean;
    onRetry?: () => void;
    compact?: boolean;
    className?: string;
}

/**
 * Reusable error recovery component with multiple action options.
 * Never shows a "dead end" - always provides actionable next steps.
 */
export function ErrorRecovery({
    title = 'Something went wrong',
    description = 'We encountered an unexpected error. Here are some things you can try:',
    errorCode,
    actions = [],
    showDefaultActions = true,
    onRetry,
    compact = false,
    className = '',
}: ErrorRecoveryProps) {
    const defaultActions: RecoveryAction[] = [
        ...(onRetry ? [{
            label: 'Try Again',
            onClick: onRetry,
            icon: <RefreshCw className="h-4 w-4" />,
            variant: 'default' as const,
        }] : []),
        {
            label: 'Go to Dashboard',
            href: '/dashboard',
            icon: <Home className="h-4 w-4" />,
            variant: 'outline' as const,
        },
        {
            label: 'Go Back',
            onClick: () => window.history.back(),
            icon: <ArrowLeft className="h-4 w-4" />,
            variant: 'ghost' as const,
        },
    ];

    const allActions = [...actions, ...(showDefaultActions ? defaultActions : [])];

    if (compact) {
        return (
            <div className={`flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20 ${className}`}>
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">{title}</p>
                    {errorCode && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Code: {errorCode}</p>
                    )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    {allActions.slice(0, 2).map((action, i) => (
                        action.href ? (
                            <Link key={i} href={action.href}>
                                <Button size="sm" variant={action.variant || 'outline'}>
                                    {action.icon}
                                    <span className="ml-1">{action.label}</span>
                                </Button>
                            </Link>
                        ) : (
                            <Button
                                key={i}
                                size="sm"
                                variant={action.variant || 'outline'}
                                onClick={action.onClick}
                            >
                                {action.icon}
                                <span className="ml-1">{action.label}</span>
                            </Button>
                        )
                    ))}
                </div>
            </div>
        );
    }

    return (
        <Card className={`mx-auto max-w-lg ${className}`}>
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle className="text-xl">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
                {errorCode && (
                    <p className="text-xs text-muted-foreground mt-2 font-mono">
                        Error Code: {errorCode}
                    </p>
                )}
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-3">
                    {allActions.map((action, i) => (
                        action.href ? (
                            <Link key={i} href={action.href} target={action.external ? '_blank' : undefined}>
                                <Button
                                    className="w-full justify-center gap-2"
                                    variant={action.variant || 'outline'}
                                >
                                    {action.icon}
                                    {action.label}
                                    {action.external && <ExternalLink className="h-3 w-3" />}
                                </Button>
                            </Link>
                        ) : (
                            <Button
                                key={i}
                                className="w-full justify-center gap-2"
                                variant={action.variant || 'outline'}
                                onClick={action.onClick}
                            >
                                {action.icon}
                                {action.label}
                            </Button>
                        )
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                        Still having trouble?
                    </p>
                    <a
                        href="mailto:support@clienthub.org?subject=Error Report"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
                    >
                        <Mail className="h-3 w-3" />
                        Contact Support
                    </a>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Inline error banner with retry capability
 */
export function InlineErrorBanner({
    message,
    onRetry,
    onDismiss,
}: {
    message: string;
    onRetry?: () => void;
    onDismiss?: () => void;
}) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="flex-1 text-sm text-red-800 dark:text-red-200">{message}</p>
            <div className="flex gap-2">
                {onRetry && (
                    <Button size="sm" variant="outline" onClick={onRetry} className="h-7">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                    </Button>
                )}
                {onDismiss && (
                    <Button size="sm" variant="ghost" onClick={onDismiss} className="h-7">
                        Dismiss
                    </Button>
                )}
            </div>
        </div>
    );
}

/**
 * Empty state with actionable CTA - never a dead end
 */
export function EmptyStateWithAction({
    icon,
    title,
    description,
    primaryAction,
    secondaryAction,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    primaryAction?: RecoveryAction;
    secondaryAction?: RecoveryAction;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                {icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {title}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {description}
            </p>
            <div className="flex gap-3">
                {primaryAction && (
                    primaryAction.href ? (
                        <Link href={primaryAction.href}>
                            <Button variant={primaryAction.variant || 'default'} className="gap-2">
                                {primaryAction.icon}
                                {primaryAction.label}
                            </Button>
                        </Link>
                    ) : (
                        <Button
                            variant={primaryAction.variant || 'default'}
                            className="gap-2"
                            onClick={primaryAction.onClick}
                        >
                            {primaryAction.icon}
                            {primaryAction.label}
                        </Button>
                    )
                )}
                {secondaryAction && (
                    secondaryAction.href ? (
                        <Link href={secondaryAction.href}>
                            <Button variant={secondaryAction.variant || 'outline'} className="gap-2">
                                {secondaryAction.icon}
                                {secondaryAction.label}
                            </Button>
                        </Link>
                    ) : (
                        <Button
                            variant={secondaryAction.variant || 'outline'}
                            className="gap-2"
                            onClick={secondaryAction.onClick}
                        >
                            {secondaryAction.icon}
                            {secondaryAction.label}
                        </Button>
                    )
                )}
            </div>
        </div>
    );
}
