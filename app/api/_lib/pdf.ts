function normalizeTitle(title: string | undefined | null) {
  if (!title) {
    return null;
  }
  const cleaned = title.replace(/\s+/g, ' ').trim();
  return cleaned.length ? cleaned : null;
}

function decodePdfLiteral(input: string) {
  let output = '';
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '\\') {
      const next = input[i + 1];
      if (!next) {
        break;
      }
      switch (next) {
        case 'n':
          output += '\n';
          i += 1;
          break;
        case 'r':
          output += '\r';
          i += 1;
          break;
        case 't':
          output += '\t';
          i += 1;
          break;
        case 'b':
          output += '\b';
          i += 1;
          break;
        case 'f':
          output += '\f';
          i += 1;
          break;
        case '\\':
        case '(':
        case ')':
          output += next;
          i += 1;
          break;
        case '\r':
        case '\n':
          i += 1;
          if (next === '\r' && input[i + 1] === '\n') {
            i += 1;
          }
          break;
        default: {
          const octalMatch = input.slice(i + 1, i + 4).match(/^[0-7]{1,3}/);
          if (octalMatch) {
            output += String.fromCharCode(parseInt(octalMatch[0], 8));
            i += octalMatch[0].length;
          } else {
            output += next;
            i += 1;
          }
          break;
        }
      }
    } else {
      output += char;
    }
  }
  return output;
}

function decodeHexString(hex: string) {
  const clean = hex.replace(/\s+/g, '');
  if (!clean.length) {
    return '';
  }
  const bytes = [];
  for (let i = 0; i < clean.length; i += 2) {
    const chunk = clean.slice(i, i + 2);
    bytes.push(parseInt(chunk, 16));
  }
  const buffer = Buffer.from(bytes);
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return decodeUtf16Be(buffer.slice(2));
  }
  return buffer.toString('latin1');
}

function decodeUtf16Be(buffer: Buffer) {
  let result = '';
  for (let i = 0; i < buffer.length; i += 2) {
    const codeUnit = (buffer[i] << 8) | (buffer[i + 1] || 0);
    result += String.fromCharCode(codeUnit);
  }
  return result;
}

function extractLiteralAfter(text: string, startIndex: number) {
  let i = startIndex;
  while (i < text.length && text[i] !== '(') {
    i += 1;
  }
  if (i >= text.length || text[i] !== '(') {
    return null;
  }
  i += 1;
  let value = '';
  let escaped = false;
  for (; i < text.length; i += 1) {
    const char = text[i];
    if (escaped) {
      value += '\\' + char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === ')') {
      return decodePdfLiteral(value);
    }
    value += char;
  }
  return null;
}

export async function extractPdfTitle(buffer: Buffer) {
  try {
    const raw = buffer.toString('latin1');
    const titleIndex = raw.indexOf('/Title');
    if (titleIndex !== -1) {
      const literalTitle = extractLiteralAfter(raw, titleIndex + 6);
      const normalizedLiteral = normalizeTitle(literalTitle);
      if (normalizedLiteral) {
        return normalizedLiteral;
      }
      const hexMatch = raw.slice(titleIndex, titleIndex + 500).match(/\/Title\s*<([^>]+)>/);
      if (hexMatch) {
        const decodedHex = normalizeTitle(decodeHexString(hexMatch[1]));
        if (decodedHex) {
          return decodedHex;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
