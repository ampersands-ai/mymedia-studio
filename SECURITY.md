# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Artifio.ai seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do Not Disclose Publicly

Please do **not** create a public GitHub issue for security vulnerabilities. This helps protect our users while we work on a fix.

### 2. Contact Us Privately

Send details of the vulnerability to our security team:

- **Email**: security@artifio.ai
- **Subject**: [SECURITY] Brief description of the issue

### 3. Include Details

To help us understand and resolve the issue quickly, please include:

- **Description**: A clear description of the vulnerability
- **Impact**: What an attacker could potentially do
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Affected Components**: Which parts of the system are affected
- **Suggested Fix**: If you have ideas on how to fix it (optional)

### 4. Response Timeline

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Initial Assessment**: We will provide an initial assessment within 5 business days
- **Resolution Target**: We aim to resolve critical vulnerabilities within 30 days

## Security Measures

### Authentication & Authorization

- All user authentication is handled through secure, industry-standard protocols
- Role-based access control (RBAC) for admin functionality
- Session management with secure token handling

### Data Protection

- All data transmitted over HTTPS/TLS
- Sensitive data encrypted at rest
- Row Level Security (RLS) policies on all user data tables
- API key and credential sanitization in logs

### Infrastructure Security

- Webhook endpoints protected with token validation
- Rate limiting on all API endpoints
- Input validation and sanitization on all user inputs
- JSONB size constraints to prevent DoS attacks

### Monitoring & Logging

- Audit logging for security-relevant actions
- Error tracking with sanitized output
- Real-time monitoring for suspicious activity

## Scope

The following are in scope for security reports:

- Authentication bypasses
- Authorization flaws (accessing other users' data)
- SQL injection
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Remote code execution
- Sensitive data exposure
- Insecure direct object references

### Out of Scope

- Social engineering attacks
- Physical attacks on infrastructure
- Issues in third-party dependencies (please report these directly to the maintainers)
- Issues requiring physical access to a user's device
- Self-XSS attacks

## Recognition

We appreciate security researchers who help keep our platform safe. With your permission, we will acknowledge your contribution in our security advisories.

## Updates to This Policy

We may update this security policy from time to time. Changes will be reflected on this page with an updated revision date.

---

**Last Updated**: December 2024
