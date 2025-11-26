// Socket Handlers for Room Operations
import roomManager from '../room/roomManager.js';
import gameStateManager from '../game/gameState.js';
import Room from '../models/Room.js';
import { clearTurnTimer, startTurnTimer } from './gameHandlers.js';

// Track disconnect timers and last disconnect times per room
const disconnectTimers = new Map(); // key: roomId, value: { timer, lastDisconnectTime, disconnectedPlayers }

/**
 * Setup room-related socket event handlers
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Server} io - Socket.IO server instance
 */
function setupRoomHandlers(socket, io) {
  // Create a new room
  socket.on('create-room', async (data, callback) => {
    try {
      const { name, isPrivate, password, playerName } = data;

      // Name is optional - will be auto-generated if not provided
      if (name && typeof name !== 'string') {
        return callback?.({ success: false, error: 'Room name must be a string' });
      }

      if (!playerName || typeof playerName !== 'string') {
        return callback?.({
          success: false,
          error: 'Player name is required',
        });
      }

      if (isPrivate && !password) {
        return callback?.({
          success: false,
          error: 'Password is required for private rooms',
        });
      }

      // Create the room (name is optional, will be auto-generated)
      const room = await roomManager.createRoom(
        name || null,
        Boolean(isPrivate),
        password || null,
      );

      // Join the room as the creator
      // If room is private, pass the password so creator can join their own room
      const joinResult = await roomManager.joinRoom(
        room.id,
        socket.id,
        playerName,
        isPrivate ? password : null,
      );

      if (!joinResult.success) {
        // Clean up room if join failed
        await roomManager.leaveRoom(room.id, socket.id);
        return callback?.({ success: false, error: joinResult.error });
      }

      // Join Socket.IO room
      socket.join(room.id);

      // Send confirmation to creator
      callback?.({ success: true, room: joinResult.room });

      // Broadcast room update to all players in the room
      io.to(room.id).emit('room-update', { room: joinResult.room });
    } catch (error) {
      console.error('Error creating room:', error);
      callback?.({ success: false, error: 'Failed to create room' });
    }
  });

  // Join an existing room
  socket.on('join-room', async (data, callback) => {
    try {
      const { roomId, password, playerName } = data;

      if (!roomId || typeof roomId !== 'string') {
        return callback?.({ success: false, error: 'Room ID is required' });
      }

      if (!playerName || typeof playerName !== 'string') {
        return callback?.({
          success: false,
          error: 'Player name is required',
        });
      }

      // Join the room
      const result = await roomManager.joinRoom(
        roomId,
        socket.id,
        playerName,
        password || null,
      );

      if (!result.success) {
        return callback?.({ success: false, error: result.error });
      }

      // Join Socket.IO room
      socket.join(roomId);

      // Send confirmation to joining player
      callback?.({ success: true, room: result.room });

      // Broadcast room update to all players in the room
      io.to(roomId).emit('room-update', { room: result.room });
    } catch (error) {
      console.error('Error joining room:', error);
      callback?.({ success: false, error: 'Failed to join room' });
    }
  });

  // Leave current room
  socket.on('leave-room', async (data, callback) => {
    try {
      const currentRoom = await roomManager.getPlayerRoom(socket.id);

      if (!currentRoom) {
        // Player might have disconnected and reconnected, or room state is out of sync
        // Try to leave all Socket.IO rooms this socket might be in
        const rooms = Array.from(socket.rooms);
        rooms.forEach((roomId) => {
          if (roomId !== socket.id) {
            // Leave all rooms except the socket's own room
            socket.leave(roomId);
          }
        });

        // Emit room-left event anyway to clear client state
        socket.emit('room-left', {});

        // Still allow the client to clear its state
        if (callback && typeof callback === 'function') {
          callback({
            success: true,
            message: 'Not in any room, but cleaned up connections',
          });
        }
        return;
      }

      const roomId = currentRoom.id;
      const result = await roomManager.leaveRoom(roomId, socket.id);

      if (!result.success) {
        // Even if leaveRoom failed, try to clean up Socket.IO room
        socket.leave(roomId);
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: result.error });
        }
        return;
      }

      // Leave Socket.IO room
      socket.leave(roomId);

      // Emit room-left event to the leaving player
      socket.emit('room-left', {});

      // Send confirmation to leaving player
      if (callback && typeof callback === 'function') {
        callback({ success: true });
      }

      // If room still exists, update status and broadcast to remaining players
      if (!result.deleted) {
        const updatedRoom = await roomManager.getRoom(roomId);
        if (updatedRoom) {
          // Reset room status to waiting if game was in progress
          if (updatedRoom.status === 'playing') {
            await roomManager.updateRoomStatus(roomId, 'waiting');
            updatedRoom.status = 'waiting';
            // Also delete the game state since game is ended
            await gameStateManager.deleteGameState(roomId);
          }
          io.to(roomId).emit('room-update', { room: updatedRoom });
        }
      } else {
        // If room was deleted, also delete game state
        await gameStateManager.deleteGameState(roomId);
      }
    } catch (error) {
      console.error('Error leaving room:', error);
      if (callback && typeof callback === 'function') {
        callback({ success: false, error: 'Failed to leave room' });
      }
    }
  });

  // Get list of public lobbies
  socket.on('get-public-lobbies', async (data, callback) => {
    try {
      const lobbies = await roomManager.getPublicLobbies();
      if (callback && typeof callback === 'function') {
        callback({ success: true, lobbies });
      }

      // Also emit as event (for real-time updates if needed)
      socket.emit('lobbies-list', { lobbies });
    } catch (error) {
      console.error('Error getting public lobbies:', error);
      if (callback && typeof callback === 'function') {
        callback({ success: false, error: 'Failed to get lobbies' });
      }
    }
  });

  // Restore state after reconnection (refresh)
  socket.on('restore-state', async (data, callback) => {
    try {
      const { playerName } = data;

      if (!playerName || typeof playerName !== 'string') {
        return callback?.({ success: false, error: 'Player name is required' });
      }

      // Find room by player name (including disconnected players with empty socket ID)
      const room = await Room.findOne({
        'players.playerName': playerName,
      }).lean();
      
      if (!room) {
        // Player not in any room
        return callback?.({ success: false, error: 'Not in any room' });
      }

      // Room is already a plain object when using lean()
      const roomObj = room;

      // Update player's socket ID in room
      // Pass existing room to avoid re-fetching
      const updateResult = await roomManager.updatePlayerSocketId(
        roomObj.id,
        playerName,
        socket.id,
        roomObj // Pass room to avoid redundant query
      );

      if (!updateResult.success) {
        return callback?.({ success: false, error: updateResult.error });
      }

      // Update player's socket ID in game state if game is in progress
      if (roomObj.status === 'playing') {
        await gameStateManager.updatePlayerSocketId(roomObj.id, playerName, socket.id);
        
        // Check if game is paused and this player was disconnected
        const gameState = await gameStateManager.getGameState(roomObj.id);
        if (gameState && gameState.isPaused) {
          // Check if this player was in disconnectedPlayers
          if (gameState.disconnectedPlayers.includes(playerName)) {
            // Remove from disconnected players
            gameState.disconnectedPlayers = gameState.disconnectedPlayers.filter(
              (name) => name !== playerName
            );

            // If no more disconnected players, auto-resume
            if (gameState.disconnectedPlayers.length === 0) {
              await gameStateManager.resumeGame(roomObj.id);
              io.to(roomObj.id).emit('game-resumed', {});
              io.to(roomObj.id).emit('player-reconnected', { playerName });
              // Restart turn timer after resume
              const resumedGameState = await gameStateManager.getGameState(roomObj.id);
              if (resumedGameState && !resumedGameState.winner && !resumedGameState.isPaused) {
                startTurnTimer(io, roomObj.id);
              }
            } else {
              // Update pause reason
              gameState.pausedReason = `Player${gameState.disconnectedPlayers.length > 1 ? 's' : ''} disconnected: ${gameState.disconnectedPlayers.join(', ')}`;
              await gameStateManager.saveGameState(gameState);
              
              // Emit updated game-paused event
              io.to(roomObj.id).emit('game-paused', {
                reason: gameState.pausedReason,
                disconnectedPlayers: gameState.disconnectedPlayers,
              });
            }

            // Cancel disconnect timer if all players reconnected
            const roomTimerData = disconnectTimers.get(roomObj.id);
            if (roomTimerData && gameState.disconnectedPlayers.length === 0) {
              if (roomTimerData.timer) {
                clearTimeout(roomTimerData.timer);
              }
              disconnectTimers.delete(roomObj.id);
            }
          }
        }
      } else {
        // Lobby - cancel disconnect timer
        const timeoutKey = `${roomObj.id}-${playerName}`;
        const existingTimer = disconnectTimers.get(timeoutKey);
        if (existingTimer?.timer) {
          clearTimeout(existingTimer.timer);
          disconnectTimers.delete(timeoutKey);
        }
      }

      // Join Socket.IO room
      socket.join(roomObj.id);

      // Get game state if game is in progress
      let gameState = null;
      if (roomObj.status === 'playing') {
        gameState = await gameStateManager.getGameStateForPlayer(roomObj.id, socket.id);
      }

      // Send restored state
      callback?.({
        success: true,
        room: updateResult.room,
        gameState,
      });

      // Broadcast room update to all players in the room
      io.to(roomObj.id).emit('room-update', { room: updateResult.room });

      // If game is in progress, send game state to reconnected player
      if (gameState) {
        socket.emit('game-started', { gameState });
      }

      // Notify other players of reconnection if game was paused
      if (roomObj.status === 'playing') {
        const currentGameState = await gameStateManager.getGameState(roomObj.id);
        if (currentGameState && currentGameState.isPaused && 
            currentGameState.disconnectedPlayers.includes(playerName)) {
          io.to(roomObj.id).emit('player-reconnected', { playerName });
        }
      }
    } catch (error) {
      console.error('Error restoring state:', error);
      callback?.({ success: false, error: 'Failed to restore state' });
    }
  });

  // Handle disconnect - mark player as disconnected but keep in room for reconnection
  socket.on('disconnect', async () => {
    try {
      const currentRoom = await roomManager.getPlayerRoom(socket.id);

      if (currentRoom) {
        const roomId = currentRoom.id;
        const player = currentRoom.players.find((p) => p.socketId === socket.id);
        const playerName = player?.playerName;

        if (!playerName) {
          return;
        }

        // Mark player as disconnected
        // Pass currentRoom to avoid re-fetching
        const result = await roomManager.updatePlayerSocketId(
          roomId,
          playerName,
          '', // Set to empty string to mark as disconnected
          currentRoom // Pass room to avoid redundant query
        );

        if (!result.success) {
          return;
        }

        const now = Date.now();
        const roomTimerData = disconnectTimers.get(roomId);

        // Check if game has ended (has a winner)
        const gameState = await gameStateManager.getGameState(roomId);
        const gameHasEnded = gameState && gameState.winner;

        // If game is in progress (not ended), pause the game
        if (currentRoom.status === 'playing' && !gameHasEnded) {
          // Check if this is a new disconnect or within 10 seconds of last disconnect
          if (roomTimerData && now - roomTimerData.lastDisconnectTime < 10000) {
            // Within 10 seconds - add to existing disconnected players and extend timer
            roomTimerData.disconnectedPlayers.push(playerName);
            roomTimerData.lastDisconnectTime = now;

            // Clear existing timer
            if (roomTimerData.timer) {
              clearTimeout(roomTimerData.timer);
            }

            // Update game state with new disconnected players
            const currentGameState = await gameStateManager.getGameState(roomId);
            if (currentGameState && !currentGameState.isPaused) {
              // Pause game if not already paused
              await gameStateManager.pauseGame(
                roomId,
                `Player${roomTimerData.disconnectedPlayers.length > 1 ? 's' : ''} disconnected: ${roomTimerData.disconnectedPlayers.join(', ')}`,
                roomTimerData.disconnectedPlayers
              );

              // Emit game-paused event
              io.to(roomId).emit('game-paused', {
                reason: `Player${roomTimerData.disconnectedPlayers.length > 1 ? 's' : ''} disconnected: ${roomTimerData.disconnectedPlayers.join(', ')}`,
                disconnectedPlayers: roomTimerData.disconnectedPlayers,
              });
            } else if (currentGameState && currentGameState.isPaused) {
              // Update existing pause - call pauseGame again to update
              await gameStateManager.pauseGame(
                roomId,
                `Player${roomTimerData.disconnectedPlayers.length > 1 ? 's' : ''} disconnected: ${roomTimerData.disconnectedPlayers.join(', ')}`,
                roomTimerData.disconnectedPlayers
              );
              // Clear turn timer when pausing
              clearTurnTimer(roomId);

              // Emit updated game-paused event
              io.to(roomId).emit('game-paused', {
                reason: `Player${roomTimerData.disconnectedPlayers.length > 1 ? 's' : ''} disconnected: ${roomTimerData.disconnectedPlayers.join(', ')}`,
                disconnectedPlayers: roomTimerData.disconnectedPlayers,
              });
            }

            // Set new 20-second timer
            roomTimerData.timer = setTimeout(async () => {
              // Timeout expired - show decision prompt
              const currentGameState = await gameStateManager.getGameState(roomId);
              if (currentGameState && currentGameState.isPaused) {
                // Emit decision-required event to decision maker
                io.to(currentGameState.decisionMakerSocketId).emit('decision-required', {
                  disconnectedPlayers: roomTimerData.disconnectedPlayers,
                });
              }
              disconnectTimers.delete(roomId);
            }, 20000);
          } else {
            // New disconnect or more than 10 seconds since last
            const disconnectedPlayers = [playerName];

            // Clear existing timer if any
            if (roomTimerData?.timer) {
              clearTimeout(roomTimerData.timer);
            }

            // Pause the game
            const pauseResult = await gameStateManager.pauseGame(
              roomId,
              `Player disconnected: ${playerName}`,
              disconnectedPlayers
            );

            // Clear turn timer when pausing
            clearTurnTimer(roomId);

            if (pauseResult.success) {
              // Emit game-paused event
              io.to(roomId).emit('game-paused', {
                reason: `Player disconnected: ${playerName}`,
                disconnectedPlayers,
              });

              // Set 20-second timer
              const timer = setTimeout(async () => {
                // Timeout expired - show decision prompt
                const currentGameState = await gameStateManager.getGameState(roomId);
                if (currentGameState && currentGameState.isPaused) {
                  // Emit decision-required event to decision maker
                  io.to(currentGameState.decisionMakerSocketId).emit('decision-required', {
                    disconnectedPlayers,
                  });
                }
                disconnectTimers.delete(roomId);
              }, 20000);

              disconnectTimers.set(roomId, {
                timer,
                lastDisconnectTime: now,
                disconnectedPlayers,
              });
            }
          }
        } else {
          // Lobby - set 10-second timeout to remove player
          const timeoutKey = `${roomId}-${playerName}`;
          
          // Clear existing timeout if any
          const existingTimer = disconnectTimers.get(timeoutKey);
          if (existingTimer?.timer) {
            clearTimeout(existingTimer.timer);
          }

          const timer = setTimeout(async () => {
            // Check if player still has empty socket ID (didn't reconnect)
            const room = await roomManager.getRoom(roomId);
            if (room) {
              const stillDisconnected = room.players.find(
                (p) => p.playerName === playerName && p.socketId === ''
              );
              
              if (stillDisconnected) {
                // Remove disconnected player
                await roomManager.leaveRoom(roomId, '');
                
                const updatedRoom = await roomManager.getRoom(roomId);
                if (updatedRoom) {
                  io.to(roomId).emit('room-update', { 
                    room: updatedRoom,
                    message: `${playerName} left the room.`
                  });
                } else {
                  // Room was deleted (empty)
                  io.to(roomId).emit('room-deleted', {});
                }
              }
            }
            disconnectTimers.delete(timeoutKey);
          }, 10000); // 10 second grace period

          disconnectTimers.set(timeoutKey, { timer, lastDisconnectTime: now });
        }

        // Broadcast room update
        const updatedRoom = await roomManager.getRoom(roomId);
        if (updatedRoom) {
          io.to(roomId).emit('room-update', { room: updatedRoom });
        }
      }
    } catch (error) {
      console.error('Error during disconnect cleanup:', error);
    }
  });
}

export default setupRoomHandlers;
