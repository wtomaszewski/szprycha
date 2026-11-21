/** Local synthesized cue. The fixed-step simulation only supplies the signal state. */
export class EmergencySiren {
  private context?: AudioContext;
  private gain?: GainNode;
  private tone?: OscillatorNode;
  private audible = false;

  update(volume: number, at: number) {
    if (!this.context && volume > 0 && typeof AudioContext !== 'undefined') {
      this.context = new AudioContext();
      this.gain = this.context.createGain();
      this.gain.gain.value = 0;
      this.gain.connect(this.context.destination);
      this.tone = this.context.createOscillator();
      this.tone.type = 'triangle';
      this.tone.connect(this.gain);
      this.tone.start();
    }
    const { context, tone, gain } = this;
    if (!context || !tone || !gain) return;
    if (volume > 0 && !this.audible && context.state === 'suspended')
      void context.resume().catch(() => undefined);
    this.audible = volume > 0;
    tone.frequency.setTargetAtTime(
      Math.floor(at * 2.8) % 2 ? 720 : 510,
      context.currentTime,
      0.05,
    );
    gain.gain.setTargetAtTime(volume * 0.04, context.currentTime, 0.06);
  }

  destroy() {
    if (this.context) void this.context.close().catch(() => undefined);
  }
}
