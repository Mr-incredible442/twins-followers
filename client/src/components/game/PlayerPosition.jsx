import { Badge } from 'react-bootstrap';
import FannedCards from './FannedCards';

const PlayerPosition = ({
  player,
  position,
  isCurrentTurn,
  isMePlayer,
  isFighting,
  pulseGlow,
  isMyTurn,
  gamePhase,
  onCardClick,
  selectedCard,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: isMePlayer ? 100 : 50,
        overflow: 'visible',
        pointerEvents: 'auto',
      }}>
      {/* Player Name and Turn Indicator */}
      <div
        style={{
          marginBottom: '10px',
          textAlign: 'center',
          position: 'relative',
        }}>
        <div
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '20px',
            backgroundColor: isFighting
              ? 'rgba(220, 53, 69, 0.8)'
              : isCurrentTurn
              ? pulseGlow
                ? 'rgba(40, 167, 69, 0.8)'
                : 'rgba(40, 167, 69, 0.6)'
              : isMePlayer
              ? 'rgba(0, 123, 255, 0.6)'
              : 'rgba(108, 117, 125, 0.6)',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: isFighting
              ? '0 0 25px rgba(220, 53, 69, 1), 0 0 50px rgba(220, 53, 69, 0.6)'
              : isCurrentTurn
              ? pulseGlow
                ? '0 0 20px rgba(40, 167, 69, 1), 0 0 40px rgba(40, 167, 69, 0.6)'
                : '0 0 15px rgba(40, 167, 69, 0.8)'
              : 'none',
            animation: isFighting
              ? 'fightGlow 1.5s ease-in-out infinite'
              : isCurrentTurn && pulseGlow
              ? 'pulseGlow 2s ease-out'
              : 'none',
            transition: 'all 0.3s ease',
          }}>
          {player.playerName}
          {isMePlayer && <span className='ms-2'>You</span>}
          {isCurrentTurn && !isMePlayer && (
            <Badge bg='warning' className='ms-2' style={{ fontSize: '10px' }}>
              Turn
            </Badge>
          )}
        </div>
      </div>

      {/* Fanned Cards */}
      <div
        style={{
          transform: isMePlayer ? 'none' : 'scale(0.8)',
          overflow: 'visible',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
        }}>
        <FannedCards
          cards={player.hand || []}
          isMyHand={isMePlayer}
          isMyTurn={isMyTurn}
          gamePhase={gamePhase}
          onCardClick={onCardClick}
          selectedCard={selectedCard}
        />
      </div>
    </div>
  );
};

export default PlayerPosition;

