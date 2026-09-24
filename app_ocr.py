import os
import sys
import time
import json
import shutil
import gc
import fitz
import unidecode
import base64
import schedule
import subprocess
import xml.etree.ElementTree as ET
from datetime import datetime
from PIL import Image, ImageDraw
from io import BytesIO
from google.cloud import documentai
from google.protobuf.json_format import MessageToDict
from google.api_core.client_options import ClientOptions
from werkzeug.utils import secure_filename
from PyPDF2 import PdfReader, PdfWriter
from dotenv import load_dotenv

load_dotenv()

# ==================== CONFIGURACIÓN ====================
RUTA_DESTINO = os.getenv("RUTA_DESTINO", r"C:\Users\CVT_Admin\Desktop\SubirComidor")
INTERVALO_MINUTOS = 5
MAX_REINTENTOS = 3
TIMEOUT_PROCESO = 1800  # 30 minutos timeout para procesos colgados
ARCHIVO_PROCESO = os.path.join(os.getcwd(), "proceso.txt")

# ==================== FUNCIONES DE LOGGING ====================

def registro_log(proceso: str, dato: str) -> None:
    try:
        log_dir = os.path.join(os.getcwd(), "log")
        os.makedirs(log_dir, exist_ok=True)
        with open(os.path.join(log_dir, "ejecucion_log.txt"), 'a', encoding='utf-8') as file:
            fecha_hora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            file.write(f"{fecha_hora} - {proceso} - {dato}\n")
    except Exception as e:
        print(f"Error al escribir log: {e}")

# ==================== FUNCIONES DE XML ====================

def buscar_datos_xml(lista: list, tipo: str) -> str:
    if not lista:
        return ""
    for diccionario in lista:
        if 'properties' in diccionario:
            for propiedades in diccionario['properties']:
                if propiedades.get('type') == tipo:
                    return propiedades.get('mentionText', "")
    return ""

def generar_xml(datos, paginas, ruta, nombre_documento, firmado) -> str:
    try:
        raiz = ET.Element("data")
        
        # Obtener tipo de documento - solo FAC o GD, si no se detecta va vacío
        tipo_doc_text = buscar_datos_xml(datos, 'tipo_folio')
        if tipo_doc_text:
            if "FACTURA" in tipo_doc_text.upper():
                tipo_doc_text = "FAC"
            elif "GUIA" in tipo_doc_text.upper() or "DESPACHO" in tipo_doc_text.upper():
                tipo_doc_text = "GD"
            else:
                tipo_doc_text = ""  # Vacío si no es FAC ni GD
        else:
            tipo_doc_text = ""  # Vacío si no hay dato
        
        rut_emisor_text = buscar_datos_xml(datos, 'rut_emp')
        rut_destino_text = buscar_datos_xml(datos, 'rut_dest')
        folio_text = buscar_datos_xml(datos, 'id_folio')
        orden_compra_text = buscar_datos_xml(datos, 'orden_compra_detalle')
        total_text = buscar_datos_xml(datos, 'valor_total')
        fecha_doc_text = buscar_datos_xml(datos, 'fecha_emision_folio')
        
        if total_text:
            total_text = total_text.replace(".", "")
        if not folio_text:
            folio_text = nombre_documento
        
        tipo_doc = ET.SubElement(raiz, "tipo_doc")
        tipo_doc.text = tipo_doc_text
        rut_emisor = ET.SubElement(raiz, "rut_emisor")
        rut_emisor.text = rut_emisor_text or ""
        rut_destino = ET.SubElement(raiz, "rut_destino")
        rut_destino.text = rut_destino_text or ""
        folio_elem = ET.SubElement(raiz, "folio")
        folio_elem.text = folio_text
        orden_compra = ET.SubElement(raiz, "orden_compra")
        orden_compra.text = orden_compra_text or ""
        total_elem = ET.SubElement(raiz, "total")
        total_elem.text = total_text or ""
        fecha_doc = ET.SubElement(raiz, "fecha_doc")
        fecha_doc.text = fecha_doc_text or ""
        
        os.makedirs(ruta, exist_ok=True)
        ruta_completa = os.path.join(ruta, f"{nombre_documento}.xml")
        ET.ElementTree(raiz).write(ruta_completa, encoding="utf-8", xml_declaration=True)
        
        rut_receptor = rut_destino_text or "RUT DESCONOCIDO"
        fecha_emision = fecha_doc_text or f'{datetime.now().day}/{datetime.now().month}/{datetime.now().year}'
        
        return f'{tipo_doc_text}|{fecha_emision}|{nombre_documento}.xml|{ruta_completa}|{rut_receptor}'
    except Exception as e:
        print(f"Error generando XML: {e}")
        return f'ERROR|{datetime.now()}|{nombre_documento}.xml|{ruta}|RUT_ERROR'
