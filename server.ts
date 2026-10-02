import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import { groupRawProducts, parseSpreadsheetGViz } from './src/utils/productParser.ts';
import { ShoeModel, SyncStats, RawSpreadsheetRow } from './src/types/catalog.ts';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'catalog.json');
const STATS_FILE = path.join(DATA_DIR, 'sync-stats.json');
const SEED_FILE = path.resolve(process.cwd(), 'src/data/initialProducts.json');

app.use(express.json({ limit: '10mb' }));

// Ensure data folder exists and initialize database if needed
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadDatabase(): ShoeModel[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading catalog.json, falling back to seed:', err);
  }

  // Fallback to seed file
  try {
    if (fs.existsSync(SEED_FILE)) {
      const seedContent = fs.readFileSync(SEED_FILE, 'utf8');
      const seedData = JSON.parse(seedContent);
      saveDatabase(seedData);
      return seedData;
    }
  } catch (err) {
    console.error('Error reading seed file:', err);
  }

  return [];
}

function saveDatabase(products: ShoeModel[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(products, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save database file:', err);
  }
}

function loadStats(): SyncStats {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    }
  } catch {
    // Ignore error
  }
  const products = loadDatabase();
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

function saveStats(stats: SyncStats) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save stats file:', err);
  }
}

// In-memory cache of products for ultra-fast response
let cachedProducts: ShoeModel[] = loadDatabase();
let currentStats: SyncStats = loadStats();

console.log(`[Database] Initialized with ${cachedProducts.length} shoe models.`);

// API Routes

// 1. Get all products with fast filter and search support
app.get('/api/products', (req: Request, res: Response) => {
  const { search, secao, marca, stockStatus } = req.query;

  let result = cachedProducts;

  if (secao && typeof secao === 'string' && secao !== 'all') {
    result = result.filter((p) => p.secao.toLowerCase() === secao.toLowerCase());
  }

  if (marca && typeof marca === 'string' && marca !== 'all') {
    result = result.filter((p) => p.marca.toLowerCase() === marca.toLowerCase());
  }

  if (stockStatus === 'in-stock') {
    result = result.filter((p) => p.estoqueTotal > 0);
  } else if (stockStatus === 'out-of-stock') {
    result = result.filter((p) => p.estoqueTotal <= 0);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    result = result.filter((p) => {
      const matchDesc = p.descricao.toLowerCase().includes(q);
      const matchCode = p.codigos.some((c) => c.toLowerCase().includes(q));
      const matchRef = p.referencia.toLowerCase().includes(q);
      const matchSize = p.tamanhos.some((t) => t.tamanho.toLowerCase().includes(q));
      const matchBarcode = p.tamanhos.some((t) => t.barcode?.toLowerCase().includes(q));
      return matchDesc || matchCode || matchRef || matchSize || matchBarcode;
    });
  }

  res.json({
    total: result.length,
    products: result,
    stats: currentStats,
  });
});

// 2. Get single product by id
app.get('/api/products/:id', (req: Request, res: Response) => {
  const product = cachedProducts.find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Produto não encontrado' });
    return;
  }
  res.json(product);
});

// 3. Update single product (e.g. stock adjust, title, image)
app.put('/api/products/:id', (req: Request, res: Response) => {
  const index = cachedProducts.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Produto não encontrado' });
    return;
  }

  const updated: ShoeModel = {
    ...cachedProducts[index],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  // Recalculate total stock from tamanhos if provided
  if (Array.isArray(updated.tamanhos)) {
    updated.estoqueTotal = updated.tamanhos.reduce((acc, t) => acc + (Math.max(0, parseInt(String(t.estoque), 10)) || 0), 0);
  }

  cachedProducts[index] = updated;
  saveDatabase(cachedProducts);

  res.json(updated);
});

