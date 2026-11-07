import json,pathlib,subprocess,wave,re
R=pathlib.Path(__file__).resolve().parents[1];FF='/Applications/BlueStacks.app/Contents/MacOS/ffmpeg';scenes=json.loads((R/'scenes/timeline.json').read_text());audio=R/'assets/narration';audio.mkdir(exist_ok=True);cues=[];script=['# CyberTrust 360 — English narration','Voice: installed macOS Samantha. Original script, no person impersonated.','']
for s in scenes:
 parts=[]
 for i,line in enumerate(s['narration']):
  stem=audio/f'{s["id"]:02}-{i:02}';subprocess.run(['say','-v','Samantha','-r','175','-o',str(stem.with_suffix('.aiff')),line],check=True);subprocess.run([FF,'-y','-v','error','-i',str(stem.with_suffix('.aiff')),'-af','atempo=1.15','-ar','48000','-ac','1',str(stem.with_suffix('.wav'))],check=True)
  with wave.open(str(stem.with_suffix('.wav'))) as w: frames=w.readframes(w.getnframes());dur=w.getnframes()/48000
  parts.append((line,frames,dur))
 total=sum(p[2] for p in parts);room=s['duration']-total
 if room<0:raise RuntimeError(f'Scene {s["id"]} narration overruns by {-room}s')
 gap=room/(len(parts)+1);position=s['start']+gap;data=b'\0'*int(gap*48000)*2
 script.append(f'## Scene {s["id"]}: {s["start"]}–{s["start"]+s["duration"]} seconds')
 for line,frames,dur in parts:
  cues.append({'start':position,'end':position+dur,'text':line});data+=frames+b'\0'*int(gap*48000)*2;position+=dur+gap;script.append(line+'\n')
 target=s['duration']*48000*2;data=(data+b'\0'*target)[:target]
 with wave.open(str(audio/f'scene-{s["id"]:02}.wav'),'wb') as w:w.setparams((1,2,48000,0,'NONE','not compressed'));w.writeframes(data)
 print(f'Scene {s["id"]}: speech {total:.2f}s in {s["duration"]}s',flush=True)
all_audio=b''
for s in scenes:
 with wave.open(str(audio/f'scene-{s["id"]:02}.wav')) as w:all_audio+=w.readframes(w.getnframes())
with wave.open(str(R/'assets/narration.wav'),'wb') as w:w.setparams((1,2,48000,0,'NONE','not compressed'));w.writeframes(all_audio)
def stamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
# Split long speech cues into readable clauses. Timing distributed by word count within the exact utterance.
import textwrap
sub=[]
for c in cues:
 words=c['text'].split();chunks=[];chunk=[]
 for word in words:
  if len(' '.join(chunk+[word]))>95:chunks.append(chunk);chunk=[]
  chunk.append(word)
 if chunk:chunks.append(chunk)
 t=c['start']
 for chunk in chunks:
  end=t+(c['end']-c['start'])*len(chunk)/len(words);sub.append((t,end,'\n'.join(textwrap.wrap(' '.join(chunk),width=52))));t=end
(R/'subtitles/CyberTrust360_Demo.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(a)} --> {stamp(b)}\n{t}' for i,(a,b,t) in enumerate(sub))+'\n');(R/'subtitles/cues.json').write_text(json.dumps(cues,indent=2));(R/'scripts/NARRATION_SCRIPT.md').write_text('\n'.join(script));print('Narration and subtitles completed.')
