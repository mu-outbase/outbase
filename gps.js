function getGps(callback){
  if(!navigator.geolocation){
    callback("未取得");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos=>{
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      callback(lat + "," + lng);
    },
    ()=>callback("未取得"),
    {
      enableHighAccuracy:true,
      timeout:10000,
      maximumAge:0
    }
  );
}

function addGpsHistory(type,gps){
  gpsHistory.push({
    type:type,
    gps:gps,
    time:new Date().toLocaleString()
  });
}

function gpsToLatLng(gps){
  if(!gps || gps==="未取得" || gps==="取得中"){
    return null;
  }

  const p = gps.split(",");

  if(p.length !== 2){
    return null;
  }

  const lat = Number(p[0]);
  const lng = Number(p[1]);

  if(Number.isNaN(lat) || Number.isNaN(lng)){
    return null;
  }

  return [lat,lng];
}

function calcDistanceNumber(gps1,gps2){
  const p1 = gpsToLatLng(gps1);
  const p2 = gpsToLatLng(gps2);

  if(!p1 || !p2){
    return 0;
  }

  const lat1 = p1[0];
  const lon1 = p1[1];
  const lat2 = p2[0];
  const lon2 = p2[1];

  const R = 6371;
  const dLat = (lat2-lat1) * Math.PI / 180;
  const dLon = (lon2-lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

  return R * c;
}

function calcDistance(gps1,gps2){
  const d = calcDistanceNumber(gps1,gps2);

  if(d === 0){
    return "未取得";
  }

  return d.toFixed(2) + "km";
}

function calcTrackDistance(history){
  if(!history || history.length < 2){
    return "0.00km";
  }

  let total = 0;

  for(let i=1;i<history.length;i++){
    const d = calcDistanceNumber(history[i-1].gps,history[i].gps);

    if(d > 0 && d <= GPS_JUMP_LIMIT_KM){
      total += d;
    }
  }

  return total.toFixed(2) + "km";
}

function calcAverageSpeed(distanceText,timeText){
  const km = parseFloat((distanceText || "0").replace("km",""));
  const sec = timeToSeconds(timeText);

  if(!km || !sec){
    return "0.00km/h";
  }

  return (km / (sec / 3600)).toFixed(2) + "km/h";
}

function getValidGpsCount(history){
  if(!history){
    return 0;
  }

  let count = 0;

  history.forEach(p=>{
    if(gpsToLatLng(p.gps)){
      count++;
    }
  });

  return count;
}

function formatGpsType(type,index){
  if(type === "start"){
    return "開始";
  }

  if(type === "end"){
    return "終了";
  }

  return "中間" + index;
}

function buildTrackPoints(history){
  const points = [];

  if(!history || history.length === 0){
    return points;
  }

  history.forEach(p=>{
    const latlng = gpsToLatLng(p.gps);

    if(latlng){
      points.push({
        type:p.type,
        latlng:latlng,
        time:p.time || ""
      });
    }
  });

  return points;
}

function renderMap(r){
  if(typeof L === "undefined"){
    return;
  }

  const mapElement = document.getElementById("map");

  if(!mapElement){
    return;
  }

  const points = buildTrackPoints(r.gps && r.gps.history ? r.gps.history : []);

  if(points.length === 0){
    mapElement.innerHTML = "地図表示できるGPSデータがありません";
    return;
  }

  if(mapInstance){
    mapInstance.remove();
  }

  mapInstance = L.map("map").setView(points[0].latlng,16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom:19
  }).addTo(mapInstance);

  const latlngs = points.map(p=>p.latlng);

  if(latlngs.length >= 2){
    L.polyline(latlngs,{
      weight:5
    }).addTo(mapInstance);
  }

  const startPoint = points.find(p=>p.type === "start") || points[0];
  const endPoint =
    [...points].reverse().find(p=>p.type === "end") ||
    points[points.length-1];

  L.marker(startPoint.latlng)
    .addTo(mapInstance)
    .bindPopup("開始");

  L.marker(endPoint.latlng)
    .addTo(mapInstance)
    .bindPopup("終了");

  if(points.length > 2){
    points.forEach((p,index)=>{
      if(p === startPoint || p === endPoint){
        return;
      }

      L.circleMarker(p.latlng,{
        radius:4,
        weight:1,
        fillOpacity:0.6
      })
        .addTo(mapInstance)
        .bindPopup("中間" + index);
    });
  }

  if(latlngs.length >= 2){
    mapInstance.fitBounds(latlngs,{
      padding:[30,30]
    });
  }else{
    mapInstance.setView(points[0].latlng,16);
  }
}
