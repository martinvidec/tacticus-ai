'use client';

import React from 'react';
import { ChevronRightIcon } from '@heroicons/react/20/solid'; // Use solid icon for separator

export interface BreadcrumbItem {
    label: string;
    onClick?: () => void; // Optional onClick for navigating back
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
    if (!items || items.length === 0) {
        return null; // Don't render if no items
    }

    return (
        <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center space-x-1 text-sm text-[rgb(var(--foreground-rgb),0.7)]">
                {items.map((item, index) => (
                    <li key={index} className="flex items-center">
                        {index > 0 && (
                            <ChevronRightIcon className="h-4 w-4 mx-1 flex-shrink-0 text-[rgb(var(--foreground-rgb),0.5)]" aria-hidden="true" />
                        )}
                        {item.onClick ? (
                            <button
                                onClick={item.onClick}
                                className="hover:text-[rgb(var(--primary-color))] transition-colors duration-150 ease-in-out"
                            >
                                {item.label}
                            </button>
                        ) : (
                            // Last item, not clickable (or different style)
                            <span className="font-medium text-[rgb(var(--foreground-rgb))]" aria-current="page">
                                {item.label}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;

// Trigger re-evaluation by linter 