import React from 'react';
import { PlayerDataResponse } from '@/lib/types';
import { useAuth } from '@/lib/contexts/AuthContext'; // To get user type
// Remove CollapsibleSection import
// import CollapsibleSection from './CollapsibleSection'; // Assuming CollapsibleSection is refactored or accessible
// Icons might still be needed for internal elements, keep imports if necessary
// import { Target, ShieldCheck, Box, TrendingUp, ArrowUpDown, Filter, Users, Swords } from 'lucide-react';

interface PlayerVitalsSectionProps {
  playerData: PlayerDataResponse | null;
  user: ReturnType<typeof useAuth>['user']; // Use the type from useAuth
}

const PlayerVitalsSection: React.FC<PlayerVitalsSectionProps> = ({ playerData, user }) => {
  if (!playerData?.player) {
    return <p>++ No Operative Vitals Data Available ++</p>; 
  }

  const { details } = playerData.player;

  // Return the inner content directly, wrapped in a div for structure/padding
  return (
    <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
          Player Identification & Vitals
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
              <p><strong className="text-[rgb(var(--primary-color))] font-medium">Call Sign:</strong> {details?.name ?? 'N/A'}</p>
              <p><strong className="text-[rgb(var(--primary-color))] font-medium">Registered Email:</strong> {user?.email ?? 'N/A'}</p>
          </div>
          <div>
               <p><strong className="text-[rgb(var(--primary-color))] font-medium">Power Level Estimate:</strong> {details?.powerLevel?.toLocaleString() ?? 'N/A'}</p>
               {/* Add other relevant details if available */}
          </div>
      </div>
    </div>
  );
};

export default PlayerVitalsSection; 