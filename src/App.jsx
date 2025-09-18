import React, { useMemo, useState, useEffect, useRef } from "react";
import imgMassage from "./assets/back-massage-with-aromatic-oils.jpg";
import imgCupping from "./assets/cupping_image.jpg";
import imgFeet from "./assets/foot-massage-woman-spa.jpg";
import imgScale from "./assets/scale-weight.jpg";
import imgQwasa from "./assets/scrape therapy.jpg";
import imgHerbal from "./assets/herbal medicine.jpg";

// const API_BASE = "http://localhost:5106";
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (location.hostname === "localhost" ? "http://localhost:5106" : "");

// ---------- Shared lists ----------
const PROVINCES = [
  "Western Cape",
  "Gauteng",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Free State",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
];
const BRANCH_MAP = {
  "Western Cape": ["Cape Town CBD", "Stellenbosch", "Claremont"],
  "Gauteng": ["Sandton", "Rosebank", "Pretoria East"],
  "KwaZulu-Natal": ["Umhlanga", "Durban North"],
  "Eastern Cape": ["Gqeberha", "East London"],
  "Free State": ["Bloemfontein"],
  "Limpopo": ["Polokwane"],
  "Mpumalanga": ["Mbombela"],
  "Northern Cape": ["Kimberley"],
  "North West": ["Rustenburg"],
};
const FRAGRANCES = ["Rosemary", "Menthol", "Lavender", "Citrus"];
const INTENSITIES = ["Light", "Medium", "Hard"];

// ---------- Screens ----------
const SCREENS = [
  "Welcome",
  "About",
  "Login",
  "Sign Up",
  "Health Profile",
  "Booking Calendar",
  "Therapist",
  "Treatment",
  "Tailor Your Spa Experience",
  "Promotions",
  "Loyalty & Rewards",
  "Products and Cart",
  "Checkout",
  "Confirmation",
  "My Bookings",
  "Feedback",
  "Therapist - Calendar",
  "Admin - Analytics",
  "Admin - Insights",
  "Admin - Calendar",
];

// Only show the small loyalty summary strip on these screens
const LOYALTY_SUMMARY_SCREENS = new Set([
  "Promotions",
  "Loyalty & Rewards",
]);

// ---------- Small UI helpers ----------
const Label = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
    {children}
  </label>
);

const Input = ({ id, ...props }) => (
  <input
    id={id}
    {...props}
    className={`w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
      props.className || ""
    }`}
  />
);

const Select = ({ id, children, ...props }) => (
  <select
    id={id}
    {...props}
    className="w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
  >
    {children}
  </select>
);

const Card = ({ title, children, footer }) => (
  <div className="rounded-2xl shadow-sm border bg-white">
    {title ? (
      <div className="px-4 py-3 border-b bg-gray-50 rounded-t-2xl">
        <h3 className="text-sm font-semibold tracking-wide text-red-800">{title}</h3>
      </div>
    ) : null}
    <div className="p-4">{children}</div>
    {footer ? <div className="px-4 py-3 border-t bg-gray-50 rounded-b-2xl">{footer}</div> : null}
  </div>
);

