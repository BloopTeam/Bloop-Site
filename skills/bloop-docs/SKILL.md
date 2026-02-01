# Bloop Documentation Generator Skill

Auto-generate documentation from code.

## Description

This skill analyzes code structure and generates comprehensive documentation including API references, usage examples, and type documentation.

## Capabilities

- **API Reference**: Generate API documentation from code
- **Usage Examples**: Create practical code examples
- **Type Documentation**: Document TypeScript/Flow types and interfaces
- **JSDoc/TSDoc**: Generate inline documentation comments
- **README Generation**: Create project README files

## Usage

```
/docs <file_path>
/docs --code "<code>" --format markdown
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | No | Path to the file to document |
| code | string | No | Code snippet to document |
| format | string | No | Output format: markdown, html, jsdoc |
| style | string | No | Documentation style: technical, friendly, minimal |
| include_examples | boolean | No | Include usage examples (default: true) |

## Output

Returns:
- Overview/description
- API reference with all exports
- Usage guide
- Code examples
- Type definitions

## Examples

### Document a file
```
/docs src/services/api.ts
```

### Generate JSDoc comments
```
/docs --code "function processData(input) { ... }" --format jsdoc
```

## Output Formats

- **Markdown**: GitHub-flavored markdown
- **HTML**: Styled HTML documentation
- **JSDoc/TSDoc**: Inline documentation comments
- **JSON**: Structured documentation data
