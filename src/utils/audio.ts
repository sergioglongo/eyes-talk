export const playChime = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Pleasant double-tone chime (D5 -> A5)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); 
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.error('Audio play error:', e);
  }
};
