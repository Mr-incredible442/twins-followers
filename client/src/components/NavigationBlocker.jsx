import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../context/useGame';

/**
 * Global navigation blocker that prevents leaving /game during active match
 * This runs at the App level to intercept navigation before React Router processes it
 */
const NavigationBlocker = () => {
  const { gameState, room } = useGame();
  const location = useLocation();
  const navigate = useNavigate();
  const hasActiveGame = gameState && room?.status === 'playing';

  useEffect(() => {
    // If there's an active game but we're not on /game, redirect immediately
    if (hasActiveGame && location.pathname !== '/game') {
      navigate('/game', { replace: true });
      return;
    }

    if (!hasActiveGame) return;

    // Only block if we're currently on /game
    if (location.pathname !== '/game') return;

    // Add a history entry when entering game to intercept back button
    if (window.history.state?.fromGame !== true) {
      window.history.pushState({ fromGame: true }, '', '/game');
    }
  }, [hasActiveGame, location.pathname, navigate]);

  return null;
};

export default NavigationBlocker;
