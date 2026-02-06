declare module 'pdf-parse' {
  type PDFInfo = {
    Title?: string;
  };

  type PDFMetadata = {
    get: (key: string) => string | undefined | null;
  };

  type PDFData = {
    info?: PDFInfo;
    metadata?: PDFMetadata | null;
    text?: string;
  };

  function pdfParse(data: Buffer | Uint8Array): Promise<PDFData>;

  export default pdfParse;
}
