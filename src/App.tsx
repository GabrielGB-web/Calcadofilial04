import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  FileDown,
  ShoppingBag,
  Heart,
  Grid,
  List,
  LayoutGrid,
  Plus,
  Box,
  Tag,
  Database,
  Sparkles,
  ArrowUpDown,
  CheckCircle,
  X,
  Filter,
  Layers,
  ChevronDown,
  Eye,
  EyeOff,
  Share2,
  Smartphone,
  Phone,
  Home,
  Check,
} from 'lucide-react';
import initialProductsData from './data/initialProducts.json';
import {
  ShoeModel,
  ShoeSize,
  CartItem,
  SyncStats,
  ViewMode,
  StockFilter,
  SortOption,
} from './types/catalog';
import { ProductCard } from './components/ProductCard';
import { ProductListItem } from './components/ProductListItem';
import { ProductDetailModal } from './components/ProductDetailModal';
import { OrderDrawer } from './components/OrderDrawer';
import { SyncModal } from './components/SyncModal';
import { PdfExportModal } from './components/PdfExportModal';
import { ProductEditModal } from './components/ProductEditModal';
import { NewProductModal } from './components/NewProductModal';
import { CatalogService } from './services/catalogService';

export default function App() {
  // Products state (seed data ensures 0ms render, updated from CatalogService)
  const [products, setProducts] = useState<ShoeModel[]>(() => CatalogService.loadProducts());
  const [loading, setLoading] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats>(() => CatalogService.loadStats());

  // User preferences
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('francal_favorites') || '[]');
    } catch {
      return [];
    }
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('francal_cart') || '[]');
    } catch {
      return [];
    }
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('francal_viewMode') as ViewMode) || 'grid';
  });

  // Modo Cliente / Apresentação (hides exact stock numbers and warehouse data)
  const [isClientMode, setIsClientMode] = useState<boolean>(() => {
    return localStorage.getItem('francal_clientMode') === 'true';
  });

  // Filter States
  const [search, setSearch] = useState('');
  const [secaoFilter, setSecaoFilter] = useState('all');
  const [marcaFilter, setMarcaFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sizeFilter, setSizeFilter] = useState('');
  const [minSize, setMinSize] = useState<number | null>(null);
  const [maxSize, setMaxSize] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('favorites-first');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Progressive rendering for zero lag on 380+ items
  const [displayCount, setDisplayCount] = useState(24);

  // Modals state
  const [detailProduct, setDetailProduct] = useState<ShoeModel | null>(null);
  const [editProduct, setEditProduct] = useState<ShoeModel | null>(null);
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Persistence to localStorage
  useEffect(() => {
    localStorage.setItem('francal_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('francal_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('francal_viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('francal_clientMode', String(isClientMode));
  }, [isClientMode]);

  // Keyboard shortcut: Press "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Fetch updated catalog with automatic background sync and local fallback
  const fetchProducts = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
          CatalogService.saveProducts(data.products);
        }
        if (data.stats) {
          setSyncStats(data.stats);
          CatalogService.saveStats(data.stats);
        }
        return;
      }
    } catch {
      // Offline or static SPA mode: loads from CatalogService
    } finally {
      if (showLoading) setLoading(false);
    }

    const localProds = CatalogService.loadProducts();
    setProducts(localProds);
    setSyncStats(CatalogService.loadStats());
  };

  // Automatic background refresh every 3 minutes and on window focus
  useEffect(() => {
    fetchProducts();

    const runAutoSync = async () => {
      try {
        const { products: fresh, stats: freshStats } = await CatalogService.syncFromGoogleSheets();
        setProducts(fresh);
        setSyncStats(freshStats);
      } catch (err) {
        console.warn('Auto-sync background check:', err);
      }
    };

    // Auto-sync interval (every 3 minutes)
    const interval = setInterval(runAutoSync, 3 * 60 * 1000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchProducts();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Run Google Sheets sync manual trigger (tries backend proxy, falls back to direct browser sync)
  const handleRunSync = async (customSheetId?: string) => {
    setIsSyncing(true);
    try {
      // 1. Try backend sync endpoint if active
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spreadsheetId: customSheetId }),
        });
        if (res.ok) {
          const data = await res.json();
          setSyncStats(data.stats);
          await fetchProducts(true);
          showToast(`Catálogo sincronizado! ${data.productsCount} modelos.`);
          return;
        }
      } catch {
        // Backend not available in static mode
      }

      // 2. Direct browser Google Sheets sync (works in any browser / static hosting)
      const { products: syncedProds, stats: freshStats } = await CatalogService.syncFromGoogleSheets(customSheetId);
      setProducts(syncedProds);
      setSyncStats(freshStats);
      showToast(`Catálogo sincronizado com sucesso! ${syncedProds.length} modelos.`);
    } catch (err: any) {
      console.error('Erro na sincronização:', err);
      showToast(`Erro ao sincronizar: ${err?.message || 'Verifique sua conexão'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = (product: ShoeModel) => {
    const code = product.codigoPrincipal;
    if (favorites.includes(code)) {
      setFavorites(favorites.filter((c) => c !== code));
      showToast('Removido dos favoritos');
    } else {
      setFavorites([...favorites, code]);
      showToast('Adicionado aos favoritos ❤️');
    }
  };

  // Add item to WhatsApp Cart
  const handleAddToCart = (product: ShoeModel, size: ShoeSize, quantity: number) => {
    const itemId = `${product.id}-${size.tamanho}`;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === itemId);
      if (existing) {
        return prev.map((i) =>
          i.id === itemId ? { ...i, quantidade: i.quantidade + quantity } : i
        );
      }
      return [
        ...prev,
        {
          id: itemId,
          modelId: product.id,
          codigo: size.codigo || product.codigoPrincipal,
          descricao: product.descricao,
          secao: product.secao,
          marca: product.marca,
          imagem: product.imagem,
          tamanho: size.tamanho,
          estoqueDisponivel: size.estoque,
          quantidade: quantity,
          barcode: size.barcode,
        },
      ];
    });

    showToast(`Adicionado: ${product.descricao} (${size.tamanho}) - ${quantity} un.`);
    setIsOrderDrawerOpen(true);
  };

  const handleUpdateCartQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQ = item.quantidade + delta;
            return newQ > 0 ? { ...item, quantidade: newQ } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearCart = () => {
    if (confirm('Deseja limpar todos os itens do pedido?')) {
      setCart([]);
    }
  };

  // Save edited product
  const handleSaveProduct = async (updated: ShoeModel) => {
    try {
      fetch(`/api/products/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
    } catch {
      // Ignore
    }
    const updatedList = CatalogService.updateProduct(updated);
    setProducts(updatedList);
    showToast('Produto atualizado com sucesso!');
  };

  // Create product
  const handleCreateProduct = async (newProd: Partial<ShoeModel>) => {
    try {
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProd),
      }).catch(() => {});
    } catch {
      // Ignore
    }
    const updatedList = CatalogService.createProduct(newProd);
    setProducts(updatedList);
    showToast('Novo produto cadastrado!');
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    try {
      fetch(`/api/products/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch {
      // Ignore
    }
    const updatedList = CatalogService.deleteProduct(id);
    setProducts(updatedList);
    showToast('Produto excluído');
  };

  // Unique sections and brands for filter menus
  const uniqueSecoes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.secao) set.add(p.secao);
    });
    return Array.from(set).sort();
  }, [products]);

  const uniqueMarcas = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.marca) set.add(p.marca);
    });
    return Array.from(set).sort();
  }, [products]);

  // Common shoe size buttons for instant 1-tap filtering
  const quickSizes = ['all', '33/34', '35', '36', '37', '38', '39', '40', '41', '42', '43/44'];

  // Filter and Sort Products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Section Filter
    if (secaoFilter !== 'all') {
      result = result.filter((p) => p.secao.toLowerCase() === secaoFilter.toLowerCase());
    }

    // Brand Filter
    if (marcaFilter !== 'all') {
      result = result.filter((p) => p.marca.toLowerCase() === marcaFilter.toLowerCase());
    }

    // Stock Filter
    if (stockFilter === 'in-stock') {
      result = result.filter((p) => p.estoqueTotal > 0);
    } else if (stockFilter === 'out-of-stock') {
      result = result.filter((p) => p.estoqueTotal <= 0);
    }

    // Only Favorites
    if (onlyFavorites) {
      result = result.filter((p) => favorites.includes(p.codigoPrincipal));
    }

    // Size specific filter
    if (sizeFilter && sizeFilter !== 'all') {
      result = result.filter((p) =>
        p.tamanhos.some((t) => t.tamanho.toLowerCase().includes(sizeFilter.toLowerCase()))
      );
    }

    // Number range filter (Min / Max)
    if (minSize !== null || maxSize !== null) {
      result = result.filter((p) => {
        return p.tamanhos.some((t) => {
          const numbers = (t.tamanho.match(/\d+/g) || []).map((m) => parseInt(m, 10));
          if (numbers.length === 0) return false;
          return numbers.some((sizeNum) => {
            const matchesMin = minSize === null || sizeNum >= minSize;
            const matchesMax = maxSize === null || sizeNum <= maxSize;
            const matchesStock = stockFilter !== 'in-stock' || t.estoque > 0;
            return matchesMin && matchesMax && matchesStock;
          });
        });
      });
    }

    // Text Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((p) => {
        const descMatch = p.descricao.toLowerCase().includes(q);
        const codeMatch = p.codigos.some((c) => c.toLowerCase().includes(q));
        const refMatch = p.referencia.toLowerCase().includes(q);
        const brandMatch = p.marca.toLowerCase().includes(q);
        const sizeMatch = p.tamanhos.some((t) => t.tamanho.toLowerCase().includes(q));
        const barcodeMatch = p.tamanhos.some((t) => t.barcode?.toLowerCase().includes(q));
        return descMatch || codeMatch || refMatch || brandMatch || sizeMatch || barcodeMatch;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'favorites-first') {
        const aFav = favorites.includes(a.codigoPrincipal);
        const bFav = favorites.includes(b.codigoPrincipal);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return b.estoqueTotal - a.estoqueTotal;
      }
      if (sortBy === 'stock-desc') return b.estoqueTotal - a.estoqueTotal;
      if (sortBy === 'stock-asc') return a.estoqueTotal - b.estoqueTotal;
      if (sortBy === 'name-asc') return a.descricao.localeCompare(b.descricao);
      if (sortBy === 'name-desc') return b.descricao.localeCompare(a.descricao);
      if (sortBy === 'code-asc') return a.codigoPrincipal.localeCompare(b.codigoPrincipal);
      return 0;
    });

    return result;
  }, [
    products,
    secaoFilter,
    marcaFilter,
    stockFilter,
    onlyFavorites,
    favorites,
    sizeFilter,
    minSize,
    maxSize,
    search,
    sortBy,
  ]);

  // Reset pagination on filter change
  useEffect(() => {
    setDisplayCount(24);
  }, [
    search,
    secaoFilter,
    marcaFilter,
    stockFilter,
    sizeFilter,
    minSize,
    maxSize,
    sortBy,
    onlyFavorites,
  ]);

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, displayCount);
  }, [filteredProducts, displayCount]);

  const favoriteProductsList = useMemo(() => {
    return products.filter((p) => favorites.includes(p.codigoPrincipal));
  }, [products, favorites]);

  const handleNavigateModal = (direction: -1 | 1) => {
    if (!detailProduct) return;
    const currentIndex = filteredProducts.findIndex((p) => p.id === detailProduct.id);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = filteredProducts.length - 1;
    if (nextIndex >= filteredProducts.length) nextIndex = 0;

    setDetailProduct(filteredProducts[nextIndex]);
  };

  const totalPairsInCart = cart.reduce((acc, i) => acc + i.quantidade, 0);
  const totalStockAll = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.estoqueTotal || 0), 0);
  }, [products]);

  const activeFiltersCount =
    (secaoFilter !== 'all' ? 1 : 0) +
    (marcaFilter !== 'all' ? 1 : 0) +
    (stockFilter !== 'all' ? 1 : 0) +
    (onlyFavorites ? 1 : 0) +
    (sizeFilter && sizeFilter !== 'all' ? 1 : 0) +
    (minSize !== null || maxSize !== null ? 1 : 0);

  const handleClearAllFilters = () => {
    setSearch('');
    setSecaoFilter('all');
    setMarcaFilter('all');
    setStockFilter('all');
    setSizeFilter('');
    setMinSize(null);
    setMaxSize(null);
    setOnlyFavorites(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-20 md:pb-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-5 right-4 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200 border border-slate-700 backdrop-blur-md">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* CLIENT MODE ALERT BANNER */}
      {isClientMode && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-xs sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4" />
            <span>Modo Apresentação ao Cliente Ativo (Quantidades exatas de estoque ocultas)</span>
          </div>
          <button
            type="button"
            onClick={() => setIsClientMode(false)}
            className="bg-slate-950 text-white px-2.5 py-0.5 rounded-md text-[11px] font-bold cursor-pointer hover:bg-slate-800"
          >
            Sair do Modo Cliente
          </button>
        </div>
      )}

      {/* HEADER ELEGANTE - FRANCAL CALÇADOS */}
      <header className="bg-gradient-to-r from-[#0b1a30] via-[#1b365d] to-[#0f2748] text-white shadow-xl relative overflow-hidden border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-7">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            {/* Title & Brand */}
            <div className="text-center md:text-left w-full md:w-auto">
              <div className="flex items-center justify-between md:justify-start gap-2">
                <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-amber-400 text-[10px] sm:text-xs font-bold tracking-widest uppercase">
                  <Sparkles className="w-3 h-3" />
                  <span>CATÁLOGO 2026</span>
                </div>

                {/* Mobile Client Mode toggle */}
                <button
                  type="button"
                  onClick={() => setIsClientMode(!isClientMode)}
                  className={`md:hidden px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border cursor-pointer ${
                    isClientMode
                      ? 'bg-amber-400 text-slate-950 border-amber-400'
                      : 'bg-white/10 text-white border-white/20'
                  }`}
                >
                  {isClientMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{isClientMode ? 'Cliente' : 'Vendedor'}</span>
                </button>
              </div>

              <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white drop-shadow-md mt-1">
                Catálogo Francal Calçados
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 hidden sm:block max-w-xl font-medium">
                Carregamento ultra-rápido com lazy loading, sincronização periódica e agrupamento preciso de grades.
              </p>
            </div>

            {/* Header Action Buttons (Desktop & Tablet) */}
            <div className="hidden md:flex flex-wrap items-center justify-end gap-2.5">
              {/* Client Mode Switch */}
              <button
                type="button"
                onClick={() => setIsClientMode(!isClientMode)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isClientMode
                    ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
                title="Modo Cliente: oculta códigos internos e quantidades de estoque para mostrar ao comprador"
              >
                {isClientMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{isClientMode ? 'Modo Cliente Ativo' : 'Modo Apresentação'}</span>
              </button>

              {/* WhatsApp Order Pill */}
              <button
                type="button"
                onClick={() => setIsOrderDrawerOpen(true)}
                className="relative px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Pedido</span>
                <span className="bg-slate-950 text-white text-[11px] px-2 py-0.5 rounded-full font-mono">
                  {totalPairsInCart} pares
                </span>
              </button>

              {/* Favorites Pill */}
              <button
                type="button"
                onClick={() => setOnlyFavorites(!onlyFavorites)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  onlyFavorites
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                }`}
              >
                <Heart className={`w-4 h-4 ${onlyFavorites ? 'fill-current' : ''}`} />
                <span>Favoritos ({favorites.length})</span>
              </button>

              {/* PDF Export */}
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-amber-400" />
                <span>PDF</span>
              </button>

              {/* Sync Button */}
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Sincronizar dados com Google Sheets"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sincronizar</span>
              </button>

              {/* Add New Product Button */}
              <button
                type="button"
                onClick={() => setIsNewProductModalOpen(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                title="Cadastrar novo calçado"
              >
                <Plus className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar (Desktop) */}
          <div className="hidden sm:grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-white/10">
            <div className="bg-white/5 backdrop-blur-xs p-2 rounded-xl border border-white/10 flex items-center gap-2">
              <span className="text-base">🏷️</span>
              <div>
                <span className="text-[10px] text-slate-300 block">Modelos</span>
                <span className="text-xs font-extrabold text-white font-mono">{products.length} modelos</span>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xs p-2 rounded-xl border border-white/10 flex items-center gap-2">
              <span className="text-base">📦</span>
              <div>
                <span className="text-[10px] text-slate-300 block">Estoque Geral</span>
                <span className="text-xs font-extrabold text-emerald-400 font-mono">
                  {totalStockAll.toLocaleString('pt-BR')} pares
                </span>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xs p-2 rounded-xl border border-white/10 flex items-center gap-2">
              <span className="text-base">⚡</span>
              <div>
                <span className="text-[10px] text-slate-300 block">Grades Reparadas</span>
                <span className="text-xs font-extrabold text-blue-300 font-mono">30 sem perda</span>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xs p-2 rounded-xl border border-white/10 flex items-center gap-2">
              <span className="text-base">🔄</span>
              <div>
                <span className="text-[10px] text-slate-300 block">Auto-Sync</span>
                <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Ativo (3 min)
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-5 w-full flex-1">
        {/* CONTROLS CARD */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-3 sm:p-4 mb-4 sticky top-0 sm:top-3 z-30 backdrop-blur-lg bg-white/95">
          {/* Top Search Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar modelo, cor, tamanho..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 focus:bg-white transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mobile Filter Button */}
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="md:hidden p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 relative cursor-pointer"
            >
              <Filter className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 rounded-full text-[9px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-2">
              <select
                value={secaoFilter}
                onChange={(e) => setSecaoFilter(e.target.value)}
                aria-label="Filtrar por Seção"
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700"
              >
                <option value="all">Todas as Seções</option>
                {uniqueSecoes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                aria-label="Filtrar por Estoque"
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700"
              >
                <option value="all">Estoque: Todos</option>
                <option value="in-stock">📦 Em Estoque (&gt;0)</option>
                <option value="out-of-stock">❌ Esgotados (0)</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Ordenar Produtos"
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700"
              >
                <option value="favorites-first">❤️ Favoritos primeiro</option>
                <option value="stock-desc">📦 Maior estoque</option>
                <option value="stock-asc">📉 Menor estoque</option>
                <option value="name-asc">🔤 Nome (A-Z)</option>
                <option value="name-desc">🔤 Nome (Z-A)</option>
                <option value="code-asc">🏷️ Código</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded-lg text-xs cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white shadow-xs text-amber-700 font-bold' : 'text-slate-500'
                  }`}
                  title="Grade Visual"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('compact')}
                  className={`p-1 rounded-lg text-xs cursor-pointer ${
                    viewMode === 'compact' ? 'bg-white shadow-xs text-amber-700 font-bold' : 'text-slate-500'
                  }`}
                  title="Grade Compacta"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1 rounded-lg text-xs cursor-pointer ${
                    viewMode === 'list' ? 'bg-white shadow-xs text-amber-700 font-bold' : 'text-slate-500'
                  }`}
                  title="Lista"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Filter Carousel 1: Brand Pills (Smooth Horizontal Touch Scroll) */}
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0 mr-1">
              Marcas:
            </span>
            <button
              type="button"
              onClick={() => setMarcaFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex-shrink-0 transition-all cursor-pointer ${
                marcaFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas
            </button>
            {uniqueMarcas.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMarcaFilter(marcaFilter === m ? 'all' : m)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex-shrink-0 transition-all cursor-pointer ${
                  marcaFilter === m
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Quick Filter Carousel 2: Shoe Sizes (1-Tap for "O que tem tamanho 37?") */}
          <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0 mr-1">
              Grades:
            </span>
            <button
              type="button"
              onClick={() => setSizeFilter('')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex-shrink-0 transition-all cursor-pointer ${
                !sizeFilter
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            {quickSizes.filter((s) => s !== 'all').map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSizeFilter(sizeFilter === s ? '' : s)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold flex-shrink-0 transition-all cursor-pointer ${
                  sizeFilter === s
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* RESULTS HEADER & COUNTER */}
        <div className="flex items-center justify-between mb-3 px-1 text-xs text-slate-600">
          <div className="font-semibold flex items-center gap-1.5">
            <span>
              <strong className="text-slate-900">{Math.min(visibleProducts.length, filteredProducts.length)}</strong> de{' '}
              <strong className="text-slate-900">{filteredProducts.length}</strong> modelo(s)
            </span>
            {filteredProducts.length !== products.length && (
              <span className="text-slate-400 text-[11px]">({products.length} no total)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-[11px] text-red-500 font-bold hover:underline cursor-pointer"
              >
                Limpar Filtros ({activeFiltersCount})
              </button>
            )}
            {onlyFavorites && (
              <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200">
                Favoritos
              </span>
            )}
          </div>
        </div>

        {/* EMPTY STATE */}
        {filteredProducts.length === 0 && (
          <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200 shadow-sm my-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">Nenhum calçado encontrado</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Tente buscar por outro modelo ou limpe os filtros para visualizar todo o catálogo.
            </p>
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 cursor-pointer shadow-sm"
            >
              Restaurar Catálogo Completo
            </button>
          </div>
        )}

        {/* PRODUCTS RENDERING */}
        {viewMode === 'list' ? (
          <div className="space-y-2.5 sm:space-y-3">
            {visibleProducts.map((prod, idx) => (
              <ProductListItem
                key={`${prod.id}-${idx}`}
                product={prod}
                isFavorited={favorites.includes(prod.codigoPrincipal)}
                onToggleFavorite={handleToggleFavorite}
                onOpenDetails={setDetailProduct}
                onQuickAddSize={(p, s) => handleAddToCart(p, s, 1)}
                isClientMode={isClientMode}
              />
            ))}
          </div>
        ) : (
          <div
            className={`grid gap-3 sm:gap-4 md:gap-5 ${
              viewMode === 'compact'
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}
          >
            {visibleProducts.map((prod, idx) => (
              <ProductCard
                key={`${prod.id}-${idx}`}
                product={prod}
                isFavorited={favorites.includes(prod.codigoPrincipal)}
                onToggleFavorite={handleToggleFavorite}
                onOpenDetails={setDetailProduct}
                onQuickAddSize={(p, s) => handleAddToCart(p, s, 1)}
                isClientMode={isClientMode}
              />
            ))}
          </div>
        )}

        {/* "CARREGAR MAIS" BUTTON (Progressive Infinite Rendering) */}
        {displayCount < filteredProducts.length && (
          <div className="mt-6 text-center pb-4">
            <button
              type="button"
              onClick={() => setDisplayCount((c) => c + 24)}
              className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 rounded-xl text-xs font-bold text-slate-800 shadow-sm transition-all cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <span>Carregar Mais ({filteredProducts.length - displayCount} restantes)</span>
              <ChevronDown className="w-4 h-4 text-amber-600" />
            </button>
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (FIXED APP-STYLE TAB BAR) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-3 flex items-center justify-around shadow-2xl">
        {/* Catálogo Home */}
        <button
          type="button"
          onClick={() => {
            handleClearAllFilters();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-0.5 text-slate-600 hover:text-amber-600 cursor-pointer py-1 px-2"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Catálogo</span>
        </button>

        {/* Filtros */}
        <button
          type="button"
          onClick={() => setIsMobileFilterOpen(true)}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 cursor-pointer relative ${
            activeFiltersCount > 0 ? 'text-amber-600 font-bold' : 'text-slate-600'
          }`}
        >
          <Filter className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="absolute top-0 right-2 w-3.5 h-3.5 bg-amber-500 text-slate-950 rounded-full text-[9px] font-bold flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Favoritos */}
        <button
          type="button"
          onClick={() => setOnlyFavorites(!onlyFavorites)}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 cursor-pointer relative ${
            onlyFavorites ? 'text-red-500 font-bold' : 'text-slate-600'
          }`}
        >
          <Heart className={`w-5 h-5 ${onlyFavorites ? 'fill-current text-red-500' : ''}`} />
          <span className="text-[10px] font-semibold">Favoritos</span>
          {favorites.length > 0 && (
            <span className="absolute top-0 right-2 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
              {favorites.length}
            </span>
          )}
        </button>

        {/* Pedido WhatsApp Cart */}
        <button
          type="button"
          onClick={() => setIsOrderDrawerOpen(true)}
          className="flex flex-col items-center gap-0.5 text-slate-800 hover:text-amber-600 py-1 px-2 cursor-pointer relative"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-amber-500" />
            {totalPairsInCart > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-slate-950 text-amber-400 rounded-full text-[9px] font-bold px-1 min-w-[16px] text-center">
                {totalPairsInCart}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold">Pedido</span>
        </button>

        {/* Modo Cliente Toggle */}
        <button
          type="button"
          onClick={() => {
            const next = !isClientMode;
            setIsClientMode(next);
            showToast(next ? 'Modo Apresentação ativado (estoque oculto)' : 'Modo Vendedor ativado');
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 cursor-pointer ${
            isClientMode ? 'text-amber-600 font-bold' : 'text-slate-400'
          }`}
        >
          {isClientMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          <span className="text-[10px] font-semibold">{isClientMode ? 'Cliente' : 'Estoque'}</span>
        </button>
      </nav>

      {/* MOBILE FILTER BOTTOM SHEET DRAWER */}
      {isMobileFilterOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsMobileFilterOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-white rounded-t-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-500" />
                Filtros do Catálogo
              </h3>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Seção / Categoria:</label>
              <select
                value={secaoFilter}
                onChange={(e) => setSecaoFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50"
              >
                <option value="all">Todas as Seções</option>
                {uniqueSecoes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock status */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Disponibilidade:</label>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50"
              >
                <option value="all">Todos os Produtos</option>
                <option value="in-stock">📦 Apenas em Estoque (&gt; 0)</option>
                <option value="out-of-stock">❌ Esgotados</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Ordem de Exibição:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50"
              >
                <option value="favorites-first">❤️ Favoritos primeiro</option>
                <option value="stock-desc">📦 Maior estoque</option>
                <option value="stock-asc">📉 Menor estoque</option>
                <option value="name-asc">🔤 Nome (A-Z)</option>
                <option value="name-desc">🔤 Nome (Z-A)</option>
              </select>
            </div>

            {/* View Mode in Mobile */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Visualização:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    viewMode === 'grid' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  Grade
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('compact')}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    viewMode === 'compact' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  Compacta
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    viewMode === 'list' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  Lista
                </button>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50"
              >
                Limpar Tudo
              </button>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow-md"
              >
                Ver ({filteredProducts.length}) Resultados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800 mt-auto hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-slate-200 text-sm">Catálogo Francal Calçados 2026</span>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Sistema otimizado com auto-sync de 3 minutos, lazy loading inteligente e agrupamento de famílias.
            </p>
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-xs">
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className="hover:text-amber-400 cursor-pointer flex items-center gap-1"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Diagnóstico do Banco</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="hover:text-amber-400 cursor-pointer flex items-center gap-1"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Relatório PDF</span>
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS & DRAWERS */}
      <ProductDetailModal
        isOpen={!!detailProduct}
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onNavigate={handleNavigateModal}
        isFavorited={detailProduct ? favorites.includes(detailProduct.codigoPrincipal) : false}
        onToggleFavorite={handleToggleFavorite}
        onAddToCart={handleAddToCart}
        onEditProduct={(p) => {
          setDetailProduct(null);
          setEditProduct(p);
        }}
        isClientMode={isClientMode}
      />

      <OrderDrawer
        isOpen={isOrderDrawerOpen}
        onClose={() => setIsOrderDrawerOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
      />

      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        stats={syncStats}
        onRunSync={handleRunSync}
        isSyncing={isSyncing}
      />

      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        filteredProducts={filteredProducts}
        favoriteProducts={favoriteProductsList}
      />

      <ProductEditModal
        isOpen={!!editProduct}
        product={editProduct}
        onClose={() => setEditProduct(null)}
        onSave={handleSaveProduct}
        onDelete={handleDeleteProduct}
      />

      <NewProductModal
        isOpen={isNewProductModalOpen}
        onClose={() => setIsNewProductModalOpen(false)}
        onCreate={handleCreateProduct}
      />
    </div>
  );
}
