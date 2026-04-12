# Map Report Template

A clean, self-contained web app for plotting locations on an interactive Leaflet map and running quantity-sum reports on any selection. Built with Node.js/Express on the backend and a single Supabase table for data.

Adapted from a production VA reporting tool. All AWS services, authentication, and domain-specific logic have been removed.

---

## What It Does

- Displays locations as markers on a Leaflet map of the US (with Alaska and Hawaii insets)
- Sidebar lists every location as a clickable button
- Left-click a button to select a location; right-click to deselect
- Hold **Shift** and click to multi-select across groups
- **Load All** plots all locations at once; **Load Selected** plots only your current selection
- **Run Report** opens a popup showing each selected location's quantity and a grand total
- **System Flowchart** opens an interactive architecture diagram explaining how the app works

---

## Project Structure

```
map-report-template/
└── src/
    ├── server.js          ← Express server (2 API routes)
    ├── package.json
    └── public/
        ├── index.html     ← Main map page
        ├── report.html    ← Report popup (queries Supabase directly)
        ├── flowchart.html ← Interactive architecture diagram
        ├── css/
        │   └── styles.css
        └── js/
            └── script.js  ← All map and selection logic
```

---

## Step 1 — Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up for a free account.
2. Click **New Project**.
3. Choose a name (e.g. `map-report`), set a database password, and pick the region closest to you.
4. Wait about 60 seconds for the project to be provisioned.

---

## Step 2 — Create the locations Table

1. In your Supabase project, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Paste the following SQL and click **Run**:

```sql
CREATE TABLE locations (
  id        SERIAL PRIMARY KEY,
  name      TEXT    NOT NULL,
  latitude  FLOAT   NOT NULL,
  longitude FLOAT   NOT NULL,
  quantity  INTEGER NOT NULL DEFAULT 0
);
```

---

## Step 3 — Add Sample Data

In the same SQL Editor, run this to insert five starter locations:

```sql
INSERT INTO locations (name, latitude, longitude, quantity)
VALUES
  ('New York',    40.7128,  -74.0060,  120),
  ('Chicago',     41.8781,  -87.6298,   95),
  ('Houston',     29.7604,  -95.3698,  210),
  ('Phoenix',     33.4484, -112.0740,   77),
  ('Los Angeles', 34.0522, -118.2437,  180);
```

You can add, edit, or remove rows at any time using the **Table Editor** in Supabase.

---

## Step 4 — Get Your Supabase Credentials

1. In your Supabase project, go to **Project Settings** → **API**.
2. Copy the **Project URL** (looks like `https://abcdefghij.supabase.co`).
3. Copy the **anon / public** key (a long JWT string).

---

## Step 5 — Add Your Credentials to the App

You need to paste your credentials in **two files**:

### File 1: `src/server.js`

Open `src/server.js` and find these two lines near the top:

```js
const SUPABASE_URL      = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
```

Replace both placeholder values with your actual URL and key.

### File 2: `src/public/report.html`

Open `src/public/report.html` and find the same two lines inside the `<script>` block:

```js
const SUPABASE_URL      = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
```

Replace those as well.

> **Why two places?** The server uses the credentials to serve `/api/sites` and `/api/report`. The report popup queries Supabase directly from the browser so it doesn't need to round-trip through the server.

---

## Step 6 — Install Dependencies and Run

You need **Node.js version 18 or higher** (for built-in `fetch` support). Check your version with:

```bash
node --version
```

If you need to install or upgrade Node, download it from [https://nodejs.org](https://nodejs.org).

Then, from inside the `src/` folder:

```bash
cd src
npm install
npm start
```

You should see:

```
Server listening on http://localhost:8080
```

Open your browser to [http://localhost:8080](http://localhost:8080).

---

## How to Use the App

| Action | How |
|---|---|
| Select a location | Click its button in the sidebar |
| Deselect a location | Right-click its button |
| Select multiple | Hold Shift and click additional buttons |
| Plot selected on map | Click **Load Selected** |
| Plot all locations | Click **Load All** |
| Clear everything | Click **Clear All** |
| Run a report | Click **Run Report** (uses current selection, or all if nothing selected) |
| View architecture | Click **System Flowchart** |

---

## Customising the Data

The app is driven entirely by the `locations` table. To adapt it to your own domain:

- **Add columns** to the table (e.g. `category`, `region`, `label`) and update the SELECT queries in `server.js` to include them.
- **Rename `quantity`** to anything meaningful for your use case (oxygen_masks, units, staff_count, etc.) — just update the column name in the SQL and the display label in `report.html`.
- **Add grouping to reports** by sending additional metadata alongside the IDs and grouping rows in `report.html`.

---

## API Reference

### `GET /api/sites`
Returns all rows from the `locations` table.

**Response:**
```json
[
  { "id": 1, "name": "New York", "latitude": 40.7128, "longitude": -74.006, "quantity": 120 },
  ...
]
```

### `POST /api/report`
Returns quantity data for a specific set of location IDs.

**Request body:**
```json
{ "ids": [1, 2, 3] }
```

**Response:**
```json
{
  "rows": [
    { "id": 1, "name": "New York", "quantity": 120 },
    { "id": 2, "name": "Chicago",  "quantity": 95  }
  ],
  "grandTotal": 215
}
```

---

## Security Note

The `SUPABASE_ANON_KEY` is safe to expose in client-side JavaScript for read-only access — that is its intended use. Supabase's Row Level Security (RLS) controls what the anon key can actually do. For this template, the default Supabase policy allows public reads, which is appropriate for a demo or internal tool. If you need to restrict access, enable RLS on the `locations` table in your Supabase dashboard.
