"""Reproducible editorial render. Real UI media remain unchanged; overlays are clearly editorial."""
from PIL import Image,ImageDraw,ImageFont,ImageFilter
import pathlib,json,math,random,subprocess,concurrent.futures,os,sys
R=pathlib.Path(__file__).resolve().parents[1];A=R/'assets';S=R/'scenes/rendered';S.mkdir(parents=True,exist_ok=True)
FF=os.environ.get('FFMPEG','/Applications/BlueStacks.app/Contents/MacOS/ffmpeg');timeline=json.loads((R/'scenes/timeline.json').read_text());evidence=json.loads((R/'reports/capture-evidence.json').read_text())
FONT='/System/Library/Fonts/Supplemental/Arial.ttf';BOLD='/System/Library/Fonts/Supplemental/Arial Bold.ttf';MONO='/System/Library/Fonts/Supplemental/Andale Mono.ttf'
C={'navy':'#07101e','card':'#0c192b','line':'#203956','cyan':'#51dcff','blue':'#4687ff','purple':'#a796ff','white':'#edf4ff','muted':'#a4b5cc','lime':'#c6ee94','amber':'#ffc873'}
def font(n,b=False,mono=False):return ImageFont.truetype(MONO if mono else BOLD if b else FONT,n)
def text(d,xy,t,size=28,color='white',b=False):d.text(xy,t,font=font(size,b),fill=C.get(color,color))
def wrap(d,t,width,size=28,b=False):
 lines=[];line=''
 for word in t.split():
  candidate=(line+' '+word).strip()
  if d.textlength(candidate,font=font(size,b))>width and line:lines.append(line);line=word
  else:line=candidate
 return lines+[line]
def para(d,xy,t,width,size=28,color='muted',b=False,leading=1.3):
 x,y=xy
 for line in wrap(d,t,width,size,b):text(d,(x,y),line,size,color,b);y+=size*leading
 return y
# Original network artwork. No generated app UI or external stock imagery.
bg=Image.new('RGB',(2040,1200),C['navy']);d=ImageDraw.Draw(bg)
for y in range(1200):
 v=y/1200;d.line((0,y,2040,y),fill=(7+int(3*v),15+int(7*v),29+int(11*v)))
for x in range(0,2040,85):d.line((x,0,x,1200),fill='#112137')
for y in range(0,1200,85):d.line((0,y,2040,y),fill='#112137')
random.seed(360);nodes=[(random.randint(0,2040),random.randint(0,1200)) for _ in range(64)]
for x,y in nodes:
 for xx,yy in nodes:
  if 70<math.hypot(x-xx,y-yy)<230:d.line((x,y,xx,yy),fill='#1c3550',width=1)
 d.ellipse((x-3,y-3,x+3,y+3),fill='#407b9b')
bg.save(A/'network-original.png');dot=Image.new('RGBA',(16,16));dd=ImageDraw.Draw(dot);dd.ellipse((2,2,14,14),fill=C['cyan']);dot.save(A/'packet.png')
def frame(s,title=None):
 im=Image.new('RGBA',(1920,1080));d=ImageDraw.Draw(im)
 text(d,(64,35),'CYBERTRUST',22,'white',True);text(d,(221,35),'360',22,'cyan',True);text(d,(1490,37),'TECHNIX PRO  /  HACKATHON',18,'muted')
 d.line((64,80,1856,80),fill=C['line'],width=2);text(d,(64,106),s['label'],20,'cyan',True)
 text(d,(64,144),title or s['title'],43,'white',True);text(d,(1730,108),f"{s['id']:02} / 09",20,'muted')
 # Dedicated caption band and discreet timeline.
 d.rectangle((0,966,1920,1080),fill='#050b15');d.line((64,966,1856,966),fill=C['line'],width=2)
 d.line((64,1070,1856,1070),fill='#203046',width=3);d.line((64,1070,64+int(1792*(s['start']+s['duration'])/225),1070),fill=C['cyan'],width=3)
 return im
shots=[]
def add(scene,duration,media=None,title=None,lines=None,note='',crop=None,mode='ui',ss=0):
 shots.append(dict(scene=scene,duration=duration,media=media,title=title,lines=lines,note=note,crop=crop,mode=mode,ss=ss))
