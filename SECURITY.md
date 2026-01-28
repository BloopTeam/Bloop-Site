# Security Policy

## Supported Versions

We actively support security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### 1. **DO NOT** create a public GitHub issue
   - Security vulnerabilities should be reported privately

### 2. Email us directly
   - **Email**: bloopcode@proton.me
   - **Subject**: `[SECURITY] Brief description of the vulnerability`

### 3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
   - Your contact information

### 4. Response Timeline
   - **Initial Response**: Within 48 hours
   - **Status Update**: Within 7 days
   - **Resolution**: Depends on severity

## Security Measures

Bloop UI implements multiple layers of security:

### Input Sanitization
- All user inputs are sanitized before processing
- HTML/XSS prevention through content sanitization
- Path traversal protection for file operations
- Command injection prevention for terminal operations

### Content Security Policy (CSP)
- Strict CSP headers enforced
- Inline script restrictions
- Resource loading controls
- XSS attack mitigation

### Secure Storage
- Encrypted local storage wrapper
- Secure key generation using crypto API
- Namespaced storage keys
- Automatic cleanup on errors

### Rate Limiting
- Built-in rate limiting for API calls
- Action cooldowns to prevent abuse
- Brute force protection

### Code Security
- TypeScript strict mode enabled
- No `eval()` or `Function()` constructors
- Safe JSON parsing with prototype pollution prevention
- URL validation with protocol restrictions

## Security Best Practices

When contributing to Bloop UI:

1. **Never commit secrets** - Use environment variables
2. **Sanitize all inputs** - Use security utilities from `src/utils/security.ts`
3. **Validate file paths** - Use `sanitizePath()` before file operations
4. **Avoid innerHTML** - Use React's built-in XSS protection
5. **Check dependencies** - Keep dependencies up to date
6. **Review PRs carefully** - Look for security implications

## Known Security Considerations

### Client-Side Application
Bloop UI is a client-side application. Security measures focus on:
- Preventing XSS attacks
- Input validation and sanitization
- Secure data storage
- Safe file operations

### Third-Party Dependencies
We regularly audit dependencies for known vulnerabilities:
- Run `npm audit` before releases
- Update dependencies promptly
- Monitor security advisories

### Browser Security
- Modern browsers provide additional security layers
- CSP headers enhance browser security
- HTTPS required for production deployments

## Security Updates

Security updates are released as:
- **Patch versions** (0.2.1, 0.2.2) for critical fixes
- **Minor versions** (0.3.0) for security enhancements
- **Major versions** (1.0.0) for breaking security changes

## Acknowledgments

We appreciate responsible disclosure. Security researchers who report vulnerabilities will be:
- Credited in release notes (if desired)
- Listed in SECURITY.md (if desired)
- Thanked for their contribution

Thank you for helping keep Bloop UI secure!
