const $=id=>document.getElementById(id);
const STORE="runningTrackerV1";
let data=JSON.parse(localStorage.getItem(STORE)||'{"goal":100,"runs":[]}');

function save(){localStorage.setItem(STORE,JSON.stringify(data))}
function monthKey(d){return d.slice(0,7)}
function currentKey(){return new Date().toISOString().slice(0,7)}
function monthRuns(){return data.runs.filter(r=>monthKey(r.date)===currentKey()).sort((a,b)=>b.date.localeCompare(a.date))}
function pace(distance,secs){if(!distance)return 0;return secs/distance}
function paceText(seconds){if(!seconds)return"—";let m=Math.floor(seconds/60),s=Math.round(seconds%60);if(s===60){m++;s=0}return `${m}:${String(s).padStart(2,"0")}/mi`}
function dateText(d){return new Date(d+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"})}

function render(){
 const runs=monthRuns(), total=runs.reduce((s,r)=>s+r.distance,0), pct=data.goal?total/data.goal*100:0;
 $("monthTitle").textContent=new Date(currentKey()+"-01T12:00:00").toLocaleDateString(undefined,{month:"long",year:"numeric"});
 $("milesDone").textContent=total.toFixed(1); $("percentDone").textContent=Math.min(999,pct).toFixed(pct<10?1:0)+"%";
 $("milesRemaining").textContent=total>=data.goal?"Goal reached! 🎉":`${Math.max(0,data.goal-total).toFixed(1)} miles remaining`;
 $("progressFill").style.width=Math.min(100,pct)+"%";
 $("goalRing").style.setProperty("--deg",Math.min(360,pct*3.6)+"deg");
 $("goalLabel").textContent=`Goal: ${data.goal} mi`;
 $("runCount").textContent=runs.length;
 $("avgDistance").textContent=(runs.length?total/runs.length:0).toFixed(1)+" mi";
 const totalSecs=runs.reduce((s,r)=>s+r.seconds,0), avgPace=runs.length?totalSecs/total:0;
 $("avgPace").textContent=paceText(avgPace);
 $("paceToGoal").textContent=runs.length?`${(total/runs.length).toFixed(1)} miles per run average.`:"Log your first run to get started.";
 renderRuns($("recentRuns"),runs.slice(0,5));
 drawChart(runs);
}
function renderRuns(el,runs){
 if(!runs.length){el.innerHTML='<div class="empty">No runs logged this month.</div>';return}
 el.innerHTML=runs.map(r=>`<div class="run"><div><strong>${r.distance.toFixed(2)} mi</strong><div class="date">${dateText(r.date)} · ${formatTime(r.seconds)}</div></div><div class="right"><div class="pace">${paceText(pace(r.distance,r.seconds))}</div><div class="run-actions"><button onclick="editRun('${r.id}')">Edit</button><button onclick="deleteRun('${r.id}')">Delete</button></div></div></div>`).join("");
}
function formatTime(s){let m=Math.floor(s/60),sec=s%60;return `${m}:${String(sec).padStart(2,"0")}`}
function drawChart(runs){
 const c=$("chart"),ctx=c.getContext("2d"),dpr=devicePixelRatio||1,w=c.clientWidth,h=230;
 c.width=w*dpr;c.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
 const days=new Date(new Date(currentKey()+"-01T12:00:00").getFullYear(),new Date(currentKey()+"-01T12:00:00").getMonth()+1,0).getDate();
 let vals=[],sum=0;
 for(let day=1;day<=days;day++){let key=currentKey()+"-"+String(day).padStart(2,"0");sum+=runs.filter(r=>r.date===key).reduce((s,r)=>s+r.distance,0);vals.push(sum)}
 const max=Math.max(data.goal,10), pad={l:34,r:12,t:12,b:28};
 ctx.strokeStyle="#e5e7eb";ctx.lineWidth=1;
 for(let i=0;i<=4;i++){let y=pad.t+(h-pad.t-pad.b)*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillStyle="#6b7280";ctx.font="11px sans-serif";ctx.fillText(Math.round(max*(1-i/4)),5,y+4)}
 ctx.strokeStyle="#111827";ctx.lineWidth=3;ctx.beginPath();
 vals.forEach((v,i)=>{let x=pad.l+(w-pad.l-pad.r)*i/(days-1),y=h-pad.b-(h-pad.t-pad.b)*Math.min(v,max)/max;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();
 ctx.strokeStyle="#9ca3af";ctx.setLineDash([5,5]);let gy=h-pad.b-(h-pad.t-pad.b)*Math.min(data.goal,max)/max;ctx.beginPath();ctx.moveTo(pad.l,gy);ctx.lineTo(w-pad.r,gy);ctx.stroke();ctx.setLineDash([]);
}
function openRun(run=null){$("runDialog").showModal();$("runId").value=run?.id||"";$("runDate").value=run?.date||new Date().toISOString().slice(0,10);$("distance").value=run?.distance??"";$("minutes").value=run?Math.floor(run.seconds/60):"";$("seconds").value=run?run.seconds%60:0;updatePreview()}
function updatePreview(){let d=parseFloat($("distance").value),m=+($("minutes").value||0),s=+($("seconds").value||0);$("pacePreview").textContent=d?`Pace: ${paceText((m*60+s)/d)}`:"Pace: —"}
$("runForm").addEventListener("submit",e=>{e.preventDefault();let d=+$("distance").value,m=+$("minutes").value,s=+$("seconds").value,id=$("runId").value||crypto.randomUUID();let r={id,date:$("runDate").value,distance:d,seconds:m*60+s};let i=data.runs.findIndex(x=>x.id===id);i>=0?data.runs[i]=r:data.runs.push(r);save();$("runDialog").close();render()});
$("addRunBtn").onclick=()=>openRun();$("cancelRun").onclick=()=>$("runDialog").close();$("closeRun").onclick=()=>$("runDialog").close();["distance","minutes","seconds"].forEach(id=>$(id).addEventListener("input",updatePreview));
$("viewAllBtn").onclick=()=>{$("historyDialog").showModal();renderRuns($("allRuns"),[...data.runs].sort((a,b)=>b.date.localeCompare(a.date)))};
$("closeHistory").onclick=()=>$("historyDialog").close();
window.editRun=id=>{let r=data.runs.find(x=>x.id===id);if(r){$("historyDialog").close();openRun(r)}};
window.deleteRun=id=>{if(confirm("Delete this run?")){data.runs=data.runs.filter(x=>x.id!==id);save();render();}};
$("settingsBtn").onclick=()=>{$("goalInput").value=data.goal;$("settingsDialog").showModal()};$("closeSettings").onclick=()=>$("settingsDialog").close();
$("settingsForm").addEventListener("submit",e=>{e.preventDefault();data.goal=+$("goalInput").value||100;save();$("settingsDialog").close();render()});
$("resetData").onclick=()=>{if(confirm("Delete all saved runs?")){data.runs=[];save();$("settingsDialog").close();render()}};
if("serviceWorker"in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
render();
