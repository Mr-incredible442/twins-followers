// Room Manager
// Handles room creation, joining, leaving, and public lobby listing
// Uses MongoDB for persistence

import Room from '../models/Room.js';

// Generate a unique 6-character alphanumeric room ID
// @param {number} retries - Number of retries remaining (default: 10)
async function generateRoomId(retries = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let roomId = '';
  for (let i = 0; i < 6; i++) {
    roomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Ensure uniqueness by checking database
  // Use lean() and select only id field for faster query
  const existing = await Room.findOne({ id: roomId }).lean().select('id');
  if (existing) {
    if (retries <= 0) {
      throw new Error(
        'Failed to generate unique room ID after multiple attempts',
      );
    }
    return generateRoomId(retries - 1);
  }
  return roomId;
}

// Generate a random room name
function generateRoomName() {
  const adjectives = [
    'Swift',
    'Bold',
    'Quick',
    'Brave',
    'Clever',
    'Mighty',
    'Epic',
    'Legendary',
    'Fierce',
    'Noble',
    'Wild',
    'Savage',
    'Royal',
    'Ancient',
    'Mystic',
    'Golden',
    'Silver',
    'Crimson',
    'Shadow',
    'Thunder',
    'Storm',
    'Fire',
    'Ice',
    'Dragon',
    'Phoenix',
    'Titan',
    'Warrior',
    'Elite',
    'Supreme',
    'Ultimate',
    'Divine',
    'Cosmic',
    'Stellar',
    'Galactic',
    'Nova',
    'Vortex',
    'Blade',
    'Fury',
    'Rage',
    'Valor',
    'Honor',
    'Glory',
    'Victory',
    'Champion',
    'Master',
    'Grand',
    'Prime',
    'Alpha',
    'Omega',
    'Zenith',
    'Apex',
    'Peak',
    'Summit',
    'Crown',
    'Reign',
    'Empire',
  ];
  const nouns = [
    'Room',
    'Match',
    'Arena',
    'Battle',
    'Challenge',
    'Quest',
    'Game',
    'Lobby',
    'Hall',
    'Court',
    'Field',
    'Ring',
    'Pit',
    'Colosseum',
    'Stadium',
    'Theater',
    'Duel',
    'Clash',
    'War',
    'Fight',
    'Showdown',
    'Tournament',
    'Championship',
    'League',
    'Trial',
    'Test',
    'Proving',
    'Grounds',
    'Domain',
    'Realm',
    'Kingdom',
    'Empire',
    'Fortress',
    'Castle',
    'Tower',
    'Sanctuary',
    'Temple',
    'Shrine',
    'Altar',
    'Throne',
    'Crown',
    'Scepter',
    'Blade',
    'Shield',
    'Banner',
    'Standard',
    'Flag',
    'Emblem',
    'Legacy',
    'Legend',
    'Saga',
    'Tale',
    'Story',
    'Chronicle',
    'History',
    'Destiny',
    'Fate',
    'Fortune',
    'Glory',
    'Honor',
    'Valor',
    'Courage',
    'Strength',
    'Power',
  ];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 99) + 1;
  return `${adjective} ${noun} ${number}`;
}

/**
 * Convert MongoDB document to plain object
 * @param {Object} doc - Mongoose document
 * @returns {Object} Plain object
 * @deprecated Most queries now use .lean() which returns plain objects directly
 */
function toPlainObject(doc) {
  if (!doc) return null;
  return doc.toObject ? doc.toObject() : doc;
}

/**
 * Create a new room
 * @param {string} [name] - Room display name (optional, will generate if not provided)
 * @param {boolean} isPrivate - Whether the room is private
 * @param {string} [password] - Password for private rooms
 * @returns {Promise<Object>} Created room object
 */
async function createRoom(name = null, isPrivate, password = null) {
  const roomId = await generateRoomId();
  // Generate a random name if none provided
  const roomName = name || generateRoomName();

  const roomData = {
    id: roomId,
    name: roomName,
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
  return room.toObject();
}

/**
 * Get room by ID
 * @param {string} roomId - Room ID
 * @returns {Promise<Object|null>} Room object or null if not found
 */
async function getRoom(roomId) {
  const room = await Room.findOne({ id: roomId }).lean();
  return room;
}

/**
 * Find which room a player (socket) is in
 * @param {string} socketId - Socket ID of the player
 * @returns {Promise<Object|null>} Room object or null if player not in any room
 */
async function getPlayerRoom(socketId) {
  const room = await Room.findOne({
    'players.socketId': socketId,
  }).lean();
  return room;
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
  }).lean();
  return room;
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
    { new: true, lean: true },
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
 * Optimized version that accepts room to avoid redundant queries
 * @param {string} roomId - Room ID
 * @param {string} playerName - Name of the player
 * @param {string} newSocketId - New socket ID (empty string to mark as disconnected)
 * @param {Object} [existingRoom] - Optional: room object if already fetched
 * @returns {Promise<{success: boolean, room?: Object, error?: string}>} Update result
 */
