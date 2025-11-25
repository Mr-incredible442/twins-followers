import { useContext } from 'react';
import { GameContext } from './gameContextValue';

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};
