import React from 'react';
import { Unit } from '@/lib/types';
import AllianceBarList from './charts/AllianceBarList';

interface AllianceDistributionProps {
  units: Unit[] | null | undefined;
}

const AllianceDistribution: React.FC<AllianceDistributionProps> = ({ units }) => {
  if (!units || units.length === 0) {
    // Optionally render a placeholder or nothing if there are no units
    return null; 
  }

  return (
    <div className="mb-6">
      <AllianceBarList units={units} />
    </div>
  );
};

export default AllianceDistribution; 