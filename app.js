const UG_LOCATIONS = ["Kampala", "Entebbe", "Wakiso", "Mukono", "Jinja", "Mbarara", "Gulu", "Mbale", "Arua", "Fort Portal"];
const MAKES = ["Toyota", "Mercedes-Benz", "BMW", "Subaru", "Nissan", "Honda", "Mitsubishi", "Land Rover"];
const STORAGE = {
  listings: "mt_listings",
  users: "mt_users",
  session: "mt_session",
  favorites: "mt_favorites",
  messages: "mt_messages",
  compare: "mt_compare"
};

const FREE_POSTING_DAYS = 60;
const POST_LIMIT_AFTER_TRIAL = 2;
const MIN_PHOTOS = 3;
const MAX_PHOTOS = 10;
let hydratingPermanentState = false;
let persistTimer = null;

const seedListings = [
  {
    id: "seed-harrier",
    make: "Toyota",
    model: "Harrier",
    year: 2018,
    price: 98000000,
    mileage: 64000,
    transmission: "Automatic",
    fuel: "Petrol",
    body: "SUV",
    location: "Kampala",
    seller: "Verified Dealer",
    verified: true,
    premium: true,
    images: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=84",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=84"
    ]
  },
  {
    id: "seed-prado",
    make: "Toyota",
    model: "Land Cruiser Prado",
    year: 2017,
    price: 185000000,
    mileage: 82000,
    transmission: "Automatic",
    fuel: "Diesel",
    body: "SUV",
    location: "Wakiso",
    seller: "Motor Traders Partner",
    verified: true,
    premium: true,
    images: [
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=900&q=84",
      "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=900&q=84"
    ]
  },
  {
    id: "seed-premio",
    make: "Toyota",
    model: "Premio",
    year: 2014,
    price: 46000000,
    mileage: 97000,
    transmission: "Automatic",
    fuel: "Petrol",
    body: "Sedan",
    location: "Jinja",
    seller: "Private Seller",
    verified: false,
    premium: false,
    images: [
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=84"
    ]
  },
  {
    id: "seed-wish",
    make: "Toyota",
    model: "Wish",
    year: 2015,
    price: 52000000,
    mileage: 88000,
    transmission: "Automatic",
    fuel: "Petrol",
    body: "Van",
    location: "Mbarara",
    seller: "Verified Dealer",
    verified: true,
    premium: false,
    images: [
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=900&q=84"
    ]
  },
  {
    id: "seed-noah",
    make: "Toyota",
    model: "Noah",
    year: 2016,
    price: 68000000,
    mileage: 76000,
    transmission: "Automatic",
    fuel: "Petrol",
    body: "Van",
    location: "Gulu",
    seller: "Verified Dealer",
    verified: true,
    premium: false,
    images: [
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=900&q=84"
    ]
  },
  {
    id: "seed-bmw",
    make: "BMW",
    model: "X5 xDrive40i",
    year: 2020,
    price: 255000000,
    mileage: 42000,
    transmission: "Automatic",
    fuel: "Petrol",
    body: "SUV",
    location: "Kampala",
    seller: "Premium Imports Uganda",
    verified: true,
    premium: true,
    images: [
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=900&q=84"
    ]
  }
];

function readStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  if (!hydratingPermanentState) schedulePermanentPersist();
}

function ensureSeedData() {
  if (!localStorage.getItem(STORAGE.listings)) writeStore(STORAGE.listings, seedListings);
  if (!localStorage.getItem(STORAGE.users)) writeStore(STORAGE.users, []);
}

function getListings() {
  ensureSeedData();
  return readStore(STORAGE.listings, []);
}

function saveListings(listings) {
  writeStore(STORAGE.listings, listings);
}

function canUsePermanentServer() {
  return location.protocol === "http:" || location.protocol === "https:";
}

async function loadPermanentState() {
  if (!canUsePermanentServer()) return;
  try {
    const response = await fetch("/api/state");
    if (!response.ok) throw new Error("Database unavailable");
    const state = await response.json();
    hydratingPermanentState = true;
    Object.values(STORAGE).forEach((key) => {
      if (key === STORAGE.session) return;
      if (state[key] !== undefined && state[key] !== null) {
        localStorage.setItem(key, JSON.stringify(state[key]));
      }
    });
    hydratingPermanentState = false;
  } catch (error) {
    hydratingPermanentState = false;
    console.warn("Permanent database unavailable, using browser storage.", error);
  }
}

