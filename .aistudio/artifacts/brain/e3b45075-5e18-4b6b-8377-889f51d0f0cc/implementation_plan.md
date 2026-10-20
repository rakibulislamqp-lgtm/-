# SERA FASHION — Product Advertising & Sales Landing Page

A dedicated, high-converting, mobile-first Product Advertising and Sales Landing Page for SERA FASHION mounted on `/offer` (with seamless hash and query support). The page showcases genuine products from the store's database, offers a live limited-time mega sale countdown, highlights product sizing and discounts, answers common customer questions, and seamlessly routes customers into the existing checkout system with preselected items.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The architectural and design decisions below were confirmed by the user in Phase 1:
> - **Primary URL Route**: `/offer` with fallback hash `#/offer` and query `?view=offer` for universal compatibility across browsers, web views, and hosting environments.
> - **Hero Advertising Focus**: Flat & percentage discount mega sale with an active promotional countdown timer, clear value proposition, and instant shop CTA.
> - **Order Flow Strategy**: Clicking "Buy Now" on any product card or quick-order drawer immediately preloads the item (title, code, size, quantity, and real price) into the cart and transitions directly into the existing main checkout flow (`checkoutMode: true`), fully preserving existing stock validation, delivery fee calculation, courier fraud shield, SMS alerts, and Meta Pixel purchase tracking.
> - **System Protection**: 100% of existing databases, admin panels, customer tracking, loyalty tiers, and APIs remain completely untouched and unharmed.

---

## 1. Overview & Core Concept

- **What It Does**: Provides a dedicated, ad-campaign-ready landing page tailored for Facebook, Instagram, Google, and TikTok ad traffic. Visitors land on a focused, ultra-fast, luxury-styled sales experience with zero distraction, curated bestseller collections, transparent pricing, verified customer reviews, clear policies, and instant 1-tap checkout.
- **Target Audience / Persona**: High-intent Bangladeshi fashion shoppers interested in premium Three-Piece collections, authentic Dhakai Jamdani and Kanjivaram silk sarees, seeking genuine photos, cash on delivery (COD) trust signals, and nationwide 2-3 day delivery.
- **Key Value**: Dramatically improves ad conversion rates compared to generic homepages by eliminating choice paralysis, presenting strong social proof and limited-time savings, while piping orders directly into the existing SERA FASHION order pipeline.

---

## 2. User Experience & Visual Design

### Key User Flows

```
[Ad / Social Link / Banner]
           │
           ▼
  [/offer Landing Page]
     │
     ├── 1. Luxury Header (SERA FASHION brand mark, Phone/WhatsApp support, Back to Full Store link)
     ├── 2. Hero Advertising Banner (Mega Sale announcement, Limited-time Countdown Timer, Call-to-Action)
     ├── 3. Trust Highlights (Cash on Delivery across BD, 7-day hassle-free exchange, 100% genuine fabrics)
     ├── 4. Curated Bestseller Grid (Real products from DB, live stock indicators, discount badges, size chips)
     ├── 5. Interactive Product Quick-View (High-res zoom, fabric & care details, size selector, quantity stepper)
     ├── 6. Transparent Delivery & Payment Policies (Dhaka ৳80, Outside ৳130, bKash/Nagad/COD options)
     ├── 7. Customer Trust & FAQ (Frequently Asked Questions with expandable accordions)
     └── 8. Mobile-Sticky Order Bar & Footer (Direct WhatsApp quick-order and immediate "Buy Now" trigger)
           │
           ▼ [Click "Buy Now" on any product]
[Main Checkout Form prefilled with selected item, size, and quantity]
           │
           ▼ [Submit Order]
[Existing Order API -> Firestore & Local DB -> SMS Notification -> Meta Pixel Purchase -> Success Receipt]
```

### Visual Identity & Theme

- **Aesthetic Direction**: High-fashion luxury boutique with warm golden accents and dark obsidian sophistication (`#090D16` deep charcoal background, `#D4AF37` royal gold accents, `#F8FAFC` crisp text).
- **Typography & Hierarchy**:
  - *Headlines & Hero*: Classic serif font styling (`font-serif`, `tracking-tight`) conveying artisanal craftsmanship and royal heritage.
  - *Pricing & Spec*: Tabular figures with Bengali numerals support and prominent strike-through original prices.
  - *Body & Labels*: Clean, legible sans-serif (`font-sans`) optimized for mobile screens.
