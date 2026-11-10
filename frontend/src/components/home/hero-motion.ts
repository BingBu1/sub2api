type Point2 = { x: number; y: number }
type Point3 = [number, number, number]
type Projected = Point2 & { z: number; f: number }
type Orbit = { tilt: number; azimuth: number; radius: number; seed: number; phase: number; velocity: number; color: number[]; track: Point3[] }
type RibbonEdge = { left: Point2; right: Point2; depth: number; band: number }
type RibbonStrip = { section: RibbonEdge[]; z: number; face: CanvasGradient; shine: CanvasGradient; shadow: string }
type Badge = Point2 & { sizing: number; depth: number; approaching: boolean }

export function mountHeroMotion(root: HTMLElement, text: (key: string, params?: Record<string, string>) => string) {
  const cleanups: Array<() => void> = []
  const events = new AbortController()
  let disposed = false
  let refreshScene = () => {}
  let refreshTheme = () => {}
  const motionQuery = matchMedia('(prefers-reduced-motion:reduce)')
  function updateMotion() {
    root.classList.toggle('motion-paused', motionQuery.matches)
  }
  motionQuery.addEventListener('change', updateMotion, {signal:events.signal})
  updateMotion()
  function observeResize(callback: () => void, element: Element) {
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', callback, {signal:events.signal})
      return
    }
    const observer = new ResizeObserver(callback)
    observer.observe(element)
    cleanups.push(() => observer.disconnect())
  }
  function observeVisibility(callback: IntersectionObserverCallback, element: Element) {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(callback, { threshold: 0 })
    observer.observe(element)
    cleanups.push(() => observer.disconnect())
  }
    // Six independent rings rotate automatically; a pressed pointer controls the view.
    (()=>{
      const scene=root.querySelector<HTMLElement>('.orbit-scene')!,stage=scene.querySelector<HTMLElement>('.orbit-stage')!;
      const canvas=scene.querySelector<HTMLCanvasElement>('canvas')!,context=canvas.getContext('2d');
      if(!context)return;
      const ctx=context;
      const nodes=[...scene.querySelectorAll<HTMLButtonElement>('.orbit-node')],core=scene.querySelector<HTMLElement>('.orbit-core')!;
      const title=scene.querySelector<HTMLElement>('.orbit-detail-name')!,description=scene.querySelector<HTMLElement>('.orbit-detail p')!;
      const feature=scene.querySelector<HTMLElement>('.orbit-feature')!,featureIcon=feature.querySelector<HTMLElement>('.orbit-feature-icon')!,featureName=feature.querySelector<HTMLElement>('h3')!,featureDescription=feature.querySelector<HTMLElement>('.orbit-feature-description')!,featureTags=feature.querySelector<HTMLElement>('.orbit-feature-tags')!;
      const TAU=Math.PI*2,reduce=motionQuery;
      const models=[
        {name:'OpenAI',detailKey:'openaiDetail',tags:['openaiTag1','openaiTag2','openaiTag3'],color:'#168272',phase:5.6636},
        {name:'Claude',detailKey:'claudeDetail',tags:['claudeTag1','claudeTag2','claudeTag3'],color:'#b56845',phase:4.9829},
        {name:'Gemini',detailKey:'geminiDetail',tags:['geminiTag1','geminiTag2','geminiTag3'],color:'#526ac9',phase:4.3459},
        {name:'DeepSeek',detailKey:'deepseekDetail',tags:['deepseekTag1','deepseekTag2','deepseekTag3'],color:'#3268d8',phase:1.8762},
        {name:'Grok',detailKey:'grokDetail',tags:['grokTag1','grokTag2','grokTag3'],color:'#344a69',phase:6.0912},
        {name:'Kimi',detailKey:'kimiDetail',tags:['kimiTag1','kimiTag2','kimiTag3'],color:'#7553bf',phase:5.6112}
      ];
      const orbits:Orbit[]=models.map((m,i)=>({tilt:1.08,azimuth:i*TAU/6,radius:1.7,seed:i*TAU/6,phase:m.phase,velocity:0,color:[1,3,5].map(n=>parseInt(m.color.slice(n,n+2),16)),track:[]}));
      let width=0,height=0,scale=1,dpr=1,frame=0,last=0,visible=true,dragId:number|null=null,dragStart:{x:number;y:number}|null=null,dragDistance=0,dragSettleUntil=0,suppressClickUntil=0,lastTelemetry=0,hovered=-1,rendering=false,layoutTurn=0,driftTime=0;
      const view={yaw:-.42,pitch:.28,targetYaw:-.42,targetPitch:.28,spin:.17,lastInput:-Infinity,lastPointerMotion:-Infinity,lastPointer:null as {x:number;y:number}|null};
      const focus={index:-1,mode:'none',amount:0,until:0,travel:0,cooldown:0,candidate:-1,candidateSince:0,blocked:-1};
      let sizes=nodes.map(()=>({w:0,h:0})),logo={x:0,y:0,rx:1,ry:1};
      const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
      const wrapAngle=(v:number)=>Math.atan2(Math.sin(v),Math.cos(v));

      function localPoint(u:number,o:Orbit):Point3{
        const x=o.radius*Math.cos(u),y=o.radius*Math.sin(u)*Math.cos(o.tilt),z=o.radius*Math.sin(u)*Math.sin(o.tilt),c=Math.cos(o.azimuth),s=Math.sin(o.azimuth);
        return [x*c-y*s,x*s+y*c,z];
      }
      function camera(p:Point3,yaw=view.yaw,pitch=view.pitch):Point3{
        const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),x=p[0]*cy+p[2]*sy,z=-p[0]*sy+p[2]*cy;
        return [x,p[1]*cp-z*sp,p[1]*sp+z*cp];
      }
      function project(p:Point3){const f=1/(1-p[2]/8);return {x:width*.5+p[0]*scale*f,y:height*.455-p[1]*scale*f,z:p[2],f};}
      function alignment(p:Point3){
        const yaw=-Math.atan2(p[0],p[2]),horizontal=Math.hypot(p[0],p[2]);
        return {yaw:view.yaw+wrapAngle(yaw-view.yaw),pitch:Math.atan2(p[1],horizontal)};
      }
      function setModelContent(i:number){
        const m=models[i];featureIcon.replaceChildren(nodes[i].querySelector('svg')!.cloneNode(true));featureName.textContent=m.name;featureDescription.textContent=text(m.detailKey);
        featureTags.replaceChildren(...m.tags.map(key=>{const tag=document.createElement('span');tag.textContent=text(key);return tag;}));
        scene.style.setProperty('--focus-color',m.color);scene.style.setProperty('--model-color',m.color);
        feature.setAttribute('aria-label',text('showModel',{name:m.name}));
      }
      function updateUI(){
        const i=focus.index>=0?focus.index:hovered,m=models[i];
        scene.classList.toggle('is-focused',focus.index>=0);feature.inert=focus.index<0;feature.setAttribute('aria-hidden',String(focus.index<0));
        title.textContent=focus.index>=0?text('displaying',{name:m.name}):m?text('independent',{name:m.name}):text('defaultTitle');
        description.textContent=focus.index>=0?text('focusedDescription'):m?text(m.detailKey):text('idleDescription');
        scene.dataset.activeRing=String(i);scene.dataset.focusModel=focus.index>=0?models[focus.index].name:'';scene.dataset.focusSource=focus.mode;
        nodes.forEach((node,n)=>{node.classList.toggle('is-active',n===i);node.classList.toggle('is-dimmed',i>=0&&n!==i);node.setAttribute('aria-pressed',String(n===focus.index));});
        schedule();
      }
      function beginFocus(i:number,mode:string,now:number){
        if(i<0)return;
        focus.index=i;focus.mode=mode;focus.until=now+(mode==='magnet'?2900:6500);focus.travel=0;focus.candidate=-1;focus.blocked=i;
        const aligned=alignment(localPoint(orbits[i].phase,orbits[i]));view.targetYaw=aligned.yaw;view.targetPitch=aligned.pitch;view.spin=0;
        setModelContent(i);updateUI();
      }
      function releaseFocus(now:number){
        if(focus.index<0)return;
        focus.index=-1;focus.mode='none';focus.cooldown=now+480;focus.candidate=-1;view.lastInput=now-450;
        updateUI();
      }
      function moveView(x:number,y:number,spanX:number,spanY:number,now:number){
        const previous=view.lastPointer;view.lastPointer={x,y};if(!previous){view.lastInput=now;return;}
        const dx=x-previous.x,dy=y-previous.y,travel=Math.hypot(dx,dy);if(travel<.35)return;
        view.lastInput=now;view.lastPointerMotion=now;
        if(focus.index>=0){focus.travel+=travel;if(focus.travel<(width<500?34:48))return;releaseFocus(now);view.lastInput=now;}
        view.targetYaw+=dx/Math.max(1,spanX)*TAU*1.04;
        view.targetPitch=clamp(view.targetPitch+dy/Math.max(1,spanY)*Math.PI*1.35,-1.5,1.5);
      }
      function stepView(dt:number,now:number){
        if(focus.index>=0){
          if(now>focus.until&&!feature.matches(':focus-within'))releaseFocus(now);
          else{const a=alignment(localPoint(orbits[focus.index].phase,orbits[focus.index]));view.targetYaw=a.yaw;view.targetPitch=a.pitch;}
        }
        const idle=focus.index<0&&dragId===null&&now-view.lastInput>750;
        if(idle){
          driftTime+=dt;
          const tilt=.075*Math.cos(driftTime*.23)+.038*Math.sin(driftTime*.137+.5)-.08*(view.targetPitch-.28);
          view.targetPitch=clamp(view.targetPitch+tilt*dt,-1.45,1.45);
        }
        // Different slow frequencies change direction continuously without random jumps.
        const spin=idle?.105+.1*Math.sin(driftTime*.21+.7)+.075*Math.cos(driftTime*.137+1.1):0;
        view.spin+=(spin-view.spin)*(1-Math.exp(-dt*5));
        if(focus.index<0)view.targetYaw+=view.spin*dt;
        const ease=1-Math.exp(-dt*(focus.index>=0?8:6));
        view.yaw+=(view.targetYaw-view.yaw)*ease;view.pitch+=(view.targetPitch-view.pitch)*ease;
        return idle;
      }
      function logoDistance(p:Point2){
        return Math.hypot((p.x-logo.x)/logo.rx,(p.y-logo.y)/logo.ry);
      }
      function magnetCandidate(points:Projected[]){
        let candidate=-1,best=1;
        points.forEach((p,i)=>{const distance=logoDistance(p);if(p.z>.55&&distance<=best&&i!==focus.blocked){candidate=i;best=distance;}});
        return candidate;
      }
      function isDragFollowing(now:number){
        return ((dragId!==null&&dragDistance>=5)||now<dragSettleUntil)&&now-view.lastPointerMotion<=320&&!reduce.matches;
      }
      function detectMagnet(points:Projected[],now:number){
        if(!isDragFollowing(now)||focus.index>=0||now<focus.cooldown)return;
        if(focus.blocked>=0){const p=points[focus.blocked];if(logoDistance(p)>1.35||p.z<0)focus.blocked=-1;}
        const candidate=magnetCandidate(points);
        if(candidate>=0)beginFocus(candidate,'magnet',now);
      }

      const samples=240;
      orbits.forEach(o=>o.track=Array.from({length:samples+1},(_,i)=>localPoint(i/samples*TAU,o)));
      const rgba=(c:number[],a:number)=>`rgba(${c.map(Math.round).join(',')},${clamp(a,0,1)})`;
      // Choose positions on each ring near six evenly spaced screen sectors.
      // Independent positive/negative phase speeds eventually bunch every badge on one side.
      function distributeModels(dt:number,initial=false){
        // Keep each model on its orbit while dragging so it can reach the logo.
        if(focus.index>=0||dragId!==null||performance.now()<dragSettleUntil){orbits.forEach(o=>o.velocity=0);return;}
        const radius=scale*1.7,turn=layoutTurn+(view.yaw+.42)*.16;
        const occupied=orbits.map(o=>project(camera(localPoint(o.phase,o))));
        orbits.forEach((o,i)=>{
          const angle=-Math.PI/2+i*TAU/models.length+turn;
          const tx=width*.5+Math.cos(angle)*radius,ty=height*.455+Math.sin(angle)*radius;
          let best=o.phase,bestScore=Infinity;
          const scoreAt=(phase:number,p:Projected)=>{
            const dx=p.x-tx,dy=p.y-ty;
            const center=Math.hypot(p.x-width*.5,p.y-height*.455)/Math.max(1,radius);
            const crowding=initial?0:occupied.reduce((sum,other,k)=>{
              if(k===i)return sum;
              const gapX=(sizes[i].w+sizes[k].w)/2+18,gapY=(sizes[i].h+sizes[k].h)/2+16;
              return sum+Math.max(0,1.4-Math.hypot((p.x-other.x)/gapX,(p.y-other.y)/gapY))**2*4;
            },0);
            return (dx*dx+dy*dy)/(radius*radius)+Math.pow(Math.max(0,.64-center),2)*3+crowding+(initial?0:.6*(1-Math.cos(phase-o.phase)));
          };
          for(let j=0;j<samples;j+=3){
            const score=scoreAt(j/samples*TAU,project(camera(o.track[j])));
            if(score<bestScore){bestScore=score;best=j/samples*TAU;}
          }
          if(initial){o.phase=best;o.velocity=0;}
          else{
            // Refine the sampled minimum so badges follow a continuous target.
            const step=3/samples*TAU,left=scoreAt(best-step,project(camera(localPoint(best-step,o)))),right=scoreAt(best+step,project(camera(localPoint(best+step,o)))),curve=left-2*bestScore+right;
            if(curve>1e-6)best+=clamp(.5*(left-right)/curve,-.5,.5)*step;
            // Ease velocity as well as position when the best screen sector changes.
            const speed=clamp(wrapAngle(best-o.phase)*3.6,-.6,.6);
            o.velocity+=clamp((speed-o.velocity)*(1-Math.exp(-dt*5)),-.9*dt,.9*dt);
            o.phase+=o.velocity*dt;
          }
          occupied[i]=project(camera(localPoint(o.phase,o)));
        });
      }
      function draw(now:number){
        ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.lineJoin='round';ctx.lineCap='round';
        const active=focus.index>=0?focus.index:hovered,strips:RibbonStrip[]=[];
        orbits.forEach((o,i)=>{
          const points=o.track.map(p=>project(camera(p)));
          const edges=points.map((p,j)=>{
            const before=points[j?j-1:samples-1],after=points[j===samples?1:j+1],dx=after.x-before.x,dy=after.y-before.y,l=Math.hypot(dx,dy)||1,u=j/samples*TAU;
            const twist=.5+.5*Math.sin(u*2+o.seed+view.yaw*.45),depth=clamp((p.z+2.1)/4.2,0,1);
            const band=(2.1+7.1*twist)*(.72+depth*.45)*(width<500?.7:1);
            return {left:{x:p.x-dy/l*band/2,y:p.y+dx/l*band/2},right:{x:p.x+dy/l*band/2,y:p.y-dx/l*band/2},depth,band};
          });
          // Fixed lighting avoids a gradient flip when a ring turns edge-on.
          const light=scale*o.radius;
          const ends=[{x:width*.5-light*.65,y:height*.455+light*.9},{x:width*.5+light*.65,y:height*.455-light*.9}];
          const base=o.color.map((v,k)=>v*.24+[93,122,180][k]*.76),chosen=i===active,dim=active>=0&&!chosen,strength=dim?.31:chosen?1.06:.94;
          const face=ctx.createLinearGradient(ends[0].x,ends[0].y,ends[1].x,ends[1].y),shine=ctx.createLinearGradient(ends[0].x,ends[0].y,ends[1].x,ends[1].y);
          face.addColorStop(0,rgba(base.map(v=>v*.48),.16*strength));
          face.addColorStop(.35,rgba(base.map(v=>v*.64),.4*strength));
          face.addColorStop(.68,rgba(base.map(v=>Math.min(255,v*1.12)),.76*strength));
          face.addColorStop(1,rgba(base.map(v=>v*.76),.76*strength));
          shine.addColorStop(0,rgba(base,.12*strength));shine.addColorStop(.5,rgba(base,.52*strength));shine.addColorStop(.82,rgba([233,240,255],.95*strength));shine.addColorStop(1,rgba(o.color,.6*strength));
          let start=0;
          for(let j=1;j<=samples;j++){
            if(j===samples||(points[j].z>=0)!==(points[j-1].z>=0)){
              const section=edges.slice(start,j+1),z=points.slice(start,j+1).reduce((sum,p)=>sum+p.z,0)/(j-start+1);
              strips.push({section,z,face,shine,shadow:rgba(base.map(v=>v*.42),.45*strength)});start=j;
            }
          }
        });
        strips.sort((a,b)=>a.z-b.z);
        strips.forEach(s=>{
          ctx.beginPath();s.section.forEach((e,j)=>j?ctx.lineTo(e.left.x,e.left.y):ctx.moveTo(e.left.x,e.left.y));
          for(let j=s.section.length-1;j>=0;j--)ctx.lineTo(s.section[j].right.x,s.section[j].right.y);
          ctx.closePath();ctx.fillStyle=s.face;ctx.fill();
          ctx.beginPath();s.section.forEach((e,j)=>j?ctx.lineTo(e.left.x,e.left.y):ctx.moveTo(e.left.x,e.left.y));ctx.strokeStyle=s.shine;ctx.lineWidth=.95;ctx.stroke();
          ctx.beginPath();s.section.forEach((e,j)=>j?ctx.lineTo(e.right.x,e.right.y):ctx.moveTo(e.right.x,e.right.y));ctx.strokeStyle=s.shadow;ctx.lineWidth=.65;ctx.stroke();
        });
        orbits.forEach((o,i)=>{
          const trail=.38,points=Array.from({length:28},(_,j)=>project(camera(localPoint(o.phase-trail+j/27*trail,o))));
          const g=ctx.createLinearGradient(points[0].x,points[0].y,points.at(-1)!.x,points.at(-1)!.y),dim=active>=0&&i!==active;
          g.addColorStop(0,rgba(o.color,0));g.addColorStop(1,rgba(o.color,dim?.18:.9));ctx.beginPath();points.forEach((p,j)=>j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=g;ctx.lineWidth=active===i?3:2;ctx.stroke();
        });
        const raw=orbits.map(o=>project(camera(localPoint(o.phase,o))));
        const pointerFollowing=isDragFollowing(now);
        detectMagnet(raw,now);
        const badges:Badge[]=raw.map(p=>{
          const depth=clamp((p.z+2.1)/4.2,0,1),sizing=.8+depth*.22;
          return {x:p.x,y:p.y,sizing,depth,approaching:focus.index<0&&pointerFollowing&&p.z>.55&&logoDistance(p)<2.6};
        });
        nodes.forEach((node,i)=>{
          const b=badges[i],isFocus=i===focus.index;
          if(isFocus){b.x+=(width*.5-b.x)*focus.amount;b.y+=(height*.455-b.y)*focus.amount;}
          node.style.transform=`translate3d(${b.x.toFixed(2)}px,${b.y.toFixed(2)}px,0) translate(-50%,-50%) scale(${(b.sizing+(isFocus?focus.amount*.32:0)).toFixed(3)})`;
          node.style.opacity=String(isFocus?1-focus.amount:focus.index>=0?.86+b.depth*.10:.95+b.depth*.05);
          node.style.pointerEvents=isFocus?'none':'auto';node.style.zIndex=String(b.approaching&&focus.index<0?24:3+Math.round(b.depth*15));
        });
      }
      function render(now:number){
        frame=0;rendering=true;const dt=last?Math.min((now-last)/1000,.045):0;last=now;
        const paused=reduce.matches;
        let idle=focus.index<0&&dragId===null&&now-view.lastInput>750;
        if(!paused){idle=stepView(dt,now);if(idle)layoutTurn+=dt*.024;distributeModels(dt);}
        focus.amount=reduce.matches?(focus.index>=0?1:0):focus.amount+((focus.index>=0?1:0)-focus.amount)*(1-Math.exp(-dt*10));
        if(width&&height)draw(now);
        scene.dataset.motion=reduce.matches?'reduced':'running';scene.dataset.control=focus.index>=0?'snapped':dragId!==null?'dragging':idle?'auto':'settling';
        if(now-lastTelemetry>160){scene.dataset.rotation=view.yaw.toFixed(4);scene.dataset.pitch=view.pitch.toFixed(4);scene.dataset.focusAmount=focus.amount.toFixed(3);lastTelemetry=now;}
        const transitioning=Math.abs((focus.index>=0?1:0)-focus.amount)>.002;
        rendering=false;
        if(visible&&!document.hidden&&(!paused||transitioning))frame=requestAnimationFrame(render);
      }
      function schedule(){if(!disposed&&!rendering&&!frame&&visible&&!document.hidden)frame=requestAnimationFrame(render);}
      function measureLayout(){
        sizes=nodes.map(node=>({w:node.offsetWidth,h:node.offsetHeight}));
        logo={x:core.offsetLeft,y:core.offsetTop,rx:Math.max(1,core.offsetWidth/2),ry:Math.max(1,core.offsetHeight/2)};
      }
      function resize(){const r=stage.getBoundingClientRect();width=r.width;height=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr));scale=Math.min(width*.31,height*.37)/1.75;measureLayout();distributeModels(1,true);schedule();}

      nodes.forEach((node,i)=>{
        node.dataset.orbit=String(i);
        node.addEventListener('pointerenter',()=>{hovered=i;updateUI();}, {signal:events.signal});node.addEventListener('pointerleave',()=>{hovered=-1;updateUI();}, {signal:events.signal});
        node.addEventListener('click',()=>{const now=performance.now();if(focus.index===i)releaseFocus(now);else beginFocus(i,'select',now);}, {signal:events.signal});
        node.addEventListener('keydown',e=>{if(e.key==='Escape'){releaseFocus(performance.now());node.blur();}if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?5:(i+(e.key==='ArrowRight'?1:5))%6;nodes[next].focus();}}, {signal:events.signal});
      });
      feature.querySelector<HTMLButtonElement>('.orbit-feature-close')!.addEventListener('click',()=>{releaseFocus(performance.now());stage.focus({preventScroll:true});}, {signal:events.signal});
      feature.addEventListener('keydown',e=>{if(e.key==='Escape'){releaseFocus(performance.now());stage.focus({preventScroll:true});}}, {signal:events.signal});
      scene.querySelectorAll<HTMLButtonElement>('[data-orbit-step]').forEach(button=>button.addEventListener('click',()=>{const next=((focus.index>=0?focus.index:-1)+Number(button.dataset.orbitStep)+6)%6;beginFocus(next,'select',performance.now());}, {signal:events.signal}));
      stage.addEventListener('pointerdown',event=>{
        if(event.button!==0||dragId!==null||reduce.matches||(event.target instanceof Element && event.target.closest('.orbit-feature')))return;
        dragId=event.pointerId;dragStart={x:event.clientX,y:event.clientY};dragDistance=0;dragSettleUntil=0;view.lastPointer={...dragStart};view.lastInput=performance.now();
      }, {signal:events.signal});
      window.addEventListener('pointermove',event=>{
        if(event.pointerId!==dragId||!dragStart||reduce.matches)return;
        dragDistance=Math.max(dragDistance,Math.hypot(event.clientX-dragStart.x,event.clientY-dragStart.y));
        if(dragDistance<5)return;
        if(!stage.hasPointerCapture(event.pointerId))stage.setPointerCapture(event.pointerId);
        stage.classList.add('is-dragging');
        moveView(event.clientX,event.clientY,width,height,performance.now());schedule();
      },{...{passive:true},signal:events.signal});
      function endDrag(event:PointerEvent){
        if(event.pointerId!==dragId)return;
        const now=performance.now();
        if(dragDistance>=5)suppressClickUntil=now+350;
        // Let a released drag finish easing into the logo; cancelled gestures never snap.
        dragSettleUntil=event.type==='pointerup'&&dragDistance>=5?now+320:0;
        dragId=null;dragStart=null;dragDistance=0;view.lastPointer=null;view.lastInput=now;
        stage.classList.remove('is-dragging');
        if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
        schedule();
      }
      window.addEventListener('pointerup',endDrag, {signal:events.signal});window.addEventListener('pointercancel',endDrag, {signal:events.signal});stage.addEventListener('lostpointercapture',endDrag, {signal:events.signal});
      stage.addEventListener('click',event=>{if(performance.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}},{capture:true,signal:events.signal});
      stage.addEventListener('dragstart',event=>event.preventDefault(), {signal:events.signal});
      stage.tabIndex=0;stage.setAttribute('role','group');stage.setAttribute('aria-label',text('stageLabel'));
      stage.addEventListener('keydown',event=>{
        if(event.target!==stage)return;const now=performance.now();
        if(event.key==='Escape'){releaseFocus(now);return;}
        if(event.key==='Enter'){event.preventDefault();const points=orbits.map(o=>project(camera(localPoint(o.phase,o))));let best=0;points.forEach((p,i)=>{if(p.z>points[best].z)best=i;});beginFocus(best,'select',now);return;}
        if(reduce.matches||!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home'].includes(event.key))return;
        event.preventDefault();releaseFocus(now);view.lastInput=now;
        if(event.key==='ArrowRight')view.targetYaw+=Math.PI/10;if(event.key==='ArrowLeft')view.targetYaw-=Math.PI/10;
        if(event.key==='ArrowUp')view.targetPitch=clamp(view.targetPitch-.2,-1.5,1.5);if(event.key==='ArrowDown')view.targetPitch=clamp(view.targetPitch+.2,-1.5,1.5);
        if(event.key==='Home'){view.targetYaw=Math.round(view.yaw/TAU)*TAU-.42;view.targetPitch=.28;}schedule();
      }, {signal:events.signal});
      reduce.addEventListener('change',()=>{view.lastPointer=null;last=0;schedule();}, {signal:events.signal});
      document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();}, {signal:events.signal});
      observeVisibility(entries=>{visible=entries[0].isIntersecting;last=0;if(!visible){cancelAnimationFrame(frame);frame=0;}else schedule();},scene);
      cleanups.push(()=>{cancelAnimationFrame(frame);stage.classList.remove('is-dragging');});
      refreshScene=()=>{measureLayout();stage.setAttribute('aria-label',text('stageLabel'));if(focus.index>=0)setModelContent(focus.index);updateUI();};
      nodes.forEach(node=>observeResize(measureLayout,node));observeResize(measureLayout,core);
      canvas.dataset.renderer='circular-ribbons';canvas.dataset.orbitCount='6';stage.dataset.interaction='drag';scene.dataset.distribution='orbit-bound';observeResize(resize,stage);resize();updateUI();
    })();


    // The approved space-warp background, anchored to the sphere at 150% intensity.
    (()=>{
      const region=root.querySelector<HTMLElement>('.hero-visual')!,canvas=region.querySelector<HTMLCanvasElement>('.hero-flow')!,stage=region.querySelector<HTMLElement>('.orbit-stage')!;
      const context=canvas.getContext('2d',{alpha:false});if(!context)return;
      const ctx=context;
      const fract=(n:number)=>n-Math.floor(n),seed=(n:number)=>fract(Math.sin(n*127.1+311.7)*43758.5453),TAU=Math.PI*2;
      const intensity=1.5;
      let width=1,height=1,dpr=1,cx=0,cy=0,visible=true,frame=0,last=0,time=14,particleCount=330;
      let palette={bg:'#f7f9fd',halo:'#dce7fd',mint:'#e4f3f1',particle:'67, 106, 187',dot:'47, 94, 180'};
      // Read theme values only when the theme changes, including while motion is paused.
      refreshTheme=()=>{
        const style=getComputedStyle(root);
        const color=(key:string,fallback:string)=>style.getPropertyValue(`--zk-${key}`).trim()||fallback;
        palette={bg:color('bg','#f7f9fd'),halo:color('hero-halo','#dce7fd'),mint:color('hero-mint','#e4f3f1'),particle:color('particle','67, 106, 187'),dot:color('particle-dot','47, 94, 180')};
        draw();
      };
      function draw(){
        ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=palette.bg;ctx.fillRect(0,0,width,height);
        const radius=width*.55;
        ctx.save();ctx.translate(cx,cy);ctx.scale(1,.72);
        const halo=ctx.createRadialGradient(0,0,0,0,0,radius);
        halo.addColorStop(0,palette.halo);halo.addColorStop(.6,palette.mint);halo.addColorStop(1,`${palette.bg}00`);
        ctx.globalAlpha=Math.min(1,.7*intensity);ctx.fillStyle=halo;ctx.fillRect(-radius,-radius,2*radius,2*radius);ctx.restore();
        for(let i=0;i<particleCount;i++){
          const u=fract(seed(i+30)+time*(.03+seed(i+9)*.025));
          const angle=seed(i+400)*TAU,spread=.045+u*u*1.35;
          const x=cx+Math.cos(angle)*spread*width,y=cy+Math.sin(angle)*spread*height*.96;
          const tail=.002+u**4*.024,back=Math.max(.045,spread-tail),alpha=Math.sin(u*Math.PI)*(.25+u*.52);
          const x0=cx+Math.cos(angle)*back*width,y0=cy+Math.sin(angle)*back*height*.96;
          ctx.strokeStyle=`rgba(${palette.particle},${Math.min(1,alpha*intensity)})`;ctx.lineWidth=.6+u*1.2;
          ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x,y);ctx.stroke();
          ctx.fillStyle=`rgba(${palette.dot},${Math.min(1,alpha*intensity)})`;ctx.beginPath();ctx.arc(x,y,.45+u*.9,0,TAU);ctx.fill();
        }
        const quiet=ctx.createLinearGradient(0,0,width*.63,0);
        quiet.addColorStop(0,`${palette.bg}dc`);quiet.addColorStop(.48,`${palette.bg}94`);quiet.addColorStop(1,`${palette.bg}00`);
        ctx.fillStyle=quiet;ctx.fillRect(0,0,width,height);
      }
      function measure(){
        const box=region.getBoundingClientRect(),s=stage.getBoundingClientRect();
        if(!box.width||!box.height)return;
        width=box.width;height=box.height;dpr=Math.min(devicePixelRatio||1,1.5,1800/width);
        canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr));
        particleCount=width<650?160:330;canvas.dataset.particles=String(particleCount);
        cx=s.left-box.left+s.width*.5;cy=s.top-box.top+s.height*.455;
        canvas.dataset.anchorX=(cx/width).toFixed(4);canvas.dataset.anchorY=(cy/height).toFixed(4);draw();
      }
      function render(now:number){
        frame=0;if(!visible||document.hidden)return;
        if(!last||now-last>=1000/30){time+=last?Math.min((now-last)/1000,.1):0;last=now;draw();}
        if(!motionQuery.matches)frame=requestAnimationFrame(render);
      }
      function schedule(){if(!disposed&&!frame&&visible&&!document.hidden){last=0;frame=requestAnimationFrame(render);}}
      function sync(){canvas.dataset.motion=motionQuery.matches?'reduced':'running';if(motionQuery.matches){cancelAnimationFrame(frame);frame=0;}else schedule();}
      observeResize(measure,region);observeResize(measure,stage);
      observeVisibility(entries=>{visible=entries[0].isIntersecting;if(!visible){cancelAnimationFrame(frame);frame=0;last=0;}else if(!motionQuery.matches)schedule();},region);
      motionQuery.addEventListener('change',sync, {signal:events.signal});
      document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else if(!motionQuery.matches)schedule();}, {signal:events.signal});
      cleanups.push(()=>cancelAnimationFrame(frame));
      canvas.dataset.scope='hero';canvas.dataset.effect='warp';canvas.dataset.intensity=String(intensity);canvas.dataset.renderer='canvas2d';refreshTheme();measure();sync();
    })();


  return {
    refresh() { updateMotion(); refreshScene() },
    refreshTheme() { refreshTheme() },
    destroy() {
      disposed = true
      events.abort()
      cleanups.forEach(cleanup => cleanup())
    }
  }
}
