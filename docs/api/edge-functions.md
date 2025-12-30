# Edge Functions API Reference

This document provides detailed API specifications for the application's edge functions.

## Table of Contents

- [generate-content](#generate-content)
- [check-generation-status](#check-generation-status)
- [get-voices](#get-voices)
- [generate-random-prompt](#generate-random-prompt)

---

## generate-content

Initiates AI content generation for various model types (image, video, audio).

### Endpoint

```
POST /functions/v1/generate-content
```

### Authentication

Requires valid Supabase JWT token in Authorization header.

```http
Authorization: Bearer <jwt_token>
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| generationId | string (UUID) | Yes | Database generation record ID |
| model_config | object | Yes | Model configuration from registry |
| model_schema | object | Yes | Model input schema for validation |
| prompt | string | Yes | User prompt (max 5000 chars) |
| custom_parameters | object | No | Additional model-specific parameters |
| enhance_prompt | boolean | No | Whether to enhance the prompt with AI |

### Response

#### Success (200)

```json
{
  "success": true,
  "generationId": "uuid-here",
  "status": "processing"
}
```

#### Error Responses

| Code | Description |
|------|-------------|
| 400 | Invalid request body or validation error |
| 401 | Missing or invalid authentication |
| 402 | Insufficient tokens/credits |
| 429 | Rate limit exceeded |
| 500 | Server error |

### Example

```bash
curl -X POST \
  'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/generate-content' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "generationId": "123e4567-e89b-12d3-a456-426614174000",
    "model_config": {
      "modelId": "flux-pro",
      "provider": "replicate"
    },
    "model_schema": {},
    "prompt": "A beautiful sunset over mountains"
  }'
```

---

## check-generation-status

Checks the status of an ongoing generation and returns the result if completed.

### Endpoint

```
POST /functions/v1/check-generation-status
```

### Authentication

Requires valid Supabase JWT token.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| generationId | string (UUID) | Yes | Generation record ID to check |

### Response

#### Processing (200)

```json
{
  "status": "processing",
  "progress": 45
}
```

#### Completed (200)

```json
{
  "status": "completed",
  "output_url": "https://storage.example.com/path/to/file.png",
  "storage_path": "user-id/2024-01-15/generation-id.png"
}
```

#### Failed (200)

```json
{
  "status": "failed",
  "error": "Generation failed due to content policy violation"
}
```

---

## get-voices

Retrieves available voices for text-to-speech generation.

### Endpoint

```
GET /functions/v1/get-voices
```

### Authentication

Optional. Works without authentication for public voice list.

### Response

```json
{
  "voices": [
    {
      "voice_id": "voice-123",
      "name": "Emma",
      "language": "English",
      "preview_url": "https://storage.example.com/previews/emma.mp3"
    }
  ]
}
```

---

## generate-random-prompt

Generates creative AI prompts for content generation.

### Endpoint

```
POST /functions/v1/generate-random-prompt
```

### Authentication

Optional.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| contentType | string | No | Type of content: "image", "video", "audio" |

### Response

```json
{
  "prompt": "A cyberpunk city at night with neon lights reflecting on wet streets"
}
```

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Request validation failed |
| RATE_LIMITED | 429 | Too many requests |
| INSUFFICIENT_CREDITS | 402 | Not enough tokens for operation |
| INTERNAL_ERROR | 500 | Unexpected server error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| generate-content | 10 requests/minute |
| check-generation-status | 60 requests/minute |
| get-voices | 30 requests/minute |
| generate-random-prompt | 20 requests/minute |

Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1609459200
```
