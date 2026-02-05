import pdfParse from 'pdf-parse';

function normalizeTitle(title: string | undefined | null) {
  if (!title) {
    return null;
  }
  const cleaned = title.replace(/\s+/g, ' ').trim();
  return cleaned.length ? cleaned : null;
}

export async function extractPdfTitle(buffer: Buffer) {
  try {
    const data = await pdfParse(buffer);
    const infoTitle = normalizeTitle((data.info as { Title?: string } | undefined)?.Title);
    if (infoTitle) {
      return infoTitle;
    }
    const metaTitle = normalizeTitle(data.metadata?.get('Title'));
    if (metaTitle) {
      return metaTitle;
    }
    const text = data.text || '';
    const firstLine = normalizeTitle(text.split(/\r?\n/).find((line) => line.trim().length > 0));
    return firstLine;
  } catch {
    return null;
  }
}