# ==================== FUNCIONES DE PROCESAMIENTO ====================

def transformar_pdf_a_imagen(ruta_pdf: str, numero_pagina: int) -> str:
    doc = fitz.open(ruta_pdf)
    pagina = doc[numero_pagina - 1] if numero_pagina > 0 else doc[0]
    imagen = pagina.get_pixmap()
    path_imagen = ruta_pdf.replace(".PDF", '.png').replace(".pdf", '.png')
    imagen.save(path_imagen)
    doc.close()
    return path_imagen

def buscar_datos_ocr(lista: list, tipo: str) -> str:
    for diccionario in lista:
        for propiedades in diccionario.get('properties', []):
            if propiedades.get('type') == tipo:
                return propiedades.get('mentionText', '')
    return ''

def imagen_a_b64(data) -> str:
    documento_base_64 = data['pages'][0]['image']['content']
    png_bytes = base64.b64decode(documento_base_64)
    imagen = Image.open(BytesIO(png_bytes))
    width = data['pages'][0]['image']['width']
    height = data['pages'][0]['image']['height']
    
    for entitie in data.get('entities', []):
        for propertie in entitie.get('properties', []):
            try:
                coordinates = propertie['pageAnchor']['pageRefs'][0]['boundingPoly']['normalizedVertices']
                confidence = propertie.get('confidence', 0)
                vertices = ()
                for coordinate in coordinates:
                    vertices += (coordinate['x'], coordinate['y'])
                coordinates_rectangle = [(vertices[i] * width, vertices[i + 1] * height) for i in range(0, len(vertices), 2)]
                draw = ImageDraw.Draw(imagen)
                if confidence > 0.8:
                    draw.polygon(coordinates_rectangle, outline="green", width=2)
                elif confidence > 0.5:
                    draw.polygon(coordinates_rectangle, outline="orange", width=2)
                else:
                    draw.polygon(coordinates_rectangle, outline="red", width=2)
            except Exception:
                pass
    
    buffer = BytesIO()
    imagen.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")

def obtener_prefijo_por_tipo(tipo_documento: str) -> str:
    tipo_upper = tipo_documento.upper() if tipo_documento else ""
    if "FAC" in tipo_upper:
        return "FAC"
    elif "GD" in tipo_upper:
        return "GD"
    elif "FACTURA" in tipo_upper:
        return "FAC"
    elif "GUIA" in tipo_upper or "DESPACHO" in tipo_upper:
        return "GD"
    else:
        return "DOC"

def cargar_configuracion_rutas():
    config_file = os.path.join(os.getcwd(), "config_rutas.json")
    if os.path.exists(config_file):
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error cargando config_rutas.json: {e}")
    return {}

def obtener_rutas_salida_comidor() -> tuple:
    config = cargar_configuracion_rutas()
    ruta_subir = config.get("rutaSubirComidor") or r"C:\Users\marrano\Desktop\Convatec\SubirComidor"
    ruta_doc = config.get("rutaDocumentosComidor") or r"C:\Users\marrano\Desktop\Convatec\DocumentosComidor"
    
    try:
        os.makedirs(ruta_subir, exist_ok=True)
        os.makedirs(ruta_doc, exist_ok=True)
    except Exception:
        pass
    return (ruta_subir, ruta_doc)

def enviar_a_destino_final(origen_pdf: str, origen_xml: str, folio: str, tipo_documento: str) -> None:
    try:
        ruta_subir, ruta_doc = obtener_rutas_salida_comidor()
        prefijo = obtener_prefijo_por_tipo(tipo_documento)
        nombre_con_prefijo = f"{prefijo}_{folio}"
        
        # Colocar únicamente en SubirComidor para que el Robot Comidor lo tome, lo suba y lo mueva a DocumentosComidor
        if os.path.exists(origen_pdf):
            shutil.copy2(origen_pdf, os.path.join(ruta_subir, f"{nombre_con_prefijo}.pdf"))
        if os.path.exists(origen_xml):
            shutil.copy2(origen_xml, os.path.join(ruta_subir, f"{nombre_con_prefijo}.xml"))
            
        registro_log("enviar_a_destino", f"Archivos {nombre_con_prefijo} colocados en SubirComidor ({ruta_subir})")
    except Exception as e:
        registro_log("enviar_a_destino", f"Error enviando a destino final: {e}")

