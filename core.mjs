export const TAU=Math.PI*2;
export const DURATION=120;
export const WARMUP=30;
export const DIFFICULTIES=Object.freeze({
 easy:Object.freeze({label:'Easy',maxShields:4,description:'Extra shields and a gentler final rush.',acceleration:.006,intervals:[1.48,1.24,1.06,.90],recoveries:[48,78,100]}),
 medium:Object.freeze({label:'Medium',maxShields:3,description:'A balanced test of timing and rhythm.',acceleration:.012,intervals:[1.18,.98,.80,.64],recoveries:[48,98]}),
 hard:Object.freeze({label:'Hard',maxShields:2,description:'Extreme speed, dense barriers, and no shield recovery.',acceleration:.020,intervals:[.92,.70,.52,.38],recoveries:[]}),
 extreme:Object.freeze({label:'Extreme',maxShields:1,description:'Top speed from the first second. One hit ends endless survival.',survival:true,speed:3.8,acceleration:0,intervals:[.38,.34,.32,.30],recoveries:[]}),
 rampage:Object.freeze({label:'Rampage',maxShields:1,description:'Impossible survival. Accelerating speed. A collapse blocks both orbits at 20 seconds.',survival:true,impossible:true,speed:5.4,acceleration:.09,intervals:[.26,.20,.16,.16],recoveries:[]})
});
const difficultyKey=value=>Object.hasOwn(DIFFICULTIES,value)?value:'medium';
export const RADII=[134,206];
export const MULTIPLIERS=[1,2,3,5,8,10,15];
export const THRESHOLDS=[0,6,14,25,40,60,85];
export const SKINS=[{name:'Chalk',color:'#f0f2e7',xp:0},{name:'Glacier',color:'#8cdbef',xp:400},{name:'Orchid',color:'#e8a5de',xp:1000},{name:'Volt',color:'#e5ed78',xp:1800},{name:'Flare',color:'#ff8147',xp:3000}];
export const OBJECTIVE_SETS=[
 [{key:'energy',goal:30,label:'Collect 30 energy'},{key:'maxMultiplier',goal:5,label:'Reach a ×5 combo'},{key:'time',goal:90,label:'Survive 90 seconds'}],
 [{key:'nearMisses',goal:5,label:'Make 5 close calls'},{key:'energy',goal:60,label:'Collect 60 energy'},{key:'time',goal:120,label:'Survive 120 seconds'}],
 [{key:'score',goal:25000,label:'Score 25,000 points'},{key:'maxMultiplier',goal:8,label:'Reach a ×8 combo'},{key:'completed',goal:1,label:'Finish the final rush'}],
 [{key:'gold',goal:10,label:'Collect 10 risk gems'},{key:'nearMisses',goal:10,label:'Make 10 close calls'},{key:'clean',goal:1,label:'Finish without damage'}]
];
export function random(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
export function travelAt(time,difficulty='medium'){const t=Math.max(0,time),config=DIFFICULTIES[difficultyKey(difficulty)];if(config.survival)return t*config.speed+.5*config.acceleration*t*t;if(t<=WARMUP)return t+.003*t*t;const active=t-WARMUP;return 32.7+1.18*active+.5*config.acceleration*active*active}
export function speedAt(time,difficulty='medium'){const t=Math.max(0,time),config=DIFFICULTIES[difficultyKey(difficulty)];if(config.survival)return config.speed+config.acceleration*t;return t<=WARMUP?1+.006*t:1.18+config.acceleration*(t-WARMUP)}
export function phaseAt(time,difficulty='medium'){const config=DIFFICULTIES[difficultyKey(difficulty)];if(config.impossible)return time%20>=18.5?'COLLAPSE INCOMING':'RAMPAGE';if(config.survival)return 'EXTREME SURVIVAL';return time<WARMUP?'WARM UP':time<60?'RAISE THE STAKES':time<90?'IN THE FLOW':time<110?'OVERDRIVE':'FINAL RUSH'}
export function generate(seed,difficulty='medium',horizon=DURATION){
 const config=DIFFICULTIES[difficultyKey(difficulty)],rng=random(seed),objects=[],gates=[];let t=config.impossible?1.1:config.survival?1.6:3.3,lane=1,id=0,nextCollapse=20;
 const add=(type,time,lane)=>{const warning=config.impossible?Math.min(1.4,5.7/speedAt(time,difficulty)):config.survival?1.4:2.35;const o={id:id++,type,time,lane,angle:travelAt(time,difficulty),spawn:Math.max(0,time-warning),done:false,hit:false,minClearance:Infinity};objects.push(o);return o};
 for(let i=0;i<3;i++)add('energy',.55+i*.23,1);
 let recovery=0;
 while(t<(config.survival?horizon:DURATION-.55)){
  if(config.impossible&&t>=nextCollapse){const wall=add('hazard',nextCollapse,0);wall.wall=true;gates.push(wall);nextCollapse+=20}
  if(config.survival){if(rng()<.85)lane=1-lane}else if(t>=110)lane=1-lane;else if(rng()<.65)lane=1-lane;
  if(gates.length===0)lane=1;
  const gate=add('hazard',t,lane);gates.push(gate);
  const safe=1-lane;
  const canRecover=recovery<config.recoveries.length&&t>=config.recoveries[recovery];
  add(canRecover?'shield':'energy',t+.2,safe);if(canRecover)recovery++;
  add('energy',t+.39,safe);
  if((config.survival||t>=30)&&rng()<.66)add('gold',t-.2,lane);
  const interval=config.impossible?.26-.10*Math.min(t/20,1):config.survival?.38-.08*Math.min(t/120,1):t<10?1.85:t<WARMUP?1.65:config.intervals[t<60?0:t<90?1:t<110?2:3];
  t+=interval+(config.survival||t>=110?0:(rng()-.5)*.10);
 }
 if(!config.survival)for(let i=0;i<4;i++)add('energy',DURATION-.50+i*.12,1-gates.at(-1).lane);
 objects.sort((a,b)=>a.spawn-b.spawn||a.time-b.time);gates.sort((a,b)=>a.time-b.time);return {objects,gates};
}
export class Engine{
 constructor({seed=(Math.random()*4294967296)>>>0,objectives=OBJECTIVE_SETS[0],difficulty='medium'}={}){
  this.difficulty=difficultyKey(difficulty);this.config=DIFFICULTIES[this.difficulty];this.maxShields=this.config.maxShields;this.survival=!!this.config.survival;this.duration=this.survival?Infinity:DURATION;this.scheduleHorizon=DURATION;
  this.seed=seed;this.time=0;this.travel=0;this.lane=1;this.fromRadius=206;this.radius=206;this.flipStarted=-1;this.lastFlip=-100;this.score=0;this.streak=0;this.multiplier=1;this.maxMultiplier=1;this.energy=0;this.gold=0;this.nearMisses=0;this.damage=0;this.shields=this.maxShields;this.invulnerableUntil=0;this.lastReward=0;this.lastDecay=0;this.slowRemaining=0;this.completed=0;this.clean=0;this.ended=false;this.cause='';this.events=[];this.active=[];this.spawnIndex=0;this.objectives=objectives.map(x=>({...x,done:false}));this.schedule=generate(seed,this.difficulty);this.currentPhase=phaseAt(0,this.difficulty);
 }
 emit(type,extra={}){this.events.push({type,time:this.time,...extra})}
 flip(){if(this.ended||this.time-this.lastFlip<.09)return false;this.fromRadius=this.radius;this.lane=1-this.lane;this.flipStarted=this.time;this.lastFlip=this.time;this.emit('flip');return true}
 addScore(base,extraStreak=1){const amount=base*this.multiplier;this.score+=amount;this.streak+=extraStreak;this.lastReward=this.time;this.setMultiplier();return amount}
 setMultiplier(){const previous=this.multiplier;let index=0;for(let i=0;i<THRESHOLDS.length;i++)if(this.streak>=THRESHOLDS[i])index=i;this.multiplier=MULTIPLIERS[index];this.maxMultiplier=Math.max(this.maxMultiplier,this.multiplier);if(this.multiplier>previous)this.emit('milestone',{multiplier:this.multiplier})}
 checkObjectives(){for(const o of this.objectives){if(!o.done&&(this[o.key]??0)>=o.goal){o.done=true;this.score+=500;this.emit('objective',{label:o.label,amount:500})}}}
 update(realDt){
  if(this.ended)return;
  const dt=Math.max(0,realDt);this.slowRemaining=Math.max(0,this.slowRemaining-dt);this.time=Math.min(this.duration,this.time+dt);this.travel=travelAt(this.time,this.difficulty);
  while(this.survival&&this.time>=this.scheduleHorizon-5){const nextId=this.schedule.objects.reduce((id,o)=>Math.max(id,o.id+1),0);this.scheduleHorizon+=DURATION;const next=generate(this.seed,this.difficulty,this.scheduleHorizon);this.schedule.objects.push(...next.objects.filter(o=>o.id>=nextId));this.schedule.objects.sort((a,b)=>a.spawn-b.spawn||a.time-b.time);this.schedule.gates.push(...next.gates.filter(o=>o.id>=nextId))}
  if(this.flipStarted>=0){const p=Math.min(1,(this.time-this.flipStarted)/.105);const ease=p*p*(3-2*p);this.radius=this.fromRadius+(RADII[this.lane]-this.fromRadius)*ease;if(p===1)this.flipStarted=-1}
  const phase=phaseAt(this.time,this.difficulty);if(phase!==this.currentPhase){this.currentPhase=phase;this.emit('phase',{phase})}
  while(this.spawnIndex<this.schedule.objects.length&&this.schedule.objects[this.spawnIndex].spawn<=this.time)this.active.push(this.schedule.objects[this.spawnIndex++]);
  for(const o of this.active){
   if(o.done)continue;const delta=o.angle-this.travel;const r=o.wall?(RADII[0]+RADII[1])/2:RADII[o.lane];
   if(Math.abs(delta)<.85){
    const radial=this.radius*Math.cos(delta)-r,tangent=this.radius*Math.sin(delta);
    if(o.type==='hazard'){
     const clearance=Math.hypot(Math.max(0,Math.abs(radial)-(o.wall?52:14)),Math.max(0,Math.abs(tangent)-19));o.minClearance=Math.min(o.minClearance,clearance);
     if(clearance<=7&&!o.hit){o.hit=true;if(this.time>=this.invulnerableUntil){this.shields--;this.damage++;this.streak=Math.floor(this.streak*.35);this.setMultiplier();this.invulnerableUntil=this.time+1.05;this.emit('damage',{object:o,shields:this.shields});if(this.shields<=0){this.cause=o.wall?'The collapse erased both orbits.':'You stayed on the barrier’s track.';this.finish(false);break}}}
    }else if(Math.hypot(radial,tangent)<14){
     o.done=true;let amount=0;
     if(o.type==='shield'){this.shields=Math.min(this.maxShields,this.shields+1);amount=this.addScore(200,2);this.emit('shield',{object:o,amount})}
     else{this.energy++;if(o.type==='gold')this.gold++;amount=this.addScore(o.type==='gold'?250:100,o.type==='gold'?2:1);this.emit(o.type,{object:o,amount})}
    }
   }
   if(!o.done&&delta<-.22){o.done=true;if(o.type==='hazard'&&!o.hit&&o.minClearance>7&&o.minClearance<=29){this.nearMisses++;const amount=this.addScore(500,3);this.slowRemaining=.16;this.emit('near',{object:o,amount})}}
  }
  this.active=this.active.filter(o=>!o.done||o.angle-this.travel>-.6);
  if(this.time-this.lastReward>4&&this.time-this.lastDecay>.75&&this.streak>0){this.streak--;this.lastDecay=this.time;this.setMultiplier()}
  this.checkObjectives();if(!this.ended&&!this.survival&&this.time>=this.duration)this.finish(true);
 }
 finish(completed){if(this.ended)return;this.ended=true;this.completed=completed?1:0;this.clean=completed&&this.damage===0?1:0;if(completed)this.score+=3000*this.multiplier;this.checkObjectives();this.emit('end',{completed,score:this.score})}
 drain(){return this.events.splice(0)}
 snapshot(){return {seed:this.seed,difficulty:this.difficulty,survival:this.survival,duration:this.survival?null:this.duration,time:Math.round(this.time*100)/100,score:this.score,shields:this.shields,maxShields:this.maxShields,multiplier:this.multiplier,maxMultiplier:this.maxMultiplier,energy:this.energy,gold:this.gold,nearMisses:this.nearMisses,damage:this.damage,completed:!!this.completed,ended:this.ended,lane:this.lane,phase:this.currentPhase,objectives:this.objectives.map(({label,done})=>({label,done}))}}
}
