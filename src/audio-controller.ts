// @ts-nocheck

export function createAudioController(initiallyEnabled) {
  let enabled = initiallyEnabled;
  let context = null;

  function ensureContext() {
    if (context) return true;
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return false;
    context = new AudioEngine();
    return true;
  }

  function tone(frequency, duration, type = "sine", volume = .06, delay = 0) {
    if (!enabled || !ensureContext()) return;
    const oscillator = context.createOscillator(), gain = context.createGain(), start = context.currentTime + delay;
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .01); gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start + duration + .02);
  }

  return {
    get enabled() { return enabled; },
    toggle() { enabled = !enabled; return enabled; },
    persist() { localStorage.setItem("petalia-sound", JSON.stringify(enabled)); },
    click: (frequency = 440, volume = .03) => tone(frequency, .08, "sine", volume),
    roll: () => [0, 1, 2, 3].forEach(index => tone(180 + index * 55, .08, "triangle", .025, index * .06)),
    score: multiplier => { tone(520, .15, "sine", .05); tone(660, .18, "sine", .04, .08); if (multiplier > 5) tone(880, .22, "sine", .04, .16); },
    win: () => [523, 659, 784, 1047].forEach((frequency, index) => tone(frequency, .3, "sine", .05, index * .1)),
    fail: () => [420, 350, 280].forEach((frequency, index) => tone(frequency, .25, "triangle", .04, index * .14))
  };
}
