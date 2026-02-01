# Bloop Code Review Skill

AI-powered code review with security and quality analysis.

## Description

This skill analyzes code for quality issues, security vulnerabilities, performance problems, and adherence to best practices. It provides actionable suggestions for improvement.

## Capabilities

- **Syntax Analysis**: Detects syntax errors and potential bugs
- **Security Scanning**: Identifies security vulnerabilities (XSS, SQL injection, etc.)
- **Performance Hints**: Suggests performance optimizations
- **Best Practices**: Checks adherence to coding standards and patterns
- **Complexity Analysis**: Measures cyclomatic complexity and suggests simplifications

## Usage

```
/review <file_path>
/review --code "<code_snippet>" --language typescript
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | No | Path to the file to review |
| code | string | No | Code snippet to review |
| language | string | No | Programming language (auto-detected if not provided) |
| focus | string[] | No | Specific areas to focus on: security, performance, style |

## Output

Returns a structured review with:
- Overall score (0-100)
- List of issues with severity levels
- Suggestions for each issue
- Line-by-line annotations

## Examples

### Review a file
```
/review src/components/UserAuth.tsx
```

### Review code with specific focus
```
/review --code "const password = req.body.password" --language javascript --focus security
```

## Integration

This skill integrates with Bloop's code analysis engine for deep semantic understanding.
