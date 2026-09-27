// Two years of operational history for Spice Garden · Banjara Hills.
// Each event is what restOS would emit (stock-out, waste log, supplier delay,
// unmet customer request, staff note) or what the Foresight agent itself wrote
// (plans and post-festival outcomes). These are retained into Hindsight.

export type EventKind =
  | 'stockout'
  | 'lost_demand'
  | 'supplier'
  | 'waste'
  | 'staff_note'
  | 'summary'
  | 'plan'
  | 'outcome';

export type HistoryEvent = {
  id: string;
  at: string; // ISO local time, Asia/Kolkata
  kind: EventKind;
  festival?: string;
  items?: string[];
  supplier?: string;
  text: string;
};

// Everything before this date is what the agent knew after its first festival
// season. Used for the "1 season of memory" bank in the learning-curve demo.
export const FIRST_SEASON_CUTOFF = '2025-01-01';

export const history: HistoryEvent[] = [
  // ── Dussehra 2024 (12 Oct) ────────────────────────────────────────────────
  { id: 'dus24-1', at: '2024-10-10T11:00', kind: 'staff_note', festival: 'dussehra', items: ['mutton'],
    text: 'Priya (manager): Dasara weekend bookings are double normal — 14 family reservations for 12 Oct 2024, most asking for mutton biryani and mutton curry for the Dasara feast.' },
  { id: 'dus24-2', at: '2024-10-12T20:15', kind: 'stockout', festival: 'dussehra', items: ['mutton'],
    text: 'Mutton ran out at 8:15pm on Dussehra (12 Oct 2024). We had 18 kg and it was gone by 8pm. About 22 mutton biryani orders were turned away or switched to chicken.' },
  { id: 'dus24-3', at: '2024-10-12T20:40', kind: 'supplier', festival: 'dussehra', items: ['mutton'], supplier: 'hyderabad-meat-house',
    text: 'Hyderabad Meat House could not do a same-day mutton top-up on Dussehra — every butcher in the city is sold out on Dasara. Festival mutton has to be pre-booked at least 3 days ahead.' },
  { id: 'dus24-4', at: '2024-10-13T10:00', kind: 'summary', festival: 'dussehra',
    text: 'Dussehra 2024 summary: revenue ₹1.86L vs ₹1.1L on a normal Saturday. Mutton biryani 64 plates vs 25 normal. Chicken demand normal. Double ka meetha 30 portions.' },

  // ── Diwali 2024 (31 Oct - 2 Nov) ──────────────────────────────────────────
  { id: 'diw24-1', at: '2024-10-25T12:00', kind: 'staff_note', festival: 'diwali', items: ['sugar'], supplier: 'balaji-traders',
    text: 'Imran (store keeper): ordered 25 kg sugar for Diwali week from Balaji Traders — a normal week plus 5 kg.' },
  { id: 'diw24-2', at: '2024-10-28T18:00', kind: 'lost_demand', festival: 'diwali', items: ['sweet-boxes'],
    text: 'Around 15 walk-in and phone customers asked whether we sell Diwali sweet gift boxes for corporate gifting. We do not offer them.' },
  { id: 'diw24-3', at: '2024-10-29T16:00', kind: 'supplier', festival: 'diwali', items: ['sugar', 'cashew'], supplier: 'balaji-traders',
    text: 'Balaji Traders delivered the sugar and cashew order 2 days late (ordered 25 Oct, due 27 Oct, arrived 29 Oct). Begum Bazar wholesalers are overloaded the week before Diwali.' },
  { id: 'diw24-4', at: '2024-10-31T21:00', kind: 'lost_demand', festival: 'diwali', items: ['cashew'],
    text: 'At least 40 customers between 28 and 31 Oct 2024 asked for kaju katli, which is not on our menu. Several wanted 500g–1kg boxes to take home.' },
  { id: 'diw24-5', at: '2024-11-01T15:30', kind: 'stockout', festival: 'diwali', items: ['sweet-boxes'], supplier: 'packright',
    text: 'Sweet boxes and takeaway dessert containers ran out on the afternoon of 1 Nov 2024; 12 takeaway sweet orders were refused.' },
  { id: 'diw24-6', at: '2024-11-01T19:05', kind: 'stockout', festival: 'diwali', items: ['sugar'],
    text: 'Sugar hit zero at 7:05pm on 1 Nov 2024, the second day of Diwali. We used about 32 kg between 29 Oct and 1 Nov versus 8 kg in a normal 4 days. Kheer, gulab jamun and double ka meetha came off the menu for the night.' },
  { id: 'diw24-7', at: '2024-11-01T22:30', kind: 'lost_demand', festival: 'diwali', items: ['sugar'],
    text: 'After sugar ran out on 1 Nov 2024, about 55 dessert orders (kheer, gulab jamun, double ka meetha) were turned away — roughly ₹9,500 of lost revenue.' },
  { id: 'diw24-8', at: '2024-11-01T23:00', kind: 'stockout', festival: 'diwali', items: ['ghee'],
    text: 'Ghee was down to 1.5 kg by the night of 1 Nov 2024 and head chef Ravi rationed it for jalebi. Diwali ghee use ran about 2.5x normal.' },
  { id: 'diw24-9', at: '2024-11-02T09:30', kind: 'supplier', festival: 'diwali', items: ['sugar'],
    text: 'Imran bought 10 kg sugar from a local kirana at ₹58/kg (Balaji price ₹44/kg) as an emergency top-up on the morning of 2 Nov 2024.' },
  { id: 'diw24-10', at: '2024-11-04T11:00', kind: 'waste', festival: 'diwali', items: ['paneer'],
    text: 'Paneer waste after Diwali 2024: 8 kg expired (~₹2,700). We bought 26 kg expecting a rush, but during Diwali customers ordered sweets and biryani and paneer mains actually fell 15%.' },
  { id: 'diw24-11', at: '2024-11-04T12:00', kind: 'summary', festival: 'diwali',
    text: 'Diwali 2024 summary (29 Oct - 2 Nov): revenue ₹6.4L vs ₹4.1L for a normal 5 days. Desserts +210%, biryani +60%, paneer mains −15%. Biggest misses: sugar stock-out, no kaju katli, sweet boxes ran out.' },
  { id: 'diw24-12', at: '2024-11-05T10:00', kind: 'staff_note', festival: 'diwali', items: ['sugar', 'ghee', 'khoya'],
    text: 'Ravi (head chef): next Diwali we must order sugar, ghee and khoya a full week early, keep a backup dry-goods supplier, and add kaju katli boxes to the menu.' },

  // ── New Year's Eve 2024 ───────────────────────────────────────────────────
  { id: 'nye24-1', at: '2025-01-01T01:00', kind: 'stockout', festival: 'new-year', items: ['chicken'],
    text: "New Year's Eve 2024: 2.3x normal dinner covers, peak 10pm–12:30am. Chicken 65 and starters sold heavily; chicken ran short at 11:40pm — needed about 30 kg, had 20 kg." },

  // ── Sankranti 2025 (13–16 Jan) ────────────────────────────────────────────
  { id: 'san25-1', at: '2025-01-10T10:00', kind: 'staff_note', festival: 'sankranti',
    text: 'Priya: 5 of 14 kitchen staff are on leave 12–16 Jan 2025 for Sankranti, travelling home to villages in AP and Telangana.' },
  { id: 'san25-2', at: '2025-01-16T22:00', kind: 'summary', festival: 'sankranti',
    text: 'Sankranti 2025 (13–16 Jan): revenue DOWN 35% vs normal and dine-in covers down 40%. Hyderabad empties out as people travel home for the festival.' },
  { id: 'san25-3', at: '2025-01-17T11:00', kind: 'waste', festival: 'sankranti', items: ['chicken', 'paneer'],
    text: 'Sankranti 2025 waste: 11 kg chicken and 6 kg paneer thrown away because we stocked for a normal week. Perishables should be cut by about a third for Sankranti week.' },

  // ── Ramzan 2025 (2–30 Mar) & Eid (31 Mar) ─────────────────────────────────
  { id: 'ram25-1', at: '2025-02-26T10:00', kind: 'plan', festival: 'ramzan', items: ['mutton'],
    text: 'Foresight plan for Ramzan 2025: no Ramzan history yet. Recommended starting haleem from day 1 at 60 portions/day and booking mutton daily with Hyderabad Meat House.' },
  { id: 'ram25-2', at: '2025-03-06T21:00', kind: 'stockout', festival: 'ramzan', items: ['mutton'],
    text: 'Haleem sold out by 8:10pm on 4 of the first 5 days of Ramzan 2025. Iftar rush peaks 6:30–7:30pm. We make 60 portions a day; demand is about 85.' },
  { id: 'ram25-3', at: '2025-03-07T20:00', kind: 'lost_demand', festival: 'ramzan',
    text: 'About 25 customers in the first week of Ramzan 2025 asked for 1 kg haleem family packs to take home.' },
  { id: 'ram25-4', at: '2025-03-08T11:00', kind: 'staff_note', festival: 'ramzan', items: ['mutton'],
    text: 'From 8 Mar 2025 we raised haleem to 90 portions a day and added a 1 kg family pack at ₹850. Mutton use is now about 16 kg/day.' },
  { id: 'ram25-5', at: '2025-03-20T12:00', kind: 'supplier', festival: 'ramzan', items: ['mutton'], supplier: 'hyderabad-meat-house',
    text: 'Hyderabad Meat House raised mutton from ₹780 to ₹860/kg mid-Ramzan 2025 because of city-wide demand. A fixed-price contract for the whole month would have avoided this.' },
  { id: 'ram25-6', at: '2025-04-01T12:00', kind: 'summary', festival: 'ramzan',
    text: 'Ramzan 2025 summary: 2,480 haleem portions plus 310 family packs; monthly revenue +48%. About 430 kg mutton used. Weekends needed 110 portions a day.' },

  // ── Bonalu 2025 ───────────────────────────────────────────────────────────
  { id: 'bon25-1', at: '2025-07-28T11:00', kind: 'summary', festival: 'bonalu',
    text: 'Bonalu Sundays (July 2025): Old City road closures cut delivery orders by about 20%. Dine-in at Banjara Hills was unaffected. No stock changes needed.' },

  // ── Ganesh Chaturthi 2025 (27 Aug - 6 Sep) ────────────────────────────────
  { id: 'gan25-1', at: '2025-08-20T10:00', kind: 'plan', festival: 'ganesh-chaturthi',
    text: 'Foresight plan for Ganesh Chaturthi 2025: no memory of this festival yet, so I recommended normal stock levels.' },
  { id: 'gan25-2', at: '2025-08-30T21:00', kind: 'lost_demand', festival: 'ganesh-chaturthi',
    text: 'About 20 customers asked for modak during Ganesh Chaturthi 2025; we had none.' },
  { id: 'gan25-3', at: '2025-09-02T11:00', kind: 'waste', festival: 'ganesh-chaturthi', items: ['chicken', 'mutton', 'paneer'],
    text: 'Ganesh Chaturthi 2025: 14 kg chicken and 6 kg mutton wasted, while paneer ran out twice (29 and 31 Aug). Many regulars go vegetarian for the 10 days — non-veg sales fell about 40%, veg thali and paneer rose 35%.' },
  { id: 'gan25-4', at: '2025-09-06T19:00', kind: 'staff_note', festival: 'ganesh-chaturthi',
    text: 'Ganesh immersion day (6 Sep 2025): Tank Bund closures, delivery orders cancelled after 4pm and three staff could not reach the outlet. Close early on immersion day next year.' },

  // ── Dussehra 2025 (2 Oct) ─────────────────────────────────────────────────
  { id: 'dus25-1', at: '2025-09-25T10:00', kind: 'plan', festival: 'dussehra', items: ['mutton'], supplier: 'hyderabad-meat-house',
    text: 'Foresight plan for Dussehra 2025, based on the Dussehra 2024 stock-out: pre-book 28 kg mutton with Hyderabad Meat House 3 days ahead and add one evening cook.' },
  { id: 'dus25-2', at: '2025-10-03T10:00', kind: 'outcome', festival: 'dussehra', items: ['mutton'],
    text: 'Dussehra 2025 outcome: 27 kg of the 28 kg pre-booked mutton used, no stock-out — first Dasara without turning away biryani orders. 71 mutton biryani plates.' },

  // ── Diwali 2025 (18–22 Oct, main day 20 Oct) ──────────────────────────────
  { id: 'diw25-1', at: '2025-10-08T10:00', kind: 'plan', festival: 'diwali', items: ['sugar', 'ghee', 'khoya', 'sweet-boxes', 'paneer', 'cashew'],
    text: 'Foresight plan for Diwali 2025, based on Diwali 2024: order 45 kg sugar, 12 kg ghee and 10 kg khoya by 11 Oct (a week early); keep Deccan Wholesale Mart as backup; add 500g kaju katli boxes; order 200 sweet boxes from PackRight; cut paneer by 20%.' },
  { id: 'diw25-2', at: '2025-10-14T17:00', kind: 'supplier', festival: 'diwali', items: ['sugar'], supplier: 'balaji-traders',
    text: 'Balaji Traders was late again before Diwali 2025 (ordered 10 Oct, arrived 14 Oct), but it did not matter because we ordered a week early.' },
  { id: 'diw25-3', at: '2025-10-16T12:00', kind: 'supplier', festival: 'diwali', items: ['cashew'], supplier: 'balaji-traders',
    text: 'Balaji Traders raised cashew 18% (₹980 → ₹1,160/kg) the week before Diwali 2025. Deccan Wholesale Mart quoted ₹1,040/kg, so we bought 8 kg cashew from Deccan.' },
  { id: 'diw25-4', at: '2025-10-17T15:00', kind: 'lost_demand', festival: 'diwali', items: ['sweet-boxes', 'cashew'],
    text: 'Three companies, including a Hitec City IT firm, ordered 120 kaju katli boxes for employee Diwali gifts in 2025. All three asked us to take bookings earlier next year — one had to split its order with another shop because we confirmed late.' },
  { id: 'diw25-5', at: '2025-10-20T21:30', kind: 'stockout', festival: 'diwali', items: ['ghee'],
    text: 'Ghee ran out at 9:30pm on Diwali, 20 Oct 2025. We used 15 kg over 4 days against 12 kg stocked; jalebi was paused for the last hour.' },
  { id: 'diw25-6', at: '2025-10-23T11:00', kind: 'outcome', festival: 'diwali', items: ['sugar', 'cashew', 'sweet-boxes', 'paneer', 'ghee'],
    text: 'Diwali 2025 outcome vs plan: 41 of 45 kg sugar used — no sugar stock-out (2024 ran out). Kaju katli: 38 walk-in boxes plus 120 corporate. 186 of 200 sweet boxes used. The 20% paneer cut was right: zero paneer waste. Miss: ghee short by about 3 kg.' },
  { id: 'diw25-7', at: '2025-10-23T12:00', kind: 'summary', festival: 'diwali',
    text: 'Diwali 2025 revenue ₹8.9L vs ₹6.4L in Diwali 2024 (+39%). Dessert revenue +62% year on year, driven by kaju katli boxes.' },

  // ── New Year's Eve 2025 ───────────────────────────────────────────────────
  { id: 'nye25-1', at: '2026-01-01T01:00', kind: 'outcome', festival: 'new-year', items: ['chicken'],
    text: "New Year's Eve 2025: stocked 32 kg chicken because of the 2024 shortage; used 30 kg, no stock-out." },

  // ── Sankranti 2026 ────────────────────────────────────────────────────────
  { id: 'san26-1', at: '2026-01-17T11:00', kind: 'outcome', festival: 'sankranti', items: ['chicken', 'paneer'],
    text: 'Sankranti 2026: cut perishables 35% per the 2025 lesson. Waste only 2 kg; revenue down 33%, as expected.' },

  // ── Ramzan 2026 (18 Feb - 19 Mar) ─────────────────────────────────────────
  { id: 'ram26-1', at: '2026-02-10T10:00', kind: 'plan', festival: 'ramzan', items: ['mutton'], supplier: 'hyderabad-meat-house',
    text: 'Foresight plan for Ramzan 2026: 90 haleem portions on weekdays and 110 on weekends from day 1, family packs from day 1, and a fixed ₹800/kg mutton contract for the month with Hyderabad Meat House.' },
  { id: 'ram26-2', at: '2026-03-22T11:00', kind: 'outcome', festival: 'ramzan', items: ['mutton'],
    text: 'Ramzan 2026 outcome: haleem sold out on only 2 days (vs 4 of the first 5 days in 2025). The mutton contract saved about ₹26,000 against a ₹880/kg spot price. 420 family packs sold.' },

  // ── Ganesh Chaturthi 2026 (14–24 Sep) ─────────────────────────────────────
  { id: 'gan26-1', at: '2026-09-05T10:00', kind: 'plan', festival: 'ganesh-chaturthi', items: ['chicken', 'mutton', 'paneer'],
    text: 'Foresight plan for Ganesh Chaturthi 2026: cut chicken 40% and mutton 30% for the 10 days, raise paneer 35%, add modak on Chaturthi day, close early on immersion day.' },
  { id: 'gan26-2', at: '2026-09-25T11:00', kind: 'outcome', festival: 'ganesh-chaturthi', items: ['chicken', 'paneer'],
    text: 'Ganesh Chaturthi 2026 outcome: chicken waste 3 kg (vs 14 kg in 2025), no paneer stock-out, 140 modaks sold. Closed at 5pm on immersion day with no staff issues.' },
];