- **Micro-Interactions**:
  - Ticking seconds on the countdown timer with smooth pulse animation.
  - Subtle card hover elevation ($2\text{px}$ translateY) with gold border illumination.
  - Size chip selection with instant visual feedback and active ring indicators.
  - Mobile-friendly tap targets ($\ge 44\text{px}$) with haptic active scaling.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Modular Component Architecture (`OfferLandingPage.tsx`)**
  - *Chosen Approach*: Build a dedicated, self-contained `OfferLandingPage.tsx` component mounted inside `App.tsx` when `view === 'offer'`.
  - *Why*: Keeps the main `App.tsx` lean, avoids duplicating checkout and order submission code, and guarantees zero regression for the main store or admin panel.
  - *Alternatives Considered*: Creating a separate HTML file or multi-page Vite bundle was rejected because it would fracture shared React state, require duplicate Firebase initialization, and break client-side cart transitions.

- **Decision 2: Reusing Real Product Data from `productService.ts`**
  - *Chosen Approach*: Query `getAllProducts(true)` directly so the landing page displays real in-stock items with live pricing, discounts, and real images from the store's database.
  - *Why*: Satisfies the strict requirement to never use fake or demo data, ensuring customers always order authentic products with verified stock.

- **Decision 3: Zero-Friction Hand-off to Main Checkout**
  - *Chosen Approach*: When a user clicks "Buy Now" on the landing page, the selected product, size, and quantity are added to the cart, `checkoutMode` is enabled, and the view smoothly scrolls to the verified checkout form.
  - *Why*: Reuses 100% of existing address validation, district/upazila lookup, fraud detection, duplicate order blocking, and post-order SMS/loyalty rewards without writing risky parallel order endpoints.

---

## 4. Technical Architecture & Data Strategy

### System Component Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                               App.tsx                                  │
│   Routing Controller: detects window.location.pathname === '/offer'    │
│   or hash '#/offer' or query '?view=offer'                             │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌────────────────────────────────┐         ┌────────────────────────────────┐
│   OfferLandingPage.tsx         │         │   Default Storefront View      │
│   - Header with back to store  │         │   - BannerSlider               │
│   - Countdown Mega Sale Hero   │         │   - ProductShowcase            │
│   - Curated Product Grid       │         │   - TopLuxuryBar               │
│   - Size & Variant Selector    │         │   - CustomerPortal             │
│   - Policy Cards & FAQs        │         └────────────────────────────────┘
│   - Sticky Bottom Quick Bar    │
└────────────────┬───────────────┘
                 │ (User clicks "Buy Now")
                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│   Shared Checkout & Order Validation Pipeline                          │
│   - CustomerInfo (District & Upazila auto-fill)                        │
│   - PaymentSection (COD, bKash, Nagad, Delivery calculation)           │
│   - FraudShieldService & Security Verification                         │
│   - orderService.createOrder()                                         │
│     ├── Firestore sync ('orders' collection)                           │
│     ├── Node.js / cPanel server fallback (/api/orders)                 │
│     ├── SMS Notification dispatch                                      │
│     ├── Loyalty point crediting                                        │
│     └── Meta Pixel Purchase tracking                                   │
│   - SuccessView (Digital invoice & order receipt)                      │
└────────────────────────────────────────────────────────────────────────┘
```

### Planned File Changes

1. **`src/components/OfferLandingPage.tsx`** *(New File)*:
   - Complete Product Advertising & Sales Landing Page component.
   - Live Countdown Timer component (hours, minutes, seconds).
   - Dynamic real product showcase with category filtering, size selectors, and in-stock badges.
   - Value propositions (Cash on Delivery, 7-Day Easy Exchange, Nationwide Delivery).
   - Accordion FAQ answering delivery timeline, payment, and size selection.
   - Responsive Footer with support numbers, WhatsApp link, and full-store link.
2. **`src/App.tsx`** *(Minimal Modification)*:
   - Add `'offer'` to `view` state type (`'form' | 'admin' | 'offer'`).
   - Listen to `/offer`, `#/offer`, and `?view=offer` in URL handling effect.
   - Render `<OfferLandingPage>` when `view === 'offer'`.
   - Pass existing `handleShowcaseOrder`, `brandSettingsObj`, `logoUrl`, and phone numbers as props.
3. **`server.ts`** *(Zero Breaking Change)*:
   - Verify wildcard fallback `app.get('*', ...)` continues to serve `index.html` for clean `/offer` navigation.