function schedulePermanentPersist() {
  if (!canUsePermanentServer()) return;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistPermanentState, 350);
}

async function persistPermanentState() {
  if (!canUsePermanentServer()) return;
  const payload = {};
  Object.values(STORAGE).forEach((key) => {
    if (key === STORAGE.session) return;
    payload[key] = readStore(key, []);
  });
  try {
    await fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.warn("Could not save permanent database state.", error);
  }
}

function formatUgx(amount) {
  return `UGX ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(amount) || 0)}`;
}

function toast(message) {
  const el = document.querySelector("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 3200);
}

function whatsappUrl(message) {
  return `https://wa.me/25678526797?text=${encodeURIComponent(message)}`;
}

function currentUser() {
  const id = localStorage.getItem(STORAGE.session);
  if (!id) return null;
  return readStore(STORAGE.users, []).find((user) => user.id === id) || null;
}

function accountAgeDays(user) {
  const createdAt = user && user.createdAt ? new Date(user.createdAt).getTime() : Date.now();
  return Math.floor((Date.now() - createdAt) / 86400000);
}

function hasGoldenAccess(user) {
  return user && accountAgeDays(user) < FREE_POSTING_DAYS;
}

function canPostMoreCars(user, listings) {
  if (!user) return { ok: false, message: "Create an account or log in before posting a car." };
  if (hasGoldenAccess(user)) return { ok: true, message: "Golden trial active." };
  if (user.plan === "golden" || user.plan === "golden400") return { ok: true, message: "Golden package active." };
  if (user.plan === "premium30") return { ok: true, message: "Premium package active." };
  const owned = listings.filter((listing) => listing.ownerId === user.id).length;
  if (owned >= POST_LIMIT_AFTER_TRIAL) {
    return { ok: false, message: "Your 2-month free golden access has ended. Basic Free accounts can only post 2 cars. Choose Premium or Golden to post more." };
  }
  return { ok: true, message: "Free posting limit available." };
}

function updateNavState() {
  const user = currentUser();
  document.querySelectorAll("[data-user-name]").forEach((el) => {
    el.textContent = user ? user.name : "Account";
  });
}

function populateSelect(select, values, placeholder) {
  if (!select) return;
  select.innerHTML = [`<option value="">${placeholder}</option>`, ...values.map((v) => `<option>${v}</option>`)].join("");
}

function listingCard(car) {
  const title = `${car.year} ${car.make} ${car.model}`;
  const dots = (car.images || []).slice(0, 4).map(() => "<span></span>").join("");
  return `
    <article class="car-card">
      <div class="car-media">
        <img src="${(car.images && car.images[0]) || seedListings[0].images[0]}" alt="${title}" loading="lazy">
        ${car.premium ? `<span class="car-badge premium-badge">Featured</span>` : ""}
        <div class="image-dots">${dots}</div>
      </div>
      <div class="car-body">
        <h3 class="car-title">${title}</h3>
        <div class="price">${formatUgx(car.price)}</div>
        <div class="meta-grid">
          <span>${Number(car.mileage || 0).toLocaleString()} km</span>
          <span>${car.transmission}</span>
          <span>${car.fuel}</span>
          <span>${car.location}</span>
        </div>
        <div class="card-actions">
          ${car.verified ? `<span class="verified-badge">Verified seller</span>` : ""}
          <button class="button-ghost" data-favorite="${car.id}" type="button">Save</button>
          <button class="button-ghost" data-compare="${car.id}" type="button">Compare</button>
          <button class="button" data-message-seller="${car.id}" type="button">Message Seller</button>
        </div>
      </div>
    </article>
  `;
}

function initHomepage() {
  const grid = document.querySelector("#featuredGrid");
  if (!grid) return;
  populateSelect(document.querySelector("#makeFilter"), MAKES, "Any make");
  populateSelect(document.querySelector("#locationFilter"), UG_LOCATIONS, "Any location");
  renderListings(getListings());

  document.querySelector("#searchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const maxPrice = Number(form.get("price") || 0);
    const filtered = getListings().filter((car) => {
      const tests = [
        !form.get("make") || car.make === form.get("make"),
        !form.get("model") || car.model.toLowerCase().includes(String(form.get("model")).toLowerCase()),
        !form.get("year") || Number(car.year) >= Number(form.get("year")),
        !maxPrice || Number(car.price) <= maxPrice,
        !form.get("transmission") || car.transmission === form.get("transmission"),
        !form.get("fuel") || car.fuel === form.get("fuel"),
        !form.get("body") || car.body === form.get("body"),
        !form.get("location") || car.location === form.get("location")
      ];
      return tests.every(Boolean);
    });
    renderListings(filtered);
    toast(filtered.length ? `${filtered.length} cars found.` : "No exact match found.");
  });

  function renderListings(listings) {
    grid.innerHTML = listings.map(listingCard).join("") || `<div class="empty">No cars match these filters.</div>`;
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readImages(input, previewGrid) {
  const selected = Array.from(input.files || []);
  if (selected.length > MAX_PHOTOS) {
    toast(`Maximum ${MAX_PHOTOS} photos allowed. The first ${MAX_PHOTOS} were selected.`);
  }
  const files = selected.slice(0, MAX_PHOTOS);
  const images = await Promise.all(files.map(fileToDataUrl));
  previewGrid.innerHTML = images.map((src, index) => `
    <div class="preview-card">
      <img src="${src}" alt="Car upload ${index + 1}">
      <button type="button" data-remove-preview="${index}" aria-label="Remove photo">x</button>
    </div>
  `).join("");
  previewGrid.dataset.images = JSON.stringify(images);
}

function initSellPage() {
  const form = document.querySelector("#sellForm");
  if (!form) return;
  populateSelect(document.querySelector("#sellMake"), MAKES, "Select make");
  populateSelect(document.querySelector("#sellLocation"), UG_LOCATIONS, "Select city");
  const params = new URLSearchParams(location.search);
  const editId = params.get("edit");
  const listings = getListings();
  const editing = listings.find((listing) => listing.id === editId);
  const previewGrid = document.querySelector("#previewGrid");

  if (editing) {
    form.querySelector("[name=make]").value = editing.make;
    form.querySelector("[name=model]").value = editing.model;
    form.querySelector("[name=year]").value = editing.year;
    form.querySelector("[name=engine]").value = editing.engine || "";
    form.querySelector("[name=price]").value = editing.price;
    form.querySelector("[name=mileage]").value = editing.mileage;
    form.querySelector("[name=transmission]").value = editing.transmission;
    form.querySelector("[name=fuel]").value = editing.fuel;
    form.querySelector("[name=body]").value = editing.body;
    form.querySelector("[name=location]").value = editing.location;
    form.querySelector("[name=description]").value = editing.description || "";
    form.querySelector("[name=plan]").value = editing.plan === "golden400" ? "golden" : editing.plan || "basic";
    form.querySelector("[name=paymentMethod]").value = editing.paymentMethod || "";
    previewGrid.dataset.images = JSON.stringify(editing.images || []);
    previewGrid.innerHTML = (editing.images || []).map((src, index) => `<div class="preview-card"><img src="${src}" alt="Saved car photo ${index + 1}"><button type="button" data-remove-preview="${index}">x</button></div>`).join("");
  }

  document.querySelector("#carPhotos").addEventListener("change", (event) => readImages(event.currentTarget, previewGrid));
  previewGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-preview]");
    if (!button) return;
    const images = JSON.parse(previewGrid.dataset.images || "[]");
    images.splice(Number(button.dataset.removePreview), 1);
    previewGrid.dataset.images = JSON.stringify(images);
    previewGrid.innerHTML = images.map((src, index) => `<div class="preview-card"><img src="${src}" alt="Car upload ${index + 1}"><button type="button" data-remove-preview="${index}">x</button></div>`).join("");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const user = currentUser();
    if (!user) {
      toast("Create an account or log in before posting a car.");
      setTimeout(() => location.href = "auth.html", 650);
      return;
    }

    const data = new FormData(form);
    const images = JSON.parse(previewGrid.dataset.images || "[]");
    if (images.length < MIN_PHOTOS) {
      toast(`Upload at least ${MIN_PHOTOS} car photos before posting.`);
      return;
    }
    if (images.length > MAX_PHOTOS) {
      toast(`You can upload a maximum of ${MAX_PHOTOS} photos.`);
      return;
    }
    const postAccess = editing ? { ok: true } : canPostMoreCars(user, listings);
    if (!postAccess.ok) {
      toast(postAccess.message);
      return;
    }
    const plan = data.get("plan") || "basic";
    if (plan !== "basic" && !data.get("paymentMethod")) {
      toast("Choose Mobile Money or Visa for Premium or Golden payment.");
      return;
    }
    const listing = {
      id: editing ? editing.id : `car-${Date.now()}`,
      ownerId: user.id,
      seller: user.name,
      verified: user.verified || false,
      premium: plan !== "basic",
      plan,
      paymentMethod: data.get("paymentMethod") || "",
      make: data.get("make"),
      model: data.get("model"),
      year: Number(data.get("year")),
      engine: data.get("engine"),
      price: Number(data.get("price")),
      mileage: Number(data.get("mileage")),
      transmission: data.get("transmission"),
      fuel: data.get("fuel"),
      body: data.get("body"),
      location: data.get("location"),
      description: data.get("description"),
      images
    };
    const next = editing ? listings.map((item) => item.id === editing.id ? listing : item) : [listing, ...listings];
    saveListings(next);
    if (plan !== "basic") {
      const users = readStore(STORAGE.users, []).map((item) => item.id === user.id ? { ...item, plan } : item);
      writeStore(STORAGE.users, users);
    }
    toast(editing ? "Listing updated successfully." : "Listing posted successfully.");
    setTimeout(() => location.href = "dashboard.html", 700);
  });
}