def limpiar_carpeta_procesados(ruta_procesados: str) -> None:
    try:
        if not os.path.exists(ruta_procesados):
            return
        for elemento in os.listdir(ruta_procesados):
            ruta_elemento = os.path.join(ruta_procesados, elemento)
            if os.path.isfile(ruta_elemento) and elemento.endswith(('.png', '.jpg', '.jpeg', '.tmp')):
                os.remove(ruta_elemento)
    except Exception as e:
        registro_log("limpieza_procesados", f"Error: {e}")

# ==================== FUNCIÓN PRINCIPAL DE OCR ====================

def analisis_ocr(file_path: str, numero_pagina: int, ruta: str, nombre_archivo: str, arreglo_procesados: list, pdf_original_path: str = None):
    try:
        ruta_proyecto = os.getcwd()
        ruta_imagen_pdf = transformar_pdf_a_imagen(file_path, numero_pagina)
        
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = os.path.join(ruta_proyecto, "credentials.json")
        
        project_id = os.getenv("OCR_PROJECT_ID")
        processor_id = os.getenv("OCR_PROCESSOR_ID")
        mime_type = os.getenv("OCR_MIME_TYPE")
        location = os.getenv("OCR_LOCATION")
        
        opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
        client = documentai.DocumentProcessorServiceClient(client_options=opts)
        name = client.processor_path(project_id, location, processor_id)
        
        with open(file_path, "rb") as image:
            image_content = image.read()
        
        raw_document = documentai.RawDocument(content=image_content, mime_type=mime_type)
        request = documentai.ProcessRequest(name=name, raw_document=raw_document)
        result = client.process_document(request=request)
        formato = MessageToDict(result.document._pb)
        
        folio = buscar_datos_ocr(formato.get('entities', []), 'id_folio')
        if not folio:
            folio = f"SIN_FOLIO_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        registro_log("analisis_ocr", f"Folio extraído: {folio}")
        
        texto_upper = unidecode.unidecode(formato.get('text', '').upper())
        if any(tipo in texto_upper for tipo in ['FACTURA ELECTRONICA', 'FACTURA', 'GUIA DE DESPACHO']):
            nombre_documento = folio
        else:
            nombre_documento = 'OTROS'
        
        # Guardar JSON
        nombre_json = f'{folio}.json'
        directorio_jsons = os.path.join(ruta_proyecto, "jsons")
        os.makedirs(directorio_jsons, exist_ok=True)
        ruta_json = os.path.join(directorio_jsons, nombre_json)
        
        datos_json = {
            "nombre_original": nombre_archivo,
            "folio": folio,
            "fecha_procesamiento": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "entities": formato.get('entities', [])
        }
        
        with open(ruta_json, 'w', encoding='utf-8') as f:
            json.dump(datos_json, f, ensure_ascii=False, indent=2)
        
        # Preparar carpetas
        doc_procesados_path = os.path.join(ruta_proyecto, "doc_procesados")
        os.makedirs(doc_procesados_path, exist_ok=True)
        carpeta_folio = os.path.join(doc_procesados_path, folio)
        os.makedirs(carpeta_folio, exist_ok=True)
        
        # Determinar PDF origen
        if pdf_original_path and os.path.exists(pdf_original_path):
            pdf_origen = pdf_original_path
        elif os.path.exists(file_path):
            pdf_origen = file_path
        else:
            pdf_origen = None
        
        # Generar XML en la misma carpeta del folio
        registro_resultado = generar_xml(formato.get('entities', []), numero_pagina, carpeta_folio, nombre_documento, '')
        
        if registro_resultado and '|' in registro_resultado:
            partes = registro_resultado.split('|')
            tipo_documento = partes[0]
            nombre_xml = partes[2]
            ruta_xml = partes[3]
            
            prefijo = obtener_prefijo_por_tipo(tipo_documento)
            nombre_con_prefijo = f"{prefijo}_{folio}"
            
            # Renombrar PDF
            if pdf_origen:
                pdf_destino = os.path.join(carpeta_folio, f"{nombre_con_prefijo}.pdf")
                shutil.copy2(pdf_origen, pdf_destino)
            
            # Renombrar XML
            xml_original = os.path.join(carpeta_folio, f"{nombre_documento}.xml")
            xml_con_prefijo = os.path.join(carpeta_folio, f"{nombre_con_prefijo}.xml")
            if os.path.exists(xml_original):
                if os.path.exists(xml_con_prefijo):
                    try:
                        os.remove(xml_con_prefijo)
                    except Exception:
                        pass
                try:
                    os.replace(xml_original, xml_con_prefijo)
                except Exception:
                    shutil.move(xml_original, xml_con_prefijo)
                ruta_xml = xml_con_prefijo
            elif os.path.exists(xml_con_prefijo):
                ruta_xml = xml_con_prefijo
            
            # Enviar a destino final
            if pdf_origen and os.path.exists(pdf_origen) and os.path.exists(ruta_xml):
                enviar_a_destino_final(pdf_origen, ruta_xml, folio, tipo_documento)
            
            # Limpiar temporales
            try:
                if os.path.exists(ruta_imagen_pdf):
                    os.remove(ruta_imagen_pdf)
            except:
                pass
            
            arreglo_procesados.append({'folio': folio, 'tipo': tipo_documento})
        
        return None
    except Exception as e:
        registro_log("analisis_ocr", f"Error: {e}")
        return e

