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
        <div className="flex justify-between items-center w-full h-16 mb-4 px-6 pt-4">
            {/* Left Side: Title and User Info Only */}
            <div className="flex items-center space-x-3">
                <div className="flex flex-col items-start -space-y-1">
                    <h1 className="text-xl md:text-2xl font-bold text-[rgb(var(--primary-color))] whitespace-nowrap">
                        Tacticus Player Intel
                    </h1>
                    {user && (
                      <span className="text-xs text-[rgb(var(--primary-color),0.7)] mt-0 leading-tight whitespace-nowrap">
                        ++ Identified Operator: {user.displayName || 'Unknown'} {user.email ? `[${user.email}]` : ''} ++
                      </span>
                    )}
                </div>
                {/* Refresh Button REMOVED from here */}
            </div>

            {/* Right Side: All Buttons */}
            <div className="flex items-center space-x-3">
                {/* Cogitator Log Button */}
                <Button 
                    size="xs"
                    variant="light"
                    onClick={() => setIsPopupOpen(true)}
                    title="Open Debug Panel (Ctrl+Shift+I)"
                >
                    Cogitator Log
                </Button>
                {/* Calibrate Button */}
                <Link href="/settings" passHref legacyBehavior>
                    <Button size="xs" variant="secondary" icon={SettingsIcon} title="Interface Calibration">
                        Calibrate
                    </Button>
                </Link>
                {/* Refresh Button - Moved and restyled */}
                <Button
                    size="xs"
                    variant="secondary"
                    icon={RefreshCw}
                    onClick={handleManualRefresh}
                    loading={isManualRefreshing}
                    disabled={isLoading}
                    title="Refresh Data"
                >
                    Refresh
                </Button>
                {/* Auth Button */}
                <AuthButton />
            </div>
        </div>
    );
};

export default PageHeader; 