const completionSoundUrl = "/sounds/universfield-bubble-pop-07.mp3";
let audioContext: AudioContext | undefined;
let soundBuffer: Promise<AudioBuffer> | undefined;

async function loadSound(context: AudioContext): Promise<AudioBuffer> {
  const response = await fetch(completionSoundUrl);
  if (!response.ok) {
    throw new Error(`Completion sound request failed: ${response.status}`);
  }
  return context.decodeAudioData(await response.arrayBuffer());
}

export function playDing(): void {
  void playCompletionSound().catch((error: unknown) => {
    console.error("Unable to play task completion sound via Web Audio", error);
  });
}

async function playCompletionSound(): Promise<void> {
  // Fetching the bytes avoids WebKit's media-element loader for Tauri asset URLs.
  audioContext ??= new AudioContext();
  const context = audioContext;
  // Resume while still in the task's click handler, before awaiting the asset.
  await context.resume();

  soundBuffer ??= loadSound(context).catch((error: unknown) => {
    soundBuffer = undefined;
    throw error;
  });
  const buffer = await soundBuffer;
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = 0.4;
  source.connect(gain);
  gain.connect(context.destination);
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
  };
  source.start();
}
