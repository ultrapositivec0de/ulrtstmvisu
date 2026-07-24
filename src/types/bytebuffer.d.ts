declare module 'bytebuffer' {
  class ByteBuffer {
    constructor(capacity?: number, littleEndian?: boolean, noAssert?: boolean);
    static wrap(buffer: any, encoding?: string, littleEndian?: boolean, noAssert?: boolean): ByteBuffer;
    toBuffer(): any;
    // Add other methods as needed
  }
  export default ByteBuffer;
}
