import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  FileText,
  RefreshCw
} from 'lucide-react';
import { Profile } from '../types';
import { getResumePdf, StoredPdfRecord } from '../utils/pdfStorage';

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
}

export const ResumeModal: React.FC<ResumeModalProps> = ({
  isOpen,
  onClose,
  profile
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [storedPdf, setStoredPdf] = useState<StoredPdfRecord | null>(null);
  
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

  const isExternalGoogleDrive = rawUrl.includes('drive.google.com') && rawUrl.includes('/view');

  // Prioritize the user's authentic uploaded PDF from IndexedDB, otherwise use the resume URL
  const embedUrl = useMemo(() => {
    if (storedPdf && storedPdf.dataUrl) {
      return storedPdf.dataUrl;
    }
    if (isExternalGoogleDrive) {
      return rawUrl.replace('/view', '/preview');
    }
    return rawUrl;
  }, [storedPdf, rawUrl, isExternalGoogleDrive]);

  // Direct untouched original PDF file download handler
  const handleDownload = async () => {
    setIsDownloading(true);
    const downloadFileName = storedPdf?.fileName || 'Mohammed_Saahir_Essa_Resume.pdf';

    try {
      // If we have the authentic uploaded PDF in IndexedDB, download that exact file binary
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

      // Otherwise request from dedicated backend download endpoint
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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200"
    >
      <div 
        id="resume-modal-container"
        className="relative w-full max-w-5xl h-[92vh] bg-stone-900 rounded-2xl shadow-2xl border border-stone-800 flex flex-col overflow-hidden text-stone-100"
      >
        
        {/* Clean Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-stone-900 border-b border-stone-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-stone-100">
                Mohammed Saahir Essa — Resume
              </h3>
              <p className="text-[11px] text-stone-400 font-mono hidden sm:block">
                Product Design Engineer • Hardware Architecture
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Original PDF Directly */}
            <button
              id="download-resume-pdf-btn"
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Download original untouched PDF file directly"
            >
              {isDownloading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
            </button>

            {/* Open in new tab */}
            <a
              id="open-resume-new-tab"
              href={embedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              title="Open PDF in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open in Tab</span>
            </a>

            {/* Close Button */}
            <button
              id="close-resume-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer ml-1"
              title="Close popup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Embed Viewer: Displays only the untouched PDF */}
        <div className="flex-1 bg-stone-950 relative overflow-hidden flex flex-col">
          <iframe 
            key={embedUrl}
            src={`${embedUrl}#toolbar=1&navpanes=0`} 
            title="Mohammed Saahir Essa - Resume PDF"
            className="w-full h-full border-0 bg-stone-900"
          />
        </div>

      </div>
    </div>
  );
};
