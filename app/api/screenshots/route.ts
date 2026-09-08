import { env } from 'cloudflare:workers';
import { assertSafePublicUrl } from '@/lib/url-safety';

export async function GET(request: Request) {
  const input = new URL(request.url);
  const raw = input.searchParams.get('url');
  const mobile = input.searchParams.get('viewport') === 'mobile';
  if (!raw) return Response.json({ error: 'URL_REQUIRED' }, { status: 400 });
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_BROWSER_RENDERING_TOKEN)
    return Response.json(
      { error: 'SCREENSHOTS_NOT_CONFIGURED' },
      { status: 503 },
    );
  try {
    const url = assertSafePublicUrl(raw);
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_BROWSER_RENDERING_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          viewport: mobile
            ? { width: 390, height: 844 }
            : { width: 1440, height: 900 },
          screenshotOptions: { type: 'jpeg', quality: 78, fullPage: false },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok)
      return Response.json(
        { error: 'SCREENSHOT_FAILED', status: response.status },
        { status: 502 },
      );
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: 'INVALID_OR_UNREACHABLE_URL',
        message: error instanceof Error ? error.message : 'Capture impossible',
      },
      { status: 422 },
    );
  }
}
