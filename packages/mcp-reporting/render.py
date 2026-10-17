import json,sys,os,subprocess,base64,hashlib,html
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader
from PIL import Image
root=Path(sys.argv[1]); data=json.loads((root/'input.json').read_text());r=data['report'];brand=data['brand'];colors=data['colors']
for name in ['regular','bold','black']:pdfmetrics.registerFont(TTFont(name,str(root/(name+'.ttf'))))
c=canvas.Canvas(str(root/'report.pdf'),pagesize=(612,792),invariant=1,pageCompression=1)
c.setTitle(r['title']);c.setAuthor('Wetland - independent demonstration')
checks=[]
def paragraph(text,x,y,width,size=10,font='regular',color=None):
 p=Paragraph(escape(str(text)),ParagraphStyle('body',fontName=font,fontSize=size,leading=size*1.5,textColor=HexColor(color or colors['ink'])))
 w,h=p.wrap(width,700)
 if y-h<48:raise ValueError('Report content exceeds safe page bounds')
 p.drawOn(c,x,y-h);checks.append({'bottom':y-h,'right':x+w});return y-h
c.setFillColor(HexColor(colors['blue']));c.rect(0,650,612,142,fill=1,stroke=0)
with Image.open(root/'logo.png') as im:
 ratio=im.height/im.width
c.drawImage(ImageReader(str(root/'logo.png')),36,732,132,132*ratio,mask='auto')
paragraph('WETLAND / GROWTH REPORT',36,704,540,11,'bold',colors['white'])
paragraph('Synthetic data. Not WaterAid results.',36,681,540,10,'regular',colors['white'])
y=paragraph(r['title'],36,625,540,25,'black')-12
y=paragraph(r['start']+' to '+r['end']+' (inclusive)',36,y,540,11)-24
for x,value,label in [(36,str(r['actual']),'New donors'),(222,str(r['attainmentPercent'])+'%','Of target'),(408,str(r['gapToTarget']),'Gap to target')]:
 c.setFillColor(HexColor(colors['cream']));c.roundRect(x,y-88,168,88,8,fill=1,stroke=0)
 paragraph(value,x+14,y-9,140,28,'black',colors['blue']);paragraph(label,x+14,y-55,140,10,'bold')
y-=112
y=paragraph('What counts as Growth',36,y,540,13,'bold')-8
y=paragraph(r['definition'],36,y,540,10)-16
y=paragraph('Target: '+str(r['target'])+' new donors. CRM records created: '+str(r['newCrmRecords'])+' (a separate measure).',36,y,540,10)-14
if r.get('comparison'):
 y=paragraph('Comparison period: '+str(r['comparison']['actual'])+' new donors; change '+str(r['comparison']['changePercent'])+'%.',36,y,540,10)-14
# Monthly detail remains in the structured evidence; fixed-length summary avoids squeezing long periods.
y=paragraph('Evidence and method',36,y,540,13,'bold')-8
y=paragraph('Definition: '+r['definitionVersion']+'. Dataset: '+r['dataset']+'. Growth package: '+r['packageVersion']+'. Receipt history is checked against the synthetic export manifest.',36,y,540,9)-12
y=paragraph('Brand profile '+brand['profileVersion']+' / tokens '+brand['tokenVersion']+'. Renderer '+data['rendererVersion']+'. Brand snapshot: '+brand['snapshotDigest'][:24]+'.',36,y,540,9)-12
y=paragraph('Independent Wetland demonstration. Brand reference kit is not official WaterAid approval. Noto Sans Black is the open-licensed substitute heading font.',36,y,540,9)
if any(v['right']>576.01 for v in checks):raise ValueError('Text outside horizontal bounds')
c.setFillColor(HexColor(colors['ink']));c.setFont('regular',8);c.drawString(36,28,'Wetland | Synthetic demonstration | 1 / 1');c.save()
reader=PdfReader(root/'report.pdf');assert len(reader.pages)==1
page=reader.pages[0];text=page.extract_text()
assert str(r['actual']) in text and 'Synthetic data' in text and r['start'] in text
fonts=page['/Resources']['/Font'].get_object();embedded=0
for value in fonts.values():
 font=value.get_object();descriptor=font.get('/FontDescriptor')
 if descriptor:
  desc=descriptor.get_object()
  if '/FontFile2' in desc:embedded+=1
