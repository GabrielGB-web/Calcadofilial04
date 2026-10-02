import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2, Box } from 'lucide-react';
import { ShoeModel, ShoeSize } from '../types/catalog';

interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (newProduct: Partial<ShoeModel>) => Promise<void>;
}

export const NewProductModal: React.FC<NewProductModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [descricao, setDescricao] = useState('');
  const [codigoPrincipal, setCodigoPrincipal] = useState('');
  const [secao, setSecao] = useState('MASCULINO');
  const [marca, setMarca] = useState('Cartago');
  const [imagem, setImagem] = useState('');
  const [tamanhos, setTamanhos] = useState<ShoeSize[]>([
    { tamanho: '39', estoque: 10, codigo: '', barcode: '' },
    { tamanho: '40', estoque: 10, codigo: '', barcode: '' },
    { tamanho: '41', estoque: 10, codigo: '', barcode: '' },
    { tamanho: '42', estoque: 10, codigo: '', barcode: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddSizeRow = () => {
    setTamanhos([...tamanhos, { tamanho: '', estoque: 0, codigo: '', barcode: '' }]);
  };

  const handleRemoveSizeRow = (idx: number) => {
    setTamanhos(tamanhos.filter((_, i) => i !== idx));
  };

  const handleSizeChange = (idx: number, field: keyof ShoeSize, value: any) => {
    const updated = [...tamanhos];
    updated[idx] = { ...updated[idx], [field]: value };
    setTamanhos(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) return;

    setIsSubmitting(true);
    try {
      const validSizes = tamanhos
        .filter((t) => t.tamanho.trim())
        .map((t) => ({
          ...t,
          codigo: t.codigo || codigoPrincipal,
          estoque: Math.max(0, parseInt(String(t.estoque), 10) || 0),
        }));

      const totalEstoque = validSizes.reduce((acc, t) => acc + t.estoque, 0);

      await onCreate({
        codigoPrincipal: codigoPrincipal.trim() || String(Date.now()).slice(-6),
        codigos: [codigoPrincipal.trim() || String(Date.now()).slice(-6)],
        referencia: codigoPrincipal.trim(),
        marca,
        descricao: descricao.trim(),
        secao,
        imagem: imagem.trim(),
        todasImagens: imagem.trim() ? [imagem.trim()] : [],
        estoqueTotal: totalEstoque,
        tamanhos: validSizes,
      });

      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
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

        <h3 className="text-lg font-bold text-slate-900 mb-1">Cadastrar Novo Calçado</h3>
        <p className="text-xs text-slate-500 mb-4">
          Adicione um novo modelo com sua grade de numerações diretamente no catálogo.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Descrição / Modelo:</label>
            <input
              type="text"
              placeholder="ex: 10738 CART DAKAR AD AZ/VM/BG"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cód. Principal:</label>
              <input
                type="text"
                placeholder="ex: 131157"
                value={codigoPrincipal}
                onChange={(e) => setCodigoPrincipal(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Seção:</label>
              <select
                value={secao}
                onChange={(e) => setSecao(e.target.value)}
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
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Cartago, Rider..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">URL da Foto / Imagem:</label>
            <input
              type="url"
              placeholder="https://i.ibb.co/..."
              value={imagem}
              onChange={(e) => setImagem(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </div>

          {/* Sizes */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">Grades / Numerações:</label>
              <button
                type="button"
                onClick={handleAddSizeRow}
                className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Grade</span>
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {tamanhos.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Tam (ex: 39)"
                    value={t.tamanho}
                    onChange={(e) => handleSizeChange(idx, 'tamanho', e.target.value)}
                    className="w-24 px-2 py-1.5 rounded-lg border border-slate-300 font-bold"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Estoque"
                    value={t.estoque || ''}
                    onChange={(e) => handleSizeChange(idx, 'estoque', parseInt(e.target.value, 10) || 0)}
                    className="w-24 px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-center"
                  />
                  <input
                    type="text"
                    placeholder="Código de Barras (opcional)"
                    value={t.barcode || ''}
                    onChange={(e) => handleSizeChange(idx, 'barcode', e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSizeRow(idx)}
                    className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Cadastrando...' : 'Cadastrar Produto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
