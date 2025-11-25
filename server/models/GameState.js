// GameState Model
// Mongoose model for active game states

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

const playerGameSchema = new mongoose.Schema(
  {
    socketId: {
      type: String,
      required: true,
    },
    playerName: {
      type: String,
      required: true,
    },
    hand: {
      type: [cardSchema],
      default: [],
    },
  },
  { _id: false },
);

const winnerSchema = new mongoose.Schema(
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

const gameStateSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    players: {
      type: [playerGameSchema],
      required: true,
    },
    deck: {
      type: [cardSchema],
      required: true,
    },
    currentPlayerSocketId: {
      type: String,
      required: true,
    },
    currentPlayerIndex: {
      type: Number,
      required: true,
    },
    phase: {
      type: String,
      enum: ['draw', 'discard', 'ended'],
      default: 'draw',
      required: false,
    },
    lastDiscard: {
      type: cardSchema,
      default: null,
    },
    discardPile: {
      type: [cardSchema],
      default: [],
    },
    message: {
      type: String,
      default: null,
    },
    winner: {
      type: winnerSchema,
      default: null,
    },
    fightInProgress: {
      type: Boolean,
      default: false,
    },
    fightData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isPaused: {
      type: Boolean,
      default: false,
    },
    pausedReason: {
      type: String,
      default: null,
    },
    disconnectedPlayers: {
      type: [String],
      default: [],
    },
    pauseStartTime: {
      type: Date,
      default: null,
    },
    decisionMakerSocketId: {
      type: String,
      default: null,
    },
    turnStartTime: {
      type: Date,
      default: null,
    },
    turnTimeLimit: {
      type: Number,
      default: 30, // 30 seconds
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // We're managing createdAt/updatedAt manually
  },
);

// Index for faster queries
// Note: roomId field already has unique: true which creates an index automatically

// Update updatedAt before saving
gameStateSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const GameState = mongoose.model('GameState', gameStateSchema);

export default GameState;
