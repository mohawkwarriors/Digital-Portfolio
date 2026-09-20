import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Link as LinkIcon, RefreshCw, Check } from 'lucide-react';
import { uploadImageFile } from '../utils/imageUpload';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspectRatio?: 'square' | 'wide' | 'auto';
  helperText?: string;
  className?: string;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  onChange,
  aspectRatio = 'wide',
  helperText,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputVal, setUrlInputVal] = useState(value || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    setIsUploading(true);
    try {
      const url = await uploadImageFile(file);
      if (url) {
        onChange(url);
        setUrlInputVal(url);
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

  const hasImage = Boolean(value && value.trim().length > 0);

  const aspectClass = 
    aspectRatio === 'square' ? 'aspect-square max-w-[120px] object-cover' :
    aspectRatio === 'wide' ? 'aspect-16/9 max-h-[160px] object-cover' : 'min-h-[90px] max-h-[220px] w-auto max-w-full object-contain';

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block font-mono text-[11px] text-stone-600 font-medium">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[10px] font-mono text-stone-400 hover:text-stone-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          <LinkIcon className="w-2.5 h-2.5" />
          <span>{showUrlInput ? 'Hide URL' : 'Paste URL instead'}</span>
        </button>
      </div>

      {showUrlInput && (
        <div className="flex items-center gap-1.5 pb-1">
          <input
            type="text"
            placeholder="https://images.unsplash.com/..."
            value={urlInputVal}
            onChange={(e) => {
              setUrlInputVal(e.target.value);
              onChange(e.target.value);
            }}
            className="w-full px-2.5 py-1 text-xs rounded border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-stone-800"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                setUrlInputVal('');
                onChange('');
              }}
              className="p-1 text-stone-400 hover:text-red-600 transition-colors"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {hasImage ? (
        <div className="relative group rounded-xl border border-stone-200 overflow-hidden bg-stone-50 flex items-center justify-center">
          <img
            src={value}
            alt={label}
            className={`rounded-xl ${aspectClass}`}
            onError={(e) => {
              // Fallback styling if image link fails
              (e.target as HTMLElement).style.opacity = '0.5';
            }}
          />
          <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 backdrop-blur-2xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-white text-stone-900 text-xs font-medium shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              <span>Replace</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setUrlInputVal('');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600/95 hover:bg-red-600 text-white text-xs font-medium shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Remove</span>
            </button>
          </div>
          {isUploading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center gap-2 text-xs text-stone-700 font-medium">
              <RefreshCw className="w-4 h-4 animate-spin text-stone-900" />
              <span>Uploading...</span>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
            isDragging
              ? 'border-stone-800 bg-stone-100 ring-2 ring-stone-900/10'
              : 'border-stone-300 hover:border-stone-400 bg-stone-50/70 hover:bg-stone-50'
          }`}
        >
          {isUploading ? (
            <div className="flex items-center gap-2 text-xs text-stone-600 py-2">
              <RefreshCw className="w-4 h-4 animate-spin text-stone-900" />
              <span>Uploading image...</span>
            </div>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-500 shadow-2xs">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-stone-800">
                  Click to upload or drag & drop
                </p>
                <p className="text-[10.5px] text-stone-400 mt-0.5">
                  PNG, JPG, WEBP, or SVG
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {helperText && (
        <p className="text-[10px] text-stone-400 leading-tight">
          {helperText}
        </p>
      )}
    </div>
  );
};
