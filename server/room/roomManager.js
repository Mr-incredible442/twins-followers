// Room Manager
// Handles room creation, joining, leaving, and public lobby listing
// Uses MongoDB for persistence

import Room from '../models/Room.js';

// Generate a unique 6-character alphanumeric room ID
async function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let roomId = '';
  for (let i = 0; i < 6; i++) {
    roomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Ensure uniqueness by checking database
  const existing = await Room.findOne({ id: roomId });
  if (existing) {
    return generateRoomId();
  }
  return roomId;
}

/**
 * Convert MongoDB document to plain object
 * @param {Object} doc - Mongoose document
 * @returns {Object} Plain object
 */
function toPlainObject(doc) {
  if (!doc) return null;
  return doc.toObject ? doc.toObject() : doc;
}

/**
 * Create a new room
 * @param {string} name - Room display name
 * @param {boolean} isPrivate - Whether the room is private
 * @param {string} [password] - Password for private rooms
 * @returns {Promise<Object>} Created room object
 */
async function createRoom(name, isPrivate, password = null) {
  const roomId = await generateRoomId();
  
  const roomData = {
    id: roomId,
    name,
    password: isPrivate ? password : null,
    isPrivate,
    players: [],
    maxPlayers: 6,
    minPlayers: 2,
    createdAt: new Date(),
    status: 'waiting',
  };

  const room = new Room(roomData);
  await room.save();
  return toPlainObject(room);
}

/**
 * Get room by ID
 * @param {string} roomId - Room ID
 * @returns {Promise<Object|null>} Room object or null if not found
 */
async function getRoom(roomId) {
  const room = await Room.findOne({ id: roomId });
  return toPlainObject(room);
}

/**
 * Find which room a player (socket) is in
 * @param {string} socketId - Socket ID of the player
 * @returns {Promise<Object|null>} Room object or null if player not in any room
 */
async function getPlayerRoom(socketId) {
  const room = await Room.findOne({
    'players.socketId': socketId,
  });
  return toPlainObject(room);
}

/**
 * Find which room a player (by name) is in
 * Only returns room if player has a valid socket ID (not disconnected)
 * @param {string} playerName - Name of the player
 * @returns {Promise<Object|null>} Room object or null if player not in any room
 */
async function getPlayerRoomByName(playerName) {
  const room = await Room.findOne({
    'players.playerName': playerName,
    'players.socketId': { $ne: '', $exists: true }, // Only find if socket ID is not empty
  });
  return toPlainObject(room);
}

/**
 * Remove disconnected players (players with empty socket ID) from a room
 * @param {string} roomId - Room ID
 * @returns {Promise<{success: boolean, deleted?: boolean}>} Cleanup result
 */
async function removeDisconnectedPlayers(roomId) {
  const room = await getRoom(roomId);
  if (!room) {
    return { success: false };
  }

  // Remove players with empty socket ID
  const updatedRoom = await Room.findOneAndUpdate(
    { id: roomId },
    { $pull: { players: { socketId: '' } } },
    { new: true }
  );

  if (!updatedRoom) {
    return { success: false };
  }

  const wasDeleted = updatedRoom.players.length === 0;

  // Delete room if empty
  if (wasDeleted) {
    await Room.deleteOne({ id: roomId });
    return { success: true, deleted: true };
  }

  return { success: true, deleted: false };
}

/**
 * Update a player's socket ID in a room (for reconnection)
 * @param {string} roomId - Room ID
 * @param {string} playerName - Name of the player
 * @param {string} newSocketId - New socket ID (empty string to mark as disconnected)
 * @returns {Promise<{success: boolean, room?: Object, error?: string}>} Update result
 */
