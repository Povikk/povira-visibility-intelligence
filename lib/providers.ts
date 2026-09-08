export type ProviderResult<T> = { status: 'available'|'unavailable'; provider: string; data?: T; reason?: string };
export interface SearchProvider { isConfigured(): boolean; search(query: string): Promise<ProviderResult<unknown>> }
export interface AIVisibilityProvider { isConfigured(): boolean; analyze(queries: string[]): Promise<ProviderResult<unknown>> }
export interface PerformanceProvider { isConfigured(): boolean; analyze(url: string): Promise<ProviderResult<unknown>> }
export interface ScreenshotProvider { isConfigured(): boolean; capture(url: string): Promise<ProviderResult<{ desktop?: string; mobile?: string }>> }
export class MockProvider implements SearchProvider, AIVisibilityProvider, PerformanceProvider, ScreenshotProvider {
  isConfigured(){ return true; }
  async search(query: string){ return { status:'available' as const, provider:'mock', data:{ query, demo:true, results:[] } }; }
  async analyze(input: string|string[]){ return { status:'available' as const, provider:'mock', data:{ input, demo:true } }; }
  async capture(url: string){ return { status:'available' as const, provider:'mock', data:{ desktop:`/demo/desktop?url=${encodeURIComponent(url)}` } }; }
}
