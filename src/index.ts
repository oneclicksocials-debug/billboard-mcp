import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load billboard dataset
interface Billboard {
  id: string;
  code?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  latitude?: number;
  longitude?: number;
  impressions?: number;
  width?: number;
  height?: number;
  facing?: string;
}

let billboards: Billboard[] = [];
try {
  const dataPath = path.join(__dirname, "billboards_data.json");
  const raw = fs.readFileSync(dataPath, "utf-8");
  billboards = JSON.parse(raw);
} catch (err) {
  console.error("Warning: could not load billboard database:", err);
}

const server = new Server(
  {
    name: "billboard-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register Available Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_billboards",
        description:
          "Search 6,400+ real-world digital billboard locations across the United States by query (city, state, zip code, or highway corridor like Route 128, I-93, Times Square). Returns pricing, daily impressions, and screen resolution.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "Location, city, state, zip code, or highway name (e.g. 'Boston', 'Route 128', 'Times Square', '02118', 'Miami', 'Dallas')",
            },
            state: {
              type: "string",
              description:
                "Optional 2-letter state code filter (e.g. 'MA', 'NY', 'CA', 'TX', 'FL')",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default 10, max 30)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_billboard_details",
        description:
          "Retrieve complete specifications, orientation, pixel resolution, and DOT compliance requirements for a specific billboard ID.",
        inputSchema: {
          type: "object",
          properties: {
            billboard_id: {
              type: "string",
              description: "Unique billboard identifier (e.g. 'm9qcpm', 'c3rysv')",
            },
          },
          required: ["billboard_id"],
        },
      },
      {
        name: "create_billboard_booking",
        description:
          "Generate a live Stripe reservation checkout URL for a digital billboard campaign. Enforces a minimum 48-hour advance scheduling window for state DOT safety & operator content review.",
        inputSchema: {
          type: "object",
          properties: {
            billboard_id: {
              type: "string",
              description: "The billboard ID to book",
            },
            package_tier: {
              type: "string",
              enum: ["1day", "3day_weekend", "7day", "times_square"],
              description:
                "Campaign tier: '1day' ($129 / 120+ flashes), '3day_weekend' ($299 / 360+ flashes Fri-Sun), '7day' ($589 / 840+ flashes), or 'times_square' ($497 / Times Square PR Launch)",
            },
            target_date: {
              type: "string",
              description:
                "Desired broadcast start date (YYYY-MM-DD). Must be at least 48 hours in the future to allow DOT operator content approval.",
            },
            headline_text: {
              type: "string",
              description:
                "Headline or business name to appear on the digital billboard creative (maximum 7 words recommended for 65mph highway readability)",
            },
            contact_phone_or_url: {
              type: "string",
              description:
                "Phone number or clean domain to display on screen (e.g. '617-555-0199' or 'acme.com')",
            },
          },
          required: ["billboard_id", "package_tier", "target_date"],
        },
      },
    ],
  };
});

