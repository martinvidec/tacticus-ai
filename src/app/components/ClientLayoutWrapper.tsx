'use client'; // Mark this whole module as client-side

import { useEffect, ReactNode } from "react";
import { useAuth } from '@/lib/contexts/AuthContext'; // Keep useAuth if needed globally, otherwise remove
import { useDebug } from "@/lib/contexts/DebugContext";
import DebugPopup from "./DebugPopup";
// Remove AuthButton import if no longer needed here
// import AuthButton from "./AuthButton"; 

export default function ClientLayoutWrapper({ children }: { children: ReactNode }) {
    const { setIsPopupOpen } = useDebug();
    // Remove user state if not needed globally
    // const { user } = useAuth(); 

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'I') {
                event.preventDefault();
                console.log('Debug shortcut detected!');
                setIsPopupOpen((prev: boolean) => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setIsPopupOpen]);

    return (
        <>
            {/* No global header element */}
            
            {/* Render children directly (page.tsx handles its own layout/header) */}
            {children} 
            <DebugPopup /> 
        </>
    );
} 