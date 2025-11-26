import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useGame } from '../context/useGame';
import NameEntry from './NameEntry';

/**
 * Protected route that requires a player name
 * Shows name entry modal if name is missing
 */
const ProtectedRoute = ({ children }) => {
  const { playerName, setPlayerName } = useGame();
  const [showNameEntry, setShowNameEntry] = useState(false);
  const [checkingName, setCheckingName] = useState(true);

  useEffect(() => {
    const savedName = localStorage.getItem('playerName');
    if (savedName && savedName.trim().length > 0) {
      setPlayerName(savedName);
      setShowNameEntry(false);
    } else {
      setShowNameEntry(true);
    }
    setCheckingName(false);
  }, [setPlayerName]);

  const handleNameSubmit = (name) => {
    setPlayerName(name);
    setShowNameEntry(false);
  };

  if (checkingName) {
    return null; // Wait while checking localStorage
  }

  if (showNameEntry) {
    return (
      <>
        {children}
        <NameEntry onSubmit={handleNameSubmit} />
      </>
    );
  }

  return children;
};

export default ProtectedRoute;

