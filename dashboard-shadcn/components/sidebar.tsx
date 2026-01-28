'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, TrendingUp, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    {
        label: 'Dashboard',
        href: '/',
        icon: Home,
    },
    {
        label: 'Growth',
        href: '/growth',
        icon: TrendingUp,
    },
    {
        label: 'Advanced Metrics',
        href: '/advanced-metrics',
        icon: BarChart3,
    },
];

interface SidebarProps {
    collapsed: boolean;
    onClose?: () => void;
    isMobile?: boolean;
}

export function Sidebar({ collapsed, onClose, isMobile }: SidebarProps) {
    const pathname = usePathname();

    const handleNavClick = () => {
        // Close sidebar on mobile when navigating
        if (isMobile && onClose) {
            onClose();
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Logo / Brand */}
            <div className="flex h-16 items-center gap-2 border-b px-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm flex-shrink-0">
                    F.
                </div>
                <span className="font-semibold">FRESH.</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-3">
                <div className="mb-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Menu
                </div>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={handleNavClick}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                isActive
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                        >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
