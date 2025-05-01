'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useDebug } from '@/lib/contexts/DebugContext';
import { User } from 'firebase/auth';
import { RefreshCw, SettingsIcon } from 'lucide-react';
import { Button } from '@tremor/react';
import AuthButton from './AuthButton';

interface PageHeaderProps {
    user: User | null;
    isLoading: boolean;
    isManualRefreshing: boolean;
    handleManualRefresh: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({ user, isLoading, isManualRefreshing, handleManualRefresh }) => {
    const { setIsPopupOpen } = useDebug();

    return (
        <div className="flex justify-between items-center w-full h-16 mb-4 px-4 md:px-0 pt-4">
            {/* Left Side: Title and Refresh */}
            <div className="flex items-center space-x-3">
                <h1 className="text-xl md:text-2xl font-bold text-[rgb(var(--primary-color))] whitespace-nowrap">
                    Tacticus Player Intel
                </h1>
                <Button
                    icon={RefreshCw}
                    variant="light"
                    onClick={handleManualRefresh}
                    loading={isManualRefreshing}
                    disabled={isLoading}
                    title="Refresh Data"
                    className={`p-1 rounded-full ${isManualRefreshing ? 'animate-spin' : ''}`}
                />
            </div>

            {/* Right Side: Page-specific Buttons & Auth Button */}
            <div className="flex items-center space-x-3">
                <Button 
                    size="xs"
                    variant="light"
                    onClick={() => setIsPopupOpen(true)}
                    title="Open Debug Panel (Ctrl+Shift+I)"
                >
                    Cogitator Log
                </Button>
                <Link href="/settings" passHref legacyBehavior>
                    <Button size="xs" variant="secondary" icon={SettingsIcon} title="Interface Calibration">
                        Calibrate
                    </Button>
                </Link>
                <AuthButton />
            </div>
        </div>
    );
};

export default PageHeader; 