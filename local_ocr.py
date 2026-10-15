import os
import re
import fitz
import unidecode
from datetime import datetime
from rapidocr_onnxruntime import RapidOCR

_ocr_engine = None

def get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is None:
        _ocr_engine = RapidOCR()
    return _ocr_engine

def normalize_rut(text):
    if not text:
        return ""
    text_clean = unidecode.unidecode(text.upper())
    if "TEL" in text_clean or "FONO" in text_clean or "FAX" in text_clean or "ORDEN" in text_clean:
        return ""
    
    cleaned = text.replace(',', '.').replace(':', '').replace(' ', '').upper()
    cleaned_digits = re.sub(r'[O]', '0', cleaned)
    cleaned_digits = re.sub(r'[I|L]', '1', cleaned_digits)
    
    m = re.search(r'(\d{1,2})[\.]?(\d{3})[\.]?(\d{3})[-]([\dK])', cleaned_digits)
    if m:
        num_val = int(f"{m.group(1)}{m.group(2)}{m.group(3)}")
        if num_val < 5000000:
            return ""
        return f"{m.group(1)}.{m.group(2)}.{m.group(3)}-{m.group(4)}"
    return ""

def procesar_documento_local(file_path: str, numero_pagina: int = 1) -> dict:
    doc = fitz.open(file_path)
    pagina = doc[numero_pagina - 1] if numero_pagina > 0 and len(doc) >= numero_pagina else doc[0]
    
    pix = pagina.get_pixmap(dpi=150)
    width, height = pix.width, pix.height
    img_bytes = pix.tobytes("png")
    
    native_text = pagina.get_text("text")
    lines_with_boxes = []
    
    if native_text and len(native_text.strip()) > 50:
        words = pagina.get_text("words")
        full_text = native_text
        lines_dict = {}
        for w in words:
            x0, y0, x1, y1, text_val, b_num, l_num, w_num = w
            key = (b_num, l_num)
            if key not in lines_dict:
                lines_dict[key] = {"bbox": [x0, y0, x1, y1], "text": []}
            else:
                lines_dict[key]["bbox"][0] = min(lines_dict[key]["bbox"][0], x0)
                lines_dict[key]["bbox"][1] = min(lines_dict[key]["bbox"][1], y0)
                lines_dict[key]["bbox"][2] = max(lines_dict[key]["bbox"][2], x1)
                lines_dict[key]["bbox"][3] = max(lines_dict[key]["bbox"][3], y1)
            lines_dict[key]["text"].append(text_val)
        
        for k, v in lines_dict.items():
            b = v["bbox"]
            box = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]]
            line_str = " ".join(v["text"])
            lines_with_boxes.append((box, line_str, 0.99))
    else:
        ocr_engine = get_ocr_engine()
        ocr_results, elapse = ocr_engine(img_bytes)
        if ocr_results:
            lines_with_boxes = [(res[0], res[1], res[2]) for res in ocr_results]
            full_text = "\n".join([res[1] for res in ocr_results])
        else:
            full_text = ""
    
    doc.close()
    
    lines_text = [line[1] for line in lines_with_boxes]
    text_upper = unidecode.unidecode(full_text.upper())

    # 1. TIPO DE DOCUMENTO
    tipo_folio = "FACTURA ELECTRONICA"
    if "GUIA DE DESPACHO" in text_upper or "GUIA DESPACHO" in text_upper:
        tipo_folio = "GUIA DE DESPACHO"
    elif "FACTURA EXENTA" in text_upper:
        tipo_folio = "FACTURA EXENTA"
    elif "ORDEN DE FLETE" in text_upper:
        tipo_folio = "ORDEN DE FLETE"
    elif "COMPROBANTE DE RECEPCION" in text_upper:
        tipo_folio = "COMPROBANTE DE RECEPCION"
    elif "FACTURA ELECTRONICA" in text_upper or "FACTURA" in text_upper:
        tipo_folio = "FACTURA ELECTRONICA"

    # 2. FOLIO
    id_folio = ""
    for idx, line_str in enumerate(lines_text):
        clean_line = line_str.upper().replace(' ', '')
        m = re.search(r'(?:N[°º:]|FOLIO|FACTURA|N)(\d{3,10})', clean_line)
        if m and m.group(1):
            num = m.group(1)
            if len(num) >= 3 and not clean_line.startswith("RUT") and not clean_line.startswith("TEL"):
                id_folio = num
                break
    
    if not id_folio:
        m = re.search(r'(?:N[°º:]\s*|FOLIO[°º:\s]*|FACTURA[A-Z\s]*N[°º:\s]*)([0-9]{3,10})', full_text, re.IGNORECASE)
        if m:
            id_folio = m.group(1)

    if not id_folio and file_path:
        filename = os.path.basename(file_path)
        m_file = re.search(r'(\d{3,10})', filename)
        if m_file:
            id_folio = m_file.group(1)

    # 3. RUT EMISOR & RUT RECEPTOR
    rut_emp = ""
    rut_dest = ""
    
    # 76.020.266-5 es el RUT de ConvaTec Chile S.A. (Emisor principal)
    top_lines = lines_text[:35]
    for lt in top_lines:
        r_norm = normalize_rut(lt)
        if r_norm:
            if "CONVATEC" in unidecode.unidecode(lt.upper()) or "76.020.266-5" in r_norm:
                rut_emp = r_norm
                break
            elif not rut_emp:
                rut_emp = r_norm

    senor_idx = -1
    for idx, lt in enumerate(lines_text):
        lt_clean = unidecode.unidecode(lt.upper())
        if "SENOR" in lt_clean or "SEÑOR" in lt_clean or "CLIENTE" in lt_clean or "DESTINATARIO" in lt_clean or "HOSPITAL" in lt_clean or "NOR(" in lt_clean:
            senor_idx = idx
            break
            
    if senor_idx != -1:
        for lt in lines_text[senor_idx:senor_idx + 15]:
            r_norm = normalize_rut(lt)
            if r_norm and r_norm != rut_emp:
                rut_dest = r_norm
                break

    if not rut_emp or not rut_dest:
        ruts_all = []
        for lt in lines_text:
            rn = normalize_rut(lt)
            if rn and rn not in ruts_all:
                ruts_all.append(rn)
        if ruts_all:
            if not rut_emp:
                rut_emp = ruts_all[0]
            if not rut_dest and len(ruts_all) > 1:
                for r_candidate in ruts_all:
                    if r_candidate != rut_emp:
                        rut_dest = r_candidate
                        break

    # 4. VALOR TOTAL
    valor_total = ""
    for idx in range(len(lines_text) - 1, -1, -1):
        line_clean = unidecode.unidecode(lines_text[idx].upper().replace(' ', ''))
        if "TOTAL" in line_clean and "NETO" not in line_clean and "IVA" not in line_clean and "CANT" not in line_clean:
            num_m = re.search(r'([\d\.,]{4,12})', line_clean)
            if num_m:
                digits = re.sub(r'\D', '', num_m.group(1))
                if len(digits) >= 3:
                    valor_total = digits
                    break
            for offset in [1, -1, 2, -2]:
                target_i = idx + offset
                if 0 <= target_i < len(lines_text):
                    num_m2 = re.search(r'([\d\.,]{4,12})', lines_text[target_i])
                    if num_m2:
                        digits2 = re.sub(r'\D', '', num_m2.group(1))
                        if len(digits2) >= 3:
                            valor_total = digits2
                            break
            if valor_total:
                break

    # 5. FECHA DE EMISION
    fecha_emision_folio = ""
    for idx, lt in enumerate(lines_text):
        lt_clean = unidecode.unidecode(lt.upper())
        if "FECHA EMISION" in lt_clean or "FECHA DE EMISION" in lt_clean or "EMISION" in lt_clean:
            candidate_block = " ".join(lines_text[max(0, idx - 1):idx + 4])
            date_m = re.search(r'(\d{1,2}\s*de\s*[a-zA-Z]+\s*de\s*\d{4})', candidate_block, re.IGNORECASE)
            if date_m:
                fecha_emision_folio = date_m.group(1)
                break
            date_m2 = re.search(r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})', candidate_block)
            if date_m2:
                fecha_emision_folio = date_m2.group(1)
                break

    if not fecha_emision_folio:
        date_m = re.search(r'(\d{1,2}\s*de\s*[a-zA-Z]+\s*de\s*\d{4})', full_text, re.IGNORECASE)
        if date_m:
            fecha_emision_folio = date_m.group(1)
        else:
            date_m2 = re.search(r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})', full_text)
            if date_m2:
                fecha_emision_folio = date_m2.group(1)

    # 6. ORDEN DE COMPRA (Soporta formatos numéricos y alfanuméricos como 1057489-9761-SE205 o OC-2026-884)
    orden_compra_detalle = ""
    for idx, lt in enumerate(lines_text):
        lt_clean = unidecode.unidecode(lt.upper())
        if "ORDEN" in lt_clean or "O/C" in lt_clean or "O.C." in lt_clean or "PURCHASE" in lt_clean:
            for next_i in range(idx, min(idx + 5, len(lines_text))):
                candidate = lines_text[next_i]
                oc_m = re.search(r'\b([A-Z0-9]{2,10}(?:[-/][A-Z0-9]{2,10})+|\d{5,12})\b', candidate, re.IGNORECASE)
                if oc_m:
                    orden_compra_detalle = oc_m.group(1)
                    break
            if orden_compra_detalle:
                break

    if not orden_compra_detalle:
        oc_fallback = re.search(r'\b(\d{5,10}[-/]\d{3,6}[-/][A-Z0-9]+)\b', full_text, re.IGNORECASE)
        if oc_fallback:
            orden_compra_detalle = oc_fallback.group(1)

    entities = [
        {
            "type": "b_folio",
            "confidence": 0.98,
            "properties": [
                {"type": "id_folio", "mentionText": id_folio, "confidence": 0.98},
                {"type": "tipo_folio", "mentionText": tipo_folio, "confidence": 0.98},
                {"type": "fecha_emision_folio", "mentionText": fecha_emision_folio, "confidence": 0.95}
            ]
        },
        {
            "type": "a_empresa",
            "confidence": 0.98,
            "properties": [
                {"type": "rut_emp", "mentionText": rut_emp, "confidence": 0.98}
            ]
        },
        {
            "type": "c_destinatario",
            "confidence": 0.95,
            "properties": [
                {"type": "rut_dest", "mentionText": rut_dest, "confidence": 0.95}
            ]
        },
        {
            "type": "e_total",
            "confidence": 0.98,
            "properties": [
                {"type": "valor_total", "mentionText": valor_total, "confidence": 0.98}
            ]
        }
    ]

    if orden_compra_detalle:
        entities.append({
            "type": "d_orden",
            "confidence": 0.90,
            "properties": [
                {"type": "orden_compra_detalle", "mentionText": orden_compra_detalle, "confidence": 0.90}
            ]
        })

    return {
        "text": full_text,
        "entities": entities
    }
