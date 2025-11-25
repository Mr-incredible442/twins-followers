import { useState, useEffect } from 'react';
import { SocketProvider } from './context/SocketContext';
import { GameProvider } from './context/GameContext';
import { useGame } from './context/useGame';
import NameEntry from './components/NameEntry';
import Lobby from './components/Lobby';

const AppContent = () => {
  const { playerName, setPlayerName } = useGame();
  const [nameSet, setNameSet] = useState(false);
  const [checkingName, setCheckingName] = useState(true);

  // Check localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem('playerName');
    if (savedName && savedName.trim().length > 0) {
      setPlayerName(savedName);
      setNameSet(true);
    }
    setCheckingName(false);
  }, [setPlayerName]);

  const handleNameSubmit = (name) => {
    setPlayerName(name);
    setNameSet(true);
  };

  if (checkingName) {
    return null; // Wait while checking localStorage
  }

  if (!nameSet) {
    return <NameEntry onSubmit={handleNameSubmit} />;
  }

  return <Lobby />;
};

function App() {
  return (
    <SocketProvider>
      <GameProvider>
        <div className="container-fluid">
          <AppContent />
        </div>
      </GameProvider>
    </SocketProvider>
  );
}

export default App;
