import React, { useState, useRef } from 'react';
import { Upload, X, ArrowLeft, ArrowRight, RefreshCw, Plus, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { uploadImageFile } from '../utils/imageUpload';

interface MultiImageGalleryUploadProps {
  label: string;
  images: string[];
  onChange: (images: string[]) => void;
  helperText?: string;
  className?: string;
}

export const MultiImageGalleryUpload: React.FC<MultiImageGalleryUploadProps> = ({
  label,
  images = [],
  onChange,
  helperText,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputVal, setUrlInputVal] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of validFiles) {
        const url = await uploadImageFile(file);
        if (url) {
          uploadedUrls.push(url);
        }
      }
      if (uploadedUrls.length > 0) {
        onChange([...images, ...uploadedUrls]);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRemoveImage = (index: number) => {
    const updated = [...images];
    updated.splice(index, 1);
    onChange(updated);
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    const target = direction === 'left' ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;
    const updated = [...images];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    onChange(updated);
  };

  const handleAddUrl = () => {
    if (!urlInputVal.trim()) return;
    onChange([...images, urlInputVal.trim()]);
    setUrlInputVal('');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="font-mono text-[11px] text-stone-600 font-medium">
            {label}
          </label>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-200 text-stone-700 font-mono">
            {images.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {images.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10px] text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
            >
              Clear Gallery
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[10px] font-mono text-stone-400 hover:text-stone-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <LinkIcon className="w-2.5 h-2.5" />
            <span>{showUrlInput ? 'Hide URL' : '+ URL'}</span>
          </button>
        </div>
      </div>

      {showUrlInput && (
        <div className="flex items-center gap-1.5 pb-1">
          <input
            type="text"
            placeholder="Paste image URL (e.g. https://...)..."
            value={urlInputVal}
            onChange={(e) => setUrlInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddUrl();
              }
            }}
            className="w-full px-2.5 py-1 text-xs rounded border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-stone-800"
          />
          <button
            type="button"
            onClick={handleAddUrl}
            className="px-2.5 py-1 text-xs rounded bg-stone-800 text-white hover:bg-stone-900 transition-colors shrink-0 cursor-pointer"
          >
            Add
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {images.map((imgUrl, idx) => (
          <div
            key={idx}
            className="relative group rounded-xl border border-stone-200 overflow-hidden bg-stone-100 aspect-16/10 flex items-center justify-center shadow-2xs"
          >
            <img
              src={imgUrl}
              alt={`Gallery image ${idx + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Hover overlay with reorder and delete */}
            <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-1 backdrop-blur-2xs">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => handleMoveImage(idx, 'left')}
                className={`p-1 rounded bg-white/90 text-stone-800 transition-transform active:scale-95 ${
                  idx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white cursor-pointer'
                }`}
                title="Move left"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                className="p-1 rounded bg-red-600/90 hover:bg-red-600 text-white transition-transform active:scale-95 cursor-pointer"
                title="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
              <button
                type="button"
                disabled={idx === images.length - 1}
                onClick={() => handleMoveImage(idx, 'right')}
                className={`p-1 rounded bg-white/90 text-stone-800 transition-transform active:scale-95 ${
                  idx === images.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white cursor-pointer'
                }`}
                title="Move right"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono pointer-events-none">
              #{idx + 1}
            </span>
          </div>
        ))}

        {/* Add image dropzone tile */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl aspect-16/10 flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-stone-800 bg-stone-100'
              : 'border-stone-300 hover:border-stone-400 bg-stone-50/70 hover:bg-stone-50'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-1 text-stone-600 text-[10px]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-stone-900" />
              <span>Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-stone-500">
              <div className="w-6 h-6 rounded-full bg-white border border-stone-200 flex items-center justify-center shadow-2xs">
                <Plus className="w-3.5 h-3.5 text-stone-700" />
              </div>
              <span className="text-[10.5px] font-medium text-stone-700">
                + Upload Image
              </span>
              <span className="text-[9px] text-stone-400">
                Multiple files supported
              </span>
            </div>
          )}
        </div>
      </div>

      {helperText && (
        <p className="text-[10px] text-stone-400 leading-tight">
          {helperText}
        </p>
      )}
    </div>
  );
};
