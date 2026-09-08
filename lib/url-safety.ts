import { z } from 'zod';

const privateV4 = /^(0\.|10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|224\.|240\.)/;
const forbiddenHosts = new Set(['localhost', 'metadata.google.internal', 'metadata.azure.internal', 'instance-data']);

export const safeUrlSchema = z.url().trim().superRefine((value, ctx) => {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) ctx.addIssue({ code: 'custom', message: 'Seules les URLs HTTP(S) sont autorisées.' });
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (forbiddenHosts.has(host) || host.endsWith('.localhost') || privateV4.test(host) || host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) ctx.addIssue({ code: 'custom', message: 'Les hôtes locaux, privés et metadata cloud sont bloqués.' });
  if (url.username || url.password) ctx.addIssue({ code: 'custom', message: 'Les identifiants dans les URLs sont interdits.' });
});

export function assertSafePublicUrl(value: string) { return safeUrlSchema.parse(value); }
