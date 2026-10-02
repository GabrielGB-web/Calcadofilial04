import React, { useState, useEffect, useRef } from 'react';
import { ImageOff, ZoomIn } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string; // e.g. "aspect-[4/3]" or "aspect-square"
  onClick?: () => void;
  showZoomBadge?: boolean;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  aspectRatio = 'aspect-[4/3]',
  onClick,
  showZoomBadge = true,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [usedProxy, setUsedProxy] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset states if src changes
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
        rootMargin: '250px 0px', // Pre-load 250px before entering viewport
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
      className={`relative overflow-hidden bg-slate-100 ${aspectRatio} ${className} ${
        onClick ? 'cursor-pointer group' : ''
      }`}
    >
      {/* Skeleton / Shimmer placeholder while loading */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin opacity-40" />
        </div>
      )}

      {/* Actual Image rendered when in view */}
      {isVisible && !hasError && currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
          className={`w-full h-full object-cover transition-all duration-300 ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          } ${onClick ? 'group-hover:scale-105' : ''}`}
        />
      )}

      {/* Fallback Placeholder on Error or Missing URL */}
      {(hasError || !src) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-2">
            <ImageOff className="w-6 h-6 text-slate-400" />
          </div>
          <span className="text-xs font-medium text-slate-500 line-clamp-1">{alt || 'Calçado Francal'}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Imagem indisponível</span>
        </div>
      )}

      {/* Zoom Hover Badge */}
      {showZoomBadge && onClick && !hasError && (
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-sm">
          <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
          <span>Ampliar</span>
        </div>
      )}
    </div>
  );
};
