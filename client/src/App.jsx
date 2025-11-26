import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { GameProvider } from './context/GameContext';
import LandingPage from './components/LandingPage';
import RulesPage from './components/RulesPage';
import Lobby from './components/Lobby';
import GameRoute from './components/GameRoute';
import ProtectedRoute from './components/ProtectedRoute';
import NavigationBlocker from './components/NavigationBlocker';

function App() {
  return (
    <SocketProvider>
      <GameProvider>
        <BrowserRouter>
          <NavigationBlocker />
          <div className="container-fluid">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route
                path="/lobby"
                element={
                  <ProtectedRoute>
                    <Lobby />
                  </ProtectedRoute>
                }
              />
              <Route path="/game" element={<GameRoute />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </GameProvider>
    </SocketProvider>
  );
}

export default App;
