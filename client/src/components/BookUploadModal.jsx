import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, FileText, X } from 'lucide-react';
import { useI18n } from '../i18n';

async function computeSha256(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function BookUploadModal({ isOpen, onClose, onUploadComplete, categories = [] }) {
  const { t } = useI18n();
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('General');
  const [newCategory, setNewCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const ext = selected.name.split('.').pop().toLowerCase();
      if (!['pdf', 'epub'].includes(ext)) {
        setErrorMessage('Apenas arquivos .pdf ou .epub são suportados.');
        setFile(null);
        return;
      }
      setErrorMessage('');
      setFile(selected);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setProgress(10);
    setErrorMessage('');
    setStatusMessage('Calculando hash SHA-256 do arquivo...');

    try {
      // 1. Calculate binary SHA-256
      const sha256 = await computeSha256(file);
      setProgress(30);
      setStatusMessage('Solicitando autorização de upload à AWS...');

      const ext = file.name.split('.').pop().toLowerCase();
      const targetCategory = newCategory.trim() || category;

      // 2. Request Presigned PUT URL from API
      const reqRes = await fetch('/api/aws/books/upload-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          file_size: file.size,
          format: ext,
          category: targetCategory,
          sha256_hash: sha256
        })
      });

      if (!reqRes.ok) {
        throw new Error(`Falha ao solicitar upload: ${reqRes.statusText}`);
      }

      const reqData = await reqRes.json();
      if (reqData.exists) {
        setStatusMessage('Este livro já está cadastrado na biblioteca!');
        setProgress(100);
        setTimeout(() => {
          onClose();
          onUploadComplete && onUploadComplete(reqData.book);
        }, 1200);
        return;
      }

      // 3. Upload binary directly to S3 via Presigned PUT URL
      setStatusMessage('Enviando arquivo diretamente para o S3...');
      setProgress(50);

      const contentType = ext === 'pdf' ? 'application/pdf' : 'application/epub+zip';
      const s3Res = await fetch(reqData.upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType
        },
        body: file
      });

      if (!s3Res.ok) {
        throw new Error(`Erro ao enviar arquivo para o S3 (${s3Res.status})`);
      }

      setProgress(100);
      setStatusMessage('Upload concluído com sucesso!');

      setTimeout(() => {
        onClose();
        onUploadComplete && onUploadComplete();
      }, 1000);

    } catch (err) {
      console.error('Erro no upload:', err);
      setErrorMessage(err.message || 'Erro durante o upload');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-neutral-100">Upload de Livro para S3</h2>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleUpload} className="p-6 space-y-4">
          {/* File Picker / Drag Area */}
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition ${
              file 
                ? 'border-amber-500/50 bg-amber-500/5' 
                : 'border-neutral-700 hover:border-neutral-500 bg-neutral-950/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.epub"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-10 h-10 text-amber-400" />
                <span className="text-sm font-semibold text-neutral-100 max-w-[260px] truncate">
                  {file.name}
                </span>
                <span className="text-xs text-neutral-400">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-neutral-400">
                <UploadCloud className="w-10 h-10 text-neutral-500" />
                <span className="text-sm font-medium">Clique ou arraste um PDF ou EPUB</span>
                <span className="text-xs text-neutral-500">Deduplicação automática por SHA-256</span>
              </div>
            )}
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Categoria do Livro
            </label>
            <div className="space-y-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={uploading}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-amber-500/60"
              >
                <option value="General">Geral / Sem Categoria</option>
                {categories.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Ou digite uma nova categoria..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                disabled={uploading}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          {/* Progress / Status */}
          {uploading && (
            <div className="space-y-2 pt-2">
              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-amber-400 text-center font-medium">
                {statusMessage}
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 text-xs font-bold rounded-lg transition shadow-md shadow-amber-500/20 flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{uploading ? 'Enviando...' : 'Enviar para o S3'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
