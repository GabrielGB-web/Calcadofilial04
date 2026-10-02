import React, { useEffect, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingBag,
  Barcode,
  Copy,
  Check,
  Edit2,
  Box,
  Tag,
  Share2,
  Sun,
  Moon,
} from 'lucide-react';
import { ShoeModel, ShoeSize } from '../types/catalog';

interface ProductDetailModalProps {
  product: ShoeModel | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (direction: -1 | 1) => void;
  isFavorited: boolean;
  onToggleFavorite: (product: ShoeModel) => void;
  onAddToCart: (product: ShoeModel, size: ShoeSize, quantity: number) => void;
  onEditProduct: (product: ShoeModel) => void;
  isClientMode?: boolean;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onNavigate,
  isFavorited,
  onToggleFavorite,
  onAddToCart,
  onEditProduct,
  isClientMode = false,
}) => {
  const [selectedSize, setSelectedSize] = useState<ShoeSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isDarkBackdrop, setIsDarkBackdrop] = useState(false);

  useEffect(() => {
    if (product && product.tamanhos.length > 0) {
      // Pick first in-stock size or first size
      const inStock = product.tamanhos.find((t) => t.estoque > 0) || product.tamanhos[0];
      setSelectedSize(inStock);
      setQuantity(1);
    }
  }, [product]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onNavigate(-1);
      else if (e.key === 'ArrowRight') onNavigate(1);
      else if (e.key === 'f' || e.key === 'F') {
        if (product) onToggleFavorite(product);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNavigate, onClose, product, onToggleFavorite]);

  if (!isOpen || !product) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    if (Math.abs(deltaX) > 40) {
      if (deltaX > 0) onNavigate(-1);
      else onNavigate(1);
    }
    setTouchStartX(null);
  };

  const handleShareWhatsApp = () => {
    const sizesInStock = product.tamanhos
      .filter((t) => t.estoque > 0)
      .map((t) => t.tamanho)
      .join(', ');

    let text = `👟 *${product.descricao}*\n`;
    text += `🏷️ Marca: ${product.marca} | Seção: ${product.secao}\n`;
    text += `📏 *Grades disponíveis:* ${sizesInStock || 'Consultar'}\n`;
    if (product.imagem) text += `📸 Foto: ${product.imagem}\n`;
    text += `\nEnviado via Catálogo Francal Calçados`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyBarcode = (barcode: string) => {
    if (!barcode) return;
    navigator.clipboard.writeText(barcode);
    setCopiedBarcode(barcode);
    setTimeout(() => setCopiedBarcode(null), 2000);
  };

  const handleShareProduct = () => {
    const text = `Confira ${product.descricao} (${product.estoqueTotal} pares disponíveis) no Catálogo Francal: ${window.location.origin}`;
    if (navigator.share) {
      navigator.share({ title: product.descricao, text, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const maxAvailable = selectedSize ? selectedSize.estoque : product.estoqueTotal;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col md:flex-row shadow-2xl border border-slate-700/30"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Prev / Next Floating Navigation Buttons */}
        <button
          type="button"
          onClick={() => onNavigate(-1)}
          aria-label="Modelo Anterior (Seta Esquerda)"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-lg transition-transform active:scale-90 cursor-pointer hidden sm:flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate(1)}
          aria-label="Próximo Modelo (Seta Direita)"
          className="absolute right-2 md:right-[48%] top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-lg transition-transform active:scale-90 cursor-pointer hidden sm:flex items-center justify-center"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Left Column: Image Preview with Touch Swipe for Mobile */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`md:w-1/2 flex flex-col items-center justify-center relative p-6 min-h-[320px] md:min-h-[480px] select-none transition-colors duration-200 md:border-r ${
            isDarkBackdrop
              ? 'bg-slate-950 border-slate-800'
              : 'bg-gradient-to-b from-slate-50 via-white to-slate-100/60 border-slate-200'
          }`}
        >
          {/* Subtle Studio Glow Pedestal */}
          <div className="absolute inset-0 bg-radial from-slate-200/20 via-transparent to-transparent pointer-events-none" />

          {/* Standardized Footwear Display Canvas */}
          <div className="w-full h-full max-h-[340px] md:max-h-[440px] flex items-center justify-center p-2 sm:p-4">
            <img
              src={product.imagem || 'https://via.placeholder.com/600x450?text=Sem+Imagem'}
              alt={product.descricao}
              className={`max-h-[290px] md:max-h-[410px] max-w-full object-contain transition-transform hover:scale-105 duration-300 pointer-events-none ${
                isDarkBackdrop
                  ? 'drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]'
                  : 'drop-shadow-[0_10px_20px_rgba(0,0,0,0.08)]'
              }`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x450?text=Imagem+Indisponivel';
              }}
            />
          </div>

          {/* Quick Favorite on image */}
          <button
            type="button"
            onClick={() => onToggleFavorite(product)}
            className={`absolute top-4 left-4 p-2.5 rounded-full backdrop-blur-md transition-transform duration-150 active:scale-90 shadow-md cursor-pointer ${
              isFavorited
                ? 'bg-red-500 text-white'
                : isDarkBackdrop
                ? 'bg-white/20 text-white hover:text-red-400'
                : 'bg-white/90 text-slate-700 hover:text-red-500 border border-slate-200'
            }`}
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
          </button>

          {/* Backdrop Mode Toggle (Light/Dark Studio) */}
          <button
            type="button"
            onClick={() => setIsDarkBackdrop(!isDarkBackdrop)}
            title={isDarkBackdrop ? 'Mudar para Fundo Claro' : 'Mudar para Fundo Escuro'}
            aria-label="Alternar fundo da imagem"
            className={`absolute top-4 left-16 p-2.5 rounded-full backdrop-blur-md shadow-md transition-all active:scale-90 cursor-pointer ${
              isDarkBackdrop
                ? 'bg-white/20 text-amber-300 hover:bg-white/30'
                : 'bg-white/90 text-slate-700 hover:bg-white border border-slate-200'
            }`}
          >
            {isDarkBackdrop ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Quick WhatsApp Share Button on image */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            title="Enviar este calçado no WhatsApp"
            className="absolute top-4 right-14 sm:right-16 p-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-transform active:scale-90 cursor-pointer"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* Image badge footer */}
          <div className={`absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs ${
            isDarkBackdrop ? 'text-slate-400' : 'text-slate-500'
          }`}>
            <span className="sm:hidden text-amber-500 font-semibold">Deslize p/ ver o próximo ➔</span>
            <span className="hidden sm:inline">Use as setas ← → para navegar</span>
            <span>Tecla F p/ favoritar</span>
          </div>
        </div>

        {/* Right Column: Details & Sizes */}
        <div className="md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto max-h-[50vh] md:max-h-full">
          <div>
            {/* Top Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wide">
                {product.marca}
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                {product.secao}
              </span>
              <span
                className={`ml-auto px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                  product.estoqueTotal > 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                {product.estoqueTotal > 0
                  ? isClientMode
                    ? 'Modelo Disponível'
                    : `${product.estoqueTotal} un. em estoque`
                  : 'Esgotado'}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight mb-2">
              {product.descricao}
            </h2>

            {/* Reference & Codes */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 space-y-1 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  Código Principal:
                </span>
                <span className="font-mono font-bold text-slate-900">{product.codigoPrincipal}</span>
              </div>
              {product.codigos.length > 1 && (
                <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200">
                  <span>Códigos vinculados ({product.codigos.length}):</span>
                  <span className="font-mono text-[11px] truncate max-w-[200px]">
                    {product.codigos.join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Sizes & Grades Selector */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Selecione a Grade / Tamanho:
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {product.tamanhos.map((t, idx) => {
                  const isSelected = selectedSize?.tamanho === t.tamanho;
                  const hasStock = t.estoque > 0;
                  return (
                    <button
                      key={`${t.tamanho}-${t.codigo || ''}-${idx}`}
                      type="button"
                      onClick={() => setSelectedSize(t)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20 shadow-xs'
                          : hasStock
                          ? 'border-slate-200 bg-white hover:border-amber-300'
                          : 'border-slate-100 bg-slate-50 text-slate-300 opacity-60'
                      }`}
                    >
                      <div className="text-sm font-extrabold text-slate-900">{t.tamanho}</div>
                      <div
                        className={`text-[11px] font-semibold ${
                          hasStock ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {hasStock ? (isClientMode ? 'Pronta Entrega' : `${t.estoque} un.`) : 'Esgotado'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Size Detailed Barcode Card */}
            {selectedSize && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Barcode className="w-5 h-5 text-slate-500" />
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500">
                      Código de Barras (EAN / Ref):
                    </div>
                    <div className="font-mono font-bold text-slate-800 text-sm">
                      {selectedSize.barcode || 'Sem código de barras'}
                    </div>
                  </div>
                </div>

                {selectedSize.barcode && (
                  <button
                    type="button"
                    onClick={() => handleCopyBarcode(selectedSize.barcode!)}
                    className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer"
                    title="Copiar código de barras"
                  >
                    {copiedBarcode === selectedSize.barcode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bottom Actions: Quantity & Add to Cart */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center gap-3">
              {/* Quantity selector */}
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer font-bold"
                >
                  -
                </button>
                <span className="px-4 py-2 font-mono font-bold text-sm text-slate-900 min-w-[40px] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={selectedSize ? quantity >= selectedSize.estoque : false}
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer font-bold"
                >
                  +
                </button>
              </div>

              {/* Add to Order Button */}
              <button
                type="button"
                disabled={!selectedSize || maxAvailable <= 0}
                onClick={() => {
                  if (selectedSize) {
                    onAddToCart(product, selectedSize, quantity);
                  }
                }}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                  selectedSize && maxAvailable > 0
                    ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Adicionar {quantity} {quantity > 1 ? 'pares' : 'par'} ao Pedido</span>
              </button>
            </div>

            {/* Secondary actions: Edit product, Share */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <button
                type="button"
                onClick={() => onEditProduct(product)}
                className="flex items-center gap-1.5 text-slate-600 hover:text-amber-600 font-semibold cursor-pointer p-1"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Ajustar Estoque / Dados</span>
              </button>

              <button
                type="button"
                onClick={handleShareProduct}
                className="flex items-center gap-1.5 text-slate-600 hover:text-amber-600 font-semibold cursor-pointer p-1"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Compartilhar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
