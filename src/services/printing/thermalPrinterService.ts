import AsyncStorage from "@react-native-async-storage/async-storage";
import { Buffer } from "buffer";
import {
  getBlePrinterMissingModuleMessage,
  isBlePrinterModuleAvailable,
  printBleRawBase64,
  printBleText,
} from "./blePrinterService";

export interface StoredPrinter {
  id?: string;
  name?: string;
  address?: string;
  connected?: boolean;
}

export type ThermalPrintResult = {
  printed: boolean;
  reason?:
    | "missing_config"
    | "missing_native_module"
    | "native_error";
  message?: string;
  warning?: string;
};

export const CONNECTED_PRINTER_KEY = "connected_printer";
export const PAPER_SIZE_KEY = "printer_paper_size_mm";
export const FIXED_PAPER_SIZE = "58";

export type PaperSizeMm = "58";

const normalizePaperSize = (): PaperSizeMm => FIXED_PAPER_SIZE;

const toCode128Value = (value: string) => {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!normalized) return null;
  if (normalized.length > 80) return normalized.slice(0, 80);
  return normalized;
};

const buildEscPosCode128Base64 = (text: string, barcodeValue: string) => {
  const normalizedText = text.replace(/\r\n/g, "\n").trimEnd();
  const textBuffer = Buffer.from(`${normalizedText}\n`, "utf8");
  const barcodeData = Buffer.from(`{B${barcodeValue}`, "ascii");

  const payload = Buffer.concat([
    Buffer.from([0x1b, 0x40]), // initialize
    Buffer.from([0x1b, 0x61, 0x00]), // left align for text
    textBuffer,
    Buffer.from([0x1b, 0x61, 0x01]), // center align barcode
    Buffer.from([0x1d, 0x48, 0x02]), // HRI below barcode
    Buffer.from([0x1d, 0x77, 0x02]), // barcode width
    Buffer.from([0x1d, 0x68, 0x50]), // barcode height
    Buffer.from([0x1d, 0x6b, 0x49, barcodeData.length]), // Code128 + data len
    barcodeData,
    Buffer.from([0x0a, 0x0a]),
    Buffer.from([0x1d, 0x56, 0x00]), // full cut
  ]);

  return payload.toString("base64");
};

const readPrinter = async (): Promise<StoredPrinter | null> => {
  try {
    const raw = await AsyncStorage.getItem(CONNECTED_PRINTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const address = String(parsed?.address || "").trim();
    if (!address) return null;
    return {
      id: String(parsed?.id || address),
      name: String(parsed?.name || "Impresora"),
      address,
      connected: true,
    };
  } catch {
    return null;
  }
};

export const saveConnectedPrinter = async (
  printer: StoredPrinter
): Promise<void> => {
  const address = String(printer?.address || "").trim();
  if (!address) return;
  await AsyncStorage.setItem(
    CONNECTED_PRINTER_KEY,
    JSON.stringify({
      id: String(printer?.id || address),
      name: String(printer?.name || "Impresora"),
      address,
      connected: true,
    })
  );
};

export const clearConnectedPrinter = async (): Promise<void> => {
  await AsyncStorage.removeItem(CONNECTED_PRINTER_KEY);
};

export const getConnectedPrinter = async (): Promise<StoredPrinter | null> => {
  await AsyncStorage.setItem(PAPER_SIZE_KEY, FIXED_PAPER_SIZE);
  return readPrinter();
};

export const hasConnectedPrinter = async (): Promise<boolean> => {
  const printer = await readPrinter();
  return Boolean(printer?.address);
};

export const getThermalPaperSize = async (): Promise<PaperSizeMm> => {
  await AsyncStorage.setItem(PAPER_SIZE_KEY, FIXED_PAPER_SIZE);
  return normalizePaperSize();
};

export const printTicketDirect = async (
  text: string,
  providedPrinter?: StoredPrinter | null
): Promise<ThermalPrintResult> => {
  const printer = providedPrinter ?? (await readPrinter());
  if (!printer?.address) {
    return {
      printed: false,
      reason: "missing_config",
      message: "No hay una impresora conectada en Configuracion.",
    };
  }

  if (!isBlePrinterModuleAvailable()) {
    return {
      printed: false,
      reason: "missing_native_module",
      message: getBlePrinterMissingModuleMessage(),
    };
  }

  try {
    await printBleText(text, printer.address);
    return { printed: true };
  } catch (error: any) {
    return {
      printed: false,
      reason: "native_error",
      message: String(error?.message || "No se pudo imprimir en la termica."),
    };
  }
};

export const printTicketWithCode128 = async (
  text: string,
  barcodeValue: string,
  providedPrinter?: StoredPrinter | null
): Promise<ThermalPrintResult> => {
  const printer = providedPrinter ?? (await readPrinter());
  if (!printer?.address) {
    return {
      printed: false,
      reason: "missing_config",
      message: "No hay una impresora conectada en Configuracion.",
    };
  }

  if (!isBlePrinterModuleAvailable()) {
    return {
      printed: false,
      reason: "missing_native_module",
      message: getBlePrinterMissingModuleMessage(),
    };
  }

  const normalizedBarcode = toCode128Value(barcodeValue);
  if (!normalizedBarcode) {
    return {
      printed: false,
      reason: "native_error",
      message: "El valor del codigo de barras es invalido.",
    };
  }

  try {
    const rawBase64 = buildEscPosCode128Base64(text, normalizedBarcode);
    await printBleRawBase64(rawBase64, printer.address);
    return { printed: true };
  } catch (barcodeError: any) {
    try {
      await printBleText(text, printer.address);
      return {
        printed: true,
        warning: `Se imprimio sin barcode Code128: ${String(
          barcodeError?.message || "error desconocido"
        )}`,
      };
    } catch (fallbackError: any) {
      return {
        printed: false,
        reason: "native_error",
        message: String(
          fallbackError?.message ||
            "No se pudo imprimir en la termica."
        ),
      };
    }
  }
};
