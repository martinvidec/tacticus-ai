'use client';

import React, { useMemo } from 'react';
import { PlayerDataResponse, GuildRaidResponse, Unit, RaidEntry, PublicHeroDetail } from '@/lib/types';
import {
    Card,
    Table,
    TableHead,
    TableRow,
    TableHeaderCell,
    TableBody,
    TableCell,
    Text,
    Title,
    Accordion,
    AccordionHeader,
    AccordionBody
} from '@tremor/react';

interface BossCompositionPerformanceProps {
    playerData?: PlayerDataResponse | null;
    allGuildRaidData?: Record<number, GuildRaidResponse> | null;
}

// Structure to hold aggregated stats for a specific team against a specific boss
interface TeamBossStats {
    teamKey: string; // e.g., "alephnull_bellator_certus"
    teamUnitNames: string[];
    totalDamage: number;
    timesUsed: number;
    avgDamage: number;
}

// Structure to hold all team performances against a single boss
interface BossPerformance {
    bossName: string;
    teamStats: TeamBossStats[];
}

// Helper to create a consistent team key from heroDetails
const createTeamKey = (heroDetails: PublicHeroDetail[]): string => {
    if (!heroDetails || heroDetails.length === 0) return 'unknown_team';
    // Sort IDs alphabetically to ensure consistent key regardless of order
    return heroDetails.map(h => h.unitId).sort().join('_');
};

