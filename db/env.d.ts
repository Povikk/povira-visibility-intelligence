declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    PAGESPEED_API_KEY?: string;
    CLOUDFLARE_ACCOUNT_ID?: string;
    CLOUDFLARE_BROWSER_RUN_TOKEN?: string;
  }
}
