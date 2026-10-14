import { RefObject } from 'react';

/**
 * 虚拟键盘输入垫：视觉上不可见，但可被聚焦以唤起手机系统键盘。
 * 事件绑定由 useTypingKeyboard 负责，这里只提供元素。
 */
export default function TypingPad({ inputRef }: { inputRef: RefObject<HTMLInputElement> }) {
  return (
    <input
      ref={inputRef}
      data-typing-pad="true"
      type="text"
      inputMode="text"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="none"
      spellCheck={false}
      tabIndex={-1}
      aria-hidden="true"
      className="pointer-events-none fixed bottom-1 left-1/2 h-8 w-8 -translate-x-1/2 opacity-0"
      // 字号 ≥16px，避免 iOS 聚焦时自动放大页面
      style={{ fontSize: 16, caretColor: 'transparent' }}
    />
  );
}
