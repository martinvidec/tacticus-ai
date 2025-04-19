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
    Title
} from '@tremor/react';

interface UnitRaidPerformanceProps {
    playerData?: PlayerDataResponse | null;
    guildRaidData?: GuildRaidResponse | null;
}

interface ProcessedUnitStats {
    id: string;
    name: string;
    timesUsed: number;
    totalDamage: number;
    avgDamage: number;
}

export default function UnitRaidPerformance({ playerData, guildRaidData }: UnitRaidPerformanceProps) {

    const processedStats = useMemo((): ProcessedUnitStats[] => {
        if (!playerData?.player?.units || !guildRaidData?.entries) {
            return [];
        }

        const unitsMap = new Map<string, Unit>(playerData.player.units.map(u => [u.id, u]));
        const unitStats = new Map<string, { totalDamage: number; timesUsed: number }>();

        // Aggregate stats from raid entries
        guildRaidData.entries.forEach((entry: RaidEntry) => {
            entry.heroDetails?.forEach((hero: PublicHeroDetail) => {
                const unitId = hero.unitId;
                const currentStats = unitStats.get(unitId) || { totalDamage: 0, timesUsed: 0 };
                
                // Accumulate damage for this entry for every hero present in it
                // Note: This assumes the entry.damageDealt applies to the effort involving all heroDetails listed.
                // A more complex interpretation might be needed if damage is per-hero.
                currentStats.totalDamage += entry.damageDealt || 0;
                currentStats.timesUsed += 1;
                unitStats.set(unitId, currentStats);
            });
            // Handle machineOfWarDetails if present and needed
            if (entry.machineOfWarDetails) {
                 const unitId = entry.machineOfWarDetails.unitId;
                 const currentStats = unitStats.get(unitId) || { totalDamage: 0, timesUsed: 0 };
                 currentStats.totalDamage += entry.damageDealt || 0;
                 currentStats.timesUsed += 1;
                 unitStats.set(unitId, currentStats);
            }
        });

        // Convert map to array, add names, calculate average, and sort
        const results: ProcessedUnitStats[] = Array.from(unitStats.entries()).map(([id, stats]) => {
            const unitInfo = unitsMap.get(id);
            const name = unitInfo?.name || id; // Fallback to ID if name is missing
            const avgDamage = stats.timesUsed > 0 ? stats.totalDamage / stats.timesUsed : 0;
            return {
                id,
                name,
                timesUsed: stats.timesUsed,
                totalDamage: stats.totalDamage,
                avgDamage: Math.round(avgDamage) // Round average damage
            };
        });

        // Sort by total damage descending
        results.sort((a, b) => b.totalDamage - a.totalDamage);

        return results;

    }, [playerData, guildRaidData]);

    if (processedStats.length === 0) {
        return (
            <Card>
                <Title>Unit Raid Performance</Title>
                <Text className="mt-2">No raid data available or no units used in raids.</Text>
            </Card>
        );
    }

    return (
        <Card>
            <Title>Unit Raid Performance (Current Season)</Title>
            <Table className="mt-5">
                <TableHead>
                    <TableRow>
                        <TableHeaderCell>Unit Name</TableHeaderCell>
                        <TableHeaderCell className="text-right">Times Used</TableHeaderCell>
                        <TableHeaderCell className="text-right">Total Damage</TableHeaderCell>
                        <TableHeaderCell className="text-right">Avg Damage / Use</TableHeaderCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {processedStats.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-right">{item.timesUsed.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{item.totalDamage.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{item.avgDamage.toLocaleString()}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
} 