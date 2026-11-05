declare module 'bwip-js' {
  export interface ToSVGOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    width?: number;
    includetext?: boolean;
    textxalign?: string;
    [key: string]: any;
  }

  export function toSVG(opts: ToSVGOptions): string;
  export function toBuffer(opts: any): Promise<any>;

  const bwipjs: {
    toSVG: typeof toSVG;
    toBuffer: typeof toBuffer;
    [key: string]: any;
  };
  export default bwipjs;
}
