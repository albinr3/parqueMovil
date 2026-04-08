import {
  BlePrinterDevice,
  connectBlePrinter,
  disconnectBlePrinter,
  getBlePrinterMissingModuleMessage,
  isBlePrinterModuleAvailable,
  listBlePrinters,
} from "./printing/blePrinterService";
import {
  clearConnectedPrinter,
  getConnectedPrinter,
  printTicketDirect,
  printTicketWithCode128,
  saveConnectedPrinter,
  StoredPrinter,
} from "./printing/thermalPrinterService";

type PrintResult = {
  ok: boolean;
  error?: string;
  warning?: string;
};

export const printText = async (text: string): Promise<PrintResult> => {
  const result = await printTicketDirect(text);
  if (result.printed) {
    return { ok: true, warning: result.warning };
  }
  return {
    ok: false,
    error: result.message || "No fue posible imprimir",
  };
};

export const printTextWithBarcode = async (
  text: string,
  barcodeValue: string
): Promise<PrintResult> => {
  const result = await printTicketWithCode128(text, barcodeValue);
  if (result.printed) {
    return { ok: true, warning: result.warning };
  }
  return {
    ok: false,
    error: result.message || "No fue posible imprimir",
  };
};

export const listPairedPrinters = async (): Promise<BlePrinterDevice[]> => {
  try {
    return await listBlePrinters();
  } catch {
    return [];
  }
};

export const connectPrinter = async (
  device: BlePrinterDevice
): Promise<StoredPrinter> => {
  await connectBlePrinter(device.address);
  const connected: StoredPrinter = {
    id: device.id,
    name: device.name,
    address: device.address,
    connected: true,
  };
  await saveConnectedPrinter(connected);
  return connected;
};

export const disconnectPrinter = async () => {
  if (isBlePrinterModuleAvailable()) {
    await disconnectBlePrinter();
  }
  await clearConnectedPrinter();
};

export const getSavedPrinter = async () => getConnectedPrinter();

export {
  getBlePrinterMissingModuleMessage,
  isBlePrinterModuleAvailable,
};
