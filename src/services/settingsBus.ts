const EVENT = 'eta-settings-changed';

/** 通知全局：设置已更新（主题等即时生效） */
export function emitSettingsChanged(): void {
  window.dispatchEvent(new Event(EVENT));
}

export function onSettingsChanged(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
