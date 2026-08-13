/**
 * `text-encoding` ships no types. Only the two constructors polyfilled in
 * src/polyfills.ts are declared here.
 */
declare module 'text-encoding' {
  export class TextEncoder {
    constructor(encoding?: string);
    encode(input?: string): Uint8Array;
    readonly encoding: string;
  }
  export class TextDecoder {
    constructor(encoding?: string, options?: { fatal?: boolean; ignoreBOM?: boolean });
    decode(input?: ArrayBufferView | ArrayBuffer, options?: { stream?: boolean }): string;
    readonly encoding: string;
  }
}
