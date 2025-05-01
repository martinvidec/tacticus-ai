import React from 'react';
import { GuildResponse, GuildMember } from '@/lib/types';

interface GuildAffiliationSectionProps {
  guildData: GuildResponse | null;
}

// Helper function from page.tsx (ensure consistency or move to shared utils)
const formatRole = (role: string | undefined): string => {
  if (!role) return 'N/A';
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

const GuildAffiliationSection: React.FC<GuildAffiliationSectionProps> = ({ guildData }) => {
  const guild = guildData?.guild;

  if (!guild) {
    return (
      <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
          Guild Affiliation
        </h3>
        <p className="text-sm text-[rgb(var(--foreground-rgb),0.7)]">++ No Guild Detected in Data Stream ++</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-[rgb(var(--primary-color))] mb-3 border-b border-[rgb(var(--border-color))] pb-2">
        Guild Affiliation: [{guild.guildTag}] {guild.name}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
        <p><strong className="text-[rgb(var(--primary-color))] font-medium">Level:</strong> {guild.level ?? 'N/A'}</p>
        <p><strong className="text-[rgb(var(--primary-color))] font-medium">Members:</strong> {guild.members?.length ?? 'N/A'}</p>
        <p className="col-span-1 md:col-span-2"><strong className="text-[rgb(var(--primary-color))] font-medium">Guild ID:</strong> <span className="text-xs">{guild.guildId ?? 'N/A'}</span></p>
        <p className="col-span-1 md:col-span-2"><strong className="text-[rgb(var(--primary-color))] font-medium">Available Raid Seasons:</strong> {guild.guildRaidSeasons?.join(', ') ?? 'N/A'}</p>
      </div>
      
      <h4 className="text-base font-semibold text-[rgb(var(--primary-color))] mb-2 mt-4 border-t border-[rgb(var(--border-color))] pt-3">Member Roster ({guild.members?.length})</h4>
      {guild.members && guild.members.length > 0 ? (
        <div className="max-h-60 overflow-y-auto pr-2">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[rgb(var(--highlight-bg))] z-10">
              <tr>
                <th className="p-1 border-b border-[rgb(var(--border-color))">User ID</th>
                <th className="p-1 border-b border-[rgb(var(--border-color))">Role</th>
                <th className="p-1 border-b border-[rgb(var(--border-color))">Level</th>
                <th className="p-1 border-b border-[rgb(var(--border-color))">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {guild.members.map((member: GuildMember) => (
                <tr key={member.userId} className="border-b border-[rgba(var(--border-color),0.5)] hover:bg-[rgba(var(--primary-color),0.05)]">
                  <td className="p-1 font-mono text-[10px]" title={member.userId}>{member.userId?.substring(0, 8)}...</td>
                  <td className="p-1">{formatRole(member.role)}</td>
                  <td className="p-1">{member.level}</td>
                  <td className="p-1">{member.lastActivityOn ? new Date(member.lastActivityOn * 1000).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[rgb(var(--foreground-rgb),0.7)]">No member data available.</p>
      )}
    </div>
  );
};

export default GuildAffiliationSection; 