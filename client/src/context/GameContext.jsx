import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { GameContext } from './gameContextValue';

export const GameProvider = ({ children }) => {
  const { socket, connected } = useSocket();
  const [playerName, setPlayerName] = useState('');
  const [socketId, setSocketId] = useState(null);
  const [room, setRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [publicLobbies, setPublicLobbies] = useState([]);
  const [gamePaused, setGamePaused] = useState(false);
  const [pausedReason, setPausedReason] = useState(null);
  const [disconnectedPlayers, setDisconnectedPlayers] = useState([]);
  const [isDecisionMaker, setIsDecisionMaker] = useState(false);
  const socketIdRef = useRef(null);

  const restoreState = useCallback(() => {
    if (!socket || !playerName) return;

    socket.emit('restore-state', { playerName }, (response) => {
      if (response.success) {
        // Restore room state
        setRoom(response.room);
        // Restore game state if game is in progress
        if (response.gameState) {
          setGameState(response.gameState);
        } else {
          setGameState(null);
        }
      } else {
        // Player not in any room, clear state
        setRoom(null);
        setGameState(null);
      }
    });
  }, [socket, playerName]);

  // Handle socket connection events and sync socket ID
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      const newSocketId = socket.id;
      if (socketIdRef.current !== newSocketId) {
        socketIdRef.current = newSocketId;
        setSocketId(newSocketId);
      }
      // Try to restore state when reconnecting
      if (playerName) {
        restoreState();
      }
    };

    // If socket is already connected, set ID immediately (but in next tick to avoid setState in effect)
    if (socket.connected && socket.id) {
      const currentId = socket.id;
      setTimeout(() => {
        if (socketIdRef.current !== currentId) {
          socketIdRef.current = currentId;
          setSocketId(currentId);
        }
      }, 0);
    }

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [socket, playerName, restoreState]);

  useEffect(() => {
    if (!socket) return;

    // Room events
    socket.on('room-update', (data) => {
      setRoom(data.room);
    });

    socket.on('room-joined', (data) => {
      setRoom(data.room);
    });

    socket.on('room-left', () => {
      setRoom(null);
      setGameState(null);
    });

    socket.on('lobbies-list', (data) => {
      setPublicLobbies(data.lobbies);
    });

    // Game events
    socket.on('game-started', (data) => {
      setGameState(data.gameState);
      if (room) {
        setRoom({ ...room, status: 'playing' });
      }
      // Update pause state from game state
      if (data.gameState) {
        setGamePaused(data.gameState.isPaused || false);
        setPausedReason(data.gameState.pausedReason || null);
        setDisconnectedPlayers(data.gameState.disconnectedPlayers || []);
        setIsDecisionMaker(
          data.gameState.decisionMakerSocketId === socket.id
        );
      }
    });

    socket.on('game-update', (data) => {
      setGameState(data.gameState);
      // Update pause state from game state
      if (data.gameState) {
        setGamePaused(data.gameState.isPaused || false);
        setPausedReason(data.gameState.pausedReason || null);
        setDisconnectedPlayers(data.gameState.disconnectedPlayers || []);
        setIsDecisionMaker(
          data.gameState.decisionMakerSocketId === socket.id
        );
      }
    });

    socket.on('game-paused', (data) => {
      setGamePaused(true);
      setPausedReason(data.reason);
      setDisconnectedPlayers(data.disconnectedPlayers || []);
      // Check if current player is decision maker from gameState
      if (gameState) {
        setIsDecisionMaker(
          gameState.decisionMakerSocketId === socket.id
        );
      }
    });

    socket.on('game-resumed', () => {
      setGamePaused(false);
      setPausedReason(null);
      setDisconnectedPlayers([]);
      setIsDecisionMaker(false);
    });

    socket.on('player-reconnected', (data) => {
      // Update disconnected players list
      setDisconnectedPlayers((prev) =>
        prev.filter((name) => name !== data.playerName)
      );
    });

    socket.on('decision-required', (data) => {
      // Show decision prompt to decision maker
      setGamePaused(true);
      setDisconnectedPlayers(data.disconnectedPlayers || []);
      setIsDecisionMaker(true);
    });

    socket.on('game-error', (data) => {
      console.error('Game error:', data.error);
      // Handle game errors
    });

    return () => {
      socket.off('room-update');
      socket.off('room-joined');
      socket.off('room-left');
      socket.off('lobbies-list');
      socket.off('game-started');
      socket.off('game-update');
      socket.off('game-paused');
      socket.off('game-resumed');
      socket.off('player-reconnected');
      socket.off('decision-required');
      socket.off('game-error');
    };
  }, [socket, room]);

  const createRoom = (name, isPrivate, password = null) => {
    return new Promise((resolve, reject) => {
      socket.emit(
        'create-room',
        { name, isPrivate, password, playerName },
        (response) => {
          if (response.success) {
            resolve(response.room);
          } else {
            reject(new Error(response.error));
          }
        },
      );
    });
  };

  const joinRoom = (roomId, password = null) => {
    return new Promise((resolve, reject) => {
      socket.emit('join-room', { roomId, password, playerName }, (response) => {
        if (response.success) {
          resolve(response.room);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  };

  const leaveRoom = () => {
    return new Promise((resolve, reject) => {
      socket.emit('leave-room', {}, (response) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  };

  const getPublicLobbies = () => {
    socket.emit('get-public-lobbies', {}, (response) => {
      if (response.success) {
        setPublicLobbies(response.lobbies);
      }
    });
  };

  const startGame = () => {
    socket.emit('start-game', {}, (response) => {
      if (!response.success) {
        console.error('Failed to start game:', response.error);
      }
    });
  };

  const drawCard = () => {
    socket.emit('draw-card', {}, (response) => {
      if (!response.success) {
        console.error('Failed to draw card:', response.error);
      }
    });
  };

  const discardCard = (card) => {
    socket.emit('discard-card', { card }, (response) => {
      if (!response.success) {
        console.error('Failed to discard card:', response.error);
      }
    });
  };

  const pickUpDiscard = () => {
    socket.emit('pick-up-discard', {}, (response) => {
      if (!response.success) {
        console.error('Failed to pick up discard:', response.error);
      }
    });
  };

  const declareWin = () => {
    socket.emit('declare-win', {}, (response) => {
      if (!response.success) {
        console.error('Failed to declare win:', response.error);
      }
    });
  };

  const restartGame = () => {
    return new Promise((resolve, reject) => {
      socket.emit('restart-game', {}, (response) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  };

  const continueGameAfterDisconnect = () => {
    return new Promise((resolve, reject) => {
      socket.emit('continue-game-after-disconnect', {}, (response) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  };

  const endGameAfterDisconnect = () => {
    return new Promise((resolve, reject) => {
      socket.emit('end-game-after-disconnect', {}, (response) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  };

  return (
    <GameContext.Provider
      value={{
        playerName,
        setPlayerName,
        socketId,
        room,
        gameState,
        publicLobbies,
        connected,
        gamePaused,
        pausedReason,
        disconnectedPlayers,
        isDecisionMaker,
        createRoom,
        joinRoom,
        leaveRoom,
        getPublicLobbies,
        startGame,
        drawCard,
        discardCard,
        pickUpDiscard,
        declareWin,
        restartGame,
        restoreState,
        continueGameAfterDisconnect,
        endGameAfterDisconnect,
      }}>
      {children}
    </GameContext.Provider>
  );
};
