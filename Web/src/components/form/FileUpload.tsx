import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { Spinner } from '@/components/feedback';

export interface FileUploadProps {
  /** Current value: a URL (uploaded or local preview), or null. */
  value: string | null;
  /** Receives the new preview URL (object URL until an uploader resolves a real one). */
  onChange: (url: string | null) => void;
  /** Receives the raw File for deferred/seam uploads (when no `uploader` is wired). */
  onFile?: (file: File | null) => void;
  /**
   * ImageKit (or other) upload seam. When provided, the file is uploaded and the
   * resolved URL replaces the local preview. When omitted (current state — no keys
   * configured), the local object URL is kept and the File is handed to `onFile`.
   */
  uploader?: (file: File) => Promise<string>;
  /** 'avatar' shows a round preview with initials fallback; 'image' a thumbnail; 'file' a row. */
  kind?: 'avatar' | 'image' | 'file';
  /** Name used for the initials fallback in avatar kind. */
  fallbackName?: string;
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
  invalid?: boolean;
  buttonLabel?: string;
  id?: string;
  className?: string;
}

/**
 * File / image picker with an ImageKit upload seam. Until media keys are wired it
 * previews locally (object URL) and surfaces the raw File via `onFile`; once an
 * `uploader` is supplied it uploads and stores the returned URL — no call-site change.
 */
export function FileUpload({
  value,
  onChange,
  onFile,
  uploader,
  kind = 'image',
  fallbackName,
  accept = kind === 'file' ? undefined : 'image/*',
  maxSizeMB = 5,
  disabled,
  invalid,
  buttonLabel,
  id,
  className,
}: FileUploadProps) {
  const reactId = useId();
  const inputId = id ?? `file-${reactId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const localUrlRef = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Revoke any outstanding object URL when the component unmounts.
  useEffect(() => {
    return () => {
      if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
    };
  }, []);

  const pick = () => inputRef.current?.click();

  const handleFile = async (file: File | null) => {
    setError(null);
    if (!file) return;
    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      setError(`File must be under ${maxSizeMB} MB.`);
      return;
    }
    setFileName(file.name);
    if (localUrlRef.current) {
      URL.revokeObjectURL(localUrlRef.current);
      localUrlRef.current = null;
    }
    const localUrl = URL.createObjectURL(file);
    localUrlRef.current = localUrl;
    onChange(localUrl);
    onFile?.(file);
    if (uploader) {
      setBusy(true);
      try {
        const url = await uploader(file);
        URL.revokeObjectURL(localUrl);
        localUrlRef.current = null;
        onChange(url);
      } catch {
        setError('Upload failed. Please try again.');
      } finally {
        setBusy(false);
      }
    }
  };

  const clear = () => {
    if (localUrlRef.current) {
      URL.revokeObjectURL(localUrlRef.current);
      localUrlRef.current = null;
    }
    onChange(null);
    onFile?.(null);
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const hidden = (
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      accept={accept}
      disabled={disabled}
      className="nx-sr-only"
      onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
    />
  );

  if (kind === 'avatar') {
    return (
      <div className={cn('nx-file-avatar', className)}>
        {hidden}
        <button
          type="button"
          className={cn('nx-file-avatar__btn', invalid && 'is-invalid')}
          onClick={pick}
          disabled={disabled || busy}
          aria-label={value ? 'Change photo' : 'Upload photo'}
        >
          <Avatar src={value ?? undefined} name={fallbackName ?? '?'} size={72} />
          <span className="nx-file-avatar__edit" aria-hidden="true">
            {busy ? <Spinner size={14} /> : <Icon name="edit" size={13} />}
          </span>
        </button>
        <div className="nx-file-avatar__meta">
          <button type="button" className="nx-file-avatar__link" onClick={pick} disabled={disabled || busy}>
            {value ? 'Change' : buttonLabel ?? 'Upload photo'}
          </button>
          {value && (
            <button type="button" className="nx-file-avatar__remove" onClick={clear} disabled={disabled}>
              Remove
            </button>
          )}
          {error && (
            <span className="nx-field__error" role="alert">
              {error}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (kind === 'file' && value) {
    return (
      <div className={cn('nx-file-row', invalid && 'is-invalid', className)}>
        {hidden}
        <span className="nx-file-row__icon">
          <Icon name="file-text" size={16} />
        </span>
        <span className="nx-file-row__name">{fileName ?? 'Attached file'}</span>
        {busy ? <Spinner size={14} /> : null}
        <button type="button" className="nx-file-row__x" onClick={clear} aria-label="Remove file" disabled={disabled}>
          <Icon name="x" size={14} />
        </button>
      </div>
    );
  }

  // Dropzone (image preview or empty file zone)
  return (
    <div className={className}>
      {hidden}
      <div
        className={cn('nx-dropzone', invalid && 'is-invalid', disabled && 'is-disabled')}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={pick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pick();
          }
        }}
        aria-label={buttonLabel ?? 'Upload file'}
      >
        {kind === 'image' && value ? (
          <div className="nx-dropzone__preview">
            <img src={value} alt="" />
            {busy && (
              <div className="nx-dropzone__busy">
                <Spinner size={20} />
              </div>
            )}
            <button
              type="button"
              className="nx-dropzone__x"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              aria-label="Remove image"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ) : (
          <div className="nx-dropzone__empty">
            <span className="nx-dropzone__icon">
              <Icon name={kind === 'image' ? 'image' : 'upload'} size={20} />
            </span>
            <span className="nx-dropzone__title">{buttonLabel ?? 'Click or drag to upload'}</span>
            <span className="nx-dropzone__hint">
              {accept?.includes('image') ? 'PNG, JPG' : 'Any file'} · up to {maxSizeMB} MB
            </span>
          </div>
        )}
      </div>
      {error && (
        <p className="nx-field__error" role="alert" style={{ marginTop: 6 }}>
          {error}
        </p>
      )}
    </div>
  );
}
