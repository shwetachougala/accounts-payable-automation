
import re
from pathlib import Path

POPPLER_PATH = r"D:\DCL-PFS\poppler-26.09.0\Library\bin"


def extract_text(file_path):
    """Extract text from PDF or image using Tesseract OCR."""
    path = Path(file_path)

    try:
        import pytesseract
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        from PIL import Image

        if path.suffix.lower() == ".pdf":
            from pdf2image import convert_from_path

            pages = convert_from_path(
                str(path),
                first_page=1,
                last_page=5,
                poppler_path=POPPLER_PATH
            )

            return "\n".join(
                pytesseract.image_to_string(page) for page in pages
            )

        return pytesseract.image_to_string(Image.open(path))

    except Exception as exc:
        print("OCR ERROR:", repr(exc))
        raise exc




def parse_invoice_text(text):
    def find(pattern):
        match = re.search(pattern, text, re.I)
        return match.group(1).strip() if match else ""

    # code to implement the invoces details
    number = find(
        r'Invoice\s*(?:No\.?|Number|#)\s*[:#-]?\s*([A-Z0-9/-]+)'
    )

    date_pattern = r'(\d{1,2}[-/]\w{3}[-/]\d{4}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})'

    invoice_date = find(rf'Invoice\s*Date\s*[:#-]?\s*{date_pattern}')
    due_date = find(rf'Due\s*Date\s*[:#-]?\s*{date_pattern}')

    subtotal = find(r'Subtotal\s*[:₹$ ]*([\d,]+\.\d{2})')

    tax = find(
        r'^\s*Tax\b[^\n]*?([\d,]+\.\d{2})\s*$'
    )

    total = find(r'Total\s*Amount\s*[:₹$ ]*([\d,]+\.\d{2})')

    # Vendor details
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    vendor_name = lines[0] if lines else ""

    vendor_email = find(
        r'([\w.+-]+@[\w.-]+\.\w+)'
    )


    vendor_gst = find(
        r'GSTIN\s*[:#-]?\s*([0-9A-Z]{15})'
    )

    # Extract address lines between vendor name and GSTIN/email
    address_lines = []

    for line in lines[1:]:
        if re.search(r'GSTIN|Email|TAX INVOICE|Invoice Number', line, re.I):
            break
        address_lines.append(line)

    vendor_address = " ".join(address_lines)

    return {
        'invoice_number': number,
        'invoice_date': invoice_date,
        'due_date': due_date,
        'subtotal': subtotal.replace(',', ''),
        'tax_amount': tax.replace(',', ''),
        'total_amount': total.replace(',', ''),
        'vendor_name': vendor_name,
        'vendor_email': vendor_email,
        'vendor_gst_number': vendor_gst,
        'vendor_address': vendor_address,
        'raw_text': text[:4000]
    }
