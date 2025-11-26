import { Container, Row, Col, Card, ListGroup, Badge, Button, Alert } from 'react-bootstrap';
import NavigationHeader from './NavigationHeader';

/**
 * Public match view - shows list of available public lobbies
 */
const PublicMatchView = ({
  publicLobbies,
  isLoading,
  joiningRoomId,
  error,
  onBack,
  onJoinRoom,
  onCreateRoom,
  onRefresh,
}) => {
  return (
    <Container className='mt-5'>
      <NavigationHeader onBack={onBack} />
      <Row>
        <Col md={8} className='mx-auto'>
          <Card>
            <Card.Header className='d-flex justify-content-between align-items-center'>
              <h4>Public Matches</h4>
              <Button variant='outline-primary' size='sm' onClick={onRefresh}>
                Refresh
              </Button>
            </Card.Header>
            <Card.Body>
              {publicLobbies.length > 0 ? (
                <ListGroup>
                  {publicLobbies.map((lobby) => (
                    <ListGroup.Item
                      key={lobby.id}
                      className='d-flex justify-content-between align-items-center'>
                      <div>
                        <strong>{lobby.name}</strong>
                        <Badge bg='info' className='ms-2'>
                          {lobby.playerCount}/{lobby.maxPlayers} players
                        </Badge>
                      </div>
                      <Button
                        size='sm'
                        variant='primary'
                        onClick={() => onJoinRoom(lobby.id)}
                        disabled={
                          lobby.playerCount >= lobby.maxPlayers ||
                          isLoading ||
                          joiningRoomId === lobby.id
                        }>
                        {isLoading && joiningRoomId === lobby.id
                          ? 'Joining...'
                          : lobby.playerCount >= lobby.maxPlayers
                          ? 'Full'
                          : 'Join'}
                      </Button>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className='text-center py-4'>
                  <p className='text-muted mb-3'>
                    No public rooms available at the moment.
                  </p>
                  <Button
                    variant='primary'
                    onClick={onCreateRoom}
                    disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Public Room'}
                  </Button>
                </div>
              )}
              {error && (
                <Alert variant='danger' className='mt-3'>
                  {error}
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default PublicMatchView;

