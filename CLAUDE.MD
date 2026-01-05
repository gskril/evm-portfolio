# Claude Agent Instructions

This file contains specific instructions and guidelines for Claude when working on this codebase.

## Code Health Checklist

Before completing any task, ensure the following steps are completed:

### 1. Remove Unused Imports

- Clean up any unused imports in modified files
- This keeps the codebase clean and reduces bundle size

### 2. Run Prettier

Format all code to maintain consistent style:

```bash
bunx prettier --write .
```

### 3. Run Build Commands

Verify that the code builds successfully:

```bash
bun run build:client
bun run build:server
```

Both build commands must complete without errors before the task is considered complete.

## Task Completion Criteria

A task is only complete when:

1. All requested changes have been implemented
2. Unused imports have been removed
3. Code has been formatted with Prettier
4. Both client and server builds pass successfully
5. Changes have been committed (if applicable)
