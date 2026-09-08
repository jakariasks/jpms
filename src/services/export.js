import { Capacitor } from '@capacitor/core';
import { toCsv } from '../utils/csv';
import { toast } from 'sonner';
export async function downloadFile(filename, content, type = 'text/plain') {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const path = Date.now() + '-' + filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const { uri } = await Filesystem.writeFile({
      path,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: filename,
      files: [uri],
      dialogTitle: 'Save or share your JPMS export',
    });
    return;
  }
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportCsv(name, rows, columns) {
  try {
    await downloadFile(name, toCsv(rows, columns), 'text/csv;charset=utf-8');
    toast.success('Export ready');
  } catch (error) {
    toast.error(error.message || 'Export failed. Please try again.');
  }
}
