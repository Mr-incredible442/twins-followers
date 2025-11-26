import { Container, Row, Col, Card, ListGroup, Badge, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import LeaveRoomModal from '../modals/LeaveRoomModal';

/**
 * Room lobby view - shown when user is in a room waiting for game to start
 */
const RoomLobbyView = ({
  room,
  error,
  showLeaveConfirm,
  shouldShowLeaveModal,
  onLeaveClick,
  onLeaveConfirm,
  onLeaveCancel,
  onStartGame,
}) => {
  const navigate = useNavigate();

  return (
    <Container className='mt-5'>
      <Row>
        <Col md={8} className='mx-auto'>
          <Card>
            <Card.Header className='d-flex justify-content-between align-items-center'>
              <h3>{room.name}</h3>
              <div className='d-flex gap-2'>
                <Button variant='outline-secondary' onClick={() => navigate('/')}>
                  Home
                </Button>
                <Button variant='outline-danger' onClick={onLeaveClick}>
                  Leave Room
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              <div className='mb-3'>
                <Badge bg='secondary' className='me-2'>
                  {room.isPrivate ? 'Private' : 'Public'}
                </Badge>
                <Badge bg='info'>Room ID: {room.id}</Badge>
              </div>

              <h5>Players ({room.players.length}/{room.maxPlayers}):</h5>
              <ListGroup className='mb-3'>
                {room.players.map((player) => (
                  <ListGroup.Item key={player.socketId}>
                    {player.playerName}
                  </ListGroup.Item>
                ))}
              </ListGroup>

              {error && <Alert variant='danger'>{error}</Alert>}

              <Button
                variant='success'
                onClick={onStartGame}
                disabled={room.players.length < room.minPlayers}
                size='lg'
                className='w-100'>
                Start Game ({room.players.length}/{room.minPlayers} minimum)
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <LeaveRoomModal
        show={shouldShowLeaveModal}
        onHide={onLeaveCancel}
        onConfirm={onLeaveConfirm}
        playerCount={room.players.length}
      />
    </Container>
  );
};

export default RoomLobbyView;

