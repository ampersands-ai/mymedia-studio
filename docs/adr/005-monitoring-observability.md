# ADR 005: Monitoring & Observability

## Status
Accepted

## Context
Limited visibility into application health and user experience:
- No centralized error tracking
- Limited production debugging capabilities
- No performance monitoring
- No proactive alerting for issues

## Decision
Implement comprehensive monitoring and observability:

### Error Tracking

#### Frontend
- **Structured Logging**: All errors logged via logger system
- **PostHog Integration**: Critical errors sent to PostHog
- **Backend Logging**: Errors written to user_error_logs table
- **Error Dashboard**: Real-time UI for monitoring errors

#### Edge Functions
- **EdgeLogger**: JSON-formatted structured logs
- **Error Context**: Full stack traces with request context
- **Safe Error Responses**: Generic messages to users, detailed logs server-side

### Performance Monitoring

#### Web Vitals
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- TTFB (Time to First Byte)

#### User Flow Tracking
```typescript
trackUserFlow('generation', 'start');
// ... flow execution
trackUserFlow('generation', 'complete');
// Duration automatically calculated and sent to analytics
```

#### Database Performance
- Query execution time monitoring
- Slow query identification
- Materialized view refresh tracking

### Log Aggregation

#### Structure
```typescript
{
  timestamp: ISO string,
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical',
  message: string,
  context: {
    component?: string,
    userId?: string,
    route?: string,
    requestId?: string,
    duration?: number,
    metadata?: object
  }
}
```

#### Storage
- Frontend errors: `user_error_logs` table
- Edge function logs: Console (CloudWatch)
- Future: Dedicated `function_logs` table for structured edge logs

### Alerting

#### Critical Errors
- Immediate alert when critical errors occur
- Email notifications to admin team
- Slack/Discord webhooks for real-time alerts

#### Health Monitoring
- Model health checks
- Webhook health monitoring
- Generation timeout alerts
- Stuck job recovery

### Dashboards

#### Error Dashboard (`/admin/error-dashboard`)
- Real-time error stream
- Error grouping by type
- Severity filtering
- Affected user count
- Resolution tracking

#### Advanced Analytics (`/admin/advanced-analytics`)
- Generation metrics
- User activity trends
- Performance metrics
- Error rate graphs

### Retention Policies

#### Logs
- Error logs: 90 days
- Info logs: 30 days
- Debug logs: 7 days (dev only)

#### Metrics
- Real-time: 24 hours
- Aggregated daily: 1 year
- Aggregated monthly: Indefinite

## Implementation

### Phase 1: Structured Logging ✅
- Created logger utilities
- Updated high-priority files
- Added error classification

### Phase 2: Error Tracking ✅
- Error dashboard created
- Real-time error monitoring
- PostHog integration

### Phase 3: Performance Monitoring (In Progress)
- Web vitals tracking implemented
- User flow tracking added
- Database performance metrics needed

### Phase 4: Alerting (Planned)
- Critical error alerts
- Health check alerts
- Slack/Discord integration

## Consequences

### Positive
- Quick issue identification
- Better production debugging
- Proactive issue detection
- Data-driven optimization
- Improved user experience

### Negative
- Storage costs for logs
- Performance overhead (minimal)
- Alert fatigue if not tuned properly

### Neutral
- Requires ongoing tuning
- Need to balance detail vs noise

## Metrics to Track

### Application Health
- Error rate per hour
- Critical error count
- Average response time
- P95/P99 latency

### User Experience
- Generation success rate
- Average generation time
- Download success rate
- Session duration

### System Health
- Edge function execution time
- Database query performance
- External API latency
- Cache hit rate

## Related Decisions
- ADR 001: Error Handling Strategy
- ADR 002: Logging Architecture
