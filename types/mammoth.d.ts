declare module "mammoth" {
  type ExtractResult = {
    value: string;
    messages: unknown[];
  };

  export function extractRawText(input: {
    buffer: Buffer;
  }): Promise<ExtractResult>;

  const mammoth: {
    extractRawText: typeof extractRawText;
  };
  export default mammoth;
}
