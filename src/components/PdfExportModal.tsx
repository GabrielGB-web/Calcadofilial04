import React, { useState } from 'react';
import { X, FileDown, CheckCircle, Printer, Sparkles } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ShoeModel } from '../types/catalog';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredProducts: ShoeModel[];
  favoriteProducts: ShoeModel[];
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  filteredProducts,
  favoriteProducts,
}) => {
  const [scope, setScope] = useState<'filtered' | 'favorites'>('filtered');
  const [includeBarcodes, setIncludeBarcodes] = useState(true);
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const targetList = scope === 'favorites' ? favoriteProducts : filteredProducts;
  const finalList = onlyInStock ? targetList.filter((p) => p.estoqueTotal > 0) : targetList;

  const handleGeneratePdf = () => {
    setIsGenerating(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const currentDate = new Date().toLocaleDateString('pt-BR');
      const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const totalPares = finalList.reduce((acc, p) => acc + p.estoqueTotal, 0);

      // Header Banner
      doc.setFillColor(27, 54, 93); // #1b365d Francal Navy
      doc.rect(0, 0, 210, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('CATÁLOGO DE CALÇADOS FRANCAL 2026', 14, 12);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(217, 119, 6); // amber
      doc.text(
        `RELATÓRIO DE ESTOQUE E GRADE | EMITIDO EM ${currentDate} ÀS ${currentTime}`,
        14,
        18
      );

      doc.setTextColor(255, 255, 255);
      doc.text(`Total de Modelos: ${finalList.length} | Total em Estoque: ${totalPares} pares`, 14, 23);

      // Table Data
      const tableHeaders = ['Cód / Ref', 'Marca / Descrição', 'Seção', 'Grades & Estoque', 'Total'];
      if (includeBarcodes) {
        tableHeaders.push('Cód. Barras');
      }

      const tableRows = finalList.map((prod) => {
        const sizesStr = prod.tamanhos.map((t) => `${t.tamanho}: ${t.estoque}u`).join(' | ');
        const barcodesStr = includeBarcodes
          ? prod.tamanhos
              .filter((t) => t.barcode)
              .map((t) => `${t.tamanho}: ${t.barcode}`)
              .join('\n') || '-'
          : '';

        const row = [
          `${prod.codigoPrincipal}\n${prod.referencia ? `Ref: ${prod.referencia}` : ''}`,
          `${prod.marca ? `[${prod.marca}] ` : ''}${prod.descricao}`,
          prod.secao,
          sizesStr,
          `${prod.estoqueTotal} un`,
        ];

        if (includeBarcodes) {
          row.push(barcodesStr);
        }

        return row;
      });

      autoTable(doc, {
        head: [tableHeaders],
        body: tableRows,
        startY: 32,
        theme: 'striped',
        headStyles: {
          fillColor: [27, 54, 93],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 22, fontStyle: 'bold' },
          1: { cellWidth: includeBarcodes ? 50 : 65 },
          2: { cellWidth: 20 },
          3: { cellWidth: includeBarcodes ? 60 : 80 },
          4: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          ...(includeBarcodes ? { 5: { cellWidth: 32, fontSize: 6.5 } } : {}),
        },
        didDrawPage: (data) => {
          // Footer
          const pageCount = (doc as any).internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(
            `Catálogo Francal 2026 - Página ${data.pageNumber} de ${pageCount}`,
            14,
            290
          );
        },
      });

      const filename =
        scope === 'favorites'
          ? `catalogo-francal-favoritos-${currentDate.replace(/\//g, '-')}.pdf`
          : `catalogo-francal-${currentDate.replace(/\//g, '-')}.pdf`;

      doc.save(filename);
      setIsGenerating(false);
      onClose();
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      setIsGenerating(false);
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
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">Exportar Catálogo em PDF</h3>
            <p className="text-xs text-slate-500">Documento pronto para impressão ou envio a clientes</p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4 mb-6 text-xs text-slate-700">
          <div>
            <label className="font-bold text-slate-900 block mb-2">Escopo do Catálogo:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('filtered')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  scope === 'filtered'
                    ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>Filtro Atual</div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                  {filteredProducts.length} modelos
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('favorites')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  scope === 'favorites'
                    ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>Apenas Favoritos</div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                  {favoriteProducts.length} modelos
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
              />
              <span className="font-medium">Ocultar modelos sem estoque (0 unidades)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeBarcodes}
                onChange={(e) => setIncludeBarcodes(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
              />
              <span className="font-medium">Incluir Códigos de Barras EAN</span>
            </label>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="text-slate-600 font-medium">Modelos que serão impressos:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{finalList.length}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={finalList.length === 0 || isGenerating}
            onClick={handleGeneratePdf}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            <span>{isGenerating ? 'Gerando PDF...' : 'Baixar PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
