import React from 'react';
import { Heart, ShoppingBag, Eye, Tag, Box, Share2, Check } from 'lucide-react';
import { ShoeModel, ShoeSize } from '../types/catalog';
import { LazyImage } from './LazyImage';

interface ProductCardProps {
  product: ShoeModel;
  isFavorited: boolean;
  onToggleFavorite: (product: ShoeModel) => void;
  onOpenDetails: (product: ShoeModel) => void;
  onQuickAddSize: (product: ShoeModel, size: ShoeSize) => void;
  isClientMode?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFavorited,
  onToggleFavorite,
  onOpenDetails,
  onQuickAddSize,
  isClientMode = false,
}) => {
  const isInStock = product.estoqueTotal > 0;
  const brandColors: Record<string, string> = {
    Cartago: 'bg-amber-100 text-amber-900 border-amber-300',
    Rider: 'bg-blue-100 text-blue-900 border-blue-300',
    Ipanema: 'bg-rose-100 text-rose-900 border-rose-300',
    Mormaii: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    Grendha: 'bg-purple-100 text-purple-900 border-purple-300',
    Disney: 'bg-red-100 text-red-900 border-red-300',
    Zaxy: 'bg-pink-100 text-pink-900 border-pink-300',
  };

  const brandBadgeStyle = brandColors[product.marca] || 'bg-slate-100 text-slate-800 border-slate-300';

  const handleShareWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sizesInStock = product.tamanhos
      .filter((t) => t.estoque > 0)
      .map((t) => t.tamanho)
      .join(', ');

    let text = `👟 *${product.descricao}*\n`;
    text += `🏷️ Marca: ${product.marca} | Seção: ${product.secao}\n`;
    text += `📏 *Grades disponíveis:* ${sizesInStock || 'Consultar'}\n`;
    if (product.imagem) text += `📸 Foto: ${product.imagem}\n`;
    text += `\nEnviado via Catálogo Francal Calçados`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-200 flex flex-col overflow-hidden group">
      {/* Top Image Container with Standardized Square Vitrine */}
      <div className="relative bg-white">
        <LazyImage
          src={product.imagem}
          alt={product.descricao}
          aspectRatio="aspect-square"
          fitMode="contain"
          padding="p-3 sm:p-4"
          onClick={() => onOpenDetails(product)}
        />

        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product);
          }}
          aria-label={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          className={`absolute top-2 left-2 p-2 rounded-full backdrop-blur-md transition-transform duration-150 active:scale-90 shadow-sm cursor-pointer ${
            isFavorited
              ? 'bg-red-500 text-white shadow-red-500/30'
              : 'bg-white/80 text-slate-600 hover:text-red-500 hover:bg-white'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFavorited ? 'fill-current' : ''}`} />
        </button>

        {/* Quick WhatsApp Share Button */}
        <button
          type="button"
          onClick={handleShareWhatsApp}
          title="Compartilhar este calçado no WhatsApp"
          aria-label="Compartilhar no WhatsApp"
          className="absolute top-2 right-2 p-2 rounded-full bg-emerald-600/90 hover:bg-emerald-600 text-white backdrop-blur-md shadow-sm transition-transform active:scale-90 cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>

        {/* Section / Brand Top-right Pills */}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 pointer-events-none">
          {product.marca && (
            <span
              className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold tracking-wide uppercase border backdrop-blur-md shadow-xs ${brandBadgeStyle}`}
            >
              {product.marca}
            </span>
          )}
          <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold bg-slate-900/80 text-white backdrop-blur-md border border-slate-700/50 shadow-xs">
            {product.secao}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Reference & Model Codes (Hidden or simplified in Client Mode) */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            {!isClientMode ? (
              <span className="font-mono flex items-center gap-1 text-slate-600 text-[11px] sm:text-xs">
                <Tag className="w-3 h-3 text-slate-400" />
                {product.codigos.length > 1
                  ? `Cód: ${product.codigoPrincipal} (+${product.codigos.length - 1})`
                  : `Cód: ${product.codigoPrincipal}`}
              </span>
            ) : (
              <span className="text-[11px] font-medium text-slate-400">Modelo Oficial</span>
            )}

            <span
              className={`font-semibold px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] flex items-center gap-1 ${
                isInStock
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Box className="w-3 h-3" />
              {isInStock ? (isClientMode ? 'Disponível' : `${product.estoqueTotal} un.`) : 'Esgotado'}
            </span>
          </div>

          {/* Model Title */}
          <h3
            onClick={() => onOpenDetails(product)}
            className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 min-h-[2.25rem] sm:min-h-[2.5rem] hover:text-amber-600 cursor-pointer transition-colors leading-snug"
            title={product.descricao}
          >
            {product.descricao}
          </h3>

          {/* Size Matrix */}
          <div className="mt-2.5 sm:mt-3">
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 mb-1 flex items-center justify-between">
              <span>Grades:</span>
              {!isClientMode && <span className="text-[9px] sm:text-[10px] text-slate-400">Clique p/ pedir</span>}
            </div>

            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {product.tamanhos && product.tamanhos.length > 0 ? (
                product.tamanhos.map((t, idx) => {
                  const hasStock = t.estoque > 0;
                  return (
                    <button
                      key={`${product.id}-${t.tamanho}-${t.codigo || ''}-${idx}`}
                      type="button"
                      onClick={() => onQuickAddSize(product, t)}
                      disabled={!hasStock}
                      title={
                        hasStock
                          ? isClientMode
                            ? `Tamanho ${t.tamanho}: Disponível`
                            : `Tamanho ${t.tamanho}: ${t.estoque} un disponíveis.`
                          : `Tamanho ${t.tamanho}: Esgotado.`
                      }
                      className={`text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-medium transition-all duration-150 flex items-center gap-1 ${
                        hasStock
                          ? 'bg-slate-100 text-slate-800 hover:bg-amber-100 hover:text-amber-900 border border-slate-200 active:scale-95 cursor-pointer'
                          : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <span className="font-bold">{t.tamanho}</span>
                      {!isClientMode && (
                        <span
                          className={`text-[9px] sm:text-[10px] ${
                            hasStock ? 'text-emerald-600 font-semibold' : 'text-slate-300'
                          }`}
                        >
                          ({t.estoque})
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <span className="text-xs text-slate-400">Único</span>
              )}
            </div>
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenDetails(product)}
            className="flex-1 py-1.5 sm:py-2 px-2 rounded-lg text-[11px] sm:text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>Detalhes</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const firstAvailable = product.tamanhos.find((t) => t.estoque > 0) || product.tamanhos[0];
              if (firstAvailable) {
                onQuickAddSize(product, firstAvailable);
              } else {
                onOpenDetails(product);
              }
            }}
            disabled={!isInStock}
            className={`py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              isInStock
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 active:bg-amber-600 shadow-sm'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>+ Pedido</span>
          </button>
        </div>
      </div>
    </div>
  );
};

