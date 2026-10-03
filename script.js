(() => {
  "use strict";

  const safeStorage = {
    get(key) {
      try { return window.localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); } catch { /* Storage is optional. */ }
    }
  };

  const body = document.body;
  const announcer = document.getElementById("site-announcer");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reducedMotionSetting = safeStorage.get("gaia-motion");
  function loadCart() {
    try {
      const saved = JSON.parse(safeStorage.get("gaia-cart") || "{}");
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
      return Object.fromEntries(Object.entries(saved).filter(([id, quantity]) =>
        ["field-bottle", "everyday-tote", "paper-journal", "dish-brush"].includes(id) && Number.isInteger(quantity) && quantity > 0
      ).map(([id, quantity]) => [id, Math.min(quantity, 20)]));
    } catch { return {}; }
  }
  const state = {
    messages: [],
    sending: false,
    coords: null,
    weatherBusy: false,
    cart: loadCart(),
    fontScale: Number(safeStorage.get("gaia-font-scale")) || 1,
    highContrast: safeStorage.get("gaia-contrast") === "high",
    motionOverride: reducedMotionSetting === "reduced" || reducedMotionSetting === "full" ? reducedMotionSetting : "system"
  };

  function announce(message) {
    if (announcer) announcer.textContent = message;
  }

  function applyTheme(theme) {
    const selected = theme === "light" ? "light" : "dark";
    body.dataset.theme = selected;
    safeStorage.set("gaia-theme", selected);
    const button = document.querySelector(".theme-toggle");
    if (button) {
      const next = selected === "dark" ? "light" : "dark";
      button.setAttribute("aria-label", `Switch to ${next} mode`);
      const label = button.querySelector(".theme-label");
      if (label) label.textContent = next === "light" ? "Light" : "Dark";
    }
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = selected === "dark" ? "#101411" : "#f4f4ed";
  }

  applyTheme(safeStorage.get("gaia-theme") || "dark");
  document.querySelector(".theme-toggle")?.addEventListener("click", () => {
    applyTheme(body.dataset.theme === "dark" ? "light" : "dark");
  });

  const validAccents = ["forest", "ocean", "sunlight"];
  function applyAccent(accent) {
    const selected = validAccents.includes(accent) ? accent : "forest";
    body.dataset.accent = selected;
    safeStorage.set("gaia-accent", selected);
    document.querySelectorAll("[data-accent-choice]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.accentChoice === selected));
    });
  }
  applyAccent(safeStorage.get("gaia-accent") || "forest");
  document.querySelectorAll("[data-accent-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      applyAccent(button.dataset.accentChoice);
      announce(`${button.textContent.trim()} accent colour selected.`);
    });
  });

  function applyFontScale(scale, shouldSave = true) {
    state.fontScale = Math.min(1.15, Math.max(.92, Math.round(scale * 100) / 100));
    document.documentElement.style.fontSize = `${state.fontScale * 100}%`;
    body.style.setProperty("--font-scale", String(state.fontScale));
    if (shouldSave) safeStorage.set("gaia-font-scale", String(state.fontScale));
    announce(`Text size ${Math.round(state.fontScale * 100)} percent.`);
  }
  applyFontScale(state.fontScale, false);
  document.getElementById("font-smaller")?.addEventListener("click", () => applyFontScale(state.fontScale - .05));
  document.getElementById("font-larger")?.addEventListener("click", () => applyFontScale(state.fontScale + .05));

  function applyContrast(enabled) {
    state.highContrast = enabled;
    if (enabled) body.dataset.contrast = "high";
    else delete body.dataset.contrast;
    safeStorage.set("gaia-contrast", enabled ? "high" : "normal");
    const button = document.getElementById("contrast-toggle");
    button?.setAttribute("aria-pressed", String(enabled));
    if (button) button.textContent = enabled ? "High contrast on" : "High contrast";
  }
  applyContrast(state.highContrast);
  document.getElementById("contrast-toggle")?.addEventListener("click", () => applyContrast(!state.highContrast));

  function syncMotionControl() {
    const customReduced = state.motionOverride === "reduced";
    if (customReduced) body.dataset.motion = "reduced";
    else delete body.dataset.motion;
    const button = document.getElementById("motion-toggle");
    const note = document.getElementById("motion-preference");
    const isReduced = customReduced || (state.motionOverride === "system" && prefersReducedMotion.matches);
    button?.setAttribute("aria-pressed", String(isReduced));
    if (button) button.textContent = customReduced ? "Reduced motion on" : "Reduce motion";
    if (note) {
      note.textContent = state.motionOverride === "system"
        ? (prefersReducedMotion.matches ? "System setting active" : "Follows system setting")
        : (customReduced ? "For this page" : "System setting only");
    }
  }
  syncMotionControl();
  document.getElementById("motion-toggle")?.addEventListener("click", () => {
    state.motionOverride = state.motionOverride === "reduced" ? "full" : "reduced";
    safeStorage.set("gaia-motion", state.motionOverride);
    syncMotionControl();
    announce(state.motionOverride === "reduced" ? "Reduced motion enabled." : "Reduced motion preference cleared; system setting still applies.");
  });
  prefersReducedMotion.addEventListener?.("change", syncMotionControl);

  // Mobile navigation uses real buttons and anchors, so it stays keyboard operable.
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.getElementById("primary-nav");
  function closeMenu(returnFocus = false) {
    if (!menuButton || !nav) return;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
    nav.classList.remove("is-open");
    if (returnFocus) menuButton.focus();
  }
  menuButton?.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    nav?.classList.toggle("is-open", open);
    if (open) nav?.querySelector("a")?.focus();
  });
  nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    if (link.hash === "#display-settings") {
      const settings = document.getElementById("display-settings");
      if (settings) settings.open = true;
    }
    closeMenu();
  }));
  window.addEventListener("resize", () => { if (window.innerWidth > 900) closeMenu(); });

  // Escape closes transient page controls and native FAQ accordions.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (menuButton?.getAttribute("aria-expanded") === "true") closeMenu(true);
    document.querySelectorAll(".faq-item[open]").forEach((item) => { item.open = false; });
    document.querySelectorAll(".access-panel[open]").forEach((item) => { item.open = false; });
  });

  // The pointer accent only appears on a fine pointer when motion is allowed.
  const cursor = document.querySelector(".cursor-orbit");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (cursor && finePointer.matches && !prefersReducedMotion.matches) {
    window.addEventListener("pointermove", (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
      body.classList.add("cursor-active");
    }, { passive: true });
    document.querySelectorAll("a, button, summary, select").forEach((element) => {
      element.addEventListener("pointerenter", () => cursor.classList.add("is-hovering"));
      element.addEventListener("pointerleave", () => cursor.classList.remove("is-hovering"));
    });
    prefersReducedMotion.addEventListener?.("change", (event) => {
      if (event.matches) body.classList.remove("cursor-active");
    });
  }

  // Illustrative pathways describe possibilities, not observed environmental events.
  const pathways = {
    heat: {
      signal: "Several unusually hot days",
      insight: "Which places have the least shade?",
      action: "Prioritize shade and cool spaces"
    },
    water: {
      signal: "Less rain over a season",
      insight: "Who and what needs water first?",
      action: "Protect essential local water use"
    },
    habitat: {
      signal: "A habitat is becoming fragmented",
      insight: "Where can wildlife still move?",
      action: "Reconnect and protect habitat"
    }
  };
  document.querySelectorAll(".pathway-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const pathway = pathways[tab.dataset.pathway];
      if (!pathway) return;
      document.querySelectorAll(".pathway-tab").forEach((candidate) => {
        const active = candidate === tab;
        candidate.classList.toggle("is-active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      document.getElementById("path-signal").textContent = pathway.signal;
      document.getElementById("path-insight").textContent = pathway.insight;
      document.getElementById("path-action").textContent = pathway.action;
    });
  });

  const productCatalog = {
    "field-bottle": {
      name: "Steel Refill Bottle",
      shortName: "Field Bottle",
      price: 899,
      material: "Stainless steel · 750 ml",
      description: "A reusable stainless steel bottle for everyday refills.",
      prompt: "Tell me about the Steel Refill Bottle in Gaia's demo store. Its listing says stainless steel, 750 ml, ₹899, and that it is intended for everyday refills. Explain what those product details do and do not tell me about sustainability, what I should check before buying, and how to use it well. Do not assume a certification or quantify its impact."
    },
    "everyday-tote": {
      name: "Carry-All Cotton Tote",
      shortName: "Everyday Tote",
      price: 349,
      material: "Cotton · reusable",
      description: "A reusable cotton carry bag for errands and everyday essentials.",
      prompt: "Tell me about the Carry-All Cotton Tote in Gaia's demo store. Its listing says cotton and reusable, with a sample price of ₹349. Explain useful questions to ask about how it was made and how often I would use it. Be balanced: cotton is not automatically the lower-impact choice in every situation, and do not assume any certification."
    },
    "paper-journal": {
      name: "Recycled Paper Journal",
      shortName: "Field Notes",
      price: 279,
      material: "Recycled paper · 96 pages",
      description: "A simple notebook made with recycled paper for plans, lists and ideas.",
      prompt: "Tell me about the Recycled Paper Journal in Gaia's demo store. Its listing says recycled paper and 96 pages, with a sample price of ₹279. Explain what the listing says, what I might verify on the packaging, and how to get more use from a notebook. Don't invent recycled-content percentages or certifications."
    },
    "dish-brush": {
      name: "Replaceable-Head Dish Brush",
      shortName: "Home Brush",
      price: 449,
      material: "Wood handle · replaceable head",
      description: "A wood-handled dish brush with a head designed to be replaced.",
      prompt: "Tell me about the Replaceable-Head Dish Brush in Gaia's demo store. Its listing says wood handle and replaceable head, with a sample price of ₹449. Explain how replacing the head may help someone keep using the handle, what I'd need to check about head availability and materials, and do not assume a certification or quantify its impact."
    }
  };

  // The catalog and cart are a transparent front-end demo; checkout never charges or ships.
  const cartDialog = document.getElementById("cart-dialog");
  const cartOpenButton = document.getElementById("cart-open");
  const cartCloseButton = document.getElementById("cart-close");
  const cartStateElement = document.getElementById("cart-state");
  const cartCountElement = document.getElementById("cart-count");
  const cartTitleCount = document.getElementById("cart-title-count");
  const cartLiveStatus = document.getElementById("cart-live-status");
  const rupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
  const formatPrice = (amount) => `₹${rupees.format(amount)}`;
  const cartSize = () => Object.values(state.cart).reduce((sum, quantity) => sum + quantity, 0);
  const cartTotal = () => Object.entries(state.cart).reduce((sum, [id, quantity]) => sum + productCatalog[id].price * quantity, 0);

  function saveCart() {
    safeStorage.set("gaia-cart", JSON.stringify(state.cart));
  }

  function makeCartButton(label, text, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.setAttribute("aria-label", label);
    button.addEventListener("click", onClick);
    return button;
  }

  function setCartQuantity(id, quantity) {
    if (!productCatalog[id]) return;
    if (quantity <= 0) delete state.cart[id];
    else state.cart[id] = Math.min(20, quantity);
    saveCart();
    renderCart();
    updateCartBadge();
  }

  function updateCartBadge() {
    const count = cartSize();
    cartCountElement.textContent = String(count);
    cartTitleCount.textContent = `(${count})`;
    cartOpenButton.setAttribute("aria-label", `Open shopping cart, ${count} ${count === 1 ? "item" : "items"}`);
  }

  function renderCart() {
    if (!cartStateElement) return;
    cartStateElement.replaceChildren();
    const entries = Object.entries(state.cart).filter(([id, quantity]) => productCatalog[id] && quantity > 0);

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "cart-empty";
      const mark = document.createElement("span");
      mark.className = "cart-empty-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = "✳";
      const heading = document.createElement("h3");
      heading.textContent = "Your bag is taking a breath.";
      const copy = document.createElement("p");
      copy.textContent = "Explore the sample collection and add something useful for an everyday routine.";
      const shop = document.createElement("a");
      shop.className = "cart-shop-link";
      shop.href = "#shop";
      shop.textContent = "Explore the store";
      shop.addEventListener("click", () => cartDialog.close());
      empty.append(mark, heading, copy, shop);
      cartStateElement.append(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "cart-items";
    entries.forEach(([id, quantity]) => {
      const product = productCatalog[id];
      const row = document.createElement("article");
      row.className = "cart-item";
      const art = document.createElement("div");
      art.className = "cart-item-art";
      const productArt = document.querySelector(`[data-product-card="${id}"] .product-art svg`);
      if (productArt) {
        const copy = productArt.cloneNode(true);
        copy.querySelectorAll("[id]").forEach((node) => {
          const priorId = node.id;
          const cartId = `${priorId}-cart-${id}`;
          node.id = cartId;
          copy.querySelectorAll("[fill], [stroke]").forEach((shape) => {
            ["fill", "stroke"].forEach((attribute) => {
              const value = shape.getAttribute(attribute);
              if (value?.includes(`url(#${priorId})`)) shape.setAttribute(attribute, value.replaceAll(`url(#${priorId})`, `url(#${cartId})`));
            });
          });
        });
        art.append(copy);
      }
      const info = document.createElement("div");
      info.className = "cart-item-info";
      const title = document.createElement("h3");
      title.textContent = product.name;
      const material = document.createElement("p");
      material.textContent = product.material;
      const quantityControls = document.createElement("div");
      quantityControls.className = "cart-quantity";
      quantityControls.setAttribute("aria-label", `Quantity for ${product.name}`);
      quantityControls.append(
        makeCartButton(`Remove one ${product.name}`, "−", "quantity-minus", () => setCartQuantity(id, quantity - 1)),
        Object.assign(document.createElement("span"), { textContent: String(quantity) }),
        makeCartButton(`Add one ${product.name}`, "+", "quantity-plus", () => setCartQuantity(id, quantity + 1))
      );
      const remove = makeCartButton(`Remove ${product.name} from bag`, "Remove", "cart-remove", () => setCartQuantity(id, 0));
      info.append(title, material, quantityControls, remove);
      const price = document.createElement("span");
      price.className = "cart-item-price";
      price.textContent = formatPrice(product.price * quantity);
      row.append(art, info, price);
      list.append(row);
    });

    const summary = document.createElement("div");
    summary.className = "cart-summary";
    const subtotal = document.createElement("div");
    subtotal.className = "cart-summary-row";
    const numberOfItems = cartSize();
    subtotal.append(Object.assign(document.createElement("span"), { textContent: `Subtotal · ${numberOfItems} ${numberOfItems === 1 ? "item" : "items"}` }));
    subtotal.append(Object.assign(document.createElement("span"), { textContent: formatPrice(cartTotal()) }));
    const total = document.createElement("div");
    total.className = "cart-summary-row total";
    total.append(Object.assign(document.createElement("span"), { textContent: "Demo total" }));
    total.append(Object.assign(document.createElement("span"), { textContent: formatPrice(cartTotal()) }));
    const totalNote = document.createElement("p");
    totalNote.className = "cart-summary-note";
    totalNote.textContent = "Sample prices only. Shipping and taxes are not calculated.";
    summary.append(subtotal, total, totalNote);

    const checkoutTitle = document.createElement("h3");
    checkoutTitle.className = "payment-heading";
    checkoutTitle.textContent = "Choose a checkout demo";
    const paymentOptions = document.createElement("div");
    paymentOptions.className = "payment-options";
    const upi = document.createElement("button");
    upi.type = "button";
    upi.className = "payment-option";
    upi.innerHTML = "<b>UPI · demo</b><span>Confirm instantly. No payment request or charge.</span>";
    upi.setAttribute("aria-label", `Confirm demo order using UPI, total ${formatPrice(cartTotal())}`);
    upi.addEventListener("click", () => completeDemoOrder("UPI demo"));
    const cash = document.createElement("button");
    cash.type = "button";
    cash.className = "payment-option";
    cash.innerHTML = "<b>Cash on delivery</b><span>Confirm a sample order. No real delivery.</span>";
    cash.setAttribute("aria-label", `Confirm cash on delivery demo order, total ${formatPrice(cartTotal())}`);
    cash.addEventListener("click", () => completeDemoOrder("Cash on delivery demo"));
    paymentOptions.append(upi, cash);
    const checkoutNote = document.createElement("p");
    checkoutNote.className = "checkout-note";
    checkoutNote.textContent = "Both buttons complete a demo order for this visit. No bank app opens and no payment or shipment is processed.";
    cartStateElement.append(list, summary, checkoutTitle, paymentOptions, checkoutNote);
  }

  function completeDemoOrder(paymentMethod) {
    const quantity = cartSize();
    const total = cartTotal();
    if (!quantity) return;
    const reference = `DEMO-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    state.cart = {};
    saveCart();
    updateCartBadge();
    const confirmation = document.createElement("div");
    confirmation.className = "cart-confirmation";
    const mark = document.createElement("span");
    mark.className = "confirmation-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "✓";
    const kicker = document.createElement("span");
    kicker.className = "micro-label";
    kicker.textContent = "DEMO CHECKOUT COMPLETE";
    const heading = document.createElement("h3");
    heading.textContent = "Your sample order is confirmed.";
    const summary = document.createElement("p");
    summary.textContent = `${quantity} ${quantity === 1 ? "item" : "items"} · ${formatPrice(total)} · ${paymentMethod}`;
    const detail = document.createElement("p");
    detail.textContent = paymentMethod === "UPI demo"
      ? "The UPI option completed this demonstration only. No payment request was sent and no money was collected."
      : "This cash-on-delivery choice is a demonstration only. No seller was notified and no delivery was arranged.";
    const ref = document.createElement("p");
    ref.className = "confirmation-ref";
    ref.textContent = `${reference} · LOCAL DEMO REFERENCE`;
    const continueButton = document.createElement("button");
    continueButton.type = "button";
    continueButton.className = "confirmation-continue";
    continueButton.textContent = "Continue exploring";
    continueButton.addEventListener("click", () => cartDialog.close());
    confirmation.append(mark, kicker, heading, summary, detail, ref, continueButton);
    cartStateElement.replaceChildren(confirmation);
    cartLiveStatus.textContent = `Sample order confirmed using ${paymentMethod}. No real payment was collected.`;
    announce(cartLiveStatus.textContent);
    continueButton.focus();
  }

  function openCart() {
    renderCart();
    if (!cartDialog.open) cartDialog.showModal();
    cartOpenButton.setAttribute("aria-expanded", "true");
  }
  function closeCart() {
    if (cartDialog.open) cartDialog.close();
    cartOpenButton.setAttribute("aria-expanded", "false");
  }
  cartOpenButton?.addEventListener("click", openCart);
  cartCloseButton?.addEventListener("click", closeCart);
  cartDialog?.addEventListener("close", () => cartOpenButton.setAttribute("aria-expanded", "false"));
  cartDialog?.addEventListener("click", (event) => { if (event.target === cartDialog) closeCart(); });
  document.querySelectorAll("[data-open-cart]").forEach((button) => button.addEventListener("click", openCart));
  document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.add;
      if (!productCatalog[id]) return;
      setCartQuantity(id, (state.cart[id] || 0) + 1);
      const previous = button.innerHTML;
      button.innerHTML = "Added to bag <span aria-hidden=\"true\">✓</span>";
      cartLiveStatus.textContent = `${productCatalog[id].name} added to your bag. ${cartSize()} ${cartSize() === 1 ? "item" : "items"} in your bag.`;
      announce(cartLiveStatus.textContent);
      window.setTimeout(() => { button.innerHTML = previous; }, 1400);
    });
  });
  document.querySelectorAll("[data-ask-product]").forEach((button) => {
    button.addEventListener("click", () => {
      const product = productCatalog[button.dataset.askProduct];
      if (!product) return;
      requestGaia(product.prompt);
      chatInput.focus();
      document.getElementById("gaia-ai").scrollIntoView({ behavior: prefersReducedMotion.matches ? "auto" : "smooth", block: "start" });
    });
  });
  updateCartBadge();

  // Open-Meteo is called only after the visitor chooses to share their location.
  const weatherCard = document.querySelector(".weather-card");
  const weatherValue = document.getElementById("weather-value");
  const weatherCondition = document.getElementById("weather-condition");
  const weatherLocation = document.getElementById("weather-location");
  const weatherNote = document.getElementById("weather-note");
  const weatherSource = document.getElementById("weather-source");
  const weatherUpdated = document.getElementById("weather-updated");
  const weatherState = document.getElementById("weather-state");
  const locationButton = document.getElementById("location-button");
  const weatherRefresh = document.getElementById("weather-refresh");

  function showWeatherDemo(message = "This clearly labeled example is not a current reading. Share your location to request a current weather model snapshot.") {
    weatherValue.textContent = "—";
    weatherCondition.textContent = "DEMO DATA · not a live reading";
    weatherLocation.textContent = "NO LOCATION";
    weatherNote.textContent = message;
    weatherSource.textContent = "Demo scenario · illustrative only";
    weatherUpdated.textContent = "No timestamp";
    weatherRefresh.disabled = true;
  }
  showWeatherDemo();

  function weatherDescription(code, isDay = 1) {
    if (code === 0) return isDay ? "Clear sky" : "Clear night";
    if (code === 1) return "Mostly clear";
    if (code === 2) return "Partly cloudy";
    if (code === 3) return "Overcast";
    if (code === 45 || code === 48) return "Foggy";
    if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
    if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
    if ([71, 73, 75, 77].includes(code)) return "Snow";
    if ([80, 81, 82].includes(code)) return "Rain showers";
    if ([85, 86].includes(code)) return "Snow showers";
    if ([95, 96, 99].includes(code)) return "Thunderstorm";
    return "Current conditions";
  }

  function formattedApiTime(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return "Time unavailable";
    const date = value.slice(0, 10);
    const time = value.slice(11, 16);
    return `${date} · ${time}`;
  }

  function setWeatherBusy(busy) {
    state.weatherBusy = busy;
    weatherCard.classList.toggle("is-loading", busy);
    locationButton.disabled = busy;
    weatherRefresh.disabled = busy || !state.coords;
    locationButton.textContent = busy ? "Checking conditions…" : (state.coords ? "Update location" : "Use my location");
    locationButton.insertAdjacentHTML("beforeend", busy ? "" : " <span aria-hidden=\"true\">↗</span>");
  }

  async function loadWeather(coords) {
    if (state.weatherBusy) return;
    state.coords = { latitude: coords.latitude, longitude: coords.longitude };
    setWeatherBusy(true);
    weatherState.textContent = "Requesting a weather snapshot for your location…";
    weatherValue.textContent = "…";
    weatherCondition.textContent = "Checking current conditions";
    weatherLocation.textContent = "LOCATION IN USE FOR THIS REQUEST";
    weatherNote.textContent = "Connecting to Open-Meteo. Your coordinates are not saved by this page.";
    weatherSource.textContent = "Open-Meteo · loading";
    weatherUpdated.textContent = "Updating…";

    const params = new URLSearchParams({
      latitude: String(coords.latitude),
      longitude: String(coords.longitude),
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day",
      temperature_unit: "celsius",
      timezone: "auto"
    });

    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined
      });
      if (!response.ok) throw new Error("weather-unavailable");
      const data = await response.json();
      const current = data?.current;
      const temperature = Number(current?.temperature_2m);
      if (!current || !Number.isFinite(temperature) || !Number.isFinite(Number(current.weather_code))) throw new Error("weather-unavailable");

      const unit = data?.current_units?.temperature_2m || "°C";
      const apparent = Number(current.apparent_temperature);
      const humidity = Number(current.relative_humidity_2m);
      weatherValue.textContent = `${Math.round(temperature)}${unit}`;
      weatherCondition.textContent = weatherDescription(Number(current.weather_code), Number(current.is_day));
      weatherLocation.textContent = "YOUR SHARED LOCATION";
      const context = [];
      if (Number.isFinite(apparent)) context.push(`Feels like ${Math.round(apparent)}${unit}`);
      if (Number.isFinite(humidity)) context.push(`${Math.round(humidity)}% relative humidity`);
      weatherNote.textContent = context.length
        ? `${context.join(" · ")}. A weather model snapshot describes this moment, not a climate trend.`
        : "A weather model snapshot describes this moment, not a climate trend.";
      weatherSource.textContent = "Open-Meteo · current model output";
      weatherUpdated.textContent = `Model time ${formattedApiTime(current.time)}`;
      weatherState.textContent = "Current weather model snapshot loaded. Gaia does not treat it as a climate trend.";
      weatherRefresh.disabled = false;
      announce(`Weather model updated: ${weatherValue.textContent}, ${weatherCondition.textContent}.`);
    } catch {
      state.coords = null;
      showWeatherDemo("Live weather is temporarily unavailable. This example is illustrative only and is not a local measurement.");
      weatherState.textContent = "Live weather is temporarily unavailable; showing clearly labeled demo data.";
      announce("Live weather is temporarily unavailable. The panel is showing labeled demo data.");
    } finally {
      setWeatherBusy(false);
    }
  }

  function requestLocation() {
    if (state.weatherBusy) return;
    if (!navigator.geolocation) {
      showWeatherDemo("This browser cannot share a location. The example remains demo data, not a local measurement.");
      weatherState.textContent = "Location is not available in this browser.";
      return;
    }
    if (weatherCard) weatherCard.classList.add("is-loading");
    state.weatherBusy = true;
    locationButton.disabled = true;
    locationButton.textContent = "Requesting location…";
    weatherRefresh.disabled = true;
    weatherState.textContent = "Your browser will ask whether Gaia can use your location for a weather request.";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.weatherBusy = false;
        loadWeather({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      (error) => {
        state.weatherBusy = false;
        setWeatherBusy(false);
        state.coords = null;
        const message = error?.code === 1
          ? "Location was not shared. Live weather remains off; you can choose again at any time."
          : "We could not reach your location. The example below remains demo data, not a local measurement.";
        showWeatherDemo(message);
        weatherState.textContent = error?.code === 1 ? "Location was not shared." : "Location is temporarily unavailable.";
        announce(weatherState.textContent);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  }
  locationButton?.addEventListener("click", requestLocation);
  weatherRefresh?.addEventListener("click", () => {
    if (state.coords) loadWeather(state.coords);
  });

  // Chat
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const welcome = document.getElementById("welcome-state");
  const sendButton = chatForm?.querySelector(".send-button");
  const chatStatus = document.getElementById("chat-status");
  const newChatButton = document.getElementById("clear-chat");

  function localKnowledgeReply(rawMessage) {
    const currentMatch = rawMessage.match(/current question:\s*([\s\S]*)$/i);
    const question = (currentMatch ? currentMatch[1] : rawMessage).trim();
    const text = question.toLowerCase();
    const needsLive = /\b(current|right now|today|latest|live|this week|this year|temperature|air quality|weather now)\b/.test(text);
    const offlineLead = "I’m answering from Gaia’s offline environmental guide. ";
    let reply;

    if (/\b(field bottle|steel refill bottle|stainless steel bottle|water bottle)\b/.test(text)) {
      reply = "The Field Bottle is a sample listing for a stainless steel, 750 ml refill bottle, priced at ₹899 in the demo catalog. It is described for everyday refills. The listing does not tell us where the steel came from, how long the bottle will last, or whether it has any certification. Those details are worth checking with a seller. Reusing a bottle is most useful when it fits your routine and you keep using it.";
    } else if (/\b(everyday tote|carry-all cotton tote|cotton tote)\b/.test(text)) {
      reply = "The Everyday Tote is a sample listing for a reusable cotton carry bag, priced at ₹349 in the demo catalog. Cotton by itself does not prove a product has a lower impact. Consider how it was made, how durable it is, and whether you will reuse it often. Check the seller's material details and any certification before buying.";
    } else if (/\b(recycled paper journal|paper journal|field notes)\b/.test(text)) {
      reply = "The Field Notes journal is listed as a 96-page notebook made with recycled paper, priced at ₹279 in the demo catalog. The listing does not specify a recycled-content percentage or certification. You could check the packaging for material details and get more value from it by using the whole notebook before choosing another.";
    } else if (/\b(dish brush|replaceable-head brush|replaceable head brush|home brush)\b/.test(text)) {
      reply = "The Home Brush is a sample listing for a dish brush with a wood handle and replaceable head, priced at ₹449 in the demo catalog. Its design may let you keep using the handle, but it is worth checking whether replacement heads are easy to find and what they are made from. The listing makes no certification or impact claim.";
    } else if (/\b(product|brand|model|buy|purchase|sustainable product|eco-friendly product)\b/.test(text)) {
      reply = "I can help compare a specific product, but I need its name and the details on the label or seller page. Useful questions include: what materials are used, how long it is likely to last, can it be repaired or refilled, what happens at end of use, and what evidence supports any environmental claim? A green label by itself is not enough to establish a product's impact.";
    } else if (/\b(coral|ocean|reef|sea|marine)\b/.test(text)) {
      reply = "Coral reefs are affected by warmer ocean water, pollution, destructive fishing and habitat damage. Heat stress can cause corals to lose the algae that provide much of their energy. This is called bleaching; it does not always mean the coral is already dead. Protecting water quality and reducing climate pollution can lower pressure on reefs. Local conservation groups can explain which actions matter most nearby.";
    } else if (/\b(climate|global warming|greenhouse|emission|carbon)\b/.test(text)) {
      reply = "Climate change is a long-term shift in Earth's climate. Human activities that release greenhouse gases are warming the planet. Gaia can help organize observations and explain possible risks, but a sound prediction needs suitable data and local context. Useful responses include cleaner energy, efficient buildings, resilient communities and protecting ecosystems. If you are asking what is happening right now, that needs a current, location-specific data source.";
    } else if (/\b(renewable|solar|wind|clean energy|energy)\b/.test(text)) {
      reply = "Solar and wind power generate electricity without burning fuel while they operate. They work best alongside efficient energy use, reliable grids and ways to balance supply when sunshine or wind changes. AI can help forecast demand or renewable output, but people still decide how energy systems are planned and who they serve.";
    } else if (/\b(biodiversity|species|wildlife|habitat|forest|deforest|tree|ecosystem)\b/.test(text)) {
      reply = "Biodiversity is the variety of life and the relationships that keep ecosystems working. Habitat loss, pollution, climate change and overuse of natural resources can put species under pressure. Protecting connected habitats and supporting local stewardship are practical starting points. AI may help compare images or organize records, but those signals need expert and community review.";
    } else if (/\b(pollution|air quality|air pollution|smog|plastic|waste|litter)\b/.test(text)) {
      reply = "Pollution can harm people and ecosystems through dirty air, contaminated water, plastics and hazardous waste. Useful action starts by identifying the source, then preventing or reducing it where possible. AI can help organize reports or flag patterns for human review; it cannot replace reliable measurements, inspections or local knowledge. I do not have a live pollution reading in this conversation.";
    } else if (/\b(water|drought|scarcity|conserv|river|freshwater)\b/.test(text)) {
      reply = "Fresh water is limited and unevenly available. Pollution, inefficient use and changing rainfall can make access harder for people and ecosystems. Protecting watersheds, repairing leaks and choosing water-wise practices can help, while communities decide how scarce water is shared fairly. A current water-supply question needs local data rather than a guess.";
    } else if (/\b(city|cities|urban|transport|building|smart city)\b/.test(text)) {
      reply = "A more sustainable city can make everyday needs easier to reach with less pollution: reliable public transport, safe walking and cycling, efficient buildings, green spaces and clean energy all help. AI can support planning by finding patterns in city information, but residents should help shape decisions that affect their neighborhoods.";
    } else if (/\b(ai|artificial intelligence|machine learning|technology)\b/.test(text)) {
      reply = "AI can help sort large collections of environmental information, spot patterns for people to check and compare possible responses. It works only as well as the information and context it receives. It can miss people and places that are poorly represented, so experts and communities need to review its suggestions before action.";
    } else if (/\b(today|one action|what can i do|everyday|daily|action|start)\b/.test(text)) {
      reply = "Choose one step that fits your life: use less energy, repair or reuse an item, walk or share a short trip, or learn what local nature needs. Small actions matter most when they become practical habits and connect to wider community changes. You do not have to do everything at once.";
    } else {
      reply = "I can help explain climate change, clean energy, biodiversity, pollution, water, forests, oceans, sustainable cities or everyday actions. Tell me which part of the planet you are curious about, and we can start there. If your question needs a current measurement, it should be checked against a live, local source.";
    }

    if (needsLive) {
      reply += "\n\nI do not have a live reading for that question here. Use the weather panel for a current local weather snapshot, or check an authoritative local environmental source for other live conditions.";
    }
    return offlineLead + reply;
  }

  function safeInlineText(parent, line) {
    const pieces = line.split(/(\*\*[^*]+\*\*)/g);
    pieces.forEach((piece) => {
      if (!piece) return;
      if (piece.startsWith("**") && piece.endsWith("**")) {
        const strong = document.createElement("strong");
        strong.textContent = piece.slice(2, -2);
        parent.append(strong);
      } else {
        parent.append(document.createTextNode(piece));
      }
    });
  }

  function renderAssistantBody(container, text) {
    const lines = String(text).replace(/\r/g, "").split("\n");
    let paragraph = [];
    let list = null;
    const flushParagraph = () => {
      if (!paragraph.length) return;
      const p = document.createElement("p");
      safeInlineText(p, paragraph.join(" "));
      container.append(p);
      paragraph = [];
    };
    const flushList = () => { if (list) { container.append(list); list = null; } };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) { flushParagraph(); flushList(); return; }
      if (/^(?:[-*•])\s+/.test(trimmed)) {
        flushParagraph();
        if (!list) list = document.createElement("ul");
        const item = document.createElement("li");
        safeInlineText(item, trimmed.replace(/^(?:[-*•])\s+/, ""));
        list.append(item);
        return;
      }
      flushList();
      if (/^#{1,3}\s+/.test(trimmed)) {
        flushParagraph();
        const heading = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = trimmed.replace(/^#{1,3}\s+/, "");
        heading.append(strong);
        container.append(heading);
      } else paragraph.push(trimmed);
    });
    flushParagraph();
    flushList();
  }

  function formatChatTime(date = new Date()) {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  }

  function makeMessage(role, text, options = {}) {
    return {
      id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      text,
      time: formatChatTime(),
      offline: Boolean(options.offline),
      retryContext: options.retryContext || ""
    };
  }

  function buildContext(currentQuestion) {
    const recent = state.messages.slice(-6).map((message) => {
      const speaker = message.role === "user" ? "Visitor" : "Gaia";
      return `${speaker}: ${message.text.slice(0, 1200)}`;
    }).join("\n");
    return recent
      ? `Conversation context (recent, for continuity only):\n${recent}\n\nCurrent question:\n${currentQuestion}`
      : currentQuestion;
  }

  function setComposerBusy(busy) {
    state.sending = busy;
    chatInput.disabled = busy;
    sendButton.disabled = busy;
    document.querySelectorAll(".quick-action, .welcome-prompts button, .ask-product").forEach((button) => { button.disabled = busy; });
    chatStatus.textContent = busy ? "Gaia is thinking." : "";
  }

  function renderMessage(message) {
    welcome.hidden = state.messages.length > 0;
    const article = document.createElement("article");
    article.className = `message ${message.role === "user" ? "user-message" : "gaia-message"}`;
    article.dataset.messageId = message.id;

    if (message.role !== "user") {
      const avatar = document.createElement("span");
      avatar.className = "message-avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = "✳";
      article.append(avatar);
    }

    const content = document.createElement("div");
    content.className = "message-content";
    const meta = document.createElement("div");
    meta.className = "message-meta";
    meta.textContent = `${message.role === "user" ? "YOU" : "GAIA AI"} · ${message.time}`;
    const text = document.createElement("div");
    text.className = "message-body";
    if (message.role === "user") {
      const p = document.createElement("p");
      p.textContent = message.text;
      text.append(p);
    } else {
      renderAssistantBody(text, message.text);
    }
    content.append(meta, text);

    if (message.role !== "user") {
      const actions = document.createElement("div");
      actions.className = "message-actions";
      const copy = document.createElement("button");
      copy.type = "button";
      copy.textContent = "Copy";
      copy.setAttribute("aria-label", "Copy Gaia's response");
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(message.text);
          copy.textContent = "Copied";
          announce("Gaia’s response copied.");
        } catch {
          copy.textContent = "Select to copy";
          announce("Clipboard access is unavailable. You can select the response text to copy it.");
        }
        window.setTimeout(() => { copy.textContent = "Copy"; }, 1800);
      });
      actions.append(copy);

      ["Helpful", "Not helpful"].forEach((label) => {
        const feedback = document.createElement("button");
        feedback.type = "button";
        feedback.textContent = label === "Helpful" ? "Useful" : "Needs more";
        feedback.setAttribute("aria-label", `Mark this response ${label.toLowerCase()}`);
        feedback.setAttribute("aria-pressed", "false");
        feedback.addEventListener("click", () => {
          actions.querySelectorAll("button[aria-pressed]").forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === feedback)));
          announce("Thank you for the feedback.");
        });
        actions.append(feedback);
      });

      if (message.offline) {
        const note = document.createElement("span");
        note.className = "offline-note";
        note.textContent = "Offline guide";
        actions.append(note);
        if (message.retryContext) {
          const retry = document.createElement("button");
          retry.type = "button";
          retry.textContent = "Retry connection";
          retry.addEventListener("click", () => requestGaia(message.retryContext, { retry: true }));
          actions.append(retry);
        }
      }
      content.append(actions);
    }

    article.append(content);
    chatMessages.append(article);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTyping() {
    document.querySelector(".typing-row")?.remove();
    const row = document.createElement("div");
    row.className = "typing-row";
    row.setAttribute("aria-label", "Gaia is preparing a response");
    row.innerHTML = '<span class="typing-emblem" aria-hidden="true"><i></i></span><span class="typing-label">GAIA IS CONNECTING THE SIGNALS</span>';
    chatMessages.append(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function requestGaia(prompt, options = {}) {
    if (state.sending) return;
    const text = String(prompt || "").trim();
    if (!text) return;
    const context = options.retry ? text : buildContext(text);
    if (!options.retry) {
      const userMessage = makeMessage("user", text);
      state.messages.push(userMessage);
      renderMessage(userMessage);
    }
    setComposerBusy(true);
    showTyping();

    let reply;
    let offline = false;
    let retryAvailable = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ message: context }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error("unavailable");
      const data = await response.json();
      if (typeof data?.reply !== "string" || !data.reply.trim()) throw new Error("unavailable");
      reply = data.reply.trim();
      offline = reply.startsWith("I’m answering from Gaia’s offline environmental guide.");
    } catch {
      offline = true;
      retryAvailable = true;
      reply = localKnowledgeReply(context);
    } finally {
      window.clearTimeout(timeoutId);
      document.querySelector(".typing-row")?.remove();
      setComposerBusy(false);
    }

    const assistantMessage = makeMessage("assistant", reply, { offline, retryContext: retryAvailable ? text : "" });
    state.messages.push(assistantMessage);
    renderMessage(assistantMessage);
    if (offline) chatStatus.textContent = "Gaia answered using its offline environmental guide. You can retry the connection if you want a connected response.";
    else chatStatus.textContent = "Gaia replied.";
    chatInput.focus();
  }

  chatForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.sending) return;
    const text = chatInput.value.trim();
    if (!text) {
      chatInput.focus();
      return;
    }
    chatInput.value = "";
    chatInput.style.height = "auto";
    requestGaia(text);
  });
  chatInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      chatForm.requestSubmit();
    }
  });
  chatInput?.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 116)}px`;
  });

  document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.sending) return;
      requestGaia(button.dataset.prompt);
      chatInput.focus();
      document.getElementById("gaia-ai").scrollIntoView({ behavior: prefersReducedMotion.matches ? "auto" : "smooth", block: "start" });
    });
  });

  newChatButton?.addEventListener("click", () => {
    if (state.sending) return;
    state.messages = [];
    chatMessages.querySelectorAll(".message, .typing-row").forEach((message) => message.remove());
    welcome.hidden = false;
    chatStatus.textContent = "New conversation started.";
    chatInput.focus();
  });

  // A small, local intention picker gives the closing call to action a real next step.
  const missionForm = document.getElementById("mission-form");
  const missionChoice = document.getElementById("mission-choice");
  const missionFeedback = document.getElementById("mission-feedback");
  missionForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    missionFeedback.classList.remove("is-success", "is-error");
    if (!missionChoice.value) {
      missionFeedback.textContent = "Choose one action to set your intention.";
      missionFeedback.classList.add("is-error");
      missionChoice.setAttribute("aria-invalid", "true");
      missionChoice.focus();
      return;
    }
    missionChoice.removeAttribute("aria-invalid");
    const action = missionChoice.value;
    missionFeedback.textContent = `Your next step: ${action}. Start small and make it repeatable. Nothing was sent or saved.`;
    missionFeedback.classList.add("is-success");
    announce("Your intention is set for this visit.");
  });
  missionChoice?.addEventListener("change", () => {
    missionChoice.removeAttribute("aria-invalid");
    if (missionFeedback.classList.contains("is-error")) {
      missionFeedback.textContent = "Your choice stays in this page; nothing is sent or stored.";
      missionFeedback.classList.remove("is-error");
    }
  });
})();
