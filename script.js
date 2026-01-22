"use strict";

/* =========================
   HOA Auction — script.js
   ✅ login + prebid + live + admin + display
   ✅ LocalStorage + BroadcastChannel (للتجربة)
========================= */

const bc = ("BroadcastChannel" in window) ? new BroadcastChannel(CHANNEL_NAME) : null;

/* ---------- Helpers ---------- */
function formatPrice(num) { return Number(num || 0).toLocaleString("ar-IQ"); }
function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function writeJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function now() { return Date.now(); }

function readBidder() { return readJSON("hoa_bidder", null); }
function saveBidder(data) { writeJSON("hoa_bidder", data); }

function readPrebids() { return readJSON("hoa_prebids", {}); }
function savePrebids(obj) { writeJSON("hoa_prebids", obj); }

function readState() { return readJSON("hoa_live_state", null); }
function saveState(state) {
  writeJSON("hoa_live_state", state);
  bc?.postMessage({ type: "state", state });
}
function readLiveBids() { return readJSON("hoa_live_bids", []); }
function saveLiveBids(list) {
  writeJSON("hoa_live_bids", list);
  bc?.postMessage({ type: "bids", bids: list });
}

function generatePaddle() { return Math.floor(100 + Math.random() * 900); } // 100-999

function mmss(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
}

/* =========================
   1) LOGIN PAGE (Manual always)
========================= */
(function initLoginPage() {
  const loginBtn = document.getElementById("loginBtn");
  if (!loginBtn) return;
  
  /* =========================
   Quick Login (TEMP)
========================= */
const quickLoginBtn = document.getElementById("quickLoginBtn");

quickLoginBtn?.addEventListener("click", () => {
  const bidderData = {
    name: "مشارك تجريبي",
    phone: "—",
    paddle: generatePaddle(),
    time: Date.now(),
    temp: true
  };

  saveBidder(bidderData);
window.location.href = "choose.html";
});


  const nameInput = document.getElementById("nameInput");
  const phoneInput = document.getElementById("phoneInput");
  const errorMsg = document.getElementById("errorMsg");

  // ✅ اظهر آخر بيانات مسجلة فقط (للمساعدة)، بدون تحويل تلقائي
  const existing = readBidder();
  if (existing?.name) nameInput.value = existing.name;
  if (existing?.phone && existing.phone !== "—") phoneInput.value = existing.phone;

  loginBtn.addEventListener("click", () => {
    const name = (nameInput?.value || "").trim();
    const phone = (phoneInput?.value || "").trim();

    if (!name || !phone) {
      if (errorMsg) errorMsg.style.display = "block";
      return;
    }
    if (errorMsg) errorMsg.style.display = "none";

    // ✅ إذا نفس الشخص داخل من قبل، خلي نفس الـ Paddle حتى ما يتغير أثناء التيست
    const sameUser =
      existing &&
      existing.name === name &&
      existing.phone === phone &&
      existing.paddle;

    const paddle = sameUser ? existing.paddle : generatePaddle();

    const bidderData = { name, phone, paddle, time: now() };
    saveBidder(bidderData);

 window.location.href = "choose.html";


  });
})();


/* =========================
   2) PREBID PAGE
========================= */
(function initPrebidPage() {
  const grid = document.getElementById("itemsGrid");
  if (!grid) return;

  const bidder = readBidder();
  if (!bidder) { window.location.href = "login.html"; return; }

  const badge = document.getElementById("paddleBadge");
  if (badge) badge.textContent = `رقم المزايد: #${bidder.paddle}`;

  if (typeof ITEMS === "undefined" || !Array.isArray(ITEMS)) {
    grid.innerHTML = `<div class="card cardPad"><h2 class="h2">خطأ</h2><p class="p">تأكدي من ربط items.js قبل script.js</p></div>`;
    return;
  }

  grid.innerHTML = "";
  ITEMS.forEach((item) => {
    const prebids = readPrebids();
    const currentBid = prebids[item.itemNo]?.amount ?? item.startPrice;

    const card = document.createElement("div");
    card.className = "card cardPad";

    const imgUrl = `https://res.cloudinary.com/dyqdfbaln/image/upload/f_auto,q_auto,w_1400/${item.imgId}`;

    card.innerHTML = `
      <div class="itemTop">
        <div class="itemImg"><img src="${imgUrl}" alt="item ${item.itemNo}"></div>
        <div class="itemMeta">
          <h2 class="h2">قطعة رقم ${item.itemNo} — ${item.title}</h2>
          <p class="p">سعر الافتتاح: ${formatPrice(item.startPrice)} د.ع</p>

          <div class="hr"></div>

          <div class="kv">
            <div class="kvBox">
              <div class="k">أعلى مزايدة حالياً</div>
              <div class="v" id="bid-${item.itemNo}">${formatPrice(currentBid)}</div>
            </div>
            <div class="kvBox">
              <div class="k">قيمة الزيادة</div>
              <div class="v">+ ${formatPrice(item.increment)}</div>
            </div>
          </div>

          <button class="btn btnGold btnFull" style="margin-top:14px" data-item="${item.itemNo}">زايد الآن</button>
        </div>
      </div>
    `;

    card.querySelector("button[data-item]").addEventListener("click", () => {
      const bidder = readBidder();
      const prebids = readPrebids();
      const current = prebids[item.itemNo]?.amount ?? item.startPrice;
      const nextBid = current + item.increment;

      prebids[item.itemNo] = { amount: nextBid, paddle: bidder.paddle, time: now() };
      savePrebids(prebids);

      const el = document.getElementById(`bid-${item.itemNo}`);
      if (el) el.textContent = formatPrice(nextBid);
    });

    grid.appendChild(card);
  });
})();

