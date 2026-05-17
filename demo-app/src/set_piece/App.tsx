import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { FunctionSpaceProvider, useAuth } from '@functionspace/react';
import { setPieceConfig, setPieceTheme } from './theme';
import { RoundProvider } from './state/RoundContext';
import MarketList from './routes/MarketList';
import Stake from './routes/Stake';
import Game from './routes/Game';
import MyCalls from './routes/MyCalls';
import { Grainient } from './components/Grainient';
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
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
        }}
      >
        <Grainient
          color1="#d6d6d6"
          color2="#dae9c2"
          color3="#618f80"
          warpSpeed={0.8}
          grainAmount={0.06}
          blendAngle={52}
          noiseScale={1.95}
          saturation={1.6}
          zoom={1.1}
          timeSpeed={0.8}
        />
      </div>
      <RoundProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </RoundProvider>
    </FunctionSpaceProvider>
  );
}

function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<MarketList />} />
        <Route path="/m/:marketId/stake" element={<Stake />} />
        <Route path="/m/:marketId/play" element={<Game />} />
        <Route path="/calls" element={<MyCalls />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
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
