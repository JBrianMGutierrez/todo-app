export function playDing() {
  const audio = new Audio("/sounds/universfield-bubble-pop-07.mp3");

  audio.volume = 0.4;

  audio.play();
}