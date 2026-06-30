// Generates static SEO landing pages (one per target town) into public/fishing/,
// plus sitemap.xml. Runs automatically before every build via the "prebuild" npm
// script, so the pages always carry the current year/branding with zero manual steps.
//
// Why static pages: the React app is client-rendered, so Google sees little
// per-location content. These pages give each town a real, crawlable URL
// ("fishcondish.com/fishing/margate-city-nj/") with unique copy, and a CTA that
// deep-links into the live app (/?lat=..&lon=..&label=..).
//
// Adding a town: add one line to TOWNS below. Slug is derived from the name.

const fs = require('fs');
const path = require('path');
const tipLinks = require('./tip-links');

const SITE = 'https://fishcondish.com';

// AI-generated local reports (optional). Produced by scripts/generate-ai-reports.js
// and cached in scripts/ai-reports.json so the BUILD never calls the API — it just
// reads this file. Pages without a cached report render fine without that section.
let AI_REPORTS = {};
try {
  AI_REPORTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'ai-reports.json'), 'utf8'));
} catch { AI_REPORTS = {}; }

// type: 'coastal' | 'inland' — drives the species copy and wording
const TOWNS = [
  // --- South Jersey shore ---
  { name: 'Margate City, NJ', lat: 39.3298, lon: -74.5021, type: 'coastal', water: 'the back bays and ocean surf' },
  { name: 'Atlantic City, NJ', lat: 39.3643, lon: -74.4229, type: 'coastal', water: 'Absecon Inlet, the back bays, and the surf' },
  { name: 'Ventnor City, NJ', lat: 39.3401, lon: -74.4774, type: 'coastal', water: 'the surf, jetties, and back bays' },
  { name: 'Longport, NJ', lat: 39.3093, lon: -74.5335, type: 'coastal', water: 'Great Egg Harbor Inlet and the surf' },
  { name: 'Brigantine, NJ', lat: 39.4101, lon: -74.3646, type: 'coastal', water: 'the north-end surf and Absecon Inlet' },
  { name: 'Ocean City, NJ', lat: 39.2776, lon: -74.5746, type: 'coastal', water: 'Great Egg Harbor Bay and the surf' },
  { name: 'Somers Point, NJ', lat: 39.3176, lon: -74.5946, type: 'coastal', water: 'Great Egg Harbor Bay and the rips' },
  { name: 'Sea Isle City, NJ', lat: 39.1534, lon: -74.6929, type: 'coastal', water: 'Ludlam Bay and the beachfront' },
  { name: 'Avalon, NJ', lat: 39.1012, lon: -74.7177, type: 'coastal', water: 'Townsends Inlet and the back sounds' },
  { name: 'Stone Harbor, NJ', lat: 39.0526, lon: -74.7644, type: 'coastal', water: 'Hereford Inlet and the sounds' },
  { name: 'Wildwood, NJ', lat: 38.9918, lon: -74.8149, type: 'coastal', water: 'Hereford Inlet, the back bays, and the beach' },
  { name: 'Cape May, NJ', lat: 38.9351, lon: -74.906, type: 'coastal', water: 'Delaware Bay, the rips, and the jetties' },
  { name: 'Tuckerton, NJ', lat: 39.6034, lon: -74.3401, type: 'coastal', water: 'Great Bay and Little Egg Harbor' },
  { name: 'Beach Haven, NJ', lat: 39.5593, lon: -74.2432, type: 'coastal', water: 'Little Egg Inlet and the LBI surf' },
  { name: 'Barnegat Light, NJ', lat: 39.757, lon: -74.1065, type: 'coastal', water: 'Barnegat Inlet and the bay' },
  { name: 'Forked River, NJ', lat: 39.8412, lon: -74.1907, type: 'coastal', water: 'Barnegat Bay and Oyster Creek' },
  { name: 'Toms River, NJ', lat: 39.9537, lon: -74.1979, type: 'coastal', water: 'Barnegat Bay and the Toms River' },
  { name: 'Point Pleasant Beach, NJ', lat: 40.0917, lon: -74.0479, type: 'coastal', water: 'Manasquan Inlet and the surf' },
  { name: 'Manasquan, NJ', lat: 40.1262, lon: -74.0493, type: 'coastal', water: 'Manasquan Inlet and the river' },
  { name: 'Belmar, NJ', lat: 40.1784, lon: -74.0218, type: 'coastal', water: 'Shark River Inlet and the surf' },
  { name: 'Asbury Park, NJ', lat: 40.2204, lon: -74.0121, type: 'coastal', water: 'the rock jetties and beachfront' },
  { name: 'Atlantic Highlands, NJ', lat: 40.4079, lon: -74.0343, type: 'coastal', water: 'Sandy Hook Bay and Raritan Bay' },
  { name: 'Highlands, NJ', lat: 40.404, lon: -73.9924, type: 'coastal', water: 'Sandy Hook, the rips, and the bay' },
  // --- Inland / rivers & lakes ---
  { name: 'Trenton, NJ', lat: 40.2206, lon: -74.7597, type: 'inland', water: 'the Delaware River' },
  { name: 'Lambertville, NJ', lat: 40.3659, lon: -74.943, type: 'inland', water: 'the Delaware River and feeder creeks' },
  { name: 'Frenchtown, NJ', lat: 40.5262, lon: -75.0618, type: 'inland', water: 'the upper Delaware River' },
  { name: 'Lebanon, NJ (Round Valley)', lat: 40.6234, lon: -74.835, type: 'inland', water: 'Round Valley Reservoir' },
  { name: 'Lake Hopatcong, NJ', lat: 40.9415, lon: -74.661, type: 'inland', water: 'Lake Hopatcong' },
  { name: 'Greenwood Lake, NJ', lat: 41.1726, lon: -74.3457, type: 'inland', water: 'Greenwood Lake' },
  { name: 'Hackettstown, NJ', lat: 40.854, lon: -74.829, type: 'inland', water: 'the Musconetcong River' },

  // ===== Top US fishing destinations (national) =====
  // --- Northeast coast ---
  { name: 'Montauk, NY', lat: 41.0359, lon: -71.9545, type: 'coastal', water: 'Montauk Point and the rips', species: 'striped bass, bluefish, false albacore, fluke, and black sea bass' },
  { name: 'Gloucester, MA', lat: 42.6159, lon: -70.6620, type: 'coastal', water: 'Cape Ann and Massachusetts Bay', species: 'striped bass, bluefish, haddock, and cod' },
  { name: 'Chatham, MA', lat: 41.6818, lon: -69.9597, type: 'coastal', water: 'the Cape Cod flats and rips', species: 'striped bass, bluefish, fluke, and black sea bass' },
  { name: 'Block Island, RI', lat: 41.1712, lon: -71.5580, type: 'coastal', water: "the island's rips and reefs", species: 'striped bass, bluefish, fluke, and false albacore' },
  // --- Mid-Atlantic ---
  { name: 'Ocean City, MD', lat: 38.3365, lon: -75.0849, type: 'coastal', water: 'the inlet, surf, and back bays', species: 'striped bass, flounder, tautog, and bluefish' },
  { name: 'Virginia Beach, VA', lat: 36.8529, lon: -75.9780, type: 'coastal', water: 'the Chesapeake Bay mouth and surf', species: 'striped bass (rockfish), red drum, flounder, and cobia' },
  // --- Southeast coast ---
  { name: 'Nags Head, NC', lat: 35.9573, lon: -75.6240, type: 'coastal', water: 'the Outer Banks surf and sounds', species: 'red drum, striped bass, bluefish, and flounder' },
  { name: 'Cape Hatteras, NC', lat: 35.2493, lon: -75.5288, type: 'coastal', water: 'the Hatteras surf and inlet', species: 'red drum, false albacore, bluefish, and king mackerel' },
  { name: 'Morehead City, NC', lat: 34.7229, lon: -76.7261, type: 'coastal', water: 'Bogue Sound and the nearshore reefs' },
  { name: 'Charleston, SC', lat: 32.7765, lon: -79.9311, type: 'coastal', water: 'the harbor, creeks, and nearshore reefs', species: 'red drum, spotted seatrout, flounder, and sheepshead' },
  { name: 'Hilton Head Island, SC', lat: 32.2163, lon: -80.7526, type: 'coastal', water: 'the sounds and tidal creeks' },
  { name: 'Savannah, GA', lat: 32.0809, lon: -81.0912, type: 'coastal', water: 'the tidal rivers and sounds' },
  // --- Florida ---
  { name: 'Jacksonville, FL', lat: 30.3322, lon: -81.6557, type: 'coastal', water: 'the St. Johns River mouth and surf' },
  { name: 'St. Augustine, FL', lat: 29.9012, lon: -81.3124, type: 'coastal', water: 'the inlet, ICW, and surf' },
  { name: 'Stuart, FL', lat: 27.1973, lon: -80.2528, type: 'coastal', water: 'the St. Lucie Inlet and offshore', species: 'sailfish, snook, tarpon, and snapper' },
  { name: 'Boca Grande, FL', lat: 26.7484, lon: -82.2596, type: 'coastal', water: 'Boca Grande Pass and the harbor', species: 'tarpon, snook, redfish, and grouper' },
  { name: 'Naples, FL', lat: 26.1420, lon: -81.7948, type: 'coastal', water: 'the passes and nearshore reefs' },
  { name: 'Islamorada, FL', lat: 24.9243, lon: -80.6276, type: 'coastal', water: 'the Florida Keys flats and reef', species: 'bonefish, tarpon, permit, mahi-mahi, and snapper' },
  { name: 'Key West, FL', lat: 24.5551, lon: -81.7800, type: 'coastal', water: 'the reef, wrecks, and flats', species: 'tarpon, permit, snapper, grouper, and mahi-mahi' },
  { name: 'Miami, FL', lat: 25.7617, lon: -80.1918, type: 'coastal', water: 'Biscayne Bay and the Gulf Stream' },
  { name: 'Tampa, FL', lat: 27.9506, lon: -82.4572, type: 'coastal', water: "Tampa Bay's flats and passes", species: 'snook, redfish, spotted seatrout, and tarpon' },
  { name: 'Destin, FL', lat: 30.3935, lon: -86.4958, type: 'coastal', water: 'Destin Pass and the offshore grounds', species: 'red snapper, king mackerel, cobia, and grouper' },
  { name: 'Pensacola, FL', lat: 30.4213, lon: -87.2169, type: 'coastal', water: 'the pass, bay, and Gulf' },
  // --- Gulf coast ---
  { name: 'Orange Beach, AL', lat: 30.2697, lon: -87.5836, type: 'coastal', water: 'Perdido Pass and the Gulf reefs' },
  { name: 'Biloxi, MS', lat: 30.3960, lon: -88.8853, type: 'coastal', water: 'the Mississippi Sound and barrier islands' },
  { name: 'Venice, LA', lat: 29.2769, lon: -89.3540, type: 'coastal', water: 'the Mississippi Delta passes', species: 'redfish, speckled trout, yellowfin tuna, and cobia' },
  { name: 'Grand Isle, LA', lat: 29.2366, lon: -89.9873, type: 'coastal', water: 'the surf, passes, and rigs' },
  { name: 'Galveston, TX', lat: 29.3013, lon: -94.7977, type: 'coastal', water: 'the jetties, bay, and surf', species: 'redfish, speckled trout, flounder, and red snapper' },
  { name: 'Port Aransas, TX', lat: 27.8339, lon: -97.0611, type: 'coastal', water: 'the jetties and Aransas Pass' },
  { name: 'South Padre Island, TX', lat: 26.1118, lon: -97.1681, type: 'coastal', water: 'the Lower Laguna Madre and Gulf' },
  // --- Pacific coast ---
  { name: 'San Diego, CA', lat: 32.7157, lon: -117.1611, type: 'coastal', water: 'the kelp beds and offshore banks', species: 'yellowtail, tuna, calico bass, and rockfish' },
  { name: 'Bodega Bay, CA', lat: 38.3332, lon: -123.0480, type: 'coastal', water: 'the bay and coastal reefs', species: 'rockfish, lingcod, salmon, and Dungeness crab' },
  { name: 'Astoria, OR', lat: 46.1879, lon: -123.8313, type: 'coastal', water: 'the Columbia River mouth', species: 'Chinook salmon, sturgeon, and steelhead' },
  { name: 'Westport, WA', lat: 46.9043, lon: -124.1048, type: 'coastal', water: 'Grays Harbor and the coast' },
  // --- Alaska ---
  { name: 'Sitka, AK', lat: 57.0531, lon: -135.3300, type: 'coastal', water: 'the sounds and outer coast', species: 'king and coho salmon, halibut, and rockfish' },
  { name: 'Homer, AK', lat: 59.6425, lon: -151.5483, type: 'coastal', water: 'Kachemak Bay and Cook Inlet', species: 'halibut, king salmon, and rockfish' },
  // --- Inland lakes & rivers ---
  { name: 'Lake of the Ozarks, MO', lat: 38.1989, lon: -92.7560, type: 'inland', water: 'Lake of the Ozarks', species: 'largemouth and spotted bass, crappie, catfish, and white bass' },
  { name: 'Lake Guntersville, AL', lat: 34.3580, lon: -86.2947, type: 'inland', water: 'Lake Guntersville', species: 'largemouth bass, crappie, and catfish' },
  { name: 'Lake Fork, TX', lat: 32.8390, lon: -95.5666, type: 'inland', water: 'Lake Fork Reservoir', species: 'trophy largemouth bass and crappie' },
  { name: 'Lake Okeechobee, FL', lat: 27.0500, lon: -80.8300, type: 'inland', water: 'Lake Okeechobee', species: 'largemouth bass, black crappie (specks), and bluegill' },
  { name: 'Lake Champlain, VT', lat: 44.4759, lon: -73.2121, type: 'inland', water: 'Lake Champlain', species: 'smallmouth and largemouth bass, lake trout, and walleye' },
  { name: 'Port Clinton, OH', lat: 41.5125, lon: -82.9377, type: 'inland', water: "Lake Erie's western basin", species: 'walleye, yellow perch, and smallmouth bass' },
  { name: 'Mille Lacs Lake, MN', lat: 46.2480, lon: -93.6530, type: 'inland', water: 'Mille Lacs Lake', species: 'walleye, smallmouth bass, and northern pike' },
  { name: 'Lake Tahoe, CA', lat: 38.9399, lon: -119.9772, type: 'inland', water: 'Lake Tahoe', species: 'mackinaw (lake trout), rainbow trout, and kokanee' },
  { name: 'Lake Havasu City, AZ', lat: 34.4839, lon: -114.3225, type: 'inland', water: 'Lake Havasu', species: 'largemouth and smallmouth bass, striped bass, and catfish' },
  { name: 'Toledo Bend, TX', lat: 31.1800, lon: -93.5700, type: 'inland', water: 'Toledo Bend Reservoir', species: 'largemouth bass, crappie, and catfish' },
  { name: 'Kentucky Lake, KY', lat: 36.9900, lon: -88.2700, type: 'inland', water: 'Kentucky Lake', species: 'largemouth and smallmouth bass, crappie, and catfish' },
  { name: 'Bull Shoals Lake, AR', lat: 36.3780, lon: -92.5810, type: 'inland', water: 'Bull Shoals Lake', species: 'largemouth, smallmouth, and spotted bass; trout below the dam' },
  { name: 'Ennis, MT', lat: 45.3490, lon: -111.7280, type: 'inland', water: 'the Madison River', species: 'wild rainbow and brown trout' },
  { name: 'Lake Powell, AZ', lat: 36.9147, lon: -111.4558, type: 'inland', water: 'Lake Powell', species: 'striped bass, largemouth and smallmouth bass, and walleye' },

  // ===== Expansion: ~150 more high-search US fishing locations =====
  // --- Northeast coast ---
  { name: 'Portland, ME', lat: 43.6591, lon: -70.2568, type: 'coastal', water: 'Casco Bay and the harbor', species: 'striped bass, mackerel, bluefish, and cod' },
  { name: 'Boothbay Harbor, ME', lat: 43.8519, lon: -69.6275, type: 'coastal', water: 'the midcoast bays and islands' },
  { name: 'Kittery, ME', lat: 43.0895, lon: -70.7339, type: 'coastal', water: 'the Piscataqua River mouth and coast' },
  { name: 'Bar Harbor, ME', lat: 44.3876, lon: -68.2039, type: 'coastal', water: 'Frenchman Bay' },
  { name: 'Portsmouth, NH', lat: 43.0718, lon: -70.7626, type: 'coastal', water: 'the Piscataqua and Isles of Shoals' },
  { name: 'Newburyport, MA', lat: 42.8126, lon: -70.8773, type: 'coastal', water: 'the Merrimack River mouth and Plum Island' },
  { name: 'Boston, MA', lat: 42.3601, lon: -71.0589, type: 'coastal', water: 'Boston Harbor and the islands', species: 'striped bass, bluefish, and flounder' },
  { name: 'Plymouth, MA', lat: 41.9584, lon: -70.6673, type: 'coastal', water: 'Cape Cod Bay' },
  { name: 'Provincetown, MA', lat: 42.0588, lon: -70.1786, type: 'coastal', water: 'the tip of Cape Cod' },
  { name: 'New Bedford, MA', lat: 41.6362, lon: -70.9342, type: 'coastal', water: 'Buzzards Bay' },
  { name: "Martha's Vineyard, MA", lat: 41.3888, lon: -70.6456, type: 'coastal', water: "the island's ponds and rips", species: 'striped bass, bluefish, false albacore, and bonito' },
  { name: 'Nantucket, MA', lat: 41.2835, lon: -70.0995, type: 'coastal', water: "the island's rips and flats" },
  { name: 'Newport, RI', lat: 41.4901, lon: -71.3128, type: 'coastal', water: 'the bay and oceanfront' },
  { name: 'Narragansett, RI', lat: 41.4501, lon: -71.4495, type: 'coastal', water: 'Narragansett Bay and the surf' },
  { name: 'Stonington, CT', lat: 41.3354, lon: -71.9054, type: 'coastal', water: 'Fishers Island Sound' },
  { name: 'Niantic, CT', lat: 41.3251, lon: -72.1939, type: 'coastal', water: 'Long Island Sound and the river' },
  { name: 'Greenport, NY', lat: 41.1037, lon: -72.3618, type: 'coastal', water: 'the North Fork and Peconic Bay' },
  { name: 'Sheepshead Bay, NY', lat: 40.5876, lon: -73.9442, type: 'coastal', water: 'Jamaica Bay and the ocean' },
  { name: 'Freeport, NY', lat: 40.6576, lon: -73.5832, type: 'coastal', water: 'the South Shore bays and ocean' },
  { name: 'Captree, NY', lat: 40.6290, lon: -73.2620, type: 'coastal', water: 'Fire Island Inlet and the Great South Bay' },
  // --- Chesapeake & Delmarva ---
  { name: 'Annapolis, MD', lat: 38.9784, lon: -76.4922, type: 'coastal', water: 'the Chesapeake Bay', species: 'striped bass (rockfish), white perch, and bluefish' },
  { name: 'Solomons, MD', lat: 38.3193, lon: -76.4544, type: 'coastal', water: 'the mid-Chesapeake and Patuxent' },
  { name: 'Kent Island, MD', lat: 38.9743, lon: -76.3338, type: 'coastal', water: 'the upper Chesapeake Bay' },
  { name: 'Crisfield, MD', lat: 37.9826, lon: -75.8541, type: 'coastal', water: 'Tangier Sound' },
  { name: 'Lewes, DE', lat: 38.7746, lon: -75.1393, type: 'coastal', water: 'Delaware Bay and the canal', species: 'flounder, striped bass, and tautog' },
  { name: 'Indian River Inlet, DE', lat: 38.6101, lon: -75.0671, type: 'coastal', water: 'the inlet and surf' },
  { name: 'Chincoteague, VA', lat: 37.9332, lon: -75.3793, type: 'coastal', water: 'the barrier-island surf and bays' },
  { name: 'Wachapreague, VA', lat: 37.6043, lon: -75.6896, type: 'coastal', water: 'the Eastern Shore seaside' },
  { name: 'Hampton, VA', lat: 37.0299, lon: -76.3452, type: 'coastal', water: 'the Hampton Roads and bay mouth' },
  { name: 'Norfolk, VA', lat: 36.8508, lon: -76.2859, type: 'coastal', water: 'the Bay Bridge-Tunnel and harbor' },
  // --- Southeast Atlantic ---
  { name: 'Wilmington, NC', lat: 34.2104, lon: -77.8868, type: 'coastal', water: 'the Cape Fear River and nearshore' },
  { name: 'Wrightsville Beach, NC', lat: 34.2085, lon: -77.7964, type: 'coastal', water: 'Masonboro Inlet and the surf' },
  { name: 'Atlantic Beach, NC', lat: 34.6996, lon: -76.7402, type: 'coastal', water: 'the Crystal Coast' },
  { name: 'Myrtle Beach, SC', lat: 33.6891, lon: -78.8867, type: 'coastal', water: 'the Grand Strand surf and piers' },
  { name: 'Murrells Inlet, SC', lat: 33.5510, lon: -79.0353, type: 'coastal', water: 'the inlet and nearshore reefs' },
  { name: 'Georgetown, SC', lat: 33.3768, lon: -79.2945, type: 'coastal', water: 'Winyah Bay and the rivers' },
  { name: 'Beaufort, SC', lat: 32.4316, lon: -80.6698, type: 'coastal', water: 'the Lowcountry sounds and creeks' },
  { name: 'Tybee Island, GA', lat: 32.0001, lon: -80.8456, type: 'coastal', water: 'the Savannah River mouth and surf' },
  { name: 'St. Simons Island, GA', lat: 31.1510, lon: -81.3915, type: 'coastal', water: 'the Golden Isles sounds' },
  { name: 'Fernandina Beach, FL', lat: 30.6697, lon: -81.4626, type: 'coastal', water: 'Amelia Island and the inlet' },
  // --- Florida (both coasts) ---
  { name: 'Daytona Beach, FL', lat: 29.2108, lon: -81.0228, type: 'coastal', water: 'the Halifax River and surf' },
  { name: 'Port Canaveral, FL', lat: 28.4058, lon: -80.6209, type: 'coastal', water: 'the port, jetties, and offshore', species: 'king mackerel, redfish, snook, and snapper' },
  { name: 'Cocoa Beach, FL', lat: 28.3200, lon: -80.6076, type: 'coastal', water: 'the Banana River and surf' },
  { name: 'Sebastian Inlet, FL', lat: 27.8603, lon: -80.4475, type: 'coastal', water: 'the inlet and Indian River Lagoon', species: 'snook, redfish, and Spanish mackerel' },
  { name: 'Fort Pierce, FL', lat: 27.4467, lon: -80.3256, type: 'coastal', water: 'the inlet and Indian River Lagoon' },
  { name: 'Jupiter, FL', lat: 26.9342, lon: -80.0942, type: 'coastal', water: 'the inlet and offshore', species: 'sailfish, snook, and snapper' },
  { name: 'Palm Beach, FL', lat: 26.7056, lon: -80.0364, type: 'coastal', water: 'the Gulf Stream and inlet' },
  { name: 'Fort Lauderdale, FL', lat: 26.1224, lon: -80.1373, type: 'coastal', water: 'the offshore reefs and inlet' },
  { name: 'Marathon, FL', lat: 24.7137, lon: -81.0905, type: 'coastal', water: 'the middle Keys flats and reef' },
  { name: 'Big Pine Key, FL', lat: 24.6696, lon: -81.3534, type: 'coastal', water: 'the lower Keys backcountry' },
  { name: 'Clearwater, FL', lat: 27.9659, lon: -82.8001, type: 'coastal', water: 'the Gulf beaches and passes' },
  { name: 'St. Petersburg, FL', lat: 27.7676, lon: -82.6403, type: 'coastal', water: 'Tampa Bay and the Gulf' },
  { name: 'Crystal River, FL', lat: 28.9025, lon: -82.5926, type: 'coastal', water: 'the Nature Coast flats', species: 'redfish, spotted seatrout, and grouper' },
  { name: 'Homosassa, FL', lat: 28.8011, lon: -82.6118, type: 'coastal', water: 'the Nature Coast springs and flats' },
  { name: 'Steinhatchee, FL', lat: 29.6716, lon: -83.3899, type: 'coastal', water: 'the Big Bend flats', species: 'redfish, spotted seatrout, and scallops' },
  { name: 'Cedar Key, FL', lat: 29.1383, lon: -83.0353, type: 'coastal', water: 'the Big Bend backcountry' },
  { name: 'Apalachicola, FL', lat: 29.7261, lon: -84.9856, type: 'coastal', water: 'the bay and barrier islands' },
  { name: 'Panama City, FL', lat: 30.1588, lon: -85.6602, type: 'coastal', water: 'St. Andrews Bay and the pass' },
  { name: 'Sanibel, FL', lat: 26.4470, lon: -82.0150, type: 'coastal', water: 'the passes and flats' },
  { name: 'Fort Myers, FL', lat: 26.6406, lon: -81.8723, type: 'coastal', water: 'the Caloosahatchee and Pine Island Sound' },
  // --- Gulf coast ---
  { name: 'Dauphin Island, AL', lat: 30.2535, lon: -88.1075, type: 'coastal', water: 'the bay mouth and Gulf' },
  { name: 'Gulf Shores, AL', lat: 30.2460, lon: -87.7008, type: 'coastal', water: 'the surf and back bays' },
  { name: 'Gulfport, MS', lat: 30.3674, lon: -89.0928, type: 'coastal', water: 'the Mississippi Sound' },
  { name: 'Lake Charles, LA', lat: 30.2266, lon: -93.2174, type: 'coastal', water: 'Calcasieu Lake', species: 'redfish, speckled trout, and flounder' },
  { name: 'Cocodrie, LA', lat: 29.2480, lon: -90.6612, type: 'coastal', water: 'the Terrebonne marsh' },
  { name: 'Corpus Christi, TX', lat: 27.8006, lon: -97.3964, type: 'coastal', water: 'the bays and Laguna Madre', species: 'redfish, speckled trout, and black drum' },
  { name: 'Rockport, TX', lat: 28.0206, lon: -97.0544, type: 'coastal', water: 'the bays and back lakes' },
  { name: 'Matagorda, TX', lat: 28.6911, lon: -95.9669, type: 'coastal', water: 'the surf, jetties, and bay' },
  { name: 'Freeport, TX', lat: 28.9541, lon: -95.3597, type: 'coastal', water: 'the jetties and nearshore rigs' },
  // --- Pacific coast ---
  { name: 'San Francisco, CA', lat: 37.7749, lon: -122.4194, type: 'coastal', water: 'the bay and the Farallones', species: 'striped bass, halibut, salmon, and rockfish' },
  { name: 'Half Moon Bay, CA', lat: 37.4636, lon: -122.4286, type: 'coastal', water: 'the harbor and offshore reefs' },
  { name: 'Monterey, CA', lat: 36.6002, lon: -121.8947, type: 'coastal', water: 'Monterey Bay', species: 'rockfish, lingcod, salmon, and halibut' },
  { name: 'Santa Cruz, CA', lat: 36.9741, lon: -122.0308, type: 'coastal', water: 'the bay and wharf' },
  { name: 'Santa Barbara, CA', lat: 34.4208, lon: -119.6982, type: 'coastal', water: 'the Channel Islands waters' },
  { name: 'Ventura, CA', lat: 34.2746, lon: -119.2290, type: 'coastal', water: 'the harbor and Channel Islands' },
  { name: 'Long Beach, CA', lat: 33.7701, lon: -118.1937, type: 'coastal', water: 'the harbor and offshore' },
  { name: 'Marina del Rey, CA', lat: 33.9802, lon: -118.4517, type: 'coastal', water: 'Santa Monica Bay' },
  { name: 'Newport Beach, CA', lat: 33.6189, lon: -117.9298, type: 'coastal', water: 'the harbor and offshore banks' },
  { name: 'Eureka, CA', lat: 40.8021, lon: -124.1637, type: 'coastal', water: 'Humboldt Bay and the rivers' },
  { name: 'Newport, OR', lat: 44.6368, lon: -124.0535, type: 'coastal', water: 'Yaquina Bay and the coast' },
  { name: 'Depoe Bay, OR', lat: 44.8090, lon: -124.0640, type: 'coastal', water: 'the central coast reefs' },
  { name: 'Garibaldi, OR', lat: 45.5598, lon: -123.9112, type: 'coastal', water: 'Tillamook Bay' },
  { name: 'Ilwaco, WA', lat: 46.3043, lon: -124.0376, type: 'coastal', water: 'the Columbia River mouth and Buoy 10' },
  { name: 'Neah Bay, WA', lat: 48.3686, lon: -124.6135, type: 'coastal', water: 'the Strait of Juan de Fuca', species: 'salmon, halibut, and lingcod' },
  { name: 'Seattle, WA', lat: 47.6062, lon: -122.3321, type: 'coastal', water: 'Puget Sound', species: 'salmon, lingcod, and rockfish' },
  { name: 'Anacortes, WA', lat: 48.5126, lon: -122.6127, type: 'coastal', water: 'the San Juan Islands' },
  // --- Alaska ---
  { name: 'Juneau, AK', lat: 58.3019, lon: -134.4197, type: 'coastal', water: 'the Inside Passage' },
  { name: 'Ketchikan, AK', lat: 55.3422, lon: -131.6461, type: 'coastal', water: 'the Inside Passage and outer coast', species: 'king and silver salmon, and halibut' },
  { name: 'Kodiak, AK', lat: 57.7900, lon: -152.4072, type: 'coastal', water: "the island's bays and outer waters", species: 'halibut, salmon, and rockfish' },
  { name: 'Valdez, AK', lat: 61.1308, lon: -146.3483, type: 'coastal', water: 'Prince William Sound', species: 'silver salmon and halibut' },
  { name: 'Seward, AK', lat: 60.1042, lon: -149.4422, type: 'coastal', water: 'Resurrection Bay' },
  // --- Great Lakes (salmon, walleye, smallmouth) ---
  { name: 'Chicago, IL', lat: 41.8781, lon: -87.6298, type: 'inland', water: 'Lake Michigan', species: 'Chinook and coho salmon, lake trout, and smallmouth bass' },
  { name: 'Waukegan, IL', lat: 42.3636, lon: -87.8448, type: 'inland', water: "Lake Michigan's harbor and reefs" },
  { name: 'Milwaukee, WI', lat: 43.0389, lon: -87.9065, type: 'inland', water: 'Lake Michigan', species: 'Chinook salmon, brown trout, and coho' },
  { name: 'Sheboygan, WI', lat: 43.7508, lon: -87.7145, type: 'inland', water: "Lake Michigan's salmon grounds" },
  { name: 'Kenosha, WI', lat: 42.5847, lon: -87.8212, type: 'inland', water: 'Lake Michigan' },
  { name: 'Sturgeon Bay, WI', lat: 44.8341, lon: -87.3770, type: 'inland', water: 'Door County and Green Bay', species: 'smallmouth bass, walleye, and salmon' },
  { name: 'Green Bay, WI', lat: 44.5133, lon: -88.0133, type: 'inland', water: 'the bay of Green Bay', species: 'walleye, smallmouth bass, and musky' },
  { name: 'Traverse City, MI', lat: 44.7631, lon: -85.6206, type: 'inland', water: 'Grand Traverse Bay', species: 'salmon, lake trout, and smallmouth bass' },
  { name: 'Ludington, MI', lat: 43.9553, lon: -86.4523, type: 'inland', water: 'Lake Michigan and the Pere Marquette', species: 'Chinook salmon, steelhead, and brown trout' },
  { name: 'Manistee, MI', lat: 44.2445, lon: -86.3242, type: 'inland', water: 'Lake Michigan and the Manistee River', species: 'salmon and steelhead' },
  { name: 'Muskegon, MI', lat: 43.2342, lon: -86.2484, type: 'inland', water: 'Lake Michigan and Muskegon Lake' },
  { name: 'Grand Haven, MI', lat: 43.0631, lon: -86.2284, type: 'inland', water: 'Lake Michigan and the Grand River' },
  { name: 'Bay City, MI', lat: 43.5945, lon: -83.8889, type: 'inland', water: 'Saginaw Bay', species: 'walleye and smallmouth bass' },
  { name: 'Detroit, MI', lat: 42.3314, lon: -83.0458, type: 'inland', water: 'the Detroit River and Lake St. Clair', species: 'walleye, smallmouth bass, and musky' },
  { name: 'Erie, PA', lat: 42.1292, lon: -80.0851, type: 'inland', water: 'Lake Erie and Presque Isle', species: 'walleye, steelhead, and smallmouth bass' },
  { name: 'Buffalo, NY', lat: 42.8864, lon: -78.8784, type: 'inland', water: 'Lake Erie and the Niagara River', species: 'walleye, smallmouth bass, and steelhead' },
  { name: 'Olcott, NY', lat: 43.3387, lon: -78.7186, type: 'inland', water: "Lake Ontario's western basin", species: 'Chinook salmon, brown trout, and steelhead' },
  { name: 'Rochester, NY', lat: 43.1566, lon: -77.6088, type: 'inland', water: 'Lake Ontario and the Genesee', species: 'salmon, brown trout, and walleye' },
  { name: 'Oswego, NY', lat: 43.4553, lon: -76.5105, type: 'inland', water: "Lake Ontario's eastern basin", species: 'salmon, brown trout, and walleye' },
  { name: 'Pulaski, NY', lat: 43.5670, lon: -76.1280, type: 'inland', water: 'the Salmon River', species: 'Chinook and coho salmon, steelhead, and brown trout' },
  { name: 'Cleveland, OH', lat: 41.4993, lon: -81.6944, type: 'inland', water: "Lake Erie's central basin", species: 'walleye, yellow perch, and smallmouth bass' },
  { name: 'Toledo, OH', lat: 41.6528, lon: -83.5379, type: 'inland', water: 'Lake Erie and the Maumee River', species: 'walleye and white bass' },
  { name: 'Duluth, MN', lat: 46.7867, lon: -92.1005, type: 'inland', water: 'Lake Superior and the harbor', species: 'lake trout, salmon, and walleye' },
  { name: 'Marquette, MI', lat: 46.5436, lon: -87.3954, type: 'inland', water: 'Lake Superior', species: 'lake trout, salmon, and smallmouth bass' },
  // --- Inland lakes: Southeast & South ---
  { name: 'Lake Lanier, GA', lat: 34.2227, lon: -84.0640, type: 'inland', water: 'Lake Lanier', species: 'spotted and largemouth bass, striped bass, and crappie' },
  { name: 'Lake Hartwell, GA', lat: 34.4509, lon: -82.8332, type: 'inland', water: 'Lake Hartwell', species: 'largemouth and spotted bass, striped bass, and crappie' },
  { name: 'Lake Marion, SC', lat: 33.4793, lon: -80.2412, type: 'inland', water: 'the Santee Cooper lakes', species: 'largemouth bass, catfish, and crappie' },
  { name: 'Lake Murray, SC', lat: 34.0807, lon: -81.2293, type: 'inland', water: 'Lake Murray', species: 'largemouth and striped bass, and crappie' },
  { name: 'Lake Norman, NC', lat: 35.5060, lon: -80.9498, type: 'inland', water: 'Lake Norman', species: 'largemouth and spotted bass, and striped bass' },
  { name: 'Kerr Lake, VA', lat: 36.5990, lon: -78.3050, type: 'inland', water: 'Kerr Reservoir (Buggs Island)', species: 'largemouth and striped bass, and crappie' },
  { name: 'Smith Mountain Lake, VA', lat: 37.0457, lon: -79.6470, type: 'inland', water: 'Smith Mountain Lake', species: 'striped and largemouth bass, and crappie' },
  { name: 'Lake Chickamauga, TN', lat: 35.2098, lon: -85.0900, type: 'inland', water: 'Chickamauga Lake', species: 'trophy largemouth bass and crappie' },
  { name: 'Pickwick Lake, TN', lat: 35.0668, lon: -88.2206, type: 'inland', water: 'Pickwick Lake', species: 'smallmouth and largemouth bass, and catfish' },
  { name: 'Old Hickory Lake, TN', lat: 36.2890, lon: -86.6489, type: 'inland', water: 'Old Hickory Lake' },
  { name: 'Wheeler Lake, AL', lat: 34.6470, lon: -87.0700, type: 'inland', water: 'Wheeler Lake' },
  { name: 'Beaver Lake, AR', lat: 36.4220, lon: -93.8290, type: 'inland', water: 'Beaver Lake', species: 'largemouth, smallmouth, and striped bass' },
  { name: 'Grand Lake, OK', lat: 36.5450, lon: -94.8330, type: 'inland', water: "Grand Lake o' the Cherokees", species: 'largemouth and spotted bass, and crappie' },
  { name: 'Lake Texoma, TX', lat: 33.9870, lon: -96.6090, type: 'inland', water: 'Lake Texoma', species: 'striped bass, catfish, and crappie' },
  { name: 'Sam Rayburn Reservoir, TX', lat: 31.0660, lon: -94.1010, type: 'inland', water: 'Sam Rayburn Reservoir', species: 'largemouth bass and crappie' },
  { name: 'Lake Conroe, TX', lat: 30.4280, lon: -95.5790, type: 'inland', water: 'Lake Conroe' },
  // --- Inland lakes: Midwest, Plains, Mountain West & Pacific ---
  { name: 'Lake Minnetonka, MN', lat: 44.9370, lon: -93.5860, type: 'inland', water: 'Lake Minnetonka', species: 'largemouth and smallmouth bass, walleye, and musky' },
  { name: 'Leech Lake, MN', lat: 47.1500, lon: -94.3900, type: 'inland', water: 'Leech Lake', species: 'walleye, muskie, and perch' },
  { name: 'Lake Winnebago, WI', lat: 44.0000, lon: -88.4000, type: 'inland', water: 'Lake Winnebago', species: 'walleye, white bass, and sturgeon' },
  { name: 'Devils Lake, ND', lat: 48.1128, lon: -98.8651, type: 'inland', water: 'Devils Lake', species: 'walleye, perch, and northern pike' },
  { name: 'Lake Sakakawea, ND', lat: 47.5000, lon: -101.4300, type: 'inland', water: 'Lake Sakakawea', species: 'walleye, smallmouth bass, and salmon' },
  { name: 'Lake Oahe, SD', lat: 44.4500, lon: -100.4000, type: 'inland', water: 'Lake Oahe', species: 'walleye, smallmouth bass, and salmon' },
  { name: 'Table Rock Lake, MO', lat: 36.5970, lon: -93.3120, type: 'inland', water: 'Table Rock Lake', species: 'largemouth, smallmouth, and spotted bass' },
  { name: 'Flaming Gorge, UT', lat: 41.0000, lon: -109.5000, type: 'inland', water: 'Flaming Gorge Reservoir', species: 'lake trout, kokanee, and smallmouth bass' },
  { name: 'Clear Lake, CA', lat: 39.0270, lon: -122.7600, type: 'inland', water: 'Clear Lake', species: 'largemouth bass, crappie, and catfish' },
  { name: 'Shasta Lake, CA', lat: 40.8000, lon: -122.3500, type: 'inland', water: 'Shasta Lake', species: 'spotted and largemouth bass, and trout' },
  { name: 'Lake Berryessa, CA', lat: 38.6000, lon: -122.2300, type: 'inland', water: 'Lake Berryessa', species: 'largemouth and smallmouth bass, and trout' },
  { name: 'Lake Mead, NV', lat: 36.1500, lon: -114.4000, type: 'inland', water: 'Lake Mead', species: 'striped and largemouth bass, and catfish' },
  { name: 'Bighorn River, MT', lat: 45.3200, lon: -107.9300, type: 'inland', water: 'the Bighorn River', species: 'wild brown and rainbow trout' },
  { name: 'San Juan River, NM', lat: 36.8000, lon: -107.6700, type: 'inland', water: 'the San Juan River below Navajo Dam', species: 'trophy rainbow and brown trout' },
  // --- Inland: Northeast lakes (high search) ---
  { name: 'Oneida Lake, NY', lat: 43.2100, lon: -75.9200, type: 'inland', water: 'Oneida Lake', species: 'walleye, smallmouth bass, and perch' },
  { name: 'Cayuga Lake, NY', lat: 42.6800, lon: -76.7200, type: 'inland', water: 'Cayuga Lake (Finger Lakes)', species: 'lake trout, smallmouth bass, and landlocked salmon' },
  { name: 'Lake George, NY', lat: 43.4250, lon: -73.7120, type: 'inland', water: 'Lake George', species: 'lake trout, landlocked salmon, and smallmouth bass' },
  { name: 'Lake Winnipesaukee, NH', lat: 43.6200, lon: -71.3300, type: 'inland', water: 'Lake Winnipesaukee', species: 'smallmouth bass, lake trout, and landlocked salmon' },
  { name: 'Sebago Lake, ME', lat: 43.8500, lon: -70.5600, type: 'inland', water: 'Sebago Lake', species: 'landlocked salmon, lake trout, and smallmouth bass' },

  // ===== Expansion 2: 100 more destinations (towns, rivers, lakes) =====
  // --- Famous trout rivers & fly-fishing towns ---
  { name: 'Livingston, MT', lat: 45.6622, lon: -110.5610, type: 'inland', water: 'the Yellowstone River', species: 'wild brown, rainbow, and cutthroat trout' },
  { name: 'Craig, MT', lat: 47.0805, lon: -111.9760, type: 'inland', water: 'the Missouri River', species: 'wild brown and rainbow trout' },
  { name: 'West Yellowstone, MT', lat: 44.6621, lon: -111.1041, type: 'inland', water: 'the Madison and park waters', species: 'wild trout' },
  { name: 'Bozeman, MT', lat: 45.6770, lon: -111.0429, type: 'inland', water: 'the Gallatin and Yellowstone rivers', species: 'wild trout' },
  { name: 'Dillon, MT', lat: 45.2160, lon: -112.6375, type: 'inland', water: 'the Beaverhead and Big Hole rivers', species: 'trophy brown and rainbow trout' },
  { name: 'Jackson, WY', lat: 43.4799, lon: -110.7624, type: 'inland', water: 'the Snake River', species: 'Snake River cutthroat trout' },
  { name: 'Cody, WY', lat: 44.5263, lon: -109.0565, type: 'inland', water: 'the Shoshone and Bighorn rivers', species: 'wild trout' },
  { name: 'Saratoga, WY', lat: 41.4552, lon: -106.8064, type: 'inland', water: 'the North Platte River', species: 'wild brown and rainbow trout' },
  { name: 'Pinedale, WY', lat: 42.8666, lon: -109.8607, type: 'inland', water: 'the Green River and mountain lakes', species: 'trout' },
  { name: 'Salida, CO', lat: 38.5347, lon: -105.9989, type: 'inland', water: 'the Arkansas River', species: 'wild brown and rainbow trout' },
  { name: 'Glenwood Springs, CO', lat: 39.5505, lon: -107.3248, type: 'inland', water: 'the Roaring Fork and Colorado rivers', species: 'wild trout' },
  { name: 'Gunnison, CO', lat: 38.5458, lon: -106.9253, type: 'inland', water: 'the Gunnison River', species: 'wild trout' },
  { name: 'South Fork, CO', lat: 37.6700, lon: -106.6398, type: 'inland', water: 'the Rio Grande', species: 'wild trout' },
  { name: 'Island Park, ID', lat: 44.4163, lon: -111.3711, type: 'inland', water: "Henry's Fork of the Snake", species: 'trophy rainbow trout' },
  { name: 'Stanley, ID', lat: 44.2155, lon: -114.9352, type: 'inland', water: 'the Salmon River', species: 'trout, steelhead, and salmon' },
  { name: 'Maupin, OR', lat: 45.1751, lon: -121.0808, type: 'inland', water: 'the Deschutes River', species: 'redband trout and steelhead' },
  { name: 'Grants Pass, OR', lat: 42.4390, lon: -123.3284, type: 'inland', water: 'the Rogue River', species: 'salmon and steelhead' },
  { name: 'Ellensburg, WA', lat: 46.9965, lon: -120.5478, type: 'inland', water: 'the Yakima River', species: 'wild trout' },
  { name: 'Heber City, UT', lat: 40.5070, lon: -111.4133, type: 'inland', water: 'the Provo River', species: 'wild brown and rainbow trout' },
  { name: 'State College, PA', lat: 40.7934, lon: -77.8600, type: 'inland', water: 'Spring Creek and Penns Creek', species: 'wild brown trout' },
  { name: 'Roscoe, NY', lat: 41.9337, lon: -74.9132, type: 'inland', water: 'the Beaverkill and Willowemoc', species: 'wild and stocked trout' },
  { name: 'Hancock, NY', lat: 41.9512, lon: -75.2824, type: 'inland', water: 'the West Branch Delaware', species: 'wild brown and rainbow trout' },
  { name: 'Manchester, VT', lat: 43.1637, lon: -73.0723, type: 'inland', water: 'the Battenkill', species: 'wild brown and brook trout' },
  { name: 'Grayling, MI', lat: 44.6614, lon: -84.7148, type: 'inland', water: 'the Au Sable River', species: 'brown and brook trout' },
  { name: 'Cotter, AR', lat: 36.2828, lon: -92.5266, type: 'inland', water: 'the White River', species: 'trophy brown and rainbow trout' },
  { name: 'Bishop, CA', lat: 37.3614, lon: -118.3951, type: 'inland', water: 'the Owens River and Eastern Sierra', species: 'wild and stocked trout' },
  { name: 'Cherokee, NC', lat: 35.4748, lon: -83.3157, type: 'inland', water: 'the mountain trout waters', species: 'rainbow, brown, and brook trout' },
  { name: 'New Hartford, CT', lat: 41.8801, lon: -72.9762, type: 'inland', water: 'the Farmington River', species: 'wild and holdover trout' },
  { name: 'Bristol, TN', lat: 36.5951, lon: -82.1887, type: 'inland', water: 'the South Holston River', species: 'trophy brown and rainbow trout' },
  { name: 'Branson, MO', lat: 36.6437, lon: -93.2185, type: 'inland', water: 'Lake Taneycomo', species: 'trophy rainbow and brown trout' },
  // --- Big bass / striper / walleye lakes ---
  { name: 'Lake Cumberland, KY', lat: 36.9100, lon: -85.0900, type: 'inland', water: 'Lake Cumberland', species: 'striped and largemouth bass, and walleye' },
  { name: 'Dale Hollow Lake, TN', lat: 36.5400, lon: -85.3800, type: 'inland', water: 'Dale Hollow Lake', species: 'trophy smallmouth bass and walleye' },
  { name: 'Center Hill Lake, TN', lat: 36.0400, lon: -85.8200, type: 'inland', water: 'Center Hill Lake', species: 'smallmouth and largemouth bass, and walleye' },
  { name: 'Watts Bar Lake, TN', lat: 35.6300, lon: -84.7800, type: 'inland', water: 'Watts Bar Lake', species: 'largemouth bass, crappie, and catfish' },
  { name: 'Lake Eufaula, AL', lat: 31.9000, lon: -85.1300, type: 'inland', water: 'Lake Eufaula', species: 'largemouth bass and crappie' },
  { name: 'Lake Seminole, GA', lat: 30.7700, lon: -84.8800, type: 'inland', water: 'Lake Seminole', species: 'largemouth bass and crappie' },
  { name: 'Clarks Hill Lake, GA', lat: 33.6600, lon: -82.1900, type: 'inland', water: 'Clarks Hill Lake', species: 'largemouth and hybrid bass, and crappie' },
  { name: 'Lake Oconee, GA', lat: 33.4200, lon: -83.2300, type: 'inland', water: 'Lake Oconee', species: 'largemouth and striped bass, and crappie' },
  { name: 'Lake Wylie, SC', lat: 35.1100, lon: -81.0300, type: 'inland', water: 'Lake Wylie', species: 'largemouth bass and crappie' },
  { name: 'Lake Keowee, SC', lat: 34.8900, lon: -82.8800, type: 'inland', water: 'Lake Keowee', species: 'largemouth and spotted bass' },
  { name: 'Lake Gaston, NC', lat: 36.5200, lon: -77.9400, type: 'inland', water: 'Lake Gaston', species: 'largemouth and striped bass' },
  { name: 'Lake Travis, TX', lat: 30.4000, lon: -98.0000, type: 'inland', water: 'Lake Travis', species: 'largemouth, white, and striped bass' },
  { name: 'Lake Buchanan, TX', lat: 30.7700, lon: -98.4200, type: 'inland', water: 'Lake Buchanan', species: 'striped and largemouth bass, and catfish' },
  { name: 'Caddo Lake, TX', lat: 32.7000, lon: -94.1700, type: 'inland', water: 'Caddo Lake', species: 'largemouth bass, crappie, and catfish' },
  { name: 'Falcon Lake, TX', lat: 26.7000, lon: -99.1700, type: 'inland', water: 'Falcon Lake', species: 'trophy largemouth bass and catfish' },
  { name: 'Lake Amistad, TX', lat: 29.5200, lon: -101.0500, type: 'inland', water: 'Lake Amistad', species: 'largemouth and smallmouth bass, and catfish' },
  { name: 'Cedar Creek Lake, TX', lat: 32.2000, lon: -96.0800, type: 'inland', water: 'Cedar Creek Reservoir', species: 'largemouth bass, crappie, and catfish' },
  { name: 'Lake Tawakoni, TX', lat: 32.8800, lon: -95.9600, type: 'inland', water: 'Lake Tawakoni', species: 'catfish, crappie, and largemouth bass' },
  { name: 'Norfork Lake, AR', lat: 36.4200, lon: -92.2400, type: 'inland', water: 'Norfork Lake', species: 'striped and largemouth bass, and crappie' },
  { name: 'Greers Ferry Lake, AR', lat: 35.5200, lon: -91.9600, type: 'inland', water: 'Greers Ferry Lake', species: 'largemouth, smallmouth, and hybrid bass' },
  { name: 'Lake Ouachita, AR', lat: 34.5700, lon: -93.2000, type: 'inland', water: 'Lake Ouachita', species: 'largemouth and striped bass, and crappie' },
  { name: 'Truman Lake, MO', lat: 38.2600, lon: -93.4000, type: 'inland', water: 'Truman Lake', species: 'crappie, largemouth bass, and catfish' },
  { name: 'Lake of the Woods, MN', lat: 49.0000, lon: -94.8700, type: 'inland', water: 'Lake of the Woods', species: 'walleye, sauger, and northern pike' },
  { name: 'Rainy Lake, MN', lat: 48.6200, lon: -93.1600, type: 'inland', water: 'Rainy Lake', species: 'walleye, smallmouth bass, and northern pike' },
  { name: 'Upper Red Lake, MN', lat: 47.9700, lon: -94.9000, type: 'inland', water: 'Upper Red Lake', species: 'walleye and crappie' },
  { name: 'Lake Vermilion, MN', lat: 47.8800, lon: -92.3500, type: 'inland', water: 'Lake Vermilion', species: 'walleye, smallmouth bass, and muskie' },
  { name: 'Lake Winnibigoshish, MN', lat: 47.4200, lon: -94.2000, type: 'inland', water: 'Lake Winnibigoshish', species: 'walleye and perch' },
  { name: 'Lake McConaughy, NE', lat: 41.2500, lon: -101.7000, type: 'inland', water: 'Lake McConaughy', species: 'walleye, white bass, and wipers' },
  { name: 'Lake Francis Case, SD', lat: 43.4000, lon: -99.3000, type: 'inland', water: 'Lake Francis Case', species: 'walleye and smallmouth bass' },
  { name: 'Fort Peck Lake, MT', lat: 47.7000, lon: -106.9000, type: 'inland', water: 'Fort Peck Lake', species: 'walleye, lake trout, and northern pike' },
  { name: 'Flathead Lake, MT', lat: 47.8700, lon: -114.1100, type: 'inland', water: 'Flathead Lake', species: 'lake trout and whitefish' },
  { name: 'Chautauqua Lake, NY', lat: 42.1700, lon: -79.4000, type: 'inland', water: 'Chautauqua Lake', species: 'muskellunge, walleye, and bass' },
  { name: 'Seneca Lake, NY', lat: 42.6700, lon: -76.9500, type: 'inland', water: 'Seneca Lake', species: 'lake trout, landlocked salmon, and bass' },
  { name: 'Thousand Islands, NY', lat: 44.2400, lon: -76.0860, type: 'inland', water: 'the St. Lawrence River', species: 'smallmouth bass, muskellunge, walleye, and northern pike' },
  { name: 'Cave Run Lake, KY', lat: 38.1200, lon: -83.5300, type: 'inland', water: 'Cave Run Lake', species: 'muskellunge, largemouth bass, and crappie' },
  { name: 'Lake Barkley, KY', lat: 36.9600, lon: -87.9300, type: 'inland', water: 'Lake Barkley', species: 'largemouth and smallmouth bass, crappie, and catfish' },
  // --- Western lakes & reservoirs ---
  { name: 'Pyramid Lake, NV', lat: 40.0200, lon: -119.5700, type: 'inland', water: 'Pyramid Lake', species: 'Lahontan cutthroat trout' },
  { name: 'Lake Oroville, CA', lat: 39.5400, lon: -121.4900, type: 'inland', water: 'Lake Oroville', species: 'spotted and largemouth bass, and king salmon' },
  { name: 'Folsom Lake, CA', lat: 38.7100, lon: -121.1500, type: 'inland', water: 'Folsom Lake', species: 'largemouth and smallmouth bass, and trout' },
  { name: 'New Melones Lake, CA', lat: 37.9500, lon: -120.5300, type: 'inland', water: 'New Melones Lake', species: 'spotted and largemouth bass, and trout' },
  { name: 'Castaic Lake, CA', lat: 34.5300, lon: -118.6100, type: 'inland', water: 'Castaic Lake', species: 'largemouth and striped bass' },
  { name: 'Lake Roosevelt, WA', lat: 47.9400, lon: -118.9800, type: 'inland', water: 'Lake Roosevelt', species: 'walleye, kokanee, and rainbow trout' },
  { name: 'Potholes Reservoir, WA', lat: 46.9700, lon: -119.3300, type: 'inland', water: 'Potholes Reservoir', species: 'walleye, largemouth bass, and crappie' },
  { name: "Lake Coeur d'Alene, ID", lat: 47.6100, lon: -116.7600, type: 'inland', water: "Lake Coeur d'Alene", species: 'chinook salmon, bass, and northern pike' },
  { name: 'Lake Pend Oreille, ID', lat: 48.1700, lon: -116.4000, type: 'inland', water: 'Lake Pend Oreille', species: 'rainbow trout and kokanee' },
  { name: 'Bear Lake, UT', lat: 41.9500, lon: -111.3000, type: 'inland', water: 'Bear Lake', species: 'cutthroat trout and cisco' },
  { name: 'Strawberry Reservoir, UT', lat: 40.1700, lon: -111.1600, type: 'inland', water: 'Strawberry Reservoir', species: 'cutthroat and rainbow trout, and kokanee' },
  { name: 'Elephant Butte, NM', lat: 33.1900, lon: -107.2100, type: 'inland', water: 'Elephant Butte Lake', species: 'largemouth and white bass, and walleye' },
  { name: 'Navajo Lake, NM', lat: 36.8000, lon: -107.6100, type: 'inland', water: 'Navajo Lake', species: 'smallmouth and largemouth bass, and kokanee' },
  { name: 'Lake Pleasant, AZ', lat: 33.8700, lon: -112.2700, type: 'inland', water: 'Lake Pleasant', species: 'largemouth and white bass, and stripers' },
  { name: 'Roosevelt Lake, AZ', lat: 33.6700, lon: -111.1600, type: 'inland', water: 'Theodore Roosevelt Lake', species: 'largemouth and smallmouth bass, and crappie' },
  { name: 'Lake Mohave, NV', lat: 35.3300, lon: -114.6000, type: 'inland', water: 'Lake Mohave', species: 'striped and largemouth bass, and trout' },
  // --- Coastal gaps & Alaska river/salmon towns ---
  { name: 'Soldotna, AK', lat: 60.4877, lon: -151.0583, type: 'inland', water: 'the Kenai River', species: 'king and silver salmon, and trout' },
  { name: 'Anchorage, AK', lat: 61.2181, lon: -149.9003, type: 'coastal', water: 'Ship Creek and Cook Inlet', species: 'king and silver salmon' },
  { name: 'Petersburg, AK', lat: 56.8125, lon: -132.9556, type: 'coastal', water: 'the Inside Passage' },
  { name: 'Cordova, AK', lat: 60.5428, lon: -145.7575, type: 'coastal', water: 'the Copper River Delta', species: 'salmon and halibut' },
  { name: 'Whittier, AK', lat: 60.7733, lon: -148.6855, type: 'coastal', water: 'Prince William Sound' },
  { name: 'Oceanside, CA', lat: 33.1959, lon: -117.3795, type: 'coastal', water: 'the harbor and offshore' },
  { name: 'Dana Point, CA', lat: 33.4672, lon: -117.6981, type: 'coastal', water: 'the offshore banks and kelp' },
  { name: 'Morro Bay, CA', lat: 35.3659, lon: -120.8499, type: 'coastal', water: 'the bay and nearshore reefs' },
  { name: 'Fort Bragg, CA', lat: 39.4457, lon: -123.8053, type: 'coastal', water: 'the Mendocino coast', species: 'rockfish, lingcod, and salmon' },
  { name: 'Brookings, OR', lat: 42.0526, lon: -124.2840, type: 'coastal', water: 'the south coast and Chetco River' },
  { name: 'Coos Bay, OR', lat: 43.3665, lon: -124.2179, type: 'coastal', water: 'the bay and jetties' },
  { name: 'Florence, OR', lat: 43.9826, lon: -124.0998, type: 'coastal', water: 'the Siuslaw River and coast' },
  { name: 'Port Angeles, WA', lat: 48.1181, lon: -123.4307, type: 'coastal', water: 'the Strait of Juan de Fuca' },
  { name: 'Friday Harbor, WA', lat: 48.5343, lon: -123.0170, type: 'coastal', water: 'the San Juan Islands' },
  { name: 'Hyannis, MA', lat: 41.6526, lon: -70.2828, type: 'coastal', water: 'Nantucket Sound' },
  { name: 'Point Judith, RI', lat: 41.3637, lon: -71.4912, type: 'coastal', water: 'the Point Judith rips and Block Island Sound' },
  { name: 'Carolina Beach, NC', lat: 34.0352, lon: -77.8936, type: 'coastal', water: 'the surf, piers, and inlet' },
  { name: 'Pawleys Island, SC', lat: 33.4307, lon: -79.1220, type: 'coastal', water: 'the creeks and surf' },
  { name: 'Long Beach Island, NJ', lat: 39.6573, lon: -74.1857, type: 'coastal', water: 'the LBI surf, inlets, and Barnegat Bay' },
  { name: 'Cape Cod, MA', lat: 41.6688, lon: -70.2962, type: 'coastal', water: 'Cape Cod beaches, bays, and the canal' },
  { name: 'Cape Cod Canal, MA', lat: 41.7704, lon: -70.5207, type: 'coastal', water: 'the fast-moving canal current' },
  { name: 'Falmouth, MA', lat: 41.5515, lon: -70.6148, type: 'coastal', water: 'Vineyard Sound and the Falmouth shoreline' },
  { name: 'Outer Banks, NC', lat: 35.5585, lon: -75.4665, type: 'coastal', water: 'the OBX surf, sounds, and inlets' },
  { name: 'Florida Keys, FL', lat: 24.7798, lon: -80.9533, type: 'coastal', water: 'the flats, channels, bridges, and reef' },
  { name: 'Chesapeake Bay, MD', lat: 38.3, lon: -76.3, type: 'coastal', water: 'the bay channels, flats, and tidal rivers' },
  { name: 'Sandy Hook, NJ', lat: 40.4604, lon: -73.9962, type: 'coastal', water: 'the Sandy Hook surf and rips' },
  { name: 'Finger Lakes, NY', lat: 42.7, lon: -76.8, type: 'inland', water: 'the deep, clear Finger Lakes' },
  { name: 'Lake Erie, OH', lat: 41.7, lon: -82.4, type: 'inland', water: 'Lake Erie walleye and bass grounds' },
  { name: 'Kenai River, AK', lat: 60.5544, lon: -150.854, type: 'inland', water: 'Kenai River salmon and trout runs' },
  { name: 'Columbia River, OR', lat: 45.651, lon: -121.9, type: 'inland', water: 'Columbia River salmon and steelhead' },
  { name: 'Lake St. Clair, MI', lat: 42.453, lon: -82.7, type: 'inland', water: 'the smallmouth and muskie flats' },
  { name: 'Little Egg Harbor, NJ', lat: 39.5807, lon: -74.3293, type: 'coastal', water: 'Little Egg Harbor Bay and the back marsh' },
  { name: 'Barnegat Bay, NJ', lat: 39.826, lon: -74.1097, type: 'coastal', water: 'the shallow bay flats, channels, and sedges' },
  { name: 'Manasquan Inlet, NJ', lat: 40.1023, lon: -74.0343, type: 'coastal', water: 'the inlet, rocks, and Manasquan River' },
  { name: 'Seaside Heights, NJ', lat: 39.9443, lon: -74.0726, type: 'coastal', water: 'the surf and Barnegat Bay back side' },
  { name: 'Island Beach State Park, NJ', lat: 39.7937, lon: -74.0954, type: 'coastal', water: 'miles of undeveloped surf and the inlet' },
  { name: 'Bay Head, NJ', lat: 40.0701, lon: -74.0454, type: 'coastal', water: 'the surf and the head of Barnegat Bay' },
  { name: 'Great Bay, NJ', lat: 39.536, lon: -74.336, type: 'coastal', water: 'the Mullica River mouth and Great Bay' },
  { name: 'Sea Bright, NJ', lat: 40.3621, lon: -73.9718, type: 'coastal', water: 'the surf, jetties, and Shrewsbury River' },
  { name: 'Long Branch, NJ', lat: 40.3043, lon: -73.9924, type: 'coastal', water: 'the surf and nearshore lumps' },
  { name: 'Cape May Point, NJ', lat: 38.9362, lon: -74.9621, type: 'coastal', water: 'the rips, Delaware Bay, and the point' },
  { name: 'Delaware Bay, NJ', lat: 39.15, lon: -75.15, type: 'coastal', water: 'the bay flats, sloughs, and reef sites' },
  { name: 'Raritan Bay, NJ', lat: 40.45, lon: -74.2, type: 'coastal', water: 'the bay channels, reefs, and flats' },
  { name: 'Shark River, NJ', lat: 40.186, lon: -74.03, type: 'coastal', water: 'the inlet, basin, and tidal river' },
  { name: 'Mullica River, NJ', lat: 39.56, lon: -74.53, type: 'coastal', water: 'the brackish river and creek mouths' },
  { name: 'Jamaica Bay, NY', lat: 40.61, lon: -73.83, type: 'coastal', water: 'the bay flats, channels, and marsh' },
  { name: 'Fire Island, NY', lat: 40.63, lon: -73.1, type: 'coastal', water: 'the surf, inlet, and Great South Bay' },
  { name: 'Great South Bay, NY', lat: 40.65, lon: -73.2, type: 'coastal', water: 'the bay flats, channels, and reefs' },
  { name: 'Moriches Inlet, NY', lat: 40.76, lon: -72.76, type: 'coastal', water: 'the inlet, surf, and bay' },
  { name: 'Shinnecock, NY', lat: 40.84, lon: -72.48, type: 'coastal', water: 'Shinnecock Inlet, canal, and ocean' },
  { name: 'Jones Beach, NY', lat: 40.59, lon: -73.51, type: 'coastal', water: 'the surf and the inlet' },
  { name: 'Orient Point, NY', lat: 41.162, lon: -72.237, type: 'coastal', water: 'the rips, Plum Gut, and the Race' },
  { name: 'Peconic Bay, NY', lat: 40.95, lon: -72.5, type: 'coastal', water: 'the bay flats and creek mouths' },
  { name: 'Hudson River, NY', lat: 41.7, lon: -73.94, type: 'coastal', water: 'the tidal Hudson and its flats' },
  { name: 'Lake Ontario, NY', lat: 43.45, lon: -77.6, type: 'inland', water: 'the open lake, piers, and river mouths' },
  { name: 'Niagara River, NY', lat: 43.16, lon: -79.04, type: 'inland', water: 'the lower river drift and eddies' },
  { name: 'Long Island Sound, CT', lat: 41.1, lon: -72.9, type: 'coastal', water: 'the reefs, rips, and tidal rivers' },
  { name: 'Buzzards Bay, MA', lat: 41.55, lon: -70.75, type: 'coastal', water: 'the bay flats, holes, and the canal' },
  { name: 'Boston Harbor, MA', lat: 42.34, lon: -70.96, type: 'coastal', water: 'the harbor islands, flats, and channels' },
  { name: 'Casco Bay, ME', lat: 43.7, lon: -70.15, type: 'coastal', water: 'the islands, ledges, and river mouths' },
  { name: 'Kennebunkport, ME', lat: 43.362, lon: -70.477, type: 'coastal', water: 'the harbor, the river, and the coast' },
  { name: 'Penobscot Bay, ME', lat: 44.1, lon: -68.8, type: 'coastal', water: 'the bay, the islands, and the ledges' },
  { name: 'Moosehead Lake, ME', lat: 45.6, lon: -69.7, type: 'inland', water: 'the big north-woods lake and coves' },
  { name: 'Rudee Inlet, VA', lat: 36.83, lon: -75.967, type: 'coastal', water: 'the inlet and nearshore wrecks' },
  { name: 'Chesapeake Bay Bridge Tunnel, VA', lat: 37.03, lon: -76.08, type: 'coastal', water: 'the pilings, islands, and tubes' },
  { name: 'Point Lookout, MD', lat: 38.039, lon: -76.322, type: 'coastal', water: 'the Potomac mouth and the bay rips' },
  { name: 'Susquehanna Flats, MD', lat: 39.52, lon: -76.08, type: 'coastal', water: 'the upper-bay flats and river mouth' },
  { name: 'James River, VA', lat: 37.2, lon: -76.7, type: 'coastal', water: 'the tidal river, flats, and pilings' },
  { name: 'Rappahannock River, VA', lat: 37.6, lon: -76.4, type: 'coastal', water: 'the tidal river and creek mouths' },
  { name: 'Oregon Inlet, NC', lat: 35.77, lon: -75.53, type: 'coastal', water: 'the inlet, the surf, and offshore' },
  { name: 'Ocracoke, NC', lat: 35.1146, lon: -75.9799, type: 'coastal', water: 'the surf, the inlet, and the sound' },
  { name: 'Cape Lookout, NC', lat: 34.623, lon: -76.524, type: 'coastal', water: 'the shoals, the surf, and the hook' },
  { name: 'Topsail Beach, NC', lat: 34.396, lon: -77.608, type: 'coastal', water: 'the surf, the pier, and the sound' },
  { name: 'Charleston Harbor, SC', lat: 32.76, lon: -79.92, type: 'coastal', water: 'the harbor, the jetties, and the rivers' },
  { name: 'Edisto Island, SC', lat: 32.5021, lon: -80.3015, type: 'coastal', water: 'the surf, the sounds, and the creeks' },
  { name: 'Jekyll Island, GA', lat: 31.0686, lon: -81.4079, type: 'coastal', water: 'the surf, the pier, and the sounds' },
  { name: 'Brunswick, GA', lat: 31.1497, lon: -81.4915, type: 'coastal', water: 'the rivers, the sounds, and the marsh' },
  { name: 'Mosquito Lagoon, FL', lat: 28.77, lon: -80.78, type: 'coastal', water: 'the flats, the sloughs, and the spoil islands' },
  { name: 'Indian River Lagoon, FL', lat: 27.9, lon: -80.5, type: 'coastal', water: 'the flats, the docks, and the channels' },
  { name: 'Charlotte Harbor, FL', lat: 26.85, lon: -82.1, type: 'coastal', water: 'the harbor flats, bars, and creeks' },
  { name: 'Sanibel Island, FL', lat: 26.447, lon: -82.111, type: 'coastal', water: 'the surf, the pass, and the sound' },
  { name: 'Marco Island, FL', lat: 25.9412, lon: -81.7184, type: 'coastal', water: 'the passes, the flats, and the keys' },
  { name: 'Biscayne Bay, FL', lat: 25.58, lon: -80.2, type: 'coastal', water: 'the flats, the channels, and the bridges' },
  { name: 'Lake Tohopekaliga, FL', lat: 28.2, lon: -81.4, type: 'inland', water: 'the grass, the reeds, and the canals' },
  { name: 'St. Johns River, FL', lat: 29.0, lon: -81.35, type: 'inland', water: 'the river, the lakes, and the creeks' },
  { name: 'Ponce Inlet, FL', lat: 29.08, lon: -80.93, type: 'coastal', water: 'the inlet, the jetty, and the surf' },
  { name: 'Calcasieu Lake, LA', lat: 29.85, lon: -93.3, type: 'coastal', water: 'the lake, the jetties, and the flats' },
  { name: 'Sabine Lake, TX', lat: 29.8, lon: -93.88, type: 'coastal', water: 'the lake, the passes, and the flats' },
  { name: 'Baffin Bay, TX', lat: 27.29, lon: -97.52, type: 'coastal', water: 'the rocks, the flats, and the grass' },
  { name: 'Saginaw Bay, MI', lat: 43.8, lon: -83.7, type: 'inland', water: 'the bay flats, reefs, and river mouth' },
  { name: 'Door County, WI', lat: 45.0, lon: -87.2, type: 'inland', water: 'the bays, the reefs, and the shore' },
  { name: 'Sandusky, OH', lat: 41.4489, lon: -82.708, type: 'inland', water: 'the bay, the reefs, and the islands' },
  { name: 'Detroit River, MI', lat: 42.2, lon: -83.13, type: 'inland', water: 'the river drift, the flats, and the channels' },
  { name: 'Mississippi River, MN', lat: 44.94, lon: -93.09, type: 'inland', water: 'the pools, the wing dams, and the backwaters' },
  { name: 'Missouri River, SD', lat: 44.37, lon: -100.35, type: 'inland', water: 'the river, the flats, and the tailraces' },
  { name: 'Madison River, MT', lat: 45.4, lon: -111.5, type: 'inland', water: 'the riffles, the runs, and the channels' },
  { name: 'Green River, UT', lat: 40.9, lon: -109.4, type: 'inland', water: 'the tailwater runs and the flats' },
  { name: 'Sacramento River, CA', lat: 38.58, lon: -121.5, type: 'inland', water: 'the river, the flats, and the deep holes' },
  { name: 'Norris Lake, TN', lat: 36.22, lon: -83.9, type: 'inland', water: 'the bluffs, the points, and the creeks' },
  { name: 'Chickamauga Lake, TN', lat: 35.35, lon: -85.09, type: 'inland', water: 'the ledges, the grass, and the flats' },
  { name: 'Lake Martin, AL', lat: 32.82, lon: -85.9, type: 'inland', water: 'the points, the docks, and the coves' },
  { name: 'Santee Cooper, SC', lat: 33.45, lon: -80.2, type: 'inland', water: 'the flats, the stumps, and the rivers' },
  { name: 'Lake Anna, VA', lat: 38.07, lon: -77.8, type: 'inland', water: 'the points, the docks, and the flats' },
  { name: 'Snake River, ID', lat: 43.5, lon: -114.0, type: 'inland', water: 'the runs, the riffles, and the flats' },
  { name: 'Columbia River Gorge, OR', lat: 45.7, lon: -121.5, type: 'inland', water: 'the river, the eddies, and the mouths' },
  { name: 'Lake Coeur d Alene area, ID', lat: 47.6, lon: -116.78, type: 'inland', water: 'the bays, the points, and the river' },
  { name: 'Absecon Inlet, NJ', lat: 39.36, lon: -74.41, type: 'coastal', water: 'the inlet, the jetties, and the back bays' },
  { name: 'Townsends Inlet, NJ', lat: 39.12, lon: -74.71, type: 'coastal', water: 'the inlet, the sound, and the surf' },
  { name: 'Hereford Inlet, NJ', lat: 39.02, lon: -74.78, type: 'coastal', water: 'the inlet, the channels, and the marsh' },
  { name: 'Fortescue, NJ', lat: 39.24, lon: -75.17, type: 'coastal', water: 'the Delaware Bay flats and sloughs' },
  { name: 'Navesink River, NJ', lat: 40.37, lon: -74.05, type: 'coastal', water: 'the tidal river and creek mouths' },
  { name: 'Round Valley Reservoir, NJ', lat: 40.62, lon: -74.85, type: 'inland', water: 'the deep, clear reservoir and points' },
  { name: 'Spruce Run Reservoir, NJ', lat: 40.65, lon: -74.92, type: 'inland', water: 'the flats, the points, and the coves' },
  { name: 'Manasquan Reservoir, NJ', lat: 40.15, lon: -74.18, type: 'inland', water: 'the timber, the flats, and the points' },
  { name: 'Plum Gut, NY', lat: 41.16, lon: -72.21, type: 'coastal', water: 'the gut, the rips, and the current' },
  { name: 'Cuttyhunk, MA', lat: 41.42, lon: -70.92, type: 'coastal', water: 'the rocks, the rips, and the holes' },
  { name: 'Watch Hill, RI', lat: 41.31, lon: -71.86, type: 'coastal', water: 'the reef, the rips, and the passage' },
  { name: 'Charlestown, RI', lat: 41.38, lon: -71.64, type: 'coastal', water: 'the breachway, the surf, and the ponds' },
  { name: 'Galilee, RI', lat: 41.38, lon: -71.51, type: 'coastal', water: 'the harbor, the channel, and the wall' },
  { name: 'Cape Ann, MA', lat: 42.66, lon: -70.62, type: 'coastal', water: 'the rocks, the harbors, and the ledges' },
  { name: 'Merrimack River, MA', lat: 42.81, lon: -70.82, type: 'coastal', water: 'the river mouth, the jetties, and the flats' },
  { name: 'Saco River, ME', lat: 43.46, lon: -70.45, type: 'coastal', water: 'the river mouth, the jetty, and the beach' },
  { name: 'Damariscotta, ME', lat: 43.99, lon: -69.52, type: 'coastal', water: 'the river, the harbor, and the ledges' },
  { name: 'Assateague, MD', lat: 38.25, lon: -75.15, type: 'coastal', water: 'the surf, the channels, and the bay' },
  { name: 'Tangier Sound, MD', lat: 37.95, lon: -75.95, type: 'coastal', water: 'the sound, the flats, and the guts' },
  { name: 'Choptank River, MD', lat: 38.6, lon: -76.1, type: 'coastal', water: 'the tidal river, the flats, and the pilings' },
  { name: 'Lynnhaven Inlet, VA', lat: 36.91, lon: -76.09, type: 'coastal', water: 'the inlet, the bridges, and the flats' },
  { name: 'York River, VA', lat: 37.25, lon: -76.5, type: 'coastal', water: 'the tidal river, the flats, and the pilings' },
  { name: 'New River, VA', lat: 37.2, lon: -80.7, type: 'inland', water: 'the riffles, the runs, and the ledges' },
  { name: 'Pamlico Sound, NC', lat: 35.3, lon: -75.9, type: 'coastal', water: 'the sound, the flats, and the marsh' },
  { name: 'Albemarle Sound, NC', lat: 36.05, lon: -76.2, type: 'coastal', water: 'the sound, the river mouths, and the flats' },
  { name: 'Roanoke River, NC', lat: 36.0, lon: -77.0, type: 'inland', water: 'the river, the runs, and the flats' },
  { name: 'Bogue Inlet, NC', lat: 34.65, lon: -77.1, type: 'coastal', water: 'the inlet, the surf, and the sound' },
  { name: 'Cape Fear River, NC', lat: 34.1, lon: -77.95, type: 'coastal', water: 'the tidal river, the flats, and the rock walls' },
  { name: 'Winyah Bay, SC', lat: 33.22, lon: -79.18, type: 'coastal', water: 'the bay, the jetties, and the river mouths' },
  { name: 'Port Royal Sound, SC', lat: 32.25, lon: -80.7, type: 'coastal', water: 'the sound, the flats, and the creeks' },
  { name: 'Altamaha River, GA', lat: 31.4, lon: -81.45, type: 'coastal', water: 'the river, the sounds, and the marsh' },
  { name: 'Ten Thousand Islands, FL', lat: 25.85, lon: -81.4, type: 'coastal', water: 'the mangroves, the passes, and the flats' },
  { name: 'Flamingo, FL', lat: 25.14, lon: -80.93, type: 'coastal', water: 'the flats, the creeks, and the bays' },
  { name: 'Florida Bay, FL', lat: 25.1, lon: -80.8, type: 'coastal', water: 'the flats, the basins, and the channels' },
  { name: 'Anna Maria Island, FL', lat: 27.53, lon: -82.73, type: 'coastal', water: 'the passes, the piers, and the flats' },
  { name: 'Estero Bay, FL', lat: 26.42, lon: -81.88, type: 'coastal', water: 'the bay, the passes, and the mangroves' },
  { name: 'Fort Pierce Inlet, FL', lat: 27.47, lon: -80.3, type: 'coastal', water: 'the inlet, the jetties, and the surf' },
  { name: 'Lake Kissimmee, FL', lat: 27.94, lon: -81.3, type: 'inland', water: 'the grass, the reeds, and the canals' },
  { name: 'Mobile Bay, AL', lat: 30.5, lon: -87.9, type: 'coastal', water: 'the bay, the causeway, and the deltas' },
  { name: 'Barataria Bay, LA', lat: 29.4, lon: -89.95, type: 'coastal', water: 'the marsh, the passes, and the islands' },
  { name: 'Trinity Bay, TX', lat: 29.7, lon: -94.7, type: 'coastal', water: 'the bay, the reefs, and the flats' },
  { name: 'Aransas Bay, TX', lat: 28.1, lon: -96.99, type: 'coastal', water: 'the bay, the reefs, and the flats' },
  { name: 'Port Mansfield, TX', lat: 26.55, lon: -97.43, type: 'coastal', water: 'the Laguna, the flats, and the channels' },
  { name: 'Kewaunee, WI', lat: 44.46, lon: -87.5, type: 'inland', water: 'the harbor, the pier, and the lake' },
  { name: 'Frankfort, MI', lat: 44.63, lon: -86.23, type: 'inland', water: 'the harbor, the pier, and the lake' },
  { name: 'St. Joseph, MI', lat: 42.11, lon: -86.49, type: 'inland', water: 'the pier, the harbor, and the lake' },
  { name: 'Michigan City, IN', lat: 41.71, lon: -86.89, type: 'inland', water: 'the pier, the harbor, and the lake' },
  { name: 'Conneaut, OH', lat: 41.95, lon: -80.55, type: 'inland', water: 'the harbor, the river, and the lake' },
  { name: 'Henderson Harbor, NY', lat: 43.86, lon: -76.2, type: 'inland', water: 'the bays, the shoals, and the lake' },
  { name: 'Sodus Bay, NY', lat: 43.27, lon: -76.97, type: 'inland', water: 'the bay, the flats, and the lake' },
  { name: 'Au Sable River, MI', lat: 44.66, lon: -83.3, type: 'inland', water: 'the runs, the riffles, and the river mouth' },
  { name: 'Pere Marquette River, MI', lat: 43.95, lon: -86.2, type: 'inland', water: 'the runs, the holes, and the gravel' },
  { name: 'Great Sacandaga Lake, NY', lat: 43.2, lon: -74.1, type: 'inland', water: 'the flats, the points, and the bays' },
  { name: 'Raystown Lake, PA', lat: 40.4, lon: -78.07, type: 'inland', water: 'the points, the flats, and the bluffs' },
  { name: 'Lake Wallenpaupack, PA', lat: 41.4, lon: -75.2, type: 'inland', water: 'the points, the docks, and the coves' },
  { name: 'Susquehanna River, PA', lat: 40.25, lon: -76.85, type: 'inland', water: 'the river, the ledges, and the flats' },
  { name: 'Juniata River, PA', lat: 40.47, lon: -77.13, type: 'inland', water: 'the riffles, the runs, and the ledges' },
  { name: 'Allegheny River, PA', lat: 41.4, lon: -79.7, type: 'inland', water: 'the runs, the eddies, and the flats' },
  { name: 'Delaware River, PA', lat: 40.3, lon: -75.05, type: 'inland', water: 'the riffles, the eddies, and the ledges' },
  { name: 'Lehigh River, PA', lat: 40.8, lon: -75.7, type: 'inland', water: 'the runs, the riffles, and the pocket water' },
  { name: 'Lake Almanor, CA', lat: 40.25, lon: -121.15, type: 'inland', water: 'the springs, the points, and the flats' },
  { name: 'Trinity Lake, CA', lat: 40.8, lon: -122.75, type: 'inland', water: 'the arms, the points, and the coves' },
  { name: 'Henrys Fork, ID', lat: 44.1, lon: -111.4, type: 'inland', water: 'the flats, the riffles, and the spring creeks' },
  { name: 'Deschutes River, OR', lat: 44.7, lon: -121.0, type: 'inland', water: 'the riffles, the runs, and the canyon water' },
  { name: 'Rogue River, OR', lat: 42.43, lon: -124.42, type: 'inland', water: 'the runs, the holes, and the river mouth' },
  { name: 'Umpqua River, OR', lat: 43.67, lon: -124.2, type: 'inland', water: 'the runs, the holes, and the tidewater' },
  { name: 'Willamette River, OR', lat: 45.4, lon: -122.7, type: 'inland', water: 'the river, the flats, and the sloughs' },
  { name: 'Puget Sound, WA', lat: 47.6, lon: -122.4, type: 'coastal', water: 'the sound, the rips, and the beaches' },
  { name: 'Lake Washington, WA', lat: 47.6, lon: -122.25, type: 'inland', water: 'the flats, the drop-offs, and the points' },
  { name: 'Bristol Bay, AK', lat: 58.7, lon: -157.0, type: 'coastal', water: 'the river mouths, the flats, and the bay' },
  { name: 'Kona, HI', lat: 19.64, lon: -155.99, type: 'coastal', water: 'the drop-offs, the FADs, and the ledges' },
  { name: 'Hilo, HI', lat: 19.71, lon: -155.08, type: 'coastal', water: 'the bay, the rivers, and the rocks' },
  { name: 'Kaneohe Bay, HI', lat: 21.45, lon: -157.8, type: 'coastal', water: 'the flats, the reef, and the channels' },
  { name: 'Choctawhatchee Bay, FL', lat: 30.4, lon: -86.4, type: 'coastal', water: 'the bay, the passes, and the flats' },
  { name: 'Perdido Bay, FL', lat: 30.35, lon: -87.4, type: 'coastal', water: 'the bay, the pass, and the flats' },
  // ===== Expansion 3: 50 rivers, bays, and inlets (state/region coverage) =====
  // --- Rivers (inland) ---
  { name: 'Deposit, NY', lat: 42.0626, lon: -75.4271, type: 'inland', water: 'the West Branch of the Delaware', species: 'wild brown trout and rainbow trout' },
  { name: 'Harrisburg, PA', lat: 40.2732, lon: -76.8867, type: 'inland', water: 'the Susquehanna River', species: 'smallmouth bass, walleye, catfish, and muskie' },
  { name: 'Lewistown, PA', lat: 40.5992, lon: -77.5714, type: 'inland', water: 'the Juniata River', species: 'smallmouth bass and walleye' },
  { name: 'Cornwall, CT', lat: 41.8404, lon: -73.3690, type: 'inland', water: 'the Housatonic River', species: 'trout and smallmouth bass' },
  { name: 'Front Royal, VA', lat: 38.9182, lon: -78.1944, type: 'inland', water: 'the Shenandoah River', species: 'smallmouth bass and musky' },
  { name: 'Harpers Ferry, WV', lat: 39.3254, lon: -77.7386, type: 'inland', water: 'the Shenandoah and Potomac rivers', species: 'smallmouth bass, walleye, and musky' },
  { name: 'Asheville, NC', lat: 35.5951, lon: -82.5515, type: 'inland', water: 'the French Broad River', species: 'smallmouth bass, trout, and musky' },
  { name: 'Bryson City, NC', lat: 35.4309, lon: -83.4471, type: 'inland', water: 'the Tuckasegee and Nantahala rivers', species: 'trout and smallmouth bass' },
  { name: 'Helen, GA', lat: 34.7012, lon: -83.7251, type: 'inland', water: 'the Chattahoochee River', species: 'rainbow trout, brown trout, and brook trout' },
  { name: 'Mountain Home, AR', lat: 36.3353, lon: -92.3852, type: 'inland', water: 'the White and North Fork rivers', species: 'brown trout, rainbow trout, and walleye' },
  { name: 'Twin Bridges, MT', lat: 45.5419, lon: -112.3339, type: 'inland', water: 'the Beaverhead, Ruby, and Big Hole rivers', species: 'brown trout and rainbow trout' },
  { name: 'Riggins, ID', lat: 45.4193, lon: -116.3157, type: 'inland', water: 'the Salmon River', species: 'steelhead, chinook salmon, and smallmouth bass' },
  { name: 'Roseburg, OR', lat: 43.2165, lon: -123.3417, type: 'inland', water: 'the North Umpqua River', species: 'steelhead, salmon, and trout' },
  { name: 'Forks, WA', lat: 47.9504, lon: -124.3855, type: 'inland', water: 'the Hoh, Sol Duc, and Bogachiel rivers', species: 'steelhead and salmon' },
  { name: 'Lewiston, NY', lat: 43.1729, lon: -79.0461, type: 'inland', water: 'the lower Niagara River', species: 'steelhead, brown trout, smallmouth bass, and lake trout' },
  // --- Bays, inlets, sounds, and lagoons (coastal) ---
  { name: 'Seaside Park, NJ', lat: 39.9248, lon: -74.0782, type: 'coastal', water: 'Barnegat Bay and the surf', species: 'striped bass, bluefish, fluke, and weakfish' },
  { name: 'Cape Charles, VA', lat: 37.2682, lon: -76.0174, type: 'coastal', water: 'the lower Chesapeake Bay', species: 'red drum, black drum, cobia, and speckled trout' },
  { name: 'Rock Hall, MD', lat: 39.1390, lon: -76.2386, type: 'coastal', water: 'the upper Chesapeake Bay', species: 'striped bass (rockfish), white perch, and catfish' },
  { name: 'Hatteras, NC', lat: 35.2096, lon: -75.6907, type: 'coastal', water: 'Pamlico Sound and the inlet', species: 'red drum, speckled trout, flounder, and bluefish' },
  { name: 'Beaufort, NC', lat: 34.7177, lon: -76.6638, type: 'coastal', water: 'Beaufort Inlet and the marshes', species: 'red drum, flounder, speckled trout, and false albacore' },
  { name: 'St. Marys, GA', lat: 30.7305, lon: -81.5465, type: 'coastal', water: 'Cumberland Sound and the tidal rivers', species: 'red drum, speckled trout, and flounder' },
  { name: 'New Smyrna Beach, FL', lat: 29.0258, lon: -80.9270, type: 'coastal', water: 'Mosquito Lagoon and the Indian River', species: 'redfish, speckled trout, black drum, and snook' },
  { name: 'Sebastian, FL', lat: 27.8156, lon: -80.4706, type: 'coastal', water: 'Sebastian Inlet and the Indian River Lagoon', species: 'snook, redfish, speckled trout, and tarpon' },
  { name: 'Chokoloskee, FL', lat: 25.8112, lon: -81.3623, type: 'coastal', water: 'the Ten Thousand Islands', species: 'snook, redfish, tarpon, and snapper' },
  { name: 'Aransas Pass, TX', lat: 27.9095, lon: -97.1499, type: 'coastal', water: 'Redfish Bay and the pass', species: 'redfish, speckled trout, and flounder' },
  { name: 'Sabine Pass, TX', lat: 29.7286, lon: -93.8946, type: 'coastal', water: 'Sabine Lake and the pass', species: 'speckled trout, redfish, and flounder' },
  { name: 'Hopedale, LA', lat: 29.8285, lon: -89.6618, type: 'coastal', water: 'the Biloxi Marsh', species: 'redfish, speckled trout, and black drum' },
  { name: 'Tomales Bay, CA', lat: 38.1413, lon: -122.8722, type: 'coastal', water: 'the bay and Point Reyes', species: 'halibut, striped bass, and surfperch' },
  { name: 'Tokeland, WA', lat: 46.7073, lon: -123.9690, type: 'coastal', water: 'Willapa Bay', species: 'sturgeon, salmon, and surfperch' },
  { name: 'Lees Ferry, AZ', lat: 36.8649, lon: -111.5878, type: 'inland', water: 'the Colorado River below Glen Canyon', species: 'rainbow trout' },
  { name: 'Heber Springs, AR', lat: 35.492, lon: -92.0316, type: 'inland', water: 'the Little Red River', species: 'brown trout and rainbow trout' },
  { name: 'Basalt, CO', lat: 39.3686, lon: -107.0317, type: 'inland', water: 'the Roaring Fork and Fryingpan rivers', species: 'rainbow trout and brown trout' },
  { name: 'Buena Vista, CO', lat: 38.8422, lon: -106.1311, type: 'inland', water: 'the Arkansas River', species: 'brown trout and rainbow trout' },
  { name: 'Salmon, ID', lat: 45.1755, lon: -113.8961, type: 'inland', water: 'the Salmon River', species: 'cutthroat trout and steelhead' },
  { name: 'Orofino, ID', lat: 46.479, lon: -116.2553, type: 'inland', water: 'the Clearwater River', species: 'steelhead and chinook salmon' },
  { name: 'Dutch John, UT', lat: 40.9293, lon: -109.4007, type: 'inland', water: 'the Green River below Flaming Gorge', species: 'rainbow trout and brown trout' },
  { name: 'Klamath, CA', lat: 41.526, lon: -124.0382, type: 'inland', water: 'the Klamath River', species: 'salmon and steelhead' },
  { name: 'Redding, CA', lat: 40.5865, lon: -122.3917, type: 'inland', water: 'the upper Sacramento River', species: 'rainbow trout and king salmon' },
  { name: 'Wellsboro, PA', lat: 41.749, lon: -77.3025, type: 'inland', water: 'Pine Creek and the canyon', species: 'trout and smallmouth bass' },
  { name: 'Hawley, PA', lat: 41.4762, lon: -75.1804, type: 'inland', water: 'the Lackawaxen and Delaware', species: 'trout, smallmouth bass, and walleye' },
  { name: 'Galax, VA', lat: 36.6612, lon: -80.9239, type: 'inland', water: 'the New River', species: 'smallmouth bass and musky' },
  { name: 'Damascus, VA', lat: 36.6334, lon: -81.7857, type: 'inland', water: 'the Whitetop Laurel and Holston', species: 'wild trout' },
  { name: 'Blue Ridge, GA', lat: 34.8645, lon: -84.3241, type: 'inland', water: 'the Toccoa River', species: 'rainbow trout and brown trout' },
  { name: 'Key Largo, FL', lat: 25.0865, lon: -80.4473, type: 'coastal', water: 'the Upper Keys reef and backcountry', species: 'tarpon, snook, redfish, and snapper' },
  { name: 'Edisto Beach, SC', lat: 32.496, lon: -80.3056, type: 'coastal', water: 'the sounds and tidal creeks', species: 'redfish, speckled trout, and flounder' },
  { name: 'Darien, GA', lat: 31.3702, lon: -81.4343, type: 'coastal', water: 'Altamaha Sound and the marsh', species: 'redfish, speckled trout, and tripletail' },
  { name: 'Swansboro, NC', lat: 34.6885, lon: -77.1192, type: 'coastal', water: 'Bogue Inlet and the White Oak River', species: 'red drum, speckled trout, and flounder' },
  { name: 'Sneads Ferry, NC', lat: 34.5499, lon: -77.3908, type: 'coastal', water: 'New River Inlet and the marsh', species: 'red drum, speckled trout, and flounder' },
  { name: 'Wanchese, NC', lat: 35.8438, lon: -75.6388, type: 'coastal', water: 'Roanoke and Croatan sounds', species: 'red drum, speckled trout, and striped bass' },
  { name: 'Reedville, VA', lat: 37.8348, lon: -76.2855, type: 'coastal', water: 'the lower Chesapeake and Great Wicomico', species: 'striped bass (rockfish), red drum, and speckled trout' },


  // ===== Expansion 4: 50 top Canada destinations =====
  // --- Ontario ---
  { name: 'Toronto, ON', lat: 43.6532, lon: -79.3832, type: 'inland', water: 'Lake Ontario', species: 'Chinook and coho salmon, brown trout, and smallmouth bass' },
  { name: 'Kingston, ON', lat: 44.2312, lon: -76.4860, type: 'inland', water: 'the Thousand Islands and eastern Lake Ontario', species: 'smallmouth bass, walleye, muskie, and northern pike' },
  { name: 'Ottawa, ON', lat: 45.4215, lon: -75.6972, type: 'inland', water: 'the Ottawa River', species: 'walleye, muskie, and smallmouth bass' },
  { name: 'Lake Simcoe, ON', lat: 44.4200, lon: -79.3400, type: 'inland', water: 'Lake Simcoe', species: 'lake trout, whitefish, and yellow perch' },
  { name: 'Lake Nipissing, ON', lat: 46.2900, lon: -79.7500, type: 'inland', water: 'Lake Nipissing', species: 'walleye, northern pike, and muskie' },
  { name: 'Lake of the Woods, ON', lat: 49.4000, lon: -94.8700, type: 'inland', water: 'Lake of the Woods', species: 'walleye, muskie, and smallmouth bass' },
  { name: 'Lake St. Clair, ON', lat: 42.4200, lon: -82.6800, type: 'inland', water: 'Lake St. Clair', species: 'muskie, smallmouth bass, and walleye' },
  { name: 'Thunder Bay, ON', lat: 48.3809, lon: -89.2477, type: 'inland', water: 'Lake Superior', species: 'lake trout, Chinook salmon, and walleye' },
  { name: 'Bay of Quinte, ON', lat: 44.1500, lon: -77.2500, type: 'inland', water: 'the Bay of Quinte', species: 'walleye, smallmouth bass, and northern pike' },
  { name: 'Sault Ste. Marie, ON', lat: 46.5136, lon: -84.3358, type: 'inland', water: 'the St. Marys River', species: 'Atlantic salmon, northern pike, and walleye' },
  { name: 'Nipigon, ON', lat: 49.0130, lon: -88.2630, type: 'inland', water: 'Lake Nipigon and the Nipigon River', species: 'brook trout, lake trout, and walleye' },
  { name: 'Parry Sound, ON', lat: 45.3470, lon: -80.0390, type: 'inland', water: 'Georgian Bay', species: 'smallmouth bass, muskie, and northern pike' },
  // --- Quebec ---
  { name: 'Montreal, QC', lat: 45.5019, lon: -73.5674, type: 'inland', water: 'the St. Lawrence River', species: 'walleye, northern pike, muskie, and smallmouth bass' },
  { name: 'Quebec City, QC', lat: 46.8139, lon: -71.2080, type: 'inland', water: 'the St. Lawrence River', species: 'striped bass, walleye, and northern pike' },
  { name: 'Lake Memphremagog, QC', lat: 45.1500, lon: -72.2500, type: 'inland', water: 'Lake Memphremagog', species: 'lake trout, landlocked salmon, and smallmouth bass' },
  { name: 'Gaspe, QC', lat: 48.8330, lon: -64.4870, type: 'coastal', water: 'the Gaspe coast and salmon rivers', species: 'Atlantic salmon, mackerel, and cod' },
  { name: 'Saguenay, QC', lat: 48.4280, lon: -71.0680, type: 'coastal', water: 'the Saguenay Fjord', species: 'Atlantic salmon, redfish, and Greenland halibut' },
  { name: 'Lac Saint-Jean, QC', lat: 48.5800, lon: -72.0000, type: 'inland', water: 'Lac Saint-Jean', species: 'walleye, landlocked salmon, and northern pike' },
  { name: 'Mont-Tremblant, QC', lat: 46.1185, lon: -74.5962, type: 'inland', water: 'the Laurentian lakes', species: 'lake trout, smallmouth bass, and northern pike' },
  { name: 'Trois-Rivieres, QC', lat: 46.3430, lon: -72.5420, type: 'inland', water: 'the St. Lawrence River', species: 'walleye, sauger, and northern pike' },
  // --- British Columbia ---
  { name: 'Vancouver, BC', lat: 49.2827, lon: -123.1207, type: 'coastal', water: 'the Strait of Georgia', species: 'Chinook and coho salmon, lingcod, and rockfish' },
  { name: 'Victoria, BC', lat: 48.4284, lon: -123.3656, type: 'coastal', water: 'the Strait of Juan de Fuca', species: 'Chinook salmon, halibut, and lingcod' },
  { name: 'Campbell River, BC', lat: 50.0331, lon: -125.2733, type: 'coastal', water: 'Discovery Passage', species: 'Chinook salmon, halibut, and lingcod' },
  { name: 'Tofino, BC', lat: 49.1530, lon: -125.9066, type: 'coastal', water: 'the west coast', species: 'Chinook salmon, halibut, and lingcod' },
  { name: 'Prince Rupert, BC', lat: 54.3150, lon: -130.3208, type: 'coastal', water: 'the north coast', species: 'Chinook salmon, halibut, and lingcod' },
  { name: 'Kamloops, BC', lat: 50.6745, lon: -120.3273, type: 'inland', water: 'the Thompson-Nicola lakes', species: 'rainbow trout' },
  { name: 'Okanagan Lake, BC', lat: 49.8880, lon: -119.4960, type: 'inland', water: 'Okanagan Lake', species: 'kokanee, rainbow trout, and lake trout' },
  { name: 'Chilliwack, BC', lat: 49.1579, lon: -121.9514, type: 'inland', water: 'the Fraser River', species: 'white sturgeon and salmon' },
  { name: 'Port Alberni, BC', lat: 49.2339, lon: -124.8055, type: 'coastal', water: 'the Alberni Inlet', species: 'Chinook and sockeye salmon' },
  { name: 'Nanaimo, BC', lat: 49.1659, lon: -123.9401, type: 'coastal', water: 'the Strait of Georgia', species: 'Chinook salmon, lingcod, and rockfish' },
  // --- Alberta ---
  { name: 'Calgary, AB', lat: 51.0447, lon: -114.0719, type: 'inland', water: 'the Bow River', species: 'wild brown and rainbow trout' },
  { name: 'Lake Minnewanka, AB', lat: 51.2500, lon: -115.4000, type: 'inland', water: 'Lake Minnewanka', species: 'lake trout and rainbow trout' },
  { name: 'Lesser Slave Lake, AB', lat: 55.4000, lon: -115.4000, type: 'inland', water: 'Lesser Slave Lake', species: 'walleye, northern pike, and yellow perch' },
  { name: 'Cold Lake, AB', lat: 54.4600, lon: -110.1800, type: 'inland', water: 'Cold Lake', species: 'walleye, lake trout, and northern pike' },
  { name: 'Edmonton, AB', lat: 53.5461, lon: -113.4938, type: 'inland', water: 'the North Saskatchewan River', species: 'walleye, northern pike, and goldeye' },
  // --- Manitoba ---
  { name: 'Lake Winnipeg, MB', lat: 50.4000, lon: -96.8000, type: 'inland', water: 'Lake Winnipeg', species: 'walleye, sauger, and yellow perch' },
  { name: 'Winnipeg, MB', lat: 49.8951, lon: -97.1384, type: 'inland', water: 'the Red River', species: 'channel catfish and walleye' },
  { name: 'Lac du Bonnet, MB', lat: 50.2540, lon: -96.0590, type: 'inland', water: 'the Winnipeg River', species: 'walleye, smallmouth bass, and northern pike' },
  // --- Saskatchewan ---
  { name: 'Tobin Lake, SK', lat: 53.6000, lon: -103.3000, type: 'inland', water: 'Tobin Lake', species: 'trophy walleye and northern pike' },
  { name: 'Lake Diefenbaker, SK', lat: 51.0200, lon: -106.8300, type: 'inland', water: 'Lake Diefenbaker', species: 'walleye, northern pike, and rainbow trout' },
  { name: 'Last Mountain Lake, SK', lat: 51.0500, lon: -105.2500, type: 'inland', water: 'Last Mountain Lake', species: 'walleye, northern pike, and yellow perch' },
  // --- Nova Scotia ---
  { name: 'Halifax, NS', lat: 44.6488, lon: -63.5752, type: 'coastal', water: 'the Atlantic coast', species: 'striped bass, mackerel, and pollock' },
  { name: 'Sydney, NS', lat: 46.1351, lon: -60.1831, type: 'coastal', water: "the Bras d'Or Lake and Cape Breton coast", species: 'striped bass, mackerel, and cod' },
  { name: 'Digby, NS', lat: 44.6220, lon: -65.7590, type: 'coastal', water: 'the Bay of Fundy', species: 'striped bass, pollock, and mackerel' },
  // --- New Brunswick ---
  { name: 'Miramichi, NB', lat: 47.0280, lon: -65.5010, type: 'inland', water: 'the Miramichi River', species: 'Atlantic salmon and brook trout' },
  { name: 'Saint John, NB', lat: 45.2733, lon: -66.0633, type: 'coastal', water: 'the Saint John River and Bay of Fundy', species: 'striped bass and smallmouth bass' },
  { name: 'Fredericton, NB', lat: 45.9636, lon: -66.6431, type: 'inland', water: 'the Saint John River', species: 'smallmouth bass, muskellunge, and yellow perch' },
  // --- Newfoundland & Labrador ---
  { name: 'St. Johns, NL', lat: 47.5615, lon: -52.7126, type: 'coastal', water: 'the Avalon coast', species: 'cod and mackerel' },
  { name: 'Happy Valley-Goose Bay, NL', lat: 53.3017, lon: -60.3260, type: 'inland', water: 'the Labrador rivers', species: 'brook trout, Atlantic salmon, and northern pike' },
  // --- Prince Edward Island ---
  { name: 'Charlottetown, PE', lat: 46.2382, lon: -63.1311, type: 'coastal', water: 'the north shore and bays', species: 'striped bass, mackerel, and white perch' },
];

