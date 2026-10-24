// --- STREAM MIKROFON UNTUK CEK HAFALAN AI ---
// Merekam mikrofon di 16 kHz (format yang diminta model di backend) dan mengirim
// potongan audio setiap ~0,25 detik lewat callback.

const SAMPLE_RATE = 16000;
const CHUNK_SAMPLES = SAMPLE_RATE / 4; // 0,25 detik

// AudioWorklet: kumpulkan suara mentah dari mic jadi potongan 0,25 detik, baru dikirim ke halaman.
// (Mengirim tiap 128 sampel = ±125 pesan per detik ke halaman, terasa berat di HP.)
const WORKLET_CODE = `
class CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(${CHUNK_SAMPLES});
    this.n = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    let i = 0;
    while (i < channel.length) {
      const take = Math.min(channel.length - i, this.buf.length - this.n);
      this.buf.set(channel.subarray(i, i + take), this.n);
      this.n += take;
      i += take;
      if (this.n === this.buf.length) {
        this.port.postMessage(this.buf, [this.buf.buffer]);
        this.buf = new Float32Array(${CHUNK_SAMPLES});
        this.n = 0;
      }
    }
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
