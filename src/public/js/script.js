// ─── State ────────────────────────────────────────────────────────────────
let mainMap, alaskaMap, hawaiiMap;
let allSites = [];
let selectedSites = [];
let buttonsList = [];
let markerGroupMain, markerGroupAlaska, markerGroupHawaii;
let canLoadAll = false;

const southWest = L.latLng(5.49955, -170);
const northEast = L.latLng(83.162102, -50);
const bounds    = L.latLngBounds(southWest, northEast);

const container = document.getElementById("sidebar");

// ─── Map init ─────────────────────────────────────────────────────────────
function initMaps() {
  mainMap = L.map("main-map", {
    maxBounds: bounds,
    maxBoundsViscosity: 1.0,
    attributionControl: false,
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView([39.8283, -98.5795], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    bounds: bounds,
  }).addTo(mainMap);

  alaskaMap = L.map("alaska-inset", {
    attributionControl: false,
    zoomControl: false,
    scrollWheelZoom: true,
    dragging: true,
  }).setView([64.2008, -149.4937], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {}).addTo(alaskaMap);

  hawaiiMap = L.map("hawaii-inset", {
    attributionControl: false,
    zoomControl: false,
    scrollWheelZoom: true,
    dragging: true,
  }).setView([20.7967, -156.3319], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {}).addTo(hawaiiMap);

  // Redraw markers on pan/zoom
  mainMap.on("zoomend moveend viewreset", function () {
    ClearMarkers();
    if (selectedSites.length === 0 && canLoadAll) {
      AddMarkersNoDelay(allSites);
    } else {
      AddMarkersNoDelay(selectedSites);
    }
  });

  markerGroupMain    = L.layerGroup().addTo(mainMap);
  markerGroupHawaii  = L.layerGroup().addTo(hawaiiMap);
  markerGroupAlaska  = L.layerGroup().addTo(alaskaMap);
}

// ─── Data loading ─────────────────────────────────────────────────────────
async function LoadSites() {
  const response = await fetch("/api/sites");
  allSites = await response.json();
  allSites.sort((a, b) => a.id - b.id);
  return allSites;
}

// ─── Sidebar buttons ──────────────────────────────────────────────────────
async function AddButtons() {
  const sites = await LoadSites();
  container.innerHTML = "";

  sites.forEach((site) => {
    let button = document.createElement("button");
    button.classList.add("sidebar-button");
    button.textContent = site.id + " — " + site.name;
    button.id = `site-${site.id}-button`;

    // Left-click: add to selection
    button.onclick = () => {
      if (!selectedSites.some((s) => s.id === site.id)) {
        selectedSites.push(site);
      }
      HighlightButton(button);
    };

    // Right-click: remove from selection
    button.oncontextmenu = (event) => {
      event.preventDefault();
      selectedSites = selectedSites.filter((item) => item.id !== site.id);
      button.className = "sidebar-button";
      ClearMarkers();
      AddMarkersNoDelay(selectedSites);
    };

    container.appendChild(button);
    buttonsList.push(button);
  });
}

// ─── Marker helpers ───────────────────────────────────────────────────────
function AddMarker(site) {
  const lat = site.latitude;
  const lng = site.longitude;

  const style = {
    weight: 2,
    radius: 6,
    color: "#000",
    fillColor: "#ffff00",
    fillOpacity: 0.85,
  };

  L.circleMarker([lat, lng], style)
    .bindTooltip(`<b>${site.name}</b><br>Qty: ${site.quantity}`, { sticky: true })
    .addTo(markerGroupMain);

  L.circleMarker([lat, lng], { ...style, radius: 4 }).addTo(markerGroupHawaii);
  L.circleMarker([lat, lng], { ...style, radius: 4 }).addTo(markerGroupAlaska);
}

function ClearMarkers() {
  markerGroupMain.clearLayers();
  markerGroupAlaska.clearLayers();
  markerGroupHawaii.clearLayers();
}

function AddMarkersNoDelay(sites) {
  sites.forEach((site) => AddMarker(site));
}

// ─── Load All ─────────────────────────────────────────────────────────────
async function AddLinesAll() {
  canLoadAll = true;
  document.getElementById("loadselectedBtn").disabled = true;
  selectedSites = [...allSites];

  UnHighlightAllButtons();
  allSites.forEach((site, index) => {
    setTimeout(() => {
      const btn = document.getElementById(`site-${site.id}-button`);
      HighlightButton(btn);
      AddMarker(site);
    }, index * 20);
  });
}

// ─── Load Selected ────────────────────────────────────────────────────────
async function AddLinesSelected() {
  if (selectedSites.length === 0) {
    alert("Please select at least one location first.");
    return;
  }
  document.getElementById("loadallBtn").disabled = true;
  UnHighlightAllButtons();

  selectedSites.forEach((site, index) => {
    setTimeout(() => {
      const btn = document.getElementById(`site-${site.id}-button`);
      HighlightButton(btn);
      AddMarker(site);
    }, index * 20);
  });
}

// ─── Clear All ────────────────────────────────────────────────────────────
function ClearAll() {
  canLoadAll = false;
  selectedSites = [];
  UnHighlightAllButtons();
  ClearMarkers();
  ReenableAllButtons();
}

// ─── Button highlight helpers ─────────────────────────────────────────────
function HighlightButton(button) {
  if (button) button.className = "sidebar-button-selected";
}

function UnHighlightAllButtons() {
  buttonsList.forEach((btn) => {
    btn.className = "sidebar-button";
  });
}

function ReenableAllButtons() {
  document.getElementById("clearallBtn").disabled      = false;
  document.getElementById("loadallBtn").disabled       = false;
  document.getElementById("loadselectedBtn").disabled  = false;
}

// ─── Run Report ───────────────────────────────────────────────────────────
async function RunReport() {
  const targets = selectedSites.length > 0 ? selectedSites : allSites;

  if (targets.length === 0) {
    alert("No locations loaded yet. Click Load All or select some locations first.");
    return;
  }

  const ids = targets.map((s) => s.id);
  const idParam = ids.join(",");

  // Open report page and pass IDs in the URL query string.
  // The report page queries Supabase directly — no sessionStorage needed.
  window.open(
    `/report.html?ids=${idParam}`,
    "Report",
    "width=900,height=600"
  );
}

// ─── Debug helper ─────────────────────────────────────────────────────────
function PrintSelected() {
  selectedSites.forEach((s) => console.log(s));
}

// ─── Shift key cursor hint ────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key === "Shift") document.body.classList.add("shift-held");
});
document.addEventListener("keyup", (e) => {
  if (e.key === "Shift") document.body.classList.remove("shift-held");
});

// ─── Boot ─────────────────────────────────────────────────────────────────
initMaps();
AddButtons();
