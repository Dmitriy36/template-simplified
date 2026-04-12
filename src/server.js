require("dotenv").config();
const express = require("express");
const path = require("path");
//const path = require("path")
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── Supabase config ────────────────────────────────────────────────────────
// Replace these two values with your own from the Supabase dashboard.
// Project Settings → API → Project URL and anon/public key.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Thin helper: call the Supabase REST API directly (no SDK required).
async function supabaseQuery(query) {
  const url = `${SUPABASE_URL}/rest/v1/${query}`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase error: ${response.status} — ${text}`);
  }
  return response.json();
}

// ─── GET /api/sites ──────────────────────────────────────────────────────────
// Returns all rows from the locations table so the frontend can render the map.
app.get("/api/sites", async (req, res) => {
  try {
    const data = await supabaseQuery(
      "locations?select=id,name,latitude,longitude,quantity&order=id.asc",
    );
    res.json(data);
  } catch (err) {
    console.error("Error in /api/sites:", err.message);
    res.status(500).json({ error: "Failed to load sites" });
  }
});

// ─── POST /api/report ────────────────────────────────────────────────────────
// Accepts { ids: [1, 2, 3] } and returns each location's name + quantity
// plus a grand total.
app.post("/api/report", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || ids.length === 0) {
      return res.status(400).json({ error: "No location ids provided" });
    }

    // Supabase REST: filter with in operator
    const idList = ids.join(",");
    const data = await supabaseQuery(
      `locations?select=id,name,quantity&id=in.(${idList})&order=id.asc`,
    );

    const grandTotal = data.reduce((sum, row) => sum + (row.quantity || 0), 0);

    res.json({ rows: data, grandTotal });
  } catch (err) {
    console.error("Error in /api/report:", err.message);
    res.status(500).json({ error: "Failed to run report" });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(8080, "0.0.0.0", () => {
  console.log("Server listening on http://localhost:8080");
});
