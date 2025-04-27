import React from 'react';
import { Card, Title } from '@tremor/react';

interface HeroPowerData {
  name: string;
  Power: number;
  alliance: string;
}

interface HeroPowerRankingChartProps {
  data: HeroPowerData[];
}

const HeroPowerRankingChart: React.FC<HeroPowerRankingChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return null; // Don't render if no data
  }

  // Sort data by power descending before passing to chart
  const sortedData = [...data].sort((a, b) => b.Power - a.Power);

  // Find max power for scaling
  const maxPower = Math.max(...sortedData.map(d => d.Power), 0); // Ensure maxPower is at least 0

  // Helper to get colors based on alliance
  const getAllianceColors = (alliance: string): { bgClass: string; textClass: string } => {
    switch (alliance?.toLowerCase()) {
      case 'imperial':
        return { bgClass: 'bg-blue-500', textClass: 'text-white' }; // Blue for Imperial
      case 'chaos':
        return { bgClass: 'bg-red-600', textClass: 'text-white' }; // Red for Chaos
      case 'xenos':
        return { bgClass: 'bg-purple-500', textClass: 'text-white' }; // Purple for Xenos
      default:
        return { bgClass: 'bg-gray-400', textClass: 'text-black' }; // Gray for Unknown
    }
  };

  return (
    <Card className="p-1.5 bg-transparent border-none shadow-none flex flex-col"> {/* Keep flex-col for title */}
      <Title className="text-[10px] font-medium text-center text-[rgb(var(--foreground-rgb),0.8)] mb-1">Power Rank</Title>
      {/* Container for the custom bars */}
      <div className="space-y-0.5"> {/* Minimal space between bars */}
        {sortedData.map((hero) => {
          // Calculate width percentage, handle maxPower = 0 case
          const widthPercentage = maxPower > 0 ? (hero.Power / maxPower) * 100 : 0;
          // Get alliance colors
          const { bgClass, textClass } = getAllianceColors(hero.alliance);

          return (
            <div key={hero.name} className="relative h-4 bg-gray-700/50 rounded-sm overflow-hidden"> {/* Bar background/container */}
              {/* The actual bar */}
              <div 
                className={`absolute top-0 left-0 h-full ${bgClass}`}
                style={{ width: `${widthPercentage}%` }}
              />
              {/* Text inside the bar - positioned absolutely */}
              <div className={`absolute inset-0 px-1 flex items-center justify-between text-[9px] ${textClass} z-10 whitespace-nowrap overflow-hidden`}>
                <span className="font-medium truncate">{hero.name}</span>
                <span className="font-semibold pl-1">{hero.Power.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default HeroPowerRankingChart; 