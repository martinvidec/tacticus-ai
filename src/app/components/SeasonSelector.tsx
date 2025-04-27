import React from 'react';
import { Select, SelectItem } from '@tremor/react';

interface SeasonSelectorProps {
  availableSeasons: number[];
  selectedSeason: number | 'all';
  setSelectedSeason: (value: number | 'all') => void;
}

const SeasonSelector: React.FC<SeasonSelectorProps> = ({
  availableSeasons,
  selectedSeason,
  setSelectedSeason,
}) => {
  // Don't render if no seasons are available
  if (availableSeasons.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 flex items-center space-x-2">
      <label htmlFor="season-select" className="text-sm font-medium text-[rgb(var(--foreground-rgb),0.8)]">Select Season:</label>
      <Select
        id="season-select"
        value={String(selectedSeason)}
        onValueChange={(value) => setSelectedSeason(value === 'all' ? 'all' : Number(value))}
        className="max-w-xs"
      >
        <SelectItem value="all">All Seasons</SelectItem>
        {availableSeasons.map(season => (
          <SelectItem key={season} value={String(season)}>
            Season {season}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
};

export default SeasonSelector; 