// Coordinates are fish centres; zero degrees points right. No DOM or wall clock.
const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const dimension = (value, fallback) => Number.isFinite(value) ? Math.max(0, value) : fallback;
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

export function createSchool(count, { width = 320, height = 500, seed = 1 } = {}) {
  width = dimension(width, 320);
  height = dimension(height, 500);
  count = Number.isFinite(count) ? clamp(Math.floor(count), 1, 10) : 1;
  let state = (Number(seed) >>> 0) || 1;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  // 64 × 44 targets need a 39px radius even while rotating.
  const bounds = () => ({ mx: Math.min(40, width / 2), my: Math.min(40, height / 2) });
  const { mx, my } = bounds();
  const columns = Math.min(count, Math.max(1, Math.ceil(Math.sqrt(count * width / Math.max(1, height)))));
  const rows = Math.ceil(count / columns);
  const fish = Array.from({ length: count }, (_, id) => ({
    id,
    x: mx + (width - 2 * mx) * ((id % columns + 0.5) / columns),
    y: my + (height - 2 * my) * ((Math.floor(id / columns) + 0.5) / rows),
    heading: random() * TAU,
    phase: random() * TAU,
    timer: 1.5 + random() * 3,
    rest: false,
    pace: 0.65 + random() * 0.5,
    velocity: 0,
    escape: 0,
    escapeTurn: 0,
  }));
  let elapsed = 0;
  const snapshot = () => fish.map(({ id, x, y, heading }) => ({ id, x, y, angle: heading * 180 / Math.PI }));

  function advance(dt, baseSpeed) {
    elapsed += dt;
    const { mx, my } = bounds();
    // All fish steer against the same frame, avoiding update-order bias.
    const positions = fish.map(({ x, y }) => ({ x, y }));
    fish.forEach((f, index) => {
      f.timer -= dt;
      f.escape = Math.max(0, f.escape - dt);
      if (f.timer <= 0) {
        f.rest = !f.rest;
        f.timer = f.rest ? 0.25 + random() * 0.65 : 2 + random() * 4;
        if (!f.rest) f.pace = 0.65 + random() * 0.5;
      }
      let desired = f.heading + (Math.sin(elapsed * 0.65 + f.phase) * 0.6 + Math.sin(elapsed * 1.37 + f.phase) * 0.2) * dt;
      if (f.escape > 0) desired += f.escapeTurn * dt;
      let sx = 0;
      let sy = 0;
      const edge = 55;
      const aheadX = f.x + Math.cos(f.heading) * 25;
      const aheadY = f.y + Math.sin(f.heading) * 25;
      sx += Math.max(0, (mx + edge - aheadX) / edge) - Math.max(0, (aheadX - (width - mx - edge)) / edge);
      sy += Math.max(0, (my + edge - aheadY) / edge) - Math.max(0, (aheadY - (height - my - edge)) / edge);
      positions.forEach((other, otherIndex) => {
        if (index === otherIndex) return;
        const dx = f.x - other.x;
        const dy = f.y - other.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < 62) {
          const strength = (1 - distance / 62) * 1.6;
          sx += dx / distance * strength;
          sy += dy / distance * strength;
        }
      });
      const force = Math.hypot(sx, sy);
      if (force > 0.001) {
        desired += wrap(Math.atan2(sy, sx) - desired) * Math.min(1, force * 1.8 * dt);
      }
      const turn = clamp(wrap(desired - f.heading), -2.6 * dt, 2.6 * dt);
      f.heading = wrap(f.heading + turn);
      const targetSpeed = f.rest && !f.escape ? 0 : baseSpeed * f.pace * (f.escape > 0 ? 1.2 : 1);
      f.velocity += (targetSpeed - f.velocity) * Math.min(1, dt * 3);
      f.x = clamp(f.x + Math.cos(f.heading) * f.velocity * dt, mx, width - mx);
      f.y = clamp(f.y + Math.sin(f.heading) * f.velocity * dt, my, height - my);
    });
  }

  return {
    snapshot,
    step(dtSeconds, speed = 'slow') {
      const baseSpeed = ({ still: 0, slow: 45, medium: 75, normal: 75, fast: 110 })[speed] ?? 45;
      if (!baseSpeed || !Number.isFinite(dtSeconds) || dtSeconds <= 0) return snapshot();
      // Background-tab gaps cannot send a fish across the tank in one frame.
      let remaining = Math.min(dtSeconds, 0.1);
      while (remaining > 1e-8) {
        const dt = Math.min(remaining, 1 / 60);
        advance(dt, baseSpeed);
        remaining -= dt;
      }
      return snapshot();
    },
    scatter(index) {
      if (!Number.isInteger(index) || !fish[index]) return;
      fish[index].escape = 0.8;
      fish[index].escapeTurn = random() < 0.5 ? -1.8 : 1.8;
    },
    resize(nextWidth, nextHeight) {
      const previousWidth = width;
      const previousHeight = height;
      width = dimension(nextWidth, width);
      height = dimension(nextHeight, height);
      const { mx, my } = bounds();
      fish.forEach(f => {
        f.x = clamp(previousWidth ? f.x / previousWidth * width : width / 2, mx, width - mx);
        f.y = clamp(previousHeight ? f.y / previousHeight * height : height / 2, my, height - my);
      });
    },
  };
}

