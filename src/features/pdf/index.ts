// محرّك PDF — مصنع التركي للحليب ومشتقاته
// ============================================================

// Core
export { registerPdfFonts, PDF_FONT_FAMILY } from './pdfFonts';
export { ar, arMoney, arDate, arDateParts } from './arabicPDF';
export { ReportShell, type ReportShellMetaCell } from './ReportShell';
export { PdfTable, PdfSectionTitle, PdfMoneyCell, type PdfTableColumn, type PdfTableRow } from './PdfTable';
export { TurkiPdfToolbar } from './pdf-toolbar';
export { renderPdfBlob, savePdfBlob } from './pdf-blob-utils';

// Brand Kit
export {
  PDFPalette,
  LIBYAN_CURRENCY_LABEL,
  pdfBrandStyles,
  PdfLogoMark,
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