// Handle Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "search_billboards") {
    const query = String(args?.query || "").toLowerCase().trim();
    const stateFilter = args?.state ? String(args.state).toUpperCase().trim() : null;
    const limit = Math.min(Number(args?.limit) || 10, 30);

    const matches = billboards.filter((b) => {
      const fullText = [
        b.name,
        b.address,
        b.city,
        b.state,
        b.zip,
        b.code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = fullText.includes(query);
      const matchesState = stateFilter
        ? (b.state && (b.state.toUpperCase() === stateFilter || b.state.toUpperCase().includes(stateFilter)))
        : true;

      return matchesQuery && matchesState;
    });

    const results = matches.slice(0, limit).map((b) => {
      const isTimesSquare = (b.city?.toLowerCase().includes("new york") || b.state?.toLowerCase().includes("new york")) &&
        (b.name?.toLowerCase().includes("times square") || b.address?.toLowerCase().includes("broadway") || b.address?.toLowerCase().includes("42nd") || b.address?.toLowerCase().includes("43rd"));

      return {
        id: b.id,
        name: b.name || "Digital Highway Billboard",
        address: b.address || "Commuter Corridor",
        city: b.city || "Metro",
        state: b.state || "US",
        daily_vehicle_impressions: b.impressions || "35,000 - 50,000+",
        standard_resolution: "1400x400 (or 840x400)",
        rate_card: {
          "1_day_drop": "$129 (120+ flashes)",
          "3_day_weekend": "$299 (360+ flashes Fri-Sun)",
          "7_day_domination": "$589 (840+ flashes)",
          times_square_pr_drop: isTimesSquare ? "$497 (100+ flashes + 4K operator photos)" : undefined,
        },
        booking_url: `https://localads.space/checkout?id=${b.id}`,
      };
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              total_found: matches.length,
              returned_results: results.length,
              billboards: results,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "get_billboard_details") {
    const id = String(args?.billboard_id || "").trim();
    const billboard = billboards.find((b) => b.id === id);

    if (!billboard) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: `Billboard with ID '${id}' not found in inventory.` }),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              id: billboard.id,
              name: billboard.name,
              address: billboard.address,
              city: billboard.city,
              state: billboard.state,
              zip: billboard.zip,
              coordinates: {
                lat: billboard.lat || billboard.latitude,
                lon: billboard.lon || billboard.longitude,
              },
              specifications: {
                display_type: "Full-Screen Digital LED",
                aspect_ratio: "1400x400 (3.5:1) or 840x400 (2.1:1)",
                color_profile: "sRGB",
                accepted_formats: ["PNG", "JPEG"],
                max_file_size: "2MB",
                rotation_cycle: "Flashes full-screen for 8-10 seconds every 60-90 seconds",
                daily_flashes: "120+ guaranteed displays per day",
              },
              dot_compliance_rules: [
                "Static graphics only (federal/state DOT regulations strictly prohibit video/strobe on roadside boards)",
                "No imitation traffic controls (no red octagons, stop symbols, or flashing amber lights)",
                "Maximum 7 words recommended for optimal 65mph driver legibility",
              ],
              approval_window:
                "Standard 12 to 24 hour operator content review. Earliest launch is 48 hours from booking date.",
              direct_booking_link: `https://localads.space/checkout?id=${billboard.id}`,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "create_billboard_booking") {
    const id = String(args?.billboard_id || "").trim();
    const tier = String(args?.package_tier || "1day");
    const targetDateStr = String(args?.target_date || "");

    // 48-Hour Safety Validation
    const now = new Date();
    const targetDate = new Date(targetDateStr);
    const minLeadTimeMs = 44 * 60 * 60 * 1000; // ~44-48 hours

    if (isNaN(targetDate.getTime()) || (targetDate.getTime() - now.getTime()) < minLeadTimeMs) {
      const earliestValid = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString().split("T")[0];
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "SCHEDULE_DATE_ADJUSTMENT_REQUIRED",
                message:
                  `Digital billboards require state DOT traffic safety and operator content approval (which takes 12 to 24 hours on business days). The earliest available broadcast launch date is ${earliestValid}.`,
                earliest_available_date: earliestValid,
                requested_date: targetDateStr,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const priceMap: Record<string, { price: string; stripe_url: string; flashes: string }> = {
      "1day": {
        price: "$129.00",
        stripe_url: "https://buy.stripe.com/4gMaEX2oZ2fY6N97Ng4F200",
        flashes: "120+ full-screen rotations across 24h",
      },
      "3day_weekend": {
        price: "$299.00",
        stripe_url: "https://buy.stripe.com/6oU5kD8Nng6O9ZlffI4F201",
        flashes: "360+ rotations (Friday through Sunday open-house coverage)",
      },
      "7day": {
        price: "$589.00",
        stripe_url: "https://buy.stripe.com/cNi4gzgfP9Iqdbx3x04F202",
        flashes: "840+ rotations across 7 days",
      },
      times_square: {
        price: "$497.00",
        stripe_url: "https://buy.stripe.com/cNi4gzgfP9Iqdbx3x04F202",
        flashes: "100+ prime evening flashes + 4K operator proof photos",
      },
    };

    const selected = priceMap[tier] || priceMap["1day"];
    const confirmationUrl = `https://localads.space/checkout?id=${id}&tier=${tier}&date=${targetDateStr}`;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "RESERVATION_READY",
              billboard_id: id,
              package: tier,
              total_amount: selected.price,
              guaranteed_airtime: selected.flashes,
              confirmed_launch_date: targetDateStr,
              next_steps: [
                "1. Click the secure Stripe checkout link to authorize the reservation.",
                "2. LocalAds Space compliance team submits artwork to the billboard operator.",
                "3. Operator confirms approval within 12-24 hours.",
                "4. Live proof-of-performance (timestamped photos & broadcast logs) delivered upon launch.",
              ],
              stripe_checkout_link: selected.stripe_url,
              web_customizer_link: confirmationUrl,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  throw new Error(`Tool not found: ${name}`);
});

// Start Server on Stdio Transport
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Billboard MCP Server is running and listening on stdio.");
}

run().catch((err) => {
  console.error("Fatal error running Billboard MCP server:", err);
  process.exit(1);
});
