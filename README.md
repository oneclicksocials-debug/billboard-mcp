# Billboard MCP Server (`billboard-mcp`)

The first Model Context Protocol (MCP) server that connects AI models (Claude Desktop, Cursor, ChatGPT, Gemini, Cline) directly to **6,400+ real-world digital highway billboards and Times Square LED screens**.

---

## ⚡ What It Does
Enables any AI agent to:
1. **Search Digital Billboards:** Query 6,400+ physical screens across the US by city, state, zip code, or highway corridor (e.g. `Route 128`, `I-93`, `Times Square`, `Miami`).
2. **Inspect Screen Specs:** View aspect ratios (`1400x400`, `840x400`), daily vehicle pass-by traffic (35,000–50,000+ cars/day), and DOT traffic safety guidelines.
3. **Automate Bookings with 48h DOT Protection:** Generate live Stripe reservation links with built-in 48-hour safety buffers for operator content review.

---

## 🚀 Quick Setup in Claude Desktop or Cursor

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "billboards": {
      "command": "node",
      "args": [
        "/Users/salonsh/Desktop/mokey maker/new shit/packages/billboard-mcp/dist/index.js"
      ]
    }
  }
}
```

---

## 🛠️ Available Tools

### 1. `search_billboards`
Search digital billboard inventory across the United States.
* **Arguments:**
  * `query`: e.g. `"Route 128"`, `"Boston"`, `"Times Square"`, `"02118"`
  * `state`: Optional 2-letter state code (`"MA"`, `"NY"`, `"CA"`)
  * `limit`: Max results (default 10)

### 2. `get_billboard_details`
Retrieve exact screen dimensions, facing orientation, and DOT compliance guidelines.
* **Arguments:**
  * `billboard_id`: Unique billboard ID (e.g. `"m9qcpm"`, `"narrku"`)

### 3. `create_billboard_booking`
Generate a live Stripe reservation checkout URL.
* **Arguments:**
  * `billboard_id`: The ID of the screen
  * `package_tier`: `"1day"` ($129), `"3day_weekend"` ($299), `"7day"` ($589), or `"times_square"` ($497)
  * `target_date`: Launch date (`YYYY-MM-DD`, enforced $\ge 48$ hours in advance)
  * `headline_text`: Ad headline (max 7 words recommended)
  * `contact_phone_or_url`: Phone number or clean URL to display on screen

---

## 💰 Rate Card & Pricing
* **1-Day Local Flash:** **$129.00** (120+ flashes / day)
* **3-Day Weekend Domination:** **$299.00** (360+ flashes Fri–Sun)
* **7-Day Regional Domination:** **$589.00** (840+ flashes)
* **Times Square PR Launch:** **$497.00** (100+ evening rotations + 4K operator proof photos)
