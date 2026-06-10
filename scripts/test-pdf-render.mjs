/**
 * Smoke test: render FarmerStatementPDF to buffer (catches textkit crashes).
 * Run: node scripts/test-pdf-render.mjs
 */
import React from 'react';
import { pdf, Font } from '@react-pdf/renderer';
import path from 'path';
import fs from 'fs';
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

// Run with: npx tsx scripts/test-pdf-render.mjs
const { FarmerStatementPDF } = await import('../src/features/pdf/FarmerStatementPDF.tsx');

const farmer = {
  id: '1',
  fullName: 'محمد التركي',
  code: 'F-001',
  region: 'طرابلس',
  phone: '0912345678',
  bankName: 'مصرف الجمهورية',
  bankAccount: '123456',
  iban: 'LY123',
  avgPrice: 1.525,
  paidTotal: 5000,
  creditBalance: 1525.5,
  totalSupplied: 1200,
  supplyCount: 15,
  qualityTier: 'standard',
};

const supplies = [
  {
    id: 's1',
    ref: 'SUP-001',
    date: '2026-06-01',
    quantity: 100,
    unitPrice: 1.5,
    total: 150,
    milkShift: 'morning',
    qualityTier: 'standard',
  },
];

const payments = [
  { id: 'p1', ref: 'PAY-001', date: '2026-06-05', amount: 100, method: 'cash' },
];

const tree = React.createElement(FarmerStatementPDF, {
  farmer,
  supplies,
  payments,
  sessionLabel: 'يونيو 2026',
});

const instance = pdf();
instance.updateContainer(tree);
const buffer = await instance.toBuffer();
console.log('OK — PDF bytes:', buffer.length);
