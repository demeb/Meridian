"""A tiny .xlsx writer — enough for one well-formatted sheet, no dependencies.

    data = write_sheet("Universities", ["Name", "Rank"], [["MIT", 1]], widths=[40, 10])

Cells may be str, int/float, None, or ("link", url, label) for a clickable link.
The header row is bold on Meridian blue, frozen, with filters; text wraps.
"""
import io
import zipfile
from xml.sax.saxutils import escape


def _col(n):
    name = ""
    n += 1
    while n:
        n, r = divmod(n - 1, 26)
        name = chr(65 + r) + name
    return name


def _xml(text):
    # strip characters XML 1.0 does not allow
    text = "".join(ch for ch in str(text) if ch in "\t\n\r" or ord(ch) >= 32)
    return escape(text, {'"': "&quot;"})


STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><u/><sz val="11"/><color rgb="FF0563C1"/><name val="Calibri"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1B4FC4"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF2F6FF"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFD5DEF0"/></left><right style="thin"><color rgb="FFD5DEF0"/></right><top style="thin"><color rgb="FFD5DEF0"/></top><bottom style="thin"><color rgb="FFD5DEF0"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>"""


def write_sheet(title, header, rows, widths=None):
    title = (title or "Sheet1")[:31]
    out_rows = []
    cols = len(header)

    def cell(ref, value, style):
        if value is None or value == "":
            return '<c r="%s" s="%d"/>' % (ref, style)
        if isinstance(value, tuple) and value and value[0] == "link":
            url, label = value[1], value[2] if len(value) > 2 else value[1]
            formula = 'HYPERLINK("%s","%s")' % (str(url).replace('"', '""'), str(label).replace('"', '""'))
            return '<c r="%s" s="4" t="str"><f>%s</f><v>%s</v></c>' % (ref, _xml(formula), _xml(label))
        if isinstance(value, bool):
            value = "Yes" if value else "No"
        if isinstance(value, (int, float)):
            return '<c r="%s" s="%d"><v>%s</v></c>' % (ref, style, value)
        return '<c r="%s" s="%d" t="inlineStr"><is><t xml:space="preserve">%s</t></is></c>' % (ref, style, _xml(value))

    out_rows.append('<row r="1" ht="30" customHeight="1">%s</row>' %
                    "".join(cell("%s1" % _col(i), h, 1) for i, h in enumerate(header)))
    for r, row in enumerate(rows, start=2):
        style = 3 if r % 2 else 2
        out_rows.append('<row r="%d">%s</row>' %
                        (r, "".join(cell("%s%d" % (_col(i), r), row[i] if i < len(row) else None, style) for i in range(cols))))

    widths = widths or [18] * cols
    col_xml = "".join('<col min="%d" max="%d" width="%s" customWidth="1"/>' % (i + 1, i + 1, w) for i, w in enumerate(widths))
    last = "%s%d" % (_col(cols - 1), max(1, len(rows) + 1))
    sheet = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
             '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
             '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" xSplit="1" topLeftCell="B2" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>'
             '<sheetFormatPr defaultRowHeight="15"/><cols>%s</cols><sheetData>%s</sheetData>'
             '<autoFilter ref="A1:%s"/></worksheet>') % (col_xml, "".join(out_rows), last)

    files = {
        "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            '</Types>',
        "_rels/.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            '</Relationships>',
        "xl/workbook.xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="%s" sheetId="1" r:id="rId1"/></sheets>'
            '<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">\'%s\'!$A$1:$%s$%d</definedName></definedNames>'
            '</workbook>' % (_xml(title), _xml(title).replace("'", "''"), _col(cols - 1), max(1, len(rows) + 1)),
        "xl/_rels/workbook.xml.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            '</Relationships>',
        "xl/styles.xml": STYLES,
        "xl/worksheets/sheet1.xml": sheet,
    }
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for name, body in files.items():
            z.writestr(name, body)
    return buf.getvalue()
