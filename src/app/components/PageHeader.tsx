import React from 'react';
import { useAuth } from '@/lib/contexts/AuthContext'; // To get user type
import { Button } from '@tremor/react';
import { RefreshCw } from 'lucide-react';

interface PageHeaderProps {
  user: ReturnType<typeof useAuth>['user']; // Use the type from useAuth
  isLoading: boolean;
  isManualRefreshing: boolean;
  handleManualRefresh: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({ user, isLoading, isManualRefreshing, handleManualRefresh }) => {
  return (
    <div className="w-full max-w-6xl flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
      <div className="flex flex-col items-center sm:items-start">
        <h1 className="text-3xl md:text-4xl font-bold text-[rgb(var(--primary-color))] uppercase tracking-wider">Tacticus Player Intel</h1>
        {/* Display Username and Email */}
        {user && (
          <span className="text-sm text-[rgb(var(--primary-color),0.7)] mt-1">
            ++ Identified Operator: {user.displayName || 'Unknown'} {user.email ? `[${user.email}]` : ''} ++
          </span>
        )}
      </div>
      {user && (
        <Button
          icon={RefreshCw}
          onClick={handleManualRefresh}
          disabled={isLoading} // Use general isLoading for disable
          loading={isManualRefreshing} // Specific loading state for spinner
          variant="secondary"
          className="text-[rgb(var(--primary-color))] border-[rgb(var(--primary-color))] hover:bg-[rgba(var(--primary-color-rgb),0.1)] disabled:opacity-50"
        >
          Refresh Data
        </Button>
      )}
    </div>
  );
};

export default PageHeader; 