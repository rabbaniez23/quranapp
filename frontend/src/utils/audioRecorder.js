// --- STREAM MIKROFON UNTUK CEK HAFALAN AI ---
// Merekam mikrofon di 16 kHz (format yang diminta model di backend) dan mengirim
// potongan audio setiap ~0,25 detik lewat callback.

const SAMPLE_RATE = 16000;
const CHUNK_SAMPLES = SAMPLE_RATE / 4; // 0,25 detik

// AudioWorklet: meneruskan potongan suara mentah dari mic ke halaman
const WORKLET_CODE = `
class CaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) this.port.postMessage(channel.slice(0));
    return true;
  }
}
registerProcessor('capture-processor', CaptureProcessor);
`;

export const createMicStream = async (onChunk) => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  const context = new AudioContext({ sampleRate: SAMPLE_RATE });
  const workletUrl = URL.createObjectURL(new Blob([WORKLET_CODE], { type: 'application/javascript' }));
  await context.audioWorklet.addModule(workletUrl);
  URL.revokeObjectURL(workletUrl);

  const source = context.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(context, 'capture-processor');

  // Kumpulkan potongan kecil (128 sampel) jadi potongan 0,25 detik
  let pending = new Float32Array(CHUNK_SAMPLES);
  let filled = 0;
  node.port.onmessage = (e) => {
    let data = e.data;
    while (data.length) {
      const take = Math.min(data.length, CHUNK_SAMPLES - filled);
      pending.set(data.subarray(0, take), filled);
      filled += take;
      data = data.subarray(take);
      if (filled === CHUNK_SAMPLES) {
        onChunk(pending);
        pending = new Float32Array(CHUNK_SAMPLES);
        filled = 0;
      }
    }
  };
  source.connect(node);

  return {
    stop: () => {
      node.port.onmessage = null;
      source.disconnect();
      node.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      context.close();
    },
  };
};
