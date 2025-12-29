# Import File Extension Support

## Problem

Native Node.js TypeScript support (e.g., `--experimental-strip-types` in Node 22+) requires imports to include the `.ts` extension explicitly:

```typescript
// Required for native TS support
import { users } from './schema.ts'

// Won't work with native TS support
import { users } from './schema'
```

Currently, the generator produces imports without extensions (or with `.js` via `moduleResolution = "nodenext"`), breaking compatibility with native TS setups.

## Solution

Replace the `moduleResolution` option with a clearer `importFileExtension` option.

### Configuration

```prisma
generator drizzle {
  provider            = "prisma-generator-drizzle"
  importFileExtension = "ts"  // "none" (default) | "js" | "ts"
}
```

| Value | Output | Use Case |
|-------|--------|----------|
| `"none"` (default) | `import { users } from './schema'` | Bundlers (Vite, webpack, esbuild) |
| `"js"` | `import { users } from './schema.js'` | ESM with Node.js (nodenext/node16 in tsconfig) |
| `"ts"` | `import { users } from './schema.ts'` | Native Node.js TypeScript support |

### Breaking Change

The `moduleResolution` option is removed entirely. Users migrating from `moduleResolution = "nodenext"` should use `importFileExtension = "js"`.

## Implementation

### Files to Modify

| File | Changes |
|------|---------|
| `packages/generator/src/lib/config.ts` | Replace `moduleResolution` with `importFileExtension` in Valibot schema |
| `packages/generator/src/shared/generator-context/module-resolution.ts` | **Delete** - auto-detection from tsconfig.json no longer needed |
| `packages/generator/src/shared/generator-context/index.ts` | Replace `moduleResolution` with `importFileExtension`, remove auto-detection fallback, rename getter to `getImportFileExtension()` |
| `packages/generator/src/lib/syntaxes/imports.ts` | Update `renderImportPath()` to handle `"none"` / `"js"` / `"ts"` values |
| `README.md` | Update configuration table, remove "Gotchas" section about module resolution |
| `packages/generator/README.md` | Same documentation updates |

### New Test File

`packages/usage/tests/import-file-extension.test.ts`

Tests:
1. Default (`"none"`) - imports have no extension
2. `importFileExtension = "js"` - imports end with `.js`
3. `importFileExtension = "ts"` - imports end with `.ts`
4. Package imports (e.g., `drizzle-orm`) remain unchanged regardless of setting

### Implementation Details

Update `renderImportPath` in `imports.ts`:

```typescript
function renderImportPath(path: string) {
  const ext = getImportFileExtension()
  if (ext === 'none' || !path.startsWith('.')) {
    return path
  }
  return `${path}.${ext}`
}
```

The default value is `"none"` to maintain backward compatibility for users who didn't have `moduleResolution` set.