function initAuth() {
  const auth = document.querySelector("#authCard");
  if (!auth) return;
  const forms = document.querySelectorAll("[data-auth-form]");
  document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-auth-tab]").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      forms.forEach((form) => form.hidden = form.dataset.authForm !== tab.dataset.authTab);
    });
  });

  document.querySelector("#googleLogin").addEventListener("click", () => {
    const users = readStore(STORAGE.users, []);
    const input = document.querySelector("#googleEmail");
    const email = String(input.value || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast("Enter a valid Google email address.");
      input.focus();
      return;
    }
    const existing = users.find((user) => String(user.email).toLowerCase() === email);
    const user = existing ? {
      ...existing,
      provider: existing.provider || "google",
      verified: true,
      createdAt: existing.createdAt || new Date().toISOString(),
      plan: existing.plan || "basic"
    } : {
      id: `google-${Date.now()}`,
      name: email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      email,
      phone: "+256",
      password: "",
      provider: "google",
      verified: true,
      plan: "basic",
      createdAt: new Date().toISOString()
    };
    writeStore(STORAGE.users, existing ? users.map((item) => item.id === user.id ? user : item) : [...users, user]);
    localStorage.setItem(STORAGE.session, user.id);
    toast("Signed in with Google.");
    setTimeout(() => location.href = "dashboard.html", 500);
  });

  document.querySelector("#registerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const users = readStore(STORAGE.users, []);
    if (users.some((user) => user.email === form.get("email"))) return toast("That email is already registered.");
    const user = {
      id: `user-${Date.now()}`,
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      password: form.get("password"),
      verified: false,
      plan: "basic",
      createdAt: new Date().toISOString()
    };
    writeStore(STORAGE.users, [...users, user]);
    localStorage.setItem(STORAGE.session, user.id);
    toast("Account created.");
    setTimeout(() => location.href = "dashboard.html", 500);
  });

  document.querySelector("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const user = readStore(STORAGE.users, []).find((item) => item.email === form.get("email") && item.password === form.get("password"));
    if (!user) return toast("Invalid login details.");
    localStorage.setItem(STORAGE.session, user.id);
    toast("Logged in.");
    setTimeout(() => location.href = "dashboard.html", 500);
  });

  document.querySelector("#resetForm").addEventListener("submit", (event) => {
    event.preventDefault();
    toast("Password reset link prepared. Connect email service in the backend.");
  });
}