// Counts discrete pointer touches, not inferred animal activity.
export function createHitCounter() {
  const held = new Set();
  let count = 0;
  return {
    down(pointerId, fishIndex, playing = true) {
      if (held.has(pointerId)) return false;
      held.add(pointerId);
      if (!playing || !Number.isInteger(fishIndex) || fishIndex < 0 || fishIndex > 9) return false;
      count += 1;
      return true;
    },
    // Both pointerup and pointercancel release the pointer.
    up(pointerId) { held.delete(pointerId); },
    reset() { count = 0; held.clear(); },
    get count() { return count; },
  };
}

// A session is a queue, not a simultaneous school. Only an exiting fish may
// share the field with the next entrant. Time is active animation time only.
export const FISH_SPEED_CAP=150;
export const FISH_TURBO_SPEED_CAP=240;
// Escape dash after a touch: speed rises up to 3.6× (bounded by FISH_ESCAPE_CAP px/s), then fades.
export const FISH_ESCAPE_BOOST=2.6;
export const FISH_ESCAPE_CAP=420;
export const FISH_ESCAPE_SECONDS=0.9;
const FISH_ESCAPE_BOOST_REDUCED=0.6;
const FISH_ESCAPE_CAP_REDUCED=100;
const ROUTE_EDGES=['left','right','top','bottom'];
const opposite={left:'right',right:'left',top:'bottom',bottom:'top'};
const bezier=(points,t)=>{
 const [a,b,c,d]=points,u=1-t;
 return {x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,
  y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y,
  dx:3*u*u*(b.x-a.x)+6*u*t*(c.x-b.x)+3*t*t*(d.x-c.x),
  dy:3*u*u*(b.y-a.y)+6*u*t*(c.y-b.y)+3*t*t*(d.y-c.y)};
};
export function createFishSequence(count,{width=320,height=440,seed=1,randomRoutes=false,loop=false,reducedMotion=false,targetRadius=40}={}){
 const margin=Number.isFinite(targetRadius)?Math.max(40,targetRadius):40;
 width=Math.max(1,dimension(width,320));height=Math.max(1,dimension(height,440));
 count=Number.isFinite(count)?clamp(Math.floor(count),1,10):1;
 let rng=(Number(seed)>>>0)||1,elapsed=0,launched=0,passed=0,active=[],currentSpeed=45,edgeBag=[],lastEntry=null;
 const varied=randomRoutes&&!reducedMotion;
 const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
 const nextEntry=()=>{
  if(!edgeBag.length){edgeBag=[...ROUTE_EDGES];for(let i=3;i>0;i--){const j=Math.floor(random()*(i+1));[edgeBag[i],edgeBag[j]]=[edgeBag[j],edgeBag[i]];}
   if(edgeBag[0]===lastEntry)[edgeBag[0],edgeBag[1]]=[edgeBag[1],edgeBag[0]];}
  lastEntry=edgeBag.shift();return lastEntry;
 };
 const edgePoint=(edge,lane,depth=0)=>({
  left:{x:depth,y:height*lane},right:{x:width-depth,y:height*lane},
  top:{x:width*lane,y:depth},bottom:{x:width*lane,y:height-depth}
 })[edge];
 const routePoints=f=>{
  const entryDepth=(f.entry==='left'||f.entry==='right'?width:height)*f.depthA;
  const exitDepth=(f.exit==='left'||f.exit==='right'?width:height)*f.depthB;
  return [edgePoint(f.entry,f.laneA,-margin),edgePoint(f.entry,f.laneA,entryDepth),edgePoint(f.exit,f.laneB,exitDepth),edgePoint(f.exit,f.laneB,-margin)];
 };
 const sample=(f,t)=>{
  if(f.curved){
   const p=bezier(f.points,t),window=n=>n<=0||n>=1?{v:0,d:0}:{v:16*n*n*(1-n)*(1-n),d:32*n*(1-n)*(1-2*n)};
   const wx=window(p.x/width),wy=window(p.y/height),envelope=wx.v*wy.v,derivative=wx.d*p.dx/width*wy.v+wx.v*wy.d*p.dy/height;
   const amplitude=Math.min(width,height)*f.weave;
   const wave=(frequency,phase)=>{const a=frequency*t+phase;return {v:amplitude*envelope*Math.sin(a),d:amplitude*(derivative*Math.sin(a)+envelope*frequency*Math.cos(a))};};
   const x=wave(f.frequency,f.phase),y=wave(f.frequency*.83,f.phase+1.9);
   return {x:p.x+x.v,y:p.y+y.v,dx:p.dx+x.d,dy:p.dy+y.d};
  }
  const span=width+2*margin,turn=TAU*t,wave=Math.sin(Math.PI*t)*Math.sin(turn),amplitude=reducedMotion?0:.045;
  return {x:-margin+t*span,y:height*.5+height*amplitude*wave,dx:span,
   dy:height*amplitude*(Math.PI*Math.cos(Math.PI*t)*Math.sin(turn)+TAU*Math.sin(Math.PI*t)*Math.cos(turn))};
 };
 const measure=f=>{
  f.points=routePoints(f);f.lengths=[0];let previous=sample(f,0);
  for(let i=1;i<=180;i++){const point=sample(f,i/180);f.lengths.push(f.lengths[i-1]+Math.hypot(point.x-previous.x,point.y-previous.y));previous=point;}
  f.length=f.lengths[180];
 };
 const smoothEnough=f=>{
  const minRadius=Math.min(45,Math.min(width,height)*.18);
  for(let i=0;i<=120;i++){const t=i/120,p=sample(f,t),left=sample(f,Math.max(0,t-.0001)),right=sample(f,Math.min(1,t+.0001)),span=Math.min(1,t+.0001)-Math.max(0,t-.0001),ddx=(right.dx-left.dx)/span,ddy=(right.dy-left.dy)/span;
   const length=Math.hypot(p.dx,p.dy),curvature=Math.abs(p.dx*ddy-p.dy*ddx)/Math.max(1e-8,length**3);
   if(length<.01||curvature>1/minRadius)return false;
  }return true;
 };
 const parameter=f=>{
  const distance=Math.min(f.distance,f.length);let lo=0,hi=180;
  while(lo+1<hi){const mid=(lo+hi)>>1;if(f.lengths[mid]<distance)lo=mid;else hi=mid;}
  return (lo+(distance-f.lengths[lo])/(f.lengths[hi]-f.lengths[lo]||1))/180;
 };
 const coordinates=f=>{const point=sample(f,parameter(f));return {...point,angle:Math.atan2(point.dy,point.dx)*180/Math.PI};};
 const make=(first=false)=>{
  const entry=varied?nextEntry():'left',laneA=varied?.12+random()*.76:.5;
  let exit=varied?ROUTE_EDGES.filter(e=>e!==entry)[Math.floor(random()*3)]:'right',laneB=varied?.12+random()*.76:.5;
  if(varied){
   // Adjacent-edge trips must cross meaningful space, not skim a corner.
   const norm=(edge,lane)=>({left:[0,lane],right:[1,lane],top:[lane,0],bottom:[lane,1]})[edge];
   const a=norm(entry,laneA);let b=norm(exit,laneB);
   if(Math.hypot(a[0]-b[0],a[1]-b[1])<.62){laneB=laneB<.5?.76+random()*.12:.12+random()*.12;b=norm(exit,laneB);}
   if(Math.hypot(a[0]-b[0],a[1]-b[1])<.62)exit=opposite[entry];
  }
  const f={id:launched++,number:(launched-1)%count+1,curved:varied,entry,exit,laneA,laneB,depthA:.28+random()*.3,depthB:.28+random()*.3,weave:varied?.13+random()*.07:0,frequency:Math.PI*(3+random()*2),phase:random()*TAU,pacePhase:random()*TAU,pacePeriod:1.4+random()*2,age:0,velocity:null,distance:0,boost:0};
  measure(f);
  // Keep turns broad enough for a 64px fish, including narrow/landscape fields.
  for(let attempt=0;f.curved&&!smoothEnough(f)&&attempt<16;attempt++){f.weave*=.72;if(attempt>=5){f.exit=opposite[f.entry];f.laneB=(f.laneA+f.laneB)/2;f.depthA=f.depthB=.45;}measure(f);}
  if(first){const inset=targetRadius===40?32:margin,mx=Math.min(inset,width/2),my=Math.min(inset,height/2);let i=1;
   for(;i<180;i++){const p=sample(f,i/180);if(p.x>=mx&&p.x<=width-mx&&p.y>=my&&p.y<=height-my)break;}
   f.distance=f.lengths[i<180?i:90];
  }
  return f;
 };
 active.push(make(true));
 const snapshot=()=>active.map(f=>{const {x,y,angle}=coordinates(f);return {id:f.id,number:f.number,x,y,angle,entryEdge:f.entry,exitEdge:f.exit,velocity:f.velocity,dash:f.boost};});
 const canLaunch=()=>loop||launched<count;
 const exiting=f=>{const {x,y}=coordinates(f);return ({left:x<=-8,right:x>=width+8,top:y<=-8,bottom:y>=height+8})[f.exit];};
 return {
  snapshot,
  get progress(){return {total:count,launched,passed,finished:!loop&&passed===count,speed:currentSpeed,elapsed};},
  step(seconds,speed='slow'){
   if(!Number.isFinite(seconds)||seconds<=0||(!loop&&passed===count))return snapshot();
   let remaining=Math.min(seconds,.1);
   while(remaining>1e-8){
    const dt=Math.min(remaining,1/120);remaining-=dt;elapsed+=dt;
    const base=reducedMotion?35:({slow:45,normal:70,fast:100,turbo:160}[speed]??45);
    const cap=reducedMotion?65:speed==='turbo'?FISH_TURBO_SPEED_CAP:FISH_SPEED_CAP;
    currentSpeed=Math.min(cap,base+elapsed*(speed==='turbo'?2.4:1.8));
    for(const [index,f] of active.entries()){
     f.age+=dt;
     const pace=varied?.84+.22*Math.sin(f.age*TAU/f.pacePeriod+f.pacePhase)+.1*Math.sin(f.age*TAU/(f.pacePeriod*2.3)+f.pacePhase*.7):1;
     const targetSpeed=Math.min(cap,currentSpeed*pace,index>0?(active[0].velocity??currentSpeed)*.8:cap);
     if(f.velocity===null)f.velocity=targetSpeed;
     f.velocity+=clamp(targetSpeed-f.velocity,-85*dt,85*dt);
     // A caught fish darts ahead along its route; the burst fades in about a second.
     const burst=1+f.boost*(reducedMotion?FISH_ESCAPE_BOOST_REDUCED:FISH_ESCAPE_BOOST);
     const limit=f.boost>0?Math.max(cap,Math.min(reducedMotion?FISH_ESCAPE_CAP_REDUCED:FISH_ESCAPE_CAP,cap*burst)):cap;
     f.boost=Math.max(0,f.boost-dt/FISH_ESCAPE_SECONDS);
     const before=coordinates(f),start=f.distance,budget=Math.min(limit,f.velocity*burst)*dt,target=Math.min(f.length,start+budget);
     f.distance=target;let after=coordinates(f);
     // LUT interpolation is approximate: enforce the speed cap on actual pixels.
     if(Math.hypot(after.x-before.x,after.y-before.y)>budget){let lo=start,hi=target;
      for(let i=0;i<12;i++){f.distance=(lo+hi)/2;after=coordinates(f);if(Math.hypot(after.x-before.x,after.y-before.y)>budget)hi=f.distance;else lo=f.distance;}f.distance=lo;
     }
    }
    if(active.length===1&&exiting(active[0])&&canLaunch())active.push(make());
    active=active.filter(f=>{if(f.distance>=f.length){passed++;return false;}return true;});
    if(!active.length&&canLaunch())active.push(make());
   }
   return snapshot();
  },
  // A touched fish darts away along its route (like the website demo): no teleport; the burst is
  // bounded by FISH_ESCAPE_CAP and fades back to normal speed within FISH_ESCAPE_SECONDS.
  scatter(index){
   const f=Number.isInteger(index)?active[index]:null;
   if(f)f.boost=1;
  },
  resize(nextWidth,nextHeight){
   const offset=(point,edge,w,h)=>({left:-point.x,right:point.x-w,top:-point.y,bottom:point.y-h})[edge];
   const previous=active.map(f=>{const point=coordinates(f),edge=f.distance>f.length/2?f.exit:f.entry;return {ratio:f.distance/f.length,edge,clearance:offset(point,edge,width,height),outgoing:f.distance>f.length/2};});
   width=Math.max(1,dimension(nextWidth,width));height=Math.max(1,dimension(nextHeight,height));
   active.forEach((f,i)=>{const old=previous[i];measure(f);f.distance=old.ratio*f.length;
    // Rotation must not pull an already exiting fish back onto the screen.
    if(old.clearance>=0){let lo=0,hi=1;for(let n=0;n<28;n++){const t=(lo+hi)/2,clearance=offset(sample(f,t),old.edge,width,height);if((clearance<old.clearance)===old.outgoing)lo=t;else hi=t;}
     const segment=((lo+hi)/2)*180,index=Math.min(179,Math.floor(segment));f.distance=f.lengths[index]+(segment-index)*(f.lengths[index+1]-f.lengths[index]);
    }
   });
  },
 };
}