const Stepper = ({ index }) => (
  <div className="flex items-center gap-1 overflow-x-auto pb-2" aria-label="Progress">
    {SCREENS.map((s, i) => (
      <div
        key={s}
        className={`h-1 rounded-full ${i <= index ? "bg-red-600" : "bg-red-200"}`}
        style={{ width: 28 }}
        title={`${i + 1}. ${s}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={SCREENS.length - 1}
        aria-valuenow={index}
      />
    ))}
  </div>
);

const TopBar = ({ screen, setScreen }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="text-xs text-gray-500">Jump to:</div>
    <Select
      aria-label="Jump to screen"
      value={screen}
      onChange={(e) => setScreen(e.target.value)}
      className="w-full"
    >
      {SCREENS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </Select>
  </div>
);

/** 🔴 Actual treatments & prices (from the price list) */
const TREATMENTS = [
  { name: "Online Assessment", price: 100 },
  { name: "Assessment", price: 200 },
  { name: "40 Min Therapy", price: 250 },
  { name: "60 Min Therapy", price: 300 },
  { name: "90 Min Therapy", price: 440 },
  { name: "2 Hr Therapy", price: 550 },
  { name: "Herbal Foot Soak (30 Min)", price: 140 },
  { name: "Just Feet Combo (Soak & Reflex) 60 Min", price: 320 },
  { name: "7 Up-Front Sessions (5% Discount)", price: 1995 },
  { name: "10 Up-Front Sessions (10% Discount)", price: 2700 },
];
/** Derived map so all other places stay in sync */
const PRICE_MAP = Object.fromEntries(TREATMENTS.map((t) => [t.name, t.price]));

/* Simple product catalog */
const PRODUCT_CATALOG = [
  { name: "Green Tea", price: 79 },
  { name: "Moringa", price: 129 },
  { name: "Calcium Powder", price: 99 },
];
const PRODUCT_PRICE = Object.fromEntries(PRODUCT_CATALOG.map((p) => [p.name, p.price]));

/* -------------------- Promotions: rules + helpers -------------------- */
const PROMO_DEFS = [
  { code: "WELLNESS10", title: "10% off any therapy", detail: "Applies to your selected treatment (products excluded).", how: "Select a treatment, then apply this code in Cart or Checkout." },
  { code: "SPRINGFEET", title: "20% off Just Feet combo", detail: "Only for “Just Feet Combo (Soak & Reflex) 60 Min”.", how: "Choose the Just Feet combo to unlock this discount." },
  { code: "CPT50", title: "R50 off — Cape Town CBD", detail: "Valid when you book at the Cape Town CBD branch.", how: "Pick Cape Town CBD in the booking calendar." },
  { code: "BUNDLE5", title: "5% off products", detail: "When you add 2+ product items to your cart.", how: "Add any two or more items in Products." },
];
const PROMO_CODES = PROMO_DEFS.map((p) => p.code);

/** Compute cart breakdown from draft */
function computeCart(draft) {
  const service = draft?.services?.[0] ?? "60 Min Therapy";
  const servicePrice = PRICE_MAP[service] ?? 0;

  const productLines = (draft?.products ?? [])
    .filter((p) => p.qty > 0)
    .map((p) => {
      const price = PRODUCT_PRICE[p.name] ?? 0;
      return { ...p, price, lineTotal: price * p.qty };
    });

  const productsSubtotal = productLines.reduce((s, x) => s + x.lineTotal, 0);
  const productsQtySum = productLines.reduce((s, x) => s + x.qty, 0);
  const preDiscountTotal = servicePrice + productsSubtotal;

  return {
    service,
    servicePrice,
    productLines,
    productsSubtotal,
    productsQtySum,
    preDiscountTotal,
  };
}

/** Evaluate a single code against current draft/cart */
function evaluatePromo(draft) {
  const code = (draft?.promoCode || "").trim().toUpperCase();
  if (!code) return null;

  const {
    service,
    servicePrice,
    productsSubtotal,
    productsQtySum,
    preDiscountTotal,
  } = computeCart(draft);

  let amount = 0;
  let why = "";

  switch (code) {
    case "WELLNESS10":
      amount = Math.round(servicePrice * 0.10);
      why = "10% off selected treatment";
      break;
    case "SPRINGFEET":
      if (service === "Just Feet Combo (Soak & Reflex) 60 Min") {
        amount = Math.round(servicePrice * 0.20);
        why = "20% off Just Feet combo";
      }
      break;
    case "CPT50":
      if ((draft?.branch ?? "") === "Cape Town CBD") {
        amount = 50;
        why = "R50 off Cape Town CBD";
      }
      break;
    case "BUNDLE5":
      if (productsQtySum >= 2) {
        amount = Math.round(productsSubtotal * 0.05);
        why = "5% off products";
      }
      break;
    default:
      amount = 0;
  }

  amount = Math.max(0, Math.min(amount, preDiscountTotal));
  if (!amount) return { code, amount: 0, why: "Code valid, but not eligible with current cart" };
  return { code, amount, why };
}

/* ---------------- LOYALTY: rules + helpers ---------------- */
const LOYALTY = {
  EARN_PER_RANDS: 10, // 1 point per R10 spent (post-discount)
  STAMP_TARGET: 6,    // every 6th visit grants a bonus
  STAMP_BONUS_POINTS: 100, // points granted when reaching target
  TIERS: [
    { name: "Member", threshold: 0, multiplier: 1.0 },
    { name: "Silver", threshold: 800, multiplier: 1.1 },
    { name: "Gold", threshold: 2000, multiplier: 1.25 },
  ],
  REWARDS: [
    { id: "R50OFF", label: "R50 off your order", pointsCost: 100, amountOff: 50, eligible: (cart) => cart.preDiscountTotal >= 50 },
    { id: "FREE_SOAK", label: "Free Herbal Foot Soak (30 Min)", pointsCost: 200, freeServiceName: "Herbal Foot Soak (30 Min)", eligible: (cart, draft) => (draft?.services?.[0] ?? "") === "Herbal Foot Soak (30 Min)" },
  ],
};

function tierFor(earnedTotal) {
  const list = LOYALTY.TIERS.slice().sort((a, b) => b.threshold - a.threshold);
  return list.find((t) => earnedTotal >= t.threshold) ?? LOYALTY.TIERS[0];
}

function evaluateLoyaltyReward(draft, loyalty) {
  const selectedId = draft?.loyaltyRewardId || "";
  if (!selectedId) return null;

  const reward = LOYALTY.REWARDS.find((r) => r.id === selectedId);
  if (!reward) return null;

  const cart = computeCart(draft);
  const points = loyalty?.points ?? 0;
  if (points < reward.pointsCost) {
    return { id: reward.id, amount: 0, why: `Need ${reward.pointsCost} pts` };
  }

  if (reward.freeServiceName) {
    const ok = reward.eligible?.(cart, draft);
    if (!ok) return { id: reward.id, amount: 0, why: "Not eligible with selected treatment" };
    const price = PRICE_MAP[reward.freeServiceName] ?? 0;
    const amount = Math.min(price, cart.preDiscountTotal);
    return { id: reward.id, amount, why: `Free ${reward.freeServiceName}` };
  }

  if (reward.amountOff) {
    const ok = reward.eligible?.(cart, draft) ?? true;
    if (!ok) return { id: reward.id, amount: 0, why: "Not eligible with current cart" };
    const amount = Math.min(reward.amountOff, cart.preDiscountTotal);
    return { id: reward.id, amount, why: reward.label };
  }

  return null;
}

/** Returns which discount applies (promo vs reward). No stacking. */
function chooseBestDiscount(draft, loyalty) {
  const promo = evaluatePromo(draft);
  const reward = evaluateLoyaltyReward(draft, loyalty);

  const p = Math.max(0, promo?.amount || 0);
  const r = Math.max(0, reward?.amount || 0);

  if (p === 0 && r === 0) return { type: "none", amount: 0, detail: null, other: null };
  if (p >= r) return { type: "promo", amount: p, detail: promo, other: reward };
  return { type: "reward", amount: r, detail: reward, other: promo };
}

function pointsFromSpend(spendRands, currentTier) {
  const base = Math.floor((spendRands || 0) / LOYALTY.EARN_PER_RANDS);
  return Math.floor(base * (currentTier?.multiplier ?? 1));
}

/* ---------------------------- APP ROOT ---------------------------- */
export default function WellnessAppPrototype() {
  const [screen, setScreen] = useState(SCREENS[0]);
  const index = useMemo(() => SCREENS.indexOf(screen), [screen]);

  // In-memory bookings store
  const [bookings, setBookings] = useState([]);

  // In-memory loyalty store (mock user)
  const [loyalty, setLoyalty] = useState({
    points: 120,
    earnedTotal: 120, // lifetime points earned
    stamps: 2,        // current stamp card progress
    tier: tierFor(120).name,
    history: [],
  });

  // Shared draft across the flow
  const [draft, setDraft] = useState({
    province: "Western Cape",
    branch: "Cape Town CBD",
    services: ["60 Min Therapy"],
    therapistName: "Shamsa",
    startUtc: null,
    endUtc: null,
    oilFragrance: null,
    massageIntensity: null,
    specialInstructions: "",
    products: [],
    promoCode: "",
    loyaltyRewardId: "",
  });

  /* ---------- Persistence (localStorage) ---------- */
  useEffect(() => {
    try {
      const savedDraft = JSON.parse(localStorage.getItem("ahc_draft") || "null");
      const savedLoyalty = JSON.parse(localStorage.getItem("ahc_loyalty") || "null");
      const savedBookings = JSON.parse(localStorage.getItem("ahc_bookings") || "null");
      if (savedDraft) setDraft((p) => ({ ...p, ...savedDraft }));
      if (savedLoyalty) setLoyalty((p) => ({ ...p, ...savedLoyalty }));
      if (Array.isArray(savedBookings)) setBookings(savedBookings);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ahc_draft", JSON.stringify(draft));
    } catch {}
  }, [draft]);

  useEffect(() => {
    try {
      localStorage.setItem("ahc_loyalty", JSON.stringify(loyalty));
    } catch {}
  }, [loyalty]);

  useEffect(() => {
    try {
      localStorage.setItem("ahc_bookings", JSON.stringify(bookings));
    } catch {}
  }, [bookings]);

  const nav = (dir) => {
    const i = SCREENS.indexOf(screen);
    const next = Math.min(Math.max(i + dir, 0), SCREENS.length - 1);
    setScreen(SCREENS[next]);
  };

  const resetDemo = () => {
    if (!confirm("Reset demo data (bookings, loyalty, cart)?")) return;
    setBookings([]);
    setLoyalty({ points: 120, earnedTotal: 120, stamps: 2, tier: tierFor(120).name, history: [] });
    setDraft({
      province: "Western Cape",
      branch: "Cape Town CBD",
      services: ["60 Min Therapy"],
      therapistName: "Shamsa",
      startUtc: null,
      endUtc: null,
      oilFragrance: null,
      massageIntensity: null,
      specialInstructions: "",
      products: [],
      promoCode: "",
      loyaltyRewardId: "",
    });
    try {
      localStorage.removeItem("ahc_draft");
      localStorage.removeItem("ahc_loyalty");
      localStorage.removeItem("ahc_bookings");
    } catch {}
  };

  return (
      <div className="min-h-screen w-full bg-gradient-to-b from-indigo-50 to-white py-6">
      <div className="mx-auto w-full max-w-md px-4">
        <header className="mb-3">
          <div className="flex flex-col items-center">
             <div className="h-14 flex items-center">
              <span className="text-2xl font-bold tracking-wide text-red-800">
              Wellness - Mobile App
             </span>
           </div>
         </div>
       </header>
        <Stepper index={index} />
        <div className="my-3">
          <TopBar screen={screen} setScreen={setScreen} />
        </div>

        {/* Loyalty quick summary (only on certain screens) */}
        {LOYALTY_SUMMARY_SCREENS.has(screen) && (
          <LoyaltySummary
            loyalty={loyalty}
            onOpen={() => setScreen("Loyalty & Rewards")}
          />
        )}

        <main className="rounded-3xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">
            {index + 1}. {screen}
          </h2>
          <div className="space-y-4">
            {screen === "Welcome" && <Welcome onNext={() => setScreen("Login")} onAbout={() => setScreen("About")} />}
            {screen === "Login" && <Login onNext={() => setScreen("Sign Up")} onSkip={() => setScreen("Booking Calendar")} />}
            {screen === "About" && <AboutServices setScreen={setScreen} setDraft={setDraft} />}
            {screen === "Sign Up" && <SignUp onNext={() => setScreen("Health Profile")} />}
            {screen === "Health Profile" && <HealthProfile onNext={() => setScreen("Booking Calendar")} />}

            {screen === "Booking Calendar" && (
              <BookingCalendar onNext={() => setScreen("Therapist")} draft={draft} setDraft={setDraft} bookings={bookings} />
            )}

            {screen === "Therapist" && <Therapist onNext={() => setScreen("Treatment")} draft={draft} setDraft={setDraft} />}

            {screen === "Treatment" && (
              <Treatment onNext={() => setScreen("Tailor Your Spa Experience")} draft={draft} setDraft={setDraft} />
            )}

            {screen === "Tailor Your Spa Experience" && (
              <TailorExperience onNext={() => setScreen("Promotions")} draft={draft} setDraft={setDraft} />
            )}

            {screen === "Promotions" && <PromotionsScreen draft={draft} setDraft={setDraft} setScreen={setScreen} />}

            {/* NEW: Loyalty screen */}
            {screen === "Loyalty & Rewards" && (
              <LoyaltyScreen
                draft={draft}
                setDraft={setDraft}
                loyalty={loyalty}
                setLoyalty={setLoyalty}
                goCart={() => setScreen("Products and Cart")}
              />
            )}

            {screen === "Products and Cart" && (
              <ProductsCart
                onNext={() => setScreen("Checkout")}
                draft={draft}
                setDraft={setDraft}
                loyalty={loyalty}
              />
            )}

            {screen === "Checkout" && (
              <Checkout
                onNext={() => setScreen("Confirmation")}
                draft={draft}
                setDraft={setDraft}
                setBookings={setBookings}
                loyalty={loyalty}
                setLoyalty={setLoyalty}
              />
            )}

            {screen === "Confirmation" && <Confirmation onNext={() => setScreen("Feedback")} />}
            {screen === "My Bookings" && (<MyBookings bookings={bookings} setBookings={setBookings} setScreen={setScreen}/>)}
            {screen === "Feedback" && <Feedback onNext={() => setScreen("Therapist - Calendar")} />}

            {screen === "Therapist - Calendar" && (
              <TherapistCalendar bookings={bookings} defaultTherapist={draft?.therapistName ?? "Shamsa"} />
            )}

            {screen === "Admin - Analytics" && <Analytics bookings={bookings} />}
            {screen === "Admin - Insights" && <Insights bookings={bookings} />}
            {screen === "Admin - Calendar" && <AdminCalendar bookings={bookings} />}
          </div>

          <div className="flex items-center justify-between mt-6">
            <button
              className="rounded-2xl border px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => nav(-1)}
              disabled={index === 0}
            >
              ◀ Back
            </button>
            <div className="flex items-center gap-2">
              <button
                className="rounded-2xl border px-4 py-2 text-sm hover:bg-gray-50"
                onClick={resetDemo}
                title="Reset demo data"
              >
                Reset
              </button>
              <button
                className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                onClick={() => nav(1)}
                disabled={index === SCREENS.length - 1}
              >
                Next ▶
              </button>
            </div>
          </div>
        </main>

        <footer className="mt-4 text-center text-xs text-gray-500">
          Mock only — no real payments submitted
        </footer>
      </div>

      {/* 🔴 Chatbot (floating assistant) */}
      <Chatbot
        screen={screen}
        setScreen={setScreen}
        draft={draft}
        setDraft={setDraft}
        bookings={bookings}
        loyalty={loyalty}
      />
    </div>
  );
}

/* ---------------- Loyalty UI bits ---------------- */
function LoyaltySummary({ loyalty, onOpen }) {
  const tier = tierFor(loyalty?.earnedTotal || 0);
  const nextTier = LOYALTY.TIERS.find((t) => t.threshold > tier.threshold);
  const progress = nextTier
    ? Math.min(100, Math.round(((loyalty.earnedTotal - tier.threshold) / (nextTier.threshold - tier.threshold)) * 100))
    : 100;

  return (
    <button
      className="w-full text-left rounded-2xl border bg-white p-3 mb-3 hover:bg-gray-50"
      onClick={onOpen}
      title="Open Loyalty & Rewards"
      aria-label="Open loyalty and rewards"
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-red-800">Loyalty</div>
        <div className="text-xs text-gray-600">Tap to manage</div>
      </div>
      <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl border p-2 text-center">
          <div className="text-[11px] text-gray-500">Tier</div>
          <div className="font-semibold">{loyalty?.tier ?? tier.name}</div>
        </div>
        <div className="rounded-xl border p-2 text-center">
          <div className="text-[11px] text-gray-500">Points</div>
          <div className="font-semibold">{loyalty?.points ?? 0}</div>
        </div>
        <div className="rounded-xl border p-2 text-center">
          <div className="text-[11px] text-gray-500">Stamps</div>
          <div className="font-semibold">
            {loyalty?.stamps ?? 0}/{LOYALTY.STAMP_TARGET}
          </div>
        </div>
      </div>
      <div className="mt-2">
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden" aria-hidden="true">
          <div className="h-full bg-red-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1 text-[11px] text-gray-500">
          {nextTier ? `${progress}% to ${nextTier.name}` : "Top tier reached"}
        </div>
      </div>
    </button>
  );
}

function LoyaltyScreen({ draft, setDraft, loyalty, setLoyalty, goCart }) {
  const cart = computeCart(draft);
  const tier = tierFor(loyalty.earnedTotal);
  const applied = draft?.loyaltyRewardId || "";

  const canApply = (r) =>
    loyalty.points >= r.pointsCost &&
    (r.eligible?.(cart, draft) ?? true);

  const apply = (id) => setDraft((p) => ({ ...p, loyaltyRewardId: id }));
  const clear = () => setDraft((p) => ({ ...p, loyaltyRewardId: "" }));

  return (
    <div className="space-y-4">
      <Card title="Your Loyalty">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border p-3 text-center">
            <div className="text-xs text-gray-500">Tier</div>
            <div className="text-base font-semibold">{loyalty.tier}</div>
            <div className="text-[11px] text-gray-500">×{tier.multiplier.toFixed(2)} earn</div>
          </div>
          <div className="rounded-xl border p-3 text-center">
            <div className="text-xs text-gray-500">Points</div>
            <div className="text-base font-semibold">{loyalty.points}</div>
          </div>
          <div className="rounded-xl border p-3 text-center">
            <div className="text-xs text-gray-500">Stamps</div>
            <div className="text-base font-semibold">
              {loyalty.stamps}/{LOYALTY.STAMP_TARGET}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Redeemable Rewards">
        <div className="space-y-2">
          {LOYALTY.REWARDS.map((r) => {
            const eligible = canApply(r);
            const selected = applied === r.id;
            return (
              <div
                key={r.id}
                className={`flex items-center justify-between rounded-xl border p-3 text-sm ${selected ? "ring-2 ring-red-500" : ""}`}
              >
                <div>
                  <div className="font-medium">{r.label}</div>
                  <div className="text-xs text-gray-600">{r.pointsCost} pts</div>
                </div>
                <div className="flex items-center gap-2">
                  {selected ? (
                    <button className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50" onClick={clear}>
                      Clear
                    </button>
                  ) : (
                    <button
                      className="rounded-full bg-red-600 text-white px-3 py-1 text-xs disabled:opacity-50"
                      onClick={() => apply(r.id)}
                      disabled={!eligible}
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Rewards don’t stack with promo codes. We’ll automatically apply whichever saves you more.
        </div>
      </Card>

      <Card title="Recent Loyalty Activity">
        {loyalty.history?.length ? (
          <div className="space-y-2 text-sm">
            {loyalty.history.slice(-10).reverse().map((h, i) => (
              <div key={i} className="rounded-lg border p-2 flex items-center justify-between">
                <span className="text-gray-700">{formatHistory(h)}</span>
                <span className={`text-xs ${h.points > 0 ? "text-green-700" : h.points < 0 ? "text-red-700" : "text-gray-500"}`}>
                  {h.points ? (h.points > 0 ? `+${h.points}` : h.points) : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">No activity yet.</div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={goCart} className="rounded-2xl border px-4 py-3 text-sm hover:bg-gray-50">
          ◀ Back to Cart
        </button>
        <button onClick={() => alert("Coming soon: share referral link for bonus points!")} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700">
          Invite & Earn
        </button>
      </div>
    </div>
  );
}

function formatHistory(h) {
  const d = new Date(h.ts || Date.now());
  const when = d.toLocaleDateString([], { month: "short", day: "numeric" });
  switch (h.type) {
    case "earn": return `${when} · Earned points on purchase (R${h.amount})`;
    case "redeem": return `${when} · Redeemed ${h.rewardId} (${h.label || ""})`;
    case "stamp": return `${when} · Visit stamp +1 (${h.stamps}/${LOYALTY.STAMP_TARGET})`;
    case "stamp_bonus": return `${when} · Stamp card complete — bonus points`;
    case "tier": return `${when} · Tier updated → ${h.tier}`;
    default: return `${when} · Activity`;
  }
}

/* ---------------- Public flow screens ---------------- */
function Welcome({ onNext, onAbout }) {
  return (
    <div className="space-y-3">
      <Card>
        <p className="text-sm text-gray-700">Book treatments, buy wellness products, and manage your journey — all in one app.</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={onAbout} className="rounded-2xl border px-4 py-3 text-sm hover:bg-gray-50">
          About
        </button>
        <button className="rounded-2xl border px-4 py-3 text-sm hover:bg-gray-50">Privacy</button>
      </div>

      <button onClick={onNext} className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700">
        Get Started
      </button>
    </div>
  );
}

function AboutServices({ setScreen, setDraft }) {
  const goBook = (serviceName) => {
    setDraft((prev) => ({ ...prev, services: [serviceName] }));
    setScreen("Treatment");
  };

  const CARDS = [
    {
      key: "massage",
      title: "Massage Therapy",
      img: imgMassage,
      desc: "Relieve muscle tension and restore balance with a calming full-body or focused massage.",
      cta: () => goBook("60 Min Therapy"),
    },
    {
      key: "cupping",
      title: "Cupping",
      img: imgCupping,
      desc: "Traditional suction therapy that may improve circulation and ease deep muscle soreness.",
      cta: () => goBook("40 Min Therapy"),
    },
    {
      key: "feet",
      title: "Just Feet",
      img: imgFeet,
      desc: "Targeted foot massage to reduce fatigue and leave you light on your feet.",
      cta: () => goBook("Just Feet Combo (Soak & Reflex) 60 Min"),
    },
    {
      key: "herbal",
      title: "Herbal Medicine",
      img: imgHerbal,
      desc: "Natural herbal remedies to complement treatments and support overall wellness.",
      cta: () => setScreen("Products and Cart"),
    },
    {
      key: "weight",
      title: "Weight Loss",
      img: imgScale,
      desc: "Support your wellness journey with tailored treatments and product guidance.",
      cta: () => setScreen("Products and Cart"),
    },
    {
      key: "qwasa",
      title: "Qwasa (Scrape Therapy)",
      img: imgQwasa,
      desc: "A traditional surface scraping technique intended to stimulate recovery.",
      cta: () => goBook("90 Min Therapy"),
    },
  ];

  return (
    <div className="space-y-4">
      <Card title="About Our Services">
        <p className="text-sm text-gray-700">Explore some of our most loved therapies. Tap a service to learn more or jump straight into booking.</p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CARDS.map((c) => (
          <div key={c.key} className="rounded-2xl shadow-sm border bg-white overflow-hidden">
            <div className="h-40 w-full overflow-hidden">
              <img src={c.img} alt={c.title} className="h-40 w-full object-cover" loading="lazy" />
            </div>
            <div className="p-4">
              <div className="text-sm font-semibold text-red-800">{c.title}</div>
              <p className="mt-1 text-sm text-gray-600">{c.desc}</p>
              <div className="mt-3 flex gap-2">
                <button className="rounded-2xl bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700" onClick={c.cta}>
                  Book this
                </button>
                <button
                  className="rounded-2xl border px-3 py-2 text-xs hover:bg-gray-50"
                  onClick={() => alert("More details coming soon in the full app.")}
                >
                  Learn more
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button className="rounded-2xl border px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setScreen("Welcome")}>
          ◀ Back
        </button>
        <button className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700" onClick={() => setScreen("Booking Calendar")}>
          Start a Booking ▶
        </button>
      </div>
    </div>
  );
}

function Login({ onNext, onSkip }) {
  return (
    <div className="space-y-4">
      <Card title="Login">
        <div className="space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="pwd">Password</Label>
            <Input id="pwd" type="password" placeholder="••••••••" autoComplete="current-password" />
          </div>
          <div className="flex items-center justify-between text-xs">
            <a className="text-red-600 hover:underline" href="#">
              Forgot password?
            </a>
            <button onClick={onSkip} className="text-gray-500 hover:underline">
              Skip for demo
            </button>
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <button className="rounded-2xl border px-4 py-3 text-sm hover:bg-gray-50" onClick={onNext}>
          Create account
        </button>
        <button className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700">Login</button>
      </div>
    </div>
  );
}

function SignUp({ onNext }) {
  return (
    <div className="space-y-4">
      <Card title="Personal Details">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="fn">First Name</Label>
            <Input id="fn" placeholder="Aaliyah" />
          </div>
          <div>
            <Label htmlFor="ln">Last Name</Label>
            <Input id="ln" placeholder="Khan" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="addr">Address</Label>
            <Input id="addr" placeholder="123 Wellness Rd, Cape Town" />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select id="gender" defaultValue="Female">
              <option>Female</option>
              <option>Male</option>
              <option>Prefer not to say</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="age">Age</Label>
            <Input id="age" type="number" placeholder="32" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="kin">Next of Kin</Label>
            <Input id="kin" placeholder="Name & phone" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="work">Place of Work</Label>
            <Input id="work" placeholder="Company & work number" />
          </div>
        </div>
      </Card>
      <button onClick={onNext} className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700">
        Continue
      </button>
    </div>
  );
}

function HealthProfile({ onNext }) {
  return (
    <div className="space-y-4">
      <Card title="Health Profile">
        <div className="space-y-3">
          <div>
            <Label htmlFor="chronic">Chronic Illnesses</Label>
            <Input id="chronic" placeholder="e.g. Hypertension" />
          </div>
          <div>
            <Label htmlFor="cond">Current Conditions</Label>
            <Input id="cond" placeholder="e.g. Neck pain" />
          </div>
          <p className="text-xs text-gray-500">Your health information is confidential and used only to ensure safe, personalized treatments.</p>
        </div>
      </Card>
      <button onClick={onNext} className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700">
        Save & Continue
      </button>
    </div>
  );
}

/** Booking Calendar with Province → Branch + real selection, writes to shared draft */
function BookingCalendar({ onNext, draft, setDraft, bookings }) {
  const [province, setProvince] = useState(draft?.province ?? "Western Cape");
  const [branch, setBranch] = useState(() => {
    const p = draft?.province ?? "Western Cape";
    return draft?.branch ?? BRANCH_MAP[p][0];
  });

  const today = new Date();
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const timeSlots = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30"];

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  useEffect(() => {
    setBranch(BRANCH_MAP[province][0]);
  }, [province]);

  useEffect(() => {
    setDraft((prev) => ({ ...prev, province, branch }));
  }, [province, branch, setDraft]);

  const toLocalDateFromParts = (dateObj, hhmm) => {
    const [hh, mm] = hhmm.split(":").map(Number);
    return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), hh, mm, 0, 0);
  };

  const keyFor = (dateObj, hhmm, branchName) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}|${hhmm}|${branchName}`;
  };

  const taken = new Set(
    bookings
      .filter((b) => (b.branch ?? b.Branch) === branch)
      .map((b) => {
        const start = new Date(b.startUtc ?? b.StartUtc);
        const hh = String(start.getHours()).padStart(2, "0");
        const mm = String(start.getMinutes()).padStart(2, "0");
        return keyFor(start, `${hh}:${mm}`, b.branch ?? b.Branch);
      })
  );

  const canContinue = selectedDate && selectedTime;

  const isToday = (d) => {
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const slotIsPast = (dateObj, hhmm) => {
    if (!isToday(dateObj)) return false;
    const [H, M] = hhmm.split(":").map(Number);
    const now = new Date();
    if (dateObj < new Date(now.getFullYear(), now.getMonth(), now.getDate())) return true;
    const slot = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), H, M, 0, 0);
    return slot.getTime() <= now.getTime();
  };

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) {
      alert("Please select a date and time.");
      return;
    }
    const localStart = toLocalDateFromParts(selectedDate, selectedTime);
    const localEnd = new Date(localStart.getTime() + 60 * 60 * 1000);

    setDraft((prev) => ({
      ...prev,
      province,
      branch,
      startUtc: localStart.toISOString(),
      endUtc: localEnd.toISOString(),
    }));
    onNext();
  };

  return (
    <div className="space-y-4">
      <Card title="Select Branch">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="prov">Province</Label>
            <Select id="prov" value={province} onChange={(e) => setProvince(e.target.value)}>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="branch">Branch</Label>
            <Select id="branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
              {BRANCH_MAP[province].map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          You’re booking at: <span className="font-medium">{branch}</span> ({province})
        </p>
      </Card>

      <Card title="Select Date">
        <div className="grid grid-cols-7 gap-2 text-center text-sm">
          {days.map((d, i) => {
            const isSelected = selectedDate && d.toDateString() === selectedDate.toDateString();
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(d)}
                className={`rounded-lg border py-2 hover:bg-gray-50 ${isSelected ? "ring-2 ring-red-500" : ""}`}
                aria-pressed={isSelected}
                title={d.toLocaleDateString()}
              >
                <div className="text-[11px] text-gray-500">{d.toLocaleDateString([], { weekday: "short" })}</div>
                <div className="text-base font-medium">{d.getDate()}</div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Select Time">
        <div className="flex flex-wrap gap-2">
          {timeSlots.map((t) => {
            const isSelected = selectedTime === t;
            const disabled =
              (selectedDate && taken.has(keyFor(selectedDate, t, branch))) ||
              (selectedDate && slotIsPast(selectedDate, t));
            return (
              <button
                key={t}
                disabled={!!disabled}
                onClick={() => setSelectedTime(t)}
                className={`rounded-full border px-3 py-1 text-xs hover:bg-gray-50 ${isSelected ? "ring-2 ring-red-500" : ""} ${
                  disabled ? "bg-red-100 text-red-300 cursor-not-allowed" : ""
                }`}
                title={disabled ? "Unavailable" : `Choose ${t}`}
              >
                {t}
              </button>
            );
          })}
        </div>
        {selectedDate && (
          <p className="mt-2 text-xs text-gray-500">
            Selected: {selectedDate.toLocaleDateString()} at {selectedTime ?? "—"}
          </p>
        )}
      </Card>

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  );
}

function Therapist({ onNext, draft, setDraft }) {
  const choose = (name) => {
    setDraft((prev) => ({ ...prev, therapistName: name }));
  };
  const options = [{ name: "Shamsa", featured: true }, { name: "Thembi" }, { name: "Xyu" }, { name: "Laila" }];

  return (
    <div className="space-y-4">
      <Card title="Choose Therapist">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {options.map((t) => {
            const selected = draft?.therapistName === t.name;
            return (
              <button
                key={t.name}
                onClick={() => choose(t.name)}
                className={`rounded-2xl border p-3 text-left hover:bg-gray-50 ${t.featured ? "border-red-400" : ""} ${
                  selected ? "ring-2 ring-red-500" : ""
                }`}
                aria-pressed={selected}
              >
                <div className="font-medium">{t.name}</div>
                {t.featured && <div className="text-[10px] text-red-600">Featured</div>}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="genderPref">Gender Preference</Label>
            <Select id="genderPref" defaultValue="Female">
              <option>Female</option>
              <option>Male</option>
              <option>No preference</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="roomPref">Room Preference</Label>
            <Select id="roomPref" defaultValue="Any">
              <option>Any</option>
              <option>Quiet</option>
              <option>Warm</option>
            </Select>
          </div>
        </div>
      </Card>
      <button onClick={onNext} className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700">
        Continue
      </button>
    </div>
  );
}

/** Treatment uses real price list and shows prices */
function Treatment({ onNext, draft, setDraft }) {
  const choose = (name) => setDraft((prev) => ({ ...prev, services: [name] }));

  const getQty = (name) => draft.products?.find((p) => p.name === name)?.qty ?? 0;
  const setQty = (name, qty) => {
    setDraft((prev) => {
      const cur = prev.products ?? [];
      const nextQty = Math.max(0, qty | 0);
      const exists = cur.find((p) => p.name === name);
      let products;
      if (exists) {
        products = nextQty === 0 ? cur.filter((p) => p.name !== name) : cur.map((p) => (p.name === name ? { ...p, qty: nextQty } : p));
      } else {
        products = nextQty === 0 ? cur : [...cur, { name, qty: nextQty }];
      }
      return { ...prev, products };
    });
  };

  const selectedService = draft?.services?.[0] ?? "60 Min Therapy";
  const servicePrice = PRICE_MAP[selectedService] ?? 0;
  const productSubtotal = (draft.products ?? []).reduce((s, p) => s + (PRODUCT_PRICE[p.name] ?? 0) * p.qty, 0);

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <Card title="Select Treatment">
          <div className="space-y-2">
            {TREATMENTS.map((t) => {
              const selected = draft?.services?.[0] === t.name;
              return (
                <div
                  key={t.name}
                  className={`flex items-center justify-between rounded-xl border p-3 ${selected ? "ring-2 ring-red-500" : ""}`}
                >
                  <div className="text-sm">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-gray-500">R{t.price}</div>
                  </div>
                  <button onClick={() => choose(t.name)} className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50" aria-label={`Choose ${t.name}`}>
                    {selected ? "Selected" : "Choose"}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        <Card
          title="Products"
          footer={
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Products subtotal</span>
              <span className="font-semibold">R{productSubtotal}</span>
            </div>
          }
        >
          <div className="space-y-2">
            {PRODUCT_CATALOG.map((p) => {
              const qty = getQty(p.name);
              return (
                <div key={p.name} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">R{p.price} each</div>
                  </div>
                  <div className="flex items-center gap-2" aria-label={`${p.name} quantity`}>
                    <button
                      className="rounded-full border px-2 py-1 text-xs hover:bg-gray-50"
                      onClick={() => setQty(p.name, qty - 1)}
                      aria-label={`Decrease ${p.name}`}
                    >
                      −
                    </button>
                    <div className="w-8 text-center" aria-live="polite">{qty}</div>
                    <button
                      className="rounded-full border px-2 py-1 text-xs hover:bg-gray-50"
                      onClick={() => setQty(p.name, qty + 1)}
                      aria-label={`Increase ${p.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-lg border p-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Selected treatment</span>
              <span className="font-medium">
                {selectedService} · R{servicePrice}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <button onClick={onNext} className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700">
        Continue
      </button>
    </div>
  );
}

function TailorExperience({ onNext, draft, setDraft }) {
  const selectFragrance = (x) => setDraft((p) => ({ ...p, oilFragrance: x }));
  const selectIntensity = (x) => setDraft((p) => ({ ...p, massageIntensity: x }));
  const setNotes = (e) => setDraft((p) => ({ ...p, specialInstructions: e.target.value }));

  return (
    <div className="space-y-4">
      <Card title="Oil Fragrance">
        <div className="grid grid-cols-2 gap-3">
          {FRAGRANCES.map((x) => {
            const selected = draft?.oilFragrance === x;
            return (
              <button
                key={x}
                onClick={() => selectFragrance(x)}
                className={`rounded-2xl border p-3 text-sm hover:bg-gray-50 ${selected ? "ring-2 ring-red-500" : ""}`}
                aria-pressed={selected}
              >
                {x}
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Selected: <span className="font-medium">{draft?.oilFragrance ?? "—"}</span>
        </div>
      </Card>

      <Card title="Massage Intensity">
        <div className="flex gap-2">
          {INTENSITIES.map((x) => {
            const selected = draft?.massageIntensity === x;
            return (
              <button
                key={x}
                onClick={() => selectIntensity(x)}
                className={`rounded-full border px-3 py-1 text-xs hover:bg-gray-50 ${selected ? "ring-2 ring-red-500" : ""}`}
                aria-pressed={selected}
              >
                {x}
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Selected: <span className="font-medium">{draft?.massageIntensity ?? "—"}</span>
        </div>
      </Card>

      <Card title="Special Instructions">
        <textarea
          className="w-full rounded-xl border p-3 text-sm"
          rows={3}
          placeholder="Any allergies, areas to avoid, etc."
          value={draft?.specialInstructions ?? ""}
          onChange={setNotes}
          aria-label="Special instructions"
        />
        <div className="mt-2 text-xs text-gray-500">
          {draft?.specialInstructions?.length ? `${draft.specialInstructions.length} characters` : "No notes yet"}
        </div>
      </Card>

      <button
        onClick={onNext}
        className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700"
      >
        View Promotions
      </button>
    </div>
  );
}

/* ---------------- Promotions Screen ---------------- */
function PromotionsScreen({ draft, setDraft, setScreen }) {
  const cart = computeCart(draft);

  const applyAndGo = (code) => {
    setDraft((p) => ({ ...p, promoCode: code }));
    setScreen("Products and Cart");
  };

  const eligibility = (code) => {
    const test = evaluatePromo({ ...draft, promoCode: code });
    return test?.amount ? `Likely saves R${test.amount}` : "Not yet eligible";
  };

  return (
    <div className="space-y-4">
      <Card title="Promotions">
        <p className="text-sm text-gray-700">
          Choose a promo below. You can apply a single code at a time and change it later in Cart or Checkout.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        {PROMO_DEFS.map((p) => (
          <div key={p.code} className="rounded-2xl border shadow-sm bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-red-800">{p.title}</div>
                <div className="text-xs text-gray-600 mt-0.5">{p.detail}</div>
                <div className="text-[11px] text-gray-500 mt-1">{p.how}</div>
                <div className="inline-flex mt-2 items-center gap-2 text-xs">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono">{p.code}</span>
                  <span className={`px-2 py-0.5 rounded-full ${evaluatePromo({ ...draft, promoCode: p.code })?.amount ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {eligibility(p.code)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  className="rounded-2xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  onClick={() => applyAndGo(p.code)}
                >
                  Apply
                </button>
                {draft?.promoCode === p.code && <span className="text-[11px] text-green-700">Currently selected</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Card title="Your Cart Snapshot">
        <div className="text-sm space-y-1">
          <div className="flex justify-between"><span>Treatment</span><span>R{cart.servicePrice}</span></div>
          <div className="flex justify-between text-xs text-gray-600"><span>Products</span><span>R{cart.productsSubtotal}</span></div>
          {draft?.promoCode ? (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Promo ({draft.promoCode})</span>
                <span className="text-red-600">−R{evaluatePromo(draft)?.amount || 0}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total after promo</span>
                <span>R{Math.max(0, cart.preDiscountTotal - (evaluatePromo(draft)?.amount || 0))}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total</span>
              <span>R{cart.preDiscountTotal}</span>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setScreen("Products and Cart")} className="rounded-2xl border px-4 py-3 text-sm hover:bg-gray-50">
          ◀ Back to Cart
        </button>
        <button onClick={() => setScreen("Loyalty & Rewards")} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700">
          View Loyalty ▶
        </button>
      </div>
    </div>
  );
}

// --- Products & Cart ---
function ProductsCart({ onNext, draft, setDraft, loyalty }) {
  const cart = computeCart(draft);
  const chosen = chooseBestDiscount(draft, loyalty);
  const discount = chosen.amount || 0;
  const grand = Math.max(0, cart.preDiscountTotal - discount);

  const [promoInput, setPromoInput] = useState(draft?.promoCode ?? "");
  useEffect(() => setPromoInput(draft?.promoCode ?? ""), [draft?.promoCode]);

  const applyPromo = () => setDraft((p) => ({ ...p, promoCode: (promoInput || "").trim().toUpperCase() }));
  const clearPromo = () => setDraft((p) => ({ ...p, promoCode: "" }));

  const applyReward = (id) => setDraft((p) => ({ ...p, loyaltyRewardId: id }));
  const clearReward = () => setDraft((p) => ({ ...p, loyaltyRewardId: "" }));

  const pref = {
    fragrance: draft?.oilFragrance ?? "—",
    intensity: draft?.massageIntensity ?? "—",
    notes: draft?.specialInstructions ?? "",
  };

  return (
    <div className="space-y-4">
      <Card title="Location">
        <div className="text-sm">
          <div>
            <span className="text-gray-500">Province:</span> <span className="font-medium">{draft?.province ?? "—"}</span>
          </div>
          <div>
            <span className="text-gray-500">Branch:</span> <span className="font-medium">{draft?.branch ?? "—"}</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {draft?.startUtc ? `When: ${new Date(draft.startUtc).toLocaleString()}` : "Date and time will be chosen on the previous step."}
          </div>
        </div>
      </Card>

      <Card title="Experience Preferences">
        <div className="text-sm space-y-1">
          <div>
            <span className="text-gray-500">Oil Fragrance:</span> <span className="font-medium">{pref.fragrance}</span>
          </div>
          <div>
            <span className="text-gray-500">Massage Intensity:</span> <span className="font-medium">{pref.intensity}</span>
          </div>
          <div>
            <div className="text-gray-500">Special Instructions:</div>
            <div className="rounded-lg border bg-white px-3 py-2 text-xs mt-1 min-h-[40px]">
              {pref.notes?.trim() ? pref.notes : <span className="text-gray-400">No special instructions.</span>}
            </div>
          </div>
        </div>
      </Card>

      {/* Promotion */}
      <Card title="Promotion">
        <div className="flex gap-2">
          <Input
            placeholder="Enter code (e.g. WELLNESS10)"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value)}
            aria-label="Promo code"
          />
          <button className="rounded-2xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700" onClick={applyPromo}>
            Apply
          </button>
          {draft?.promoCode && (
            <button className="rounded-2xl border px-3 py-2 text-sm hover:bg-gray-50" onClick={clearPromo} title="Remove promotion">
              Clear
            </button>
          )}
        </div>
        {!!draft?.promoCode && (
          <div className="mt-2 text-xs text-gray-600">
            {evaluatePromo(draft)?.amount ? `Applied ${draft.promoCode} — ${evaluatePromo(draft)?.why}` : "Code valid, but not eligible with the current cart."}
          </div>
        )}
      </Card>

      {/* Loyalty */}
      <Card title="Loyalty">
        <div className="text-xs text-gray-600 mb-2">
          Points: <span className="font-semibold">{loyalty.points}</span> · Stamps:{" "}
          <span className="font-semibold">{loyalty.stamps}/{LOYALTY.STAMP_TARGET}</span> · Tier:{" "}
          <span className="font-semibold">{loyalty.tier}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {LOYALTY.REWARDS.map((r) => {
            const selected = draft?.loyaltyRewardId === r.id;
            const eligible = loyalty.points >= r.pointsCost && (r.eligible?.(cart, draft) ?? true);
            return (
              <button
                key={r.id}
                className={`rounded-full border px-3 py-1 text-xs ${selected ? "ring-2 ring-red-500" : ""} ${!eligible ? "opacity-50" : ""}`}
                onClick={() => (selected ? clearReward() : applyReward(r.id))}
                disabled={!eligible && !selected}
                title={`${r.label} — ${r.pointsCost} pts`}
              >
                {selected ? "✓ " : ""}{r.label}
              </button>
            );
          })}
          {!!draft?.loyaltyRewardId && (
            <button className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50" onClick={clearReward}>
              Clear
            </button>
          )}
        </div>
        <div className="mt-2 text-[11px] text-gray-500">
          Rewards don’t stack with promotions. We’ll apply the better one automatically.
        </div>
      </Card>

      <Card title="Cart">
        <div className="text-xs text-gray-500 mb-2">
          You’re booking at <span className="font-medium">{draft?.branch ?? "—"}</span> ({draft?.province ?? "—"}).
        </div>
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span>{cart.service}</span>
            <span>R{cart.servicePrice}</span>
          </div>

          {cart.productLines.length ? (
            <>
              <div className="pt-2 text-xs uppercase tracking-wide text-gray-500">Products</div>
              {cart.productLines.map((p) => (
                <div key={p.name} className="flex justify-between">
                  <span>
                    {p.name} × {p.qty}
                  </span>
                  <span>R{p.lineTotal}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs text-gray-600">
                <span>Products subtotal</span>
                <span>R{cart.productsSubtotal}</span>
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-500">No products added. (You can add on the Treatment page.)</div>
          )}

          {discount > 0 && (
            <div className="flex justify-between text-xs text-green-700">
              <span>
                {chosen.type === "promo"
                  ? `Promotion (${chosen.detail?.code})`
                  : `Loyalty Reward (${chosen.detail?.id})`}
              </span>
              <span>−R{discount}</span>
            </div>
          )}
          {chosen.type !== "none" && chosen.other && (chosen.other.amount || 0) > 0 && (
            <div className="text-[11px] text-gray-500">
              Note: {chosen.type === "promo" ? "Loyalty reward" : "Promo"} also eligible, but we’ve applied the better one.
            </div>
          )}

          <div className="pt-2 border-t flex justify-between font-semibold">
            <span>{discount > 0 ? "Total after discount" : "Total"}</span>
            <span>R{grand}</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onNext()} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700">
          Proceed to Checkout
        </button>
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="rounded-2xl border px-4 py-3 text-sm hover:bg-gray-50">
          ▲ Top
        </button>
      </div>
    </div>
  );
}

function Checkout({ onNext, draft, setDraft, setBookings, loyalty, setLoyalty }) {
  const cart = computeCart(draft);
  const chosen = chooseBestDiscount(draft, loyalty);
  const discount = chosen.amount || 0;
  const total = Math.max(0, cart.preDiscountTotal - discount);

  const [promoInput, setPromoInput] = useState(draft?.promoCode ?? "");
  useEffect(() => setPromoInput(draft?.promoCode ?? ""), [draft?.promoCode]);

  const applyPromo = () => setDraft((p) => ({ ...p, promoCode: (promoInput || "").trim().toUpperCase() }));
  const clearPromo = () => setDraft((p) => ({ ...p, promoCode: "" }));
  const clearReward = () => setDraft((p) => ({ ...p, loyaltyRewardId: "" }));

  const placeOrder = async () => {
    if (!draft.startUtc || !draft.endUtc) {
      alert("Please pick a date and time first.");
      return;
    }

    const booking = {
      id: `b-${Date.now()}`,
      branch: draft.branch,
      province: draft.province,
      services: draft.services ?? ["60 Min Therapy"],
      startUtc: draft.startUtc,
      endUtc: draft.endUtc,
      therapistName: draft.therapistName ?? "Therapist",
      customerId: "c-555",
      customerName: "Aaliyah Khan",
      customerEmail: "ebrahimsolomon30@outlook.com",
      customerMobile: "+27 71 449 6082",
      total: total,
      oilFragrance: draft.oilFragrance ?? null,
      massageIntensity: draft.massageIntensity ?? null,
      specialInstructions: draft.specialInstructions ?? "",
      products: draft.products ?? [],
      promoCode: chosen.type === "promo" ? (draft.promoCode || null) : null,
      promoSavings: chosen.type === "promo" ? discount : 0,
      loyaltyRewardId: chosen.type === "reward" ? (draft.loyaltyRewardId || null) : null,
      loyaltySavings: chosen.type === "reward" ? discount : 0,
    };

    // ----- LOYALTY ACCOUNTING -----
    setLoyalty((prev) => {
      const now = Date.now();
      const currentTier = tierFor(prev.earnedTotal);
      const earnedPts = pointsFromSpend(total, currentTier);

      // stamps: +1 per therapy booking (any service counts)
      let newStamps = (prev.stamps ?? 0) + 1;
      let bonus = 0;
      const history = [...(prev.history ?? [])];

      history.push({ ts: now, type: "stamp", stamps: newStamps, points: 0 });

      if (newStamps >= LOYALTY.STAMP_TARGET) {
        newStamps = 0;
        bonus = LOYALTY.STAMP_BONUS_POINTS;
        history.push({ ts: now, type: "stamp_bonus", points: bonus });
      }

      // redemption: deduct points if reward chosen & used
      const rewardUsed = chosen.type === "reward" && draft.loyaltyRewardId;
      const rewardMeta = rewardUsed ? LOYALTY.REWARDS.find((r) => r.id === draft.loyaltyRewardId) : null;

      const afterRedeem = rewardUsed ? (prev.points - (rewardMeta?.pointsCost ?? 0)) : prev.points;
      if (rewardUsed) {
        history.push({
          ts: now,
          type: "redeem",
          rewardId: rewardMeta.id,
          label: rewardMeta.label,
          points: -(rewardMeta.pointsCost),
        });
      }

      // earn from spend (post-discount total) + any stamp bonus
      const newPoints = Math.max(0, afterRedeem) + earnedPts + bonus;
      const newEarnedTotal = (prev.earnedTotal ?? 0) + earnedPts + bonus;
      const newTier = tierFor(newEarnedTotal);

      history.push({ ts: now, type: "earn", amount: total, points: earnedPts });
      if (newTier.name !== prev.tier) {
        history.push({ ts: now, type: "tier", tier: newTier.name, points: 0 });
      }

      return {
        ...prev,
        points: newPoints,
        earnedTotal: newEarnedTotal,
        stamps: newStamps,
        tier: newTier.name,
        history,
      };
    });

    // clear reward if it was used (so it doesn’t “stick”)
    if (chosen.type === "reward") clearReward();

    setBookings((prev) => [...prev, booking]);
    onNext();
  };

  return (
    <div className="space-y-4">
      <Card title="Payment">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="ch">Cardholder Name</Label>
              <Input id="ch" placeholder="A Khan" autoComplete="cc-name" />
            </div>
            <div>
              <Label htmlFor="cc">Card Number</Label>
              <Input id="cc" placeholder="4111 1111 1111 1111" autoComplete="cc-number" inputMode="numeric" />
            </div>
            <div>
              <Label htmlFor="cvv">CVV</Label>
              <Input id="cvv" placeholder="123" autoComplete="cc-csc" inputMode="numeric" />
            </div>
            <div>
              <Label htmlFor="exp">Expiry</Label>
              <Input id="exp" placeholder="08/27" autoComplete="cc-exp" />
            </div>

            {/* Promo apply */}
            <div>
              <Label htmlFor="promo">Promo Code</Label>
              <div className="flex items-center gap-2">
                <Input id="promo" placeholder="e.g. WELLNESS10" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} />
                <button className="rounded-2xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700" onClick={applyPromo}>
                  Apply
                </button>
                {!!draft?.promoCode && (
                  <button className="rounded-2xl border px-3 py-2 text-sm hover:bg-gray-50" onClick={clearPromo}>
                    Clear
                  </button>
                )}
              </div>
              {!!draft?.promoCode && (
                <div className={`mt-1 text-xs ${evaluatePromo(draft)?.amount ? "text-green-700" : "text-gray-600"}`}>
                  {evaluatePromo(draft)?.amount ? `Applied ${draft.promoCode}: ${evaluatePromo(draft)?.why}` : "Code valid, but not eligible with the current cart."}
                </div>
              )}
            </div>

            {/* Loyalty note */}
            {draft?.loyaltyRewardId ? (
              <div className="col-span-2">
                <Label>Loyalty Reward</Label>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full border px-2 py-1">{draft.loyaltyRewardId}</span>
                  <span className="text-gray-600">We’ll use the better of promo vs reward automatically.</span>
                  <button className="ml-auto rounded-full border px-2 py-1 hover:bg-gray-50" onClick={() => setDraft((p) => ({ ...p, loyaltyRewardId: "" }))}>
                    Clear
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <input id="policy" type="checkbox" aria-describedby="policy-note" />
            <span id="policy-note">I accept the cancellation policy (fee applies for no-shows).</span>
          </div>
        </div>
      </Card>

      {/* Order summary snippet */}
      <Card title="Order Summary">
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span>{cart.service}</span>
            <span>R{cart.servicePrice}</span>
          </div>
          {cart.productLines.length ? (
            <>
              {cart.productLines.map((p) => (
                <div key={p.name} className="flex justify-between text-xs text-gray-600">
                  <span>{p.name} × {p.qty}</span>
                  <span>R{p.lineTotal}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs text-gray-600">
                <span>Products subtotal</span>
                <span>R{cart.productsSubtotal}</span>
              </div>
            </>
          ) : null}

          {discount > 0 && (
            <div className="flex justify-between text-xs text-green-700">
              <span>
                {chosen.type === "promo"
                  ? `Promotion (${chosen.detail?.code})`
                  : `Loyalty Reward (${chosen.detail?.id})`}
              </span>
              <span>−R{discount}</span>
            </div>
          )}
          {chosen.type !== "none" && chosen.other && (chosen.other.amount || 0) > 0 && (
            <div className="text-[11px] text-gray-500">
              Note: {chosen.type === "promo" ? "Loyalty reward" : "Promo"} also eligible, but we’ve applied the better one.
            </div>
          )}

          <div className="pt-2 border-t flex justify-between font-semibold">
            <span>Total {discount > 0 ? "after discount" : ""}</span>
            <span>R{total}</span>
          </div>

          {/* Earn preview */}
          <div className="text-[11px] text-gray-500">
            You’ll earn approximately <span className="font-medium">{pointsFromSpend(total, tierFor(loyalty.earnedTotal))}</span> pts for this purchase (tier multiplier applied).
          </div>
        </div>
      </Card>

      <button onClick={placeOrder} className="w-full rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700">
        Pay R{total} Securely
      </button>
    </div>
  );
}

function Confirmation({ onNext }) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="text-center space-y-2">
          <div className="text-3xl" aria-hidden="true">🎉</div>
          <div className="text-sm">Payment successful</div>
          <div className="text-xs text-gray-500">Booking ref: AHC-0821-1452</div>
        </div>
      </Card>
      <Card title="What happens next?">
        <ul className="list-disc pl-5 text-sm space-y-1">
          <li>We’ve emailed your confirmation and calendar invite.</li>
          <li>Automated reminder will be sent 24h before.</li>
          <li>Need to change? Manage from the Bookings screen.</li>
        </ul>
      </Card>
      <button onClick={onNext} className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700">
        Leave Feedback
      </button>
      <button onClick={() => (window.scrollTo({ top: 0 }), (typeof setScreen === 'function' ? setScreen("My Bookings") : null))} className="w-full mt-2 rounded-2xl border px-4 py-3 text-sm hover:bg-gray-50">
        Manage My Bookings
      </button>
    </div>
  );
}

function Feedback({ onNext }) {
  return (
    <div className="space-y-4">
      <Card title="Rate Your Experience">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {["Facilities", "Reception", "Therapist", "Massage"].map((x) => (
            <div key={x} className="rounded-xl border p-3">
              <div className="mb-1">{x}</div>
              <div className="flex gap-1 text-lg select-none" role="radiogroup" aria-label={`${x} rating`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <button key={i} aria-label={`${x} ${i + 1} stars`}>★</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Feedback Type">
        <div className="flex flex-wrap gap-2 text-xs" role="group" aria-label="Feedback type">
          {["Compliment", "Complaint", "Suggestion", "Enquiry"].map((x) => (
            <button key={x} className="rounded-full border px-3 py-1 hover:bg-gray-50">
              {x}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Label htmlFor="fb">Comments</Label>
          <textarea id="fb" className="w-full rounded-xl border p-3 text-sm" rows={3} placeholder="Tell us more..." />
        </div>
      </Card>
      <button onClick={onNext} className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700">
        Submit Feedback
      </button>
    </div>
  );
}

function MyBookings({ bookings = [], setBookings, setScreen }) {
  const now = Date.now();

  const mine = (bookings ?? []).filter(
    (b) => (b.customerId ?? "") === "c-555" // demo: current mock user
  );

  const sorted = mine
    .slice()
    .sort((a, b) => new Date(a.startUtc ?? a.StartUtc) - new Date(b.startUtc ?? b.StartUtc));

  const cancelable = (b) => {
    const start = new Date(b.startUtc ?? b.StartUtc).getTime();
    return (b.status ?? "confirmed") !== "cancelled" && start > now;
  };

  const fmtDate = (iso) => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

  const doCancel = (id) => {
    const b = sorted.find((x) => x.id === id);
    if (!b) return;
    const ok = confirm(
      `Cancel this booking?\n\n${fmtDate(b.startUtc ?? b.StartUtc)} · ${(b.services ?? []).join(", ") || "Service"}\n\nThis will free the slot.`
    );
    if (!ok) return;

    setBookings((prev) =>
      (prev ?? []).map((x) =>
        x.id === id ? { ...x, status: "cancelled", cancelledAt: new Date().toISOString() } : x
      )
    );
    alert("Booking cancelled.");
  };

  return (
    <div className="space-y-4">
      <Card title="My Bookings">
        {!sorted.length ? (
          <div className="text-sm text-gray-500">You have no bookings yet.</div>
        ) : (
          <div className="space-y-2">
            {sorted.map((b) => {
              const start = new Date(b.startUtc ?? b.StartUtc);
              const end = new Date(b.endUtc ?? b.EndUtc ?? start.getTime() + 60 * 60 * 1000);
              const isCancelled = (b.status ?? "confirmed") === "cancelled";
              const services = (b.services ?? []).join(", ") || "Service";

              return (
                <div key={b.id} className={`rounded-xl border p-3 text-sm ${isCancelled ? "opacity-70" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} ·{" "}
                      {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–{end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {b.branch ?? b.Branch} · {b.province ?? b.Province}
                    </div>
                  </div>
                  <div className="mt-1">{services}</div>
                  <div className="text-xs text-gray-600">Therapist: <span className="font-medium">{b.therapistName ?? b.TherapistName}</span></div>
                  {b.total != null && <div className="text-xs text-gray-600">Total: <span className="font-medium">R{b.total}</span></div>}
                  <div className="mt-2 flex items-center gap-2">
                    {isCancelled ? (
                      <span className="rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-xs">Cancelled</span>
                    ) : (
                      <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs">Confirmed</span>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        className="rounded-2xl border px-3 py-1 text-xs hover:bg-gray-50"
                        onClick={() => setScreen?.("Booking Calendar")}
                        title="Reschedule by picking a new slot"
                      >
                        Reschedule
                      </button>
                      <button
                        className="rounded-2xl bg-red-600 text-white px-3 py-1 text-xs disabled:opacity-50"
                        onClick={() => doCancel(b.id)}
                        disabled={!cancelable(b)}
                        title={cancelable(b) ? "Cancel this booking" : "Not cancelable (past or already cancelled)"}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  {isCancelled && b.cancelledAt && (
                    <div className="mt-1 text-[11px] text-gray-500">Cancelled {new Date(b.cancelledAt).toLocaleString()}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <button className="rounded-2xl border px-4 py-3 text-sm hover:bg-gray-50" onClick={() => setScreen?.("Booking Calendar")}>
          ◀ New Booking
        </button>
        <button className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700" onClick={() => setScreen?.("Products and Cart")}>
          Go to Cart
        </button>
      </div>
    </div>
  );
}

// ---------- Admin - Analytics ----------
function Analytics({ bookings = [] }) {
  const money = (rands) => `R ${Number(rands || 0).toLocaleString("en-ZA")}`;
  const getStart = (b) => new Date(b.startUtc ?? b.StartUtc);
  const getServices = (b) => b.serviceNames ?? b.ServiceNames ?? b.Services ?? b.services ?? [];
  const getTherapist = (b) => b.therapistName ?? b.TherapistName ?? "Unknown";

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  const now = new Date();
  const defaultTo = endOfDay(now);
  const defaultFrom = startOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const applyPreset = (type) => {
    const n = new Date();
    if (type === "today") {
      setFrom(startOfDay(n));
      setTo(endOfDay(n));
    } else if (type === "7") {
      setFrom(startOfDay(new Date(n.getTime() - 6 * 24 * 60 * 60 * 1000)));
      setTo(endOfDay(n));
    } else if (type === "30") {
      setFrom(startOfDay(new Date(n.getTime() - 29 * 24 * 60 * 60 * 1000)));
      setTo(endOfDay(n));
    } else if (type === "month") {
      setFrom(new Date(n.getFullYear(), n.getMonth(), 1, 0, 0, 0, 0));
      setTo(endOfDay(new Date(n.getFullYear(), n.getMonth() + 1, 0)));
    } else if (type === "clear") {
      const allDates = (bookings ?? []).map(getStart).filter((d) => !isNaN(d));
      if (allDates.length) {
        setFrom(startOfDay(new Date(Math.min(...allDates))));
        setTo(endOfDay(new Date(Math.max(...allDates))));
      } else {
        setFrom(defaultFrom);
        setTo(defaultTo);
      }
    }
  };

  const onChangeFrom = (e) => {
    const val = e.target.value;
    if (!val) return;
    const d = new Date(val + "T00:00:00");
    const s = startOfDay(d);
    setFrom(s);
    if (to < s) setTo(endOfDay(d));
  };

  const onChangeTo = (e) => {
    const val = e.target.value;
    if (!val) return;
    const d = new Date(val + "T00:00:00");
    const eod = endOfDay(d);
    setTo(eod);
    if (eod < from) setFrom(startOfDay(d));
  };

  const toInputVal = (d) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "");

  const inRange = (date) => {
    const t = date.getTime();
    return t >= from.getTime() && t <= to.getTime();
  };
  const filtered = (bookings ?? []).filter((b) => {
    const d = getStart(b);
    return !isNaN(d) && inRange(d);
  });

  const totalBookings = filtered.length;
  const sales = filtered.reduce((sum, b) => {
    if (typeof b.total === "number") return sum + b.total;
    const servicesSum = getServices(b).reduce((s, name) => s + (PRICE_MAP[name] ?? 0), 0);
    return sum + servicesSum;
  }, 0);

  const byService = {};
  filtered.forEach((b) => getServices(b).forEach((s) => (byService[s] = (byService[s] ?? 0) + 1)));
  const topTherapy = Object.entries(byService).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const byTherapist = {};
  filtered.forEach((b) => {
    const t = getTherapist(b);
    byTherapist[t] = (byTherapist[t] ?? 0) + 1;
  });
  const topTherapist = Object.entries(byTherapist).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const singleDay =
    from.toDateString() === to.toDateString()
      ? from.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric", weekday: "short" })
      : null;

  return (
    <div className="space-y-4">
      <Card
        title="Admin — Analytics Overview"
        footer={<div className="text-xs text-gray-500">{`Loaded ${bookings.length} bookings (in-memory)`}</div>}
      >
        <div className="mb-3 rounded-xl border p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <CalendarIcon />
              Date range
            </span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="date"
                  aria-label="From date"
                  className="rounded-xl border p-2 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={toInputVal(from)}
                  onChange={onChangeFrom}
                />
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400 text-xs">
                  From
                </span>
              </div>
              <span className="text-gray-400">—</span>
              <div className="relative">
                <input
                  type="date"
                  aria-label="To date"
                  className="rounded-xl border p-2 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={toInputVal(to)}
                  onChange={onChangeTo}
                />
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400 text-xs">
                  To
                </span>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <PresetButton onClick={() => applyPreset("today")}>Today</PresetButton>
              <PresetButton onClick={() => applyPreset("7")}>Last 7d</PresetButton>
              <PresetButton onClick={() => applyPreset("30")}>Last 30d</PresetButton>
              <PresetButton onClick={() => applyPreset("month")}>This month</PresetButton>
              <button
                className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50"
                onClick={() => applyPreset("clear")}
                title="Use full data range"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-2 text-xs text-gray-500">
            {singleDay ? (
              <>Showing metrics for <span className="font-medium">{singleDay}</span>.</>
            ) : (
              <>
                Showing metrics from{" "}
                <span className="font-medium">{from.toLocaleDateString()}</span> to{" "}
                <span className="font-medium">{to.toLocaleDateString()}</span>.
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-500">{singleDay ? "Bookings (day)" : "Total Bookings (range)"}</div>
            <div className="text-2xl font-semibold">{totalBookings}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-500">{singleDay ? "Sales (day)" : "Sales (range)"}</div>
            <div className="text-2xl font-semibold">{money(sales)}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-500">Top Therapy</div>
            <div className="text-base font-semibold">{topTherapy}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-500">Top Therapist</div>
            <div className="text-base font-semibold">{topTherapist}</div>
          </div>
        </div>
      </Card>

      <Card title="Categorized Reviews">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-500">Compliments</div>
            <div className="text-xl font-semibold">62</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-500">Complaints</div>
            <div className="text-xl font-semibold">7</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-500">Suggestions</div>
            <div className="text-xl font-semibold">15</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-500">Enquiries</div>
            <div className="text-xl font-semibold">9</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PresetButton({ children, onClick }) {
  return (
    <button className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50" onClick={onClick}>
      {children}
    </button>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="text-red-600" fill="currentColor" aria-hidden="true">
      <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1zm12 6H5a1 1 0 0 0-1 1v9c0 .552.448 1 1 1h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1z" />
    </svg>
  );
}

/** Generic, lightweight modal */
function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      aria-modal="true"
      role="dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
      <div className="relative z-10 w-full sm:max-w-lg">
        <div className="mx-2 sm:mx-0 rounded-2xl bg-white shadow-2xl border">
          <div className="px-4 py-3 border-b bg-gray-50 rounded-t-2xl flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-wide text-red-800">{title}</h3>
            <button className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="p-4">{children}</div>
          {footer ? <div className="px-4 py-3 border-t bg-gray-50 rounded-b-2xl">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

/* ---------------------- Therapist Calendar (WEEK VIEW) ---------------------- */
/* Count-only cells; compact header so “Today” fits on mobile + KPI strip */
function TherapistCalendar({ bookings = [], defaultTherapist = "Shamsa" }) {
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });

  const [therapist, setTherapist] = useState(defaultTherapist || "All");
  const [branch, setBranch] = useState("All");
  const [myOnly, setMyOnly] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [modalDate, setModalDate] = useState(null);
  const [modalList, setModalList] = useState([]);

  const startOfWeekMon = (d) => {
    const day = d.getDay(); // Sun=0..Sat=6
    const diff = (day === 0 ? -6 : 1) - day;
    const s = new Date(d);
    s.setDate(d.getDate() + diff);
    s.setHours(0, 0, 0, 0);
    return s;
  };
  const endOfWeekSun = (d) => {
    const s = startOfWeekMon(d);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
  };
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtDateLong = (d) =>
    d?.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const ymd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const weekStart = startOfWeekMon(anchor);
  const weekEnd = endOfWeekSun(anchor);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const therapists = ["All", ...Array.from(new Set((bookings ?? []).map((b) => b.therapistName || b.TherapistName)))];
  const branches = ["All", ...Array.from(new Set((bookings ?? []).map((b) => b.branch || b.Branch)))];

  const inWeek = (iso) => {
    const t = new Date(iso).getTime();
    return t >= weekStart.getTime() && t <= weekEnd.getTime();
  };

  const filtered = (bookings ?? [])
    .filter((b) => !isNaN(new Date(b.startUtc ?? b.StartUtc)))
    .filter((b) => (b.status ?? "confirmed") !== "cancelled")
    .filter((b) => inWeek(b.startUtc ?? b.StartUtc))
    .filter((b) => (branch === "All" ? true : (b.branch ?? b.Branch) === branch))
    .filter((b) =>
      myOnly
        ? (b.therapistName ?? b.TherapistName) === (therapist === "All" ? defaultTherapist : therapist)
        : therapist === "All"
        ? true
        : (b.therapistName ?? b.TherapistName) === therapist
    )
    .sort((a, b) => new Date(a.startUtc ?? a.StartUtc) - new Date(b.startUtc ?? b.StartUtc));

  const byDay = {};
  filtered.forEach((b) => {
    const d = new Date(b.startUtc ?? b.StartUtc);
    (byDay[ymd(d)] ||= []).push(b);
  });

  const goWeek = (delta) => {
    const n = new Date(anchor);
    n.setDate(n.getDate() + delta * 7);
    setAnchor(n);
  };

  const openDayModal = (dayDate) => {
    const key = ymd(dayDate);
    const list = (byDay[key] || [])
      .slice()
      .sort((a, b) => new Date(a.startUtc ?? a.StartUtc) - new Date(b.startUtc ?? b.StartUtc));
    setModalDate(dayDate);
    setModalList(list);
    setOpenModal(true);
  };

  /* -------- Therapist KPI (for week-in-view + current filters) -------- */
  const money = (r) => `R ${Number(r || 0).toLocaleString("en-ZA")}`;

  const bookingsCount = filtered.length;

  const hoursBooked = filtered.reduce((sum, b) => {
    const s = new Date(b.startUtc ?? b.StartUtc);
    const e = new Date(b.endUtc ?? b.EndUtc);
    const hrs = !isNaN(s) && !isNaN(e) ? Math.max(0, (e - s) / 36e5) : 1; // default to 1h if missing/invalid
    return sum + (Number.isFinite(hrs) ? hrs : 1);
  }, 0);

  const sales = filtered.reduce((sum, b) => {
    if (typeof b.total === "number") return sum + b.total;
    const services = b.services ?? b.serviceNames ?? b.Services ?? [];
    const fallback = services.reduce((s, name) => s + (PRICE_MAP[name] ?? 0), 0);
    return sum + fallback;
  }, 0);

  const avgSale = bookingsCount ? sales / bookingsCount : 0;

  // Keep aligned with public BookingCalendar time slots (6 per day by default)
  const SLOTS_PER_DAY = 6;
  const capacity = SLOTS_PER_DAY * days.length; // weekly capacity for the scope being viewed
  const utilization = Math.round((bookingsCount / Math.max(1, capacity)) * 100);

  return (
    <div className="space-y-4">
      <Card
        title="Therapist — Calendar (Week View)"
        footer={
          <div className="text-xs text-gray-500 flex justify-between">
            <span>
              Showing{" "}
              <span className="font-medium">
                {weekStart.toLocaleDateString()} – {weekEnd.toLocaleDateString()}
              </span>
            </span>
            <span>{`${filtered.length} appointment(s)`}</span>
          </div>
        }
      >
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Compact nav + label */}
          <div className="flex items-center gap-1">
            <button
              className="rounded-xl border px-2 py-1 text-sm hover:bg-gray-50"
              onClick={() => goWeek(-1)}
              aria-label="Previous week"
            >
              ◀
            </button>
            <div className="text-sm font-semibold text-center px-1 whitespace-nowrap">
              Week of {weekStart.toLocaleDateString([], { month: "short", day: "numeric" })}
            </div>
            <button
              className="rounded-xl border px-2 py-1 text-sm hover:bg-gray-50"
              onClick={() => goWeek(1)}
              aria-label="Next week"
            >
              ▶
            </button>
          </div>

          {/* Today chip sits right next to the label; small and tidy */}
          <button className="rounded-xl border px-2.5 py-1 text-xs hover:bg-gray-50" onClick={() => setAnchor(new Date())}>
            Today
          </button>

          {/* Filters push to the far right */}
          <div className="ml-auto flex items-center gap-2">
            <Select value={therapist} onChange={(e) => setTherapist(e.target.value)}>
              {therapists.map((t) => (
                <option key={t}>{t || "Unknown"}</option>
              ))}
            </Select>
            <Select value={branch} onChange={(e) => setBranch(e.target.value)}>
              {branches.map((b) => (
                <option key={b}>{b || "Unknown"}</option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={myOnly} onChange={(e) => setMyOnly(e.target.checked)} />
              Only my appointments
            </label>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <div className="rounded-xl border p-3">
            <div className="text-[11px] text-gray-500">Bookings</div>
            <div className="text-xl font-semibold">{bookingsCount}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-[11px] text-gray-500">Hours booked</div>
            <div className="text-xl font-semibold">{hoursBooked.toFixed(1)}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-[11px] text-gray-500">Sales</div>
            <div className="text-xl font-semibold">{money(sales)}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Avg {money(avgSale.toFixed(0))}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-[11px] text-gray-500">Utilization</div>
            <div className="text-xl font-semibold">{utilization}%</div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {bookingsCount}/{capacity} slots
            </div>
          </div>
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((d) => {
            const key = ymd(d);
            const list = byDay[key] || [];
            const count = list.length;
            const has = count > 0;

            return (
              <div key={d.toISOString()} className="min-h-[140px] rounded-xl border p-2 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-gray-600">
                    {d.toLocaleDateString([], { weekday: "short" })} {d.getDate()}
                  </div>
                  {has && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">{count}</span>
                  )}
                </div>

                <div className="flex-1 flex items-center justify-center">
                  {has && (
                    <button
                      onClick={() => openDayModal(d)}
                      className="flex flex-col items-center justify-center px-3 py-3 text-center hover:bg-red-50/60 focus:outline-none rounded-lg"
                      title="View bookings"
                      aria-label={`${count} booking${count > 1 ? "s" : ""} on ${d.toLocaleDateString()}`}
                    >
                      <div className="text-3xl leading-none font-semibold text-red-700">{count}</div>
                      <div className="text-[10px] text-red-600 mt-1 underline">View</div>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Day appointments modal */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title={modalDate ? `Appointments — ${fmtDateLong(modalDate)}` : "Appointments"}
        footer={
          <div className="flex justify-end">
            <button className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-50" onClick={() => setOpenModal(false)}>
              Close
            </button>
          </div>
        }
      >
        {modalList.length === 0 ? (
          <div className="text-sm text-gray-500">No appointments.</div>
        ) : (
          <div className="space-y-3">
            {modalList.map((b) => {
              const start = new Date(b.startUtc ?? b.StartUtc);
              const end = new Date(b.endUtc ?? b.EndUtc ?? start.getTime() + 60 * 60 * 1000);
              const services = (b.services ?? b.serviceNames ?? b.Services ?? []).join(", ") || "Service";
              return (
                <div
                  key={b.id ?? `${start.toISOString()}-${b.customerId ?? ""}`}
                  className="rounded-xl border p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {fmtTime(start.toISOString())}–{fmtTime(end.toISOString())}
                    </div>
                    <div className="text-xs text-gray-500">
                      {b.branch ?? b.Branch} · {b.province ?? b.Province}
                    </div>
                  </div>
                  <div className="mt-1 text-gray-800">{services}</div>
                  <div className="mt-1 text-xs text-gray-600">
                    Therapist: <span className="font-medium">{b.therapistName ?? b.TherapistName}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Customer: <span className="font-medium">{b.customerName ?? "—"}</span> · {b.customerMobile ?? ""}
                  </div>
                  {b.total != null && (
                    <div className="text-xs text-gray-600">
                      Total: <span className="font-medium">R{b.total}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ------------------------ Admin Calendar ------------------------ */
function AdminCalendar({ bookings }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [branchFilter, setBranchFilter] = useState("All");
  const [therapistFilter, setTherapistFilter] = useState("All");

  const [openModal, setOpenModal] = useState(false);
  const [modalDate, setModalDate] = useState(null);
  const [modalList, setModalList] = useState([]);

  const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtDateLong = (d) => d?.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const getServices = (b) => b.serviceNames ?? b.Services ?? b.services ?? [];
  const y = month.getFullYear(),
    m = month.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  const daysInMonth = end.getDate();
  const weekStartIdx = (start.getDay() + 6) % 7;
  const prevBlanks = Array.from({ length: weekStartIdx }).map((_, i) => ({ key: `blank-${i}` }));
  const days = Array.from({ length: daysInMonth }).map((_, i) => ({ day: i + 1 }));

  const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
  const byDay = {};
  const filtered = (bookings ?? [])
    .filter((b) => {
      const d = new Date(b.startUtc || b.StartUtc);
      if (isNaN(d)) return false;
      if ((b.status ?? "confirmed") === "cancelled") return false;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key !== monthKey) return false;
      if (branchFilter !== "All" && (b.branch || b.Branch) !== branchFilter) return false;
      if (therapistFilter !== "All" && (b.therapistName || b.TherapistName) !== therapistFilter) return false;
      return true;
    })
    .sort((a, b) => new Date(a.startUtc ?? a.StartUtc) - new Date(b.startUtc ?? b.StartUtc));

  filtered.forEach((b) => {
    const d = new Date(b.startUtc ?? b.StartUtc);
    const day = d.getDate();
    (byDay[day] ||= []).push(b);
  });

  const branches = ["All", ...Array.from(new Set((bookings ?? []).map((b) => b.branch || b.Branch)))];
  const therapists = ["All", ...Array.from(new Set((bookings ?? []).map((b) => b.therapistName || b.TherapistName)))];

  const goMonth = (delta) => setMonth(new Date(y, m + delta, 1));

  const openDayModal = (day) => {
    const list = (byDay[day] || [])
      .slice()
      .sort((a, b) => new Date(a.startUtc ?? a.StartUtc) - new Date(b.startUtc ?? b.StartUtc));
    if (!list.length) return;
    setModalList(list);
    setModalDate(new Date(y, m, day));
    setOpenModal(true);
  };

  return (
    <div className="space-y-4">
      <Card
        title="Admin — Calendar"
        footer={
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{`${filtered.length} bookings in view`}</span>
            <span className="text-gray-400">In-memory</span>
          </div>
        }
      >
        <div className="flex flex-wrap gap-3 items-center mb-3">
          <div className="flex items-center gap-2">
            <button className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-50" onClick={() => goMonth(-1)}>
              ◀
            </button>
            <div className="text-sm font-semibold w-40 text-center">{month.toLocaleString([], { month: "long", year: "numeric" })}</div>
            <button className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-50" onClick={() => goMonth(1)}>
              ▶
            </button>
            <button
              className="rounded-xl border px-3 py-1 text-xs hover:bg-gray-50"
              onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
            >
              Today
            </button>
          </div>
          <div className="ml-auto flex gap-2">
            <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
              {branches.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </Select>
            <Select value={therapistFilter} onChange={(e) => setTherapistFilter(e.target.value)}>
              {therapists.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-xs font-medium text-gray-500 mb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-center">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {prevBlanks.map((b) => (
            <div key={b.key} className="h-24 rounded-xl border bg-gray-50" />
          ))}
          {days.map(({ day }) => {
            const dayBookings = byDay[day] || [];
            const hasBookings = dayBookings.length > 0;
            return (
              <div
                key={day}
                onClick={() => hasBookings && openDayModal(day)}
                className={`h-24 rounded-xl border p-2 flex flex-col ${hasBookings ? "cursor-pointer hover:bg-red-50/40" : ""}`}
                title={hasBookings ? "View bookings" : undefined}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-gray-500">{day}</div>
                  {hasBookings && <span className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-700">{dayBookings.length}</span>}
                </div>
                <div className="flex-1 space-y-1 overflow-hidden">
                  {dayBookings.slice(0, 2).map((b, i) => (
                    <div key={i} className="truncate rounded-md border px-2 py-0.5 text-[11px] bg-white/50">
                      <span className="font-medium">{fmtTime(b.startUtc ?? b.StartUtc)}</span>{" "}
                      <span className="text-gray-600">· {(getServices(b)[0] || "Service")}</span>
                      <div className="text-[10px] text-gray-500 truncate">
                        {b.therapistName ?? b.TherapistName} · {b.branch ?? b.Branch}
                      </div>
                    </div>
                  ))}
                  {dayBookings.length > 2 && <div className="text-[11px] text-red-600">+{dayBookings.length - 2} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title={modalDate ? `Bookings — ${fmtDateLong(modalDate)}` : "Bookings"}
        footer={
          <div className="flex justify-end">
            <button className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-50" onClick={() => setOpenModal(false)}>
              Close
            </button>
          </div>
        }
      >
        {modalList.length === 0 ? (
          <div className="text-sm text-gray-500">No bookings.</div>
        ) : (
          <div className="space-y-3">
            {modalList.map((b) => {
              const start = new Date(b.startUtc ?? b.StartUtc);
              const end = new Date(b.endUtc ?? b.EndUtc ?? start.getTime() + 60 * 60 * 1000);
              const services = getServices(b);
              return (
                <div key={b.id ?? `${start.toISOString()}-${b.customerId ?? ""}`} className="rounded-xl border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {fmtTime(start.toISOString())}–{fmtTime(end.toISOString())}
                    </div>
                    <div className="text-xs text-gray-500">
                      {b.branch ?? b.Branch} · {b.province ?? b.Province}
                    </div>
                  </div>
                  <div className="mt-1 text-gray-800">{services.join(", ") || "Service"}</div>
                  <div className="mt-1 text-xs text-gray-600">
                    Therapist: <span className="font-medium">{b.therapistName ?? b.TherapistName}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Customer: <span className="font-medium">{b.customerName ?? "—"}</span> · {b.customerMobile ?? ""}
                  </div>
                  {b.total != null && (
                    <div className="text-xs text-gray-600">
                      Total: <span className="font-medium">R{b.total}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------- Simple chart primitives ----------
function BarChart({ data, height = 160 }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 28, gap = 16;
  const width = data.length * (barW + gap) + gap;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="block">
        <line x1="0" y1={height - 24} x2={width} y2={height - 24} stroke="#e5e7eb" />
        {data.map((d, i) => {
          const h = Math.round(((d.value / max) || 0) * (height - 48));
          const x = gap + i * (barW + gap);
          const y = height - 24 - h;
          return (
            <g key={d.label}>
              <rect x={x} y={y} width={barW} height={h} rx="6" className="fill-red-500/80" />
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" className="text-[10px] fill-gray-600">
                {d.label.length > 6 ? d.label.slice(0, 6) + "…" : d.label}
              </text>
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" className="text-[10px] fill-gray-600">
                {d.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PieChart({ data, size = 160, inner = 64 }) {
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  let acc = 0;
  const stops = data
    .map((d, i) => {
      const from = (acc / total) * 100;
      acc += d.value;
      const to = (acc / total) * 100;
      const color = d.color || ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"][i % 6];
      return `${color} ${from}% ${to}%`;
    })
    .join(", ");

  return (
    <div className="flex items-center gap-4">
      <div
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${stops})`,
          borderRadius: "9999px",
          position: "relative",
        }}
      >
        <div
          style={{
            width: inner,
            height: inner,
            borderRadius: "9999px",
            background: "white",
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            boxShadow: "inset 0 0 0 1px #e5e7eb",
          }}
        />
      </div>
      <div className="text-sm space-y-1">
        {data.map((d, i) => {
          const color = d.color || ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"][i % 6];
          const pct = Math.round((d.value / total) * 100);
          return (
            <div key={d.label} className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="w-28 truncate">{d.label}</span>
              <span className="text-gray-500">
                {d.value} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Insights ----------
function Insights({ bookings }) {
  const getStart = (b) => new Date(b.startUtc ?? b.StartUtc);
  const getServices = (b) => b.serviceNames ?? b.ServiceNames ?? b.Services ?? b.services ?? [];
  const getBranch = (b) => b.branch ?? b.Branch ?? "Unknown";

  const now = new Date();
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last30 = (bookings ?? []).filter((b) => !isNaN(getStart(b)) && getStart(b) >= since);

  const totalBookings30 = last30.length;
  const sales30 = last30.reduce(
    (sum, b) => sum + (typeof b.total === "number" ? b.total : getServices(b).reduce((s, name) => s + (PRICE_MAP[name] ?? 0), 0)),
    0
  );

  const byBranch = {};
  last30.forEach((b) => {
    byBranch[getBranch(b)] = (byBranch[getBranch(b)] ?? 0) + 1;
  });
  const branchBarData = Object.entries(byBranch).map(([label, value]) => ({ label, value }));

  const byService = {};
  last30.forEach((b) =>
    getServices(b).forEach((s) => {
      byService[s] = (byService[s] ?? 0) + 1;
    })
  );
  const servicePieData = Object.entries(byService).map(([label, value]) => ({ label, value }));

  const reviews = { Compliments: 62, Complaints: 7, Suggestions: 15, Enquiries: 9 };
  const reviewBarData = Object.entries(reviews).map(([label, value]) => ({ label, value }));

  const money = (rands) => `R ${rands.toLocaleString("en-ZA")}`;

  return (
    <div className="space-y-4">
      <Card
        title="Admin — Insights (last 30 days)"
        footer={<div className="text-xs text-gray-500">{`Loaded ${bookings?.length ?? 0} bookings (in-memory)`}</div>}
      >
        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-500">Total Bookings (30d)</div>
            <div className="text-2xl font-semibold">{totalBookings30}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-500">Sales (30d)</div>
            <div className="text-2xl font-semibold">{money(sales30)}</div>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <div className="text-sm font-semibold mb-2">Bookings by Branch</div>
            {branchBarData.length ? <BarChart data={branchBarData} /> : <EmptyState />}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-semibold mb-2">Bookings by Service</div>
              {servicePieData.length ? <PieChart data={servicePieData} /> : <EmptyState />}
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">Categorized Reviews</div>
              <BarChart data={reviewBarData} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-sm text-gray-500 border rounded-xl p-4">No data in the last 30 days. Make a few bookings first.</div>
  );
}

/* --------------------------- CHATBOT --------------------------- */
function Chatbot({ screen, setScreen, draft, setDraft, bookings }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => [
    {
      role: "bot",
      text:
        "Hi! I’m your AHC assistant. Ask me about prices, bookings, promotions, or set preferences (e.g., “fragrance lavender”, “intensity medium”, “note: avoid shoulders”).",
    },
  ]);
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = (text) => {
    const t = (text ?? input).trim();
    if (!t) return;
    setMessages((prev) => [...prev, { role: "user", text: t }]);
    setInput("");
    respond(t);
  };

  const money = (rands) => `R${Number(rands || 0).toLocaleString("en-ZA")}`;
  const cartSummary = () => {
    const { service, servicePrice, productLines, productsSubtotal, preDiscountTotal } = computeCart(draft);
    const promo = evaluatePromo(draft);
    const discount = promo?.amount || 0;
    const productsTxt = productLines.length
      ? productLines.map((p) => `• ${p.name} × ${p.qty} — ${money(p.lineTotal)}`).join("\n")
      : "• No products";
    const prefs =
      [
        draft.oilFragrance ? `Fragrance: ${draft.oilFragrance}` : null,
        draft.massageIntensity ? `Intensity: ${draft.massageIntensity}` : null,
        draft.specialInstructions?.trim() ? `Notes: ${draft.specialInstructions.trim()}` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "No preferences set yet";

    const totalText = discount
      ? `Subtotal: ${money(preDiscountTotal)}\nPromo ${promo.code}: −${money(discount)}\nTotal: ${money(preDiscountTotal - discount)}.`
      : `Total: ${money(preDiscountTotal)}.`;

    return `Cart
• ${service} — ${money(servicePrice)}
${productsTxt}
Prefs: ${prefs}
${totalText}`;
  };

  const showPrices = () => Object.entries(PRICE_MAP).map(([k, v]) => `• ${k}: ${money(v)}`).join("\n");

  const listPromos = () =>
    PROMO_DEFS.map((p) => `• ${p.code} — ${p.title} (${p.detail})`).join("\n") +
    `\nTip: say “Apply WELLNESS10” or open the Promotions screen.`;

  const respond = (raw) => {
    const msg = raw.toLowerCase();

    // Therapist calendar intent (specific)
    if (/\b(my|therapist).*(calendar|schedule|appointments)\b/.test(msg) || /\bmy schedule\b/.test(msg)) {
      setScreen("Therapist - Calendar");
      return pushBot("Opening your Therapist Calendar for this week.");
    }

    // Navigation intents
    if (/\b(my\s*bookings?|bookings? screen|manage bookings?)\b/.test(msg)) {
      setScreen("My Bookings");
      return pushBot("Opening your bookings. You can cancel or reschedule there.");
    }
    if (/\b(promos?|promotion|discount|voucher|coupon)\b/.test(msg)) {
      setScreen("Promotions");
      return pushBot(`Here are our current promos:\n${listPromos()}\n(I’ve opened the Promotions page for you.)`);
    }
    if (/\b(cart|my cart)\b/.test(msg)) {
      setScreen("Products and Cart");
      return pushBot(`Here’s your cart:\n${cartSummary()}\n(I’ve opened the Products and Cart page for you.)`);
    }
    if (/\b(checkout|pay)\b/.test(msg)) {
      setScreen("Checkout");
      return pushBot("Opening Checkout. You can complete payment there.");
    }
    if (/\b(book|booking|schedule|reschedule)\b/.test(msg)) {
      setScreen("Booking Calendar");
      return pushBot("Let’s pick a date and time. I’ve opened the Booking Calendar.");
    }
    if (/\banalytics?\b/.test(msg)) {
      setScreen("Admin - Analytics");
      return pushBot("Opening Admin - Analytics dashboard.");
    }
    if (/\binsight(s)?\b/.test(msg)) {
      setScreen("Admin - Insights");
      return pushBot("Opening Admin - Insights.");
    }
    if (/\badmin\b/.test(msg)) {
      setScreen("Admin - Calendar");
      return pushBot("Taking you to Admin - Calendar.");
    }

    // Apply promo code if mentioned
    const codeMatch = raw.toUpperCase().match(/\b(WELLNESS10|SPRINGFEET|CPT50|BUNDLE5)\b/);
    if (/\b(apply|use|promo|code|voucher)\b/.test(msg) && codeMatch?.[1]) {
      const code = codeMatch[1];
      setDraft((p) => ({ ...p, promoCode: code }));
      const pEval = evaluatePromo({ ...draft, promoCode: code });
      if (pEval?.amount) {
        return pushBot(`✅ Applied **${code}** — ${pEval.why}. You’ll save **R${pEval.amount}** at checkout.`);
      } else {
        return pushBot(`Added **${code}**. It’s valid, but not eligible with your current cart. See Promotions for details.`);
      }
    }

    // Preferences
    const frag = FRAGRANCES.find((f) => msg.includes(f.toLowerCase()));
    if (/\b(fragrance|oil|scent)\b/.test(msg) && frag) {
      setDraft((p) => ({ ...p, oilFragrance: frag }));
      return pushBot(`Got it — oil fragrance set to **${frag}**.`);
    }
    const intensity = INTENSITIES.find((i) => msg.includes(i.toLowerCase()));
    if (/\b(intensity|pressure)\b/.test(msg) && intensity) {
      setDraft((p) => ({ ...p, massageIntensity: intensity }));
      return pushBot(`Massage intensity set to **${intensity}**.`);
    }
    const noteMatch = raw.match(/(?:note|notes|instruction|instructions)\s*[:\-]\s*(.+)$/i);
    if (noteMatch?.[1]) {
      const txt = noteMatch[1].trim();
      setDraft((p) => ({ ...p, specialInstructions: txt }));
      return pushBot(`Noted your special instructions: “${txt}”.`);
    }

    // Prices / menu
    if (/\b(price|prices|menu|cost|how much)\b/.test(msg)) {
      return pushBot(`Here are our treatments:\n${showPrices()}\n\nTip: say “Apply WELLNESS10” or open Promotions.`);
    }

    // Branch info
    if (/\b(branch|branches|location|address|where)\b/.test(msg)) {
      const list = Object.entries(BRANCH_MAP)
        .map(([prov, arr]) => `• ${prov}: ${arr.join(", ")}`)
        .join("\n");
      return pushBot(`We’re in:\n${list}\nYour current selection is **${draft.branch}** (${draft.province}).`);
    }

    // Cart summary
    if (/\bsummary|cart summary|what.*in.*cart\b/.test(msg)) {
      return pushBot(cartSummary());
    }

    // Help
    if (/\b(help|hi|hello|start)\b/.test(msg)) {
      return pushBot(helpText(draft));
    }

    // Fallback
    return pushBot(
      "I can help with booking, prices, promotions, preferences, and your weekly therapist schedule.\n" +
        'Try: “Show promotions”, “Apply WELLNESS10”, “Open cart”, “Fragrance Lavender”, “My schedule”, or “note: avoid shoulders”.'
    );
  };

  const helpText = (d) =>
    `Here’s what I can do:
• “Show promotions” or “Apply WELLNESS10”
• “Show prices” — see treatment pricing
• “Open cart” — view your cart & promo savings
• “Fragrance Lavender” / “Intensity Medium” — set your experience
• “note: …” — add special instructions
• “Book” — jump to Booking Calendar
• “My schedule” — open Therapist Calendar
Current prefs: ${d.oilFragrance ?? "—"} / ${d.massageIntensity ?? "—"} / ${d.specialInstructions?.trim() || "—"}`;

  const pushBot = (text) => setMessages((prev) => [...prev, { role: "bot", text }]);

  const suggestions = ["Show promotions", "Apply WELLNESS10", "Open cart", "Fragrance Lavender", "Intensity Medium", "My schedule", "note: avoid shoulders (old injury)", "Book"];

  return (
    <>
      {/* FAB */}
      <button
        className="fixed bottom-6 right-6 z-50 rounded-full bg-red-600 text-white h-14 w-14 shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        title={open ? "Close chat" : "Chat with us"}
      >
        💬
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[22rem] sm:w-[26rem] max-h-[70vh] rounded-2xl border bg-white shadow-2xl flex flex-col">
          <div className="px-4 py-3 border-b bg-gray-50 rounded-t-2xl flex items-center justify-between">
            <div className="text-sm font-semibold tracking-wide text-red-800">AHC Assistant</div>
            <button className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user" ? "bg-red-600 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {/* Quick suggestions */}
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50">
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 border-t bg-white rounded-b-2xl">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <input
                ref={inputRef}
                className="flex-1 rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Type a message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700" type="submit">
                Send
              </button>
            </form>

            <div className="mt-1 text-[11px] text-gray-500">
              Tip: Try <span className="font-medium">“Apply WELLNESS10”</span> or <span className="font-medium">“My schedule”</span>.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
