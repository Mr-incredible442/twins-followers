// Room Model
// Mongoose model for game rooms

import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
  {
    socketId: {
      type: String,
      required: true,
    },
    playerName: {
      type: String,
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const roomSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      default: null,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    players: {
      type: [playerSchema],
      default: [],
    },
    maxPlayers: {
      type: Number,
      default: 6,
    },
    minPlayers: {
      type: Number,
      default: 2,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['waiting', 'playing'],
      default: 'waiting',
    },
  },
  {
    timestamps: false, // We're using createdAt manually
  },
);

// Index for faster queries
// Note: id field already has unique: true which creates an index automatically
roomSchema.index({ status: 1, isPrivate: 1 });

const Room = mongoose.model('Room', roomSchema);

export default Room;
