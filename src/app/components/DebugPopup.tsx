'use client';

import { useDebug } from '@/lib/contexts/DebugContext';
import { X } from 'lucide-react';

export default function DebugPopup() {
  const { isPopupOpen, setIsPopupOpen, lastApiResponse } = useDebug();

  if (!isPopupOpen) {
    return null;
  }

  return (
    <div 
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        onClick={() => setIsPopupOpen(false)} // Close on overlay click
    >
      <div 
        className="bg-[rgb(var(--background-start-rgb))] border border-[rgb(var(--border-color))] rounded-lg shadow-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[rgb(var(--primary-color))]">Last API Response (Player Data)</h2>
          <button 
            onClick={() => setIsPopupOpen(false)}
            className="text-[rgb(var(--foreground-rgb),0.7)] hover:text-[rgb(var(--foreground-rgb))] transition-colors"
            aria-label="Close Popup"
          >
            <X size={24} />
          </button>
        </div>
        <div className="overflow-auto flex-grow">
            <pre className="text-xs bg-[rgba(var(--background-end-rgb),0.7)] p-3 rounded border border-[rgb(var(--border-color))] whitespace-pre-wrap break-words">
                {lastApiResponse 
                    ? JSON.stringify(lastApiResponse, null, 2)
                    : 'No API response captured yet.'}
            </pre>
        </div>
      </div>
    </div>
  );
} 