// 4. Create new shoe model
app.post('/api/products', (req: Request, res: Response) => {
  const newProduct: ShoeModel = {
    id: req.body.id || `mod_${Date.now()}`,
    codigoPrincipal: req.body.codigoPrincipal || String(Date.now()).slice(-6),
    codigos: req.body.codigos || [req.body.codigoPrincipal || String(Date.now()).slice(-6)],
    referencia: req.body.referencia || '',
    marca: req.body.marca || 'Outros',
    descricao: req.body.descricao || 'Novo Modelo',
    secao: req.body.secao || 'Geral',
    imagem: req.body.imagem || '',
    todasImagens: req.body.imagem ? [req.body.imagem] : [],
    estoqueTotal: 0,
    tamanhos: req.body.tamanhos || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (Array.isArray(newProduct.tamanhos)) {
    newProduct.estoqueTotal = newProduct.tamanhos.reduce((acc, t) => acc + (parseInt(String(t.estoque), 10) || 0), 0);
  }

  cachedProducts.unshift(newProduct);
  saveDatabase(cachedProducts);

  res.status(201).json(newProduct);
});

// 5. Delete shoe model
app.delete('/api/products/:id', (req: Request, res: Response) => {
  const initialLength = cachedProducts.length;
  cachedProducts = cachedProducts.filter((p) => p.id !== req.params.id);
  if (cachedProducts.length === initialLength) {
    res.status(404).json({ error: 'Produto não encontrado' });
    return;
  }
  saveDatabase(cachedProducts);
  res.json({ success: true, message: 'Produto removido com sucesso' });
});

// 6. Live Sync from Google Sheets Helper
const DEFAULT_SPREADSHEET_ID = '1dMybAUvBxpbDTaWQyj02gBrPihZ_Odb__u3R0_HlRNQ';

async function performSync(spreadsheetId = DEFAULT_SPREADSHEET_ID): Promise<{
  success: boolean;
  stats: SyncStats;
  productsCount: number;
}> {
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;

  try {
    const rawData = await new Promise<string>((resolve, reject) => {
      const request = https.get(gvizUrl, (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`Erro ao conectar com Google Sheets: HTTP ${response.statusCode}`));
          return;
        }
        let data = '';
        response.on('data', (chunk) => (data += chunk));
        response.on('end', () => resolve(data));
      });
      request.on('error', (err) => reject(err));
      request.setTimeout(15000, () => {
        request.destroy();
        reject(new Error('Tempo limite excedido ao buscar dados da planilha'));
      });
    });

    const rawRows = parseSpreadsheetGViz(rawData);
    if (!rawRows || rawRows.length === 0) {
      throw new Error('Nenhuma linha encontrada na planilha.');
    }

    const { products, repairedCount, duplicateCount } = groupRawProducts(rawRows);
    const totalStock = products.reduce((acc, p) => acc + (p.estoqueTotal || 0), 0);

    cachedProducts = products;
    saveDatabase(cachedProducts);

    currentStats = {
      timestamp: new Date().toISOString(),
      totalRawRows: rawRows.length,
      uniqueModels: products.length,
      totalPairsInStock: totalStock,
      repairedSizesCount: repairedCount,
      skippedDuplicates: duplicateCount,
      status: 'success',
    };
    saveStats(currentStats);
    console.log(`[Auto-Sync] Planilha sincronizada com sucesso: ${products.length} modelos, ${totalStock} pares.`);

    return {
      success: true,
      stats: currentStats,
      productsCount: products.length,
    };
  } catch (error: any) {
    console.error('[Sync Error]', error);
    currentStats.status = 'error';
    currentStats.errorMessage = error?.message || 'Falha ao sincronizar planilha';
    saveStats(currentStats);
    throw error;
  }
}

// Background auto-sync interval: checks Google Sheets automatically every 3 minutes (180,000 ms)
const AUTO_SYNC_INTERVAL_MS = 3 * 60 * 1000;
setInterval(() => {
  console.log('[Auto-Sync] Executando verificação periódica da planilha Google Sheets...');
  performSync().catch((err) => {
    console.warn('[Auto-Sync] Falha na sincronização em segundo plano:', err.message);
  });
}, AUTO_SYNC_INTERVAL_MS);

// API endpoint for manual sync or UI trigger
app.post('/api/sync', async (req: Request, res: Response) => {
  const spreadsheetId =
    req.body.spreadsheetId ||
    req.query.spreadsheetId ||
    DEFAULT_SPREADSHEET_ID;

  try {
    const result = await performSync(spreadsheetId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Erro ao sincronizar com Google Sheets',
      stats: currentStats,
    });
  }
});

// Webhook endpoint: Can be called via Google Apps Script onEdit / onChange
app.all(['/api/webhook/google-sheets', '/api/sync/webhook'], async (req: Request, res: Response) => {
  const spreadsheetId = (req.body?.spreadsheetId || req.query?.spreadsheetId || DEFAULT_SPREADSHEET_ID) as string;
  console.log('[Webhook] Gatilho acionado pelo Google Sheets!');
  try {
    const result = await performSync(spreadsheetId);
    res.json({
      message: 'Catálogo sincronizado automaticamente via Webhook!',
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// 7. Image Proxy with long-term caching and CORS headers
app.get('/api/image-proxy', (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
    res.status(400).send('URL de imagem inválida');
    return;
  }

  const client = imageUrl.startsWith('https://') ? https : http;

  const proxyReq = client.get(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (proxyRes) => {
    if (!proxyRes.statusCode || proxyRes.statusCode >= 400) {
      res.redirect(imageUrl); // Redirect to direct image on proxy error
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    if (proxyRes.headers['content-type']) {
      res.setHeader('Content-Type', proxyRes.headers['content-type']);
    }

    proxyRes.pipe(res);
  });

  proxyReq.on('error', () => {
    res.redirect(imageUrl);
  });

  proxyReq.setTimeout(10000, () => {
    proxyReq.destroy();
    res.redirect(imageUrl);
  });
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Francal Calçados] Servidor rodando na porta ${PORT}`);
    // Initial auto-sync in background after server is ready
    setTimeout(() => {
      console.log('[Auto-Sync] Executando sincronização inicial com Google Sheets...');
      performSync().catch((err) => {
        console.warn('[Auto-Sync] Aviso: sincronização inicial online falhou, mantendo dados do banco:', err.message);
      });
    }, 2000);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
