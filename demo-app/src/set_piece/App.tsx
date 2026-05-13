import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FunctionSpaceProvider } from '@functionspace/react';
import { setPieceConfig, setPieceTheme } from './theme';
import { RoundProvider } from './state/RoundContext';
import MarketList from './routes/MarketList';
import Stake from './routes/Stake';
import Game from './routes/Game';
import Confirm from './routes/Confirm';
import MyCalls from './routes/MyCalls';
import './styles.css';

/**
 * Set Piece — entry point.
 * - Opens in guest mode; auth is gated on trade attempt (task #8).
 * - Routing is intentionally flat: market list → stake → play → confirm.
 */
export default function App() {
  return (
    <FunctionSpaceProvider config={setPieceConfig} theme={setPieceTheme}>
      <RoundProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MarketList />} />
            <Route path="/m/:marketId/stake" element={<Stake />} />
            <Route path="/m/:marketId/play" element={<Game />} />
            <Route path="/m/:marketId/confirm" element={<Confirm />} />
            <Route path="/calls" element={<MyCalls />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </RoundProvider>
    </FunctionSpaceProvider>
  );
}
