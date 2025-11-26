import { Container, Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/useGame';

const RulesPage = () => {
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

  const handleBackToHome = () => {
    navigate('/');
  };
  return (
    <Container fluid style={{ minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="display-4 fw-bold mb-3">Game Rules</h1>
          <Button
            variant="primary"
            size="lg"
            onClick={handlePlayNow}
            className="mb-3"
            style={{ minWidth: '200px' }}>
            Play Now
          </Button>
        </div>

        {/* Rules Content */}
        <Card style={{ border: 'none', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          <Card.Body className="p-4">
            <div style={{ lineHeight: '1.8', fontSize: '1.05rem' }}>
              <h2 className="mb-3">TWINS & FOLLOWERS – RULE SHEET</h2>
              <p className="text-muted mb-4">(Zambian / House Rules Version – Multiplayer "Fight" Rule)</p>

              <section className="mb-4">
                <h3 className="mb-3">1. Game Overview</h3>
                <p>
                  Twins & Followers is played with a standard 52-card deck.
                </p>
                <p>
                  <strong>Objective:</strong> Form a winning 4-card hand containing:
                </p>
                <ul>
                  <li><strong>Two Twins:</strong> two cards of the same value</li>
                  <li><strong>Two Followers:</strong> two cards that follow each other according to the rules below</li>
                </ul>
                <p>
                  The first player to achieve this combination wins the round.
                </p>
              </section>

              <section className="mb-4">
                <h3 className="mb-3">2. Setup</h3>
                <ul>
                  <li>Use a standard 52-card deck</li>
                  <li>Deal 3 cards to each player</li>
                  <li>Remaining cards form the draw pile</li>
                  <li>Play moves clockwise</li>
                </ul>
              </section>

              <section className="mb-4">
                <h3 className="mb-3">3. Winning Hand</h3>
                <p>A winning hand consists of:</p>
                <ul>
                  <li><strong>Twins:</strong> two cards with the same number or face (suits don't matter)</li>
                  <li><strong>Followers:</strong> two cards that legally follow each other</li>
                </ul>
              </section>

              <section className="mb-4">
                <h3 className="mb-3">4. Sequence Rules (Followers)</h3>
                
                <h4 className="mt-3 mb-2">A. Numeric Path</h4>
                <p><strong>Sequence:</strong> A → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10</p>
                <p>Allowed followers: next or previous number (forward/backward)</p>
                <p><strong>Special cases:</strong></p>
                <ul>
                  <li>A can follow 2 and vice versa</li>
                  <li>10 can follow 9 and vice versa</li>
                </ul>

                <h4 className="mt-3 mb-2">B. Face Card Path</h4>
                <p>Face cards (J, Q, K) follow each other bidirectionally</p>
                <p>J → Q/K, Q → J/K, K → J/Q</p>

                <h4 className="mt-3 mb-2">C. Restrictions</h4>
                <p>Numeric + face cards cannot form followers</p>

                <h4 className="mt-3 mb-2">Examples of valid followers:</h4>
                <ul>
                  <li>Numeric: 3 → 2 or 3 → 4</li>
                  <li>Numeric: 9 → 8 or 9 → 10</li>
                  <li>Face cards: J → Q, J → K, Q → J, K → J</li>
                </ul>

                <h4 className="mt-3 mb-2">Examples NOT allowed:</h4>
                <ul>
                  <li>10 → J, J → 10, A → K, 3 → 5</li>
                </ul>
              </section>

              <section className="mb-4">
                <h3 className="mb-3">5. Gameplay</h3>
                <ol>
                  <li>On your turn, draw one card from the draw pile</li>
                  <li>Check your hand:
                    <ul>
                      <li>Winning hand → declare and win</li>
                      <li>Not winning → discard one card face-up, return to 3 cards</li>
                    </ul>
                  </li>
                  <li>Play passes clockwise</li>
                </ol>
              </section>

              <section className="mb-4">
                <h3 className="mb-3">6. Picking Up Discards</h3>
                <ul>
                  <li>You may pick up only the most recently discarded card</li>
                  <li>Can claim it only if it immediately completes your winning hand</li>
                  <li>Cards discarded during a fight cannot be used to win</li>
                </ul>
              </section>

              <section className="mb-4">
                <h3 className="mb-3">7. Multiplayer "Fight" Rule</h3>
                <p>If multiple players can win using the latest discarded card:</p>
                <ol>
                  <li>Each winning player drops one card from their winning combination</li>
                  <li>Draw one random card from the remaining deck</li>
                  <li>Discarded cards from the fight cannot be used to win</li>
                  <li>The game continues normally after the fight</li>
                </ol>
                <p className="mt-3"><strong>Example:</strong></p>
                <p>Player 2 has Q–Q + 4, Player 4 has 10–9 + 5</p>
                <p>Player 2 drops 4, Player 4 drops 5</p>
                <p>Each draws a random card</p>
              </section>

              <section className="mb-4">
                <h3 className="mb-3">8. Round End</h3>
                <ul>
                  <li>Normally: reveal a 4-card hand (2 twins + 2 followers)</li>
                  <li>After a fight: the winner is determined on subsequent turns</li>
                  <li>Winner of the round starts the next round</li>
                </ul>
              </section>

              <section className="mb-4">
                <h3 className="mb-3">9. Common House Rules</h3>
                <ul>
                  <li>No talking or signaling about cards</li>
                  <li>Fast play: 3–5 seconds per turn</li>
                  <li>Players always have 3–4 cards</li>
                  <li>Extra cards in hand are used only to form followers or twins as needed</li>
                </ul>
              </section>
            </div>
          </Card.Body>
        </Card>

        {/* Bottom Action Buttons */}
        <div className="text-center mt-4 d-flex flex-column flex-md-row gap-3 justify-content-center">
          <Button
            variant="primary"
            size="lg"
            onClick={handlePlayNow}
            style={{ minWidth: '200px' }}>
            Play Now
          </Button>
          <Button
            variant="outline-secondary"
            size="lg"
            onClick={handleBackToHome}
            style={{ minWidth: '200px' }}>
            Back to Home
          </Button>
        </div>
      </div>
    </Container>
  );
};

export default RulesPage;

