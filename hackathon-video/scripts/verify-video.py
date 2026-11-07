import pathlib,subprocess,re,json,hashlib,sys
from PIL import Image,ImageDraw,ImageFont,ImageStat
R=pathlib.Path(__file__).resolve().parents[1];FF='/Applications/BlueStacks.app/Contents/MacOS/ffmpeg';video=R/'output/CyberTrust360_Final_Hackathon_Demo.mp4';report=R/'reports';qa=report/'video-frames';qa.mkdir(exist_ok=True)
assert video.exists() and video.stat().st_size>100000
p=subprocess.run([FF,'-hide_banner','-i',str(video),'-map','0:v:0','-map','0:a:0','-f','null','-'],capture_output=True,text=True);(report/'video-full-decode.log').write_text(p.stderr);assert p.returncode==0
meta=p.stderr;duration=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',meta);seconds=int(duration[1])*3600+int(duration[2])*60+float(duration[3]);video_line=next(l for l in meta.splitlines() if 'Video: h264' in l);audio_line=next(l for l in meta.splitlines() if 'Audio: aac' in l)
resolution=re.search(r'(\d{3,4})x(\d{3,4})',video_line);fps=re.search(r'([\d.]+) fps',video_line);frames=re.findall(r'frame=\s*(\d+)',meta)
# Every shot midpoint, every scene boundary, and representative caption moments.
shots=json.loads((R/'scenes/shots.json').read_text());times=[];cursor=0
for x in shots:times.append(cursor+x['duration']/2);cursor+=x['duration']
times+= [0.8,19.8,20.3,44.8,45.3,64.8,65.3,94.8,95.3,124.8,125.3,149.8,150.3,189.8,190.3,209.8,210.3,224.0]
cues=json.loads((R/'subtitles/cues.json').read_text());times +=[(c['start']+c['end'])/2 for c in cues];times=sorted(set(round(t,2) for t in times));samples=[]
for i,t in enumerate(times):
 file=qa/f'{i:03}-{t:06.2f}.jpg';subprocess.run([FF,'-y','-v','error','-ss',str(t),'-i',str(video),'-frames:v','1','-q:v','2',str(file)],check=True);im=Image.open(file);samples.append({'time':t,'file':str(file.relative_to(R)),'mean_luminance':round(ImageStat.Stat(im.convert('L')).mean[0],2)})
for page in range((len(samples)+15)//16):
 sheet=Image.new('RGB',(1536,248*4),'#101827');d=ImageDraw.Draw(sheet)
 for j,s in enumerate(samples[page*16:(page+1)*16]):
  im=Image.open(R/s['file']);im.thumbnail((384,216));x=j%4*384;y=j//4*248;sheet.paste(im,(x,y));d.text((x+8,y+220),f'{s["time"]:.2f} sec',fill='white')
 sheet.save(report/f'video-contact-{page+1}.jpg')
# Exact stream decode plus black-frame duration scan. Short editorial fades are intentional.
b=subprocess.run([FF,'-hide_banner','-i',str(video),'-vf','blackdetect=d=0.5:pix_th=0.02','-an','-f','null','-'],capture_output=True,text=True);(report/'video-black-detect.log').write_text(b.stderr)
a=subprocess.run([FF,'-hide_banner','-i',str(video),'-vn','-af','volumedetect','-f','null','-'],capture_output=True,text=True);(report/'video-audio-levels.log').write_text(a.stderr)
srt=(R/'subtitles/CyberTrust360_Demo.srt').read_text();subtitle_entries=len(re.findall(r' --> ',srt));checks={'file':str(video),'bytes':video.stat().st_size,'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'duration_seconds':seconds,'resolution':[int(resolution[1]),int(resolution[2])],'fps':float(fps[1]),'decoded_video_frames':int(frames[-1]),'video_stream':video_line.strip(),'audio_stream':audio_line.strip(),'subtitle_stream_present':'Subtitle: mov_text' in meta,'srt_cue_count':subtitle_entries,'full_decode_exit':p.returncode,'black_intervals':re.findall(r'black_start:.*',b.stderr),'audio_mean_db':re.findall(r'mean_volume: ([^\n]+)',a.stderr),'audio_peak_db':re.findall(r'max_volume: ([^\n]+)',a.stderr),'sampled_frames':samples}
assert checks['resolution']==[1920,1080] and checks['fps']==30 and seconds==225 and checks['decoded_video_frames']==6750
(report/'video-properties.json').write_text(json.dumps(checks,indent=2));print(json.dumps({k:v for k,v in checks.items() if k!='sampled_frames'},indent=2))
