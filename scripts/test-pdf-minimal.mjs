import React from 'react';
import { pdf, Font, Document, Page, Text, View } from '@react-pdf/renderer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const fontsDir = path.join(root, 'public', 'fonts');

global.window = { location: { origin: 'file://' + root } };
global.React = React;

Font.register({
  family: 'TurkiPdf',
  fonts: [
    { src: path.join(fontsDir, 'Tajawal-Regular.ttf'), fontWeight: 400 },
    { src: path.join(fontsDir, 'Tajawal-Bold.ttf'), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const { ar, ltrAmountCurrency, pdfDisplayValue } = await import('../src/features/pdf/arabicPDF.ts');
const { pdfFmtMoneyLibyan, pdfFmtNum } = await import('../src/features/pdf/pdfBrandKit.tsx');

const cases = [
  ['plain latin', 'Hello 123'],
  ['logical arabic', 'كشف حساب فلاح'],
  ['ar() arabic', ar('كشف حساب فلاح')],
  ['money ltrAmount', ltrAmountCurrency(1525.5)],
  ['money pdfFmt', pdfFmtMoneyLibyan(1525.5)],
  ['mixed ar page', ar('صفحة 1 من 10')],
  ['date parts month', ar('يونيو')],
];

for (const [name, content] of cases) {
  try {
    const tree = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: 'A4', style: { fontFamily: 'TurkiPdf', padding: 40 } },
        React.createElement(Text, null, content),
      ),
    );
    const instance = pdf();
    instance.updateContainer(tree);
    const buf = await instance.toBuffer();
    console.log('OK', name, buf.length);
  } catch (e) {
    console.error('FAIL', name, e.message);
  }
}

// PdfMoneyText-like split
try {
  const tree = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: { fontFamily: 'TurkiPdf', padding: 40 } },
      React.createElement(
        View,
        { style: { flexDirection: 'row', direction: 'ltr', justifyContent: 'flex-end', gap: 5 } },
        React.createElement(Text, { style: { direction: 'ltr' } }, pdfFmtNum(1525.5)),
        React.createElement(Text, null, ar('د.ل')),
      ),
    ),
  );
  const instance = pdf();
  instance.updateContainer(tree);
  await instance.toBuffer();
  console.log('OK split money');
} catch (e) {
  console.error('FAIL split money', e.message);
}
