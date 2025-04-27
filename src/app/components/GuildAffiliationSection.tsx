import React from 'react';
import { GuildResponse, GuildMember } from '@/lib/types';
import CollapsibleSection from './CollapsibleSection';
import { Users } from 'lucide-react';

interface GuildAffiliationSectionProps {
  guildData: GuildResponse | null;
}

const GuildAffiliationSection: React.FC<GuildAffiliationSectionProps> = ({ guildData }) => {
  return (
    <CollapsibleSection title="Guild Affiliation" icon={<Users size={20} />}>
      {guildData?.guild ? (
        <div className="space-y-1 text-sm">
          <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Name:</strong> {guildData.guild.name} {guildData.guild.guildTag ? `[${guildData.guild.guildTag}]` : ''}</p>
          <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Level:</strong> {guildData.guild.level ?? 'N/A'}</p>
          <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Members:</strong> {guildData.guild.members?.length ?? 'N/A'}</p>
          {guildData.guild.guildRaidSeasons && <p><strong className="text-[rgb(var(--primary-color))] font-semibold">Available Raid Seasons:</strong> {guildData.guild.guildRaidSeasons.join(', ')}</p>}
          {guildData.guild.members && guildData.guild.members.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer font-medium text-xs">Members List ({guildData.guild.members.length})</summary>
              <ul className="text-xs list-disc list-inside pl-4 mt-1 max-h-48 overflow-auto bg-[rgba(var(--background-start-rgb),0.8)] border border-[rgb(var(--border-color))] p-2 rounded">
                {/* Ensure member type is checked before accessing userId and role */}
                {guildData.guild.members.map((member: GuildMember | null | undefined) => {
                  if (!member) return null; // Skip if member is null/undefined
                  const userId = member.userId ?? 'Unknown';
                  const role = member.role ?? 'Unknown';
                  return <li key={userId}>{userId} ({role})</li>;
                })}
              </ul>
            </details>
          )}
        </div>
      ) : (
        <p className="text-sm text-[rgb(var(--foreground-rgb),0.7)]">No guild data found (Player might not be in a guild).</p>
      )}
    </CollapsibleSection>
  );
};

export default GuildAffiliationSection; 