/* =========================
   3) LIVE PAGE
========================= */
(function initLivePage() {
  const wrap = document.getElementById("liveWrap");
  const empty = document.getElementById("liveEmpty");
  const ytFrame = document.getElementById("ytFrame");
  if (!wrap || !empty || !ytFrame) return;

  const bidder = readBidder();
  if (!bidder) { window.location.href = "login.html"; return; }

  const badge = document.getElementById("paddleBadge");
  if (badge) badge.textContent = `رقم المزايد: #${bidder.paddle}`;

  // بث
  const customYt = localStorage.getItem("hoa_youtube_embed");
  ytFrame.src = customYt || HOA.YT_EMBED;

  const ui = {
    timer: document.getElementById("liveTimer"),
    img: document.getElementById("liveImg"),
    itemNo: document.getElementById("liveItemNo"),
    title: document.getElementById("liveTitle"),
    price: document.getElementById("livePrice"),
    inc: document.getElementById("liveInc"),
    last: document.getElementById("liveLast"),
    bidBtn: document.getElementById("bidBtn"),
    bidsTbody: document.getElementById("bidsTbody"),
  };

  let cooldownUntil = 0;

  function render() {
    const state = readState();
    if (!state || state.status !== "LIVE") {
      empty.style.display = "block";
      wrap.style.display = "none";
      if (ui.timer) ui.timer.textContent = "--:--";
      return;
    }

    const item = ITEMS.find(x => x.itemNo === state.currentItemNo);
    if (!item) return;

    empty.style.display = "none";
    wrap.style.display = "block";

    const imgUrl = `https://res.cloudinary.com/dyqdfbaln/image/upload/f_auto,q_auto,w_1600/${item.imgId}`;
    ui.img.src = imgUrl;

    ui.itemNo.textContent = `قطعة رقم ${item.itemNo}`;
    ui.title.textContent = item.title;
    ui.price.textContent = formatPrice(state.currentPrice);
    ui.inc.textContent = `+ ${formatPrice(item.increment)}`;
    ui.last.textContent = state.lastPaddle ? `#${state.lastPaddle}` : "—";

    const remaining = Math.max(0, HOA.DURATION_SEC - Math.floor((now() - state.startedAt) / 1000));
    ui.timer.textContent = mmss(remaining);

    if (remaining <= 0) {
      ui.bidBtn.disabled = true;
      ui.bidBtn.textContent = "انتهى وقت القطعة";
    } else {
      ui.bidBtn.disabled = now() < cooldownUntil;
      ui.bidBtn.textContent = "زايد الآن";
    }

    renderBids();
  }

  function renderBids() {
    const state = readState();
    const bids = readLiveBids().filter(b => b.itemNo === state?.currentItemNo);
    if (!bids.length) {
      ui.bidsTbody.innerHTML = `<tr><td colspan="3" class="muted">لا توجد مزايدات بعد.</td></tr>`;
      return;
    }
    const last10 = bids.slice(-10).reverse();
    ui.bidsTbody.innerHTML = last10.map(b => `
      <tr>
        <td>${new Date(b.time).toLocaleTimeString("ar-IQ")}</td>
        <td>${formatPrice(b.amount)}</td>
        <td>#${b.paddle}</td>
      </tr>
    `).join("");
  }

  ui.bidBtn.addEventListener("click", () => {
    const state = readState();
    if (!state || state.status !== "LIVE") return;

    const item = ITEMS.find(x => x.itemNo === state.currentItemNo);
    if (!item) return;

    const remaining = Math.max(0, HOA.DURATION_SEC - Math.floor((now() - state.startedAt) / 1000));
    if (remaining <= 0) return;

    // تأكيد بسيط لكبار العمر
    const ok = confirm(`تأكيد المزايدة؟\nسوف تزيد بمقدار ${formatPrice(item.increment)} دينار عراقي.`);
    if (!ok) return;

    // cooldown 1.2 ثانية لتقليل ضغط/نقرات
    cooldownUntil = now() + 1200;

    const next = state.currentPrice + item.increment;
    const bidder = readBidder();

    state.currentPrice = next;
    state.lastPaddle = bidder.paddle;
    saveState(state);

    const bids = readLiveBids();
    bids.push({ itemNo: item.itemNo, amount: next, paddle: bidder.paddle, time: now() });
    saveLiveBids(bids);

    render();
  });

  // تحديث مستمر
  setInterval(render, 300);

  // استقبال تحديثات من تبويب admin / display
  bc?.addEventListener("message", (ev) => {
    if (ev.data?.type === "state" || ev.data?.type === "bids") render();
  });

  render();
})();

