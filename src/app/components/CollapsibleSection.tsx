import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

// Helper component for collapsible sections - Themed
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, icon, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <details className="border border-[rgb(var(--border-color))] rounded-lg mb-4 overflow-hidden bg-[rgba(var(--background-end-rgb),0.4)] shadow-md" onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="flex justify-between items-center p-3 md:p-4 bg-gradient-to-b from-[rgba(var(--border-color),0.3)] to-[rgba(var(--border-color),0.1)] hover:from-[rgba(var(--border-color),0.4)] hover:to-[rgba(var(--border-color),0.2)] cursor-pointer font-semibold text-base md:text-lg text-[rgb(var(--primary-color))]">
        <div className="flex items-center space-x-2">
          {icon}
          <span>{title}</span>
      </div>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </summary>
      <div className="p-3 md:p-4 border-t border-[rgb(var(--border-color))] text-[rgb(var(--foreground-rgb),0.9)]">
        {children}
      </div>
    </details>
  );
};

export default CollapsibleSection; 