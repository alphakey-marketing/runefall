import React from 'react';
import ReactDOM from 'react-dom/client';
import { PlayerProvider } from './context/PlayerContext.jsx';
import { GameProvider } from './context/GameContext.jsx';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GameProvider>
      <PlayerProvider>
        <App />
      </PlayerProvider>
    </GameProvider>
  </React.StrictMode>
);
