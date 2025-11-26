import { Modal, Button, Alert } from 'react-bootstrap';

const LeaveRoomModal = ({ 
  show, 
  onHide, 
  onConfirm, 
  gamePhase, 
  playerCount,
  backdrop = true,
  keyboard = true 
}) => {
  // Determine which message to show
  const isInActiveGame = gamePhase && gamePhase !== 'ended';
  const isInLobby = !gamePhase && playerCount !== undefined;

  const title = isInActiveGame ? 'Leave Match?' : 'Leave Room?';
  const buttonText = isInActiveGame ? 'Leave Match' : 'Leave Room';
  const bodyText = isInActiveGame 
    ? "You're in an active match. Are you sure you want to leave?"
    : 'Are you sure you want to leave the room?';

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      centered
      backdrop={backdrop}
      keyboard={keyboard}
    >
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{bodyText}</p>
        {isInActiveGame && (
          <Alert variant='warning' className='mb-0'>
            <strong>Warning:</strong> Leaving during an active game will end the
            game for all players.
          </Alert>
        )}
        {isInLobby && playerCount > 1 && (
          <Alert variant='info' className='mb-0'>
            Other players are waiting in this room. Leaving will remove you from
            the room.
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant='secondary' onClick={onHide}>
          Cancel
        </Button>
        <Button variant='danger' onClick={onConfirm}>
          {buttonText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default LeaveRoomModal;
