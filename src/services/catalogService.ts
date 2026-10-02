import { ShoeModel, SyncStats, RawSpreadsheetRow } from '../types/catalog';
import { groupRawProducts, parseSpreadsheetGViz } from '../utils/productParser';
import initialProductsData from '../data/initialProducts.json';

const STORAGE_KEY_PRODUCTS = 'francal_catalog_products_v2';
const STORAGE_KEY_STATS = 'francal_catalog_stats_v2';
const DEFAULT_SHEET_ID = '1dMybAUvBxpbDTaWQyj02gBrPihZ_Odb__u3R0_HlRNQ';

export class CatalogService {
  /**
   * Loads products from localStorage or falls back to bundled initial products
   */
  static loadProducts(): ShoeModel[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PRODUCTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Erro ao ler produtos do localStorage:', err);
    }
    return initialProductsData as ShoeModel[];
  }

  /**
   * Saves products to localStorage
   */
  static saveProducts(products: ShoeModel[]) {
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    } catch (err) {
      console.error('Falha ao salvar produtos no localStorage:', err);
    }
  }

  /**
   * Loads sync statistics
   */
  static loadStats(): SyncStats {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_STATS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore
    }
    const products = this.loadProducts();
    const totalStock = products.reduce((acc, p) => acc + (p.estoqueTotal || 0), 0);
    return {
      timestamp: new Date().toISOString(),
      totalRawRows: 891,
      uniqueModels: products.length,
      totalPairsInStock: totalStock,
      repairedSizesCount: 30,
      skippedDuplicates: 52,
      status: 'idle',
    };
  }

  /**
   * Saves sync statistics
   */
  static saveStats(stats: SyncStats) {
    try {
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
    } catch {
      // Ignore
    }
  }

  /**
   * Sincroniza diretamente do Google Sheets no navegador.
   * Suporta fetch direto e fallback via JSONP Script injection (nunca bloqueado por CORS).
   */
  static async syncFromGoogleSheets(spreadsheetId = DEFAULT_SHEET_ID): Promise<{
    products: ShoeModel[];
    stats: SyncStats;
  }> {
    const cleanId = spreadsheetId.trim() || DEFAULT_SHEET_ID;
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json`;

    let rawText = '';

    // Tentativa 1: Fetch direto
    try {
      const res = await fetch(gvizUrl, { cache: 'no-store' });
      if (res.ok) {
        rawText = await res.text();
      }
    } catch (err) {
      console.warn('Fetch direto falhou, tentando fallback JSONP:', err);
    }

    // Tentativa 2: Fallback via JSONP (injetando script)
    if (!rawText) {
      rawText = await new Promise<string>((resolve, reject) => {
        const callbackName = `gviz_cb_${Date.now()}`;
        const script = document.createElement('script');
        script.src = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json;responseHandler:${callbackName}`;

        const timeout = setTimeout(() => {
          cleanUp();
          reject(new Error('Tempo limite excedido ao conectar com a planilha Google Sheets'));
        }, 12000);

        function cleanUp() {
          clearTimeout(timeout);
          delete (window as any)[callbackName];
          if (script.parentNode) script.parentNode.removeChild(script);
        }

        (window as any)[callbackName] = (jsonResponse: any) => {
          cleanUp();
          resolve(`setResponse(${JSON.stringify(jsonResponse)});`);
        };

        script.onerror = () => {
          cleanUp();
          reject(new Error('Erro de conexão ao acessar a planilha'));
        };

        document.body.appendChild(script);
      });
    }

    const rawRows = parseSpreadsheetGViz(rawText);
    if (!rawRows || rawRows.length === 0) {
      throw new Error('Nenhuma linha encontrada na planilha.');
    }

    const { products, repairedCount, duplicateCount } = groupRawProducts(rawRows);
    const totalStock = products.reduce((acc, p) => acc + (p.estoqueTotal || 0), 0);

    const stats: SyncStats = {
      timestamp: new Date().toISOString(),
      totalRawRows: rawRows.length,
      uniqueModels: products.length,
      totalPairsInStock: totalStock,
      repairedSizesCount: repairedCount,
      skippedDuplicates: duplicateCount,
      status: 'success',
    };

    this.saveProducts(products);
    this.saveStats(stats);

    return { products, stats };
  }

  /**
   * Salva alterações feitas em um modelo
   */
  static updateProduct(updated: ShoeModel): ShoeModel[] {
    const list = this.loadProducts();
    const index = list.findIndex((p) => p.id === updated.id);
    if (index !== -1) {
      list[index] = { ...updated, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(updated);
    }
    this.saveProducts(list);
    return list;
  }

  /**
   * Cria novo modelo
   */
  static createProduct(newProd: Partial<ShoeModel>): ShoeModel[] {
    const list = this.loadProducts();
    const cleanKey = (newProd.descricao || 'novo').toLowerCase().replace(/[^a-z0-9]/gi, '_').slice(0, 30);
    const model: ShoeModel = {
      id: `${newProd.codigoPrincipal || 'item'}_${cleanKey}_${Date.now()}`,
      codigoPrincipal: newProd.codigoPrincipal || String(Date.now()).slice(-6),
      codigos: [newProd.codigoPrincipal || String(Date.now()).slice(-6)],
      referencia: newProd.referencia || '',
      marca: newProd.marca || 'Outros',
      descricao: newProd.descricao || 'Novo Modelo',
      secao: newProd.secao || 'Geral',
      imagem: newProd.imagem || '',
      todasImagens: newProd.imagem ? [newProd.imagem] : [],
      estoqueTotal: newProd.estoqueTotal || 0,
      tamanhos: newProd.tamanhos || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.unshift(model);
    this.saveProducts(list);
    return list;
  }

  /**
   * Exclui um modelo
   */
  static deleteProduct(id: string): ShoeModel[] {
    const list = this.loadProducts();
    const filtered = list.filter((p) => p.id !== id);
    this.saveProducts(filtered);
    return filtered;
  }
}
