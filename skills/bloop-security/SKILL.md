# Bloop Security Skill

Security vulnerability scanning and secure coding recommendations.

## Description

This skill performs comprehensive security analysis on code, identifying vulnerabilities, insecure patterns, and providing remediation guidance.

## Capabilities

- **Vulnerability Detection**: Identify OWASP Top 10 vulnerabilities
- **Dependency Audit**: Check for vulnerable dependencies
- **Secure Coding Tips**: Provide security best practices
- **Secret Detection**: Find hardcoded secrets and credentials
- **Input Validation**: Check for proper input sanitization

## Usage

```
/security <file_path>
/security --code "<code>" --check secrets
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | No | Path to the file to scan |
| code | string | No | Code snippet to analyze |
| check | string[] | No | Specific checks: xss, sqli, secrets, deps |
| severity_threshold | string | No | Minimum severity: low, medium, high, critical |

## Output

Returns:
- Security score (0-100)
- List of vulnerabilities with CVSS scores
- Remediation suggestions
- Secure code examples

## Vulnerability Categories

### Injection
- SQL Injection
- Command Injection
- XSS (Cross-Site Scripting)
- LDAP Injection

### Authentication
- Weak passwords
- Missing authentication
- Session management issues

### Data Exposure
- Hardcoded secrets
- Sensitive data logging
- Insecure storage

### Configuration
- Security headers
- CORS misconfiguration
- Debug mode in production

## Examples

### Full security scan
```
/security src/api/auth.ts
```

### Check for secrets only
```
/security --file_path .env --check secrets
```

## Compliance

Supports checking against:
- OWASP Top 10
- CWE/SANS Top 25
- PCI DSS requirements
- GDPR data protection
