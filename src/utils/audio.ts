type AudioCtor = typeof AudioContext;

// Un único AudioContext reutilizado para toda la sesión. Antes se creaba uno
// nuevo en cada chime y nunca se cerraba: los navegadores limitan la cantidad de
// contextos vivos, así que después de un rato new AudioContext() empezaba a
// fallar y el chime dejaba de sonar.
let ctx: AudioContext | null = null;

const getContext = (): AudioContext | null => {
  if (ctx) return ctx;

  const Ctor: AudioCtor | undefined =
    window.AudioContext || (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;

  if (!Ctor) return null;

  ctx = new Ctor();
  return ctx;
};

// Varios componentes reaccionan al mismo parpadeo (el DwellButton y el handler
// de zona de la página, por ejemplo), así que colapsamos los chimes que caen
// dentro de la misma ventana para que se escuche uno solo.
const CHIME_THROTTLE_MS = 150;
let lastChimeAt = 0;

export const playChime = () => {
  const now = Date.now();
  if (now - lastChimeAt < CHIME_THROTTLE_MS) return;
  lastChimeAt = now;

  try {
    const audio = getContext();
    if (!audio) return;

    // Si el navegador suspendió el contexto (autoplay policy), reanudarlo.
    if (audio.state === 'suspended') void audio.resume();

    const osc = audio.createOscillator();
    const gain = audio.createGain();

    // Pleasant double-tone chime (D5 -> A5)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audio.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(audio.destination);

    osc.start();
    osc.stop(audio.currentTime + 0.2);

    // Liberar los nodos al terminar para no acumularlos en el grafo.
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  } catch (e) {
    console.error('Audio play error:', e);
  }
};
