import { RawSpreadsheetRow, ShoeModel, ShoeSize } from '../types/catalog';

/**
 * Intelligent extraction of shoe size and base model description.
 * Solves the critical bug where sizes smashed against color codes (e.g. "VM37/38", "CZ39", "4142")
 * caused models and size grades to split apart and get lost.
 */
export function smartExtract(desc: string): { baseDesc: string; size: string; repaired: boolean } {
  if (!desc) return { baseDesc: '', size: '', repaired: false };
  const str = desc.trim().replace(/\s+/g, ' ');

  // 1. Smashed double-size at end without space, e.g. "AZ/AZ/VM37/38", "VD41/42", "AZ33-38"
  const smashedDouble = str.match(/([A-Za-zÀ-ÿ])(\d{2}[\/\-]\d{2,4})$/);
  if (smashedDouble && smashedDouble.index !== undefined) {
    const size = smashedDouble[2];
    const baseDesc = str.slice(0, smashedDouble.index + 1).trim();
    return { baseDesc, size, repaired: true };
  }

  // 2. Smashed 4 digits without slash e.g. "4142" -> normalize to "41/42"
  const fourDigitSmashed = str.match(/\s+(\d{2})(\d{2})$/);
  if (fourDigitSmashed && fourDigitSmashed.index !== undefined) {
    const s1 = parseInt(fourDigitSmashed[1], 10);
    const s2 = parseInt(fourDigitSmashed[2], 10);
    if (s2 - s1 === 1 || s2 - s1 === 2) {
      return {
        baseDesc: str.slice(0, fourDigitSmashed.index).trim(),
        size: `${s1}/${s2}`,
        repaired: true,
      };
    }
  }

  // 3. Smashed single size without space e.g. "PT/CZ39", "CZ42"
  const smashedSingle = str.match(/([A-Za-zÀ-ÿ])(\d{2})$/);
  if (smashedSingle && smashedSingle.index !== undefined) {
    const size = smashedSingle[2];
    const baseDesc = str.slice(0, smashedSingle.index + 1).trim();
    return { baseDesc, size, repaired: true };
  }

  // 4. Standard size at end with space, e.g. " 41", " 37/38", " 33-38", " 43/44"
  const normalSize = str.match(/\s+(\d{2}(?:[\/\-]\d{2,4})?)$/i);
  if (normalSize && normalSize.index !== undefined) {
    return {
      baseDesc: str.slice(0, normalSize.index).trim(),
      size: normalSize[1],
      repaired: false,
    };
  }

  return { baseDesc: str, size: '', repaired: false };
}

/**
 * Automatically detects the shoe brand from description keywords
 */
export function detectBrand(desc: string): string {
  const upper = desc.toUpperCase();
  if (upper.includes('CARTAGO') || upper.includes('CART ')) return 'Cartago';
  if (upper.includes('RIDER')) return 'Rider';
  if (upper.includes('IPANEMA') || upper.includes('IP ')) return 'Ipanema';
  if (upper.includes('MORMAII')) return 'Mormaii';
  if (upper.includes('GRENDHA') || upper.includes('GDHA')) return 'Grendha';
  if (upper.includes('ZAXY')) return 'Zaxy';
  if (upper.includes('DISNEY')) return 'Disney';
  if (upper.includes('HELLO KITTY')) return 'Hello Kitty';
  if (upper.includes('BATMAN') || upper.includes('HEROES') || upper.includes('HOMEM-ARANHA')) return 'Licenciados';
  if (upper.includes('AZALEIA')) return 'Azaleia';
  if (upper.includes('OLYMPIKUS')) return 'Olympikus';
  return 'Outros';
}

/**
 * Groups raw rows from the Google Sheet into structured, unified shoe models.
 * Groups by normalized base model + colorway, aggregating sizes, barcodes, images and stock.
 */
