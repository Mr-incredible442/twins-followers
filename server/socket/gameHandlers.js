// Socket Handlers for Game Operations
import gameStateManager from '../game/gameState.js';
import roomManager from '../room/roomManager.js';
import gameHistory from '../game/gameHistory.js';

// Store turn timers per room
const turnTimers = new Map(); // key: roomId, value: timeout

/**
 * Start turn timer for a room
 * @param {Server} io - Socket.IO server instance
 * @param {string} roomId - Room ID
 */
function startTurnTimer(io, roomId) {
  // Clear existing timer if any
  clearTurnTimer(roomId);

  // Set new timer for 30 seconds
  const timer = setTimeout(async () => {
    const result = await gameStateManager.autoSkipTurn(roomId);
    if (result.success) {
      // Check if game ended
      if (result.gameState?.winner) {
        await gameHistory.saveGameHistory(roomId, result.gameState);
      }
      // Broadcast update
      await broadcastGameUpdate(io, roomId);
      // Clear timer
      turnTimers.delete(roomId);
      // Start timer for next turn if game continues
      if (!result.gameState?.winner && !result.gameState?.isPaused) {
        startTurnTimer(io, roomId);
      }
    }
  }, 30000); // 30 seconds

  turnTimers.set(roomId, timer);
}

/**
 * Clear turn timer for a room
 * @param {string} roomId - Room ID
 */
function clearTurnTimer(roomId) {
  const timer = turnTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    turnTimers.delete(roomId);
  }
}

/**
 * Setup game-related socket event handlers
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Server} io - Socket.IO server instance
 */
