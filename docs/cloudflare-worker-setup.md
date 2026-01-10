# Cloudflare Worker Pre-rendering Setup

This guide explains how to deploy the Cloudflare Worker that routes bot traffic to pre-rendered HTML.

## Overview

The Cloudflare Worker intercepts all incoming requests and:
1. Detects if the request is from a bot (Google, Bing, ChatGPT, Claude, etc.)
2. Routes bots to the Supabase prerender edge function for static HTML
3. Routes human users to the React SPA as normal

## Prerequisites

1. Cloudflare account (free tier works)
2. Domain added to Cloudflare (artifio.ai)
3. Supabase project with prerender edge function deployed

## Setup Steps

### Step 1: Create a Cloudflare Worker

1. Log in to Cloudflare Dashboard
2. Go to **Workers & Pages** → **Create application** → **Create Worker**
3. Name it `artifio-prerender` or similar
4. Click **Deploy**

### Step 2: Configure Worker Code

1. Click **Edit Code** on the worker
2. Replace the default code with the contents of `cloudflare-worker.js` (see below)
3. Click **Save and Deploy**

### Step 3: Add Environment Variables

1. Go to **Settings** → **Variables**
2. Add these environment variables:
   - `SUPABASE_URL`: `https://gzlwkvmivbfcvczoqphq.supabase.co`
   - `SUPABASE_ANON_KEY`: Your Supabase anon key

### Step 4: Create Route

1. Go to the **Triggers** tab
2. Click **Add route**
3. Add route: `artifio.ai/*` (or your domain)
4. Select the zone for your domain
5. Click **Add route**

### Step 5: Test the Worker

Use curl to test bot detection:

```bash
# Test as Googlebot
curl -H "User-Agent: Googlebot/2.1 (+http://www.google.com/bot.html)" https://artifio.ai/models/kling-2-6

# Test as ChatGPT
curl -H "User-Agent: GPTBot/1.0 (+https://openai.com/gptbot)" https://artifio.ai/models/kling-2-6

# Test as Claude
curl -H "User-Agent: ClaudeBot/1.0 (+https://anthropic.com)" https://artifio.ai/models/kling-2-6

# Test as human (should return React SPA)
curl -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" https://artifio.ai/models/kling-2-6
```

## Monitoring

### Cloudflare Analytics

1. Go to **Analytics** → **Workers**
2. View request counts, CPU time, and errors
3. Filter by bot vs human traffic

### Supabase Logs

Monitor the prerender edge function in Supabase:
1. Go to Edge Functions → prerender → Logs
2. Check for rendering errors or timeouts

## Cache Management

### Manual Cache Invalidation

Call the invalidate endpoint when content changes:

```bash
curl -X POST https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/invalidate-prerender-cache \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url_paths": ["/models/kling-2-6"]}'
```

### Warm Cache

Pre-render all important pages:

```bash
curl -X POST https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/warm-prerender-cache \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"categories": ["models", "templates", "static"]}'
```

## Troubleshooting

### Bot not getting pre-rendered content

1. Check if User-Agent is in the bot list
2. Verify the Cloudflare route is active
3. Check Supabase edge function logs

### Pre-render timeout

1. Increase timeout in Browserless.io call
2. Check if page has heavy JavaScript
3. Consider pre-warming cache for slow pages

### Cache not updating

1. Call invalidate-prerender-cache manually
2. Check if expires_at is set correctly
3. Verify database write permissions

## Cost Estimates

| Service | Monthly Cost |
|---------|--------------|
| Cloudflare Workers | Free (100k req/day) |
| Cloudflare Paid Plan | $5/month (10M req) |
| Browserless.io Free | 1,000 renders/month |
| Browserless.io Starter | $20/month (10k renders) |

## Security Notes

- The worker only exposes public pages
- Authentication is required for cache management
- Bot detection is based on User-Agent (can be spoofed, but harmless)
