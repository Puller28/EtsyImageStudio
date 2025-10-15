declare module "pngjs" {
  export interface PNGWithMeta {
    width: number;
    height: number;
    data: Uint8Array;
  }

  export class PNG implements PNGWithMeta {
    width: number;
    height: number;
    data: Uint8Array;
    constructor(options?: { width?: number; height?: number; filterType?: number });
    static sync: {
      read(buffer: Buffer): PNG;
      write(png: PNG): Buffer;
    };
  }
}