export default function BossCompositionPerformance({ playerData, allGuildRaidData }: BossCompositionPerformanceProps) {

    const seasonKeys = allGuildRaidData ? Object.keys(allGuildRaidData) : [];
    const isAllSeasons = seasonKeys.length !== 1; 
    const displayTitle = isAllSeasons 
        ? 'Team Performance vs. Boss (All Seasons)' 
        : `Team Performance vs. Boss (Season ${seasonKeys[0]})`;

    // --- DEBUGGING --- 
    console.log("[BossComp] Rendering for:", displayTitle);
    console.log("[BossComp] Received allGuildRaidData keys:", seasonKeys);
    // Remove the checkpoint log or keep it if preferred
    // console.log("[BossComp] CHECKPOINT: About to process data."); 

    const processedBossStats = useMemo((): BossPerformance[] => {
        console.log("[BossComp] Recalculating processedBossStats..."); // Log recalculation
        
        // Log the raw data received by useMemo
        console.log("[BossComp] Data received by useMemo:", allGuildRaidData);

        if (!playerData?.player?.units || !allGuildRaidData || Object.keys(allGuildRaidData).length === 0) {
            console.log("[BossComp] Aborting calculation: Missing player units or raid data.");
            return [];
        } else {
            console.log("[BossComp] Data check passed. Player units:", playerData.player.units.length, "Raid data keys:", Object.keys(allGuildRaidData));
        }

        const unitsMap = new Map<string, Unit>(playerData.player.units.map(u => [u.id, u]));
        
        // Intermediate structure: { bossName: { teamKey: { totalDamage, timesUsed, unitIdsSet } } }
        const bossTeamAggregates = new Map<string, Map<string, { totalDamage: number; timesUsed: number; unitIdsSet: Set<string>} >>();

        console.log("[BossComp] Starting iteration over season data..."); // Log loop start
        // --- Iterate through ALL seasons in allGuildRaidData --- 
        Object.entries(allGuildRaidData).forEach(([seasonKey, seasonData]) => { // Use Object.entries to get key
             console.log(`[BossComp] Processing Season ${seasonKey}...`); // Log which season
             if (!seasonData?.entries) {
                 console.log(`[BossComp] Season ${seasonKey} has no entries array.`);
                 return; // Skip if a season has no entries array
             }
             
             console.log(`[BossComp] Season ${seasonKey} entries:`, seasonData.entries); // Log the entries array

             if (!Array.isArray(seasonData.entries) || seasonData.entries.length === 0) {
                console.log(`[BossComp] Season ${seasonKey} entries array is not valid or empty.`);
                return; // Skip if entries is not a valid array or empty
             }

             seasonData.entries.forEach((entry: RaidEntry, index: number) => {
                // Add a check inside the inner loop too, maybe log the first entry
                if(index === 0) {
                    console.log(`[BossComp] Season ${seasonKey} - Processing first entry:`, entry);
                }
                 
                const bossName = entry?.type || 'Unknown Boss'; // Add safety check for entry
                const heroDetails = entry?.heroDetails; // Add safety check
                const damageDealt = entry?.damageDealt; // Add safety check

                if (!heroDetails || damageDealt === null || damageDealt === undefined) {
                    console.warn(`[BossComp] Season ${seasonKey} - Entry ${index} skipped: Missing heroDetails or damageDealt.`, entry);
                    return; // Skip entry if essential data is missing
                }

                const teamKey = createTeamKey(heroDetails);
                const unitIdsSet = new Set(heroDetails.map(h => h.unitId)); // Already checked heroDetails exists

                let teamsMap = bossTeamAggregates.get(bossName);
                if (!teamsMap) {
                    teamsMap = new Map<string, { totalDamage: number; timesUsed: number; unitIdsSet: Set<string> }>();
                    bossTeamAggregates.set(bossName, teamsMap);
                }

                let currentTeamStats = teamsMap.get(teamKey);
                if (!currentTeamStats) {
                    currentTeamStats = { totalDamage: 0, timesUsed: 0, unitIdsSet: unitIdsSet };
                    teamsMap.set(teamKey, currentTeamStats);
                }

                currentTeamStats.totalDamage += damageDealt; // Already checked damageDealt exists
                currentTeamStats.timesUsed += 1;
                // No need to update unitIdsSet here, it's set when the team is first seen
            });
        });
        // --- End Iteration --- 
        console.log("[BossComp] Finished iteration over season data."); // Log loop end

        // Convert aggregated data into the final structure for display
        const results: BossPerformance[] = [];
        bossTeamAggregates.forEach((teamsMap, bossName) => {
            const teamStats: TeamBossStats[] = [];
            teamsMap.forEach((stats, teamKey) => {
                const teamUnitNames = Array.from(stats.unitIdsSet)
                    .map(id => unitsMap.get(id)?.name || id) // Get names, fallback to ID
                    .sort(); // Sort names for consistent display
                
                const avgDamage = stats.timesUsed > 0 ? stats.totalDamage / stats.timesUsed : 0;

                teamStats.push({
                    teamKey,
                    teamUnitNames,
                    totalDamage: stats.totalDamage,
                    timesUsed: stats.timesUsed,
                    avgDamage: Math.round(avgDamage)
                });
            });

            // Sort teams within this boss group by average damage descending
            teamStats.sort((a, b) => b.avgDamage - a.avgDamage);

            results.push({
                bossName,
                teamStats
            });
        });

        // Sort bosses alphabetically
        results.sort((a, b) => a.bossName.localeCompare(b.bossName));

        // Log the final calculated stats before returning from useMemo
        console.log("[BossComp] Calculated processedBossStats:", results); // This is crucial
        return results;

    }, [playerData, allGuildRaidData]);

    // --- MORE DEBUGGING --- 
    console.log("[BossComp] Final processedStats length:", processedBossStats.length);

    // Use dynamic title in the 'no data' state
    if (processedBossStats.length === 0) {
        return (
            <Card>
                <Title>{displayTitle}</Title>
                <Text className="mt-2">No raid data available or no applicable raid entries found for the selected season(s).</Text>
            </Card>
        );
    }

    // Use dynamic title in the main return
    return (
        <Card>
            <Title>{displayTitle}</Title>
             <Accordion className="mt-4">
                 {processedBossStats.map((bossPerf) => (
                     <Accordion key={bossPerf.bossName}>
                         <AccordionHeader>
                             <div className="flex justify-between w-full pr-4">
                                 <Text>{bossPerf.bossName}</Text>
                                 <Text>{`${bossPerf.teamStats.length} Team Comp(s)`}</Text>
                             </div>
                         </AccordionHeader>
                         <AccordionBody>
                              <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableHeaderCell>Team Composition</TableHeaderCell>
                                        <TableHeaderCell className="text-right">Times Used</TableHeaderCell>
                                        <TableHeaderCell className="text-right">Total Damage</TableHeaderCell>
                                        <TableHeaderCell className="text-right">Avg Damage / Use</TableHeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {bossPerf.teamStats.map((item) => (
                                        <TableRow key={item.teamKey}>
                                            <TableCell>
                                                <Text className='text-xs'>{item.teamUnitNames.join(', ')}</Text>
                                            </TableCell>
                                            <TableCell className="text-right">{item.timesUsed.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{item.totalDamage.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{item.avgDamage.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </AccordionBody>
                     </Accordion>
                 ))}
             </Accordion>
        </Card>
    );
} 