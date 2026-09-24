import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function readLastNLines(filePath: string, maxLines: number = 300): string {
  if (!fs.existsSync(filePath)) {
    return `[El archivo de log no existe en: ${filePath}]`;
  }

  try {
    const stats = fs.statSync(filePath);
    // Si el archivo es pequeño, leerlo entero
    if (stats.size < 500 * 1024) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      return lines.slice(-maxLines).join('\n');
    }

    // Para archivos grandes, leer últimos 200KB
    const bufferSize = Math.min(stats.size, 200 * 1024);
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(bufferSize);
    fs.readSync(fd, buffer, 0, bufferSize, stats.size - bufferSize);
    fs.closeSync(fd);

    const content = buffer.toString('utf-8');
    const lines = content.split('\n');
    // Descartar primera línea por posible corte a la mitad de un caracter/línea
    return lines.slice(1).slice(-maxLines).join('\n');
  } catch (error: any) {
    return `[Error leyendo el archivo de log: ${error.message}]`;
  }
}

export async function GET() {
  try {
    const ocrLogPath = path.join(process.cwd(), 'log', 'ejecucion_log.txt');
    const comidorLogPath = path.join(process.cwd(), 'Comidor', 'Processwatchandrun', 'logs', 'app.log');

    const ocrLog = readLastNLines(ocrLogPath, 300);
    const comidorLog = readLastNLines(comidorLogPath, 300);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      logs: {
        ocr: {
          path: ocrLogPath,
          content: ocrLog
        },
        comidor: {
          path: comidorLogPath,
          content: comidorLog
        }
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
