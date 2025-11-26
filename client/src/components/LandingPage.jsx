import { Container, Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/useGame';

const LandingPage = () => {
  const navigate = useNavigate();
  const { playerName } = useGame();

  const handlePlayNow = () => {
    // Check if player has a name
    if (!playerName || playerName.trim().length === 0) {
      // Navigate to lobby, which will show name entry modal
      navigate('/lobby');
    } else {
      // Go directly to lobby
      navigate('/lobby');
    }
  };

  const handleViewRules = () => {
    navigate('/rules');
  };
  return (
    <Container fluid className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', padding: '2rem' }}>
      <div className="text-center" style={{ maxWidth: '800px', width: '100%' }}>
        {/* Hero Section */}
        <div className="mb-5">
          <h1 className="display-3 fw-bold mb-3">Twins & Followers</h1>
          <p className="lead mb-4">The Fast-Paced Card Game of Strategy and Speed</p>
        </div>

        {/* Description Card */}
        <Card className="mb-5" style={{ border: 'none', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          <Card.Body className="p-4">
            <p className="fs-5 mb-3">
              Experience the thrill of <strong>Twins & Followers</strong>, a multiplayer card game where quick thinking meets strategic play.
            </p>
            <p className="mb-3">
              Form winning combinations of <strong>twins</strong> (matching cards) and <strong>followers</strong> (sequential cards) 
              to claim victory. But watch out—when multiple players can win with the same card, a <strong>fight</strong> breaks out!
            </p>
            <p className="mb-0">
              Play with 2-6 players in real-time. Fast-paced turns, intense battles, and endless fun await.
            </p>
          </Card.Body>
        </Card>

        {/* Call to Action Buttons */}
        <div className="d-flex flex-column flex-md-row gap-3 justify-content-center">
          <Button
            variant="primary"
            size="lg"
            onClick={handlePlayNow}
            style={{ minWidth: '200px', fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
            Play Now
          </Button>
          <Button
            variant="outline-secondary"
            size="lg"
            onClick={handleViewRules}
            style={{ minWidth: '200px', fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
            View Rules
          </Button>
        </div>
      </div>
    </Container>
  );
};

export default LandingPage;

