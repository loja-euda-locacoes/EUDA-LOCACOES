import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDriveDirectLink(url: string | undefined): string {
  if (!url) return '';
  if (!url.includes('drive.google.com')) return url;

  const regex = /\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)/;
  const match = url.match(regex);
  const driveId = match ? (match[1] || match[2]) : null;

  if (driveId) {
    return `https://lh3.googleusercontent.com/u/0/d/${driveId}`;
  }
  
  return url;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function calculateFine(
  returnDate: string,
  baseValue: number,
  settings: { fixedFine: number; percentFine: number; toleranceHours: number }
) {
  const now = new Date();
  const returnD = new Date(returnDate);
  const toleranceLimit = new Date(returnD.getTime() + settings.toleranceHours * 60 * 60 * 1000);

  if (now <= toleranceLimit) return 0;

  const diffInMs = now.getTime() - returnD.getTime();
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

  const totalFixed = diffInDays * settings.fixedFine;
  const totalPercent = diffInDays * (baseValue * (settings.percentFine / 100));

  return totalFixed + totalPercent;
}

export function generateWhatsAppLink(number: string, message: string) {
  const cleanNumber = number.replace(/\D/g, '');
  return `https://wa.me/55${cleanNumber}?text=${encodeURIComponent(message)}`;
}
