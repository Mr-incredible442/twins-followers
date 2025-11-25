import { useState } from 'react';

const useGameHandlers = (isMyTurn, gamePhase, drawCard, discardCard, leaveRoom) => {
  const [selectedCard, setSelectedCard] = useState(null);

  const handleCardClick = (card) => {
    if (isMyTurn && gamePhase === 'discard') {
      setSelectedCard(card);
    }
  };

  const handleDrawCard = () => {
    if (isMyTurn && gamePhase === 'draw') {
      drawCard();
    }
  };

  const handleDrawPileClick = () => {
    if (isMyTurn && gamePhase === 'draw') {
      drawCard();
    }
  };

  const handleDiscardCard = () => {
    if (isMyTurn && gamePhase === 'discard' && selectedCard) {
      discardCard(selectedCard);
      setSelectedCard(null);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await leaveRoom();
    } catch (error) {
      console.error('Failed to leave room:', error);
    }
  };

  return {
    selectedCard,
    setSelectedCard,
    handleCardClick,
    handleDrawCard,
    handleDrawPileClick,
    handleDiscardCard,
    handleLeaveRoom,
  };
};

export default useGameHandlers;

