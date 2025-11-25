import { Modal, Button, Alert } from 'react-bootstrap';

const LeaveRoomModal = ({ show, onHide, onConfirm, gamePhase }) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Leave Room?</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Are you sure you want to leave the room?</p>
        {gamePhase !== 'ended' && (
          <Alert variant='warning' className='mb-0'>
            <strong>Warning:</strong> Leaving during an active game will end the
            game for all players.
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant='secondary' onClick={onHide}>
          Cancel
        </Button>
        <Button variant='danger' onClick={onConfirm}>
          Leave Room
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default LeaveRoomModal;
