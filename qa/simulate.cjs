// Run the actual inline game script with browser/audio stubs and seeded randomness.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
fs.writeFileSync('/tmp/luyin-game.js',source);
function game(seed=1,stored={}){
 const elements=new Map(),events={};
 const element=id=>{if(!elements.has(id))elements.set(id,{style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this[k]=v;},addEventListener(){},getContext(){return {setTransform(){}};}});return elements.get(id);};
 const math=Object.create(Math);math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const context=vm.createContext({console,Math:math,document:{getElementById:element,querySelectorAll:()=>[],addEventListener(){}},Audio:class{addEventListener(){}play(){return Promise.resolve();}pause(){}},window:{},localStorage:{getItem:k=>stored[k],setItem:(k,v)=>stored[k]=v},devicePixelRatio:1,innerWidth:1100,innerHeight:700,addEventListener:(k,f)=>events[k]=f,requestAnimationFrame(){},matchMedia:()=>({matches:false})});
 vm.runInContext(source,context);return {run:s=>vm.runInContext(s,context),events,elements,stored};
}
const results=[];
for(let seed=1;seed<=20;seed++){
 const g=game(seed);g.run('start()');
 for(let frame=0;frame<120*120;frame++)g.run('update(1/120)');
 const result=g.run('({scores:[...scores],shots:[...shots]})');results.push(result.scores[1]);
}
console.log('Normal passive player, 20 seeded two-minute matches: AI goals',results.join(', '));
assert(results.every(x=>x>=3),'Normal AI must score several goals in every seed');
for(const level of ['easy','hard']){const g=game(42);g.run(`level='${level}';start()`);g.run('for(let i=0;i<14400;i++)update(1/120)');const goals=g.run('scores[1]');assert(goals>0);console.log(level,'passive player AI goals:',goals);}
const g=game(29);g.run('start();mode="local";remaining=1e9');
g.run(`for(let i=0;i<500000;i++){
 if(i%45===0){keys.clear();for(const k of ['KeyA','KeyD','KeyW','KeyS','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])if(Math.random()<.5)keys.add(k);ball.vx=(Math.random()*2-1)*1800;ball.vy=(Math.random()*2-1)*1800;}
 update(1/120);
 const net=ball.x<pitch.l||ball.x>pitch.r,top=net?pitch.goalTop+ball.r:pitch.t+ball.r,bottom=net?pitch.goalBottom-ball.r:pitch.b-ball.r;
 if(!Number.isFinite(ball.x+ball.y)||ball.x<38-1e-8||ball.x>1062+1e-8||ball.y<top-1e-8||ball.y>bottom+1e-8)throw Error('Bounds failure at '+i+': '+JSON.stringify(ball));
}`);
console.log('Random simulation: 500,000 fixed steps (69.4 simulated minutes), zero pitch/net bounds violations');
// Exercise walls independently of scoring, including celebration motion.
g.run(`for(const side of [0,1])for(const wall of ['top','bottom','back']){
 Object.assign(ball,{x:side?1054:46,y:wall==='top'?284:wall==='bottom'?416:350,vx:wall==='back'?(side?900:-900):0,vy:wall==='top'?-900:wall==='bottom'?900:0});advanceBall(.1,false);
 if(wall!=='back'&&(side?ball.x<=pitch.r:ball.x>=pitch.l))throw Error('Ball escaped net sideways');
 if(wall==='top'&&ball.vy<=0||wall==='bottom'&&ball.vy>=0||wall==='back'&&(side?ball.vx>=0:ball.vx<=0))throw Error('Net wall failed');
}
for(const x of [pitch.l,pitch.r])for(const y of [pitch.goalTop,pitch.goalBottom]){Object.assign(ball,{x:x+(x===pitch.l?30:-30),y,vx:x===pitch.l?-900:900,vy:0});advanceBall(.04,false);if(x===pitch.l?ball.vx<=0:ball.vx>=0)throw Error('Post failed');}`);
for(const scorer of [0,1]){
 g.run(`start();goal(${scorer});for(let i=0;i<181;i++)update(1/120)`);
 assert.equal(g.run('kickoffTeam'),1-scorer);assert.equal(g.run('owner'),1-scorer);
}
g.run('scores=[3,2];remaining=7');g.events.keydown({code:'KeyR',repeat:false,preventDefault(){}});assert.equal(g.run('remaining'),120);assert.equal(g.run('scores.join()'),'0,0');
g.events.keydown({code:'KeyM',repeat:false,preventDefault(){}});assert.equal(g.run('muted'),true);assert.equal(g.stored['luyin-muted'],'true');assert.equal(game(1,g.stored).run('muted'),true);g.elements.get('mute').onclick();assert.equal(g.run('muted'),false);
console.log('Passed: all four posts, six net walls, conceding kickoffs, R restart, M/button mute, saved mute reload');
