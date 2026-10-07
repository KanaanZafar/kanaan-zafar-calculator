import { defineConfig } from 'vite';

// GitHub Pages serves the site from /kanaan-zafar-calculator/, so only production builds use
// that base path. The dev server and Vitest keep the default '/'.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/kanaan-zafar-calculator/' : '/',
}));
