import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  FileText, 
  RefreshCw, 
  AlertCircle
} from 'lucide-react';
import { Profile } from '../types';
import { getResumePdf, StoredPdfRecord } from '../utils/pdfStorage';

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
}

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

export const ResumeModal: React.FC<ResumeModalProps> = ({
  isOpen,
  onClose,
  profile
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [storedPdf, setStoredPdf] = useState<StoredPdfRecord | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // PDF.js Canvas Rendering State
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderTasks = useRef<Map<number, any>>(new Map());

  const rawUrl = profile?.resumeUrl?.trim() || '/resume.pdf';

  // Check for the user's authentic uploaded PDF from IndexedDB
  useEffect(() => {
    if (isOpen) {
      getResumePdf()
        .then((record) => {
          if (record && record.dataUrl) {
            setStoredPdf(record);
          }
        })
        .catch((err) => {
          console.warn('Could not query IndexedDB for resume:', err);
        });
    }
  }, [isOpen]);

  // Convert base64 dataUrl into a native Blob URL if present
  useEffect(() => {
    if (storedPdf && storedPdf.dataUrl) {
      try {
        const base64Part = storedPdf.dataUrl.includes(',') 
          ? storedPdf.dataUrl.split(',')[1] 
          : storedPdf.dataUrl;
        const binaryString = window.atob(base64Part);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);

        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.warn('Failed to convert base64 to Blob URL:', err);
      }
    } else {
      setBlobUrl(null);
    }
  }, [storedPdf]);

  // Ensure PDF.js engine is ready
  const ensurePdfJs = useCallback(async (): Promise<any> => {
    if (window.pdfjsLib) {
      return window.pdfjsLib;
    }

    return new Promise((resolve, reject) => {
      // Check if script element already exists
      const existing = document.querySelector('script[src*="pdf.min.js"]');
      if (existing) {
        let attempts = 0;
        const check = setInterval(() => {
          attempts++;
          if (window.pdfjsLib) {
            clearInterval(check);
            resolve(window.pdfjsLib);
          } else if (attempts > 30) {
            clearInterval(check);
            reject(new Error('PDF.js library failed to initialize'));
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = '/vendor/pdfjs/pdf.min.js';
      script.async = true;
      script.onload = () => {
        if (window.pdfjsLib) {
          resolve(window.pdfjsLib);
        } else {
          reject(new Error('PDF.js not found after script load'));
        }
      };
      script.onerror = () => {
        // Fallback to CDN if local bundle fails
        const fallbackScript = document.createElement('script');
        fallbackScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        fallbackScript.onload = () => resolve(window.pdfjsLib);
        fallbackScript.onerror = () => reject(new Error('Could not load PDF.js from local or CDN'));
        document.head.appendChild(fallbackScript);
      };
      document.head.appendChild(script);
    });
  }, []);

  // Load and parse PDF document
  useEffect(() => {
    if (!isOpen) {
      setPdfDoc(null);
      setNumPages(0);
      setPdfError(null);
      return;
    }

    let isMounted = true;
    setIsLoadingPdf(true);
    setPdfError(null);

    async function loadPdfDocument() {
      try {
        const pdfjs = await ensurePdfJs();
        if (!isMounted) return;

        // Configure worker
        try {
          if (!pdfjs.GlobalWorkerOptions.workerSrc) {
            pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.js';
          }
        } catch (_) {}

        let pdfData: Uint8Array | null = null;

        if (storedPdf && storedPdf.dataUrl) {
          const base64Part = storedPdf.dataUrl.includes(',') 
            ? storedPdf.dataUrl.split(',')[1] 
            : storedPdf.dataUrl;
          const binaryString = window.atob(base64Part);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          pdfData = bytes;
        } else {
          // Fetch directly from server endpoint with fresh cache busting
          const fetchUrl = rawUrl.startsWith('http') ? rawUrl : `${rawUrl}?v=${Date.now()}`;
          const res = await fetch(fetchUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch resume`);
          const ab = await res.arrayBuffer();
          pdfData = new Uint8Array(ab);
        }

        if (!isMounted) return;

        const loadingTask = pdfjs.getDocument({
          data: pdfData,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setIsLoadingPdf(false);

        // Auto-fit initial scale based on container width
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth || window.innerWidth;
          const firstPage = await doc.getPage(1);
          const baseViewport = firstPage.getViewport({ scale: 1.0 });
          const padding = window.innerWidth < 640 ? 24 : 48;
          const fitted = Math.min(Math.max((containerWidth - padding) / baseViewport.width, 0.5), 1.6);
          setScale(parseFloat(fitted.toFixed(2)));
        }
      } catch (err: any) {
        console.error('PDF.js render error:', err);
        if (isMounted) {
          setPdfError(err.message || 'Unable to render PDF view');
          setIsLoadingPdf(false);
        }
      }
    }

    loadPdfDocument();

    return () => {
      isMounted = false;
    };
  }, [isOpen, rawUrl, storedPdf, ensurePdfJs]);

  // Render canvas pages whenever pdfDoc or scale changes
  useEffect(() => {
    if (!pdfDoc) return;

    let isCancelled = false;

    async function renderAllPages() {
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        if (isCancelled) break;
        const canvas = canvasRefs.current.get(pageNum);
        if (!canvas) continue;

        try {
          // Cancel previous render task if active
          if (renderTasks.current.has(pageNum)) {
            try {
              renderTasks.current.get(pageNum).cancel();
            } catch (_) {}
          }

          const page = await pdfDoc.getPage(pageNum);
          if (isCancelled) break;

          const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
          const viewport = page.getViewport({ scale: scale * dpr });

          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
          canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) continue;

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          const renderContext = {
            canvasContext: ctx,
            viewport: viewport,
          };

          const task = page.render(renderContext);
          renderTasks.current.set(pageNum, task);
          await task.promise;
        } catch (renderErr: any) {
          if (renderErr?.name !== 'RenderingCancelledException') {
            console.warn(`Render page ${pageNum} warning:`, renderErr);
          }
        }
      }
    }

    renderAllPages();

    return () => {
      isCancelled = true;
      renderTasks.current.forEach((t) => {
        try { t.cancel(); } catch (_) {}
      });
      renderTasks.current.clear();
    };
  }, [pdfDoc, scale]);

  // Auto-fit scale on window resize
  useEffect(() => {
    if (!pdfDoc) return;

    const handleResize = async () => {
      if (containerRef.current && pdfDoc) {
        try {
          const containerWidth = containerRef.current.clientWidth;
          const firstPage = await pdfDoc.getPage(1);
          const baseViewport = firstPage.getViewport({ scale: 1.0 });
          const padding = window.innerWidth < 640 ? 24 : 48;
          const fitted = Math.min(Math.max((containerWidth - padding) / baseViewport.width, 0.5), 1.6);
          setScale(parseFloat(fitted.toFixed(2)));
        } catch (_) {}
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc]);

  const isExternalGoogleDrive = rawUrl.includes('drive.google.com') && rawUrl.includes('/view');

  // Safe HTTP destination URL for anchor right-click / middle-click
  const fallbackUrl = useMemo(() => {
    if (blobUrl) return blobUrl;
    if (isExternalGoogleDrive) return rawUrl;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
    return '/resume.pdf';
  }, [blobUrl, isExternalGoogleDrive, rawUrl]);

  // Open in new tab handler
  const handleOpenInNewTab = (e: React.MouseEvent) => {
    e.preventDefault();

    if (blobUrl) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (isExternalGoogleDrive || rawUrl.startsWith('http')) {
      window.open(rawUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const targetUrl = `/resume.pdf?v=${Date.now()}`;
    const opened = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      const anchor = document.createElement('a');
      anchor.href = targetUrl;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }
  };

  // Direct untouched original PDF file download handler
  const handleDownload = async () => {
    setIsDownloading(true);
    const downloadFileName = storedPdf?.fileName || 'Mohammed_Saahir_Essa_Resume.pdf';

    try {
      if (storedPdf && storedPdf.dataUrl) {
        const downloadAnchor = document.createElement('a');
        downloadAnchor.href = storedPdf.dataUrl;
        downloadAnchor.download = downloadFileName;
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
        setIsDownloading(false);
        return;
      }

      const downloadEndpoint = `/api/download-resume?url=${encodeURIComponent(rawUrl)}&t=${Date.now()}`;
      const response = await fetch(downloadEndpoint);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const blob = await response.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const objectUrl = window.URL.createObjectURL(pdfBlob);

      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = objectUrl;
      downloadAnchor.download = downloadFileName;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);

      setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 2000);
    } catch (err) {
      console.warn('Direct blob download error, falling back to direct link:', err);
      const fallbackAnchor = document.createElement('a');
      fallbackAnchor.href = `/api/download-resume?url=${encodeURIComponent(rawUrl)}`;
      fallbackAnchor.setAttribute('download', downloadFileName);
      fallbackAnchor.target = '_blank';
      document.body.appendChild(fallbackAnchor);
      fallbackAnchor.click();
      document.body.removeChild(fallbackAnchor);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      id="resume-modal-overlay"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200"
    >
      <div 
        id="resume-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl h-[94vh] bg-stone-900 rounded-2xl shadow-2xl border border-stone-800 flex flex-col overflow-hidden text-stone-100"
      >
        {/* Modal Header Bar */}
        <div className="px-3 sm:px-6 py-3 bg-stone-900 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-stone-100 truncate">
                Mohammed Saahir Essa — Resume
              </h3>
              <p className="text-[11px] text-stone-400 font-mono hidden sm:block truncate">
                Product Design Engineer • Hardware Architecture
              </p>
            </div>
          </div>

          {/* Controls and Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap ml-auto">
            {/* Download Original PDF Directly */}
            <button
              id="download-resume-pdf-btn"
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Download original PDF file"
            >
              {isDownloading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{isDownloading ? 'Saving...' : 'Download'}</span>
            </button>

            {/* Open in new tab */}
            <a
              id="open-resume-new-tab"
              href={fallbackUrl}
              onClick={handleOpenInNewTab}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium transition-colors cursor-pointer border border-stone-700/60"
              title="Open PDF in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Open in Tab</span>
            </a>

            {/* Close Button */}
            <button
              id="close-resume-modal-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer ml-1"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content - Dedicated PDF Canvas Viewer */}
        <div 
          ref={containerRef}
          className="flex-1 bg-stone-950 relative overflow-y-auto overflow-x-auto p-3 sm:p-6"
        >
          <div className="flex flex-col items-center justify-start min-h-full">
            {/* Loading Indicator */}
            {isLoadingPdf && (
              <div className="flex flex-col items-center justify-center py-20 text-stone-400 gap-3">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                <p className="text-sm font-medium">Loading vector PDF document...</p>
                <p className="text-xs text-stone-500 font-mono">Rendering high-resolution vector pages</p>
              </div>
            )}

            {/* Error fallback banner */}
            {pdfError && !isLoadingPdf && (
              <div className="w-full max-w-xl mx-auto p-4 mb-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-2">
                  <p className="font-semibold text-sm text-amber-100">Inline PDF render issue</p>
                  <p>The PDF document could not be previewed inline. You can open it in a new tab or download the file directly.</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium cursor-pointer"
                    >
                      Download PDF
                    </button>
                    <a
                      href={fallbackUrl}
                      onClick={handleOpenInNewTab}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded font-medium inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in Tab
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Canvas Pages Container */}
            {!isLoadingPdf && numPages > 0 && (
              <div className="flex flex-col items-center gap-6 py-2">
                {Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <div
                    key={pageNum}
                    className="relative bg-white shadow-2xl rounded-sm overflow-hidden border border-stone-800 transition-transform duration-150 ease-out origin-top"
                  >
                    <canvas
                      ref={(el) => {
                        if (el) {
                          canvasRefs.current.set(pageNum, el);
                        } else {
                          canvasRefs.current.delete(pageNum);
                        }
                      }}
                      className="block bg-white"
                    />
                    {numPages > 1 && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-white font-mono backdrop-blur-xs">
                        Page {pageNum} of {numPages}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