export function groupRawProducts(rawRows: RawSpreadsheetRow[]): {
  products: ShoeModel[];
  repairedCount: number;
  duplicateCount: number;
} {
  const map = new Map<string, ShoeModel>();
  const seenRow = new Set<string>();
  let repairedCount = 0;
  let duplicateCount = 0;

  rawRows.forEach((row) => {
    const desc = (row.descricao || '').trim();
    if (!desc) return;

    const rowSig = `${row.codigo}_${desc}_${row.estoque}_${row.secao}`;
    if (seenRow.has(rowSig)) {
      duplicateCount++;
      return;
    }
    seenRow.add(rowSig);

    const { baseDesc, size, repaired } = smartExtract(desc);
    if (repaired) repairedCount++;

    const img = (row.imagem || '').trim();
    const secao = (row.secao || 'Geral').trim();
    const estoque = Math.max(0, parseInt(String(row.estoque || 0), 10) || 0);
    const codigo = (row.codigo || '').trim();
    const barcode = (row['Codigo de Barras'] || '').trim();

    const key = baseDesc.toLowerCase();
    const refMatch = baseDesc.match(/^(\d{4,6}|KIT\s+\d{4,6})/i);
    const referencia = refMatch ? refMatch[1] : codigo || '';
    const marca = detectBrand(baseDesc);

    if (!map.has(key)) {
      const tamanhos: ShoeSize[] = [];
      const sizeLabel = size || 'Grade';
      tamanhos.push({
        tamanho: sizeLabel,
        estoque,
        codigo,
        barcode,
      });

      const cleanKey = key.replace(/[^a-z0-9]/gi, '_').slice(0, 40);
      const uniqueId = codigo ? `${codigo}_${cleanKey}` : `mod_${cleanKey}`;

      map.set(key, {
        id: uniqueId,
        codigoPrincipal: codigo,
        codigos: codigo ? [codigo] : [],
        referencia,
        marca,
        descricao: baseDesc || desc,
        secao,
        imagem: img,
        todasImagens: img ? [img] : [],
        estoqueTotal: estoque,
        tamanhos,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      const g = map.get(key)!;
      if (img && !g.todasImagens.includes(img)) {
        g.todasImagens.push(img);
        if (!g.imagem) g.imagem = img;
      }
      if (codigo && !g.codigos.includes(codigo)) {
        g.codigos.push(codigo);
      }
      g.estoqueTotal += estoque;
      if (secao && (g.secao === 'Geral' || g.secao === '')) {
        g.secao = secao;
      }

      const sizeLabel = size || 'Grade';
      const existingSize = g.tamanhos.find((t) => t.tamanho === sizeLabel);
      if (existingSize) {
        existingSize.estoque += estoque;
        if (!existingSize.barcode && barcode) existingSize.barcode = barcode;
      } else {
        g.tamanhos.push({
          tamanho: sizeLabel,
          estoque,
          codigo,
          barcode,
        });
      }
      g.updatedAt = new Date().toISOString();
    }
  });

  const products = Array.from(map.values()).map((p) => {
    // Sort sizes numerically (e.g. 33, 34, 35/36, 37, 38, 41/42, 43)
    p.tamanhos.sort((a, b) => {
      const numA = parseInt(a.tamanho.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.tamanho.match(/\d+/)?.[0] || '0', 10);
      return numA - numB;
    });
    return p;
  });

  return { products, repairedCount, duplicateCount };
}

/**
 * Parses Google Sheets GViz output text into RawSpreadsheetRow[]
 */
export function parseSpreadsheetGViz(text: string): RawSpreadsheetRow[] {
  const match = text.match(/setResponse\(([\s\S]*)\);/);
  if (!match) {
    throw new Error('Formato GViz inválido retornado pela planilha');
  }
  const json = JSON.parse(match[1]);
  if (!json?.table?.cols || !json?.table?.rows) {
    throw new Error('Tabela da planilha não contém colunas ou linhas válidas');
  }

  const cols = json.table.cols.map((col: { label?: string; id?: string }, idx: number) =>
    (col.label || col.id || `col_${idx}`).trim()
  );

  return json.table.rows.map((row: { c?: Array<{ v?: string | number | null; f?: string | null }> }) => {
    const item: Record<string, string> = {};
    if (!row.c) return item as unknown as RawSpreadsheetRow;
    row.c.forEach((cell, idx) => {
      const colName = cols[idx];
      if (!colName) return;
      let val = '';
      if (cell) {
        if (cell.v !== null && cell.v !== undefined) {
          val = String(cell.v);
        } else if (cell.f !== null && cell.f !== undefined) {
          val = String(cell.f);
        }
      }
      item[colName] = val.trim();
    });
    return item as unknown as RawSpreadsheetRow;
  });
}
