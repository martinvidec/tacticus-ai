import React from 'react';
import { BarChart, Card, Title, Subtitle } from '@tremor/react';

interface FactionCount {
  faction: string;
  count: number;
}

interface AllianceData {
  alliance: string;
  factionCounts: FactionCount[];
}

interface HeroAllianceFactionChartProps {
  data: AllianceData[];
}

const valueFormatter = (number: number) => `${number}`;

const HeroAllianceFactionChart: React.FC<HeroAllianceFactionChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return null; // Don't render if no data
  }

  // Sort alliances alphabetically for consistent order
  const sortedData = [...data].sort((a, b) => a.alliance.localeCompare(b.alliance));

  return (
    <Card className="p-1.5 bg-transparent border-none shadow-none flex flex-col"> 
      <Title className="text-[10px] font-medium text-center text-[rgb(var(--foreground-rgb),0.8)] mb-1">Team Composition</Title>
      <div className="flex-grow space-y-1 overflow-y-auto h-28 pr-1"> {/* Ensure container grows and scrolls */}
        {sortedData.map(({ alliance, factionCounts }) => (
          <div key={alliance}>
            <Subtitle className="text-[9px] font-semibold text-[rgb(var(--primary-color),0.9)] ml-1">{alliance}</Subtitle>
            <BarChart
              className="h-auto text-[8px] mt-0.5" // Very compact
              data={factionCounts} // Use pre-calculated counts
              layout="horizontal" // Horizontal bars
              index="faction"
              categories={['count']}
              colors={['cyan']} 
              valueFormatter={valueFormatter}
              showYAxis={true} // Show faction names
              yAxisWidth={45}
              showXAxis={false} // Hide count axis
              showLegend={false}
              showGridLines={false}
              barCategoryGap={'5%'} // Very small gap
            />
          </div>
        ))}
      </div>
    </Card>
  );
};

export default HeroAllianceFactionChart; 