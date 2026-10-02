import React, { useState, useEffect, useRef } from 'react';
import { ImageOff, ZoomIn } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string; // e.g. "aspect-square" (1:1) or "aspect-[4/3]"
  fitMode?: 'contain' | 'cover'; // 'contain' standardizes all shoes without cropping
  padding?: string; // e.g. "p-3 sm:p-4"
  onClick?: () => void;
  showZoomBadge?: boolean;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  aspectRatio = 'aspect-square',
  fitMode = 'contain',
  padding = 'p-3 sm:p-4',
  onClick,
  showZoomBadge = true,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [usedProxy, setUsedProxy] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setUsedProxy(false);
  }, [src]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '300px 0px', // Pre-load 300px before entering viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleError = () => {
    // If direct load failed and we haven't tried proxy yet, try server proxy
    if (!usedProxy && src && (src.startsWith('http://') || src.startsWith('https://'))) {
      setUsedProxy(true);
      return;
    }
    setHasError(true);
    setIsLoaded(true);
  };

  const currentSrc = usedProxy ? `/api/image-proxy?url=${encodeURIComponent(src)}` : src;

  return (
    <div
      ref={imgRef}
      onClick={onClick}
      className={`relative overflow-hidden bg-white flex items-center justify-center border-b border-slate-100 ${aspectRatio} ${className} ${
        onClick ? 'cursor-pointer group' : ''
      }`}
    >
      {/* Studio Lighting Background Subtle Grid / Pedestal */}
      <div className="absolute inset-0 bg-radial from-slate-50/80 via-white to-slate-100/40 pointer-events-none" />

      {/* Skeleton / Shimmer placeholder while loading */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200/60 to-slate-100 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-amber-500 animate-spin opacity-50" />
        </div>
      )}

      {/* Actual Image rendered when in view */}
      {isVisible && !hasError && currentSrc && (
        <div className={`w-full h-full flex items-center justify-center ${fitMode === 'contain' ? padding : ''}`}>
          <img
            src={currentSrc}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={handleError}
            className={`w-full h-full max-w-full max-h-full transition-all duration-300 ${
              fitMode === 'contain'
                ? 'object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.06)] group-hover:scale-105'
                : 'object-cover group-hover:scale-105'
            } ${isLoaded ? 'opacity-100' : 'opacity-0 scale-95'}`}
          />
        </div>
      )}

      {/* Fallback Placeholder on Error or Missing URL */}
      {(hasError || !src) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2 border border-slate-200">
            <ImageOff className="w-5 h-5 text-slate-400" />
          </div>
          <span className="text-xs font-semibold text-slate-600 line-clamp-1">{alt || 'Calçado Francal'}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Sem foto cadastrada</span>
        </div>
      )}

      {/* Zoom Hover Badge */}
      {showZoomBadge && onClick && !hasError && isLoaded && (
        <div className="absolute top-2 right-2 bg-slate-900/70 backdrop-blur-md text-white px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md">
          <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
          <span>Ver Detalhes</span>
        </div>
      )}
    </div>
  );
};