/* =========================
   4) ADMIN PAGE
========================= */
(function initAdminPage() {
  const sel = document.getElementById("itemSelect");
  if (!sel) return;

  // ملء السلكت
  sel.innerHTML = ITEMS.map(i =>
    `<option value="${i.itemNo}">قطعة ${i.itemNo} — ${i.title}</option>`
  ).join("");

  const ytInput = document.getElementById("ytInput");
  const saveYtBtn = document.getElementById("saveYtBtn");

  const startBtn = document.getElementById("startBtn");
  const soldBtn  = document.getElementById("soldBtn");
  const prevBtn  = document.getElementById("prevBtn");
  const nextBtn  = document.getElementById("nextBtn");
  const resetBtn = document.getElementById("resetBtn");

  const stItem  = document.getElementById("stItem");
  const stPrice = document.getElementById("stPrice");
  const stLast  = document.getElementById("stLast");
  const stTimer = document.getElementById("stTimer");

  // ✅ (جديد) حقول اسم/هاتف الفائز بالأدمن
  const stWinnerName  = document.getElementById("stWinnerName");
  const stWinnerPhone = document.getElementById("stWinnerPhone");

  // تحميل/حفظ رابط البث
  const savedYt = localStorage.getItem("hoa_youtube_embed") || HOA.YT_EMBED;
  if (ytInput) ytInput.value = savedYt;

  saveYtBtn?.addEventListener("click", () => {
    const v = (ytInput?.value || "").trim();
    if (!v) return alert("أدخلي رابط Embed صحيح.");
    localStorage.setItem("hoa_youtube_embed", v);
    alert("تم حفظ رابط البث ✅");
    bc?.postMessage({ type: "yt", url: v });
  });

  function startItem(itemNo) {
    const item = ITEMS.find(x => x.itemNo === itemNo);
    if (!item) return;

    // يبدأ من أعلى Pre-bid إن وجد
    const prebids = readPrebids();
    const pre = prebids[itemNo];

    const startPrice = pre?.amount ?? item.startPrice;
    const lastPaddle = pre?.paddle ?? null;

    const state = {
      status: "LIVE",
      currentItemNo: itemNo,
      startedAt: now(),
      currentPrice: startPrice,
      lastPaddle: lastPaddle,

      // ✅ تنظيف حقول البيع القديمة
      soldAt: null,
      finalPrice: null,
      winnerPaddle: null,
    };

    saveState(state);
    bc?.postMessage({ type: "started", itemNo });
    renderStatus();
  }

  function markSold() {
  const state = readState();
  if (!state || state.status !== "LIVE") return;

  state.status = "SOLD";
  state.soldAt = now();
  state.finalPrice = state.currentPrice;
  state.winnerPaddle = state.lastPaddle;

  // ✅ هذا السطر المهم
  state.autoResetAt = now() + 5000; // بعد 5 ثواني

  saveState(state);
  bc?.postMessage({ type: "sold", state });

  alert("تم تثبيت القطعة كمباع ✅");
  renderStatus();
}

  startBtn?.addEventListener("click", () => startItem(Number(sel.value)));
  soldBtn?.addEventListener("click", markSold);
  resetBtn?.addEventListener("click", resetState);

  prevBtn?.addEventListener("click", () => {
    const n = Math.max(1, Number(sel.value) - 1);
    sel.value = String(n);
  });

  nextBtn?.addEventListener("click", () => {
    const n = Math.min(ITEMS.length, Number(sel.value) + 1);
    sel.value = String(n);
  });

  function renderStatus() {
    const state = readState();

    if (!state) {
      stItem.textContent = "—";
      stPrice.textContent = "—";
      stLast.textContent = "—";
      stTimer.textContent = "—";
      if (stWinnerName) stWinnerName.textContent = "—";
      if (stWinnerPhone) stWinnerPhone.textContent = "—";
      return;
    }

    const item = ITEMS.find(x => x.itemNo === state.currentItemNo);
    stItem.textContent = item ? `#${item.itemNo} — ${item.title}` : "—";

    // ✅ السعر: لو SOLD نعرض النهائي
    const priceToShow = (state.status === "SOLD") ? (state.finalPrice ?? state.currentPrice) : state.currentPrice;
    stPrice.textContent = formatPrice(priceToShow);

    // ✅ الفائز/آخر مزايد
    const winPaddle = state.winnerPaddle ?? state.lastPaddle;
    stLast.textContent = winPaddle ? `#${winPaddle}` : "—";

    // ✅ العداد: LIVE فقط — SOLD يوقف
    if (state.status === "SOLD") {
      stTimer.textContent = "تم الاقتناء (SOLD)";
    } else if (state.status === "LIVE") {
      const remaining = Math.max(0, HOA.DURATION_SEC - Math.floor((now() - state.startedAt) / 1000));
      stTimer.textContent = mmss(remaining);
    } else {
      stTimer.textContent = "—";
    }

    // ✅ اسم/هاتف الفائز (إذا موجود محلياً)
    if (stWinnerName || stWinnerPhone) {
      const bidder = readBidder(); // هذا يقرأ من جهاز الأدمن فقط
      if (bidder && winPaddle && bidder.paddle === winPaddle) {
        if (stWinnerName) stWinnerName.textContent = bidder.name || "—";
        if (stWinnerPhone) stWinnerPhone.textContent = bidder.phone || "—";
      } else {
        if (stWinnerName) stWinnerName.textContent = "غير متاح (جهاز آخر)";
        if (stWinnerPhone) stWinnerPhone.textContent = "غير متاح (جهاز آخر)";
      }
    }
  }

  setInterval(renderStatus, 300);
  bc?.addEventListener("message", () => renderStatus());
  renderStatus();
})();

