# Bloop Refactoring Skill

Intelligent code refactoring suggestions and implementations.

## Description

This skill analyzes code for refactoring opportunities and provides automated transformations to improve code quality, readability, and maintainability.

## Capabilities

- **Extract Function**: Identify and extract reusable code blocks
- **Rename Symbol**: Safely rename variables, functions, classes
- **Simplify Logic**: Reduce complexity and improve readability
- **Remove Duplication**: Identify and consolidate duplicate code
- **Pattern Application**: Apply design patterns where appropriate

## Usage

```
/refactor <file_path>
/refactor --code "<code>" --suggestion "extract function"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | No | Path to the file to refactor |
| code | string | No | Code snippet to refactor |
| suggestion | string | No | Specific refactoring to apply |
| preserve_behavior | boolean | No | Ensure identical behavior (default: true) |
| aggressive | boolean | No | Apply more transformations (default: false) |

## Output

Returns:
- Refactored code
- List of changes made
- Before/after diff
- Risk assessment

## Refactoring Types

### Extract Function
Identifies code blocks that can be extracted into reusable functions.

### Inline Variable
Removes unnecessary variable assignments.

### Rename Symbol
Safely renames identifiers across the codebase.

### Simplify Conditionals
Converts complex if/else chains to cleaner alternatives.

### Remove Dead Code
Identifies and removes unreachable code.

## Examples

### Refactor a file
```
/refactor src/utils/helpers.ts
```

### Apply specific refactoring
```
/refactor --code "if (x) { return true; } else { return false; }" --suggestion simplify
```
