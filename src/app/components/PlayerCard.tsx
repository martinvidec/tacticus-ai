'use client';

import React from 'react';
import { Card, Metric, Text, Title, Flex } from '@tremor/react';
import { UserCircleIcon, SparklesIcon, ScaleIcon, ClockIcon } from '@heroicons/react/24/outline'; // Example icons

interface PlayerCardProps {
  playerName: string;
  totalPower: number;
  activeUnitsCount: number;
  lastUpdateDate: string;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ 
    playerName, 
    totalPower, 
    activeUnitsCount, 
    lastUpdateDate 
}) => {
  return (
    <Card className="bg-[rgba(var(--highlight-bg),0.5)] border border-[rgb(var(--border-color))] shadow-md h-full flex flex-col justify-between">
      {/* Player Name Title */}
      <div>
          <Flex justifyContent="start" alignItems="center" className="space-x-2 mb-4">
              <UserCircleIcon className="w-6 h-6 text-[rgb(var(--primary-color))]" />
              <Title className="text-lg font-semibold text-[rgb(var(--primary-color))]">
                  ++ {playerName} ++
              </Title>
          </Flex>

          {/* Metrics Grid/Flex */}
          <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center border-r border-[rgb(var(--border-color),0.4)] pr-2">
                  <ScaleIcon className="w-5 h-5 mx-auto mb-1 text-[rgb(var(--foreground-rgb),0.7)]"/>
                  <Text className="text-xs">Total Power</Text>
                  <Metric className="text-4xl leading-tight">{totalPower.toLocaleString()}</Metric>
              </div>
              <div className="text-center pl-2">
                  <SparklesIcon className="w-5 h-5 mx-auto mb-1 text-[rgb(var(--foreground-rgb),0.7)]"/>
                  <Text className="text-xs">Active Units</Text>
                  <Metric className="text-4xl leading-tight">{activeUnitsCount}</Metric>
              </div>
          </div>
      </div>

      {/* Last Update Footer */}
      <Flex justifyContent="start" alignItems="center" className="border-t border-[rgb(var(--border-color),0.4)] pt-2 mt-auto">
          <ClockIcon className="w-3 h-3 mr-1 text-[rgb(var(--foreground-rgb),0.6)]" />
          <Text className="text-xs text-[rgb(var(--foreground-rgb),0.6)]">Last Sync: {lastUpdateDate}</Text>
      </Flex>
    </Card>
  );
};

export default PlayerCard; 