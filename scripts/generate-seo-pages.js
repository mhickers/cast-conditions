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

const SITE = 'https://fishcondish.com';

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
];

const COASTAL_SPECIES = 'striped bass, fluke (summer flounder), bluefish, black sea bass, tautog, weakfish, and kingfish';
const INLAND_SPECIES = 'largemouth and smallmouth bass, trout, walleye, chain pickerel, catfish, and panfish';

const slugify = (name) =>
  name.toLowerCase().replace(/[(),.]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Distance in miles (for geographic "nearby spots" internal links)
const distMi = (a, b, c, d) => {
  const R = 3958.8, p = Math.PI / 180;
  const dLat = (c - a) * p, dLon = (d - b) * p;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

function pageHtml(town, allTowns) {
  const slug = slugify(town.name);
  const url = `${SITE}/fishing/${slug}/`;
  const appLink = `/?lat=${town.lat.toFixed(4)}&lon=${town.lon.toFixed(4)}&label=${encodeURIComponent(town.name)}`;
  const species = town.species || (town.type === 'coastal' ? COASTAL_SPECIES : INLAND_SPECIES);
  const waterData = town.type === 'coastal'
    ? 'live tides from the nearest NOAA station, water temperature, wave height, and wind'
    : 'real-time flow and water level from the nearest USGS gauge, water temperature, and wind';
  const title = `${town.name} Fishing Report & Conditions — Fish Condish`;
  const desc = `Live fishing conditions for ${town.name}: fishing score, best times to fish, ${town.type === 'coastal' ? 'tides, water temp' : 'river flow, water temp'}, weather, and a species bite forecast. Free, updated in real time.`;

  // Nearest towns by distance, for sensible internal linking
  const nearby = allTowns
    .filter(t => t.name !== town.name)
    .map(t => ({ ...t, _d: distMi(town.lat, town.lon, t.lat, t.lon) }))
    .sort((a, b) => a._d - b._d)
    .slice(0, 8);

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
${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: title,
  description: desc,
  url,
  isPartOf: { '@type': 'WebSite', name: 'Fish Condish', url: SITE },
})}
</script>
<style>
:root{--navy:#0C2340;--ocean:#1E5F9E;--sky:#DCEBF7;--cream:#F5F0E8;--text:#22303C;--muted:#5B6B7A}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,'Times New Roman',serif;background:var(--cream);color:var(--text);line-height:1.6}
header{background:var(--navy);color:#fff;padding:14px 20px;display:flex;align-items:center;gap:10px}
header img{width:34px;height:34px}
header a{color:#fff;text-decoration:none;font-size:20px;font-weight:bold}
main{max-width:760px;margin:0 auto;padding:28px 20px 60px}
h1{font-size:30px;color:var(--navy);line-height:1.25;margin-bottom:10px}
h2{font-size:20px;color:var(--navy);margin:28px 0 8px}
p{margin:10px 0;font-size:16px}
.cta{display:inline-block;background:var(--ocean);color:#fff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:10px;margin:18px 0;font-family:Arial,Helvetica,sans-serif}
.cta:hover{background:#174a7c}
ul{margin:8px 0 8px 22px}
li{margin:4px 0}
.nearby{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.nearby a{background:var(--sky);color:var(--navy);text-decoration:none;font-size:14px;padding:6px 12px;border-radius:999px;font-family:Arial,Helvetica,sans-serif}
footer{text-align:center;font-size:13px;color:var(--muted);padding:24px;font-family:Arial,Helvetica,sans-serif}
footer a{color:var(--ocean)}
</style>
</head>
<body>
<header><img src="/logo.svg" alt="Fish Condish logo"/><a href="/">Fish Condish</a></header>
<main>
<h1>${esc(town.name)} Fishing Report &amp; Live Conditions</h1>
<p>Planning to fish ${esc(town.water)}? Fish Condish gives you a live, data-driven read on whether it's worth the trip — a <strong>1–10 fishing score</strong> for ${esc(town.name)} right now, the <strong>best times to fish today</strong>, and a <strong>species-by-species bite forecast</strong>.</p>
<a class="cta" href="${appLink}">See live ${esc(town.name)} conditions →</a>
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
<p>It's free, works on your phone, and installs like an app. Local anglers also share recent catches right in the feed.</p>
<a class="cta" href="${appLink}">Check the ${esc(town.name)} fishing score →</a>
<h2>Nearby spots</h2>
<div class="nearby">
${nearby.map(t => `<a href="/fishing/${slugify(t.name)}/">${esc(t.name)}</a>`).join('\n')}
</div>
</main>
<footer>© ${new Date().getFullYear()} Fish Condish · <a href="/">Open the live dashboard</a></footer>
</body>
</html>`;
}

// ---- generate ----
const outRoot = path.join(__dirname, '..', 'public', 'fishing');
fs.rmSync(outRoot, { recursive: true, force: true });
fs.mkdirSync(outRoot, { recursive: true });

for (const town of TOWNS) {
  const dir = path.join(outRoot, slugify(town.name));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), pageHtml(town, TOWNS));
}

// sitemap.xml (homepage + all town pages)
const today = new Date().toISOString().slice(0, 10);
const urls = [`${SITE}/`, ...TOWNS.map(t => `${SITE}/fishing/${slugify(t.name)}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(__dirname, '..', 'public', 'sitemap.xml'), sitemap);

console.log(`Generated ${TOWNS.length} SEO pages in public/fishing/ + sitemap.xml`);
