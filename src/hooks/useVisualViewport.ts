import { useEffect, useRef, useState } from 'react';

/**
 * 可视区域高度：手机弹出虚拟键盘时 visualViewport 会变小，
 * 而布局视口（window.innerHeight / dvh）在 iOS 上并不变化，
 * 因此用它来判断键盘是否弹出并做紧凑布局。
 *
 * 除监听 visualViewport 的 resize/scroll 外，还做了两层兜底：
 * - 部分环境改视口不派发 visualViewport 事件，补充监听 window resize；
 * - 触屏设备上以 400ms 轻量轮询同步（值未变化时 React 不会重渲染）。
 */
export function useVisualViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;

    if (!vv) {
      const onWinResize = () => setHeight(window.innerHeight);
      onWinResize();
      window.addEventListener('resize', onWinResize);
      return () => window.removeEventListener('resize', onWinResize);
    }

    const update = () => setHeight(vv.height);
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    const timer = window.setInterval(update, 400);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.clearInterval(timer);
    };
  }, []);

  return height;
}

/**
 * 判断手机键盘是否弹出。
 * 以"同宽度下见过的最大可视高度"为基准：iOS 键盘只压缩 visualViewport，
 * Android 可能同时压缩布局视口，用基准值判断在两端都成立；
 * 横竖屏切换（宽度变化）时重置基准。
 */
export function useKeyboardOpen(isTouch: boolean): boolean {
  const vvHeight = useVisualViewportHeight();
  const [open, setOpen] = useState(false);
  const maxHeightRef = useRef(0);
  const widthRef = useRef(0);

  useEffect(() => {
    if (!isTouch || vvHeight === null) return;
    const width = window.innerWidth;
    if (widthRef.current !== width) {
      widthRef.current = width;
      maxHeightRef.current = 0;
    }
    if (vvHeight > maxHeightRef.current) maxHeightRef.current = vvHeight;
    setOpen(vvHeight < maxHeightRef.current - 140);
  }, [vvHeight, isTouch]);

  return open;
}