# ==================== FUNCIONES DE MANEJO DE DOCUMENTOS ====================

def separar_documentos(documento) -> list:
    with open(documento, "rb") as f:
        documento_pdf = PdfReader(f)
        documentos_salida = []
        for numero, pagina in enumerate(documento_pdf.pages, 1):
            salida = PdfWriter()
            salida.add_page(pagina)
            documento_salida = f"{documento[:-4]}_{numero}.pdf"
            with open(documento_salida, "wb") as output_stream:
                salida.write(output_stream)
            documentos_salida.append(documento_salida)
    return documentos_salida

def analizar_documento(documento, ruta, archivo, arreglo_procesados, pdf_original_temp):
    listado_documentos = separar_documentos(documento)
    for numero_pagina, doc in enumerate(listado_documentos, 1):
        analisis_ocr(doc, numero_pagina, ruta, archivo, arreglo_procesados, pdf_original_temp)
    time.sleep(1)
    carpeta_temp = os.path.dirname(documento)
    if carpeta_temp and carpeta_temp != os.getcwd() and "temp_procesamiento" in carpeta_temp:
        try:
            shutil.rmtree(carpeta_temp)
        except:
            pass

def cargar_documento(archivo) -> tuple:
    if isinstance(archivo, str):
        nombre_archivo = os.path.basename(archivo)
    elif hasattr(archivo, 'filename'):
        nombre_archivo = archivo.filename
    else:
        nombre_archivo = str(getattr(archivo, 'name', ''))
        nombre_archivo = nombre_archivo.replace('\\', '/')
        nombre_archivo = nombre_archivo.split('/')[-1] if '/' in nombre_archivo else nombre_archivo
    
    if archivo and nombre_archivo.lower().endswith('.pdf'):
        nombre_archivo_seguro = secure_filename(nombre_archivo)
        if not nombre_archivo_seguro:
            nombre_archivo_seguro = nombre_archivo
        carpeta_temp = os.path.join(os.getcwd(), "temp_procesamiento")
        os.makedirs(carpeta_temp, exist_ok=True)
        nombre_base = os.path.splitext(nombre_archivo_seguro)[0]
        ruta_archivo_proc = os.path.join(carpeta_temp, nombre_archivo_seguro)
        if isinstance(archivo, str):
            shutil.copy2(archivo, ruta_archivo_proc)
        elif hasattr(archivo, 'read'):
            with open(ruta_archivo_proc, 'wb') as nuevo_archivo:
                nuevo_archivo.write(archivo.read())
        else:
            shutil.copy2(archivo, ruta_archivo_proc)
        return (ruta_archivo_proc, carpeta_temp, nombre_base)
    return (None, None, None)

