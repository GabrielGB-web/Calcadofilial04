import React from 'react';
import { Heart, ShoppingBag, Eye, Box, Tag, Share2 } from 'lucide-react';
import { ShoeModel, ShoeSize } from '../types/catalog';
import { LazyImage } from './LazyImage';

interface ProductListItemProps {
  product: ShoeModel;
  isFavorited: boolean;
  onToggleFavorite: (product: ShoeModel) => void;
  onOpenDetails: (product: ShoeModel) => void;
  onQuickAddSize: (product: ShoeModel, size: ShoeSize) => void;
  isClientMode?: boolean;
}

export const ProductListItem: React.FC<ProductListItemProps> = ({
  product,
  isFavorited,
  onToggleFavorite,
  onOpenDetails,
  onQuickAddSize,
  isClientMode = false,
}) => {
  const isInStock = product.estoqueTotal > 0;

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
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
      {/* Thumbnail */}
      <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-lg overflow-hidden flex-shrink-0 relative bg-white border border-slate-100 flex items-center justify-center">
        <LazyImage
          src={product.imagem}
          alt={product.descricao}
          aspectRatio="aspect-square"
          fitMode="contain"
          padding="p-1.5 sm:p-2"
          onClick={() => onOpenDetails(product)}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product);
          }}
          className={`absolute top-1.5 left-1.5 p-1.5 rounded-full backdrop-blur-md shadow-xs cursor-pointer ${
            isFavorited ? 'bg-red-500 text-white' : 'bg-white/80 text-slate-600 hover:text-red-500'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0 w-full">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 uppercase">
            {product.marca || 'Calçado'}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
            {product.secao}
          </span>
          {!isClientMode && (
            <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {product.codigoPrincipal}
            </span>
          )}
        </div>

        <h4
          onClick={() => onOpenDetails(product)}
          className="font-bold text-slate-900 hover:text-amber-600 cursor-pointer text-sm sm:text-base truncate"
          title={product.descricao}
        >
          {product.descricao}
        </h4>

        {/* Sizes inline */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-[11px] text-slate-400 font-medium">Grades:</span>
          {product.tamanhos.map((t, idx) => (
            <button
              key={`${product.id}-${t.tamanho}-${t.codigo || ''}-${idx}`}
              type="button"
              onClick={() => onQuickAddSize(product, t)}
              disabled={t.estoque <= 0}
              className={`text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1 ${
                t.estoque > 0
                  ? 'bg-slate-100 text-slate-800 hover:bg-amber-100 hover:text-amber-900 border border-slate-200 cursor-pointer'
                  : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
              }`}
            >
              <span>{t.tamanho}</span>
              {!isClientMode && (
                <span className={`text-[10px] ${t.estoque > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-300'}`}>
                  ({t.estoque})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stock & Actions */}
      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2.5 flex-shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
        <div className="text-right">
          <div
            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
              isInStock
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>{isInStock ? (isClientMode ? 'Disponível' : `${product.estoqueTotal} pares`) : 'Esgotado'}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium cursor-pointer"
            title="Compartilhar no WhatsApp"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onOpenDetails(product)}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
            title="Ver Detalhes"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const firstInStock = product.tamanhos.find((t) => t.estoque > 0) || product.tamanhos[0];
              if (firstInStock) onQuickAddSize(product, firstInStock);
            }}
            disabled={!isInStock}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              isInStock
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
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