async function updatePlayerSocketId(roomId, playerName, newSocketId) {
  const room = await getRoom(roomId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  // Check if player exists in room
  const player = room.players.find((p) => p.playerName === playerName);
  if (!player) {
    return { success: false, error: 'Player not found in room' };
  }

  // If setting a new socket ID (not empty), check if it's already in use
  if (newSocketId && newSocketId !== '') {
    const existingRoom = await getPlayerRoom(newSocketId);
    if (existingRoom && existingRoom.id !== roomId) {
      return { success: false, error: 'Socket ID already in use in another room' };
    }
  }

  // Update the player's socket ID
  const updatedRoom = await Room.findOneAndUpdate(
    { 
      id: roomId,
      'players.playerName': playerName,
    },
    { 
      $set: { 'players.$.socketId': newSocketId },
    },
    { new: true }
  );

  return { success: true, room: toPlainObject(updatedRoom) };
}

/**
 * Validate if a player can join a room
 * @param {Object} room - Room object
 * @param {string} [password] - Password attempt
 * @param {string} [playerName] - Player name (for reconnection check)
 * @returns {{valid: boolean, error?: string}} Validation result
 */
function validateRoomJoin(room, password = null, playerName = null) {
  if (!room) {
    return { valid: false, error: 'Room not found' };
  }

  // Check if this is a reconnection (player already in room)
  const isReconnection = playerName && room.players.some((p) => p.playerName === playerName);

  // Allow reconnection even if game is playing
  if (room.status === 'playing' && !isReconnection) {
    return { valid: false, error: 'Room is already in play' };
  }

  // For new players, check if room is full
  if (!isReconnection && room.players.length >= room.maxPlayers) {
    return { valid: false, error: 'Room is full' };
  }

  if (room.isPrivate) {
    if (!password || room.password !== password) {
      return { valid: false, error: 'Invalid password' };
    }
  }

  return { valid: true };
}

/**
 * Join a room
 * @param {string} roomId - Room ID to join
 * @param {string} socketId - Socket ID of joining player
 * @param {string} playerName - Name of the player
 * @param {string} [password] - Password for private rooms
 * @returns {Promise<{success: boolean, room?: Object, error?: string}>} Join result
 */
async function joinRoom(roomId, socketId, playerName, password = null) {
  const room = await getRoom(roomId);
  
  const validation = validateRoomJoin(room, password, playerName);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Check if player with this name is already in this room (reconnection case)
  const existingPlayer = room.players.find((p) => p.playerName === playerName);
  if (existingPlayer) {
    // Player is reconnecting - update their socket ID
    return updatePlayerSocketId(roomId, playerName, socketId);
  }

  // Check if player is already in this room with this socket ID
  if (room.players.some((player) => player.socketId === socketId)) {
    return { success: false, error: 'Already in this room' };
  }

  // Check if player is in another room
  const currentRoom = await getPlayerRoom(socketId);
  if (currentRoom) {
    return { success: false, error: 'Already in another room' };
  }

  // Add new player to room
  const player = {
    socketId,
    playerName,
    joinedAt: new Date(),
  };

  const updatedRoom = await Room.findOneAndUpdate(
    { id: roomId },
    { $push: { players: player } },
    { new: true }
  );

  return { success: true, room: toPlainObject(updatedRoom) };
}

/**
 * Leave a room
 * @param {string} roomId - Room ID to leave
 * @param {string} socketId - Socket ID of leaving player
 * @returns {Promise<{success: boolean, room?: Object, deleted?: boolean, error?: string}>} Leave result
 */
async function leaveRoom(roomId, socketId) {
  const room = await getRoom(roomId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  // Remove player from room
  const updatedRoom = await Room.findOneAndUpdate(
    { id: roomId },
    { $pull: { players: { socketId } } },
    { new: true }
  );

  if (!updatedRoom) {
    return { success: false, error: 'Failed to update room' };
  }

  const wasDeleted = updatedRoom.players.length === 0;

  // Delete room if empty
  if (wasDeleted) {
    await Room.deleteOne({ id: roomId });
    return { success: true, deleted: true };
  }

  return { success: true, room: toPlainObject(updatedRoom), deleted: false };
}

/**
 * Get all public lobbies that are not full
 * @returns {Promise<Array>} Array of public room objects (without sensitive data)
 */
async function getPublicLobbies() {
  const rooms = await Room.find({
    isPrivate: false,
    status: 'waiting',
  });

  const publicRooms = [];
  
  for (const room of rooms) {
    const roomObj = toPlainObject(room);
    // Only include rooms that are not full
    if (roomObj.players.length < roomObj.maxPlayers) {
      // Return room info without password
      publicRooms.push({
        id: roomObj.id,
        name: roomObj.name,
        isPrivate: roomObj.isPrivate,
        playerCount: roomObj.players.length,
        maxPlayers: roomObj.maxPlayers,
        minPlayers: roomObj.minPlayers,
        createdAt: roomObj.createdAt,
        status: roomObj.status,
      });
    }
  }

  return publicRooms;
}

/**
 * Remove player from any room they're in (used for disconnect cleanup)
 * @param {string} socketId - Socket ID of disconnected player
 * @returns {Promise<{success: boolean, roomId?: string, deleted?: boolean}>} Cleanup result
 */
async function removePlayer(socketId) {
  const room = await getPlayerRoom(socketId);
  if (!room) {
    return { success: false };
  }

  return leaveRoom(room.id, socketId);
}

/**
 * Update room status
 * @param {string} roomId - Room ID
 * @param {string} status - New status ('waiting' or 'playing')
 */
async function updateRoomStatus(roomId, status) {
  await Room.findOneAndUpdate(
    { id: roomId },
    { status },
  );
}

/**
 * Get the decision maker for a room (first player in join order, or next connected player if first is disconnected)
 * @param {string} roomId - Room ID
 * @returns {Promise<{socketId: string, playerName: string}|null>} Decision maker info or null
 */
async function getDecisionMaker(roomId) {
  const room = await getRoom(roomId);
  if (!room || !room.players || room.players.length === 0) {
    return null;
  }

  // First player in join order (original creator)
  const firstPlayer = room.players[0];
  
  // If first player has a valid socket ID, they're the decision maker
  if (firstPlayer.socketId && firstPlayer.socketId !== '') {
    return {
      socketId: firstPlayer.socketId,
      playerName: firstPlayer.playerName,
    };
  }

  // Otherwise, find the next connected player
  for (const player of room.players) {
    if (player.socketId && player.socketId !== '') {
      return {
        socketId: player.socketId,
        playerName: player.playerName,
      };
    }
  }

  // No connected players
  return null;
}

export default {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  getPublicLobbies,
  getPlayerRoom,
  getPlayerRoomByName,
  updatePlayerSocketId,
  removeDisconnectedPlayers,
  validateRoomJoin,
  removePlayer,
  updateRoomStatus,
  getDecisionMaker,
};