def procesar_documentos_pendientes(ruta_local) -> None:
    if not os.path.exists(ruta_local):
        registro_log("procesar_documentos_pendientes", f"La ruta no existe: {ruta_local}")
        return
    
    archivos_pdf = [f for f in os.listdir(ruta_local) if f.lower().endswith('.pdf')]
    if len(archivos_pdf) == 0:
        registro_log("procesar_documentos_pendientes", "No hay documentos PDF para procesar")
        return
    
    registro_log("procesar_documentos_pendientes", f"Total de PDFs: {len(archivos_pdf)}")
    archivos_procesados = []
    
    for idx, archivo in enumerate(archivos_pdf, 1):
        ruta_archivo = os.path.join(ruta_local, archivo)
        print(f"[{idx}/{len(archivos_pdf)}] -> Procesando: {archivo}")
        
        try:
            ruta_archivo_proc, carpeta_temp, nombre_archivo = cargar_documento(ruta_archivo)
            if ruta_archivo_proc:
                analizar_documento(ruta_archivo_proc, carpeta_temp, nombre_archivo, archivos_procesados, ruta_archivo_proc)
            
            gc.collect()
            time.sleep(0.5)

            # Eliminar de la carpeta emisora (Pendientes)
            if os.path.exists(ruta_archivo):
                try:
                    os.remove(ruta_archivo)
                    registro_log("procesar_documentos_pendientes", f"Eliminado de carpeta emisora: {archivo}")
                except Exception as rem_err:
                    time.sleep(1)
                    try:
                        os.remove(ruta_archivo)
                        registro_log("procesar_documentos_pendientes", f"Eliminado en reintento: {archivo}")
                    except Exception as rem_err2:
                        registro_log("procesar_documentos_pendientes", f"Error eliminando de carpeta emisora {archivo}: {rem_err2}")
        except Exception as e:
            registro_log("procesar_documentos_pendientes", f"Error: {e}")
            continue
        
        temp_path = os.path.join(os.getcwd(), "temp_procesamiento")
        if os.path.exists(temp_path):
            try:
                shutil.rmtree(temp_path)
            except:
                pass
    
    limpiar_carpeta_procesados(os.path.join(os.getcwd(), "doc_procesados"))
    registro_log("procesar_documentos_pendientes", f"Completado. Procesados: {len(archivos_pdf)}")

# ==================== FUNCIONES DE CONTROL ====================

def contar_pdfs_en_carpeta(ruta):
    try:
        if not os.path.exists(ruta):
            return 0
        return len([f for f in os.listdir(ruta) if f.lower().endswith('.pdf')])
    except:
        return 0

def hay_proceso_activo():
    """Verifica si hay un proceso activo, con timeout automático de 30 minutos"""
    try:
        if os.path.exists(ARCHIVO_PROCESO):
            with open(ARCHIVO_PROCESO, 'r', encoding='utf-8') as file:
                content = file.read().strip()
                if content == "TRUE":
                    # Verificar si el archivo tiene más de TIMEOUT_PROCESO segundos
                    tiempo_modificacion = os.path.getmtime(ARCHIVO_PROCESO)
                    tiempo_actual = time.time()
                    if tiempo_actual - tiempo_modificacion > TIMEOUT_PROCESO:
                        registro_log("timeout", "Proceso detectado como colgado, liberando...")
                        with open(ARCHIVO_PROCESO, 'w', encoding='utf-8') as f:
                            f.write("FALSE")
                        return False
                    return True
    except:
        pass
    return False

def obtener_todas_rutas_pendientes() -> list:
    config = cargar_configuracion_rutas()
    rutas = []
    r_config = config.get("rutaPendientes")
    if r_config:
        rutas.append(r_config)
    
    defaults = [
        os.path.join(os.getcwd(), "doc_pendientes"),
        r"C:\Users\marrano\Desktop\Convatec\Pendientes",
        r"C:\Users\marrano\Desktop\Pendientes"
    ]
    for d in defaults:
        if d not in rutas:
            rutas.append(d)
            
    validas = []
    for r in rutas:
        if os.path.exists(r):
            validas.append(r)
    return validas

