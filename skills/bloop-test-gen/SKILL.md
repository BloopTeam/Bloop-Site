# Bloop Test Generator Skill

Generate comprehensive test suites for code.

## Description

This skill automatically generates test cases for functions, classes, and modules. It creates unit tests, integration tests, and identifies edge cases to maximize code coverage.

## Capabilities

- **Unit Tests**: Generate individual function/method tests
- **Integration Tests**: Create tests for component interactions
- **Edge Cases**: Identify and test boundary conditions
- **Coverage Optimization**: Maximize code coverage with minimal tests
- **Framework Support**: Jest, Vitest, Mocha, pytest, RSpec, and more

## Usage

```
/test <file_path>
/test --function "calculateTotal" --language typescript
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | No | Path to the file to test |
| code | string | No | Code snippet to generate tests for |
| function_name | string | No | Specific function to test |
| language | string | No | Programming language |
| framework | string | No | Test framework (jest, vitest, pytest, etc.) |
| coverage_target | number | No | Target coverage percentage (default: 80) |

## Output

Returns:
- Test file content with all test cases
- Setup/teardown code if needed
- Mock definitions for dependencies
- Coverage estimate

## Examples

### Generate tests for a file
```
/test src/utils/validation.ts
```

### Generate tests with specific framework
```
/test --code "function add(a, b) { return a + b; }" --framework jest
```

## Supported Frameworks

- **JavaScript/TypeScript**: Jest, Vitest, Mocha, Jasmine
- **Python**: pytest, unittest
- **Ruby**: RSpec, Minitest
- **Go**: testing package
- **Rust**: cargo test
