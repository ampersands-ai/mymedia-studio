# API Documentation

This directory contains API documentation for the application's backend services.

## Overview

The application uses Supabase Edge Functions for serverless backend operations. All edge functions are deployed automatically and accessible via the Supabase Functions endpoint.

## Base URL

```
https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1
```

## Authentication

Most endpoints require authentication via Supabase JWT tokens. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

Tokens are obtained through the Supabase Auth client after user login.

## Available Documentation

- [Edge Functions](./edge-functions.md) - Detailed API reference for all edge functions

## Quick Reference

### Content Generation

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/generate-content` | POST | Yes | Start AI content generation |
| `/check-generation-status` | POST | Yes | Check generation progress |
| `/generate-random-prompt` | POST | No | Get creative prompt suggestions |

### Media & Assets

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/get-voices` | GET | No | List available TTS voices |
| `/get-shared-content` | GET | No | Access shared content via token |

### User Management

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/export-user-data` | POST | Yes | Request GDPR data export |
| `/delete-account` | POST | Yes | Request account deletion |

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

See [Edge Functions](./edge-functions.md#error-handling) for complete error code reference.

## Rate Limiting

API endpoints are rate-limited to prevent abuse. Limits vary by endpoint and user tier. Rate limit information is included in response headers:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## CORS

All endpoints support CORS for browser-based requests. Allowed origins are configured per environment.

## Webhooks

Some operations support webhook callbacks for async completion notifications. See individual endpoint documentation for webhook configuration options.
