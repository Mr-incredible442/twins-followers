// GameHistory Model
// Mongoose model for completed game history

import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema(
  {
    value: {
      type: String,
      required: true,
    },
    suit: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const playerHistorySchema = new mongoose.Schema(
  {
    socketId: {
      type: String,
      required: true,
    },
    playerName: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const winnerHistorySchema = new mongoose.Schema(
  {
    socketId: {
      type: String,
      required: true,
    },
    playerName: {
      type: String,
      required: true,
    },
    winningHand: {
      twins: {
        type: [cardSchema],
        required: true,
      },
      followers: {
        type: [cardSchema],
        required: true,
      },
    },
  },
  { _id: false },
);

const gameHistorySchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
    },
    roomName: {
      type: String,
      required: true,
    },
    players: {
      type: [playerHistorySchema],
      required: true,
    },
    winner: {
      type: winnerHistorySchema,
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    endedAt: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // Duration in milliseconds
      required: true,
    },
    totalTurns: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for faster queries
gameHistorySchema.index({ roomId: 1 });
gameHistorySchema.index({ 'winner.socketId': 1 });
gameHistorySchema.index({ endedAt: -1 });
gameHistorySchema.index({ 'winner.playerName': 1 });

const GameHistory = mongoose.model('GameHistory', gameHistorySchema);

export default GameHistory;
