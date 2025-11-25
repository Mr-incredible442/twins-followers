import CardComponent from '../Card';

const FannedCards = ({
  cards,
  isMyHand = false,
  isMyTurn = false,
  gamePhase,
  onCardClick,
  selectedCard,
}) => {
  if (!cards || cards.length === 0) {
    // Show placeholder for empty hand
    return (
      <div
        style={{
          height: '112px',
          width: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: '12px',
        }}>
        No cards
      </div>
    );
  }

  const cardCount = cards.length;
  const isDiscardPhase = isMyHand && isMyTurn && gamePhase === 'discard';

  // If it's discard phase and player's turn, display cards side-by-side (not fanned)
  if (isDiscardPhase) {
    return (
      <div
        style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          maxWidth: '600px',
        }}>
        {cards.map((card, index) => (
          <div
            key={`${card?.value || 'back'}-${card?.suit || 'back'}-${index}`}
            style={{
              transition: 'all 0.3s ease',
            }}
            className='fanned-card'>
            <CardComponent
              card={card}
              onClick={onCardClick}
              selected={
                selectedCard &&
                selectedCard.value === card.value &&
                selectedCard.suit === card.suit
              }
              disabled={false}
            />
          </div>
        ))}
      </div>
    );
  }

  // Otherwise, use fanned layout
  const fanAngle = Math.min(cardCount * 3, 30); // Max 30 degree fan
  const startAngle = -fanAngle / 2;
  const baseOffset = 18; // Reduced spacing to make hands more compact

  return (
    <div
      style={{
        position: 'relative',
        height: isMyHand ? '140px' : '120px',
        width: `${Math.max(cardCount * baseOffset + 60, 100)}px`,
        overflow: 'visible', // Allow cards to be visible even if they extend slightly
      }}>
      {cards.map((card, index) => {
        const angle =
          cardCount > 1
            ? startAngle + (fanAngle / (cardCount - 1)) * index
            : 0;
        const rotation = angle;
        const xOffset = Math.sin((angle * Math.PI) / 180) * 12; // Reduced offset
        const zIndex = isMyHand ? cardCount - index : index;

        return (
          <div
            key={`${card?.value || 'back'}-${card?.suit || 'back'}-${index}`}
            style={{
              position: 'absolute',
              left: `${index * baseOffset}px`,
              transform: `rotate(${rotation}deg) translateX(${xOffset}px)`,
              transformOrigin: 'center bottom',
              zIndex,
              transition: 'all 0.3s ease',
            }}
            className='fanned-card'>
            {isMyHand ? (
              <CardComponent
                card={card}
                onClick={onCardClick}
                selected={
                  selectedCard &&
                  selectedCard.value === card.value &&
                  selectedCard.suit === card.suit
                }
                disabled={!isMyTurn || gamePhase !== 'discard'}
              />
            ) : (
              <CardComponent card={null} isBack={true} disabled />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FannedCards;

