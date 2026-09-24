import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const execPromise = promisify(exec);

const STATUS_FILE = path.join(process.cwd(), 'service_status.json');
const PROCESO_FILE = path.join(process.cwd(), 'proceso.txt');
const ULTIMA_EJECUCION_FILE = path.join(process.cwd(), 'ultima_ejecucion.txt');
const PENDIENTES_DIR = path.join(process.cwd(), 'doc_pendientes');

interface ServiceStatus {
  isAutoActive: boolean;
  intervalMinutes: number;
  lastRun: string;
  lastAction: string;
  statusText: string;
}

function getServiceStatus(): ServiceStatus {
  let isAutoActive = true;
  let intervalMinutes = 5;
  let lastRun = new Date().toISOString().replace('T', ' ').substring(0, 19);
  let lastAction = 'Sistema Operativo Inicial';

  if (fs.existsSync(STATUS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
      isAutoActive = data.isAutoActive ?? true;
      intervalMinutes = data.intervalMinutes || 5;
      if (data.lastRun) lastRun = data.lastRun;
      if (data.lastAction) lastAction = data.lastAction;
    } catch (e) {
      console.error('Error reading service status file:', e);
    }
  }

  if (fs.existsSync(ULTIMA_EJECUCION_FILE)) {
    try {
      const content = fs.readFileSync(ULTIMA_EJECUCION_FILE, 'utf-8').trim();
      if (content) lastRun = content;
    } catch (e) {}
  }

  return {
    isAutoActive,
    intervalMinutes,
    lastRun,
    lastAction,
    statusText: isAutoActive ? 'AUTOMÁTICO ACTIVO 24/7 (Cada 5 min)' : 'DETENIDO (Modo Manual)'
  };
}

function saveServiceStatus(status: Partial<ServiceStatus>) {
  const current = getServiceStatus();
  const updated = { ...current, ...status };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

function countPendingPdfs(): number {
  if (!fs.existsSync(PENDIENTES_DIR)) return 0;
  try {
    const files = fs.readdirSync(PENDIENTES_DIR);
    return files.filter(f => f.toLowerCase().endsWith('.pdf')).length;
  } catch (e) {
    return 0;
  }
}

export async function GET() {
  try {
    const status = getServiceStatus();
    let isRunningNow = false;

    if (fs.existsSync(PROCESO_FILE)) {
      const val = fs.readFileSync(PROCESO_FILE, 'utf-8').trim().toUpperCase();
      isRunningNow = val === 'TRUE';
    }

    const pendingCount = countPendingPdfs();

    return NextResponse.json({
      success: true,
      isAutoActive: status.isAutoActive,
      intervalMinutes: status.intervalMinutes,
      lastRun: status.lastRun,
      statusText: status.statusText,
      isRunningNow,
      pendingCount
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function launchComidorRobot() {
  try {
    const batPath = path.join(process.cwd(), 'Comidor', 'Processwatchandrun', 'run-processwatchandrun.bat');
    const workingDir = path.join(process.cwd(), 'Comidor', 'Processwatchandrun');
    const shortcutPath = path.join(process.cwd(), 'Comidor', 'Robot carga de documentos Comidor.lnk');

    if (fs.existsSync(shortcutPath)) {
      const child = exec(`cmd.exe /c start "" "${shortcutPath}"`, { cwd: path.dirname(shortcutPath) });
      if (child.unref) child.unref();
    } else if (fs.existsSync(batPath)) {
      const child = exec(`cmd.exe /c "${batPath}"`, { cwd: workingDir });
      if (child.unref) child.unref();
    }
  } catch (e) {
    console.error('Error launching Comidor Robot:', e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (action === 'start_auto') {
      saveServiceStatus({
        isAutoActive: true,
        lastAction: 'Activación automática solicitada por usuario',
        statusText: 'AUTOMÁTICO ACTIVO 24/7 (Cada 5 min)'
      });

      return NextResponse.json({
        success: true,
        message: 'Ejecución automática 24/7 activada (Cada 5 min)',
        isAutoActive: true
      });
    }

    if (action === 'stop_auto') {
      saveServiceStatus({
        isAutoActive: false,
        lastAction: 'Detención automática solicitada por usuario',
        statusText: 'DETENIDO (Modo Manual)'
      });

      return NextResponse.json({
        success: true,
        message: 'Ejecución automática detenida. Sistema en modo manual.',
        isAutoActive: false
      });
    }

    if (action === 'run_now') {
      // Marcar proceso en ejecución
      fs.writeFileSync(PROCESO_FILE, 'TRUE', 'utf-8');
      fs.writeFileSync(ULTIMA_EJECUCION_FILE, nowStr, 'utf-8');

      // Ejecutar OCR primero; al finalizar la lectura y guardado, se ejecuta el robot Comidor
      try {
        const pythonCmd = process.platform === 'win32' ? 'python app_ocr.py --once' : 'python3 app_ocr.py --once';
        exec(pythonCmd, { cwd: process.cwd() }, (err) => {
          fs.writeFileSync(PROCESO_FILE, 'FALSE', 'utf-8');
        });
      } catch (e) {
        fs.writeFileSync(PROCESO_FILE, 'FALSE', 'utf-8');
      }

      saveServiceStatus({
        lastRun: nowStr,
        lastAction: 'Ejecución manual iniciada por usuario'
      });

      return NextResponse.json({
        success: true,
        message: 'Ejecución manual e inicio de Robot Comidor procesando en segundo plano...',
        lastRun: nowStr
      });
    }

    return NextResponse.json({ success: false, error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
