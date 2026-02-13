"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, ImageOff, Loader2 } from "lucide-react";

interface ImageUploadProps {
  currentUrl?: string;
  onUpload: (file: File) => Promise<string>;
  onRemove?: () => void;
  label?: string;
}

export function ImageUpload({ currentUrl, onUpload, onRemove, label = "Product Image" }: ImageUploadProps) {
  const [preview, setPreview] = useState<string>(currentUrl || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const url = await onUpload(file);
      setPreview(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview("");
    onRemove?.();
    if (inputRef.current) inputRef.current.value = "";
  };

  const hasImage = preview && !preview.startsWith("blob:") && !preview.startsWith("data:");

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>

      {hasImage ? (
        <div className="relative w-full aspect-[3/4] max-w-xs rounded-lg overflow-hidden border border-gray-200">
          <Image
            src={preview}
            alt="Upload preview"
            fill
            className="object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 transition-colors"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="w-full max-w-xs aspect-[3/4] rounded-lg border-2 border-dashed border-gray-300 hover:border-coral/50 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50"
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-coral" />
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Click to upload</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}
