/**
 * Calculate player positions around the circle
 * @param {Array} players - Array of player objects
 * @param {string} playerName - Current player's name
 * @param {string} socketId - Current player's socket ID
 * @returns {Array} Array of position objects with player, angle, and isMe
 */
export const calculatePlayerPositions = (players, playerName, socketId) => {
  const playersCopy = [...players];
  const myIndex = playersCopy.findIndex(
    (p) => p.playerName === playerName || p.socketId === socketId,
  );

  // Move "You" to separate array (will be at bottom - 270°)
  let myPlayer = null;
  if (myIndex !== -1) {
    [myPlayer] = playersCopy.splice(myIndex, 1);
  } else if (playersCopy.length > 0) {
    // If not found but players exist, use first as fallback
    myPlayer = playersCopy.shift();
  }

  const otherPlayers = playersCopy;
  const totalOtherPlayers = otherPlayers.length;
  const positions = [];

  // Distribute other players evenly around top half and sides (0° to 180°)
  // Skip 270° (bottom) which is reserved for "You"
  otherPlayers.forEach((player, index) => {
    // Distribute from 0° to 180° (top to sides), avoiding bottom
    let angle;
    if (totalOtherPlayers === 1) {
      angle = 90; // Single player at top
    } else if (totalOtherPlayers === 2) {
      // Two players: one at top-left (45°), one at top-right (135°)
      angle = index === 0 ? 45 : 135;
    } else {
      // Three or more: distribute evenly from 0° to 180°
      angle = (index / (totalOtherPlayers - 1)) * 180;
    }
    positions.push({
      player,
      angle,
      isMe: false,
    });
  });

  // Always add "You" at bottom (270°) if we have a player
  if (myPlayer) {
    positions.push({
      player: myPlayer,
      angle: 270,
      isMe: true,
    });
  }

  return positions;
};

/**
 * Calculate position for player around circle
 * @param {number} angle - Angle in degrees (0-360)
 * @param {number} radius - Table radius
 * @returns {Object} Position object with x and y coordinates
 */
export const getPlayerPosition = (angle, radius = 200) => {
  const radian = (angle * Math.PI) / 180;
  // Position players slightly inward from table edge to prevent card cutoff
  // Cards will extend outward, so we need some buffer
  const buffer = 30; // Buffer to prevent cards from being cut off at viewport edges
  const effectiveRadius = radius - buffer;
  const x = Math.cos(radian) * effectiveRadius;
  const y = Math.sin(radian) * effectiveRadius;
  return { x, y };
};

