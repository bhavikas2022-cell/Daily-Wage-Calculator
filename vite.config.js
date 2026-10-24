import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// base: './' uses relative asset paths, so the same build works:
//   - on localhost (npm run dev / npm run preview)
//   - on GitHub Pages under /Daily-Wage-Calculator/
//   - when opened from any static folder
export default defineConfig({
  base: './',
  plugins: [react()],
})
