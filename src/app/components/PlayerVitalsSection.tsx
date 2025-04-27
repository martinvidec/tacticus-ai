import React from 'react';
import { PlayerDataResponse } from '@/lib/types';
import { useAuth } from '@/lib/contexts/AuthContext'; // To get user type
import CollapsibleSection from './CollapsibleSection'; // Assuming CollapsibleSection is refactored or accessible
import { ShieldCheck } from 'lucide-react';

interface PlayerVitalsSectionProps {
  playerData: PlayerDataResponse | null;
  user: ReturnType<typeof useAuth>['user']; // Use the type from useAuth
}

const PlayerVitalsSection: React.FC<PlayerVitalsSectionProps> = ({ playerData, user }) => {
  // Don't render if player data is missing
  if (!playerData?.player?.details) {
    return null;
  }

  return (
    <CollapsibleSection title="Player Identification & Vitals" icon={<ShieldCheck size={20}/>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Designation:</strong> {playerData.player.details.name ?? 'N/A'}</div>
        <div><strong className="text-[rgb(var(--primary-color))] font-semibold">ID (User):</strong> {user?.uid ?? 'N/A'}</div>
        <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Combat Effectiveness (Power):</strong> {playerData.player.details.powerLevel?.toLocaleString() ?? 'N/A'}</div>
        {playerData.metaData && (
          <>
            <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Last Sync:</strong> {new Date(playerData.metaData.lastUpdatedOn * 1000).toLocaleString()}</div>
            <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Clearance Scopes:</strong> {playerData.metaData.scopes?.join(', ') ?? 'N/A'}</div>
            {playerData.metaData.apiKeyExpiresOn && <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Key Deactivation:</strong> {new Date(playerData.metaData.apiKeyExpiresOn * 1000).toLocaleString()}</div>}
            <div><strong className="text-[rgb(var(--primary-color))] font-semibold">Config Hash:</strong> <span className="text-xs break-all">{playerData.metaData.configHash ?? 'N/A'}</span></div>
          </>
        )}
      </div>
    </CollapsibleSection>
  );
};

export default PlayerVitalsSection; 