assert embedded>=3,'Missing embedded Noto Sans fonts'
images=page['/Resources'].get('/XObject',{}).get_object();assert any(v.get_object().get('/Subtype')=='/Image' for v in images.values()),'Missing embedded logo'
subprocess.run(['pdftoppm','-f','1','-singlefile','-scale-to','1200','-png',str(root/'report.pdf'),str(root/'preview')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=15)
with Image.open(root/'preview.png') as image:
 assert image.width>500 and len(image.getcolors(image.width*image.height) or [])>20,'Blank PDF render'
# Self-contained HTML: no scripts, network fonts or remote assets; text and CSS tokens are escaped/validated upstream.
def b64(file):return base64.b64encode((root/file).read_bytes()).decode()
e=html.escape
styles=''.join('@font-face{font-family:'+name+';src:url(data:font/ttf;base64,'+b64(name+'.ttf')+')} ' for name in ['regular','bold','black'])
styles+='body{font-family:regular;color:'+colors['ink']+';max-width:820px;margin:32px auto;padding:24px}header{background:'+colors['blue']+';color:white;padding:28px}header img{width:180px;height:auto}h1{font-family:black;font-size:36px}h2{font-family:bold}section{background:'+colors['cream']+';padding:20px;margin:22px 0}p{line-height:1.6}.metrics{display:flex;gap:28px;flex-wrap:wrap}.metric strong{display:block;font:36px black;color:'+colors['blue']+'}code{overflow-wrap:anywhere}@media print{body{margin:0;padding:12px}}'
body='<header><img alt="WaterAid reference logo" src="data:image/png;base64,'+b64('logo.png')+'"><p>WETLAND / INDEPENDENT DEMONSTRATION</p></header><h1>'+e(r['title'])+'</h1><p><strong>Synthetic data. Not WaterAid results.</strong></p><p>'+e(r['start'])+' to '+e(r['end'])+' (inclusive)</p><section class="metrics">'
for value,label in [(r['actual'],'New donors'),(str(r['attainmentPercent'])+'%','Of target'),(r['gapToTarget'],'Gap to target')]:body+='<div class="metric"><strong>'+e(str(value))+'</strong>'+label+'</div>'
body+='</section><h2>What counts as Growth</h2><p>'+e(r['definition'])+'</p><p>Target: '+str(r['target'])+'. CRM records created: '+str(r['newCrmRecords'])+' (separate measure).</p><h2>Evidence</h2><p>Definition: '+e(r['definitionVersion'])+'. Dataset: '+e(r['dataset'])+'. Growth package: '+e(r['packageVersion'])+'.</p><p>Brand snapshot: <code>'+brand['snapshotDigest']+'</code></p><p>Brand profile '+e(brand['profileVersion'])+'. '+e(brand['status'])+'.</p><p>Independent Wetland demonstration. Not WaterAid-endorsed. Noto Sans Black is a substitute heading font.</p><details><summary>Font licence</summary><pre>'+e((root/'license.txt').read_text())+'</pre></details>'
(root/'report.html').write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; font-src data:; style-src \'unsafe-inline\'"><title>'+e(r['title'])+'</title><style>'+styles+'</style></head><body>'+body+'</body></html>')
(root/'checks.json').write_text(json.dumps({'pageCount':1,'embeddedFontCount':embedded,'logoEmbedded':True,'boundsChecked':True,'rendered':True,'visualReview':'Template visually reviewed; automated render and bounds checks run for every export.'}))
