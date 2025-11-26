// Game State Manager
// Manages game state for active games in rooms
// Uses MongoDB for persistence

import gameLogic from './gameLogic.js';
import roomManager from '../room/roomManager.js';
import GameState from '../models/GameState.js';

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
 * Save game state to database
 * @param {Object} gameState - Game state object
 * @returns {Promise<Object>} Saved game state
 */
async function saveGameState(gameState) {
  const updated = await GameState.findOneAndUpdate(
    { roomId: gameState.roomId },
    {
      ...gameState,
      updatedAt: new Date(),
    },
    { upsert: true, new: true },
  );
  return toPlainObject(updated);
}

/**
 * Initialize a new game for a room
 * @param {string} roomId - Room ID
 * @param {Array} players - Array of player objects with socketId and playerName
 * @returns {Promise<Object>} Initial game state
 */
async function initializeGame(roomId, players) {
  // Create and shuffle deck
  let deck = gameLogic.createDeck();
  deck = gameLogic.shuffle(deck);

  // Deal 3 cards to each player
  const gamePlayers = players.map((player) => ({
    socketId: player.socketId,
    playerName: player.playerName,
    hand: [],
  }));

  for (let i = 0; i < 3; i++) {
    for (const player of gamePlayers) {
      if (deck.length > 0) {
        player.hand.push(deck.shift());
      }
    }
  }

  // Randomly select starting player
  const startingPlayerIndex = Math.floor(Math.random() * gamePlayers.length);
  const startingPlayer = gamePlayers[startingPlayerIndex];

  const gameState = {
    roomId,
    players: gamePlayers,
    deck,
    currentPlayerSocketId: startingPlayer.socketId,
    currentPlayerIndex: startingPlayerIndex,
    phase: 'draw',
    lastDiscard: null,
    discardPile: [],
    message: null,
    winner: null,
    fightInProgress: false,
    turnStartTime: new Date(), // Start timer for first player
    turnTimeLimit: 30, // 30 seconds per turn
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await saveGameState(gameState);
  return gameState;
}

/**
 * Get game state for a room
 * @param {string} roomId - Room ID
 * @returns {Promise<Object|null>} Game state or null if not found
 */
async function getGameState(roomId) {
  const gameState = await GameState.findOne({ roomId });
  return toPlainObject(gameState);
}

/**
 * Get sanitized game state for a specific player (hides other players' hands)
 * When game has ended (winner declared), all hands are visible to everyone
 * @param {string} roomId - Room ID
 * @param {string} socketId - Socket ID of requesting player
 * @returns {Promise<Object|null>} Sanitized game state
 */
async function getGameStateForPlayer(roomId, socketId) {
  const gameState = await getGameState(roomId);
  if (!gameState) return null;

  // Get the room to find the player's name by socket ID
  const room = await roomManager.getRoom(roomId);
  if (!room) return null;

  // Find the player in the room by socket ID to get their name
  const roomPlayer = room.players.find((p) => p.socketId === socketId);
  if (!roomPlayer) return null;

  const playerName = roomPlayer.playerName;

  // If game has ended (winner declared), show all hands to everyone
  if (gameState.winner) {
    // Return full game state with all hands visible
    return gameState;
  }

  // Create a copy and hide other players' hands during active gameplay
  // Match by player name instead of socket ID (since socket IDs change on reconnect)
  const sanitized = {
    ...gameState,
    players: gameState.players.map((player) => ({
      socketId: player.socketId,
      playerName: player.playerName,
      hand:
        player.playerName === playerName
          ? player.hand
          : Array(player.hand.length).fill({ value: '?', suit: '?' }),
    })),
  };

  return sanitized;
}

/**
 * Reshuffle discard pile into deck (excluding lastDiscard)
 * @param {Object} gameState - Current game state
 * @returns {boolean} true if reshuffled, false if discard pile was empty
 */
function reshuffleDiscardPile(gameState) {
  // Don't reshuffle if discard pile is empty
  if (gameState.discardPile.length === 0) {
    return false;
  }

  // Take all cards from discard pile (excluding lastDiscard which is still available)
  let cardsToReshuffle = [];

  // If there's a lastDiscard, exclude it from the reshuffle (it's stored separately and can still be picked up)
  if (gameState.lastDiscard) {
    // Find and exclude the lastDiscard from discardPile
    cardsToReshuffle = gameState.discardPile.filter(
      (card) =>
        !(
          card.value === gameState.lastDiscard.value &&
          card.suit === gameState.lastDiscard.suit
        ),
    );
    // Empty discardPile (lastDiscard is kept separately)
    gameState.discardPile = [];
  } else {
    // No lastDiscard, so take all cards from discardPile
    cardsToReshuffle = [...gameState.discardPile];
    gameState.discardPile = [];
  }

  // Don't reshuffle if there are no cards to reshuffle (only lastDiscard was in pile)
  if (cardsToReshuffle.length === 0) {
    return false;
  }

  // Shuffle the cards
  const shuffledCards = gameLogic.shuffle(cardsToReshuffle);

  // Add them to the deck
  gameState.deck.push(...shuffledCards);

  return true;
}

/**
 * Ensure deck has cards, reshuffling from discard pile if needed
 * @param {Object} gameState - Current game state
 * @returns {boolean} true if deck now has cards, false if still empty
 */
function ensureDeckHasCards(gameState) {
  if (gameState.deck.length === 0) {
    return reshuffleDiscardPile(gameState);
  }
  return true;
}

/**
 * Move to next player's turn
 * @param {Object} gameState - Current game state
 * @returns {Object} Updated game state
 */
function nextTurn(gameState) {
  gameState.currentPlayerIndex =
    (gameState.currentPlayerIndex + 1) % gameState.players.length;
  gameState.currentPlayerSocketId =
    gameState.players[gameState.currentPlayerIndex].socketId;
  gameState.phase = 'draw';
  gameState.message = null;
  // Set turn start time for timer
  if (!gameState.isPaused && !gameState.winner) {
    gameState.turnStartTime = new Date();
  }
  return gameState;
}

/**
 * Determine which card a winner will drop during a fight
 * @param {Object} winner - Player who can win with the discarded card
 * @param {Object} discardedCard - The card that triggers the fight
 * @returns {Object|null} The card to drop, or null if not found
 */
function determineDropCard(winner, discardedCard) {
  const tempHand = [...winner.hand, discardedCard];
  const winningHand = gameLogic.checkWinningHand(tempHand);
  if (!winningHand) return null;

  // Check if discarded card is part of the twins pair
  if (
    winningHand.twins.some(
      (c) => c.value === discardedCard.value && c.suit === discardedCard.suit,
    )
  ) {
    // Find the card in twins that's in player's hand
    for (const card of winningHand.twins) {
      if (
        winner.hand.some((c) => c.value === card.value && c.suit === card.suit)
      ) {
        return { ...card };
      }
    }
  } else {
    // Discarded card must be part of the followers pair
    for (const card of winningHand.followers) {
      if (
        winner.hand.some((c) => c.value === card.value && c.suit === card.suit)
      ) {
        return { ...card };
      }
    }
  }

  return null;
}

/**
 * Capture fight data for display purposes
 * @param {Array} winners - Array of players who can win with the discarded card
 * @param {Object} discardedCard - The card that triggers the fight
 * @returns {Object} Fight data object with participants, original hands, and dropped cards
 */
function captureFightData(winners, discardedCard) {
  const fightOriginalHands = {};
  const fightDroppedCards = {};
  const fightParticipants = [];

  for (const winner of winners) {
    fightParticipants.push(winner.playerName);
    // Deep copy original hand
    fightOriginalHands[winner.playerName] = JSON.parse(
      JSON.stringify(winner.hand),
    );

    // Determine which card this player will drop
    const dropCard = determineDropCard(winner, discardedCard);
    if (dropCard) {
      fightDroppedCards[winner.playerName] = dropCard;
    }
  }

  return {
    fightCard: { ...discardedCard },
    fightParticipants,
    fightOriginalHands,
    fightDroppedCards,
    createdAt: new Date(),
  };
}

/**
 * Process a fight: handle multiple winners and update game state
 * @param {Object} gameState - Current game state
 * @param {Array} winners - Array of players who can win with the discarded card
 * @param {Object} discardedCard - The card that triggers the fight
 */
function processFight(gameState, winners, discardedCard) {
  // Capture fight data before resolving the fight
  gameState.fightData = captureFightData(winners, discardedCard);

  // Reshuffle discard pile if deck is empty before fight
  ensureDeckHasCards(gameState);

  // Execute the fight
  const fightResult = gameLogic.handleFight(
    winners,
    discardedCard,
    gameState.deck,
    gameState.discardPile,
  );

  gameState.deck = fightResult.deck;
  gameState.discardPile = fightResult.discardPile;
  gameState.lastDiscard = null; // Card is voided during fight
  gameState.message = `Fight! ${winners.length} players could win with that card`;
}

/**
 * Draw a card from deck for a player
 * @param {string} roomId - Room ID
 * @param {string} socketId - Socket ID of player drawing
 * @returns {Promise<{success: boolean, gameState?: Object, error?: string}>} Result
 */
async function drawCard(roomId, socketId) {
  const gameState = await getGameState(roomId);
  if (!gameState) {
    return { success: false, error: 'Game not found' };
  }

  // Check if game is paused
  if (gameState.isPaused) {
    return { success: false, error: 'Game is paused' };
  }

  // Clear fightData if it exists (fight modal should have been shown by now)
  if (gameState.fightData) {
    gameState.fightData = null;
  }

  if (gameState.currentPlayerSocketId !== socketId) {
    return { success: false, error: 'Not your turn' };
  }

  if (gameState.phase !== 'draw') {
    return { success: false, error: 'Not in draw phase' };
  }

  // Reshuffle discard pile if deck is empty
  if (!ensureDeckHasCards(gameState)) {
    return { success: false, error: 'Deck is empty and no cards to reshuffle' };
  }

  const player = gameState.players.find((p) => p.socketId === socketId);
  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  const drawnCard = gameState.deck.shift();
  player.hand.push(drawnCard);

  // Automatically check if player has a winning hand after drawing
  const winningHand = gameLogic.checkWinningHand(player.hand);
  if (winningHand) {
    // Player wins immediately
    gameState.winner = {
      socketId: player.socketId,
      playerName: player.playerName,
      winningHand,
    };
    gameState.message = `${player.playerName} wins!`;
    gameState.phase = 'ended'; // Game is over
  } else {
    gameState.phase = 'discard';
    gameState.message = null;
  }

  await saveGameState(gameState);
  return { success: true, gameState };
}

/**
 * Discard a card
 * @param {string} roomId - Room ID
 * @param {string} socketId - Socket ID of player discarding
 * @param {Object} card - Card to discard
 * @returns {Promise<{success: boolean, gameState?: Object, error?: string}>} Result
 */
async function discardCard(roomId, socketId, card) {
  const gameState = await getGameState(roomId);
  if (!gameState) {
    return { success: false, error: 'Game not found' };
  }

  // Check if game is paused
  if (gameState.isPaused) {
    return { success: false, error: 'Game is paused' };
  }

  // Clear fightData if it exists (fight modal should have been shown by now)
  // We'll set new fightData if a new fight occurs
  if (gameState.fightData) {
    gameState.fightData = null;
  }

  if (gameState.currentPlayerSocketId !== socketId) {
    return { success: false, error: 'Not your turn' };
  }

  if (gameState.phase !== 'discard') {
    return { success: false, error: 'Not in discard phase' };
  }

  const player = gameState.players.find((p) => p.socketId === socketId);
  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Check if player has a winning hand before discarding
  // (in case they somehow got to discard phase with a winning hand)
  const currentPlayerWinningHand = gameLogic.checkWinningHand(player.hand);
  if (currentPlayerWinningHand) {
    // Player wins immediately
    gameState.winner = {
      socketId: player.socketId,
      playerName: player.playerName,
      winningHand: currentPlayerWinningHand,
    };
    gameState.message = `${player.playerName} wins!`;
    gameState.phase = 'ended'; // Game is over
    await saveGameState(gameState);
    return { success: true, gameState };
  }

  // Find and remove card from hand
  const cardIndex = player.hand.findIndex(
    (c) => c.value === card.value && c.suit === card.suit,
  );
  if (cardIndex === -1) {
    return { success: false, error: 'Card not in hand' };
  }

  const discardedCard = player.hand.splice(cardIndex, 1)[0];

  // Check if any other players can win with this card
  const winners = gameLogic.playersCanWinWithCard(
    gameState.players.filter((p) => p.socketId !== socketId),
    discardedCard,
  );

  if (winners.length > 1) {
    // Multiple players can win - handle fight
    processFight(gameState, winners, discardedCard);
    // Move to next turn after fight
    nextTurn(gameState);
  } else if (winners.length === 1) {
    // Single player can win - they win immediately
    const winningPlayer = winners[0];
    // Add the discarded card to their hand
    winningPlayer.hand.push(discardedCard);
    const winningHand = gameLogic.checkWinningHand(winningPlayer.hand);

    gameState.winner = {
      socketId: winningPlayer.socketId,
      playerName: winningPlayer.playerName,
      winningHand,
    };
    gameState.lastDiscard = null;
    gameState.message = `${winningPlayer.playerName} wins by claiming the discarded card!`;
    // Don't move to next turn - game is over
  } else {
    // Normal discard - no one can win with it
    gameState.lastDiscard = discardedCard;
    gameState.discardPile.push(discardedCard);
    // Move to next turn
    nextTurn(gameState);
  }

  await saveGameState(gameState);
  return { success: true, gameState };
}

/**
 * Pick up the last discarded card
 * @param {string} roomId - Room ID
 * @param {string} socketId - Socket ID of player picking up
 * @returns {Promise<{success: boolean, gameState?: Object, error?: string}>} Result
 */
async function pickUpDiscard(roomId, socketId) {
  const gameState = await getGameState(roomId);
  if (!gameState) {
    return { success: false, error: 'Game not found' };
  }

  // Check if game is paused
  if (gameState.isPaused) {
    return { success: false, error: 'Game is paused' };
  }

  if (gameState.currentPlayerSocketId !== socketId) {
    return { success: false, error: 'Not your turn' };
  }

  if (gameState.phase !== 'draw') {
    return { success: false, error: 'Not in draw phase' };
  }

  if (!gameState.lastDiscard) {
    return { success: false, error: 'No discard to pick up' };
  }

  const player = gameState.players.find((p) => p.socketId === socketId);
  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Check if card completes winning hand
  const tempHand = [...player.hand, gameState.lastDiscard];
  const winningHand = gameLogic.checkWinningHand(tempHand);
  if (!winningHand) {
    return {
      success: false,
      error: 'This card does not complete a winning hand',
    };
  }

  player.hand.push(gameState.lastDiscard);
  gameState.lastDiscard = null;

  // Player wins immediately since the card completes their winning hand
  gameState.winner = {
    socketId: player.socketId,
    playerName: player.playerName,
    winningHand,
  };
  gameState.message = `${player.playerName} wins by picking up the discard!`;
  gameState.phase = null; // Game is over

  await saveGameState(gameState);
  return { success: true, gameState };
}

/**
 * Declare win
 * @param {string} roomId - Room ID
 * @param {string} socketId - Socket ID of player declaring win
 * @returns {Promise<{success: boolean, gameState?: Object, error?: string}>} Result
 */
async function declareWin(roomId, socketId) {
  const gameState = await getGameState(roomId);
  if (!gameState) {
    return { success: false, error: 'Game not found' };
  }

  if (gameState.currentPlayerSocketId !== socketId) {
    return { success: false, error: 'Not your turn' };
  }

  const player = gameState.players.find((p) => p.socketId === socketId);
  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  const winningHand = gameLogic.checkWinningHand(player.hand);
  if (!winningHand) {
    return { success: false, error: 'You do not have a winning hand' };
  }

  gameState.winner = {
    socketId: player.socketId,
    playerName: player.playerName,
    winningHand,
  };
  gameState.message = `${player.playerName} wins!`;
  await saveGameState(gameState);
  return { success: true, gameState };
}

/**
 * Restart game in a room (reset game state but keep players)
 * @param {string} roomId - Room ID
 * @param {Array} [players] - Optional array of players to use (if not provided, gets from room)
 * @returns {Promise<Object>} New game state
 */
async function restartGame(roomId, players = null) {
  const room = await roomManager.getRoom(roomId);
  if (!room) {
    return null;
  }

  // Use provided players or get from room, filtering out disconnected players
  const playersToUse =
    players || room.players.filter((p) => p.socketId && p.socketId !== '');

  // Delete old game state
  await GameState.deleteOne({ roomId });

  // Initialize new game with connected players only
  const newGameState = await initializeGame(roomId, playersToUse);
  return newGameState;
}

/**
 * Delete game state for a room
 * @param {string} roomId - Room ID
 */
async function deleteGameState(roomId) {
  await GameState.deleteOne({ roomId });
}

/**
 * Update a player's socket ID in the game state (for reconnection)
 * @param {string} roomId - Room ID
 * @param {string} playerName - Name of the player
 * @param {string} newSocketId - New socket ID
 */
async function updatePlayerSocketId(roomId, playerName, newSocketId) {
  const gameState = await getGameState(roomId);
  if (!gameState) return;

  // Update the player's socket ID in the game state
  const updatedPlayers = gameState.players.map((player) => {
    if (player.playerName === playerName) {
      return {
        ...player,
        socketId: newSocketId,
      };
    }
    return player;
  });

  // Update current player socket ID if it matches the old one
  const player = gameState.players.find((p) => p.playerName === playerName);
  if (player) {
    const updatedGameState = {
      ...gameState,
      players: updatedPlayers,
      currentPlayerSocketId:
        gameState.currentPlayerSocketId === player.socketId ||
        gameState.currentPlayerSocketId === ''
          ? newSocketId
          : gameState.currentPlayerSocketId,
    };

    await saveGameState(updatedGameState);
  }
}

/**
 * Pause the game due to player disconnection
 * @param {string} roomId - Room ID
 * @param {string} reason - Reason for pause
 * @param {Array<string>} disconnectedPlayers - Array of disconnected player names
 * @returns {Promise<{success: boolean, gameState?: Object, error?: string}>} Result
 */
async function pauseGame(roomId, reason, disconnectedPlayers) {
  const gameState = await getGameState(roomId);
  if (!gameState) {
    return { success: false, error: 'Game not found' };
  }

  // Get decision maker
  const decisionMaker = await roomManager.getDecisionMaker(roomId);
  if (!decisionMaker) {
    return { success: false, error: 'No decision maker found' };
  }

  gameState.isPaused = true;
  gameState.pausedReason = reason;
  gameState.disconnectedPlayers = disconnectedPlayers;
  gameState.pauseStartTime = new Date();
  gameState.decisionMakerSocketId = decisionMaker.socketId;
  // Clear turn start time when paused (timer will be cleared on server)
  gameState.turnStartTime = null;

  await saveGameState(gameState);
  return { success: true, gameState };
}

/**
 * Resume the game after pause
 * @param {string} roomId - Room ID
 * @returns {Promise<{success: boolean, gameState?: Object, error?: string}>} Result
 */
async function resumeGame(roomId) {
  const gameState = await getGameState(roomId);
  if (!gameState) {
    return { success: false, error: 'Game not found' };
  }

  gameState.isPaused = false;
  gameState.pausedReason = null;
  gameState.disconnectedPlayers = [];
  gameState.pauseStartTime = null;
  gameState.decisionMakerSocketId = null;
  // Restart turn timer when resuming (if game hasn't ended)
  if (!gameState.winner) {
    gameState.turnStartTime = new Date();
  }

  await saveGameState(gameState);
  return { success: true, gameState };
}

/**
 * Remove disconnected players from game state and add their cards to discard pile
 * @param {string} roomId - Room ID
 * @param {Array<string>} playerNames - Array of player names to remove
 * @returns {Promise<{success: boolean, gameState?: Object, error?: string}>} Result
 */
async function removeDisconnectedPlayers(roomId, playerNames) {
  const gameState = await getGameState(roomId);
  if (!gameState) {
    return { success: false, error: 'Game not found' };
  }

  // Collect cards from disconnected players
  const cardsToAdd = [];
  const playersToRemove = [];

  for (const playerName of playerNames) {
    const player = gameState.players.find((p) => p.playerName === playerName);
    if (player) {
      cardsToAdd.push(...player.hand);
      playersToRemove.push(player);
    }
  }

  // Remove disconnected players
  gameState.players = gameState.players.filter(
    (p) => !playerNames.includes(p.playerName),
  );

  // Add their cards to bottom of discard pile
  gameState.discardPile.push(...cardsToAdd);

  // Check if we have enough players (minimum 2)
  const room = await roomManager.getRoom(roomId);
  const minPlayers = room?.minPlayers || 2;

  if (gameState.players.length < minPlayers) {
    // Not enough players - game should end
    gameState.phase = 'ended';
    gameState.message =
      gameState.players.length === 0
        ? 'All players disconnected'
        : 'Not enough players to continue';
    await saveGameState(gameState);
    return { success: true, gameState, shouldEndGame: true };
  }

  // If it was a disconnected player's turn, skip to next player
  const wasDisconnectedPlayerTurn = playersToRemove.some(
    (p) => p.socketId === gameState.currentPlayerSocketId,
  );

  if (wasDisconnectedPlayerTurn && gameState.players.length > 0) {
    // Find the index of the disconnected player
    const disconnectedIndex = playersToRemove[0]
      ? gameState.players.findIndex(
          (p) => p.playerName === playersToRemove[0].playerName,
        )
      : -1;

    // If we can't find the index, just move to next player
    if (disconnectedIndex === -1 || gameState.players.length === 0) {
      // Reset to first player if needed
      if (gameState.players.length > 0) {
        gameState.currentPlayerIndex = 0;
        gameState.currentPlayerSocketId = gameState.players[0].socketId;
      }
    } else {
      // Move to next player (wrapping around)
      nextTurn(gameState);
    }
  }

  await saveGameState(gameState);
  return { success: true, gameState, shouldEndGame: false };
}

/**
 * End game and return to lobby
 * @param {string} roomId - Room ID
 * @returns {Promise<{success: boolean, error?: string}>} Result
 */
async function endGameAndReturnToLobby(roomId) {
  const gameState = await getGameState(roomId);
  if (!gameState) {
    return { success: false, error: 'Game not found' };
  }

  // Delete game state
  await deleteGameState(roomId);

  // Update room status to waiting
  await roomManager.updateRoomStatus(roomId, 'waiting');

  return { success: true };
}

/**
 * Auto-skip a player's turn when timer expires
 * @param {string} roomId - Room ID
 * @returns {Promise<{success: boolean, gameState?: Object, error?: string}>} Result
 */
async function autoSkipTurn(roomId) {
  const gameState = await getGameState(roomId);
  if (!gameState) {
    return { success: false, error: 'Game not found' };
  }

  // Check if game is paused or ended
  if (gameState.isPaused || gameState.winner) {
    return { success: false, error: 'Game is paused or ended' };
  }

  const currentPlayer = gameState.players.find(
    (p) => p.socketId === gameState.currentPlayerSocketId,
  );

  if (!currentPlayer) {
    return { success: false, error: 'Current player not found' };
  }

  // Auto-skip based on phase
  if (gameState.phase === 'draw') {
    // Auto-draw from deck
    if (!ensureDeckHasCards(gameState)) {
      return {
        success: false,
        error: 'Deck is empty and no cards to reshuffle',
      };
    }

    const drawnCard = gameState.deck.shift();
    currentPlayer.hand.push(drawnCard);

    // Check if player wins with drawn card
    const winningHand = gameLogic.checkWinningHand(currentPlayer.hand);
    if (winningHand) {
      gameState.winner = {
        socketId: currentPlayer.socketId,
        playerName: currentPlayer.playerName,
        winningHand,
      };
      gameState.message = `${currentPlayer.playerName} wins!`;
      gameState.phase = 'ended';
      gameState.turnStartTime = null;
    } else {
      gameState.phase = 'discard';
      // Reset turn start time for discard phase
      gameState.turnStartTime = new Date();
    }
  } else if (gameState.phase === 'discard') {
    // Auto-discard random card
    if (currentPlayer.hand.length === 0) {
      return { success: false, error: 'Player has no cards to discard' };
    }

    // Pick random card to discard
    const randomIndex = Math.floor(Math.random() * currentPlayer.hand.length);
    const discardedCard = currentPlayer.hand.splice(randomIndex, 1)[0];

    // Check if any other players can win with this card
    const winners = gameLogic.playersCanWinWithCard(
      gameState.players.filter(
        (p) => p.socketId !== gameState.currentPlayerSocketId,
      ),
      discardedCard,
    );

    if (winners.length > 1) {
      // Multiple players can win - handle fight
      processFight(gameState, winners, discardedCard);
      nextTurn(gameState);
    } else if (winners.length === 1) {
      // Single player can win - they win immediately
      const winningPlayer = winners[0];
      winningPlayer.hand.push(discardedCard);
      const winningHand = gameLogic.checkWinningHand(winningPlayer.hand);

      gameState.winner = {
        socketId: winningPlayer.socketId,
        playerName: winningPlayer.playerName,
        winningHand,
      };
      gameState.lastDiscard = null;
      gameState.message = `${winningPlayer.playerName} wins by claiming the discarded card!`;
      gameState.phase = 'ended';
      gameState.turnStartTime = null;
    } else {
      // Normal discard - no one can win with it
      gameState.lastDiscard = discardedCard;
      gameState.discardPile.push(discardedCard);
      nextTurn(gameState);
    }
  }

  // Set timeout message
  gameState.message = `${currentPlayer.playerName}'s turn timed out - auto-skipped`;

  await saveGameState(gameState);
  return { success: true, gameState };
}

export default {
  initializeGame,
  getGameState,
  getGameStateForPlayer,
  drawCard,
  discardCard,
  pickUpDiscard,
  declareWin,
  restartGame,
  deleteGameState,
  updatePlayerSocketId,
  pauseGame,
  resumeGame,
  removeDisconnectedPlayers,
  endGameAndReturnToLobby,
  autoSkipTurn,
};