def lanzar_robot_comidor():
    try:
        working_dir = os.path.join(os.getcwd(), "Comidor", "Processwatchandrun")
        javaw_exe = os.path.join(working_dir, "jre8", "bin", "javaw.exe")
        java_exe = os.path.join(working_dir, "jre8", "bin", "java.exe")
        jar_file = os.path.join(working_dir, "processwatchandrun-1.0.jar")

        exe = javaw_exe if os.path.exists(javaw_exe) else java_exe
        
        if os.path.exists(exe) and os.path.exists(jar_file):
            registro_log("robot_comidor", "Lanzando Robot Comidor de forma silenciosa en segundo plano...")
            cmd = [exe, "-jar", "processwatchandrun-1.0.jar", "Server"]
            
            # Flags para evitar cualquier consola en Windows
            CREATE_NO_WINDOW = 0x08000000
            DETACHED_PROCESS = 0x00000008
            
            subprocess.Popen(
                cmd,
                cwd=working_dir,
                creationflags=CREATE_NO_WINDOW | DETACHED_PROCESS,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            registro_log("robot_comidor", "Robot Comidor ejecutándose en segundo plano (sin ventana de consola).")
        else:
            bat_path = os.path.join(working_dir, "run-processwatchandrun.bat")
            if os.path.exists(bat_path):
                vbs_path = os.path.join(working_dir, "run_hidden.vbs")
                with open(vbs_path, "w", encoding="utf-8") as vbs:
                    vbs.write(f'CreateObject("Wscript.Shell").Run "{bat_path}", 0, False\n')
                os.system(f'wscript "{vbs_path}"')
                registro_log("robot_comidor", "Robot Comidor lanzado vía VBScript silencioso.")
            else:
                registro_log("robot_comidor", "No se encontró ejecutable ni batch para el Robot Comidor.")
    except Exception as e:
        registro_log("robot_comidor", f"Error al lanzar el Robot Comidor: {e}")

def ejecutar_proceso_completo():
    rutas_pendientes = obtener_todas_rutas_pendientes()
    
    total_pdfs = 0
    for r in rutas_pendientes:
        total_pdfs += contar_pdfs_en_carpeta(r)
        
    if total_pdfs == 0:
        return False
        
    registro_log("proceso_completo", f"Iniciando proceso - {total_pdfs} documentos")
    try:
        for r in rutas_pendientes:
            if contar_pdfs_en_carpeta(r) > 0:
                procesar_documentos_pendientes(r)
                
        registro_log("proceso_completo", "Proceso OCR completado exitosamente. Ejecutando Robot Comidor como último paso...")
        lanzar_robot_comidor()
        return True
    except Exception as e:
        registro_log("proceso_completo", f"Error: {e}")
        raise e

def ejecutar_con_reintentos():
    for intento in range(1, MAX_REINTENTOS + 1):
        if hay_proceso_activo():
            registro_log("ejecutor", "Proceso activo, esperando...")
            return False
        
        with open(ARCHIVO_PROCESO, 'w') as f:
            f.write("TRUE")
        
        try:
            resultado = ejecutar_proceso_completo()
            with open(ARCHIVO_PROCESO, 'w') as f:
                f.write("FALSE")
            if resultado:
                return True
            return False
        except Exception as e:
            with open(ARCHIVO_PROCESO, 'w') as f:
                f.write("FALSE")
            if intento < MAX_REINTENTOS:
                time.sleep(30 * intento)
    return False

def ejecucion_programada():
    if hay_proceso_activo():
        registro_log("scheduler", "Proceso activo, omitiendo")
        return
    ejecutar_con_reintentos()

# ==================== INICIO ====================

def main():
    registro_log("main", "========== PROGRAMA INICIADO ==========")

    if "--once" in sys.argv or "-o" in sys.argv:
        registro_log("main", "Ejecución única activada (--once)")
        ejecutar_con_reintentos()
        return

    registro_log("main", "Horario: 24 horas al día, 7 días a la semana")
    registro_log("main", f"Intervalo: cada {INTERVALO_MINUTOS} minutos")
    registro_log("main", f"Timeout automático: {TIMEOUT_PROCESO // 60} minutos")
    
    # Ejecutar inicial si hay documentos
    if contar_pdfs_en_carpeta("doc_pendientes") > 0 and not hay_proceso_activo():
        ejecutar_con_reintentos()
    
    schedule.every(INTERVALO_MINUTOS).minutes.do(ejecucion_programada)
    
    try:
        while True:
            schedule.run_pending()
            time.sleep(30)
    except KeyboardInterrupt:
        registro_log("main", "Programa detenido por el usuario")
    except Exception as e:
        registro_log("main", f"Error: {e}")
    finally:
        registro_log("main", "========== PROGRAMA DETENIDO ==========")

if __name__ == "__main__":
    main()
    sys.exit(0)


    
    #===== INSTRUCCIONES ====================
# para empezar: pip install pyinstaller schedule
# compilamos: pyinstaller --onefile --noconsole --name "Convatec" app_ocr.py
# verificamos que se creo la carpeta: dir
# vamos a la carpeta creada: cd dist
# ejecutamos: .\Convatec.exe
# para ver si esta corriendo correctamente: type log\ejecucion_log.txt

# ⏰ Horario de ejecución:
# las 24 horas del dia
# los 7 dias de la semana 
# cada 5 minutos 