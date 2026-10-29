// Données d'exemple affichées en MODE DÉMO (quand Supabase n'est pas configuré).
// Identiques à supabase/seed.sql.
import type { FeedItem } from "./types";

export type DemoItem = FeedItem & { lat: number; lng: number };

const today = new Date().toISOString().slice(0, 10);

export const DEMO_FEED: DemoItem[] = ([
 {
  "drop_id": "00000000-0000-0000-0000-000000004000",
  "dish_id": "00000000-0000-0000-0000-000000002000",
  "cook_id": "00000000-0000-0000-0000-000000001000",
  "title": "Phở Bò Traditionnel",
  "description": "Bouillon de bœuf mijoté 12 heures, nouilles de riz, herbes fraîches.",
  "cuisine": "vietnamese",
  "photos": [
   "/images/dishes/pho.jpg"
  ],
  "price_cents": 1050,
  "customer_price_cents": 1260,
  "temperature": "hot",
  "allergens": [
   "gluten",
   "fish",
   "soy"
  ],
  "diets": [
   "halal"
  ],
  "spice_level": 1,
  "portion_grams": 400,
  "available_on": "TODAY",
  "ready_from": "11:30:00",
  "ready_until": "21:00:00",
  "quantity_remaining": 6,
  "quantity_total": 6,
  "dish_rating": 4.9,
  "dish_rating_count": 213,
  "cook_name": "Chez Mami Hương",
  "cook_slug": "mami-huong",
  "cook_avatar": null,
  "cook_rating": 4.9,
  "cook_rating_count": 213,
  "offers_pickup": true,
  "offers_delivery": false,
  "delivery_fee_cents": 290,
  "distance_m": null,
  "lat": 48.8625,
  "lng": 2.3601,
  "extras": [
   {
    "id": "00000000-0000-0000-0000-000000005000",
    "name": "Sauce Sriracha",
    "emoji": "🌶️",
    "price_cents": 150,
    "customer_price_cents": 180
   },
   {
    "id": "00000000-0000-0000-0000-000000005001",
    "name": "Thé glacé",
    "emoji": "🧊",
    "price_cents": 200,
    "customer_price_cents": 240
   }
  ],
  "menu_deal": {
   "id": "00000000-0000-0000-0000-000000006000",
   "name": "Menu Hanoi",
   "items": "Phở + Nems (x3) + Thé glacé",
   "price_cents": 1500,
   "customer_price_cents": 1800
  }
 },
 {
  "drop_id": "00000000-0000-0000-0000-000000004001",
  "dish_id": "00000000-0000-0000-0000-000000002001",
  "cook_id": "00000000-0000-0000-0000-000000001001",
  "title": "Lasagnes Maison Bolognaise",
  "description": "La recette de ma nonna : sauce bolognaise mijotée, béchamel maison, parmesan.",
  "cuisine": "italian",
  "photos": [
   "/images/dishes/lasagna.jpg"
  ],
  "price_cents": 1250,
  "customer_price_cents": 1500,
  "temperature": "hot",
  "allergens": [
   "gluten",
   "milk",
   "eggs",
   "celery"
  ],
  "diets": [],
  "spice_level": 0,
  "portion_grams": 400,
  "available_on": "TODAY",
  "ready_from": "11:30:00",
  "ready_until": "21:00:00",
  "quantity_remaining": 4,
  "quantity_total": 7,
  "dish_rating": 4.9,
  "dish_rating_count": 127,
  "cook_name": "Chez Mami Nono",
  "cook_slug": "mami-nono",
  "cook_avatar": null,
  "cook_rating": 4.9,
  "cook_rating_count": 127,
  "offers_pickup": true,
  "offers_delivery": true,
  "delivery_fee_cents": 290,
  "distance_m": null,
  "lat": 48.859,
  "lng": 2.347,
  "extras": [
   {
    "id": "00000000-0000-0000-0000-00000000500a",
    "name": "Sauce pesto",
    "emoji": "🌿",
    "price_cents": 200,
    "customer_price_cents": 240
   },
   {
    "id": "00000000-0000-0000-0000-00000000500b",
    "name": "Limonade",
    "emoji": "🍋",
    "price_cents": 250,
    "customer_price_cents": 300
   }
  ],
  "menu_deal": {
   "id": "00000000-0000-0000-0000-000000006001",
   "name": "Menu Italia",
   "items": "Lasagnes + Tiramisu + Limonade",
   "price_cents": 1800,
   "customer_price_cents": 2160
  }
 },
 {
  "drop_id": "00000000-0000-0000-0000-000000004002",
  "dish_id": "00000000-0000-0000-0000-000000002002",
  "cook_id": "00000000-0000-0000-0000-000000001002",
  "title": "Nems Croustillants (x6)",
  "description": "Nems au porc et champignons noirs, servis avec salade et menthe.",
  "cuisine": "vietnamese",
  "photos": [
   "/images/dishes/springrolls.jpg"
  ],
  "price_cents": 800,
  "customer_price_cents": 960,
  "temperature": "hot",
  "allergens": [
   "gluten",
   "fish",
   "eggs"
  ],
  "diets": [],
  "spice_level": 0,
  "portion_grams": 400,
  "available_on": "TODAY",
  "ready_from": "11:30:00",
  "ready_until": "21:00:00",
  "quantity_remaining": 2,
  "quantity_total": 8,
  "dish_rating": 4.8,
  "dish_rating_count": 89,
  "cook_name": "Chez Tata Lan",
  "cook_slug": "tata-lan",
  "cook_avatar": null,
  "cook_rating": 4.8,
  "cook_rating_count": 89,
  "offers_pickup": true,
  "offers_delivery": true,
  "delivery_fee_cents": 290,
  "distance_m": null,
  "lat": 48.853,
  "lng": 2.369,
  "extras": [
   {
    "id": "00000000-0000-0000-0000-000000005014",
    "name": "Sauce nuoc mam",
    "emoji": "🫙",
    "price_cents": 50,
    "customer_price_cents": 60
   },
   {
    "id": "00000000-0000-0000-0000-000000005015",
    "name": "Sauce piment",
    "emoji": "🌶️",
    "price_cents": 50,
    "customer_price_cents": 60
   },
   {
    "id": "00000000-0000-0000-0000-000000005016",
    "name": "Jus de coco",
    "emoji": "🥥",
    "price_cents": 250,
    "customer_price_cents": 300
   }
  ],
  "menu_deal": null
 },
 {
  "drop_id": "00000000-0000-0000-0000-000000004003",
  "dish_id": "00000000-0000-0000-0000-000000002003",
  "cook_id": "00000000-0000-0000-0000-000000001003",
  "title": "Tajine Poulet Citron Confit",
  "description": "Poulet fermier, citrons confits, olives violettes, cuisson lente.",
  "cuisine": "moroccan",
  "photos": [
   "/images/dishes/tagine.jpg"
  ],
  "price_cents": 1300,
  "customer_price_cents": 1560,
  "temperature": "hot",
  "allergens": [
   "nuts"
  ],
  "diets": [
   "halal",
   "gluten_free"
  ],
  "spice_level": 1,
  "portion_grams": 400,
  "available_on": "TODAY",
  "ready_from": "11:30:00",
  "ready_until": "21:00:00",
  "quantity_remaining": 9,
  "quantity_total": 9,
  "dish_rating": 5.0,
  "dish_rating_count": 178,
  "cook_name": "Chez Mami Fatima",
  "cook_slug": "mami-fatima",
  "cook_avatar": null,
  "cook_rating": 5.0,
  "cook_rating_count": 178,
  "offers_pickup": true,
  "offers_delivery": false,
  "delivery_fee_cents": 290,
  "distance_m": null,
  "lat": 48.87,
  "lng": 2.38,
  "extras": [
   {
    "id": "00000000-0000-0000-0000-00000000501e",
    "name": "Harissa maison",
    "emoji": "🌶️",
    "price_cents": 100,
    "customer_price_cents": 120
   },
   {
    "id": "00000000-0000-0000-0000-00000000501f",
    "name": "Thé à la menthe",
    "emoji": "🍵",
    "price_cents": 200,
    "customer_price_cents": 240
   }
  ],
  "menu_deal": {
   "id": "00000000-0000-0000-0000-000000006003",
   "name": "Menu Marrakech",
   "items": "Tajine + Corne de gazelle (x3) + Thé",
   "price_cents": 1700,
   "customer_price_cents": 2040
  }
 },
 {
  "drop_id": "00000000-0000-0000-0000-000000004004",
  "dish_id": "00000000-0000-0000-0000-000000002004",
  "cook_id": "00000000-0000-0000-0000-000000001004",
  "title": "Ramen Tonkotsu Maison",
  "description": "Bouillon d'os de porc crémeux, chashu, nouilles fraîches.",
  "cuisine": "japanese",
  "photos": [
   "/images/dishes/ramen.jpg"
  ],
  "price_cents": 1150,
  "customer_price_cents": 1380,
  "temperature": "hot",
  "allergens": [
   "gluten",
   "eggs",
   "soy",
   "sesame"
  ],
  "diets": [],
  "spice_level": 0,
  "portion_grams": 400,
  "available_on": "TODAY",
  "ready_from": "11:30:00",
  "ready_until": "21:00:00",
  "quantity_remaining": 8,
  "quantity_total": 10,
  "dish_rating": 4.8,
  "dish_rating_count": 96,
  "cook_name": "Chez Mami Yuki",
  "cook_slug": "mami-yuki",
  "cook_avatar": null,
  "cook_rating": 4.8,
  "cook_rating_count": 96,
  "offers_pickup": true,
  "offers_delivery": true,
  "delivery_fee_cents": 290,
  "distance_m": null,
  "lat": 48.865,
  "lng": 2.33,
  "extras": [
   {
    "id": "00000000-0000-0000-0000-000000005028",
    "name": "Œuf mariné",
    "emoji": "🥚",
    "price_cents": 150,
    "customer_price_cents": 180
   },
   {
    "id": "00000000-0000-0000-0000-000000005029",
    "name": "Pot de bouillon",
    "emoji": "🫕",
    "price_cents": 300,
    "customer_price_cents": 360
   }
  ],
  "menu_deal": null
 },
 {
  "drop_id": "00000000-0000-0000-0000-000000004005",
  "dish_id": "00000000-0000-0000-0000-000000002005",
  "cook_id": "00000000-0000-0000-0000-000000001005",
  "title": "Smash Burger Maison",
  "description": "Double steak smashé, cheddar affiné, pain brioché maison.",
  "cuisine": "fastfood",
  "photos": [
   "/images/dishes/burger.jpg"
  ],
  "price_cents": 950,
  "customer_price_cents": 1140,
  "temperature": "hot",
  "allergens": [
   "gluten",
   "milk",
   "mustard",
   "sesame"
  ],
  "diets": [],
  "spice_level": 0,
  "portion_grams": 400,
  "available_on": "TODAY",
  "ready_from": "11:30:00",
  "ready_until": "21:00:00",
  "quantity_remaining": 7,
  "quantity_total": 11,
  "dish_rating": 4.7,
  "dish_rating_count": 145,
  "cook_name": "Chez Tonton Marco",
  "cook_slug": "tonton-marco",
  "cook_avatar": null,
  "cook_rating": 4.7,
  "cook_rating_count": 145,
  "offers_pickup": true,
  "offers_delivery": true,
  "delivery_fee_cents": 290,
  "distance_m": null,
  "lat": 48.85,
  "lng": 2.345,
  "extras": [
   {
    "id": "00000000-0000-0000-0000-000000005032",
    "name": "Sauce secrète",
    "emoji": "🫙",
    "price_cents": 100,
    "customer_price_cents": 120
   },
   {
    "id": "00000000-0000-0000-0000-000000005033",
    "name": "Coca artisanal",
    "emoji": "🥤",
    "price_cents": 300,
    "customer_price_cents": 360
   }
  ],
  "menu_deal": {
   "id": "00000000-0000-0000-0000-000000006005",
   "name": "Menu Burger",
   "items": "Burger + Frites maison + Boisson",
   "price_cents": 1350,
   "customer_price_cents": 1620
  }
 },
 {
  "drop_id": "00000000-0000-0000-0000-000000004006",
  "dish_id": "00000000-0000-0000-0000-000000002006",
  "cook_id": "00000000-0000-0000-0000-000000001006",
  "title": "Butter Chicken & Naan",
  "description": "Poulet mariné au yaourt, sauce tomate-beurre aux épices douces.",
  "cuisine": "indian",
  "photos": [
   "/images/dishes/butterchicken.jpg"
  ],
  "price_cents": 1200,
  "customer_price_cents": 1440,
  "temperature": "hot",
  "allergens": [
   "milk",
   "nuts",
   "gluten"
  ],
  "diets": [
   "halal"
  ],
  "spice_level": 1,
  "portion_grams": 400,
  "available_on": "TODAY",
  "ready_from": "11:30:00",
  "ready_until": "21:00:00",
  "quantity_remaining": 6,
  "quantity_total": 12,
  "dish_rating": 4.9,
  "dish_rating_count": 112,
  "cook_name": "Chez Mami Priya",
  "cook_slug": "mami-priya",
  "cook_avatar": null,
  "cook_rating": 4.9,
  "cook_rating_count": 112,
  "offers_pickup": true,
  "offers_delivery": false,
  "delivery_fee_cents": 290,
  "distance_m": null,
  "lat": 48.878,
  "lng": 2.355,
  "extras": [
   {
    "id": "00000000-0000-0000-0000-00000000503c",
    "name": "Raïta maison",
    "emoji": "🥣",
    "price_cents": 150,
    "customer_price_cents": 180
   },
   {
    "id": "00000000-0000-0000-0000-00000000503d",
    "name": "Mango lassi",
    "emoji": "🥭",
    "price_cents": 250,
    "customer_price_cents": 300
   },
   {
    "id": "00000000-0000-0000-0000-00000000503e",
    "name": "Naan supp.",
    "emoji": "🫓",
    "price_cents": 150,
    "customer_price_cents": 180
   }
  ],
  "menu_deal": {
   "id": "00000000-0000-0000-0000-000000006006",
   "name": "Menu Bollywood",
   "items": "Butter Chicken + Naan + Lassi",
   "price_cents": 1600,
   "customer_price_cents": 1920
  }
 },
 {
  "drop_id": "00000000-0000-0000-0000-000000004007",
  "dish_id": "00000000-0000-0000-0000-000000002007",
  "cook_id": "00000000-0000-0000-0000-000000001007",
  "title": "Pad Thaï aux Crevettes",
  "description": "Nouilles de riz sautées, crevettes, cacahuètes, citron vert.",
  "cuisine": "thai",
  "photos": [
   "/images/dishes/padthai.jpg"
  ],
  "price_cents": 1100,
  "customer_price_cents": 1320,
  "temperature": "hot",
  "allergens": [
   "crustaceans",
   "peanuts",
   "eggs",
   "fish",
   "soy"
  ],
  "diets": [],
  "spice_level": 1,
  "portion_grams": 400,
  "available_on": "TODAY",
  "ready_from": "11:30:00",
  "ready_until": "21:00:00",
  "quantity_remaining": 5,
  "quantity_total": 13,
  "dish_rating": 4.7,
  "dish_rating_count": 64,
  "cook_name": "Chez Mami Suki",
  "cook_slug": "mami-suki",
  "cook_avatar": null,
  "cook_rating": 4.7,
  "cook_rating_count": 64,
  "offers_pickup": true,
  "offers_delivery": true,
  "delivery_fee_cents": 290,
  "distance_m": null,
  "lat": 48.845,
  "lng": 2.375,
  "extras": [
   {
    "id": "00000000-0000-0000-0000-000000005046",
    "name": "Sauce satay",
    "emoji": "🥜",
    "price_cents": 150,
    "customer_price_cents": 180
   },
   {
    "id": "00000000-0000-0000-0000-000000005047",
    "name": "Jus de litchi",
    "emoji": "🧃",
    "price_cents": 250,
    "customer_price_cents": 300
   }
  ],
  "menu_deal": null
 },
 {
  "drop_id": "00000000-0000-0000-0000-000000004008",
  "dish_id": "00000000-0000-0000-0000-000000002008",
  "cook_id": "00000000-0000-0000-0000-000000001008",
  "title": "Paella Royale Fruits de Mer",
  "description": "Riz bomba au safran, gambas, moules, calamars.",
  "cuisine": "spanish",
  "photos": [
   "/images/dishes/paella.jpg"
  ],
  "price_cents": 1400,
  "customer_price_cents": 1680,
  "temperature": "hot",
  "allergens": [
   "crustaceans",
   "molluscs",
   "fish"
  ],
  "diets": [
   "gluten_free"
  ],
  "spice_level": 0,
  "portion_grams": 400,
  "available_on": "TODAY",
  "ready_from": "11:30:00",
  "ready_until": "21:00:00",
  "quantity_remaining": 4,
  "quantity_total": 14,
  "dish_rating": 5.0,
  "dish_rating_count": 42,
  "cook_name": "Chez Abuela Rosa",
  "cook_slug": "abuela-rosa",
  "cook_avatar": null,
  "cook_rating": 5.0,
  "cook_rating_count": 42,
  "offers_pickup": true,
  "offers_delivery": true,
  "delivery_fee_cents": 290,
  "distance_m": null,
  "lat": 48.84,
  "lng": 2.32,
  "extras": [
   {
    "id": "00000000-0000-0000-0000-000000005050",
    "name": "Aïoli maison",
    "emoji": "🧄",
    "price_cents": 100,
    "customer_price_cents": 120
   }
  ],
  "menu_deal": {
   "id": "00000000-0000-0000-0000-000000006008",
   "name": "Menu Fiesta",
   "items": "Paella + Churros + Boisson",
   "price_cents": 2000,
   "customer_price_cents": 2400
  }
 },
 {
  "drop_id": "00000000-0000-0000-0000-000000004009",
  "dish_id": "00000000-0000-0000-0000-000000002009",
  "cook_id": "00000000-0000-0000-0000-000000001009",
  "title": "Dim Sum Vapeur (x8)",
  "description": "Har gow et siu mai faits main, cuits à la vapeur.",
  "cuisine": "chinese",
  "photos": [
   "/images/dishes/dimsum.jpg"
  ],
  "price_cents": 950,
  "customer_price_cents": 1140,
  "temperature": "hot",
  "allergens": [
   "gluten",
   "soy",
   "crustaceans",
   "sesame"
  ],
  "diets": [],
  "spice_level": 0,
  "portion_grams": 400,
  "available_on": "TODAY",
  "ready_from": "11:30:00",
  "ready_until": "21:00:00",
  "quantity_remaining": 3,
  "quantity_total": 15,
  "dish_rating": 4.6,
  "dish_rating_count": 156,
  "cook_name": "Chez Mami Chen",
  "cook_slug": "mami-chen",
  "cook_avatar": null,
  "cook_rating": 4.6,
  "cook_rating_count": 156,
  "offers_pickup": true,
  "offers_delivery": false,
  "delivery_fee_cents": 290,
  "distance_m": null,
  "lat": 48.862,
  "lng": 2.365,
  "extras": [
   {
    "id": "00000000-0000-0000-0000-00000000505a",
    "name": "Sauce soja",
    "emoji": "🫙",
    "price_cents": 50,
    "customer_price_cents": 60
   },
   {
    "id": "00000000-0000-0000-0000-00000000505b",
    "name": "Pot de soupe",
    "emoji": "🫕",
    "price_cents": 350,
    "customer_price_cents": 420
   }
  ],
  "menu_deal": null
 },
 {
  "drop_id": "00000000-0000-0000-0000-00000000400a",
  "dish_id": "00000000-0000-0000-0000-00000000200a",
  "cook_id": "00000000-0000-0000-0000-00000000100a",
  "title": "Tiramisu Artisanal",
  "description": "Mascarpone, café serré, biscuits imbibés, cacao amer.",
  "cuisine": "dessert",
  "photos": [
   "/images/dishes/tiramisu.jpg"
  ],
  "price_cents": 700,
  "customer_price_cents": 840,
  "temperature": "cold",
  "allergens": [
   "gluten",
   "eggs",
   "milk"
  ],
  "diets": [
   "vegetarian"
  ],
  "spice_level": 0,
  "portion_grams": 400,
  "available_on": "TODAY",
  "ready_from": "11:30:00",
  "ready_until": "21:00:00",
  "quantity_remaining": 6,
  "quantity_total": 6,
  "dish_rating": 5.0,
  "dish_rating_count": 234,
  "cook_name": "Chez Nonna Lucia",
  "cook_slug": "nonna-lucia",
  "cook_avatar": null,
  "cook_rating": 5.0,
  "cook_rating_count": 234,
  "offers_pickup": true,
  "offers_delivery": true,
  "delivery_fee_cents": 290,
  "distance_m": null,
  "lat": 48.856,
  "lng": 2.34,
  "extras": [
   {
    "id": "00000000-0000-0000-0000-000000005064",
    "name": "Espresso",
    "emoji": "☕",
    "price_cents": 200,
    "customer_price_cents": 240
   }
  ],
  "menu_deal": null
 },
 {
  "drop_id": "00000000-0000-0000-0000-00000000400b",
  "dish_id": "00000000-0000-0000-0000-00000000200b",
  "cook_id": "00000000-0000-0000-0000-00000000100b",
  "title": "Tarte aux Fruits Rouges",
  "description": "Pâte sablée, crème pâtissière vanille, fruits rouges de saison.",
  "cuisine": "dessert",
  "photos": [
   "/images/dishes/tarte.jpg"
  ],
  "price_cents": 650,
  "customer_price_cents": 780,
  "temperature": "cold",
  "allergens": [
   "gluten",
   "eggs",
   "milk"
  ],
  "diets": [
   "vegetarian"
  ],
  "spice_level": 0,
  "portion_grams": 400,
  "available_on": "TODAY",
  "ready_from": "11:30:00",
  "ready_until": "21:00:00",
  "quantity_remaining": 2,
  "quantity_total": 7,
  "dish_rating": 4.8,
  "dish_rating_count": 87,
  "cook_name": "Chez Mamie Colette",
  "cook_slug": "mamie-colette",
  "cook_avatar": null,
  "cook_rating": 4.8,
  "cook_rating_count": 87,
  "offers_pickup": true,
  "offers_delivery": true,
  "delivery_fee_cents": 290,
  "distance_m": null,
  "lat": 48.858,
  "lng": 2.352,
  "extras": [
   {
    "id": "00000000-0000-0000-0000-00000000506e",
    "name": "Crème anglaise",
    "emoji": "🍶",
    "price_cents": 150,
    "customer_price_cents": 180
   },
   {
    "id": "00000000-0000-0000-0000-00000000506f",
    "name": "Thé vert",
    "emoji": "🍵",
    "price_cents": 200,
    "customer_price_cents": 240
   }
  ],
  "menu_deal": null
 }
] as unknown as DemoItem[]).map((d, i) => ({ ...d, available_on: today, offers_courier: true, is_professional: i % 4 === 0, currency: "EUR" }));
