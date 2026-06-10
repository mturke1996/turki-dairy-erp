import React from 'react';
import { pdf, Font } from '@react-pdf/renderer';
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

async function tryRender(name, tree) {
  try {
    const instance = pdf();
    instance.updateContainer(tree);
    const blob = await instance.toBlob();
    console.log('OK', name, blob.size);
    return true;
  } catch (e) {
    console.error('FAIL', name, e.message?.slice(0, 120));
    return false;
  }
}

const { ReportShell } = await import('../src/features/pdf/ReportShell.tsx');
const { FarmerStatementPDF } = await import('../src/features/pdf/FarmerStatementPDF.tsx');
const { PdfLogoProvider } = await import('../src/features/pdf/pdf-logo-context.tsx');

const farmer = {
  id: '1', fullName: 'محمد التركي', code: 'F-001', region: 'طرابلس', phone: '0912345678',
  bankName: 'مصرف الجمهورية', bankAccount: '123456', iban: 'LY123',
  avgPrice: 1.525, paidTotal: 5000, creditBalance: 1525.5, totalSupplied: 1200,
  supplyCount: 15, qualityTier: 'standard',
};
const supplies = [{ id: 's1', ref: 'SUP-001', date: '2026-06-01', quantity: 100, unitPrice: 1.5, total: 150, milkShift: 'morning', qualityTier: 'standard' }];
const payments = [{ id: 'p1', ref: 'PAY-001', date: '2026-06-05', amount: 100, method: 'cash' }];

// 1. ReportShell empty
await tryRender(
  'ReportShell empty',
  React.createElement(ReportShell, { title: 'كشف حساب فلاح', subtitle: 'اختبار' }, React.createElement(React.Fragment)),
);

// 2. ReportShell with meta money
await tryRender(
  'ReportShell meta money',
  React.createElement(
    ReportShell,
    {
      title: 'كشف حساب فلاح',
      metaCells: [{ label: 'الدين', moneyAmount: 1525.5 }],
    },
    null,
  ),
);

// 3. Full farmer without logo provider
await tryRender(
  'FarmerStatement no logo ctx',
  React.createElement(FarmerStatementPDF, { farmer, supplies, payments }),
);

// 4. With empty logo provider
await tryRender(
  'FarmerStatement empty logo',
  React.createElement(
    PdfLogoProvider,
    { uri: null, markUri: null, letterheadUri: null },
    React.createElement(FarmerStatementPDF, { farmer, supplies, payments, sessionLabel: 'يونيو 2026' }),
  ),
);
