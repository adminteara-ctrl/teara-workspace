
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(
  seconds: number,
  format: 'short' | 'hms' | 'full' = 'hms'
): string {
  if (seconds < 0) seconds = 0;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (format === 'short') {
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  if (format === 'full') {
    return `${hours} hr ${minutes} min ${secs} sec`;
  }

  // hms: 00:00:00
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  return `${hh}:${mm}:${ss}`;
}

export function formatTime(isoString?: string): string {
  if (!isoString) return '--:--';

  try {
    const date = new Date(isoString);

    return date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '--:--';
  }
}

export function formatDate(isoOrDateString?: string): string {
  if (!isoOrDateString) return '';

  try {
    // Date-only values must be parsed as IST calendar dates.
    const date = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDateString)
      ? new Date(`${isoOrDateString}T00:00:00+05:30`)
      : new Date(isoOrDateString);

    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoOrDateString;
  }
}

export function getTodayDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function exportToCSV(
  filename: string,
  rows: Record<string, any>[]
) {
  if (!rows || !rows.length) return;

  const headers = Object.keys(rows[0]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const val =
            row[header] === undefined || row[header] === null
              ? ''
              : String(row[header]);

          const escaped = val.replace(/"/g, '""');

          return `"${escaped}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
