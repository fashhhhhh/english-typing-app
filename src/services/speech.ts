import { PracticeMode, StorageProvider, WrongItem } from '../storage/types';
import { reviewIntervalDays } from './corpusService';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 判题后更新错词本：
 * - 答错：wrongCount + 1，按间隔重复策略排期下次复习
 * - 答对：wrongCount - 1，归零时移除
 */
export function updateWrongBook(
  storage: StorageProvider,
  mode: PracticeMode,
  question: { target: string; label: string },
  correct: boolean,
): void {
  const existing = storage
    .getWrongBook()
    .find((w) => w.type === mode && w.target === question.target);

  if (!correct) {
    const wrongCount = (existing?.wrongCount ?? 0) + 1;
    const item: WrongItem = {
      id: existing?.id ?? genWrongId(),
      type: mode,
      target: question.target,
      label: question.label,
      wrongCount,
      lastWrongAt: Date.now(),
      nextReviewAt: Date.now() + reviewIntervalDays(wrongCount) * DAY_MS,
    };
    storage.upsertWrongItem(item);
    return;
  }

  if (existing) {
    const wrongCount = existing.wrongCount - 1;
    if (wrongCount <= 0) {
      storage.deleteWrongItem(existing.id);
    } else {
      storage.upsertWrongItem({
        ...existing,
        wrongCount,
        nextReviewAt: Date.now() + reviewIntervalDays(wrongCount) * DAY_MS,
      });
    }
  }
}

function genWrongId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 使用浏览器 Web Speech API 朗读英文文本 */
export function speakEnglish(text: string, rate = 0.92): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}
