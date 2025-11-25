import { Button } from 'react-bootstrap';

const ActionBar = ({
  isMyTurn,
  gamePhase,
  selectedCard,
  onDrawCard,
  onDiscardCard,
}) => {
  if (!isMyTurn || !gamePhase) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2000,
        display: 'flex',
        gap: '10px',
        animation: 'slideUp 0.3s ease-out',
      }}
      className='floating-action-bar'>
      {gamePhase === 'draw' && (
        <Button
          variant='primary'
          size='lg'
          onClick={onDrawCard}
          style={{
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
          Draw from Deck
        </Button>
      )}

      {gamePhase === 'discard' && (
        <Button
          variant='danger'
          size='lg'
          onClick={onDiscardCard}
          disabled={!selectedCard}
          style={{
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
          {selectedCard ? 'Discard Selected Card' : 'Select a Card to Discard'}
        </Button>
      )}
    </div>
  );
};

export default ActionBar;

