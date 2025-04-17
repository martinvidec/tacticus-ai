'use client'; // Mark this whole module as client-side

import { useDebug } from "@/lib/contexts/DebugContext";
import { useEffect, ReactNode } from "react";
import AuthButton from "./AuthButton";
import DebugPopup from "./DebugPopup";

export default function ClientLayoutWrapper({ children }: { children: ReactNode }) {
    const { setIsPopupOpen } = useDebug();

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
            <header className="p-4 border-b border-[rgb(var(--border-color))] flex justify-end bg-[rgb(var(--background-start-rgb))] sticky top-0 z-10">
                <AuthButton />
            </header>
            <main className="p-4 md:p-8">
                {children}
            </main>
            <DebugPopup /> {/* Render the popup here */}
        </>
    );
} 