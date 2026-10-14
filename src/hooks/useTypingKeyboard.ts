import { useCallback, useEffect, useRef, useState } from 'react';

/** 触屏设备判断：手机/平板需要隐藏输入框来唤起虚拟键盘 */
export function detectTouch(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.('(pointer: coarse)').matches === true
  );
}

interface TypingKeyboardOptions {
  /** 输入一个可打印字符 */
  onChar: (ch: string) => void;
  /** 退格（文章模式使用；单词模式输错即重打，可不传） */
  onBackspace?: () => void;
  /** 冻结（暂停中 / 回看原文）时忽略输入并收起键盘 */
  frozen?: boolean;
}

/**
 * 移动端虚拟键盘输入。
 *
 * 桌面端靠 window 上的 keydown 直接捕获按键；手机没有物理键盘，
 * 必须有一个聚焦的输入元素才能唤起系统键盘。这里提供一个"输入垫"：
 * - 输入垫聚焦后，字符通过 beforeinput / input 事件回传，值立即清空
 * - 退格在 Android 会同时触发 keydown 与 beforeinput，用时间戳去重
 * - 输入垫自身不接收 Tab 焦点（tabIndex=-1），不影响桌面端
 */
export function useTypingKeyboard({ onChar, onBackspace, frozen = false }: TypingKeyboardOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const charRef = useRef(onChar);
  const backspaceRef = useRef(onBackspace);
  const frozenRef = useRef(frozen);
  const lastBackspaceAt = useRef(0);
  const [isTouch] = useState(detectTouch);

  useEffect(() => {
    charRef.current = onChar;
  }, [onChar]);

  useEffect(() => {
    backspaceRef.current = onBackspace;
  }, [onBackspace]);

  useEffect(() => {
    frozenRef.current = frozen;
    if (frozen) inputRef.current?.blur();
  }, [frozen]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const emitBackspace = () => {
      if (frozenRef.current) return;
      const now = performance.now();
      // Android 上退格会同时触发 keydown 与 beforeinput，60ms 内只算一次
      if (now - lastBackspaceAt.current < 60) return;
      lastBackspaceAt.current = now;
      backspaceRef.current?.();
    };

    const onBeforeInput = (e: Event) => {
      const ev = e as InputEvent;
      if (frozenRef.current) {
        e.preventDefault();
        return;
      }
      if (ev.inputType.startsWith('delete')) {
        e.preventDefault();
        emitBackspace();
        return;
      }
      if (ev.inputType === 'insertText') {
        e.preventDefault();
        const data = ev.data ?? '';
        for (const ch of data) charRef.current(ch);
      }
      // insertCompositionText 不可取消，交给下方 input 事件兜底
    };

    const onInput = () => {
      const value = el.value;
      if (!value) return;
      el.value = '';
      if (frozenRef.current) return;
      for (const ch of value) charRef.current(ch);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        emitBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
      }
    };

    el.addEventListener('beforeinput', onBeforeInput);
    el.addEventListener('input', onInput);
    el.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('beforeinput', onBeforeInput);
      el.removeEventListener('input', onInput);
      el.removeEventListener('keydown', onKeyDown);
    };
  }, [isTouch]);

  /** 唤起键盘（必须由用户手势触发，如点击练习区） */
  const focus = useCallback(() => {
    if (frozenRef.current) return;
    const el = inputRef.current;
    if (!el) return;
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  }, []);

  return { inputRef, focus, isTouch };
}
