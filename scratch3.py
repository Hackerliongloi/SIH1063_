with open('d:\\SIH1063_\\backend\\app\\main.py', 'a', encoding='utf-8') as f:
    f.write('''

@app.get("/api/assets/{id}/export/xml")
def export_asset_xml(id:int, db:Session=Depends(get_db)):
    from fastapi.responses import Response
    a = db.get(Asset, id)
    if not a or a.status != "ready": raise HTTPException(404, "Asset not found")
    
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<MD_Metadata xmlns="http://www.isotc211.org/2005/gmd" xmlns:gco="http://www.isotc211.org/2005/gco">
    <fileIdentifier><gco:CharacterString>{a.id}</gco:CharacterString></fileIdentifier>
    <language><gco:CharacterString>eng</gco:CharacterString></language>
    <characterSet><MD_CharacterSetCode codeListValue="utf8"/></characterSet>
    <hierarchyLevel><MD_ScopeCode codeListValue="dataset"/></hierarchyLevel>
    <identificationInfo>
        <MD_DataIdentification>
            <citation>
                <CI_Citation>
                    <title><gco:CharacterString>{a.title}</gco:CharacterString></title>
                    <date><CI_Date><date><gco:DateTime>{a.created_at.isoformat()}</gco:DateTime></date><dateType><CI_DateTypeCode codeListValue="publication"/></dateType></CI_Date></date>
                </CI_Citation>
            </citation>
            <abstract><gco:CharacterString>{a.description}</gco:CharacterString></abstract>
            <status><MD_ProgressCode codeListValue="completed"/></status>
            <descriptiveKeywords>
                <MD_Keywords>
                    <keyword><gco:CharacterString>{a.region}</gco:CharacterString></keyword>
                    <keyword><gco:CharacterString>{a.station}</gco:CharacterString></keyword>
                    <keyword><gco:CharacterString>{a.year}</gco:CharacterString></keyword>
                </MD_Keywords>
            </descriptiveKeywords>
        </MD_DataIdentification>
    </identificationInfo>
</MD_Metadata>"""
    return Response(content=xml, media_type="application/xml")

@app.get("/api/assets/{id}/export/pdf")
def export_asset_pdf(id:int, db:Session=Depends(get_db)):
    from fastapi.responses import Response
    from fpdf import FPDF
    
    a = db.get(Asset, id)
    if not a or a.status != "ready": raise HTTPException(404, "Asset not found")
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", "B", 16)
    pdf.cell(0, 10, "National Polar Data Center - Dataset Metadata", ln=True, align="C")
    pdf.ln(10)
    
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(40, 10, "Title:")
    pdf.set_font("helvetica", "", 12)
    pdf.multi_cell(0, 10, a.title or "N/A")
    
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(40, 10, "Type:")
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 10, a.type or "N/A", ln=True)
    
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(40, 10, "Region:")
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 10, a.region or "N/A", ln=True)
    
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(40, 10, "Year:")
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 10, str(a.year) if a.year else "N/A", ln=True)
    
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(40, 10, "Station:")
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 10, a.station or "N/A", ln=True)
    
    pdf.ln(10)
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 10, "Description:", ln=True)
    pdf.set_font("helvetica", "", 12)
    pdf.multi_cell(0, 10, a.description or "N/A")
    
    pdf_bytes = pdf.output()
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=dataset_{a.id}.pdf"})
''')
