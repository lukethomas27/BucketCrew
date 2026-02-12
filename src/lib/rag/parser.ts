import mammoth from 'mammoth';
import { parse as csvParse } from 'csv-parse/sync';

/**
 * Extract plain text from a file buffer based on its MIME type.
 */
export async function parseFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  switch (mimeType) {
    case 'application/pdf':
      return parsePdf(buffer, fileName);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return parseDocx(buffer, fileName);

    case 'text/csv':
      return parseCsv(buffer, fileName);

    case 'text/plain':
      return buffer.toString('utf-8');

    default:
      throw new Error(
        `Unsupported file type "${mimeType}" for file "${fileName}". ` +
          'Supported types: PDF, DOCX, CSV, and plain text.'
      );
  }
}

async function parsePdf(buffer: Buffer, fileName: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse');
    const result = await pdfParse(buffer);
    const text = result.text.trim();

    if (!text) {
      throw new Error(`PDF "${fileName}" produced no extractable text.`);
    }

    return text;
  } catch (error) {
    if (error instanceof Error && error.message.includes('produced no extractable')) {
      throw error;
    }
    throw new Error(
      `Failed to parse PDF "${fileName}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function parseDocx(buffer: Buffer, fileName: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();

    if (!text) {
      throw new Error(`DOCX "${fileName}" produced no extractable text.`);
    }

    return text;
  } catch (error) {
    if (error instanceof Error && error.message.includes('produced no extractable')) {
      throw error;
    }
    throw new Error(
      `Failed to parse DOCX "${fileName}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function parseCsv(buffer: Buffer, fileName: string): string {
  try {
    const raw = buffer.toString('utf-8');
    const records: string[][] = csvParse(raw, {
      skip_empty_lines: true,
      relax_column_count: true,
    });

    if (records.length === 0) {
      throw new Error(`CSV "${fileName}" contains no data.`);
    }

    const [header, ...rows] = records;
    const headerRow = `| ${header.join(' | ')} |`;
    const separatorRow = `| ${header.map(() => '---').join(' | ')} |`;
    const dataRows = rows.map((row) => `| ${row.join(' | ')} |`);

    return [headerRow, separatorRow, ...dataRows].join('\n');
  } catch (error) {
    if (error instanceof Error && error.message.includes('contains no data')) {
      throw error;
    }
    throw new Error(
      `Failed to parse CSV "${fileName}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