function initDashboard() {
  const dashboard = document.querySelector("#dashboardListings");
  if (!dashboard) return;
  const user = currentUser();
  if (!user) {
    location.href = "auth.html";
    return;
  }
  document.querySelector("#profileName").value = user.name;
  document.querySelector("#profilePhone").value = user.phone || "";
  document.querySelector("#profileEmail").value = user.email;

  const listings = getListings().filter((listing) => listing.ownerId === user.id);
  const access = canPostMoreCars(user, getListings());
  const daysLeft = Math.max(0, FREE_POSTING_DAYS - accountAgeDays(user));
  const messages = readStore(STORAGE.messages, []).filter((message) => message.buyerId === user.id || message.sellerId === user.id);
  const listingStatus = document.querySelector("#listingStatus");
  const planStatus = document.querySelector("#planStatus");
  const messageStatus = document.querySelector("#messageStatus");
  if (listingStatus) listingStatus.textContent = `${listings.length} active listing${listings.length === 1 ? "" : "s"}. ${access.ok ? access.message : "Free posting limit reached."}`;
  if (planStatus) planStatus.textContent = hasGoldenAccess(user) ? `Golden free access active. ${daysLeft} day${daysLeft === 1 ? "" : "s"} left.` : `Current package: ${user.plan || "basic"}. Basic Free accounts are limited to 2 car postings.`;
  if (messageStatus) messageStatus.textContent = `${messages.length} private message${messages.length === 1 ? "" : "s"} saved. Seller phone contacts stay hidden.`;
  dashboard.innerHTML = listings.map((car) => `
    <div class="listing-row">
      <img src="${(car.images && car.images[0]) || seedListings[0].images[0]}" alt="${car.make} ${car.model}">
      <div>
        <strong>${car.year} ${car.make} ${car.model}</strong>
        <p>${formatUgx(car.price)} · ${car.location} · ${car.mileage.toLocaleString()} km</p>
      </div>
      <div class="card-actions">
        <a class="button-secondary" href="sell.html?edit=${car.id}">Edit</a>
        <button class="button-ghost" data-delete="${car.id}" type="button">Delete</button>
      </div>
    </div>
  `).join("") || `<div class="empty">You have not posted any cars yet.</div>`;

  document.querySelector("#profileForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const users = readStore(STORAGE.users, []).map((item) => item.id === user.id ? { ...item, name: form.get("name"), phone: form.get("phone") } : item);
    writeStore(STORAGE.users, users);
    toast("Profile updated.");
  });

  dashboard.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete]");
    if (!button) return;
    saveListings(getListings().filter((listing) => listing.id !== button.dataset.delete));
    toast("Listing removed.");
    setTimeout(() => location.reload(), 500);
  });

  document.querySelector("#logout").addEventListener("click", () => {
    localStorage.removeItem(STORAGE.session);
    location.href = "index.html";
  });
}

