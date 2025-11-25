import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Container,
  Form,
  InputGroup,
  Row,
  Col,
  ListGroup,
  Badge,
  Alert,
  Modal,
} from 'react-bootstrap';
import { useGame } from '../context/useGame';
import GameBoard from './GameBoard';

const Lobby = ({ onNavigateToHome }) => {
  const {
    room,
    publicLobbies,
    createRoom,
    joinRoom,
    leaveRoom,
    getPublicLobbies,
    startGame,
    gameState,
  } = useGame();

  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [error, setError] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    if (!room) {
      getPublicLobbies();
    }
  }, [room, getPublicLobbies]);

  const handleCreateRoom = async () => {
    try {
      setError('');
      if (!roomName.trim()) {
        setError('Room name is required');
        return;
      }
      if (isPrivate && !password.trim()) {
        setError('Password is required for private rooms');
        return;
      }
      await createRoom(roomName, isPrivate, password || null);
      setRoomName('');
      setPassword('');
      setIsPrivate(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoinRoom = async (roomId, roomPassword = null) => {
    try {
      setError('');
      await joinRoom(roomId, roomPassword);
      setJoinRoomId('');
      setJoinPassword('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await leaveRoom();
      setShowLeaveConfirm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartGame = () => {
    if (room && room.players.length >= room.minPlayers) {
      startGame();
    } else {
      setError(`Need at least ${room?.minPlayers || 2} players to start`);
    }
  };

  // If game is in progress, show game board
  if (gameState && room?.status === 'playing') {
    return <GameBoard />;
  }

  // If in a room but game hasn't started, show room lobby
  if (room) {
    return (
      <Container className='mt-5'>
        <Row>
          <Col md={8} className='mx-auto'>
            <Card>
              <Card.Header className='d-flex justify-content-between align-items-center'>
                <h3>{room.name}</h3>
                <div className='d-flex gap-2'>
                  {onNavigateToHome && (
                    <Button
                      variant='outline-secondary'
                      onClick={onNavigateToHome}>
                      Home
                    </Button>
                  )}
                  <Button
                    variant='outline-danger'
                    onClick={() => setShowLeaveConfirm(true)}>
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

                <h5>
                  Players ({room.players.length}/{room.maxPlayers}):
                </h5>
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
                  onClick={handleStartGame}
                  disabled={room.players.length < room.minPlayers}
                  size='lg'
                  className='w-100'>
                  Start Game ({room.players.length}/{room.minPlayers} minimum)
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Leave Room Confirmation Modal */}
        <Modal
          show={showLeaveConfirm}
          onHide={() => setShowLeaveConfirm(false)}
          centered>
          <Modal.Header closeButton>
            <Modal.Title>Leave Room?</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Are you sure you want to leave the room?</p>
            {room.players.length > 1 && (
              <Alert variant='info' className='mb-0'>
                Other players are waiting in this room. Leaving will remove you
                from the room.
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant='secondary'
              onClick={() => setShowLeaveConfirm(false)}>
              Cancel
            </Button>
            <Button variant='danger' onClick={handleLeaveRoom}>
              Leave Room
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    );
  }

  // Show room creation/joining interface
  return (
    <Container className='mt-5'>
      {onNavigateToHome && (
        <div className='mb-3 text-end'>
          <Button variant='outline-secondary' onClick={onNavigateToHome}>
            Home
          </Button>
        </div>
      )}
      <Row>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h4>Create Room</h4>
            </Card.Header>
            <Card.Body>
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateRoom();
                }}>
                <Form.Group className='mb-3'>
                  <Form.Label>Room Name</Form.Label>
                  <Form.Control
                    type='text'
                    placeholder='Enter room name'
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    autoComplete='off'
                  />
                </Form.Group>

                <Form.Group className='mb-3'>
                  <Form.Check
                    type='checkbox'
                    label='Private Room'
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  />
                </Form.Group>

                {isPrivate && (
                  <Form.Group className='mb-3'>
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type='password'
                      placeholder='Enter password'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete='off'
                    />
                  </Form.Group>
                )}

                <Button type='submit' variant='primary' className='w-100'>
                  Create Room
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>
              <h4>Join Room</h4>
            </Card.Header>
            <Card.Body>
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (joinRoomId.trim()) {
                    handleJoinRoom(joinRoomId, joinPassword || null);
                  }
                }}>
                <Form.Group className='mb-3'>
                  <Form.Label>Room ID</Form.Label>
                  <Form.Control
                    type='text'
                    placeholder='Enter room ID'
                    value={joinRoomId}
                    onChange={(e) =>
                      setJoinRoomId(e.target.value.toUpperCase())
                    }
                    autoComplete='off'
                  />
                </Form.Group>

                <Form.Group className='mb-3'>
                  <Form.Label>Password (if private)</Form.Label>
                  <Form.Control
                    type='password'
                    placeholder='Enter password'
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
                    autoComplete='off'
                  />
                </Form.Group>

                <Button
                  type='submit'
                  variant='success'
                  className='w-100 mb-3'
                  disabled={!joinRoomId.trim()}>
                  Join Room
                </Button>
              </Form>

              <div className='mb-3'>
                <Button
                  variant='outline-primary'
                  onClick={getPublicLobbies}
                  className='w-100'>
                  Refresh Public Lobbies
                </Button>
              </div>

              {publicLobbies.length > 0 && (
                <div>
                  <h6>Public Lobbies:</h6>
                  <ListGroup>
                    {publicLobbies.map((lobby) => (
                      <ListGroup.Item
                        key={lobby.id}
                        className='d-flex justify-content-between align-items-center'>
                        <div>
                          <strong>{lobby.name}</strong>
                          <Badge bg='info' className='ms-2'>
                            {lobby.playerCount}/{lobby.maxPlayers}
                          </Badge>
                        </div>
                        <Button
                          size='sm'
                          variant='primary'
                          onClick={() => handleJoinRoom(lobby.id)}>
                          Join
                        </Button>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && (
        <Row className='mt-3'>
          <Col>
            <Alert variant='danger'>{error}</Alert>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default Lobby;
