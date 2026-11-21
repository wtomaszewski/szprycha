/** Short local ring. The notice remains visible when audio is unavailable. */
export class PhoneRing {
  private context?: AudioContext;

  play() {
    if (typeof AudioContext === 'undefined') return;
    const context = (this.context ??= new AudioContext());
    const start = () => {
      if (context.state !== 'running') return;
      const tone = context.createOscillator();
      const gain = context.createGain();
      const at = context.currentTime;
      tone.type = 'sine';
      tone.frequency.setValueAtTime(660, at);
      tone.frequency.setValueAtTime(880, at + 0.22);
      gain.gain.setValueAtTime(0, at);
      for (const delay of [0, 0.22]) {
        gain.gain.linearRampToValueAtTime(0.045, at + delay + 0.02);
        gain.gain.linearRampToValueAtTime(0, at + delay + 0.15);
      }
      tone.connect(gain).connect(context.destination);
      tone.start(at);
      tone.stop(at + 0.38);
      tone.onended = () => gain.disconnect();
    };
    if (context.state === 'running') start();
    else
      void context
        .resume()
        .then(start)
        .catch(() => undefined);
  }

  destroy() {
    if (this.context) void this.context.close().catch(() => undefined);
  }
}
