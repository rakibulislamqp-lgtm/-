export type PrintFormat = 'a4' | '80mm' | '58mm';

const PRINT_FORMAT_STORAGE_KEY = 'sera_printer_format';

export const PRINT_FORMAT_OPTIONS: Array<{
  id: PrintFormat;
  shortLabel: string;
  label: string;
}> = [
  { id: '58mm', shortLabel: '58mm', label: '58mm Thermal' },
  { id: '80mm', shortLabel: '80mm', label: '80mm Thermal' },
  { id: 'a4', shortLabel: 'A4', label: 'A4 Invoice' },
];

export function getStoredPrintFormat(): PrintFormat {
  try {
    const saved = localStorage.getItem(PRINT_FORMAT_STORAGE_KEY);
    if (saved === '58mm' || saved === '80mm' || saved === 'a4') {
      return saved;
    }
  } catch (e) {
    // Ignore storage access errors
  }
  return 'a4';
}

export function savePrintFormat(format: PrintFormat): void {
  try {
    localStorage.setItem(PRINT_FORMAT_STORAGE_KEY, format);
  } catch (e) {
    // Ignore storage access errors
  }
}

export function getPrintPageStyle(format: PrintFormat): string {
  if (format === '58mm') {
    return `
      @page {
        size: 58mm auto;
        margin: 1.5mm 1mm;
      }
      @media print {
        html, body {
          width: 58mm !important;
          min-width: 58mm !important;
          max-width: 58mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
          color-adjust: exact;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        * {
          box-sizing: border-box !important;
        }
      }
    `;
  }

  if (format === '80mm') {
    return `
      @page {
        size: 80mm auto;
        margin: 2mm 2mm;
      }
      @media print {
        html, body {
          width: 80mm !important;
          min-width: 80mm !important;
          max-width: 80mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
          color-adjust: exact;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        * {
          box-sizing: border-box !important;
        }
      }
    `;
  }

  return `
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    @media print {
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color-adjust: exact;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      * {
        box-sizing: border-box !important;
      }
    }
  `;
}
