const $ = id => document.getElementById(id);
const STATION_CODES = {"NEWCASTLE":"NCL","BIRMINGHAM NEW STREET":"BHM","BIRMINGHAM":"BHM","EDINBURGH":"EDB","YORK":"YRK","LEEDS":"LDS","SHEFFIELD":"SHF","DERBY":"DBY","DURHAM":"DHM","DARLINGTON":"DAR","MORPETH":"MPT","LONDON KINGS CROSS":"KGX","BRISTOL TEMPLE MEADS":"BRI","PLYMOUTH":"PLY","MANCHESTER PICCADILLY":"MAN","CARDIFF CENTRAL":"CDF","ABERDEEN":"ABD","NORWICH":"NRW"};
const DEMO = [
 {std:"09:27", etd:"On time", destination:"London Kings Cross", platform:"3", operator:"LNER", via:"Darlington, York, Doncaster", serviceID:"demo1", length:"9 coaches"},
 {std:"09:31", etd:"Delayed", destination:"Birmingham New Street", platform:"4", operator:"CrossCountry", via:"Durham, Darlington, York, Sheffield", serviceID:"demo2", delay:"10 mins", length:"4 coaches"},
 {std:"09:38", etd:"On time", destination:"Edinburgh", platform:"2", operator:"CrossCountry", via:"Morpeth, Alnmouth, Berwick-upon-Tweed", serviceID:"demo3", length:"4 coaches"},
 {std:"09:44", etd:"Cancelled", destination:"Middlesbrough", platform:"1", operator:"Northern", via:"Sunderland, Hartlepool", serviceID:"demo4", length:"2 coaches"},
 {std:"09:52", etd:"On time", destination:"Bristol Temple Meads", platform:"4", operator:"CrossCountry", via:"Durham, York, Sheffield, Derby", serviceID:"demo5", length:"4 coaches"},
 {std:"10:03", etd:"On time", destination:"Carlisle", platform:"8", operator:"Northern", via:"Hexham, Haltwhistle", serviceID:"demo6", length:"2 coaches"},
 {std:"10:08", etd:"Delayed", destination:"Birmingham New Street", platform:"4", operator:"CrossCountry", via:"Durham, York, Sheffield, Derby", serviceID:"demo7", delay:"5 mins", length:"4 coaches"}
];
let services = [], selected = null, isLive = false;
function normalise(s){return {...s, std:s.std||s.scheduledDeparture||"--:--", etd:s.etd||s.estimatedDeparture||"Unknown", destination:s.destination||"Destination unavailable", platform:s.platform||"Not yet allocated", operator:s.operator||"Operator not supplied", via:s.via||"", serviceID:s.serviceID||s.serviceId||"", length:s.length||""};}
function timeNow(){return new Date().toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"});}
function statusClass(s){const v=(s.etd||"").toLowerCase();return v.includes("cancel")?"cancelled":v.includes("on time")||v.includes("right time")?"on-time":v.includes("delay")||v.includes("late")||/\d+\s*min/.test(v)?"delayed":"";}
function safe(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(){
 const filter=$("filterInput").value.trim().toLowerCase();
 const shown=services.filter(s=>[s.destination,s.operator,s.platform,s.etd,s.via].join(" ").toLowerCase().includes(filter));
 $("departures").innerHTML=shown.length?shown.map((s,i)=>`<article class="service" tabindex="0" role="button" aria-label="View ${safe(s.destination)} service details" data-service="${safe(s.serviceID)}">
 <div class="time-block"><strong>${safe(s.std)}</strong><span>Scheduled</span></div>
 <div class="service-main"><div class="destination">${safe(s.destination)}</div><div class="calling">${safe(s.via||s.operator)}</div><div class="service-meta"><span class="chip platform">Platform ${safe(s.platform)}</span><span class="chip">${safe(s.operator)}</span>${s.length?`<span class="chip">${safe(s.length)}</span>`:""}</div></div>
 <div class="service-status"><div class="status-main">${safe(s.etd)}</div><div class="status-sub">${safe(s.delay||"")}</div><span class="chip ${statusClass(s)}">${statusClass(s)==="on-time"?"ON TIME":statusClass(s)==="cancelled"?"CANCELLED":statusClass(s)==="delayed"?"CHECK DELAY":"STATUS"}</span></div></article>`).join(""):`<div class="empty">No services match that filter.</div>`;
 document.querySelectorAll(".service").forEach(el=>{const open=()=>showDetails(services.find(s=>s.serviceID===el.dataset.service)||shown[0]);el.addEventListener("click",open);el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open();}})});
}
function textBoard(){return `${$("boardTitle").textContent}\nUpdated: ${$("lastUpdated").textContent}\n\n`+services.map(s=>`${s.std} | ${s.destination} | ${s.etd}${s.delay?" ("+s.delay+")":""} | Platform ${s.platform} | ${s.operator}${s.via?" | Calls: "+s.via:""}`).join("\n")+"\n\nOperational awareness only. Check official systems.";}
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2400);}
async function fetchBoard(){
 const stationInput=$("stationInput").value.trim(); if(!stationInput)return; const station=STATION_CODES[stationInput.toUpperCase()]||stationInput.toUpperCase();
 $("boardTitle").textContent=`${station} departures`; $("statusMessage").className="status"; $("statusMessage").textContent="Loading departures…";
 try{
  const url=`/api/departures?station=${encodeURIComponent(station)}&numRows=${encodeURIComponent($("countSelect").value)}`;
  const res=await fetch(url,{headers:{Accept:"application/json"}});
  if(!res.ok)throw new Error(`API returned ${res.status}`);
  const data=await res.json(); if(!Array.isArray(data.services))throw new Error("Unexpected API response");
  services=data.services.map(normalise);isLive=true;$("connectionState").textContent="LIVE DARWIN";$("connectionState").style.background="#16794b";
  $("statusMessage").className="status live";$("statusMessage").textContent="Connected to the configured Darwin service. Check live operational systems before acting.";
  $("lastUpdated").textContent=`Retrieved ${timeNow()} · Darwin`;render();
 }catch(e){
  isLive=false;services=DEMO.map(normalise);$("connectionState").textContent="DEMO MODE";$("connectionState").style.background="#ffffff20";
  $("statusMessage").className="status";$("statusMessage").textContent="Live Darwin data is not connected. Showing illustrative sample services only — these are not real-time departures.";
  $("lastUpdated").textContent=`Sample data · ${timeNow()}`;render();
 }
}
async function showDetails(s){
 if(!s)return;selected=s;$("detailPanel").hidden=false;$("detailTitle").textContent=`${s.std} · ${s.destination}`;
 let detail={...s};
 if(isLive&&s.serviceID){try{const r=await fetch(`/api/service?serviceID=${encodeURIComponent(s.serviceID)}`);if(r.ok)detail={...detail,...await r.json()};}catch(e){}}
 const fields=[["Scheduled departure",detail.std],["Expected departure",detail.etd],["Platform",detail.platform],["Operator",detail.operator],["Destination",detail.destination],["Calling points",detail.via||"Not supplied"],["Delay",detail.delay||"No delay detail supplied"],["Train length",detail.length||"Not supplied"],["Service ID",detail.serviceID||"Not supplied"]];
 $("serviceDetails").innerHTML=`<div class="detail-grid">${fields.map(([k,v])=>`<div class="detail-item"><span>${safe(k)}</span><strong>${safe(v)}</strong></div>`).join("")}</div>`;
 $("detailPanel").scrollIntoView({behavior:"smooth",block:"start"});
}
function shareText(txt,subject){GenUIFallbackCopy(txt);const body=encodeURIComponent(txt);window.location.href=`mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;}
function GenUIFallbackCopy(txt){if(navigator.clipboard?.writeText)navigator.clipboard.writeText(txt).then(()=>toast("Copied to clipboard")).catch(()=>fallbackCopy(txt));else fallbackCopy(txt);}
function fallbackCopy(txt){const ta=document.createElement("textarea");ta.value=txt;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");toast("Copied to clipboard");}catch(e){toast("Select and copy the text manually");}ta.remove();}
$("searchForm").addEventListener("submit",e=>{e.preventDefault();fetchBoard()});$("refreshBtn").addEventListener("click",fetchBoard);$("filterInput").addEventListener("input",render);
$("copyBtn").addEventListener("click",()=>GenUIFallbackCopy(textBoard()));$("emailBtn").addEventListener("click",()=>{window.location.href=`mailto:?subject=${encodeURIComponent($("boardTitle").textContent)}&body=${encodeURIComponent(textBoard())}`;});
$("pdfBtn").addEventListener("click",()=>window.print());$("closeDetails").addEventListener("click",()=>{$("detailPanel").hidden=true;selected=null;});
$("copyDetailBtn").addEventListener("click",()=>{if(selected)GenUIFallbackCopy(`${selected.std} ${selected.destination}\nExpected: ${selected.etd}\nPlatform: ${selected.platform}\nOperator: ${selected.operator}\nCalling points: ${selected.via||"Not supplied"}\nDelay: ${selected.delay||"Not supplied"}`)});
$("emailDetailBtn").addEventListener("click",()=>{if(selected)window.location.href=`mailto:?subject=${encodeURIComponent("Train service details: "+selected.destination)}&body=${encodeURIComponent(`${selected.std} ${selected.destination}\nExpected: ${selected.etd}\nPlatform: ${selected.platform}\nOperator: ${selected.operator}\nCalling points: ${selected.via||"Not supplied"}\nDelay: ${selected.delay||"Not supplied"}`)}`;});
$("pdfDetailBtn").addEventListener("click",()=>window.print());
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
fetchBoard();
