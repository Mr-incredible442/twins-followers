import { Modal, Button, Badge } from 'react-bootstrap';

const GamePausedModal = ({
  show,
  pausedReason,
  disconnectedPlayers,
  isDecisionMaker,
  onContinue,
  onEnd,
}) => {
  return (
    <Modal
      show={show}
      centered
      size='lg'
      backdrop='static'
      keyboard={false}
      backdropClassName='game-paused-backdrop'>
      <Modal.Header
        style={{
          backgroundColor: '#ffc107',
          color: '#000',
          borderBottom: 'none',
        }}>
        <Modal.Title style={{ fontSize: '24px', fontWeight: 'bold' }}>
          ⏸️ Game Paused
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#1a1a1a', color: 'white' }}>
        <div className='text-center mb-4'>
          <p style={{ fontSize: '18px', marginBottom: '20px' }}>
            {pausedReason || 'Game is paused'}
          </p>

          {disconnectedPlayers && disconnectedPlayers.length > 0 && (
            <div className='mb-4'>
              <p style={{ fontSize: '14px', marginBottom: '10px' }}>
                Disconnected Players:
              </p>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  justifyContent: 'center',
                }}>
                {disconnectedPlayers.map((playerName) => (
                  <Badge
                    key={playerName}
                    bg='warning'
                    text='dark'
                    style={{ fontSize: '14px', padding: '8px 12px' }}>
                    {playerName}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {!isDecisionMaker && (
            <p style={{ fontSize: '14px', color: '#999', marginTop: '20px' }}>
              Waiting for decision from room creator...
            </p>
          )}
        </div>
      </Modal.Body>
      {isDecisionMaker && (
        <Modal.Footer
          style={{
            backgroundColor: '#1a1a1a',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            justifyContent: 'center',
            gap: '10px',
          }}>
          <Button variant='success' size='lg' onClick={onContinue}>
            Continue Game
          </Button>
          <Button variant='danger' size='lg' onClick={onEnd}>
            End Game
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default GamePausedModal;

