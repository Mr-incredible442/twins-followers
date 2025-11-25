const Card = ({ card, onClick, selected = false, disabled = false, isBack = false }) => {
  const getSuitSymbol = (suit) => {
    switch (suit) {
      case 'hearts':
        return '♥';
      case 'diamonds':
        return '♦';
      case 'clubs':
        return '♣';
      case 'spades':
        return '♠';
      default:
        return '';
    }
  };

  const getSuitColor = (suit) => {
    return suit === 'hearts' || suit === 'diamonds'
      ? 'text-danger'
      : 'text-dark';
  };

  // Card back style
  if (isBack || !card) {
    return (
      <div
        style={{
          width: '80px',
          height: '112px',
          border: '2px solid #fff',
          borderRadius: '8px',
          backgroundColor: '#1a1a1a',
          backgroundImage: 'repeating-linear-gradient(45deg, #1a1a1a, #1a1a1a 10px, #2a2a2a 10px, #2a2a2a 20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          cursor: 'default',
          transition: 'all 0.2s ease',
        }}>
        <span style={{ color: '#fff', fontSize: '32px', opacity: 0.7 }}>🂠</span>
      </div>
    );
  }

  const cardStyle = {
    width: '80px',
    height: '112px',
    border: selected ? '3px solid #007bff' : '1px solid #ccc',
    borderRadius: '8px',
    padding: '8px',
    margin: '0',
    cursor: disabled || !onClick ? 'default' : 'pointer',
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: selected
      ? '0 0 15px rgba(0,123,255,0.7), 0 4px 8px rgba(0,0,0,0.2)'
      : '0 2px 4px rgba(0,0,0,0.1)',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.2s ease',
    transform: selected ? 'scale(1.05)' : 'scale(1)',
  };

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(card);
    }
  };

  const handleMouseEnter = (e) => {
    if (!disabled && onClick) {
      e.currentTarget.style.transform = 'scale(1.1) translateY(-5px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,123,255,0.4)';
      e.currentTarget.style.zIndex = '999';
    }
  };

  const handleMouseLeave = (e) => {
    if (!selected) {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.boxShadow = selected
        ? '0 0 15px rgba(0,123,255,0.7), 0 4px 8px rgba(0,0,0,0.2)'
        : '0 2px 4px rgba(0,0,0,0.1)';
      e.currentTarget.style.zIndex = 'auto';
    } else {
      e.currentTarget.style.transform = 'scale(1.05)';
    }
  };

  return (
    <div
      style={cardStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className='card-component'>
      <div className={`fw-bold ${getSuitColor(card.suit)}`}>
        <div>{card.value}</div>
        <div style={{ fontSize: '20px' }}>{getSuitSymbol(card.suit)}</div>
      </div>
      <div
        className={`text-end ${getSuitColor(card.suit)}`}
        style={{ fontSize: '14px' }}>
        <div>{getSuitSymbol(card.suit)}</div>
        <div>{card.value}</div>
      </div>
    </div>
  );
};

export default Card;
