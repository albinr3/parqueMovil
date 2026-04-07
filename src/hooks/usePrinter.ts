import { listPairedPrinters, printText } from "../services/printerService";

export const usePrinter = () => ({
  printText,
  listPairedPrinters,
});
