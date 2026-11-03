/**
 * 文本预览的解码工具。
 *
 * 只按 UTF-8 / UTF-16 BOM 处理; 其他编码不做猜测, 乱码也好过误判。
 * 出现 NUL 字节时视为二进制, 不交给编辑器。
 */
export type DecodedText = {
  text: string;
  binary: boolean;
};

export function decodeText(bytes: Uint8Array): DecodedText {
  if (bytes.length === 0) return { text: "", binary: false };

  const [b0, b1, b2, b3] = bytes;

  if (b0 === 0xff && b1 === 0xfe && !(b2 === 0x00 && b3 === 0x00)) {
    return finish(new TextDecoder("utf-16le").decode(bytes));
  }
  if (b0 === 0xfe && b1 === 0xff) {
    return finish(new TextDecoder("utf-16be").decode(bytes));
  }

  return finish(new TextDecoder("utf-8").decode(bytes));
}

function finish(text: string): DecodedText {
  if (text.includes("\u0000")) return { text: "", binary: true };
  return { text: text.replace(/^\uFEFF/, ""), binary: false };
}
