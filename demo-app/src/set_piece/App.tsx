import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FunctionSpaceProvider, useAuth } from '@functionspace/react';
import { setPieceConfig, setPieceTheme } from './theme';
import { RoundProvider } from './state/RoundContext';
import MarketList from './routes/MarketList';
import Stake from './routes/Stake';
import Game from './routes/Game';
import MyCalls from './routes/MyCalls';
import './styles.css';

const STORED_USERNAME_KEY = 'set_piece:username';

const initialStoredUsername =
  typeof window === 'undefined' ? null : window.localStorage.getItem(STORED_USERNAME_KEY);

/**
 * Set Piece — entry point.
 * - Opens in guest mode; auth is gated on trade attempt (task #8).
 * - Routing is intentionally flat: market list → stake → play → confirm.
 */
export default function App() {
  return (
    <FunctionSpaceProvider
      config={setPieceConfig}
      theme={setPieceTheme}
      storedUsername={initialStoredUsername}
    >
      <AuthPersistence />
      <RoundProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MarketList />} />
            <Route path="/m/:marketId/stake" element={<Stake />} />
            <Route path="/m/:marketId/play" element={<Game />} />
            <Route path="/calls" element={<MyCalls />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </RoundProvider>
    </FunctionSpaceProvider>
  );
}

function AuthPersistence() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    if (user) {
      window.localStorage.setItem(STORED_USERNAME_KEY, user.username);
    } else {
      window.localStorage.removeItem(STORED_USERNAME_KEY);
    }
  }, [user, loading]);
  return null;
}
