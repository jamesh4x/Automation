import JSZip from "npm:jszip@3.10.1";
import { HttpError } from "./http.ts";

export const MAX_DOCUMENT_CHARS = 15000;

const decodeXml = (value: string) =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

export async function extractDocxText(data: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(data);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new HttpError(400, "Berkas DOCX tidak memiliki isi dokumen yang dapat dibaca.");

  const paragraphs = xml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) ?? [];
  return paragraphs
    .map((paragraph) => {
      const text = [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join("");
      const isHeading = /<w:pStyle w:val="Heading\d*"/.test(paragraph);
      const decoded = decodeXml(text).trim();
      return decoded ? (isHeading ? `# ${decoded}` : decoded) : "";
    })
    .filter(Boolean)
    .join("\n");
}
