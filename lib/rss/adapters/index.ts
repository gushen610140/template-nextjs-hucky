import type { RssAdapter } from "../types";
import { adapter36kr } from "./36kr";

const adapters = new Map<string, RssAdapter>([[adapter36kr.id, adapter36kr]]);

export function getRssAdapter(id: string): RssAdapter {
  const adapter = adapters.get(id);
  if (!adapter) {
    throw new Error(`unknown_rss_adapter:${id}`);
  }
  return adapter;
}
