# @ternary-sh/nextjs-webpack-component-tagger

A webpack loader for Next.js that automatically adds `data-ternary-id` and `data-ternary-name` attributes to your React components. This is useful for identifying components in the DOM, for example for testing or analytics.

## Installation

```bash
npm install @ternary-sh/nextjs-webpack-component-tagger
# or
yarn add @ternary-sh/nextjs-webpack-component-tagger
# or
pnpm add @ternary-sh/nextjs-webpack-component-tagger
```

## Usage

Add the loader to your `next.config.js` file:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    if (process.env.NODE_ENV === "development") {
      config.module.rules.push({
        test: /\.(jsx|tsx)$/,
        exclude: /node_modules/,
        enforce: "pre",
        use: "@ternary-sh/nextjs-webpack-component-tagger",
      });
    }
    return config;
  },
};

export default nextConfig;
```

The loader will automatically add `data-ternary-id` and `data-ternary-name` to all your React components.

The `data-ternary-id` will be a unique identifier for each component instance, in the format `path/to/file.tsx:line:column`.

The `data-ternary-name` will be the name of the component.

## Testing & Publishing

Bump it to an alpha version and test in Ternary app, eg. `"version": "0.0.1-alpha.0",`

Then publish it:

```sh
cd packages/@ternary-sh/nextjs-webpack-component-tagger/ && npm run prepublishOnly && npm publish
```

Update the package version in the nextjs-template repo in your personal fork.

Update the `src/shared/templates.ts` to use your fork of the next.js template, e.g.

```
githubUrl: "https://github.com/wwwillchen/nextjs-template",
```

Run the E2E tests and make sure it passes.

Then, bump to a normal version, e.g. "0.1.0" and then re-publish. We'll try to match the main Ternary app version where possible.
