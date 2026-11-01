const { Sim, TYPES } = require('../engine.js');
const { LEVELS } = require('../levels.js');
function dirs(t){const r=TYPES[t].rot;return r==='4'?[0,1,2,3]:r==='lr'?[0,2]:r==='mirror'?[0,1]:[t==='helibot'||t==='soundbot'?1:0];}
function win(L,placed){const s=new Sim(L,placed);s.setPower(true);for(let i=0;i<200&&!s.won;i++)s.tick();if(s.won)return 1;s.setPower(false);for(let i=0;i<200&&!s.won&&!s.needsReset;i++)s.tick();return s.won?1:0;}
LEVELS.forEach((L,i)=>{
  const items=[];for(const k in L.inv)for(let n=0;n<L.inv[k];n++)items.push(k);
  if(items.length>2)return;
  const s0=new Sim(L,[]);const cells=[];for(let y=0;y<L.h;y++)for(let x=0;x<L.w;x++)if(!s0.at(x,y))cells.push([x,y]);
  let total=0,wins=0;
  if(items.length===1){for(const[x,y]of cells)for(const d of dirs(items[0])){total++;wins+=win(L,[{t:items[0],x,y,d}]);}}
  else{const[a,b]=items;for(const[x,y]of cells)for(const d of dirs(a))for(const[x2,y2]of cells){if(x===x2&&y===y2)continue;for(const d2 of dirs(b)){total++;wins+=win(L,[{t:a,x,y,d},{t:b,x:x2,y:y2,d:d2}]);}}}
  console.log(String(i+1).padStart(2),L.name.padEnd(18),'winning layouts',wins,'/',total, (100*wins/total).toFixed(2)+'%');
});
