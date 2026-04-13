class AudioManagerClass {
  constructor() {
    this._muted = false;
    this._volume = 0.5;
    this._ctx = null;
  }

  _getCtx() {
    if (!this._ctx) {
      try { this._ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    return this._ctx;
  }

  setMuted(muted) { this._muted = muted; }
  setVolume(v) { this._volume = Math.max(0, Math.min(1, v)); }

  playTone(frequency, duration, type = 'sine', volume = 1) {
    if (this._muted) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      gainNode.gain.setValueAtTime(this._volume * volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch(e) {}
  }

  play(event) {
    const sounds = {
      skillFire:     () => this.playTone(440, 0.15, 'triangle'),
      hit:           () => this.playTone(220, 0.1, 'sawtooth'),
      critHit:       () => { this.playTone(660, 0.1, 'triangle'); this.playTone(880, 0.1, 'sine'); },
      enemyDie:      () => this.playTone(110, 0.3, 'sawtooth', 0.4),
      levelUp:       () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.playTone(f, 0.2, 'sine'), i * 100)),
      lootDrop:      () => this.playTone(784, 0.15, 'sine', 0.5),
      legendaryDrop: () => [523, 659, 784].forEach((f, i) => setTimeout(() => this.playTone(f, 0.3, 'sine'), i * 150)),
      playerDeath:   () => this.playTone(80, 1.5, 'sawtooth', 0.3),
      keystoneAlloc: () => this.playTone(200, 0.8, 'sine', 0.6),
      nodeAlloc:     () => this.playTone(600, 0.1, 'sine', 0.3),
    };
    if (sounds[event]) sounds[event]();
  }
}

export const AudioManager = new AudioManagerClass();
