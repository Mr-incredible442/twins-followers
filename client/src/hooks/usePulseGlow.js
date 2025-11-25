import { useState, useEffect, useRef } from 'react';

const usePulseGlow = (gameState, socketId, playerName) => {
  const [pulseGlow, setPulseGlow] = useState(false);
  const previousTurnRef = useRef(null);

  useEffect(() => {
    if (!gameState || !socketId || !gameState.currentPlayerSocketId) return;

    const currentTurn = gameState.currentPlayerSocketId;
    const isMyTurn =
      currentTurn === socketId ||
      gameState.players?.find((p) => p.socketId === currentTurn)?.playerName ===
        playerName;

    // Only pulse if it just became my turn (turn changed)
    if (isMyTurn && previousTurnRef.current !== currentTurn) {
      previousTurnRef.current = currentTurn;
      // Use setTimeout to defer state update
      const timer = setTimeout(() => {
        setPulseGlow(true);
        setTimeout(() => {
          setPulseGlow(false);
        }, 2000);
      }, 0);
      return () => clearTimeout(timer);
    } else if (!isMyTurn) {
      previousTurnRef.current = null;
    }
  }, [gameState?.currentPlayerSocketId, socketId, playerName, gameState]);

  return pulseGlow;
};

export default usePulseGlow;

