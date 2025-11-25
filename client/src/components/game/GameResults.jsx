import { useState } from 'react';
import {
  Button,
  Container,
  Alert,
  Badge,
  Row,
  Col,
  Card,
} from 'react-bootstrap';
import CardComponent from '../Card';

const GameResults = ({
  gameState,
  room,
  playerName,
  socketId,
  restartGame,
  leaveRoom,
}) => {
  const [error, setError] = useState('');
  // Calculate game duration
  const gameStartTime = gameState.createdAt
    ? new Date(gameState.createdAt)
    : new Date();
  const gameEndTime = new Date();
  const durationMs = gameEndTime - gameStartTime;
  const durationSeconds = Math.floor(durationMs / 1000);
  const durationMinutes = Math.floor(durationSeconds / 60);
  const durationDisplay =
    durationMinutes > 0
      ? `${durationMinutes}m ${durationSeconds % 60}s`
      : `${durationSeconds}s`;

  // Estimate number of turns (each player takes turns, estimate based on deck size)
  // Starting deck: 52 cards, 3 cards per player = 52 - (players * 3)
  // Each turn draws 1 card, so turns ≈ (52 - (players * 3) - remainingDeck) / players
  const startingDeckSize = 52;
  const cardsDealt = gameState.players.length * 3;
  const remainingDeck = gameState.deck?.length || 0;
  const cardsDrawn = startingDeckSize - cardsDealt - remainingDeck;
  const estimatedTurns = Math.max(
    1,
    Math.ceil(cardsDrawn / gameState.players.length),
  );

  // Count fights (check message for "Fight!")
  const fightCount = gameState.message?.includes('Fight!') ? 1 : 0;

  // Calculate statistics
  const totalCardsDrawn = cardsDrawn;
  const discardPileSize = gameState.discardPile?.length || 0;
  const deckSize = gameState.deck?.length || 0;

  return (
    <Container className='mt-4'>
      <div className='d-flex justify-content-center'>
        <div style={{ maxWidth: '1000px', width: '100%' }}>
          <div className='text-center mb-4'>
            <h2 className='mb-2'>🎉 Game Over! 🎉</h2>
            <h4 className='mb-4 text-muted'>Room: {room.name}</h4>

            {/* Game Statistics */}
            <div className='mb-4'>
              <Row className='g-3'>
                <Col md={3} sm={6}>
                  <Card className='h-100'>
                    <Card.Body className='text-center'>
                      <Card.Title className='fs-6 text-muted'>
                        Duration
                      </Card.Title>
                      <Card.Text className='fs-4 fw-bold'>
                        {durationDisplay}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3} sm={6}>
                  <Card className='h-100'>
                    <Card.Body className='text-center'>
                      <Card.Title className='fs-6 text-muted'>
                        Total Turns
                      </Card.Title>
                      <Card.Text className='fs-4 fw-bold'>
                        {estimatedTurns}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3} sm={6}>
                  <Card className='h-100'>
                    <Card.Body className='text-center'>
                      <Card.Title className='fs-6 text-muted'>
                        Cards Drawn
                      </Card.Title>
                      <Card.Text className='fs-4 fw-bold'>
                        {totalCardsDrawn}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3} sm={6}>
                  <Card className='h-100'>
                    <Card.Body className='text-center'>
                      <Card.Title className='fs-6 text-muted'>
                        Fights
                      </Card.Title>
                      <Card.Text className='fs-4 fw-bold'>
                        {fightCount}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              <Row className='g-3 mt-2'>
                <Col md={6}>
                  <Card className='h-100'>
                    <Card.Body className='text-center'>
                      <Card.Title className='fs-6 text-muted'>
                        Remaining Deck
                      </Card.Title>
                      <Card.Text className='fs-4 fw-bold'>
                        {deckSize} cards
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className='h-100'>
                    <Card.Body className='text-center'>
                      <Card.Title className='fs-6 text-muted'>
                        Discard Pile
                      </Card.Title>
                      <Card.Text className='fs-4 fw-bold'>
                        {discardPileSize} cards
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </div>

            {/* Players and Their Hands */}
            <div className='mb-4'>
              <h5 className='mb-3'>Players & Final Hands:</h5>
              <Row className='g-3'>
                {gameState.players.map((player) => {
                  const isMe =
                    player.playerName === playerName ||
                    player.socketId === socketId;
                  const isWinner =
                    player.socketId === gameState.winner.socketId;
                  return (
                    <Col key={player.socketId} md={6} lg={4}>
                      <Card
                        className={`h-100 ${
                          isWinner ? 'border-success border-3' : ''
                        }`}>
                        <Card.Header
                          className={`d-flex justify-content-between align-items-center ${
                            isWinner ? 'bg-success text-white' : ''
                          }`}>
                          <div className='d-flex align-items-center gap-2'>
                            <span className='fw-bold'>{player.playerName}</span>
                            {isMe && <Badge bg='primary'>You</Badge>}
                            {isWinner && <span>🏆</span>}
                          </div>
                          {isWinner && (
                            <Badge bg='light' text='dark'>
                              Winner
                            </Badge>
                          )}
                        </Card.Header>
                        <Card.Body>
                          <div className='mb-2'>
                            <small className='text-muted'>
                              Cards: {player.hand?.length || 0}
                            </small>
                          </div>
                          <div className='d-flex flex-wrap gap-2 justify-content-center'>
                            {player.hand && player.hand.length > 0 ? (
                              player.hand.map((card, idx) => (
                                <CardComponent
                                  key={`${player.socketId}-card-${idx}`}
                                  card={card}
                                  disabled
                                />
                              ))
                            ) : (
                              <span className='text-muted'>No cards</span>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </div>

            {/* Win Message */}
            {gameState.message && (
              <Alert variant='info' className='mb-4'>
                {gameState.message}
              </Alert>
            )}

            {error && (
              <Alert variant='danger' className='mb-4' dismissible onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <div className='d-flex gap-3 justify-content-center'>
              <Button
                variant='primary'
                size='lg'
                onClick={async () => {
                  try {
                    setError('');
                    await restartGame();
                  } catch (err) {
                    setError(err.message || 'Failed to restart game');
                  }
                }}>
                Restart Game
              </Button>
              <Button
                variant='secondary'
                size='lg'
                onClick={async () => {
                  try {
                    await leaveRoom();
                  } catch (error) {
                    console.error('Failed to leave room:', error);
                  }
                }}>
                Go to Lobby
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default GameResults;
