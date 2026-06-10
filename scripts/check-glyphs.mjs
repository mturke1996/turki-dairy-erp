import fontkit from 'fontkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { ar } from '../src/features/pdf/arabicPDF.ts';

const font = fontkit.openSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public/fonts/Tajawal-Regular.ttf'));

const samples = [
  'كشف حساب فلاح',
  'مصنع التركي للحليب ومشتقاته',
  'وثيقة رسمية',
  'صفحة 1 من 10',
  'د.ل',
  'إجمالي قيمة الاستلام المعروض',
  'طرابلس',
];

for (const sample of samples) {
  const out = ar(sample);
  const missing = [];
  for (const ch of out) {
    const cp = ch.codePointAt(0);
    if (cp < 0x20) continue;
    const g = font.glyphForCodePoint(cp);
    if (!g || g.id === 0) missing.push(`U+${cp.toString(16).toUpperCase()}`);
  }
  console.log(sample, missing.length ? `MISSING: ${missing.join(', ')}` : 'OK');
}
