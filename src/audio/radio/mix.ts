import { radioCatalog, type Station } from './catalog';
import { seededRandom } from './compose';

export function createRadioMix(context: BaseAudioContext, output: AudioNode) {
  const input = context.createGain();
  // A short stereo impulse gives the mono broadcast a room without using a recording.
  const room = context.createConvolver();
  const impulse = context.createBuffer(
    2,
    Math.ceil(context.sampleRate * 0.31),
    context.sampleRate,
  );
  const random = seededRandom(1907);
  for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
    const samples = impulse.getChannelData(channel);
    let filtered = 0;
    for (let i = 0; i < samples.length; i++) {
      filtered = 0.64 * filtered + 0.36 * (2 * random() - 1);
      samples[i] = filtered * (1 - i / samples.length) ** 3;
    }
  }

  room.buffer = impulse;
  const roomLevel = context.createGain();
  const echo = context.createDelay(0.3);
  const echoLevel = context.createGain();
  const feedback = context.createGain();
  echo.delayTime.value = 0.18;
  feedback.gain.value = 0.24;
  // Compression and look-ahead limiting are baked into each track. Clamp the
  // sum here as the wet signal may add to a peak in the decoded master.
  const ceiling = 10 ** (-2 / 20);
  const limiter = context.createWaveShaper();
  limiter.curve = Float32Array.from({ length: 513 }, (_, i) =>
    Math.max(-ceiling, Math.min(ceiling, i / 256 - 1)),
  );
  input.connect(limiter).connect(output);
  input.connect(room).connect(roomLevel).connect(limiter);
  input.connect(echo).connect(echoLevel).connect(limiter);
  echo.connect(feedback).connect(echo);

  return {
    input,
    setStation(station: Station) {
      roomLevel.gain.value = radioCatalog[station].room;
      echoLevel.gain.value = radioCatalog[station].echo;
    },
  };
}
