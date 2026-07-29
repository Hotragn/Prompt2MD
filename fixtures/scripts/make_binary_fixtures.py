"""Regenerate binary fixtures (PDFs) into fixtures/_generated/.

The repo stays text-only; engine integration tests (Phase 2) call this first.

    pip install reportlab pillow
    python fixtures/scripts/make_binary_fixtures.py
"""

from __future__ import annotations

from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "_generated"

SEGMENT_ROWS = [
    ("Cloud Infrastructure", "4,812", "1,204", "3,977", "902", "+21.0%"),
    ("   Compute", "2,930", "811", "2,455", "640", "+19.3%"),
    ("   Storage", "1,882", "393", "1,522", "262", "+23.7%"),
    ("Enterprise Software", "2,144", "688", "2,081", "655", "+3.0%"),
    ("Professional Services", "917", "64", "1,033", "96", "(11.2)%"),
    ("Total", "7,873", "1,956", "7,091", "1,653", "+11.0%"),
]

INVOICE_LINES = [
    "NORTHSIDE ELECTRICAL SUPPLY CO",
    "1420 Industrial Pkwy, Columbus OH 43219",
    "",
    "INVOICE",
    "Invoice No: INV-2026-08144        Date: 07/15/2026",
    "Bill To: Meridian Construction LLC",
    "PO Box 8812, Dayton OH 45401",
    "PO Number: MC-7703",
    "",
    "QTY   DESCRIPTION                      UNIT      AMOUNT",
    "24    12 AWG THHN Copper Wire 500ft    118.40    2,841.60",
    "6     200A Load Center Panel           289.00    1,734.00",
    "40    20A GFCI Breaker                  42.15    1,686.00",
    "2     Conduit Bender 3/4 in EMT         58.90      117.80",
    "",
    "                        SUBTOTAL              6,379.40",
    "                        TAX (7.25%)             462.51",
    "                        TOTAL                 6,841.91",
    "",
    "Terms: Net 30. 1.5% monthly late charge.",
    "Remit to: accounts@northsideelectrical.example",
]


def make_financial_pdf() -> Path:
    """Native-text PDF with a two-level table header (case 04)."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.units import inch
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet

    out = OUT_DIR / "quarterly-report.pdf"
    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(str(out), pagesize=LETTER)

    header = [
        ["Segment", "Q2 2026", "", "Q2 2025", "", "YoY Rev"],
        ["", "Revenue", "Op. Income", "Revenue", "Op. Income", ""],
    ]
    table = Table(header + [list(r) for r in SEGMENT_ROWS])
    table.setStyle(
        TableStyle(
            [
                ("SPAN", (1, 0), (2, 0)),  # "Q2 2026" spans two metric columns
                ("SPAN", (3, 0), (4, 0)),  # "Q2 2025" spans two metric columns
                ("SPAN", (0, 0), (0, 1)),
                ("SPAN", (5, 0), (5, 1)),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("BACKGROUND", (0, 0), (-1, 1), colors.whitesmoke),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ]
        )
    )
    doc.build(
        [
            Paragraph("Consolidated Segment Results", styles["Title"]),
            Paragraph("(unaudited, $ millions)", styles["Normal"]),
            Spacer(1, 0.2 * inch),
            table,
            Spacer(1, 0.2 * inch),
            Paragraph(
                "Note 4: Segment operating income excludes stock-based compensation of "
                "$312M (Q2 2025: $287M) and restructuring charges of $45M recorded in "
                "Professional Services.",
                styles["Normal"],
            ),
        ]
    )
    return out


def make_scanned_invoice() -> Path:
    """Image-only (no text layer) PDF with slight skew, forcing the OCR route (case 06)."""
    from PIL import Image, ImageDraw, ImageFont

    out = OUT_DIR / "scanned-invoice.pdf"
    img = Image.new("L", (1700, 2200), color=245)
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("cour.ttf", 34)
    except OSError:
        font = ImageFont.load_default()

    y = 120
    for line in INVOICE_LINES:
        draw.text((140, y), line, fill=20, font=font)
        y += 52

    img = img.rotate(0.8, expand=False, fillcolor=245)  # slight scanner skew
    img.convert("RGB").save(out, "PDF", resolution=150)
    return out


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for fn in (make_financial_pdf, make_scanned_invoice):
        print(f"wrote {fn()}")
