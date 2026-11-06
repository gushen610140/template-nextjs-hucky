import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const RAG_CHUNK_SIZE = 800;
export const RAG_CHUNK_OVERLAP = 120;
export const RAG_EMBED_BATCH_SIZE = 16;

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: RAG_CHUNK_SIZE,
  chunkOverlap: RAG_CHUNK_OVERLAP,
  separators: ["\n\n", "\n", "。", "！", "？", "；", " ", ""],
});

/** 粗略估算 token 数: 中文约 1 字 1 token, 英文约 4 字符 1 token。 */
export function estimateTokens(text: string): number {
  let tokens = 0;
  for (const char of text) {
    tokens += char.charCodeAt(0) > 255 ? 1 : 0.25;
  }
  return Math.ceil(tokens);
}

export async function splitIntoChunks(text: string): Promise<string[]> {
  return splitter.splitText(text);
}
