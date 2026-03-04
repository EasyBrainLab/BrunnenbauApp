import { useState, useRef } from 'react';

export default function FileUpload({ name, label, accept = '.pdf,.jpg,.jpeg,.png', onChange, value, multiple = false, helpText }) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const files = multiple ? (Array.isArray(value) ? value : []) : null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (multiple) {
      const newFiles = Array.from(e.dataTransfer.files);
      if (newFiles.length > 0) {
        onChange(name, [...files, ...newFiles]);
      }
    } else {
      if (e.dataTransfer.files?.[0]) {
        onChange(name, e.dataTransfer.files[0]);
      }
    }
  };

  const handleChange = (e) => {
    if (multiple) {
      const newFiles = Array.from(e.target.files);
      if (newFiles.length > 0) {
        onChange(name, [...files, ...newFiles]);
      }
    } else {
      if (e.target.files?.[0]) {
        onChange(name, e.target.files[0]);
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (index) => {
    if (multiple) {
      onChange(name, files.filter((_, i) => i !== index));
    } else {
      onChange(name, null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const dropZone = (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        dragActive ? 'border-primary-400 bg-primary-50' : 'border-earth-300 hover:border-primary-300 hover:bg-earth-50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <svg className="w-10 h-10 mx-auto text-earth-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p className="text-sm text-gray-600">
        {multiple && files.length > 0
          ? <>Weitere Dateien hier ablegen oder <span className="text-primary-500 font-semibold">durchsuchen</span></>
          : <>Datei{multiple ? 'en' : ''} hier ablegen oder <span className="text-primary-500 font-semibold">durchsuchen</span></>
        }
      </p>
      <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOCX – max. 10 MB</p>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );

  const fileRow = (file, index) => (
    <div key={index} className="flex items-center gap-3 p-3 bg-accent-50 border border-accent-200 rounded-lg">
      <svg className="w-5 h-5 text-accent-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
      <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
      <button type="button" onClick={() => removeFile(index)} className="text-red-400 hover:text-red-600 transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );

  if (multiple) {
    return (
      <div>
        {label && <label className="form-label">{label}</label>}
        {helpText && <p className="text-xs text-gray-500 mb-2">{helpText}</p>}
        {files.length > 0 && (
          <div className="space-y-2 mb-3">
            {files.map((file, i) => fileRow(file, i))}
          </div>
        )}
        {dropZone}
      </div>
    );
  }

  // Single file mode (original behavior)
  return (
    <div>
      {label && <label className="form-label">{label}</label>}
      {helpText && <p className="text-xs text-gray-500 mb-2">{helpText}</p>}
      {value ? fileRow(value, 0) : dropZone}
    </div>
  );
}
