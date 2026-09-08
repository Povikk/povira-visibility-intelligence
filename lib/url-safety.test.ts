import { describe, expect, it } from 'vitest';
import { safeUrlSchema } from './url-safety';
describe('protection SSRF', () => { it.each(['http://localhost:3000','http://127.0.0.1','http://169.254.169.254/latest','ftp://example.com'])('bloque %s', (url) => expect(safeUrlSchema.safeParse(url).success).toBe(false)); it('accepte une URL publique HTTPS', () => expect(safeUrlSchema.safeParse('https://example.com').success).toBe(true)); });
