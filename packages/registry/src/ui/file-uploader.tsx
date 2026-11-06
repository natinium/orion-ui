import * as React from 'react';

import { cn } from '../lib/utils';

type FileStatus = 'queued' | 'uploading' | 'done' | 'error';

interface QueueItem {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
}

/**
 * FileUploader — dropzone with a self-managed queue: drag & drop or browse,
 * per-file status (queued / uploading / done / error) and retry on error.
 *
 * Upload behavior is yours: pass `upload` (async, resolves when the file is
 * stored) and the queue drives itself. Without `upload`, files simply queue.
 *
 * @example
 * <FileUploader
 *   accept="image/*"
 *   multiple
 *   upload={async (file) => { const url = await store(file); }}
 * />
 */
function FileUploader({
  upload,
  accept,
  multiple = true,
  maxFiles,
  className,
  ...props
}: FileUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [dragging, setDragging] = React.useState(false);

  const addFiles = (list: FileList | File[]) => {
    const incoming = Array.from(list);
    const room = maxFiles ? Math.max(0, maxFiles - queue.length) : incoming.length;
    const accepted = incoming.slice(0, room);
    if (accepted.length === 0) return;
    const items: QueueItem[] = accepted.map((file, i) => ({
      id: `${Date.now()}-${i}-${file.name}`,
      file,
      status: 'queued',
      progress: 0,
    }));
    setQueue((q) => [...q, ...items]);
    if (upload) items.forEach((item) => runUpload(item));
  };

  const runUpload = async (item: QueueItem) => {
    if (!upload) return;
    setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'uploading', progress: 30 } : f)));
    try {
      await upload(item.file);
      setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'done', progress: 100 } : f)));
    } catch {
      setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'error', progress: 0 } : f)));
    }
  };

  const remove = (id: string) => setQueue((q) => q.filter((f) => f.id !== id));

  const dropzone = (
    <div
      data-slot="file-uploader-dropzone"
      role="button"
      tabIndex={0}
      aria-label="Upload files"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
      className={cn(
        'flex min-h-28 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground transition-colors',
        dragging ? 'border-primary bg-primary/5' : 'hover:bg-accent/40',
      )}
    >
      <span className="font-medium text-foreground">Drop files here or click to browse</span>
      <span>{multiple ? 'Multiple files allowed' : 'Single file only'}</span>
    </div>
  );

  return (
    <div data-slot="file-uploader" className={cn('flex flex-col gap-3', className)} {...props}>
      {dropzone}
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {queue.length > 0 && (
        <ul data-slot="file-uploader-queue" className="flex flex-col gap-2">
          {queue.map((item) => (
            <li
              key={item.id}
              data-slot="file-uploader-item"
              data-status={item.status}
              className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
              <span
                data-status-label
                className={
                  item.status === 'done'
                    ? 'text-xs text-green-600'
                    : item.status === 'error'
                      ? 'text-xs text-red-600'
                      : 'text-xs text-muted-foreground'
                }
              >
                {item.status === 'queued' && 'queued'}
                {item.status === 'uploading' && `uploading ${item.progress}%`}
                {item.status === 'done' && 'done ✓'}
                {item.status === 'error' && 'failed'}
              </span>
              {item.status === 'error' && (
                <button
                  type="button"
                  onClick={() => runUpload(item)}
                  className="text-xs underline underline-offset-2 hover:text-foreground"
                >
                  retry
                </button>
              )}
              <button
                type="button"
                aria-label={`Remove ${item.file.name}`}
                onClick={() => remove(item.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface FileUploaderProps extends React.ComponentProps<'div'> {
  upload?: (file: File) => Promise<void>;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
}

export { FileUploader };