add(1,20,mode='intro')
for i in range(5):add(2,5,mode='problem',ss=i)
add(3,6,'01-hero.png',note='ACTUAL APPLICATION / LOCAL DEMO')
add(3,14,'19-dashboard-final.png',note='Synthetic records; indicator count includes built-in fixtures',crop=[130,80,1180,760])
add(4,5,'03-url-input.png',lines=['A safe demonstration URL','https://example.com','Input through the actual scanner'],note='No malicious website visited',crop=[135,90,1170,390])
add(4,10,'../recordings/url-investigation.webm',lines=['Genuine browser recording','DNS / TLS / HTTP checks','Observed result: Low Risk, 5 / 100'],note='ACTUAL WALKTHROUGH / normal playback')
add(4,8,'06-url-tls.png',lines=['TLS 1.3 observed','Certificate valid in this run','Read evidence, not just the score'],note='Actual result from this audit',crop=[140,255,1160,645])
add(4,7,'07-url-dns.png',lines=['DNS records resolved','URLhaus: unavailable (HTTP 401)','Other feeds: not configured'],note='Unavailable feeds are not clean verdicts',crop=[140,255,1160,645])
add(5,5,'08-scam-input.png',lines=['Synthetic KYC message','Urgency + account suspension','Example.com is an illustrative link'],note='DEMONSTRATION TEXT / not a real incident',crop=[105,230,1230,620])
add(5,9,'../recordings/scam-analysis.webm',lines=['Actual submitted analysis','Risk score: 100 / 100','Deterministic rules, no live LLM'],note='RULE-BASED FALLBACK / synthetic message')
add(5,6,'09-scam-result.png',lines=['Impersonation','OTP solicitation','Urgency pressure'],note='Heuristic findings, not an LLM verdict',crop=[100,95,1240,740])
add(5,10,'11-incident-guidance.png',lines=['Contact your bank / payment provider','Report immediately: 1930','cybercrime.gov.in','Recovery is not guaranteed'],note='Actual guidance panel / editorial summary',crop=[150,310,1130,590])
add(6,8,'../recordings/threat-graph-clean.webm',lines=['Real stored reports','Shared example.com indicator','Interactive neighborhood focus'],note='Synthetic inputs / no attacker attribution')
add(6,9,'21-edge-evidence.png',lines=['Exact-match evidence','Verified shared indicator','An explained connection'],note='Shared indicators do not prove common attackers',crop=[280,260,2320,1500])
add(6,8,'20-graph-close.png',lines=['Green: exact shared indicator','Amber: inferred similarity','Context stays visible'],note='Graph content comes from isolated demo records',crop=[280,260,2320,1500])
add(7,10,'../recordings/blockchain-verification.webm',lines=['Real signed transaction','Receipt independently checked','Hardhat local EVM / 31337'],note='LOCAL, RESETTABLE NETWORK / not public mainnet')
add(7,8,'16-blockchain-registered.png',lines=['Transaction confirmed',f"Block {evidence['receipt']['blockNumber']} / receipt status 1",'SHA-256 selected-field fingerprint'],note='Actual receipt in reports/capture-evidence.json',crop=[105,95,1230,720])
add(7,9,'22-verified-detail.png',lines=['Unchanged selected fields','Computed hash matches stored hash','Integrity is separate from factual accuracy'],note='Scope: selected fields only; some evidence is omitted',mode='detail')
add(7,9,'23-tamper-detail.png',lines=['Controlled in-memory score change','Recomputed fingerprint differs','Database report stays intact'],note='Genuine mismatch / built-in demonstration scenario',mode='detail')
add(7,4,mode='limitation',note='AUDIT DISCLOSURE')
add(8,20,mode='architecture')
add(9,15,mode='closing')
assert sum(x['duration'] for x in shots)==225

