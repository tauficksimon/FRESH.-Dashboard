'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // On mobile, start closed. On desktop, start open.
            if (mobile) {
                setSidebarOpen(false);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close sidebar when clicking outside on mobile
    const handleOverlayClick = () => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    };

    return (
        <>
            {/* Mobile overlay */}
            {isMobile && sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={handleOverlayClick}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed left-0 top-0 z-50 h-screen w-56 border-r bg-background transition-transform duration-300",
                    !sidebarOpen && "-translate-x-full"
                )}
            >
                <Sidebar collapsed={false} onClose={() => setSidebarOpen(false)} isMobile={isMobile} />
            </aside>

            {/* Toggle button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={cn(
                    "fixed top-4 z-[60] flex h-9 w-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-300",
                    sidebarOpen ? "left-60" : "left-4"
                )}
                title={sidebarOpen ? "Close menu" : "Open menu"}
            >
                {sidebarOpen ? (
                    <X className="h-4 w-4" />
                ) : (
                    <Menu className="h-4 w-4" />
                )}
            </button>

            {/* Main content */}
            <main
                className={cn(
                    "transition-all duration-300 min-h-screen",
                    sidebarOpen ? "ml-56" : "ml-0"
                )}
            >
                {children}
            </main>
        </>
    );
}
