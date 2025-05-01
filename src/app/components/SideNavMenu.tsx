'use client';

import React, { useState } from 'react';
import Link from 'next/link'; // Might not be needed if selection is handled by state
import { 
    UserCircleIcon, 
    ShieldCheckIcon, 
    TrendingUpIcon, 
    BoxIcon, 
    ClipboardListIcon, 
    TargetIcon, 
    ChevronLeftIcon, 
    ChevronRightIcon,
    MenuIcon 
} from '@heroicons/react/24/outline'; // Using Heroicons for variety, can change back to lucide

interface Section {
    id: string;
    title: string;
    icon: React.ReactNode;
}

interface SideNavMenuProps {
    sections: Section[];
    selectedSectionId: string;
    onSelectSection: (id: string) => void;
}

const SideNavMenu: React.FC<SideNavMenuProps> = ({ sections, selectedSectionId, onSelectSection }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div 
            className={`
                sticky top-0 h-screen bg-[rgb(var(--background-start-rgb))] border-r border-[rgb(var(--border-color))] 
                transition-all duration-300 ease-in-out flex flex-col z-30 
                ${isCollapsed ? 'w-16' : 'w-64'}
            `}
        >
            {/* Header/Toggle Button */}
            <div className="flex items-center justify-between p-4 border-b border-[rgb(var(--border-color))] h-16">
                {!isCollapsed && (
                    <span className="text-lg font-semibold text-[rgb(var(--primary-color))] whitespace-nowrap">Navigation</span>
                )}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)} 
                    className="p-1 rounded-md text-[rgb(var(--foreground-rgb))] hover:bg-[rgb(var(--highlight-bg))] transition-colors"
                    title={isCollapsed ? "Expand Menu" : "Collapse Menu"}
                >
                    {isCollapsed ? <ChevronRightIcon className="h-6 w-6" /> : <ChevronLeftIcon className="h-6 w-6" />}
                </button>
            </div>

            {/* Menu Items */}
            <nav className="flex-grow pt-4 overflow-y-auto">
                <ul>
                    {sections.map((section) => (
                        <li key={section.id} className="px-2 mb-1">
                            <button
                                onClick={() => onSelectSection(section.id)}
                                className={`
                                    flex items-center w-full p-2 rounded-md transition-colors duration-150 ease-in-out
                                    ${selectedSectionId === section.id 
                                        ? 'bg-[rgb(var(--primary-color))] text-[rgb(var(--background-end-rgb))] font-semibold' 
                                        : 'text-[rgb(var(--foreground-rgb))] hover:bg-[rgb(var(--highlight-bg))] hover:text-[rgb(var(--primary-color))] '
                                    }
                                    ${isCollapsed ? 'justify-center' : ''}
                                `}
                                title={section.title}
                            >
                                <span className="flex-shrink-0 h-6 w-6">{section.icon}</span>
                                {!isCollapsed && (
                                    <span className="ml-3 whitespace-nowrap">{section.title}</span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
            
            {/* Optional Footer */}
            {/* <div className="p-4 border-t border-[rgb(var(--border-color))]">
                 {!isCollapsed && <span className="text-xs text-gray-500">Footer Info</span>} 
            </div> */}
        </div>
    );
};

export default SideNavMenu; 