def prepare(i,x):
 s=timeline[x['scene']-1];im=frame(s,x['title']);d=ImageDraw.Draw(im);mode=x['mode']
 if mode in ['intro','closing']:
  # Cinematic title with orbital network emblem.
  d.rectangle((0,92,1920,960),fill=(7,16,30,225));cx,cy=1515,490
  for radius,col in [(280,'#1c3854'),(225,'#275775'),(170,'#377d9a')]:d.ellipse((cx-radius,cy-radius,cx+radius,cy+radius),outline=col,width=2)
  pts=[(cx,cy-112),(cx+87,cy-74),(cx+74,cy+49),(cx,cy+117),(cx-74,cy+49),(cx-87,cy-74)];d.polygon(pts,fill='#102c43',outline=C['cyan'],width=4)
  d.line((cx-36,cy,cx-7,cy+29,cx+45,cy-31),fill=C['cyan'],width=8)
  text(d,(90,270),'CYBERTRUST',99,'white',True);text(d,(90,380),'360',126,'cyan',True)
  if mode=='intro':
   text(d,(98,570),'Your Digital World.',42,'white');text(d,(98,627),'Protected from Every Angle.',42,'white');text(d,(100,756),'TEAM TECHNIX PRO',27,'lime',True);text(d,(100,805),'A working cybersecurity intelligence prototype',24,'muted')
  else:
   text(d,(98,552),'Detect. Understand. Connect. Verify.',37,'white',True);text(d,(100,642),'Built by TECHNIX PRO',30,'cyan',True);text(d,(100,728),'Your Digital World.',31,'white');text(d,(100,772),'Protected from Every Angle.',31,'white');text(d,(100,866),'Local demonstration / independent audit included',22,'muted')
 elif mode=='problem':
  active=int(x['ss']);terms=['Phishing websites','Fake bank KYC','UPI payment traps','Social engineering','Altered digital evidence'];subs=['A familiar design can hide an unfamiliar destination.','Urgency turns a routine update into pressure.','A request to receive money can conceal a payment.','Fear and authority can override careful checking.','Changed records need a visible integrity signal.']
  for j,term in enumerate(terms):
   y=245+j*126;on=j==active;d.rounded_rectangle((80,y,1160,y+101),radius=17,fill='#12263b' if on else '#0a1727',outline=C['cyan'] if on else C['line'],width=2);text(d,(107,y+28),f'0{j+1}',28,'cyan' if on else 'muted');text(d,(185,y+26),term,35,'white' if on else 'muted',on)
  text(d,(1255,278),'THE DECISION',22,'purple',True);para(d,(1255,334),subs[active],540,40,'white',True);para(d,(1255,620),'Pause. Investigate. Preserve the evidence.',490,30,'cyan');text(d,(1255,860),'No unverified statistics',22,'muted')
 elif mode=='architecture':
  boxes=[(80,'REACT','TypeScript interface'),(530,'FASTAPI','Investigation + rules'),(980,'DATA & INTEL','SQL + optional feeds'),(1430,'SOLIDITY','Local Hardhat EVM')]
  for j,(bx,title,sub) in enumerate(boxes):
   d.rounded_rectangle((bx,355,bx+390,625),radius=24,fill=C['card'],outline=C['cyan'] if j%2==0 else C['purple'],width=3);text(d,(bx+26,391),f'0{j+1}',27,'cyan');text(d,(bx+26,452),title,31,'white',True);para(d,(bx+26,520),sub,340,25,'muted');
   if j<3:d.line((bx+390,490,bx+450,490),fill=C['cyan'],width=3);d.polygon([(bx+445,482),(bx+454,490),(bx+445,498)],fill=C['cyan'])
  text(d,(90,718),'58 / 58',61,'cyan',True);text(d,(390,737),'existing automated tests passed',30,'white');text(d,(90,823),'Production build passed. Security and integrity fixes remain.',30,'amber');text(d,(90,883),'AI adapters exist; this recording uses deterministic fallback.',24,'muted')
 elif mode=='limitation':
  text(d,(130,330),'Integrity has a defined scope.',62,'white',True);para(d,(130,445),'This audit found evidence fields that are not covered by the current fingerprint.',1550,45,'amber',True);para(d,(130,645),'The score-change demonstration is genuine. Full-report protection requires correction.',1550,34,'muted');text(d,(130,838),'Local Hardhat EVM / selected report fields / independent audit',26,'cyan')
 else:
  left=64;top=205;width=1380;height=750
  if mode=='detail':width=870
  d.rounded_rectangle((left-3,top-3,left+width+3,top+height+3),radius=20,outline=C['line'],width=2)
  side=1490 if mode!='detail' else 1040;sidewidth=355 if mode!='detail' else 760
  text(d,(side,225),'DEMONSTRATED WORKFLOW',18,'cyan',True)
  y=280
  for j,line in enumerate(x['lines'] or s['lines']):
   d.rectangle((side,y+8,side+4,y+38),fill=C['cyan'] if j%2==0 else C['purple']);y=para(d,(side+20,y),line,sidewidth-22,27 if mode!='detail' else 33,'white',True)+32
  d.line((side,735,side+sidewidth,735),fill=C['line'],width=2);para(d,(side,760),x['note'],sidewidth,22,'amber');text(d,(side,915),'ACTUAL APP CAPTURE',18,'muted')
 im.save(S/f'{i:02}-overlay.png')
 if x['media'] and not x['media'].endswith('.webm'):
  src=Image.open(A/x['media']).convert('RGB')
  if x['crop']:
   xx,yy,ww,hh=x['crop'];src=src.crop((xx,yy,min(xx+ww,src.width),min(yy+hh,src.height)))
  size=(1380,750) if mode!='detail' else (870,750);src.thumbnail(size,Image.Resampling.LANCZOS);canvas=Image.new('RGB',size,'#050c14');canvas.paste(src,((size[0]-src.width)//2,(size[1]-src.height)//2));canvas.save(S/f'{i:02}-media.png')
 return im
for i,x in enumerate(shots):prepare(i,x)
(R/'scenes/shots.json').write_text(json.dumps(shots,indent=2))

def render(i,x):
 dur=x['duration'];n=dur*30;cmd=[FF,'-y','-v','warning','-threads','2','-loop','1','-framerate','30','-i',str(A/'network-original.png'),'-loop','1','-framerate','30','-i',str(S/f'{i:02}-overlay.png')]
 filters=[f"[0:v]zoompan=z='1.02+on*0.000004':x='iw/2-iw/zoom/2+sin(on/200)*10':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=30,setsar=1[bg]"]
 if x['media']:
  video=x['media'].endswith('.webm');path=A/x['media'] if video else S/f'{i:02}-media.png'
  if video:cmd+=['-i',str(path)]
  else:cmd+=['-loop','1','-framerate','30','-i',str(path)]
  w=870 if x['mode']=='detail' else 1380
  if video:filters.append(f'[2:v]fps=30,scale={w}:750:force_original_aspect_ratio=decrease,pad={w}:750:(ow-iw)/2:(oh-ih)/2:color=0x050c14,setsar=1,tpad=stop_mode=clone:stop_duration={dur},trim=duration={dur},setpts=PTS-STARTPTS[media]')
  else:filters.append(f"[2:v]zoompan=z='1.0+min(on*0.000018,0.018)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={w}x750:fps=30,setsar=1[media]")
  filters+=['[bg][media]overlay=64:205:shortest=1[layer]','[layer][1:v]overlay=0:0:shortest=1[base]']
 else:
  filters+=['[1:v]fade=t=in:st=0:d=0.65:alpha=1[fg]','[bg][fg]overlay=x=0:y=0:shortest=1[base]']
 # A moving packet motif gives the original network/architecture graphics continuous motion.
 if x['mode'] in ['intro','closing','architecture']:
  cmd+=['-loop','1','-framerate','30','-i',str(A/'packet.png')];filters.append("[base][2:v]overlay=x='90+mod(t*115,1700)':y=934:shortest=1[motion]");last='motion'
 else:last='base'
 filters.append(f'[{last}]format=yuv420p,fade=t=in:st=0:d=0.18,fade=t=out:st={dur-0.18}:d=0.18[out]')
 cmd+=['-filter_complex_threads','2','-filter_complex',';'.join(filters),'-map','[out]','-frames:v',str(n),'-an','-c:v','libx264','-preset','fast','-crf','18','-r','30','-pix_fmt','yuv420p','-movflags','+faststart',str(S/f'{i:02}.mp4')]
 with (S/f'{i:02}.log').open('w') as log:subprocess.run(cmd,stdout=log,stderr=log,check=True)
 print(f'Rendered shot {i+1}/{len(shots)} ({dur}s)',flush=True)
if '--prepare-only' in sys.argv:print('Prepared graphics and shot manifest');sys.exit()
selected = set(map(int, next((a.split('=',1)[1] for a in sys.argv if a.startswith('--shots=')), ','.join(map(str,range(len(shots))))).split(',')))
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(lambda z:render(*z),[(i,x) for i,x in enumerate(shots) if i in selected]))
concat=S/'concat.txt';concat.write_text('\n'.join(f"file '{S/f'{i:02}.mp4'}'" for i in range(len(shots))))
subprocess.run([FF,'-y','-v','warning','-f','concat','-safe','0','-i',str(concat),'-c','copy',str(S/'silent-master.mp4')],check=True)
# Burn readable captions plus embed a selectable subtitle stream. Normalize narration without music.
srt=R/'subtitles/CyberTrust360_Demo.srt';style="FontName=Arial,FontSize=9,PrimaryColour=&H00FFFFFF,OutlineColour=&H00100905,BorderStyle=1,Outline=1.3,Shadow=0,Alignment=2,MarginV=8"
cmd=[FF,'-y','-v','warning','-i',str(S/'silent-master.mp4'),'-i',str(A/'narration.wav'),'-i',str(srt),'-map','0:v:0','-map','1:a:0','-map','2:0','-vf',f"subtitles='{srt}':force_style='{style}'",'-af','loudnorm=I=-16:TP=-1.5:LRA=9','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','192k','-ar','48000','-c:s','mov_text','-metadata:s:s:0','language=eng','-t','225','-movflags','+faststart',str(R/'output/CyberTrust360_Final_Hackathon_Demo.mp4')]
subprocess.run(cmd,check=True);print('MASTER COMPLETE',flush=True)
