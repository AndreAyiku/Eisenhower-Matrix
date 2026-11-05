let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    if (typeof AudioContext === "undefined") return null;
    if (!ctx) ctx = new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

/** Call from a tap, so the browser allows sound later. */
export function unlockSound(): void {
  const c = getContext();
  if (c && c.state === "suspended") void c.resume();
}

export function playChime(): void {
  const c = getContext();
  if (!c) return;
  try {
    if (c.state === "suspended") void c.resume();
    const now = c.currentTime;
    [880, 1175].forEach((freq, i) => {
      const start = now + i * 0.22;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(start);
      osc.stop(start + 0.65);
    });
  } catch {
    // sound unavailable
  }
}