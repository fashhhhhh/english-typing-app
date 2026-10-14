import { StorageProvider } from '../storage/types';

/** 导出备份并触发浏览器下载，返回文件名 */
export function downloadBackup(storage: StorageProvider): string {
  const json = storage.exportBackup();
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const name = `typeenglish-backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate(),
  )}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  // 立即 revoke 在 Firefox 等浏览器可能中断下载，延迟释放
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}

/** 读取本地备份文件内容 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

/** 当前备份体积（KB） */
export function backupSizeKb(storage: StorageProvider): number {
  return Math.round((new Blob([storage.exportBackup()]).size / 1024) * 10) / 10;
}
