import { useState } from 'react';
import { Card, Button } from 'react-bootstrap';

/**
 * Reusable game mode card component
 * @param {string} emoji - Emoji icon for the card
 * @param {string} title - Card title
 * @param {string} description - Card description text
 * @param {string} buttonVariant - Bootstrap variant for button
 * @param {string} buttonLabel - Button text
 * @param {Function} onClick - Click handler for the card/button
 */
const GameModeCard = ({
  emoji,
  title,
  description,
  buttonVariant = 'primary',
  buttonLabel,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      className='h-100 text-center'
      style={{
        cursor: 'pointer',
        transition: 'transform 0.2s',
        transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      <Card.Body className='d-flex flex-column'>
        <div style={{ fontSize: '48px', marginBottom: '1rem' }}>{emoji}</div>
        <Card.Title>{title}</Card.Title>
        <Card.Text className='text-muted'>{description}</Card.Text>
        <Button
          variant={buttonVariant}
          className='mt-auto'
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}>
          {buttonLabel}
        </Button>
      </Card.Body>
    </Card>
  );
};

export default GameModeCard;

