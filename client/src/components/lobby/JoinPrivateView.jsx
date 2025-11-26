import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import NavigationHeader from './NavigationHeader';

/**
 * Join private room view - form to join a private room by ID
 */
const JoinPrivateView = ({
  joinRoomId,
  joinPassword,
  error,
  isLoading,
  onBack,
  onRoomIdChange,
  onPasswordChange,
  onSubmit,
}) => {
  return (
    <Container className='mt-5'>
      <NavigationHeader onBack={onBack} />
      <Row>
        <Col md={6} className='mx-auto'>
          <Card>
            <Card.Header>
              <h4>Join Private Room</h4>
            </Card.Header>
            <Card.Body>
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (joinRoomId.trim()) {
                    onSubmit();
                  }
                }}>
                <Form.Group className='mb-3' controlId='joinRoomId'>
                  <Form.Label>Room ID</Form.Label>
                  <Form.Control
                    type='text'
                    placeholder='Enter room ID'
                    value={joinRoomId}
                    onChange={onRoomIdChange}
                    autoComplete='off'
                    name='joinRoomId'
                  />
                </Form.Group>

                <Form.Group className='mb-3' controlId='joinRoomPassword'>
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type='password'
                    placeholder='Enter password'
                    value={joinPassword}
                    onChange={onPasswordChange}
                    autoComplete='off'
                    name='joinPassword'
                  />
                </Form.Group>

                {error && <Alert variant='danger'>{error}</Alert>}

                <div className='d-grid gap-2'>
                  <Button
                    type='submit'
                    variant='info'
                    size='lg'
                    disabled={!joinRoomId.trim() || isLoading}>
                    {isLoading ? 'Joining...' : 'Join Private Room'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default JoinPrivateView;

