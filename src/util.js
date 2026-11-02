export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const safeFileName = (s) => String(s || 'quotation').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'quotation';

// 读取并压缩上传的图片：产品图压到 900px 内 JPEG；Logo 保留 PNG 透明
export function processImage(file, { maxSize = 900, keepAlpha = false } = {}) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(fr.error);
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => rej(new Error('无法读取图片'));
      im.onload = () => {
        const s = Math.min(1, maxSize / Math.max(im.naturalWidth, im.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.naturalWidth * s));
        c.height = Math.max(1, Math.round(im.naturalHeight * s));
        const g = c.getContext('2d');
        if (!keepAlpha) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
        g.imageSmoothingQuality = 'high';
        g.drawImage(im, 0, 0, c.width, c.height);
        res(keepAlpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.88));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

export function pickFile(accept = 'image/*') {
  return new Promise((res) => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = accept;
    i.onchange = () => res(i.files[0] || null);
    i.click();
  });
}

export const fmtMoney = (v, sym = '¥') => sym + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtDate = (t) => {
  if (!t) return '';
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const today = () => fmtDate(Date.now());
export const firstLine = (s) => String(s || '').split('\n').join(' ').replace(/ /g, ' ').trim();
