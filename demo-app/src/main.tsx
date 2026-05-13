import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// ── Set Piece (competition build) ──
import App from './set_piece/App';

// ── Original starter kits (commented out; swap any to compare) ──
// import App from './App_BasicTradingLayout';
// import App from './App_ShapeCutterTradingLayout';
// import App from './App_BinaryPanel';
// import App from './App_TimelineBinaryTradingLayout';
// import App from './App_DistRange';
// import App from './App_CustomShapeLayout';
// import App from './App_AllComponents';
// import App from './App_StarterKitCapture';
// import App from './App_MarketDiscovery';
// import App from './App_MarketOverlay';
// import App from './App_MarketDiscoveryRouted';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
