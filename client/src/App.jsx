import { useState, useEffect } from 'react';
import { SocketProvider } from './context/SocketContext';
import { GameProvider } from './context/GameContext';
import { useGame } from './context/useGame';
import NameEntry from './components/NameEntry';
import LandingPage from './components/LandingPage';
import RulesPage from './components/RulesPage';
import Lobby from './components/Lobby';

const AppContent = () => {
  const { playerName, setPlayerName } = useGame();
  const [currentPage, setCurrentPage] = useState('landing'); // 'landing' | 'rules' | 'lobby'
  const [showNameEntry, setShowNameEntry] = useState(false);
  const [checkingName, setCheckingName] = useState(true);

  // Check localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem('playerName');
    if (savedName && savedName.trim().length > 0) {
      setPlayerName(savedName);
    }
    setCheckingName(false);
  }, [setPlayerName]);

  const handleNameSubmit = (name) => {
    setPlayerName(name);
    setShowNameEntry(false);
    // After name is set, go to lobby
    setCurrentPage('lobby');
  };

  const handlePlayNow = () => {
    // Check if player has a name
    if (!playerName || playerName.trim().length === 0) {
      // Show name entry modal
      setShowNameEntry(true);
    } else {
      // Go directly to lobby
      setCurrentPage('lobby');
    }
  };

  const handleViewRules = () => {
    setCurrentPage('rules');
  };

  const handleBackToHome = () => {
    setCurrentPage('landing');
  };

  if (checkingName) {
    return null; // Wait while checking localStorage
  }

  // Show name entry modal if needed
  if (showNameEntry) {
    return (
      <>
        {currentPage === 'landing' && <LandingPage onPlayNow={handlePlayNow} onViewRules={handleViewRules} />}
        {currentPage === 'rules' && <RulesPage onPlayNow={handlePlayNow} onBackToHome={handleBackToHome} />}
        <NameEntry onSubmit={handleNameSubmit} />
      </>
    );
  }

  // Render current page
  if (currentPage === 'landing') {
    return <LandingPage onPlayNow={handlePlayNow} onViewRules={handleViewRules} />;
  }

  if (currentPage === 'rules') {
    return <RulesPage onPlayNow={handlePlayNow} onBackToHome={handleBackToHome} />;
  }

  // currentPage === 'lobby'
  return <Lobby onNavigateToHome={() => setCurrentPage('landing')} />;
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
