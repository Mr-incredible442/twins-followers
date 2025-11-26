import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/useGame';
import MainView from './lobby/MainView';
import PublicMatchView from './lobby/PublicMatchView';
import CreatePrivateView from './lobby/CreatePrivateView';
import JoinPrivateView from './lobby/JoinPrivateView';
import RoomLobbyView from './lobby/RoomLobbyView';

const Lobby = () => {
  const navigate = useNavigate();
  const {
    room,
    publicLobbies,
    createRoom,
    joinRoom,
    leaveRoom,
    getPublicLobbies,
    startGame,
    gameState,
  } = useGame();

  // View states: 'main', 'publicMatch', 'createPrivate', 'joinPrivate'
  const [currentView, setCurrentView] = useState('main');
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [error, setError] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState(null);

  // Prevent showing leave modal if we have an active game (should be on /game route)
  // This prevents the modal from showing when navigating from /game
  const shouldShowLeaveModal =
    showLeaveConfirm && !(gameState && room?.status === 'playing');

  useEffect(() => {
    if (!room) {
      getPublicLobbies();
    }
  }, [room, getPublicLobbies]);

  // Fetch public lobbies when entering public match view
  useEffect(() => {
    if (currentView === 'publicMatch' && !room) {
      getPublicLobbies();
    }
  }, [currentView, room, getPublicLobbies]);

  const handleCreatePrivateRoom = async () => {
    if (isLoading) return; // Prevent multiple clicks

    try {
      setIsLoading(true);
      setError('');
      if (!roomName.trim()) {
        setError('Room name is required');
        setIsLoading(false);
        return;
      }
      if (!password.trim()) {
        setError('Password is required for private rooms');
        setIsLoading(false);
        return;
      }
      await createRoom(roomName, true, password);
      setRoomName('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePublicRoom = async () => {
    if (isLoading) return; // Prevent multiple clicks

    try {
      setIsLoading(true);
      setError('');
      // Don't pass a name - backend will generate one automatically
      await createRoom(null, false, null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (roomId, roomPassword = null) => {
    if (isLoading || joiningRoomId) return; // Prevent multiple clicks

    try {
      setIsLoading(true);
      setJoiningRoomId(roomId);
      setError('');
      await joinRoom(roomId, roomPassword);
      setJoinRoomId('');
      setJoinPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setJoiningRoomId(null);
    }
  };

  const handleJoinPublicRoom = async (roomId) => {
    if (isLoading || joiningRoomId === roomId) return; // Prevent multiple clicks

    try {
      setIsLoading(true);
      setJoiningRoomId(roomId);
      setError('');
      await joinRoom(roomId, null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setJoiningRoomId(null);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await leaveRoom();
      setShowLeaveConfirm(false);
      setCurrentView('main');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartGame = () => {
    if (room && room.players.length >= room.minPlayers) {
      startGame();
    } else {
      setError(`Need at least ${room?.minPlayers || 2} players to start`);
    }
  };

  // If game is in progress, immediately redirect to /game route
  // This prevents the lobby from rendering and showing modals
  // Use a ref to track if we've already redirected to prevent multiple redirects
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (gameState && room?.status === 'playing' && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      // Use replace: true to prevent adding to history
      navigate('/game', { replace: true });
    } else if (!gameState || room?.status !== 'playing') {
      hasRedirectedRef.current = false;
    }
  }, [gameState, room?.status, navigate]);

  // If game is in progress, don't render anything (will redirect)
  // This early return prevents any rendering including modals
  if (gameState && room?.status === 'playing') {
    return null; // Will redirect to /game
  }

  // If in a room but game hasn't started, show room lobby
  if (room) {
    return (
      <RoomLobbyView
        room={room}
        error={error}
        showLeaveConfirm={showLeaveConfirm}
        shouldShowLeaveModal={shouldShowLeaveModal}
        onLeaveClick={() => setShowLeaveConfirm(true)}
        onLeaveConfirm={handleLeaveRoom}
        onLeaveCancel={() => setShowLeaveConfirm(false)}
        onStartGame={handleStartGame}
      />
    );
  }

  // Render based on current view
  switch (currentView) {
    case 'publicMatch':
      return (
        <PublicMatchView
          publicLobbies={publicLobbies}
          isLoading={isLoading}
          joiningRoomId={joiningRoomId}
          error={error}
          onBack={() => setCurrentView('main')}
          onJoinRoom={handleJoinPublicRoom}
          onCreateRoom={handleCreatePublicRoom}
          onRefresh={getPublicLobbies}
        />
      );
    case 'createPrivate':
      return (
        <CreatePrivateView
          roomName={roomName}
          password={password}
          error={error}
          isLoading={isLoading}
          onBack={() => setCurrentView('main')}
          onRoomNameChange={(e) => setRoomName(e.target.value)}
          onPasswordChange={(e) => setPassword(e.target.value)}
          onSubmit={handleCreatePrivateRoom}
        />
      );
    case 'joinPrivate':
      return (
        <JoinPrivateView
          joinRoomId={joinRoomId}
          joinPassword={joinPassword}
          error={error}
          isLoading={isLoading}
          onBack={() => setCurrentView('main')}
          onRoomIdChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
          onPasswordChange={(e) => setJoinPassword(e.target.value)}
          onSubmit={() => handleJoinRoom(joinRoomId, joinPassword || null)}
        />
      );
    default:
      return <MainView onNavigateToView={(view) => setCurrentView(view)} />;
  }
};

export default Lobby;
