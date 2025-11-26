import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGame } from '../context/useGame';
import GameBoard from './GameBoard';
import LeaveRoomModal from './modals/LeaveRoomModal';

/**
 * Route component for /game
 * Blocks navigation away from game with confirmation
 * Redirects to /lobby if no active game
 */
const GameRoute = () => {
  const { gameState, room, leaveRoom } = useGame();
  const navigate = useNavigate();
  const location = useLocation();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);
  const isNavigatingRef = useRef(false);
  const previousLocationRef = useRef(location.pathname);

  // Check if user has active game
  const hasActiveGame = gameState && room?.status === 'playing';

  // Watch for location changes (navigation attempts) - this catches React Router navigation
  // This must run synchronously to catch navigation before component unmounts
  useEffect(() => {
    // If we're trying to navigate away from /game while in an active game
    if (hasActiveGame && location.pathname !== '/game' && previousLocationRef.current === '/game') {
      // We're navigating away - show confirmation and prevent it IMMEDIATELY
      if (!isNavigatingRef.current && !showConfirm) {
        const targetPath = location.pathname;
        setPendingPath(targetPath);
        setShowConfirm(true);
        // Immediately navigate back to /game to prevent the navigation
        // Use a microtask to ensure this runs before React Router processes the change
        queueMicrotask(() => {
          navigate('/game', { replace: true });
        });
      }
    }
    
    // Always update previous location when on /game
    if (location.pathname === '/game') {
      previousLocationRef.current = '/game';
    }
  }, [location.pathname, hasActiveGame, navigate, showConfirm]);

  // Initialize previous location
  useEffect(() => {
    previousLocationRef.current = location.pathname;
  }, []);

  useEffect(() => {
    if (!hasActiveGame) {
      // No active game, redirect to lobby
      navigate('/lobby', { replace: true });
      return;
    }

    // Set up beforeunload to warn on page refresh/close
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue
      return ''; // Some browsers require return value
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Add a dummy history entry when entering game to intercept back button
    // This creates an extra entry so we can catch the back button press
    if (window.history.state?.fromGame !== true) {
      window.history.pushState({ fromGame: true, preventBack: true }, '', '/game');
    }

    // Intercept browser back/forward button
    const handlePopState = (e) => {
      if (!isNavigatingRef.current && hasActiveGame && location.pathname === '/game') {
        // Immediately push the state back to prevent navigation
        window.history.pushState({ fromGame: true, preventBack: true }, '', '/game');
        // Show confirmation modal
        setPendingPath('/lobby'); // Default to lobby
        setShowConfirm(true);
        // Force React Router to stay on /game - use microtask to ensure it runs immediately
        queueMicrotask(() => {
          navigate('/game', { replace: true });
        });
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasActiveGame, navigate]);


  const handleConfirmLeave = async () => {
    setShowConfirm(false);
    isNavigatingRef.current = true;
    try {
      // Actually leave the room (this will handle navigation)
      await leaveRoom();
    } catch (error) {
      console.error('Failed to leave room:', error);
      // Fallback navigation if leaveRoom fails
      if (pendingPath) {
        navigate(pendingPath);
      } else {
        navigate('/lobby');
      }
    }
    setPendingPath(null);
    // Reset flag after navigation
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 100);
  };

  const handleCancelLeave = () => {
    setShowConfirm(false);
    setPendingPath(null);
    // Push current path back to history
    window.history.pushState(null, '', location.pathname);
  };

  if (!hasActiveGame) {
    return null; // Will redirect
  }

  return (
    <>
      <GameBoard />
      <LeaveRoomModal
        show={showConfirm}
        onHide={handleCancelLeave}
        onConfirm={handleConfirmLeave}
        gamePhase={gameState?.phase}
        backdrop="static"
        keyboard={false}
      />
    </>
  );
};

export default GameRoute;