const COASTAL_SPECIES = 'striped bass, fluke (summer flounder), bluefish, black sea bass, tautog, weakfish, and kingfish';
const INLAND_SPECIES = 'largemouth and smallmouth bass, trout, walleye, chain pickerel, catfish, and panfish';

const slugify = (name) =>
  name.toLowerCase()
    .replace(/['’]/g, '')          // drop apostrophes so "Coeur d'Alene" -> "coeur dalene"
    .replace(/[^a-z0-9]+/g, '-')   // any other run of non-alphanumerics -> single hyphen
    .replace(/^-+|-+$/g, '');      // trim leading/trailing hyphens

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Distance in miles (for geographic "nearby spots" internal links)
const distMi = (a, b, c, d) => {
  const R = 3958.8, p = Math.PI / 180;
  const dLat = (c - a) * p, dLon = (d - b) * p;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

const US_STATES = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',
  DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',
  MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',
  NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
  OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',
  TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
  ON:'Ontario',QC:'Quebec',BC:'British Columbia',AB:'Alberta',MB:'Manitoba',SK:'Saskatchewan',NS:'Nova Scotia',NB:'New Brunswick',NL:'Newfoundland and Labrador',PE:'Prince Edward Island',YT:'Yukon',NT:'Northwest Territories',NU:'Nunavut',
};
const stateAbbrOf = (town) => (town.name.split(',').pop() || '').trim();

function pageHtml(town, allTowns) {
  const slug = slugify(town.name);
  const _ab = stateAbbrOf(town);
  const _stName = US_STATES[_ab] || null;
  const _stPath = _stName ? `/fishing/${slugify(_stName)}/` : null;
  const url = `${SITE}/fishing/${slug}/`;
  const appLink = `/?lat=${town.lat.toFixed(4)}&lon=${town.lon.toFixed(4)}&label=${encodeURIComponent(town.name)}`;
  const species = town.species || (town.type === 'coastal' ? COASTAL_SPECIES : INLAND_SPECIES);
  const waterData = town.type === 'coastal'
    ? 'live tides from the nearest NOAA station, water temperature, wave height, and wind'
    : 'real-time flow and water level from the nearest USGS gauge, water temperature, and wind';
  const title = `${town.name} Fishing Report & Conditions — FishCondish`;
  const desc = `Live fishing conditions for ${town.name}: fishing score, best times to fish, ${town.type === 'coastal' ? 'tides, water temp' : 'river flow, water temp'}, weather, and a species bite forecast. Free, updated in real time.`;

  // Nearest towns by distance, for sensible internal linking
  const nearby = allTowns
    .filter(t => t.name !== town.name)
    .map(t => ({ ...t, _d: distMi(town.lat, town.lon, t.lat, t.lon) }))
    .sort((a, b) => a._d - b._d)
    .slice(0, 8);

  const report = AI_REPORTS[slug];
  const reportSection = report && Array.isArray(report.paragraphs) && report.paragraphs.length
    ? `<section class="report"><h2>${esc(town.name)} fishing report</h2>${report.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</section>`
    : '';

  // --- FAQ: grounded, evergreen Q&A (no invented regs, dates, or access points) ---
  const coastal = town.type === 'coastal';
  const bestTimeA = coastal
    ? `Dawn and dusk are usually the strongest windows at ${town.name}, especially when they line up with moving water around a tide change. FishCondish grades every hour of the day so you can pick the best one.`
    : `Dawn and dusk are usually the most productive windows on ${town.water}, particularly when the barometric pressure is steady or falling. FishCondish grades every hour of the day so you can pick the best one.`;
  const seasonA = coastal
    ? `Spring and fall typically bring the most active fishing along ${town.water} as fish migrate and feed heavily, with summer steady for warm-water species. It varies year to year, so check the live score before you head out.`
    : `Spring and fall are typically strongest on ${town.water} as water temperatures sit in the productive range, with summer fishing best early and late in the day. It varies year to year, so check the live conditions before you head out.`;
  const faqs = [
    { q: `What fish can you catch at ${town.name}?`,
      a: `The species bite forecast for ${town.name} covers what's likely feeding there, including ${species} — and updates with the live conditions.` },
    { q: `What's the best time of day to fish ${town.name}?`, a: bestTimeA },
    { q: `When is the best season to fish ${town.name}?`, a: seasonA },
    { q: `How do I know if it's a good day to fish ${town.name}?`,
      a: `FishCondish combines wind, ${coastal ? 'tide movement' : 'water level'}, water temperature, pressure trend, and moon phase into a single 1\u201310 fishing score for ${town.name}, updated in real time — a quick go/no-go read before you make the trip.` },
  ];
  const faqSection = `<h2>${esc(town.name)} fishing FAQ</h2>
<div class="faq">
${faqs.map(f => `<div class="faq-item"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`).join('\n')}
</div>`;

  // --- structured data (WebPage + Breadcrumb + FAQ + Article), one @graph ---
  const graph = [
    { '@type': 'WebPage', name: title, description: desc, url, isPartOf: { '@type': 'WebSite', name: 'FishCondish', url: SITE } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      ...(_stName ? [{ '@type': 'ListItem', position: 2, name: `${_stName} Fishing`, item: `${SITE}${_stPath}` }] : []),
      { '@type': 'ListItem', position: _stName ? 3 : 2, name: `${town.name} Fishing`, item: url },
    ] },
    { '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ];
  if (report && Array.isArray(report.paragraphs) && report.paragraphs.length) {
    graph.push({
      '@type': 'Article',
      headline: `${town.name} Fishing Report`,
      description: report.paragraphs[0].slice(0, 200),
      articleBody: report.paragraphs.join('\n\n'),
      image: [`${SITE}/og.png`],
      url,
      mainEntityOfPage: url,
      ...(report.updated ? { datePublished: report.updated, dateModified: report.updated } : {}),
      author: { '@type': 'Organization', name: 'FishCondish', url: SITE },
      publisher: { '@type': 'Organization', name: 'FishCondish', logo: { '@type': 'ImageObject', url: `${SITE}/logo512.png` } },
    });
  }
  // Escape "<" so a stray "</script>" inside any string can't break out of the tag.
  const schemaJson = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="${url}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:image" content="${SITE}/og.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="theme-color" content="#0C2340"/>
<link rel="icon" href="/favicon.ico"/>
<script type="application/ld+json">
${schemaJson}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--navy:#0C2340;--ocean:#1E5F9E;--sky:#DCEBF7;--cream:#F5F0E8;--text:#22303C;--muted:#5B6B7A}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,sans-serif;background:var(--cream);color:var(--text);line-height:1.6}
header{background:var(--navy);color:#fff;padding:14px 20px;display:flex;align-items:center;gap:10px}
header img{width:34px;height:34px}
header a{color:#fff;text-decoration:none;font-size:20px;font-weight:700;font-family:'Space Grotesk',system-ui,sans-serif}
main{max-width:760px;margin:0 auto;padding:28px 20px 60px}
h1{font-size:30px;color:var(--navy);font-family:'Space Grotesk',system-ui,sans-serif;line-height:1.25;margin-bottom:10px}
h2{font-size:20px;color:var(--navy);font-family:'Space Grotesk',system-ui,sans-serif;margin:28px 0 8px}
p{margin:10px 0;font-size:16px}
.cta{display:inline-block;background:var(--ocean);color:#fff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:10px;margin:18px 0;font-family:'Inter',system-ui,sans-serif}
.cta:hover{background:#174a7c}
ul{margin:8px 0 8px 22px}
li{margin:4px 0}
.nearby{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.nearby a{background:var(--sky);color:var(--navy);text-decoration:none;font-size:14px;padding:6px 12px;border-radius:999px;font-family:'Inter',system-ui,sans-serif}
.report{background:#fff;border:1px solid #d9e4ef;border-left:4px solid var(--ocean);border-radius:10px;padding:16px 20px;margin:20px 0}
.report h2{margin:0 0 6px;font-size:19px}
.report p{font-size:16px;margin:8px 0}
.crumbs{font-size:13px;color:var(--muted);margin-bottom:6px}
.crumbs a{color:var(--ocean);text-decoration:none}
.faq{margin:8px 0 4px}
.faq-item{border-top:1px solid #e2e8f0;padding:12px 0}
.faq-item h3{font-size:16px;color:var(--navy);font-family:'Inter',system-ui,sans-serif;margin-bottom:4px}
.faq-item p{margin:0;font-size:15px}
footer{text-align:center;font-size:13px;color:var(--muted);padding:24px;font-family:'Inter',system-ui,sans-serif}
footer a{color:var(--ocean)}
</style>
</head>
<body>
<header><img src="/logo.svg" alt="FishCondish logo"/><a href="/">FishCondish</a></header>
<main>
<nav class="crumbs"><a href="/">Home</a> › ${_stName ? `<a href="${_stPath}">${esc(_stName)}</a> › ` : ''}<span>${esc(town.name)} Fishing</span></nav>
<h1>${esc(town.name)} Fishing Report &amp; Live Conditions</h1>
<p>Planning to fish ${esc(town.water)}? FishCondish gives you a live, data-driven read on whether it's worth the trip — a <strong>1–10 fishing score</strong> for ${esc(town.name)} right now, the <strong>best times to fish today</strong>, and a <strong>species-by-species bite forecast</strong>.</p>
<a class="cta" href="${appLink}">See live ${esc(town.name)} conditions →</a>
${reportSection}
<h2>What you'll get for ${esc(town.name)}</h2>
<ul>
<li><strong>Fishing score (1–10)</strong> — one number that weighs ${waterData} into a single read on the bite.</li>
<li><strong>Best-time windows</strong> — an hour-by-hour timeline for today plus a 7-day outlook, graded by ${town.type === 'coastal' ? 'tide stage, pressure trend, and dawn/dusk' : 'pressure trend, dawn/dusk, and solunar periods'}.</li>
<li><strong>Species bite forecast</strong> — what's likely feeding near ${esc(town.name)}: ${species}.</li>
<li><strong>Bait &amp; lure advisor</strong> — AI suggestions grounded in recent local fishing reports.</li>
<li><strong>Solunar feeding periods, moon phase, sunrise/sunset</strong> — the timing details anglers actually use.</li>
</ul>
<h2>Live ${town.type === 'coastal' ? 'tide and water' : 'water'} data</h2>
<p>${town.type === 'coastal'
  ? `Tides and water temperature for ${esc(town.name)} come straight from the nearest NOAA station, with a smooth tide curve, today's highs and lows, and a station picker if you fish a different part of ${esc(town.water)}.`
  : `Water conditions for ${esc(town.name)} come straight from the nearest USGS gauge — flow, gage height, and water temperature where it's reported — with a picker to switch between nearby monitoring sites on ${esc(town.water)}.`}</p>
<p>It's free, works on your phone, and installs like an app.</p>
<a class="cta" href="${appLink}">Check the ${esc(town.name)} fishing score →</a>
${faqSection}
${(() => {
  const { species: sp, conditions } = tipLinks.tipsForSpot({ state: stateAbbrOf(town), water: town.type }, { limit: 6 });
  const items = sp.concat(conditions);
  return items.length ? `<h2>Fishing tips for ${esc(town.name)}</h2>
<p>New to these waters? Start with these beginner-friendly guides:</p>
<div class="nearby">
${items.map(t => `<a href="/fishing-tips/${t.slug}/">${esc(t.title)}</a>`).join('\n')}
</div>` : ''})()}
<h2>Nearby spots</h2>
<div class="nearby">
${nearby.map(t => `<a href="/fishing/${slugify(t.name)}/">${esc(t.name)}</a>`).join('\n')}
</div>
</main>
<footer>© ${new Date().getFullYear()} FishCondish · <a href="/">Open the live dashboard</a></footer>
</body>
</html>`;
}

// ---- generate (only when run directly, not when required by the AI script) ----

// ===== State + region hub pages =====
// Marquee multi-spot regions, matched by member spot (slug-compared so naming
// differences like apostrophes don't matter). Only built if >= 2 members exist.
const MARQUEE_REGIONS = [
  { name: 'South Jersey Shore', slug: 'south-jersey-shore',
    blurb: 'the back bays, inlets, and surf from Barnegat Bay down to Cape May',
    members: ['Margate City, NJ','Atlantic City, NJ','Ventnor City, NJ','Longport, NJ','Brigantine, NJ','Ocean City, NJ','Somers Point, NJ','Sea Isle City, NJ','Avalon, NJ','Stone Harbor, NJ','Wildwood, NJ','Cape May, NJ','Tuckerton, NJ','Beach Haven, NJ','Barnegat Light, NJ','Seaside Park, NJ','Bay Head, NJ'] },
  { name: 'Long Island', slug: 'long-island',
    blurb: 'the surf, bays, and rips from Montauk to the western Sound',
    members: ['Montauk, NY','Greenport, NY','Sheepshead Bay, NY','Freeport, NY','Captree, NY'] },
  { name: 'Cape Cod and the Islands', slug: 'cape-cod-and-islands',
    blurb: 'the rips, flats, and beaches of the Cape, the Vineyard, and Nantucket',
    members: ['Chatham, MA','Provincetown, MA','Marthas Vineyard, MA','Martha\u2019s Vineyard, MA','Nantucket, MA','Plymouth, MA','New Bedford, MA'] },
  { name: 'Outer Banks', slug: 'outer-banks',
    blurb: 'the surf, inlets, and sounds of the North Carolina barrier islands',
    members: ['Nags Head, NC','Cape Hatteras, NC','Hatteras, NC','Ocracoke, NC'] },
  { name: 'Florida Keys', slug: 'florida-keys',
    blurb: 'the flats, channels, and bluewater from Key Largo to Key West',
    members: ['Islamorada, FL','Key West, FL','Key Largo, FL','Marathon, FL'] },
  { name: 'Chesapeake Bay', slug: 'chesapeake-bay',
    blurb: 'the rivers, flats, and channels of the Chesapeake in Maryland and Virginia',
    members: ['Solomons, MD','Rock Hall, MD','Cape Charles, VA'] },
  { name: 'Florida Gulf Coast', slug: 'florida-gulf-coast',
    blurb: 'the bays, passes, and grass flats of Floridas Gulf side',
    members: ['Tampa, FL','Naples, FL','Cedar Key, FL','Steinhatchee, FL','Apalachicola, FL','Destin, FL','Pensacola, FL'] },
  { name: 'Vancouver Island', slug: 'vancouver-island',
    blurb: 'the salmon, halibut, and lingcod grounds around Vancouver Island, from Victoria to Campbell River and the open west coast',
    members: ['Victoria, BC','Nanaimo, BC','Campbell River, BC','Port Alberni, BC','Tofino, BC'] },
  { name: 'St. Lawrence River', slug: 'st-lawrence-river',
    blurb: 'the walleye, pike, and muskie water of the St. Lawrence and Thousand Islands, from Kingston through Montreal to Quebec City',
    members: ['Kingston, ON','Montreal, QC','Trois-Rivieres, QC','Quebec City, QC'] },
].map(r => ({ ...r, path: `/fishing/region/${r.slug}/`, memberSlugs: new Set(r.members.map(slugify)) }));

function buildHubs(towns) {
  const hubs = [];
  // Region hubs first, so state hubs can cross-link to them
  const regions = MARQUEE_REGIONS
    .map(r => ({ ...r, spots: towns.filter(t => r.memberSlugs.has(slugify(t.name))) }))
    .filter(r => r.spots.length >= 2);

  // Per-state hubs
  const byState = {};
  for (const t of towns) {
    const ab = stateAbbrOf(t);
    if (!US_STATES[ab]) continue;
    (byState[ab] = byState[ab] || []).push(t);
  }
  for (const ab of Object.keys(byState).sort()) {
    const stateName = US_STATES[ab];
    const spots = byState[ab].slice().sort((a, b) => a.name.localeCompare(b.name));
    const stRegions = regions.filter(r => r.spots.some(sp => stateAbbrOf(sp) === ab));
    hubs.push({
      kind: 'state', name: stateName, path: `/fishing/${slugify(stateName)}/`, spots, regions: stRegions,
      intro: `Find live fishing conditions across ${stateName} — the coast, the bays, and inland rivers and lakes. Pick a spot below for its real-time fishing score, the best times to fish today, and a species-by-species bite forecast.`,
    });
  }
  for (const r of regions) {
    hubs.push({
      kind: 'region', name: r.name, path: r.path,
      spots: r.spots.slice().sort((a, b) => a.name.localeCompare(b.name)), regions: [],
      intro: `Live, data-driven fishing conditions for ${r.blurb}. Pick a spot below for its real-time fishing score, best times, tides or river flow, water temp, and a species bite forecast.`,
    });
  }
  return hubs;
}

function hubHtml(hub) {
  const url = `${SITE}${hub.path}`;
  const title = `${hub.name} Fishing Reports & Live Conditions — FishCondish`;
  const desc = `Live fishing conditions for ${hub.spots.length} spots across ${hub.name}: fishing scores, best times to fish, tides or river flow, water temp, and species bite forecasts. Free and updated in real time.`;
  const cityName = (n) => n.replace(/, [A-Z]{2}$/, '');
  const spotLinks = hub.spots.map(t => `<a href="/fishing/${slugify(t.name)}/">${esc(cityName(t.name))}</a>`).join('\n');
  const regionLinks = (hub.regions || []).map(r => `<a href="${r.path}">${esc(r.name)}</a>`).join('\n');
  const graph = [
    { '@type': 'CollectionPage', name: title, description: desc, url, isPartOf: { '@type': 'WebSite', name: 'FishCondish', url: SITE } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: `${hub.name} Fishing`, item: url },
    ] },
    { '@type': 'ItemList', itemListElement: hub.spots.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: `${t.name} Fishing`, url: `${SITE}/fishing/${slugify(t.name)}/` })) },
  ];
  const schemaJson = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="${url}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:image" content="${SITE}/og.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="theme-color" content="#0C2340"/>
<link rel="icon" href="/favicon.ico"/>
<script type="application/ld+json">
${schemaJson}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--navy:#0C2340;--ocean:#1E5F9E;--sky:#DCEBF7;--cream:#F5F0E8;--text:#22303C;--muted:#5B6B7A}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,sans-serif;background:var(--cream);color:var(--text);line-height:1.6}
header{background:var(--navy);color:#fff;padding:14px 20px;display:flex;align-items:center;gap:10px}
header img{width:34px;height:34px}
header a{color:#fff;text-decoration:none;font-size:20px;font-weight:700;font-family:'Space Grotesk',system-ui,sans-serif}
main{max-width:760px;margin:0 auto;padding:28px 20px 60px}
h1{font-size:30px;color:var(--navy);font-family:'Space Grotesk',system-ui,sans-serif;line-height:1.25;margin-bottom:10px}
h2{font-size:20px;color:var(--navy);font-family:'Space Grotesk',system-ui,sans-serif;margin:28px 0 8px}
p{margin:10px 0;font-size:16px}
.cta{display:inline-block;background:var(--ocean);color:#fff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:10px;margin:18px 0;font-family:'Inter',system-ui,sans-serif}
.cta:hover{background:#174a7c}
.nearby{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.nearby a{background:var(--sky);color:var(--navy);text-decoration:none;font-size:14px;padding:6px 12px;border-radius:999px;font-family:'Inter',system-ui,sans-serif}
.crumbs{font-size:13px;color:var(--muted);margin-bottom:6px}
.crumbs a{color:var(--ocean);text-decoration:none}
footer{text-align:center;font-size:13px;color:var(--muted);padding:24px;font-family:'Inter',system-ui,sans-serif}
footer a{color:var(--ocean)}
</style>
</head>
<body>
<header><img src="/logo.svg" alt="FishCondish logo"/><a href="/">FishCondish</a></header>
<main>
<nav class="crumbs"><a href="/">Home</a> › <span>${esc(hub.name)} Fishing</span></nav>
<h1>${esc(hub.name)} Fishing Reports &amp; Live Conditions</h1>
<p>${esc(hub.intro)}</p>
<a class="cta" href="/">Open the live dashboard →</a>
<h2>Spots in ${esc(hub.name)}</h2>
<div class="nearby">
${spotLinks}
</div>
${regionLinks ? `<h2>Popular regions</h2>\n<div class="nearby">\n${regionLinks}\n</div>` : ''}
<p>Every spot links to a live page with a 1–10 fishing score, an hourly best-times timeline, ${hub.kind === 'region' ? 'tides or river flow' : 'tides and water temperature or river flow'}, pressure trend, moon phase, and a species bite forecast — all free and updated in real time.</p>
</main>
<footer>© ${new Date().getFullYear()} FishCondish · <a href="/">Open the live dashboard</a></footer>
</body>
</html>`;
}

if (require.main === module) {
  const outRoot = path.join(__dirname, '..', 'public', 'fishing');
  fs.rmSync(outRoot, { recursive: true, force: true });
  fs.mkdirSync(outRoot, { recursive: true });

  for (const town of TOWNS) {
    const dir = path.join(outRoot, slugify(town.name));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), pageHtml(town, TOWNS));
  }

  // State + region hub pages
  const hubs = buildHubs(TOWNS);
  for (const hub of hubs) {
    const rel = hub.path.replace(/^\/fishing\//, '').replace(/\/$/, '');
    const dir = path.join(outRoot, rel);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), hubHtml(hub));
  }

  // sitemap.xml (homepage + hubs + all town pages)
  const today = new Date().toISOString().slice(0, 10);
  const tipUrls = [`${SITE}/fishing-tips/`, ...tipLinks.SPECIES_TIPS.map(t => `${SITE}/fishing-tips/${t.slug}/`), ...tipLinks.CONDITIONS_TIPS.map(t => `${SITE}/fishing-tips/${t.slug}/`)];
  const urls = [`${SITE}/`, ...hubs.map(h => `${SITE}${h.path}`), ...TOWNS.map(t => `${SITE}/fishing/${slugify(t.name)}/`), ...tipUrls];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'sitemap.xml'), sitemap);

  const withReports = TOWNS.filter(t => AI_REPORTS[slugify(t.name)]).length;
  console.log(`Generated ${TOWNS.length} spot pages + ${hubs.length} hub pages in public/fishing/ + sitemap.xml (${withReports} with AI reports)`);
}

module.exports = { TOWNS, slugify };
