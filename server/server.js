import express from "express";
import { XMLParser } from "fast-xml-parser";

const app=express();
const PORT=process.env.PORT||3000;
const TOKEN=process.env.DARWIN_ACCESS_TOKEN;
const SOAP_URL="https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb11.asmx";
const parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:"@",removeNSPrefix:true,parseTagValue:false});
app.use(express.static(new URL("../",import.meta.url).pathname));

function xmlEscape(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]));}
async function soap(action,body){
 if(!TOKEN)throw new Error("DARWIN_ACCESS_TOKEN is not configured on the server");
 const envelope=`<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ldb="http://thalesgroup.com/RTTI/2021-11-01/ldb/"><soap:Header><ldb:AccessToken><ldb:TokenValue>${xmlEscape(TOKEN)}</ldb:TokenValue></ldb:AccessToken></soap:Header><soap:Body>${body}</soap:Body></soap:Envelope>`;
 const r=await fetch(SOAP_URL,{method:"POST",headers:{"Content-Type":"text/xml; charset=utf-8","SOAPAction":`http://thalesgroup.com/RTTI/2021-11-01/ldb/${action}`},body:envelope});
 const text=await r.text();if(!r.ok)throw new Error(`Darwin HTTP ${r.status}: ${text.slice(0,300)}`);
 const parsed=parser.parse(text);const fault=parsed?.Envelope?.Body?.Fault;if(fault)throw new Error(fault.faultstring||"Darwin SOAP fault");return parsed?.Envelope?.Body||parsed;
}
function one(v){return v==null?[]:Array.isArray(v)?v:[v];}
function timePart(v){if(!v)return "";const m=String(v).match(/T(\d{2}:\d{2})/);return m?m[1]:String(v).slice(-5);}
function flattenBoard(raw){
 const root=raw?.GetDepartureBoardResponse?.GetStationBoardResult||raw?.GetDepartureBoardResult||{};
 return one(root.trainServices?.service).map(s=>({std:timePart(s.std),etd:s.etd||"Unknown",destination:one(s.destination?.location).map(x=>x.locationName).filter(Boolean).join(", ")||"Destination unavailable",platform:s.platform||"Not allocated",operator:s.operator||"Not supplied",via:one(s.subsequentCallingPoints?.callingPointList?.callingPoint).map(x=>x.locationName).filter(Boolean).join(", "),serviceID:s.serviceID||"",length:s.length?`${s.length} coaches`:""}));
}
app.get("/api/health",(_req,res)=>res.json({configured:Boolean(TOKEN)}));
app.get("/api/departures",async(req,res)=>{
 const station=String(req.query.station||"NCL").trim().toUpperCase();const numRows=Math.max(1,Math.min(30,Number(req.query.numRows)||20));
 if(!/^[A-Z]{3}$/.test(station))return res.status(400).json({error:"Enter a 3-letter National Rail CRS station code, such as NCL."});
 try{const body=`<ldb:GetDepartureBoardRequest><ldb:numRows>${numRows}</ldb:numRows><ldb:crs>${station}</ldb:crs></ldb:GetDepartureBoardRequest>`;const data=await soap("GetDepartureBoard",body);res.set("Cache-Control","no-store");res.json({station,services:flattenBoard(data)});}
 catch(e){console.error(e.message);res.status(502).json({error:"Darwin request failed. Check server token, station CRS code and API access."});}
});
app.get("/api/service",async(req,res)=>{
 const id=String(req.query.serviceID||"");if(!id||id.length>500)return res.status(400).json({error:"serviceID is required"});
 try{const body=`<ldb:GetServiceDetailsRequest><ldb:serviceID>${xmlEscape(id)}</ldb:serviceID></ldb:GetServiceDetailsRequest>`;const data=await soap("GetServiceDetails",body);const root=data?.GetServiceDetailsResponse?.GetServiceDetailsResult||{};const locations=one(root.subsequentCallingPoints?.callingPointList?.callingPoint).map(x=>x.locationName).filter(Boolean);res.set("Cache-Control","no-store");res.json({via:locations.join(", "),operator:root.operator||"",length:root.length?`${root.length} coaches`:"",platform:root.platform||"",etd:root.etd||""});}
 catch(e){console.error(e.message);res.status(502).json({error:"Could not retrieve service details from Darwin."});}
});
app.listen(PORT,()=>console.log(`XC Staff Rail running on http://localhost:${PORT}`));
