// Game History Manager
// Handles saving completed games to history

import GameHistory from '../models/GameHistory.js';
import GameState from '../models/GameState.js';
import Room from '../models/Room.js';

/**
 * Save a completed game to history
 * @param {string} roomId - Room ID
 * @param {Object} gameState - Final game state with winner
 * @returns {Promise<Object>} Saved game history
 */
async function saveGameHistory(roomId, gameState) {
  try {
    // Get room info
    const room = await Room.findOne({ id: roomId });
    if (!room) {
      console.error(`Room ${roomId} not found when saving game history`);
      return null;
    }

    // Calculate duration
    const startedAt = gameState.createdAt || new Date();
    const endedAt = new Date();
    const duration = endedAt - startedAt;

    // Extract player info (without hands)
    const players = gameState.players.map((player) => ({
      socketId: player.socketId,
      playerName: player.playerName,
    }));

    // Create game history entry
    const historyData = {
      roomId,
      roomName: room.name,
      players,
      winner: gameState.winner,
      startedAt,
      endedAt,
      duration,
      totalTurns: 0, // Could be calculated if we track turns
    };

    const history = new GameHistory(historyData);
    await history.save();

    return history;
  } catch (error) {
    console.error('Error saving game history:', error);
    return null;
  }
}

/**
 * Get game history for a specific room
 * @param {string} roomId - Room ID
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} Array of game history records
 */
async function getRoomHistory(roomId, limit = 10) {
  try {
    const history = await GameHistory.find({ roomId })
      .sort({ endedAt: -1 })
      .limit(limit)
      .lean();
    return history;
  } catch (error) {
    console.error('Error getting room history:', error);
    return [];
  }
}

/**
 * Get game history for a specific player
 * @param {string} socketId - Socket ID of the player
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} Array of game history records
 */
async function getPlayerHistory(socketId, limit = 10) {
  try {
    const history = await GameHistory.find({
      $or: [{ 'players.socketId': socketId }, { 'winner.socketId': socketId }],
    })
      .sort({ endedAt: -1 })
      .limit(limit)
      .lean();
    return history;
  } catch (error) {
    console.error('Error getting player history:', error);
    return [];
  }
}

/**
 * Get statistics for a player
 * @param {string} socketId - Socket ID of the player
 * @returns {Promise<Object>} Player statistics
 */
async function getPlayerStats(socketId) {
  try {
    const totalGames = await GameHistory.countDocuments({
      'players.socketId': socketId,
    });
    const wins = await GameHistory.countDocuments({
      'winner.socketId': socketId,
    });
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

    return {
      totalGames,
      wins,
      losses: totalGames - wins,
      winRate: winRate.toFixed(2),
    };
  } catch (error) {
    console.error('Error getting player stats:', error);
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      winRate: '0.00',
    };
  }
}

export default {
  saveGameHistory,
  getRoomHistory,
  getPlayerHistory,
  getPlayerStats,
};
