import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import NavigationHeader from './NavigationHeader';

/**
 * Create private room view - form to create a private room
 */
const CreatePrivateView = ({
  roomName,
  password,
  error,
  isLoading,
  onBack,
  onRoomNameChange,
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
              <h4>Create Private Room</h4>
            </Card.Header>
            <Card.Body>
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSubmit();
                }}>
                <Form.Group className='mb-3' controlId='createRoomName'>
                  <Form.Label>Room Name</Form.Label>
                  <Form.Control
                    type='text'
                    placeholder='Enter room name'
                    value={roomName}
                    onChange={onRoomNameChange}
                    autoComplete='off'
                    name='roomName'
                  />
                </Form.Group>

                <Form.Group className='mb-3' controlId='createRoomPassword'>
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type='password'
                    placeholder='Enter password'
                    value={password}
                    onChange={onPasswordChange}
                    autoComplete='off'
                    name='roomPassword'
                  />
                  <Form.Text className='text-muted'>
                    Share this password with friends to let them join
                  </Form.Text>
                </Form.Group>

                {error && <Alert variant='danger'>{error}</Alert>}

                <div className='d-grid gap-2'>
                  <Button
                    type='submit'
                    variant='success'
                    size='lg'
                    disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Private Room'}
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

export default CreatePrivateView;