async function updatePlayerSocketId(
  roomId,
  playerName,
  newSocketId,
  existingRoom = null,
) {
  // Use provided room if available, otherwise fetch it
  let room = existingRoom;
  if (!room) {
    room = await getRoom(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }
  }

  // Check if player exists in room
  const player = room.players.find((p) => p.playerName === playerName);
  if (!player) {
    return { success: false, error: 'Player not found in room' };
  }

  // If setting a new socket ID (not empty), check if it's already in use
  // Only check if socketId is being changed
  if (newSocketId && newSocketId !== '' && player.socketId !== newSocketId) {
    const existingRoomWithSocket = await Room.findOne({
      'players.socketId': newSocketId,
      id: { $ne: roomId }, // Different room
    })
      .lean()
      .select('id');

    if (existingRoomWithSocket) {
      return {
        success: false,
        error: 'Socket ID already in use in another room',
      };
    }
  }

  // Update the player's socket ID atomically
  const updatedRoom = await Room.findOneAndUpdate(
    {
      id: roomId,
      'players.playerName': playerName,
    },
    {
      $set: { 'players.$.socketId': newSocketId },
    },
    { new: true, lean: true },
  );

  return { success: true, room: updatedRoom };
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
  const isReconnection =
    playerName && room.players.some((p) => p.playerName === playerName);

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
 * Optimized to reduce sequential database queries
 * @param {string} roomId - Room ID to join
 * @param {string} socketId - Socket ID of joining player
 * @param {string} playerName - Name of the player
 * @param {string} [password] - Password for private rooms
 * @returns {Promise<{success: boolean, room?: Object, error?: string}>} Join result
 */
async function joinRoom(roomId, socketId, playerName, password = null) {
  // Parallel queries: get room and check if player is in another room
  const [room, currentRoom] = await Promise.all([
    Room.findOne({ id: roomId }).lean(),
    Room.findOne({ 'players.socketId': socketId }).lean().select('id'),
  ]);

  const validation = validateRoomJoin(room, password, playerName);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Check if player is in another room (from parallel query)
  if (currentRoom && currentRoom.id !== roomId) {
    return { success: false, error: 'Already in another room' };
  }

  // Check if player is already in this room with this socket ID
  // (We already checked it's not in another room, so if currentRoom exists and id matches, they're already here)
  if (currentRoom && currentRoom.id === roomId) {
    // Double-check by looking in the room data we have
    if (room.players.some((player) => player.socketId === socketId)) {
      return { success: false, error: 'Already in this room' };
    }
  }

  // Check if player with this name is already in this room (reconnection case)
  const existingPlayer = room.players.find((p) => p.playerName === playerName);
  if (existingPlayer) {
    // Player is reconnecting - update their socket ID atomically
    // We already verified socket isn't in another room, so safe to update
    const updatedRoom = await Room.findOneAndUpdate(
      {
        id: roomId,
        'players.playerName': playerName,
      },
      {
        $set: { 'players.$.socketId': socketId },
      },
      { new: true, lean: true },
    );

    if (!updatedRoom) {
      return { success: false, error: 'Failed to update socket ID' };
    }

    return { success: true, room: updatedRoom };
  }

  // Add new player to room using findOneAndUpdate with validation
  // This ensures room still exists and isn't full
  const updatedRoom = await Room.findOneAndUpdate(
    {
      id: roomId,
      $expr: { $lt: [{ $size: '$players' }, '$maxPlayers'] }, // Room not full
    },
    {
      $push: {
        players: {
          socketId,
          playerName,
          joinedAt: new Date(),
        },
      },
    },
    { new: true, lean: true },
  );

  if (!updatedRoom) {
    return { success: false, error: 'Room not found or is full' };
  }

  return { success: true, room: updatedRoom };
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
    { new: true, lean: true },
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
 * Uses MongoDB aggregation to filter in database for better performance
 * @returns {Promise<Array>} Array of public room objects (without sensitive data)
 */
async function getPublicLobbies() {
  const rooms = await Room.aggregate([
    // Match public, waiting rooms
    {
      $match: {
        isPrivate: false,
        status: 'waiting',
      },
    },
    // Add field for player count
    {
      $addFields: {
        playerCount: { $size: '$players' },
      },
    },
    // Filter out full rooms (done in database, not JavaScript)
    {
      $match: {
        $expr: { $lt: ['$playerCount', '$maxPlayers'] },
      },
    },
    // Project only needed fields (excludes password and full player objects)
    {
      $project: {
        id: 1,
        name: 1,
        isPrivate: 1,
        playerCount: 1,
        maxPlayers: 1,
        minPlayers: 1,
        createdAt: 1,
        status: 1,
      },
    },
  ]);

  return rooms;
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
  await Room.findOneAndUpdate({ id: roomId }, { status }, { lean: true });
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
