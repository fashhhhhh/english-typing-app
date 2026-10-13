/** Web Audio 音效工具：按键声、错误提示、完成提示（无外部资源依赖） */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  const Ctor = window.AudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  delay = 0,
) {
  const audio = getCtx();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration);
}

/** 正确按键：机械键盘式短促敲击 */
export function playKeyClick() {
  tone(2000 + Math.random() * 400, 0.022, 0.02, 'square');
}

/** 错误按键：低频蜂鸣 */
export function playErrorTone() {
  tone(180, 0.12, 0.05, 'square');
}

/** 单词完成：双音上滑 */
export function playWordChime() {
  tone(880, 0.07, 0.03, 'sine');
  tone(1320, 0.09, 0.025, 'sine', 0.07);
}

/** 章节完成：三音上行 */
export function playFinishJingle() {
  [660, 880, 1180].forEach((freq, i) => tone(freq, 0.13, 0.035, 'sine', i * 0.1));
}
