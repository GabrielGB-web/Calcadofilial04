import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, Box, Image, Tag } from 'lucide-react';
import { ShoeModel, ShoeSize } from '../types/catalog';

interface ProductEditModalProps {
  product: ShoeModel | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProduct: ShoeModel) => Promise<void>;
  onDelete: (productId: string) => Promise<void>;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [formData, setFormData] = useState<Partial<ShoeModel>>({});
  const [tamanhos, setTamanhos] = useState<ShoeSize[]>([]);
  const [newSizeName, setNewSizeName] = useState('');
  const [newSizeStock, setNewSizeStock] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        id: product.id,
        codigoPrincipal: product.codigoPrincipal,
        referencia: product.referencia,
        marca: product.marca,
        descricao: product.descricao,
        secao: product.secao,
        imagem: product.imagem,
      });
      setTamanhos([...product.tamanhos]);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleStockChange = (index: number, newStock: number) => {
    const updated = [...tamanhos];
    updated[index].estoque = Math.max(0, newStock);
    setTamanhos(updated);
  };

  const handleRemoveSize = (index: number) => {
    setTamanhos(tamanhos.filter((_, i) => i !== index));
  };

  const handleAddSize = () => {
    if (!newSizeName.trim()) return;
    setTamanhos([
      ...tamanhos,
      {
        tamanho: newSizeName.trim(),
        estoque: Math.max(0, newSizeStock),
        codigo: product.codigoPrincipal,
        barcode: '',
      },
    ]);
    setNewSizeName('');
    setNewSizeStock(0);
  };

  const totalEstoque = tamanhos.reduce((acc, t) => acc + (t.estoque || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedProduct: ShoeModel = {
        ...product,
        ...formData,
        tamanhos,
        estoqueTotal: totalEstoque,
        updatedAt: new Date().toISOString(),
      };
      await onSave(updatedProduct);
      setIsSaving(false);
      onClose();
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Tem certeza que deseja excluir o modelo "${product.descricao}"?`)) {
      await onDelete(product.id);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-slate-900 mb-1">Editar Calçado / Estoque</h3>
        <p className="text-xs text-slate-500 mb-4">
          Ajuste as informações e o estoque de cada grade diretamente no banco de dados.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Descrição do Modelo:</label>
            <input
              type="text"
              value={formData.descricao || ''}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Seção / Categoria:</label>
              <select
                value={formData.secao || 'Geral'}
                onChange={(e) => setFormData({ ...formData, secao: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="MASCULINO">MASCULINO</option>
                <option value="FEMININO">FEMININO</option>
                <option value="INFANTIL">INFANTIL</option>
                <option value="LANÇAMENTO">LANÇAMENTO</option>
                <option value="IPANEMA">IPANEMA</option>
                <option value="CARTAGO">CARTAGO</option>
                <option value="RIDER">RIDER</option>
                <option value="Geral">Geral</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Marca:</label>
              <input
                type="text"
                value={formData.marca || ''}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                placeholder="Cartago, Rider, etc."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">URL da Imagem:</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={formData.imagem || ''}
                onChange={(e) => setFormData({ ...formData, imagem: e.target.value })}
                placeholder="https://i.ibb.co/..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              {formData.imagem && (
                <img
                  src={formData.imagem}
                  alt="Preview"
                  className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}
            </div>
          </div>

          {/* Sizes and stock grid */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">Grades e Quantidades em Estoque:</label>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Total: {totalEstoque} un.
              </span>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {tamanhos.map((t, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                >
                  <span className="font-bold text-slate-900 w-16 truncate">Tam {t.tamanho}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Estoque:</span>
                    <input
                      type="number"
                      min={0}
                      value={t.estoque}
                      onChange={(e) => handleStockChange(idx, parseInt(e.target.value, 10) || 0)}
                      className="w-20 px-2 py-1 text-xs rounded border border-slate-300 font-mono text-center bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSize(idx)}
                    className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                    title="Remover tamanho"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new size row */}
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
              <input
                type="text"
                placeholder="Tam (ex: 41/42)"
                value={newSizeName}
                onChange={(e) => setNewSizeName(e.target.value)}
                className="w-24 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
              />
              <input
                type="number"
                min={0}
                placeholder="Qtd"
                value={newSizeStock || ''}
                onChange={(e) => setNewSizeStock(parseInt(e.target.value, 10) || 0)}
                className="w-20 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono text-center"
              />
              <button
                type="button"
                onClick={handleAddSize}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Grade</span>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer p-1"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
