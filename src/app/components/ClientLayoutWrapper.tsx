'use client'; // Mark this whole module as client-side

import { useDebug } from "@/lib/contexts/DebugContext";
import { useEffect, ReactNode } from "react";
import AuthButton from "./AuthButton";
import DebugPopup from "./DebugPopup";
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { SettingsIcon } from "lucide-react";
import { Button } from "@tremor/react";

export default function ClientLayoutWrapper({ children }: { children: ReactNode }) {
    const { setIsPopupOpen } = useDebug();
    const { user } = useAuth();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Check for Ctrl + Shift + I 
            if (event.ctrlKey && event.shiftKey && event.key === 'I') {
                event.preventDefault(); // Prevent browser dev tools (optional)
                console.log('Debug shortcut detected!');
                setIsPopupOpen((prev: boolean) => !prev); // Toggle popup
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [setIsPopupOpen]);

    return (
        <>
            <header className="p-4 border-b border-[rgb(var(--border-color))] flex justify-between items-center bg-[rgb(var(--background-start-rgb))] sticky top-0 z-20">
                <div className="flex-1">
                    {/* Optionally add a logo or title here - e.g., an Aquila SVG */}
                </div>
                <div className="flex items-center space-x-3">
                    <Button 
                        size="xs"
                        variant="light"
                        onClick={() => setIsPopupOpen(true)}
                        title="Open Debug Panel (Ctrl+Shift+I)"
                    >
                        Cogitator Log
                    </Button>
                    {user && (
                        <Link href="/settings" passHref legacyBehavior>
                            <Button size="xs" variant="secondary" icon={SettingsIcon} title="Interface Calibration">
                                Calibrate
                            </Button>
                        </Link>
                    )}
                    <AuthButton />
                </div>
            </header>
            <main className="p-4 md:p-8">
                {children}
            </main>
            <DebugPopup /> {/* Render the popup here */}
        </>
    );
} 