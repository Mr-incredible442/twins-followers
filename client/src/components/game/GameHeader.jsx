import { Button, Badge } from 'react-bootstrap';

const GameHeader = ({
  roomName,
  isMyTurn,
  currentPlayerName,
  gamePhase,
  windowWidth,
  onLeaveRoom,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: windowWidth < 768 ? '5px' : '10px',
        left: windowWidth < 768 ? '5px' : '10px',
        right: windowWidth < 768 ? '5px' : '10px',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '5px',
      }}>
      <div style={{ flex: '1', minWidth: '150px' }}>
        <h4
          className='mb-0'
          style={{ fontSize: windowWidth < 768 ? '16px' : '20px' }}>
          {roomName}
        </h4>
        <div className='d-flex gap-2 mt-1' style={{ flexWrap: 'wrap' }}>
          <Badge bg={isMyTurn ? 'success' : 'secondary'}>
            {isMyTurn ? 'Your Turn' : `${currentPlayerName || 'Player'}'s Turn`}
          </Badge>
          {gamePhase && (
            <Badge bg='info' style={{ fontSize: '11px' }}>
              Phase: {gamePhase}
            </Badge>
          )}
        </div>
      </div>
      <Button
        variant='outline-danger'
        size={windowWidth < 768 ? 'sm' : 'md'}
        onClick={onLeaveRoom}
        style={{ flexShrink: 0 }}>
        {gamePhase && gamePhase !== 'ended' ? 'Leave Match' : 'Leave Room'}
      </Button>
    </div>
  );
};

export default GameHeader;

