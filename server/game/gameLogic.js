// gamelogic.js
// Core logic for Twins & Followers game

// ---------- Deck Utilities ----------
const numericValues = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const faceValues = ['J', 'Q', 'K'];
const suits = ['hearts', 'diamonds', 'clubs', 'spades'];

/**
 * Create a standard 52-card deck
 * Each card: { value: 'A'|'2'..|'K', suit: 'hearts'|'diamonds'|'clubs'|'spades' }
 */
function createDeck() {
  const deck = [];
  numericValues.concat(faceValues).forEach((value) => {
    suits.forEach((suit) => {
      deck.push({ value, suit });
    });
  });
  return deck;
}

/**
 * Shuffle an array (Fisher–Yates)
 */
function shuffle(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- Hand Evaluation ----------

/**
 * Check if two cards are twins
 */
function areTwins(card1, card2) {
  return card1.value === card2.value;
}

/**
 * Check if two cards are followers according to numeric/face rules
 */
function areFollowers(card1, card2) {
  // Numeric sequence
  if (
    numericValues.includes(card1.value) &&
    numericValues.includes(card2.value)
  ) {
    const idx1 = numericValues.indexOf(card1.value);
    const idx2 = numericValues.indexOf(card2.value);
    return (
      idx2 === idx1 + 1 ||
      idx2 === idx1 - 1 ||
      (card1.value === '2' && card2.value === 'A') ||
      (card1.value === 'A' && card2.value === '2')
    );
  }

  // Face cards - must be different values to be followers
  if (faceValues.includes(card1.value) && faceValues.includes(card2.value)) {
    // Face cards follow each other only if they have different values
    // Same value face cards are twins, not followers
    return card1.value !== card2.value;
  }

  // Cannot mix numeric + face
  return false;
}

/**
 * Find all twin pairs in a hand
 */
function findTwins(hand) {
  const twins = [];
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      if (areTwins(hand[i], hand[j])) twins.push([hand[i], hand[j]]);
    }
  }
  return twins;
}

/**
 * Find all follower pairs in a hand
 */
function findFollowers(hand) {
  const followers = [];
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      if (areFollowers(hand[i], hand[j])) followers.push([hand[i], hand[j]]);
    }
  }
  return followers;
}

/**
 * Compare two cards by value and suit
 */
function cardsEqual(card1, card2) {
  return card1.value === card2.value && card1.suit === card2.suit;
}

/**
 * Check if a card is in an array (by value and suit, not reference)
 */
function cardInArray(card, array) {
  return array.some((c) => cardsEqual(c, card));
}

/**
 * Get cards from hand that are not in the exclude list
 */
function getRemainingCards(hand, excludeCards) {
  return hand.filter(
    (card) => !excludeCards.some((exclude) => cardsEqual(card, exclude)),
  );
}

/**
 * Check a hand for a winning combination
 * Returns { twins: [...], followers: [...] } or null if no win
 * Ensures exactly 4 distinct cards with no overlap
 * Finds twins first, then finds followers only in the remaining cards
 */
function checkWinningHand(hand) {
  const twinPairs = findTwins(hand);

  if (twinPairs.length === 0) {
    return null; // No twins, can't win
  }

  // For each twin pair, find followers in the remaining cards (excluding the twin cards)
  for (const twin of twinPairs) {
    // Get hand without the twin cards
    const remainingCards = getRemainingCards(hand, twin);

    // Find followers in the remaining cards only
    const followerPairs = findFollowers(remainingCards);

    if (followerPairs.length > 0) {
      // Found a valid combination: 2 twins + 2 followers (4 distinct cards, no overlap)
      return { twins: twin, followers: followerPairs[0] };
    }
  }

  return null; // no winning hand
}

// ---------- Fight Utilities ----------

/**
 * Determine which players can win with a given discarded card
 * @param {Array} players - array of { nickname, hand }
 * @param {Object} card - discarded card
 */
function playersCanWinWithCard(players, card) {
  const winners = [];
  for (const player of players) {
    const tempHand = [...player.hand, card];
    if (checkWinningHand(tempHand)) {
      winners.push(player);
    }
  }
  return winners;
}

/**
 * Handle a fight: all winning players drop one card and draw a random card
 * The discarded card is NOT picked up - it's voided/removed from play
 * @param {Array} winners - array of players who can win with the discarded card
 * @param {Object} discardedCard - the card that triggered the fight
 * @param {Array} deck - remaining deck to draw from
 * @param {Array} discardPile - discard pile to reshuffle from if deck runs out
 * @returns {Object} { deck: updated deck, discardPile: updated discard pile }
 */
function handleFight(winners, discardedCard, deck, discardPile = []) {
  for (const player of winners) {
    // Check what their winning combination WOULD be with the discarded card
    const tempHand = [...player.hand, discardedCard];
    const winningHand = checkWinningHand(tempHand);
    if (!winningHand) continue;

    // Find which card from player's hand pairs with the discarded card
    // The card to drop is the one that pairs with the discarded card in the winning combination
    let dropCard = null;

    // Check if discarded card is part of the twins pair
    if (cardInArray(discardedCard, winningHand.twins)) {
      // Discarded card pairs with another card in twins
      // Find the card in twins that's in player's hand (can't be discarded card since it's not in hand)
      for (const card of winningHand.twins) {
        if (cardInArray(card, player.hand)) {
          dropCard = card;
          break;
        }
      }
    } else {
      // Discarded card must be part of the followers pair
      // Find the card in followers that's in player's hand
      for (const card of winningHand.followers) {
        if (cardInArray(card, player.hand)) {
          dropCard = card;
          break;
        }
      }
    }

    // If still no card found, skip this player (shouldn't happen with correct logic)
    if (!dropCard) {
      continue;
    }

    // Remove the dropped card from their hand (using value comparison, not reference)
    player.hand = player.hand.filter((c) => !cardsEqual(c, dropCard));

    // Reshuffle discard pile if deck is empty before drawing
    if (deck.length === 0 && discardPile.length > 0) {
      const cardsToReshuffle = [...discardPile];
      discardPile.length = 0; // Clear discard pile
      const shuffledCards = shuffle(cardsToReshuffle);
      deck.push(...shuffledCards);
    }

    // Draw a random card from the deck
    if (deck.length > 0) {
      const idx = Math.floor(Math.random() * deck.length);
      const drawn = deck.splice(idx, 1)[0];
      player.hand.push(drawn);
    }
  }
  // The discarded card is NOT picked up - it's voided/removed from play
  return { deck, discardPile };
}

export default {
  createDeck,
  shuffle,
  checkWinningHand,
  findTwins,
  findFollowers,
  areTwins,
  areFollowers,
  playersCanWinWithCard,
  handleFight,
};
