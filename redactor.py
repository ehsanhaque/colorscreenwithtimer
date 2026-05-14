import re
import io
import fitz  # PyMuPDF


class PDFRedactor:
    # (regex_pattern, display_name, capture_group_index)
    # capture_group 0 = redact entire match; 1+ = redact only that captured group
    PATTERNS = [
        # US SSN: 123-45-6789 or 123 45 6789
        (r'\b\d{3}[- ]\d{2}[- ]\d{4}\b', 'SSN', 0),
        # Canadian SIN: 123-456-789 (not followed by more digits)
        (r'\b\d{3}[- ]\d{3}[- ]\d{3}(?![- \d])', 'SIN', 0),
        # 16-digit payment card: 1234-5678-9012-3456 or with spaces
        (r'\b\d{4}[- ]\d{4}[- ]\d{4}[- ]\d{4}\b', 'Credit Card', 0),
        # Amex 15-digit: 3782-822463-10005
        (r'\b\d{4}[- ]\d{6}[- ]\d{5}\b', 'Amex Card', 0),
        # Account number with label (required to avoid false positives)
        (r'(?:account\s*(?:no\.?|number|#|num\.?)|acct\.?\s*(?:no\.?|#))\s*:?\s*([0-9][0-9 \-\.]{4,18}[0-9])', 'Account Number', 1),
        # Canadian transit: XXXXX-YYY
        (r'\b\d{5}-\d{3}\b', 'Transit Number', 0),
        # North American phone: (123) 456-7890, 123-456-7890, +1 123 456 7890
        (r'(?:\+?1[.\- ]?)?(?:\([0-9]{3}\)|\b[0-9]{3})[.\- ][0-9]{3}[.\- ][0-9]{4}\b', 'Phone Number', 0),
        # Email address
        (r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b', 'Email', 0),
        # Date of birth with label
        (r'(?:date\s+of\s+birth|birth\s+date|dob)\s*:?\s*(\d{1,2}[/\-. ]\d{1,2}[/\-. ]\d{2,4})', 'Date of Birth', 1),
        # Name with label: "Name: John Smith" or "Account Holder: Jane Doe"
        (r'(?:full\s+name|account\s+holder|customer(?:\s+name)?|client(?:\s+name)?|(?<!\w)name)\s*:\s*([A-Za-z][A-Za-z\'\-\.]{1,25}(?:[ \t]+[A-Za-z][A-Za-z\'\-\.]{1,25}){1,4})(?=\s*[\r\n,;]|$)', 'Name', 1),
        # Canadian postal code: A1A 1A1 or A1A1A1
        (r'\b[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVWXYZ][ ]?\d[ABCEGHJKLMNPRSTVWXYZ]\d\b', 'Postal Code', 0),
        # US ZIP code with label only (bare 5-digit numbers are too noisy in statements)
        (r'(?:zip|zip\s+code|postal\s+code)\s*:?\s*(\d{5}(?:-\d{4})?)', 'ZIP Code', 1),
        # Street address with common suffix keywords
        (r'\b\d{1,5}\s+[A-Za-z][A-Za-z\s\.]{2,35}\b(?:Street|Avenue|Road|Boulevard|Drive|Court|Lane|Way|Place|Crescent|Circle|Trail|Terrace|St|Ave|Rd|Blvd|Dr|Ct|Ln|Pl|Cres|Tr)\b\.?', 'Street Address', 0),
    ]

    def __init__(self):
        self._compiled = [
            (re.compile(pat, re.IGNORECASE | re.MULTILINE), name, group)
            for pat, name, group in self.PATTERNS
        ]

    def redact(self, pdf_bytes):
        try:
            doc = fitz.open(stream=pdf_bytes, filetype='pdf')
        except Exception as e:
            raise ValueError(f'Cannot open PDF: {e}')

        if doc.is_encrypted:
            raise ValueError('PDF is password-protected. Please decrypt it first.')

        all_findings = []
        has_text = False

        for page in doc:
            text = page.get_text('text')
            if text.strip():
                has_text = True
            findings = self._redact_page(page, text)
            all_findings.extend(findings)

        if not has_text:
            doc.close()
            raise ValueError(
                'No text found in PDF. Scanned/image-only PDFs require OCR before redaction.'
            )

        buf = io.BytesIO()
        doc.save(buf, garbage=4, deflate=True)
        doc.close()
        return buf.getvalue(), all_findings

    def _redact_page(self, page, text):
        if not text.strip():
            return []

        findings = []
        seen_rects = set()

        for compiled_pat, pii_type, capture_group in self._compiled:
            for match in compiled_pat.finditer(text):
                try:
                    to_redact = (
                        match.group(capture_group) if capture_group else match.group(0)
                    )
                except IndexError:
                    to_redact = match.group(0)

                to_redact = to_redact.strip()
                if not to_redact or len(to_redact) < 4:
                    continue

                try:
                    rects = page.search_for(to_redact)
                except Exception:
                    continue

                for rect in rects:
                    key = (round(rect.x0), round(rect.y0), round(rect.x1), round(rect.y1))
                    if key not in seen_rects:
                        seen_rects.add(key)
                        page.add_redact_annot(rect, fill=(0, 0, 0))
                        findings.append({'type': pii_type, 'text': to_redact})

        if findings:
            page.apply_redactions()

        return findings
