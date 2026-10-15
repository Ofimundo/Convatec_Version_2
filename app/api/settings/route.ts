import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import os from 'os';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const CONFIG_FILE = path.join(process.cwd(), 'config_rutas.json');
const PROPS_FILE = path.join(process.cwd(), 'Comidor', 'Processwatchandrun', 'application.properties');

export interface SystemPaths {
  rutaPendientes: string;
  rutaProcesados: string;
  rutaSubirComidor: string;
  rutaDocumentosComidor: string;
}

export function expandEnvVars(str: string): string {
  if (!str) return '';
  return str.replace(/%([^%]+)%/g, (_, n) => process.env[n] || _);
}

export function getDefaultPaths(): SystemPaths {
  const homeDir = process.env.USERPROFILE || process.env.HOME || os.homedir();
  const convatecDir = path.join(homeDir, 'Desktop', 'Convatec');

  return {
    rutaPendientes: path.join(convatecDir, 'Pendientes'),
    rutaProcesados: path.join(convatecDir, 'Procesados'),
    rutaSubirComidor: path.join(convatecDir, 'SubirComidor'),
    rutaDocumentosComidor: path.join(convatecDir, 'DocumentosComidor'),
  };
}

export function ensureDirectoriesExist(paths: SystemPaths) {
  Object.values(paths).forEach((dirPath) => {
    try {
      const expanded = expandEnvVars(dirPath);
      if (expanded && !fs.existsSync(expanded)) {
        fs.mkdirSync(expanded, { recursive: true });
      }
    } catch (e) {
      console.warn(`No se pudo crear carpeta ${dirPath}:`, e);
    }
  });
}

function getSavedPaths(): SystemPaths {
  const defaults = getDefaultPaths();
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const data = JSON.parse(content);
      
      const loaded: SystemPaths = {
        rutaPendientes: expandEnvVars(data.rutaPendientes) || defaults.rutaPendientes,
        rutaProcesados: expandEnvVars(data.rutaProcesados) || defaults.rutaProcesados,
        rutaSubirComidor: expandEnvVars(data.rutaSubirComidor) || defaults.rutaSubirComidor,
        rutaDocumentosComidor: expandEnvVars(data.rutaDocumentosComidor) || defaults.rutaDocumentosComidor,
      };

      // Si las rutas guardadas apuntaban a un usuario que no existe en esta máquina,
      // cambiar automáticamente a las rutas de la máquina actual
      const currentHome = process.env.USERPROFILE || os.homedir();
      const needsMigration = Object.values(loaded).some(p => {
        const lower = p.toLowerCase();
        return lower.includes('c:\\users\\') && !lower.startsWith(currentHome.toLowerCase()) && !fs.existsSync(p);
      });

      const finalPaths = needsMigration ? defaults : loaded;
      ensureDirectoriesExist(finalPaths);
      return finalPaths;
    } catch (e) {
      console.error('Error reading config_rutas.json:', e);
    }
  }

  ensureDirectoriesExist(defaults);
  return defaults;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('defaults') === 'true') {
      const defaults = getDefaultPaths();
      ensureDirectoriesExist(defaults);
      return NextResponse.json({ success: true, paths: defaults });
    }

    const paths = getSavedPaths();
    return NextResponse.json({ success: true, paths });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rutaPendientes, rutaProcesados, rutaSubirComidor, rutaDocumentosComidor } = body;

    if (!rutaPendientes || !rutaProcesados || !rutaSubirComidor || !rutaDocumentosComidor) {
      return NextResponse.json({ success: false, error: 'Todas las rutas son obligatorias' }, { status: 400 });
    }

    const newPaths: SystemPaths = {
      rutaPendientes: expandEnvVars(rutaPendientes.trim()),
      rutaProcesados: expandEnvVars(rutaProcesados.trim()),
      rutaSubirComidor: expandEnvVars(rutaSubirComidor.trim()),
      rutaDocumentosComidor: expandEnvVars(rutaDocumentosComidor.trim()),
    };

    // 1. Guardar en config_rutas.json
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newPaths, null, 2), 'utf-8');

    // 2. Asegurar que las carpetas existan en disco
    ensureDirectoriesExist(newPaths);

    // 3. Actualizar Comidor/Processwatchandrun/application.properties
    if (fs.existsSync(PROPS_FILE)) {
      try {
        let propsContent = fs.readFileSync(PROPS_FILE, 'utf-8');

        // Formatear rutas para application.properties (usar barras invertidas estándar de Windows)
        const sourceFormatted = newPaths.rutaSubirComidor.replace(/\//g, '\\');
        const targetFormatted = newPaths.rutaDocumentosComidor.replace(/\//g, '\\');

        propsContent = propsContent.replace(/^sourceDir\s*=\s*.*/m, `sourceDir = ${sourceFormatted}`);
        propsContent = propsContent.replace(/^targetDir\s*=\s*.*/m, `targetDir = ${targetFormatted}`);

        fs.writeFileSync(PROPS_FILE, propsContent, 'utf-8');
      } catch (e) {
        console.error('Error updating application.properties:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Rutas configuradas correctamente y carpetas creadas en disco',
      paths: newPaths,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
