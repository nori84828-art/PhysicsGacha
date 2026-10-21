from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
import math
pdfmetrics.registerFont(TTFont('JP','C:/Windows/Fonts/yumin.ttf'))
out='output/pdf/problem_110_explanation.pdf'
c=canvas.Canvas(out,pagesize=(595.28,841.89))
W=595.28
blue=HexColor('#286aa1');orange=HexColor('#ba6717');red=HexColor('#b72c3a')
def text(x,y,s,size=10,color=None):
 import re
 ink=color or HexColor('#111111')
 c.setFillColor(ink);c.setFont('JP',size)
 pos=0;cursor=x
 for match in re.finditer(r'(\d*T)/(\d+)',s):
  normal=s[pos:match.start()]
  c.setFont('JP',size);c.drawString(cursor,y,normal)
  cursor+=pdfmetrics.stringWidth(normal,'JP',size)
  numerator,denominator=match.groups()
  small=size*.80
  width=max(pdfmetrics.stringWidth(numerator,'JP',small),pdfmetrics.stringWidth(denominator,'JP',small))+4
  cursor+=1.5
  c.setFont('JP',small)
  c.drawCentredString(cursor+width/2,y+size*.48,numerator)
  c.drawCentredString(cursor+width/2,y-size*.53,denominator)
  c.setStrokeColor(ink);c.setLineWidth(.55)
  c.line(cursor,y+size*.27,cursor+width,y+size*.27)
  cursor+=width+1.5;pos=match.end()
 c.setFont('JP',size);c.drawString(cursor,y,s[pos:])
def footer(n):
 text(38,22,'問題集 p65・問題110　解説／縦軸 a は、もとの波それぞれの振幅。',8)
 text(546,22,str(n),8)
def header(title):
 text(38,800,title,17);c.setStrokeColor(HexColor('#aaaaaa'));c.setLineWidth(.5);c.line(38,787,557,787)
header('問題110　定在波の描き方')
text(38,765,'① 波を横に動かす → ② 同じ位置の変位を足す',11)
text(38,746,'図の１波長は４目盛り。１周期 T の間に、波は４目盛り進む。')
text(38,729,'波Aは右へ、波Bは左へ、T/4 ごとに１目盛りずつ平行移動する。')
text(38,712,'A：青の一点鎖線　 B：茶の破線　 合成波：赤の実線',9)
for idx,t in enumerate([.25,.5,.75,1.]):
 top=686-155*idx; y0=top-59;x0=105;pw=432;scale=18
 label=['T/4','2T/4 = T/2','3T/4','T'][idx]
 text(38,top,f't = {label}',11)
 text(186,top,f'Aを右へ{idx+1}目盛り、Bを左へ{idx+1}目盛り移動',9)
 fronta=5+4*t;frontb=5-4*t
 c.setFillColor(HexColor('#f0f3f5'));c.rect(x0+(frontb-1)*pw/8,y0-2.25*scale,(fronta-frontb)*pw/8,4.5*scale,fill=1,stroke=0)
 for x in range(1,10):
  xx=x0+(x-1)*pw/8;c.setStrokeColor(HexColor('#dddddd'));c.setLineWidth(.4);c.line(xx,y0-2.25*scale,xx,y0+2.25*scale)
  text(xx-2,y0-2.25*scale-13,str(x),8)
 for yy,lab in [(-2,'-2a'),(-1,'-a'),(0,'0'),(1,'a'),(2,'2a')]:
  c.setStrokeColor(HexColor('#aaaaaa') if yy==0 else HexColor('#dddddd'));c.line(x0,y0+yy*scale,x0+pw,y0+yy*scale);text(x0-29,y0+yy*scale-3,lab,8)
 def av(x):return math.sin(math.pi/2*(x-3)-2*math.pi*t) if x<=fronta+1e-8 else 0
 def bv(x):return math.sin(math.pi/2*(x-5)+2*math.pi*t) if x>=frontb-1e-8 else 0
 def curve(fun,start,end,color,dash,width):
  c.setStrokeColor(color);c.setLineWidth(width);c.setDash(dash);p=c.beginPath()
  for j in range(501):
   x=start+(end-start)*j/500;xx=x0+(x-1)*pw/8;yy=y0+fun(x)*scale
   if j==0:p.moveTo(xx,yy)
   else:p.lineTo(xx,yy)
  c.drawPath(p)
 curve(av,1,min(9,fronta),blue,[5,2,1,2],1.0)
 curve(bv,max(1,frontb),9,orange,[3,2],1.0)
 curve(lambda x:av(x)+bv(x),1,9,red,[],1.5)
 c.setDash([])
 note=['重なるのは４～６。５では a + a = 2a。','重なるのは３～７。この範囲では打ち消し合う。','重なるのは２～８。３・７で +2a、５で -2a。','１～９の全範囲で打ち消し合い、合成波は横軸に一致。'][idx]
 text(38,top-125,note,9)
footer(1);c.showPage()
header('問題110　考え方と（2）の答え')
lines=[
('１　波を動かすときの基本',12),
('１周期で１波長進むので、T/4 なら１目盛り、T/2 なら２目盛り、',10),
('3T/4 なら３目盛り、T なら４目盛り動かす。波の高さは変えない。',10),
('波A・Bをそれぞれ動かしてから、同じ位置で縦方向に足し合わせる。',10),
('',10),
('２　合成波は「変位の和」',12),
('もとの波の振幅を a とする。上向きを正、下向きを負と考える。',10),
('・山と山：(+a) + (+a) = +2a',10),
('・山と谷：(+a) + (-a) = 0',10),
('・谷と谷：(-a) + (-a) = -2a',10),
('片方の波しか届いていない場所は、その波だけを描く。',10),
('',10),
('３　節と腹は、時間がたって定在波ができた状態で考える',12),
('問題の「時間が経過すると」は、両方の波がその場所に届いた後のこと。',10),
('節：２つの波がいつも打ち消し合い、媒質が振動しない位置。',10),
('腹：２つの波が強め合う瞬間があり、振幅が最大の 2a になる位置。',10),
('',10),
('答え　節：２、４、６、８',13),
('　　　腹：１、３、５、７、９',13),
('',10),
('５は、T/4 で +2a、T/2 で０、3T/4 で -2a と変化するので腹。',10),
('４・６は、両方の波が届いた後は常に打ち消し合うので節。',10),
('節どうしの間隔は２目盛り（半波長）、節と隣の腹は１目盛り。',10),
('',10),
('注意：「その瞬間に０」だけでは、節とはいえない',12),
('t = T では、腹の位置も含めて合成波全体の変位が０になる。',10),
('腹の媒質も振動の途中でつり合いの位置を通るためである。',10),
('節は「いつも変位０」、腹は「大きく上下に振動する位置」と区別する。',10),
]
y=760
for s,size in lines:
 text(38,y,s,size);y-=23 if size==12 else 20
footer(2);c.save()
print(out)
