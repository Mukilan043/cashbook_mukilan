import { format, parseISO } from 'date-fns';

export function toDateOnly(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    return value.split('T')[0];
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function formatDateDisplay(value, pattern = 'MMM dd, yyyy') {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return '';
  try {
    return format(parseISO(dateOnly), pattern);
  } catch {
    return dateOnly;
  }
}
