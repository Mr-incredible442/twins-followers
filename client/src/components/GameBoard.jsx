import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { useGame } from '../context/useGame';
import FightModal from './modals/FightModal';
import LeaveRoomModal from './modals/LeaveRoomModal';
import GamePausedModal from './modals/GamePausedModal';
import GameResults from './game/GameResults';
import PlayerPosition from './game/PlayerPosition';
import CenterPiles from './game/CenterPiles';
import GameHeader from './game/GameHeader';
import ActionBar from './game/ActionBar';
import GameMessage from './game/GameMessage';
import TurnTimer from './game/TurnTimer';
import useWindowSize from '../hooks/useWindowSize';
import useTableRadius from '../hooks/useTableRadius';
import usePulseGlow from '../hooks/usePulseGlow';
import useFightModal from '../hooks/useFightModal';
import useGameHandlers from '../hooks/useGameHandlers';
import {
  calculatePlayerPositions,
  getPlayerPosition,
} from '../utils/gameUtils';
import './GameBoard.css';

const GameBoard = () => {
  const {
    gameState,
    room,
    socketId,
    playerName,
    drawCard,
    discardCard,
    leaveRoom,
    restartGame,
    gamePaused,
    pausedReason,
    disconnectedPlayers,
    isDecisionMaker,
    continueGameAfterDisconnect,
    endGameAfterDisconnect,
  } = useGame();

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const windowSize = useWindowSize();
  const tableRadius = useTableRadius(windowSize);
  const pulseGlow = usePulseGlow(gameState, socketId, playerName);
  const showFightModal = useFightModal(gameState?.fightData);

  // Find current player and my player
  const currentPlayer = gameState?.players?.find(
    (p) =>
      p.socketId === gameState.currentPlayerSocketId ||
      p.playerName ===
        gameState.players?.find(
          (p2) => p2.socketId === gameState.currentPlayerSocketId,
        )?.playerName,
  );

  const isMyTurn =
    gameState?.currentPlayerSocketId === socketId ||
    gameState?.players?.find(
      (p) => p.socketId === gameState.currentPlayerSocketId,
    )?.playerName === playerName;

  const {
    selectedCard,
    handleCardClick,
    handleDrawCard,
    handleDrawPileClick,
    handleDiscardCard,
    handleLeaveRoom,
  } = useGameHandlers(
    isMyTurn && !gamePaused, // Disable if paused
    gameState?.phase,
    drawCard,
    discardCard,
    leaveRoom,
  );

  if (!gameState || !room || !socketId) {
    return null;
  }

  // Show winner screen if game is over
  if (gameState.winner) {
    return (
      <GameResults
        gameState={gameState}
        room={room}
        playerName={playerName}
        socketId={socketId}
        restartGame={restartGame}
        leaveRoom={leaveRoom}
      />
    );
  }

  // Calculate player positions
  const playerPositions = calculatePlayerPositions(
    gameState.players,
    playerName,
    socketId,
  );

  const handleLeaveRoomClick = () => {
    setShowLeaveConfirm(true);
  };

  const handleLeaveRoomConfirm = async () => {
    await handleLeaveRoom();
    setShowLeaveConfirm(false);
  };

  return (
    <Container
      fluid
      className='game-table-container'
      style={{
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden',
        padding: '0',
        margin: '0',
      }}>
      {/* Header */}
      <GameHeader
        roomName={room.name}
        isMyTurn={isMyTurn}
        currentPlayerName={currentPlayer?.playerName}
        gamePhase={gameState.phase}
        windowWidth={windowSize.width}
        onLeaveRoom={handleLeaveRoomClick}
      />

      {/* Circular Table */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${tableRadius * 2}px`,
          height: `${tableRadius * 2}px`,
          borderRadius: '50%',
          border:
            windowSize.width < 768 ? '2px solid #4a5568' : '4px solid #4a5568',
          boxShadow: '0 0 30px rgba(0,0,0,0.5), inset 0 0 50px rgba(0,0,0,0.3)',
          boxSizing: 'border-box',
        }}
        className='game-table'>
        {/* Center Area - Draw Pile and Discard Pile */}
        <CenterPiles
          isMyTurn={isMyTurn && !gamePaused}
          gamePhase={gameState.phase}
          deckSize={gameState.deck?.length}
          lastDiscard={gameState.lastDiscard}
          onDrawPileClick={handleDrawPileClick}
        />

        {/* Players positioned around circle */}
        {playerPositions.map(({ player, angle, isMe }) => {
          const position = getPlayerPosition(angle, tableRadius);
          const isCurrentTurn =
            player.socketId === gameState.currentPlayerSocketId ||
            gameState.players.find(
              (p) => p.socketId === gameState.currentPlayerSocketId,
            )?.playerName === player.playerName;
          const isMePlayer = isMe;
          const isFighting = gameState.fightData?.fightParticipants?.includes(
            player.playerName,
          );

          return (
            <PlayerPosition
              key={player.socketId}
              player={player}
              position={position}
              isCurrentTurn={isCurrentTurn}
              isMePlayer={isMePlayer}
              isFighting={isFighting}
              pulseGlow={pulseGlow}
              isMyTurn={isMyTurn && !gamePaused}
              gamePhase={gameState.phase}
              onCardClick={handleCardClick}
              selectedCard={selectedCard}
            />
          );
        })}
      </div>

      {/* Floating Action Bar */}
      <ActionBar
        isMyTurn={isMyTurn && !gamePaused}
        gamePhase={gameState.phase}
        selectedCard={selectedCard}
        onDrawCard={handleDrawCard}
        onDiscardCard={handleDiscardCard}
      />

      {/* Game Message */}
      <GameMessage message={gameState.message} />

      {/* Turn Timer - visible to all players */}
      <TurnTimer
        turnStartTime={gameState.turnStartTime}
        turnTimeLimit={gameState.turnTimeLimit || 30}
        currentPlayerSocketId={gameState.currentPlayerSocketId}
        socketId={socketId}
        isPaused={gamePaused}
        hasFightData={!!gameState.fightData}
      />

      {/* Fight Modal */}
      <FightModal
        show={showFightModal}
        onHide={() => {
          // Modal auto-dismisses, but allow manual close
        }}
        fightData={gameState.fightData}
        playerName={playerName}
      />

      {/* Leave Room Confirmation Modal */}
      <LeaveRoomModal
        show={showLeaveConfirm}
        onHide={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeaveRoomConfirm}
        gamePhase={gameState.phase}
      />

      {/* Game Paused Modal */}
      <GamePausedModal
        show={gamePaused}
        pausedReason={pausedReason}
        disconnectedPlayers={disconnectedPlayers}
        isDecisionMaker={isDecisionMaker}
        onContinue={async () => {
          try {
            await continueGameAfterDisconnect();
          } catch (error) {
            console.error('Failed to continue game:', error);
          }
        }}
        onEnd={async () => {
          try {
            await endGameAfterDisconnect();
          } catch (error) {
            console.error('Failed to end game:', error);
          }
        }}
      />
    </Container>
  );
};

export default GameBoard;
