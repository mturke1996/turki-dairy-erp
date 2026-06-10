// محرّك PDF — مصنع التركي للحليب ومشتقاته
// ============================================================

// Core
export { registerPdfFonts, ensurePdfFontsLoaded, PDF_FONT_FAMILY } from './pdfFonts';
export { ar, arMoney, arDate, arDateParts, pdfDisplayValue, ltrAmountCurrency } from './arabicPDF';
export { ReportShell, PdfSignatureStrip, type ReportShellMetaCell } from './ReportShell';
export {
  PdfTable,
  PdfSectionTitle,
  PdfKeepTogether,
  PdfMoneyCell,
  PdfMoneyInline,
  PdfTh,
  PdfTd,
  PdfTdMoney,
  type PdfTableColumn,
  type PdfTableRow,
} from './PdfTable';
export { TurkiPdfToolbar } from './pdf-toolbar';
export { renderPdfBlob, savePdfBlob, openPdfInNewTab, canSharePdfFiles } from './pdf-blob-utils';

// Brand Kit
export {
  PDFPalette,
  LIBYAN_CURRENCY_LABEL,
  pdfBrandStyles,
  PdfLogoMark,
  PdfBrandIdentity,
  PdfFactoryContactBar,
  PdfInfoGrid,
  TurkiPdfFooter,
  TurkiPdfHeader,
  pdfFmtNum,
  pdfFmtDate,
  pdfFmtMoneyLibyan,
  PdfMoneyText,
} from './pdfBrandKit';

// Base
export { PDF, pdfBase } from './pdfBase';

// Documents
export { FarmerStatementPDF, type FarmerStatementProps } from './FarmerStatementPDF';
export { CustomerStatementPDF, type CustomerStatementProps } from './CustomerStatementPDF';
export { DailyMovementPDF, type DailyMovementProps } from './DailyMovementPDF';
export { SessionClosingPDF, type SessionClosingProps } from './SessionClosingPDF';
export { FinancialReportPDF, type FinancialReportProps } from './FinancialReportPDF';
export { PayrollPDF, type PayrollPdfProps, type PayrollLineRow } from './PayrollPDF';
export { CashStatementPDF, type CashStatementPdfProps, type CashStatementRow } from './CashStatementPDF';
export { DebtsRegisterPDF, type DebtsRegisterPdfProps, type DebtRegisterRow } from './DebtsRegisterPDF';
export { ExternalIncomePDF, type ExternalIncomePdfProps, type ExternalIncomeRow } from './ExternalIncomePDF';
