import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

function getDefaultPaths(): SystemPaths {
  const isWin = process.platform === 'win32';
  const homeDir = process.env.USERPROFILE || process.env.HOME || 'C:\\Users\\marrano';

  return {
    rutaPendientes: path.join(process.cwd(), 'doc_pendientes'),
    rutaProcesados: path.join(process.cwd(), 'doc_procesados'),
    rutaSubirComidor: path.join(homeDir, 'Desktop', 'SubirComidor'),
    rutaDocumentosComidor: path.join(homeDir, 'Desktop', 'DocumentosComidor'),
  };
}

function getSavedPaths(): SystemPaths {
  const defaults = getDefaultPaths();
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const data = JSON.parse(content);
      return {
        rutaPendientes: data.rutaPendientes || defaults.rutaPendientes,
        rutaProcesados: data.rutaProcesados || defaults.rutaProcesados,
        rutaSubirComidor: data.rutaSubirComidor || defaults.rutaSubirComidor,
        rutaDocumentosComidor: data.rutaDocumentosComidor || defaults.rutaDocumentosComidor,
      };
    } catch (e) {
      console.error('Error reading config_rutas.json:', e);
    }
  }
  return defaults;
}

export async function GET() {
  try {
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
      rutaPendientes: rutaPendientes.trim(),
      rutaProcesados: rutaProcesados.trim(),
      rutaSubirComidor: rutaSubirComidor.trim(),
      rutaDocumentosComidor: rutaDocumentosComidor.trim(),
    };

    // 1. Guardar en config_rutas.json
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newPaths, null, 2), 'utf-8');

    // 2. Asegurar que las carpetas existan en disco
    Object.values(newPaths).forEach((dirPath) => {
      try {
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
      } catch (e) {
        console.warn(`No se pudo crear carpeta ${dirPath}:`, e);
      }
    });

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
      message: 'Rutas configuradas correctamente y sincronizadas con el Robot de Comidor',
      paths: newPaths,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