/* =========================
   5) DISPLAY PAGE
========================= */
(function initDisplayPage() {
  const dTitle = document.getElementById("dTitle");
  if (!dTitle) return;

  const dPrice = document.getElementById("dPrice");
  const dLast  = document.getElementById("dLast");
  const dInc   = document.getElementById("dInc");
  const dNo    = document.getElementById("dNo");
  const dTimer = document.getElementById("dTimer");

  function render() {
    const state = readState();

    // لا يوجد مزاد
    if (!state) {
      dTitle.textContent = "لم يبدأ المزاد بعد";
      dPrice.textContent = "—";
      dLast.textContent  = "—";
      dInc.textContent   = "—";
      dNo.textContent    = "—";
      dTimer.textContent = "--:--";
      return;
    }

    // ✅ SOLD: تهنئة + فائز + سعر + تصفير تلقائي
    if (state.status === "SOLD") {
      const item = (typeof ITEMS !== "undefined") ? ITEMS.find(x => x.itemNo === state.currentItemNo) : null;

      const paddle = state.winnerPaddle ?? state.lastPaddle;
      const price  = state.finalPrice ?? state.currentPrice;

      dTitle.textContent = "تم الاقتناء ✅ مبروك";
      dPrice.textContent = formatPrice(price) + " د.ع";
      dLast.textContent  = paddle ? `#${paddle}` : "—";
      dInc.textContent   = "—";
      dNo.textContent    = item ? item.itemNo : "—";
      dTimer.textContent = "تم الاقتناء";

      if (
  state.autoResetStartedAt &&
  state.autoResetDelay &&
  now() - state.autoResetStartedAt >= state.autoResetDelay
) {
  localStorage.removeItem("hoa_live_state");
  bc?.postMessage({ type: "reset" });
}

      return;
    }

    // إذا مو LIVE
    if (state.status !== "LIVE") {
      dTitle.textContent = "لم يبدأ المزاد بعد";
      dPrice.textContent = "—";
      dLast.textContent  = "—";
      dInc.textContent   = "—";
      dNo.textContent    = "—";
      dTimer.textContent = "--:--";
      return;
    }

    // ✅ LIVE طبيعي
    const item = (typeof ITEMS !== "undefined") ? ITEMS.find(x => x.itemNo === state.currentItemNo) : null;
    if (!item) return;

    dTitle.textContent = item.title;
    dPrice.textContent = formatPrice(state.currentPrice) + " د.ع";
    dLast.textContent  = state.lastPaddle ? `#${state.lastPaddle}` : "—";
    dInc.textContent   = formatPrice(item.increment);
    dNo.textContent    = item.itemNo;

    const remaining = Math.max(0, HOA.DURATION_SEC - Math.floor((now() - state.startedAt) / 1000));
    dTimer.textContent = mmss(remaining);
  }

  // ✅ لازم تتنادى وتحدث باستمرار
  render();
  setInterval(render, 300);

  // ✅ إذا نفس الجهاز (تبويبات) يستقبل تحديثات
  bc?.addEventListener("message", () => render());
})();
