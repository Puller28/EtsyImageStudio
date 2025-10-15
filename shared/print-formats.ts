export type PrintFormatId = "4x5" | "3x4" | "2x3" | "11x14" | "A4";

export interface PrintFormatDefinition {
  label: string;
  width: number;
  height: number;
  notes?: string;
}

export const PRINT_FORMATS: Record<PrintFormatId, PrintFormatDefinition> = {
  "4x5": {
    label: "4x5 (8x10)",
    width: 2400,
    height: 3000,
    notes: "Classic 8x10 inch ratio, ideal for frames and Etsy printables.",
  },
  "3x4": {
    label: "3x4 (18x24)",
    width: 5400,
    height: 7200,
    notes: "Popular wall-art poster size with generous vertical space.",
  },
  "2x3": {
    label: "2x3 (12x18)",
    width: 3600,
    height: 5400,
    notes: "Versatile gallery ratio that scales to 24x36 posters.",
  },
  "11x14": {
    label: "11x14",
    width: 3300,
    height: 4200,
    notes: "Frame-friendly dimension common in US home decor.",
  },
  "A4": {
    label: "A4 (ISO)",
    width: 2480,
    height: 3508,
    notes: "International standard size for easy home printing.",
  },
} as const;

export const DEFAULT_PRINT_FORMAT_IDS: PrintFormatId[] = Object.keys(PRINT_FORMATS) as PrintFormatId[];

export const PRINT_FORMAT_OPTIONS = DEFAULT_PRINT_FORMAT_IDS.map((id) => ({
  id,
  ...PRINT_FORMATS[id],
}));

export function isValidPrintFormat(value: unknown): value is PrintFormatId {
  return typeof value === "string" && value in PRINT_FORMATS;
}
