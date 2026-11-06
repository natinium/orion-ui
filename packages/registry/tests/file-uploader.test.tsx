import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FileUploader } from '../src/ui/file-uploader';

const file = (name: string) => new File(['hello'], name, { type: 'text/plain' });

describe('FileUploader', () => {
  it('renders the dropzone with data-slot', () => {
    render(<FileUploader />);
    expect(screen.getByRole('button', { name: 'Upload files' })).toHaveAttribute(
      'data-slot',
      'file-uploader-dropzone',
    );
  });

  it('queues files added via the input and supports removal', () => {
    render(<FileUploader />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file('a.txt'), file('b.txt')] } });
    expect(screen.getByText('a.txt')).toBeInTheDocument();
    expect(screen.getByText('b.txt')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove a.txt' }));
    expect(screen.queryByText('a.txt')).not.toBeInTheDocument();
  });

  it('respects maxFiles', () => {
    render(<FileUploader maxFiles={1} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file('a.txt'), file('b.txt')] } });
    expect(screen.getByText('a.txt')).toBeInTheDocument();
    expect(screen.queryByText('b.txt')).not.toBeInTheDocument();
  });

  it('runs the upload callback and marks files done', async () => {
    const upload = vi.fn().mockResolvedValue(undefined);
    render(<FileUploader upload={upload} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file('a.txt')] } });
    await waitFor(() => expect(screen.getByText('done ✓')).toBeInTheDocument());
    expect(upload).toHaveBeenCalled();
  });

  it('surfaces errors with a working retry', async () => {
    const upload = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue(undefined);
    render(<FileUploader upload={upload} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file('a.txt')] } });
    await waitFor(() => expect(screen.getByText('failed')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(screen.getByText('done ✓')).toBeInTheDocument());
    expect(upload).toHaveBeenCalledTimes(2);
  });
});
