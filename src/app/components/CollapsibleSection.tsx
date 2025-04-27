import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggleRequest?: () => void;
}

// Helper component for collapsible sections - Themed
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, icon, children, isOpen: isOpenProp, onToggleRequest }) => {
  // Internal state only used if external control props are NOT provided
  const [isOpenInternal, setIsOpenInternal] = useState(false);

  // Determine the source of truth for the open state
  const isControlled = isOpenProp !== undefined;
  const isOpen = isControlled ? isOpenProp : isOpenInternal;

  // Effect to sync internal state if external control is removed (edge case)
  useEffect(() => {
    if (!isControlled && isOpenProp !== undefined) {
      setIsOpenInternal(isOpenProp);
    }
  }, [isControlled, isOpenProp]);

  // Handle the toggle action
  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (onToggleRequest) {
        // If controlled, prevent default and call the external handler
        e.preventDefault(); // Prevent default state change of <details>
        onToggleRequest();
    } else {
        // If not controlled, update internal state based on the event
        // Use the event target's open state AFTER the toggle happened
        setIsOpenInternal((e.target as HTMLDetailsElement).open);
    }
  };

  return (
    <div className="border border-[rgb(var(--border-color))] rounded-lg mb-4 overflow-hidden bg-[rgba(var(--background-end-rgb),0.4)] shadow-md">
      {/* Clickable Header */}
      <div 
        className="flex justify-between items-center p-3 md:p-4 bg-gradient-to-b from-[rgba(var(--border-color),0.3)] to-[rgba(var(--border-color),0.1)] hover:from-[rgba(var(--border-color),0.4)] hover:to-[rgba(var(--border-color),0.2)] cursor-pointer font-semibold text-base md:text-lg text-[rgb(var(--primary-color))]"
        onClick={onToggleRequest ? onToggleRequest : () => setIsOpenInternal(prev => !prev)} // Use appropriate toggle handler
      >
        <div className="flex items-center space-x-2">
          {icon}
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>
      {/* Conditionally rendered content */}
      {isOpen && (
          <div className="p-3 md:p-4 border-t border-[rgb(var(--border-color))] text-[rgb(var(--foreground-rgb),0.9)]">
              {children}
          </div>
      )}
    </div>
  );
};

export default CollapsibleSection; 