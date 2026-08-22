import { extractText } from "unpdf";

/** Returns one string per page — needed for attachment-page provenance. */
export async function parsePdfBuffer(buffer: Buffer): Promise<string[]> {
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: false });
  return text;
}
