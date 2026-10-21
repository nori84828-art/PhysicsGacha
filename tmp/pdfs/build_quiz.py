from pathlib import Path
from io import BytesIO
from pypdf import PdfReader,PdfWriter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont('HeiseiMin-W3','C:/Windows/Fonts/yumin.ttf'))
base=Path('C:/Users/nori8/Desktop/PhysicsGacha')
src=PdfReader('C:/Users/nori8/Downloads/自主学習_竹原功康_物理基礎.pdf')
variants=[('①','上向きに 3.0 cm','下向きに 1.0 cm','上向きに 2.0 cm','6.0','3.0'),('②','下向きに 4.0 cm','上向きに 1.0 cm','下向きに 3.0 cm','8.0','4.0'),('③','上向きに 2.0 cm','下向きに 5.0 cm','下向きに 3.0 cm','10','5.0')]
for answer in [False,True]:
 writer=PdfWriter()
 for i,(label,a,b,result,amp,orig) in enumerate(variants):
  page=src.pages[2+2*i if answer else 1+2*i]
  stream=BytesIO(); c=canvas.Canvas(stream,pagesize=(829,585))
  c.setFillColorRGB(1,1,1);c.rect(447,120,351,429,fill=1,stroke=0)
  c.setFillColorRGB(0,0,0);c.setFont('HeiseiMin-W3',11)
  def line(x,y,s,size=6.2):
   c.setFont('HeiseiMin-W3',size);c.drawString(x,y,s)
  def num(n,y):
   c.rect(458,y-2.5,10.2,10.2);line(460,y,str(n),8.7)
  num(4,535)
  def paragraph(text,y):
   import re
   tokens=re.findall(r'[A-Za-z0-9]+(?:\.[0-9]+)?(?: cm)?|.',text)
   rows=[];row=''
   for token in tokens:
    if pdfmetrics.stringWidth(row+token,'HeiseiMin-W3',6.2)>298 and row and token not in '、。，．）':
     rows.append(row);row=token
    else:row+=token
   if row:rows.append(row)
   for j,t in enumerate(rows):line(478,y-11*j,t,6.2)
  paragraph(f'２つの波が重なっている点 P において、それぞれの波が単独で伝わるときの変位は、一方が{a}、他方が{b}である。この瞬間の点 P における合成波の変位について、向きと大きさを答えよ。（1点）',535)
  c.rect(477,445,299,24)
  if answer:
   line(488,453,result,8.0)
   line(478,407,'上向きを正とすると、合成波の変位は',6.2)
   calc=['(+3.0) + (-1.0) = +2.0 cm','(-4.0) + (+1.0) = -3.0 cm','(+2.0) + (-5.0) = -3.0 cm'][i]
   line(478,391,calc,6.2)
   line(478,375,'採点：向き・大きさがともに正しければ1点。',6.2)
  num(5,295)
  paragraph(f'振幅・波長・振動数がそれぞれ等しい２つの正弦波が、一直線上を互いに反対向きに進み、定在波をつくっている。腹の位置にある媒質の振幅が {amp} cm のとき、もとの２つの波それぞれの振幅は何 cm か。（1点）',295)
  c.rect(477,216,299,24);line(751,224,'cm',6.2)
  if answer:
   line(488,224,orig,8.0)
   line(478,183,'腹の振幅は、もとの波の振幅の２倍である。',6.2)
   line(478,167,f'{amp} ÷ 2 = {orig} cm',6.2)
   line(478,151,f'採点：正答で1点（{int(float(orig))} の表記も可）。',6.2)
  c.save();stream.seek(0);page.merge_page(PdfReader(stream).pages[0]);writer.add_page(page)
 name='wave_quiz_answers.pdf' if answer else 'wave_quiz_questions.pdf'
 with open(base/'output/pdf'/name,'wb') as f:writer.write(f)
 print(name,len(writer.pages))


