import { Badge } from 'react-bootstrap';
import CardComponent from '../Card';

const CenterPiles = ({
  isMyTurn,
  gamePhase,
  deckSize,
  lastDiscard,
  onDrawPileClick,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        zIndex: 10,
      }}>
      {/* Draw Pile */}
      <div
        style={{
          position: 'relative',
          cursor: isMyTurn && gamePhase === 'draw' ? 'pointer' : 'default',
        }}
        onClick={onDrawPileClick}
        className={
          isMyTurn && gamePhase === 'draw' ? 'draw-pile-clickable' : ''
        }>
        <div
          style={{
            width: '70px',
            height: '98px',
            border: '2px solid currentColor',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (isMyTurn && gamePhase === 'draw') {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow =
                '0 6px 12px rgba(0,123,255,0.5)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
          }}>
          <span style={{ fontSize: '28px' }}>🂠</span>
        </div>
        <Badge
          bg='info'
          style={{
            position: 'absolute',
            bottom: '-25px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '12px',
          }}>
          {deckSize || 0}
        </Badge>
      </div>

      {/* Discard Pile */}
      {lastDiscard && (
        <div
          style={{
            animation: 'fadeIn 0.5s ease-in',
          }}>
          <CardComponent card={lastDiscard} disabled />
        </div>
      )}
    </div>
  );
};

export default CenterPiles;

