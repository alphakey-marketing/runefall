import React from 'react';
import { useGame } from '../context/GameContext.jsx';
import { usePlayer } from '../context/PlayerContext.jsx';
import trialsData from '../data/trials.json';
import './TrialResultScreen.css';

function getRewardTier(totalDamage, parScore) {
  const ratio = totalDamage / parScore;
  if (ratio >= 4) return { tier: 'diamond', icon: '💎', color: '#88eeff', dust: 1000, skin: true };
  if (ratio >= 2) return { tier: 'gold', icon: '🥇', color: '#ffd700', dust: 500, skin: false };
  if (ratio >= 1) return { tier: 'silver', icon: '🥈', color: '#c0c0c0', dust: 250, skin: false };
  return { tier: 'bronze', icon: '🥉', color: '#cd7f32', dust: 100, skin: false };
}

export default function TrialResultScreen() {
  const { state: gameState, dispatch: gameDispatch } = useGame();
  const { dispatch: playerDispatch } = usePlayer();

  const trial = trialsData.find(t => t.id === gameState.trialId);
  const totalDamage = gameState.trialTotalDamage;
  const parScore = trial?.parScore || 1000;
  const reward = getRewardTier(totalDamage, parScore);

  const handleClaim = () => {
    playerDispatch({ type: 'ADD_RUNE_DUST', amount: reward.dust });
    if (reward.skin) {
      playerDispatch({ type: 'UNLOCK_SKIN', skinId: `trial_${gameState.trialId}_diamond` });
    }
    gameDispatch({ type: 'RESET_TRIAL' });
    gameDispatch({ type: 'NAVIGATE', screen: 'dungeon' });
  };

  if (!trial) {
    return (
      <div className="trial-result-screen">
        <h2 className="screen-title">⚔️ Trial Complete</h2>
        <p style={{ color: '#9980cc', textAlign: 'center' }}>No trial data found.</p>
        <button className="claim-btn" onClick={() => { gameDispatch({ type: 'RESET_TRIAL' }); gameDispatch({ type: 'NAVIGATE', screen: 'dungeon' }); }}>Return</button>
      </div>
    );
  }

  return (
    <div className="trial-result-screen">
      <h2 className="screen-title">⚔️ Trial Complete</h2>
      <div className="trial-result-name">{trial.name}</div>

      <div className="trial-result-card" style={{ '--reward-color': reward.color }}>
        <div className="trial-reward-icon">{reward.icon}</div>
        <div className="trial-reward-tier">{reward.tier.toUpperCase()}</div>
        <div className="trial-damage-info">
          <div>Total Damage: <strong>{totalDamage.toLocaleString()}</strong></div>
          <div>Par Score: <strong>{parScore.toLocaleString()}</strong></div>
          <div>Score Ratio: <strong>{(totalDamage / parScore).toFixed(2)}×</strong></div>
        </div>
        <div className="trial-dust-reward">🔮 +{reward.dust} Rune Dust</div>
        {reward.skin && <div className="trial-skin-reward">✨ Diamond Skin Unlocked!</div>}
      </div>

      <button className="claim-btn" onClick={handleClaim}>
        Claim Reward & Return
      </button>
    </div>
  );
}
