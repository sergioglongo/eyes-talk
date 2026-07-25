import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))

// Única fuente de verdad de la versión: el campo "version" de package.json.
// Se lee acá (lado Node) y se inyecta como constante, así el bundle no necesita
// importar package.json entero.
const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
) as { version: string }

const localDate = (d: Date) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')

// Fecha del último commit, no la del build: es la fecha real del cambio que se
// está publicando. Nunca hay que actualizarla a mano.
const resolveBuildDate = (): string => {
  try {
    const out = execSync('git log -1 --format=%cd --date=short', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()

    if (/^\d{4}-\d{2}-\d{2}$/.test(out)) return out
  } catch {
    // git no disponible, o repo sin commits (build desde un tarball, o un CI que
    // clona sin historial). Se cae a la fecha del build para no dejar el footer
    // vacío ni romper la compilación.
  }

  return localDate(new Date())
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD_DATE__: JSON.stringify(resolveBuildDate()),
  },
  server: {
    port: 4010,
  }
})
