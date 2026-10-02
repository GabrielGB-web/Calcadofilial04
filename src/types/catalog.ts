export interface ShoeSize {
  tamanho: string;
  estoque: number;
  codigo: string;
  barcode?: string;
}

export interface ShoeModel {
  id: string;
  codigoPrincipal: string;
  codigos: string[];
  referencia: string;
  marca: string;
  descricao: string;
  secao: string;
  imagem: string;
  todasImagens: string[];
  estoqueTotal: number;
  tamanhos: ShoeSize[];
  precoSugerido?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RawSpreadsheetRow {
  codigo: string;
  descricao: string;
  'Codigo de Barras'?: string;
  estoque: string | number;
  secao: string;
  imagem: string;
}

export type ViewMode = 'grid' | 'compact' | 'list';

export type StockFilter = 'all' | 'in-stock' | 'out-of-stock';

export type SortOption =
  | 'favorites-first'
  | 'stock-desc'
  | 'stock-asc'
  | 'name-asc'
  | 'name-desc'
  | 'code-asc';

export interface CatalogFilters {
  search: string;
  secao: string;
  marca: string;
  stockFilter: StockFilter;
  size: string;
  minSize: number | null;
  maxSize: number | null;
  sortBy: SortOption;
  onlyFavorites: boolean;
}

export interface CartItem {
  id: string; // modelId + '-' + tamanho
  modelId: string;
  codigo: string;
  descricao: string;
  secao: string;
  marca: string;
  imagem: string;
  tamanho: string;
  estoqueDisponivel: number;
  quantidade: number;
  barcode?: string;
}

export interface SyncStats {
  timestamp: string;
  totalRawRows: number;
  uniqueModels: number;
  totalPairsInStock: number;
  repairedSizesCount: number;
  skippedDuplicates: number;
  status: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
}
