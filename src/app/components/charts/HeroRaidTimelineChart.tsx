import React from 'react';
import { AreaChart, Card, Title } from '@tremor/react';

interface HeroRaidDataPoint {
  // time: Date; // Keep original Date object for potential future use
  timeLabel: string; // Formatted string for chart category
  Power: number | null; // Use capitalized key for Tremor category
  'Total Damage': number | null; // Use string key for Tremor category with space
}

interface HeroRaidTimelineChartProps {
  heroId: string;
  data: { time: Date; power: number; totalDamage: number }[];
}

const HeroRaidTimelineChart: React.FC<HeroRaidTimelineChartProps> = ({ heroId, data }) => {
  if (!data || data.length === 0) {
    return <p className="text-xs text-[rgb(var(--foreground-rgb),0.7)] mt-2">No raid participation data available for this hero.</p>;
  }

  // Sort data by time just in case it's not already sorted
  const sortedData = [...data].sort((a, b) => a.time.getTime() - b.time.getTime());

  // Format data for Tremor AreaChart
  const chartData: HeroRaidDataPoint[] = sortedData.map(point => ({
    // time: point.time, // Keep original if needed
    timeLabel: point.time.toLocaleDateString(), // Simple date label for x-axis
    Power: point.power,
    'Total Damage': point.totalDamage,
  }));

  const valueFormatter = (number: number | bigint) => {
    // Check if it's a large number (typical for damage)
    if (typeof number === 'number' && number > 10000) {
      return `${Intl.NumberFormat("us").format(number / 1000).toString()}k`;
    } 
    // Otherwise, format normally (for power)
    return Intl.NumberFormat("us").format(number).toString();
  };

  return (
    <Card className="mt-3 bg-[rgba(var(--background-end-rgb),0.5)] border border-[rgba(var(--border-color),0.5)]">
      <Title className="text-sm font-medium text-[rgb(var(--primary-color))]">{heroId} - Raid Performance Timeline</Title>
      <AreaChart
        className="h-48 mt-2"
        data={chartData}
        index="timeLabel"
        categories={['Power', 'Total Damage']}
        colors={['indigo', 'rose']} // Example colors
        valueFormatter={valueFormatter} // Apply custom formatter
        yAxisWidth={60}
        showLegend={true}
        curveType="monotone" // Smoother lines
        connectNulls={true} // Connect points even if some data is missing
      />
    </Card>
  );
};

export default HeroRaidTimelineChart; 