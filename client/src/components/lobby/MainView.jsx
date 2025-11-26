import { Container, Row, Col } from 'react-bootstrap';
import NavigationHeader from './NavigationHeader';
import GameModeCard from './GameModeCard';

/**
 * Main lobby view - shows game mode selection cards
 */
const MainView = ({ onNavigateToView }) => {
  return (
    <Container className='mt-5'>
      <div className='mb-4 text-end'>
        <NavigationHeader />
      </div>
      <Row className='justify-content-center'>
        <Col md={10} lg={8}>
          <div className='text-center mb-4'>
            <h2 className='mb-3'>Choose Your Game Mode</h2>
            <p className='text-muted'>Select how you want to play</p>
          </div>
          <Row className='g-4'>
            <Col md={4}>
              <GameModeCard
                emoji='🎮'
                title='Enter Public Match'
                description='Join an available public room and start playing'
                buttonVariant='primary'
                buttonLabel='Find Match'
                onClick={() => onNavigateToView('publicMatch')}
              />
            </Col>
            <Col md={4}>
              <GameModeCard
                emoji='🔒'
                title='Create Private Room'
                description='Create your own private room to play with friends'
                buttonVariant='success'
                buttonLabel='Create Room'
                onClick={() => onNavigateToView('createPrivate')}
              />
            </Col>
            <Col md={4}>
              <GameModeCard
                emoji='🔑'
                title='Join Private Room'
                description='Enter room ID to join a private room'
                buttonVariant='info'
                buttonLabel='Join Room'
                onClick={() => onNavigateToView('joinPrivate')}
              />
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default MainView;

