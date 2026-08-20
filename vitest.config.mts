import path from "node:path";
import { defineConfig } from "vitest/config";

// The app imports with the `@/` alias everywhere; without this, vitest resolves
// it as a package name and any test that reaches a value import of `@/…` fails
// with "Cannot find package".
//
// `.mts` rather than `.ts`: the closest package.json has no `"type": "module"`,
// so a `.ts` config is loaded as CommonJS, which Vite warns about and which
// breaks outright once `configLoader: 'native'` becomes the default. Since the
// alias is the only thing making `@/…` resolve, that failure would take the
// whole suite with it rather than one test.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
    },
  },
});