function setupGameHandlers(socket, io) {
  // Start a game in the current room
  socket.on('start-game', async (data, callback) => {
    try {
      const room = await roomManager.getPlayerRoom(socket.id);
      if (!room) {
        return callback?.({ success: false, error: 'Not in a room' });
      }

      if (room.status === 'playing') {
        return callback?.({ success: false, error: 'Game already started' });
      }

      // Filter out disconnected players (empty socket IDs)
      const connectedPlayers = room.players.filter(
        (p) => p.socketId && p.socketId !== ''
      );

      if (connectedPlayers.length < room.minPlayers) {
        return callback?.({
          success: false,
          error: `Need at least ${room.minPlayers} players to start`,
        });
      }

      // Initialize game with only connected players
      const gameState = await gameStateManager.initializeGame(room.id, connectedPlayers);

      // Update room status
      await roomManager.updateRoomStatus(room.id, 'playing');
      room.status = 'playing';

      // Broadcast game started to all connected players in room
      const gameStatesForPlayers = await Promise.all(
        connectedPlayers.map(async (player) => ({
          socketId: player.socketId,
          gameState: await gameStateManager.getGameStateForPlayer(room.id, player.socketId),
        }))
      );

      connectedPlayers.forEach((player) => {
        const playerGameState = gameStatesForPlayers.find(
          (gs) => gs.socketId === player.socketId,
        )?.gameState;
        io.to(player.socketId).emit('game-started', {
          gameState: playerGameState,
        });
      });

      callback?.({ success: true });
    } catch (error) {
      console.error('Error starting game:', error);
      callback?.({ success: false, error: 'Failed to start game' });
    }
  });

  // Draw a card
  socket.on('draw-card', async (data, callback) => {
    try {
      const room = await roomManager.getPlayerRoom(socket.id);
      if (!room) {
        return callback?.({ success: false, error: 'Not in a room' });
      }

      // Clear turn timer since player is acting
      clearTurnTimer(room.id);

      const result = await gameStateManager.drawCard(room.id, socket.id);
      if (!result.success) {
        // Restart timer if action failed
        const gameState = await gameStateManager.getGameState(room.id);
        if (gameState && !gameState.isPaused && !gameState.winner) {
          startTurnTimer(io, room.id);
        }
        return callback?.({ success: false, error: result.error });
      }

      // Check if game ended (winner declared)
      if (result.gameState?.winner) {
        await gameHistory.saveGameHistory(room.id, result.gameState);
        clearTurnTimer(room.id);
      } else if (result.gameState?.phase === 'discard') {
        // Player moved to discard phase - restart timer for discard phase
        startTurnTimer(io, room.id);
      }

      // Broadcast game update to all players in room
      await broadcastGameUpdate(io, room.id);
      callback?.({ success: true });
    } catch (error) {
      console.error('Error drawing card:', error);
      callback?.({ success: false, error: 'Failed to draw card' });
    }
  });

  // Discard a card
  socket.on('discard-card', async (data, callback) => {
    try {
      const { card } = data;
      if (!card) {
        return callback?.({ success: false, error: 'Card is required' });
      }

      const room = await roomManager.getPlayerRoom(socket.id);
      if (!room) {
        return callback?.({ success: false, error: 'Not in a room' });
      }

      // Clear turn timer since player is acting
      clearTurnTimer(room.id);

      const result = await gameStateManager.discardCard(room.id, socket.id, card);
      if (!result.success) {
        // Restart timer if action failed
        const gameState = await gameStateManager.getGameState(room.id);
        if (gameState && !gameState.isPaused && !gameState.winner) {
          startTurnTimer(io, room.id);
        }
        return callback?.({ success: false, error: result.error });
      }

      // Check if game ended (winner declared)
      if (result.gameState?.winner) {
        await gameHistory.saveGameHistory(room.id, result.gameState);
        clearTurnTimer(room.id);
      } else if (!result.gameState?.fightData) {
        // Turn changed - start timer for next player (unless fight occurred)
        startTurnTimer(io, room.id);
      } else {
        // Fight occurred - timer is already cleared, will restart after fight modal
        // Timer will be restarted when fight data is cleared (in next action)
      }

      // Broadcast game update to all players in room
      await broadcastGameUpdate(io, room.id);
      callback?.({ success: true });
    } catch (error) {
      console.error('Error discarding card:', error);
      callback?.({ success: false, error: 'Failed to discard card' });
    }
  });

  // Pick up the last discarded card
  socket.on('pick-up-discard', async (data, callback) => {
    try {
      const room = await roomManager.getPlayerRoom(socket.id);
      if (!room) {
        return callback?.({ success: false, error: 'Not in a room' });
      }

      // Clear turn timer since player is acting
      clearTurnTimer(room.id);

      const result = await gameStateManager.pickUpDiscard(room.id, socket.id);
      if (!result.success) {
        // Restart timer if action failed
        const gameState = await gameStateManager.getGameState(room.id);
        if (gameState && !gameState.isPaused && !gameState.winner) {
          startTurnTimer(io, room.id);
        }
        return callback?.({ success: false, error: result.error });
      }

      // Check if game ended (winner declared)
      if (result.gameState?.winner) {
        await gameHistory.saveGameHistory(room.id, result.gameState);
        clearTurnTimer(room.id);
      }

      // Broadcast game update to all players in room
      await broadcastGameUpdate(io, room.id);
      callback?.({ success: true });
    } catch (error) {
      console.error('Error picking up discard:', error);
      callback?.({ success: false, error: 'Failed to pick up discard' });
    }
  });

  // Declare win
  socket.on('declare-win', async (data, callback) => {
    try {
      const room = await roomManager.getPlayerRoom(socket.id);
      if (!room) {
        return callback?.({ success: false, error: 'Not in a room' });
      }

      const result = await gameStateManager.declareWin(room.id, socket.id);
      if (!result.success) {
        return callback?.({ success: false, error: result.error });
      }

      // Save game history when winner is declared
      if (result.gameState?.winner) {
        await gameHistory.saveGameHistory(room.id, result.gameState);
      }

      // Broadcast game update to all players in room
      await broadcastGameUpdate(io, room.id);
      callback?.({ success: true });
    } catch (error) {
      console.error('Error declaring win:', error);
      callback?.({ success: false, error: 'Failed to declare win' });
    }
  });

  // Restore game state (for reconnection)
  socket.on('restore-game-state', async (data, callback) => {
    try {
      const room = await roomManager.getPlayerRoom(socket.id);
      if (!room) {
        return callback?.({ success: false, error: 'Not in a room' });
      }

      if (room.status !== 'playing') {
        return callback?.({ success: false, error: 'Game is not in progress' });
      }

      const gameState = await gameStateManager.getGameStateForPlayer(room.id, socket.id);
      if (!gameState) {
        return callback?.({ success: false, error: 'Game state not found' });
      }

      callback?.({ success: true, gameState });
    } catch (error) {
      console.error('Error restoring game state:', error);
      callback?.({ success: false, error: 'Failed to restore game state' });
    }
  });

  // Restart game
  socket.on('restart-game', async (data, callback) => {
    try {
      const room = await roomManager.getPlayerRoom(socket.id);
      if (!room) {
        return callback?.({ success: false, error: 'Not in a room' });
      }

      // Check if game has ended (has a winner) - if so, allow restart
      const currentGameState = await gameStateManager.getGameState(room.id);
      const gameHasEnded = currentGameState && currentGameState.winner;

      if (room.status !== 'playing' && !gameHasEnded) {
        return callback?.({ success: false, error: 'Game is not in progress' });
      }

      // Filter out disconnected players (empty socket IDs)
      const connectedPlayers = room.players.filter(
        (p) => p.socketId && p.socketId !== ''
      );

      // Remove disconnected players from room (those with empty socket IDs)
      await roomManager.removeDisconnectedPlayers(room.id);

      if (connectedPlayers.length < room.minPlayers) {
        return callback?.({
          success: false,
          error: `Need at least ${room.minPlayers} players to restart`,
        });
      }

      // If game ended, update room status to waiting first
      if (gameHasEnded) {
        await roomManager.updateRoomStatus(room.id, 'waiting');
      }

      // Get updated room after removing disconnected players
      const updatedRoom = await roomManager.getRoom(room.id);
      if (!updatedRoom) {
        return callback?.({ success: false, error: 'Room not found' });
      }

      // Restart the game with only connected players
      const newGameState = await gameStateManager.restartGame(room.id, connectedPlayers);
      if (!newGameState) {
        return callback?.({ success: false, error: 'Failed to restart game' });
      }

      // Update room status to playing
      await roomManager.updateRoomStatus(room.id, 'playing');

      // Broadcast room update to reflect removed disconnected players
      const finalRoom = await roomManager.getRoom(room.id);
      if (finalRoom) {
        io.to(room.id).emit('room-update', { room: finalRoom });
      }

      // Broadcast game started to all connected players in room
      const gameStatesForPlayers = await Promise.all(
        connectedPlayers.map(async (player) => ({
          socketId: player.socketId,
          gameState: await gameStateManager.getGameStateForPlayer(room.id, player.socketId),
        }))
      );

      connectedPlayers.forEach((player) => {
        const playerGameState = gameStatesForPlayers.find(
          (gs) => gs.socketId === player.socketId,
        )?.gameState;
        io.to(player.socketId).emit('game-started', {
          gameState: playerGameState,
        });
      });

      callback?.({ success: true });
    } catch (error) {
      console.error('Error restarting game:', error);
      callback?.({ success: false, error: 'Failed to restart game' });
    }
  });

  // Continue game after disconnect (remove disconnected players and resume)
  socket.on('continue-game-after-disconnect', async (data, callback) => {
    try {
      const room = await roomManager.getPlayerRoom(socket.id);
      if (!room) {
        return callback?.({ success: false, error: 'Not in a room' });
      }

      const gameState = await gameStateManager.getGameState(room.id);
      if (!gameState || !gameState.isPaused) {
        return callback?.({ success: false, error: 'Game is not paused' });
      }

      // Verify this is the decision maker
      if (gameState.decisionMakerSocketId !== socket.id) {
        return callback?.({ success: false, error: 'Only the decision maker can continue the game' });
      }

      // Remove disconnected players
      const result = await gameStateManager.removeDisconnectedPlayers(
        room.id,
        gameState.disconnectedPlayers
      );

      if (!result.success) {
        return callback?.({ success: false, error: result.error });
      }

      // Check if we have enough players to continue (minimum 2)
      if (result.shouldEndGame || result.gameState.players.length < room.minPlayers) {
        // Not enough players - end game and return to lobby
        await gameStateManager.endGameAndReturnToLobby(room.id);

        // Remove disconnected players from room
        for (const playerName of gameState.disconnectedPlayers) {
          await roomManager.leaveRoom(room.id, '');
        }

        // Broadcast room update (back to lobby)
        const updatedRoom = await roomManager.getRoom(room.id);
        if (updatedRoom) {
          io.to(room.id).emit('room-update', { room: updatedRoom });
          io.to(room.id).emit('game-ended', { 
            message: 'Game ended: Not enough players to continue' 
          });
        }

        callback?.({ success: true });
        return;
      }

      // Resume the game
      await gameStateManager.resumeGame(room.id);

      // Remove disconnected players from room
      for (const playerName of gameState.disconnectedPlayers) {
        await roomManager.leaveRoom(room.id, '');
      }

      // Broadcast game resumed and update
      io.to(room.id).emit('game-resumed', {});
      await broadcastGameUpdate(io, room.id);

      // Restart turn timer after resume
      const resumedGameState = await gameStateManager.getGameState(room.id);
      if (resumedGameState && !resumedGameState.winner && !resumedGameState.isPaused) {
        startTurnTimer(io, room.id);
      }

      // Broadcast room update
      const updatedRoom = await roomManager.getRoom(room.id);
      if (updatedRoom) {
        io.to(room.id).emit('room-update', { room: updatedRoom });
      }

      callback?.({ success: true });
    } catch (error) {
      console.error('Error continuing game after disconnect:', error);
      callback?.({ success: false, error: 'Failed to continue game' });
    }
  });

  // End game after disconnect (return to lobby)
  socket.on('end-game-after-disconnect', async (data, callback) => {
    try {
      const room = await roomManager.getPlayerRoom(socket.id);
      if (!room) {
        return callback?.({ success: false, error: 'Not in a room' });
      }

      const gameState = await gameStateManager.getGameState(room.id);
      if (!gameState || !gameState.isPaused) {
        return callback?.({ success: false, error: 'Game is not paused' });
      }

      // Verify this is the decision maker
      if (gameState.decisionMakerSocketId !== socket.id) {
        return callback?.({ success: false, error: 'Only the decision maker can end the game' });
      }

      // End game and return to lobby
      const result = await gameStateManager.endGameAndReturnToLobby(room.id);

      if (!result.success) {
        return callback?.({ success: false, error: result.error });
      }

      // Remove disconnected players from room
      for (const playerName of gameState.disconnectedPlayers) {
        await roomManager.leaveRoom(room.id, '');
      }

      // Broadcast room update (back to lobby)
      const updatedRoom = await roomManager.getRoom(room.id);
      if (updatedRoom) {
        io.to(room.id).emit('room-update', { room: updatedRoom });
        io.to(room.id).emit('game-ended', { message: 'Game ended due to player disconnection' });
      }

      callback?.({ success: true });
    } catch (error) {
      console.error('Error ending game after disconnect:', error);
      callback?.({ success: false, error: 'Failed to end game' });
    }
  });
}

/**
 * Broadcast game update to all players in a room
 * @param {Server} io - Socket.IO server instance
 * @param {string} roomId - Room ID
 */
async function broadcastGameUpdate(io, roomId) {
  const room = await roomManager.getRoom(roomId);
  if (!room || !room.players) return;

  await Promise.all(
    room.players.map(async (player) => {
      const playerGameState = await gameStateManager.getGameStateForPlayer(roomId, player.socketId);
      if (playerGameState) {
        io.to(player.socketId).emit('game-update', {
          gameState: playerGameState,
        });
      }
    })
  );
}

// Export timer functions
export { clearTurnTimer, startTurnTimer };

export default setupGameHandlers;
