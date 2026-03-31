import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { successResponse, errorResponse } from '../../lib/response';

/**
 * CSV / Excel Transformer
 * Parse, filter, transform, and merge CSV data programmatically.
 */

function parseCSV(csv: string, delimiter: string = ','): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csv.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
  return { headers, rows };
}

function filterRows(rows: Record<string, string>[], filters: Record<string, string>): Record<string, string>[] {
  return rows.filter(row => {
    for (const [key, val] of Object.entries(filters)) {
      if (!row[key] || !row[key].toLowerCase().includes(val.toLowerCase())) return false;
    }
    return true;
  });
}

function selectColumns(rows: Record<string, string>[], columns: string[]): Record<string, string>[] {
  return rows.map(row => {
    const selected: Record<string, string> = {};
    columns.forEach(c => { if (c in row) selected[c] = row[c]; });
    return selected;
  });
}

function sortRows(rows: Record<string, string>[], sortBy: string, order: string = 'asc'): Record<string, string>[] {
  return [...rows].sort((a, b) => {
    const va = a[sortBy] || '', vb = b[sortBy] || '';
    const na = parseFloat(va), nb = parseFloat(vb);
    if (!isNaN(na) && !isNaN(nb)) return order === 'desc' ? nb - na : na - nb;
    return order === 'desc' ? vb.localeCompare(va) : va.localeCompare(vb);
  });
}

function toCSV(rows: Record<string, string>[], headers?: string[]): string {
  if (rows.length === 0) return '';
  const h = headers || Object.keys(rows[0]);
  const lines = [h.join(','), ...rows.map(r => h.map(k => `"${(r[k] || '').replace(/"/g, '""')}"`).join(','))];
  return lines.join('\n');
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const { csv, delimiter, filters, columns, sort_by, sort_order, limit } = req.body || {};
  if (!csv || typeof csv !== 'string') return errorResponse(res, 'csv is required (string)', 400);
  if (csv.length > 10 * 1024 * 1024) return errorResponse(res, 'CSV too large (max 10MB)', 400);

  try {
    const startTime = Date.now();
    const parsed = parseCSV(csv, delimiter || ',');
    let result = parsed.rows;
    if (filters && typeof filters === 'object') result = filterRows(result, filters);
    if (columns && Array.isArray(columns)) result = selectColumns(result, columns);
    if (sort_by) result = sortRows(result, sort_by, sort_order || 'asc');
    if (limit && typeof limit === 'number') result = result.slice(0, limit);

    return successResponse(res, {
      headers: columns || parsed.headers, rows: result, row_count: result.length,
      original_row_count: parsed.rows.length, output_csv: toCSV(result, columns || parsed.headers),
      _meta: { skill: 'csv-excel-transformer', latency_ms: Date.now() - startTime, input_size: csv.length },
    });
  } catch (error: any) {
    return errorResponse(res, 'CSV processing failed', 500, error.message);
  }
}

export default authMiddleware(handler);
