import { RefObject } from 'react';

/**
 * 虚拟键盘输入垫：视觉上不可见，但可被聚焦以唤起手机系统键盘。
 * 事件绑定由 useTypingKeyboard 负责，这里只提供元素。
 *
 * 位置很关键：必须放在**练习区顶部**而不是页面底部。
 * 若放在底部（fixed bottom），iOS 聚焦时会为了让聚焦元素露出键盘而
 * 自动向下滚动整页，把单词顶出视野；放在单词附近则无需滚动。
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
      className="pointer-events-none absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 opacity-0"
      // 字号 ≥16px，避免 iOS 聚焦时自动放大页面
      style={{ fontSize: 16, caretColor: 'transparent' }}
    />
  );
}
