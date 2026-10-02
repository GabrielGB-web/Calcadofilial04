import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, Send, Plus, Minus, CheckCircle, Store, Phone, FileText } from 'lucide-react';
import { CartItem } from '../types/catalog';

interface OrderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
}

export const OrderDrawer: React.FC<OrderDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  if (!isOpen) return null;

  const totalPairs = items.reduce((acc, item) => acc + item.quantidade, 0);

  // Group items by model for neat WhatsApp formatting
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.modelId]) {
      acc[item.modelId] = {
        descricao: item.descricao,
        marca: item.marca,
        codigo: item.codigo,
        secao: item.secao,
        sizes: [],
      };
    }
    acc[item.modelId].sizes.push({
      tamanho: item.tamanho,
      quantidade: item.quantidade,
      barcode: item.barcode,
    });
    return acc;
  }, {} as Record<string, { descricao: string; marca: string; codigo: string; secao: string; sizes: Array<{ tamanho: string; quantidade: number; barcode?: string }> }>);

  const handleSendWhatsApp = () => {
    if (items.length === 0) return;

    let text = `👟 *PEDIDO - CATÁLOGO FRANCAL CALÇADOS 2026*\n`;
    text += `📅 *Data:* ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;
    if (customerName.trim()) text += `👤 *Cliente:* ${customerName.trim()}\n`;
    if (customerPhone.trim()) text += `📱 *Telefone:* ${customerPhone.trim()}\n`;
    text += `📦 *Total de Pares:* ${totalPairs} pares\n\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `*ITENS DO PEDIDO:*\n\n`;

    let itemIndex = 1;
    for (const model of Object.values(groupedItems)) {
      const modelPairs = model.sizes.reduce((sum, s) => sum + s.quantidade, 0);
      text += `${itemIndex}. *${model.descricao}*\n`;
      text += `   🏷️ Cód: ${model.codigo} | ${model.secao}\n`;
      model.sizes.forEach((s) => {
        text += `   ▫️ *Tam ${s.tamanho}:* ${s.quantidade} ${s.quantidade > 1 ? 'pares' : 'par'}\n`;
      });
      text += `   *Subtotal:* ${modelPairs} pares\n\n`;
      itemIndex++;
    }

    if (notes.trim()) {
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `💬 *Observações:* ${notes.trim()}\n`;
    }

    text += `\nEnviado via Catálogo Francal Calçados`;

    const encoded = encodeURIComponent(text);
    const targetUrl = whatsappNumber.trim()
      ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(targetUrl, '_blank');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base leading-tight">Pedido de Calçados</h3>
              <p className="text-xs text-slate-400">
                {totalPairs} {totalPairs === 1 ? 'par selecionado' : 'pares selecionados'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShoppingBag className="w-16 h-16 stroke-1 mb-3 text-slate-300" />
              <p className="font-semibold text-slate-700 text-base">Seu pedido está vazio</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Navegue pelo catálogo e clique em "+ Pedido" nos modelos e numerações desejados.
              </p>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Itens Selecionados ({items.length})
                  </span>
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpar
                  </button>
                </div>

                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3 relative group"
                  >
                    <img
                      src={item.imagem || 'https://via.placeholder.com/80x80?text=Sem+Foto'}
                      alt={item.descricao}
                      className="w-14 h-14 rounded-lg object-cover bg-white border border-slate-200 flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 truncate" title={item.descricao}>
                        {item.descricao}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          Tam: {item.tamanho}
                        </span>
                        <span>Cód: {item.codigo}</span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="p-1 px-2 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-mono font-bold text-xs text-slate-900 min-w-[24px] text-center">
                            {item.quantidade}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="p-1 px-2 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="text-[11px] text-slate-400">
                          (disp: {item.estoqueDisponivel})
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="text-slate-300 hover:text-red-500 p-1 cursor-pointer"
                      title="Remover item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Order Info Form */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  Dados do Pedido / Destinatário
                </span>

                <div className="space-y-2">
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Nome do Cliente / Lojista (opcional)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="WhatsApp do Vendedor / Representante (ex: 16999999999)"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <textarea
                      placeholder="Observações (Condição de pagamento, transporte, etc.)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer with WhatsApp Action */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">Total de Pares:</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {totalPairs} {totalPairs === 1 ? 'par' : 'pares'}
            </span>
          </div>

          <button
            type="button"
            disabled={items.length === 0}
            onClick={handleSendWhatsApp}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
              items.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-600/30'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Enviar Pedido via WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
