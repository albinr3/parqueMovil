import { BLEPrinter } from "@poriyaalar/react-native-thermal-receipt-printer";

type PrintResult = {
  ok: boolean;
  error?: string;
};

export const printText = async (text: string): Promise<PrintResult> => {
  try {
    // Este SDK expone `printBill` con callbacks obligatorios en su tipado.
    // Se envuelve en Promise para mantener API async y evitar regresiones de TS.
    await new Promise<void>((resolve, reject) => {
      BLEPrinter.printBill(
        text,
        undefined,
        () => resolve(),
        (error) => reject(error)
      );
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No fue posible imprimir",
    };
  }
};

export const listPairedPrinters = async () => {
  try {
    const devices = await BLEPrinter.getDeviceList();
    return devices;
  } catch {
    return [];
  }
};