document.addEventListener("click", (event) => {
  const favorite = event.target.closest("[data-favorite]");
  if (favorite) {
    const saved = new Set(readStore(STORAGE.favorites, []));
    saved.has(favorite.dataset.favorite) ? saved.delete(favorite.dataset.favorite) : saved.add(favorite.dataset.favorite);
    writeStore(STORAGE.favorites, [...saved]);
    toast("Saved cars updated.");
  }
  const compare = event.target.closest("[data-compare]");
  if (compare) {
    const list = readStore(STORAGE.compare, []);
    if (!list.includes(compare.dataset.compare) && list.length >= 3) return toast("You can compare up to 3 cars.");
    writeStore(STORAGE.compare, list.includes(compare.dataset.compare) ? list.filter((id) => id !== compare.dataset.compare) : [...list, compare.dataset.compare]);
    toast("Comparison list updated.");
  }
  const messageButton = event.target.closest("[data-message-seller]");
  if (messageButton) {
    const user = currentUser();
    if (!user) {
      toast("Log in to message the seller. Seller contact details are private.");
      setTimeout(() => location.href = "auth.html", 650);
      return;
    }
    const car = getListings().find((listing) => listing.id === messageButton.dataset.messageSeller);
    if (!car) return toast("Car listing was not found.");
    const messages = readStore(STORAGE.messages, []);
    writeStore(STORAGE.messages, [
      ...messages,
      {
        id: `msg-${Date.now()}`,
        listingId: car.id,
        buyerId: user.id,
        sellerId: car.ownerId || "platform",
        createdAt: new Date().toISOString(),
        text: `Buyer is interested in ${car.year} ${car.make} ${car.model}.`
      }
    ]);
    toast("Private message sent. Seller contact details remain hidden.");
  }
});

async function boot() {
  await loadPermanentState();
  ensureSeedData();
  updateNavState();
  initHomepage();
  initSellPage();
  initAuth();
  initDashboard();
}

boot();
