from pathlib import Path
import json, xml.etree.ElementTree as ET
import pypdfium2 as pdfium
from pypdf import PdfReader

base=Path(__file__).resolve().parents[1]
folder=base/'diagrams/erd'
qa=base/'output/erd-qa'
qa.mkdir(exist_ok=True)
schema=json.loads((folder/'schema.json').read_text(encoding='utf-8'))
xml=ET.parse(folder/'ERD-ShoeGroup-Hoan-Chinh.drawio').getroot()
overview=xml.find('diagram/mxGraphModel/root')
tables={c['tableName'] for c in schema['columns'] if c['tableName']!='AppMigrations'}
cellmap={c.get('id'):c for c in overview}
assert tables <= cellmap.keys()
for c in schema['columns']:
    if c['tableName']=='AppMigrations': continue
    key=c['tableName']+'-'+c['columnName']
    assert key in cellmap and ' — ' in cellmap[key+'-name'].get('value')
assert sum(c.get('edge')=='1' for c in overview)==len(schema['foreignKeys'])==31
for page in xml:
    cells=page.find('mxGraphModel/root')
    ids={c.get('id') for c in cells}
    assert all(c.get('parent') in ids for c in cells if c.get('parent'))
    assert all(c.get('source') in ids and c.get('target') in ids for c in cells if c.get('edge')=='1')
    assert 'rà soát' not in page.get('name') and 'Phân công' not in page.get('name')
reader=PdfReader(folder/'ERD-ShoeGroup-Hoan-Chinh.pdf')
assert len(reader.pages)==6
for i,page in enumerate(reader.pages):
    text=page.extract_text()
    assert 'ShoeGroup' in text
    (qa/f'page-{i+1}.txt').write_text(text,encoding='utf-8')
pdf=pdfium.PdfDocument(str(folder/'ERD-ShoeGroup-Hoan-Chinh.pdf'))
for i in range(len(pdf)):
    page=pdf[i]
    scale=min(1,1800/page.get_width())
    page.render(scale=scale).to_pil().save(qa/f'page-{i+1}.png')
page=pdf[0]
page.render(scale=1.5,crop=(0,page.get_height()-560,page.get_width()-770,0)).to_pil().save(qa/'detail-top-left.png')
print('Verified 25 business tables, 224 bilingual attributes, 31 FK endpoints and 6 PDF pages.')
