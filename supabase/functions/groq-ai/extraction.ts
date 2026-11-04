export const MAX_CHUNK_CHARS = 3200;

export function splitTranscript(text: string): string[] {
  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > MAX_CHUNK_CHARS) {
    let cut = rest.lastIndexOf("\n", MAX_CHUNK_CHARS);
    if (cut < MAX_CHUNK_CHARS / 2) cut = rest.lastIndexOf(" ", MAX_CHUNK_CHARS);
    if (cut < MAX_CHUNK_CHARS / 2) cut = MAX_CHUNK_CHARS;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

export function sourceKey(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return `${text.length}-${(hash >>> 0).toString(36)}`;
}

const uniqueStrings = (values: unknown[]) =>
  Array.from(new Set(values.filter((v): v is string => typeof v === "string" && v.trim() !== "")));

const uniqueObjects = (values: unknown[]) => {
  const seen = new Set<string>();
  return values.filter((v) => {
    const key = JSON.stringify(v);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const firstFilled = <T>(items: (T | null | undefined)[]) =>
  items.find((item) => item && (typeof item !== "object" || Object.values(item).some((v) => v))) ?? null;

export function mergeExtractions(parts: Record<string, any>[]) {
  const supplierFields = ["name", "address", "contact_person", "contact_info"] as const;
  const supplier = Object.fromEntries(
    supplierFields.map((field) => [field, parts.map((p) => p.supplier?.[field]).find((v) => typeof v === "string" && v.trim()) ?? null]),
  );
  return {
    supplier,
    products: uniqueObjects(parts.flatMap((p) => (Array.isArray(p.products) ? p.products : []))),
    production_capacity: firstFilled(parts.map((p) => (p.production_capacity?.value ? p.production_capacity : null))),
    payment_terms: firstFilled(parts.map((p) => (p.payment_terms?.value ? p.payment_terms : null))),
    delivery_terms: firstFilled(parts.map((p) => (p.delivery_terms?.value ? p.delivery_terms : null))),
    certifications: uniqueStrings(parts.flatMap((p) => (Array.isArray(p.certifications) ? p.certifications : []))),
    missing_information: uniqueStrings(parts.flatMap((p) => (Array.isArray(p.missing_information) ? p.missing_information : []))),
    conflicts: uniqueObjects(parts.flatMap((p) => (Array.isArray(p.conflicts) ? p.conflicts : []))),
  };
}
