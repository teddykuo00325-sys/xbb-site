/* 毛孩小本本官網｜小魚試玩
   App「自由玩小魚」的網站簡化版：全程無聲、玩兩分鐘自動休息、不在畫面上就暫停。
   配色只用貓看得清楚的藍與黃綠（貓是二色視覺，紅橘色對牠接近灰綠）。 */
(function () {
  var box = document.getElementById("fishbox");
  if (!box) return;
  var cv = document.getElementById("fish"), ctx = cv.getContext("2d");
  var btnStart = document.getElementById("fishStart");
  var btnStop = document.getElementById("fishStop");
  var btnFull = document.getElementById("fishFull");
  var msg = document.getElementById("fishMsg");

  var PLAY_MS = 120000;                       // 兩分鐘自動休息
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = 0, H = 0, dpr = 1;
  var fish = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, boost: 0, wag: 0 };
  var ripples = [], bubbles = [];
  var running = false, visible = true, raf = 0, last = 0, startedAt = 0, wake = null;

  function size() {
    var r = box.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!fish.x) { fish.x = W * 0.42; fish.y = H * 0.5; fish.vx = 1; pickTarget(); }
    fish.x = Math.min(Math.max(fish.x, 30), W - 30); fish.y = Math.min(Math.max(fish.y, 30), H - 30);
    if (!running) draw(0);
  }
  function pickTarget() {
    var m = Math.min(W, H) * 0.12 + 24;
    fish.tx = m + Math.random() * (W - 2 * m);
    fish.ty = m + Math.random() * (H - 2 * m);
  }
  var unit = function () { return Math.min(W, H); };

  function step(dt) {
    var base = unit() * (reduce ? 0.16 : 0.26);            // 每秒移動距離
    var dx = fish.tx - fish.x, dy = fish.ty - fish.y, d = Math.hypot(dx, dy);
    if (d < unit() * 0.06) pickTarget();
    var sp = base * (1 + fish.boost * 3.2);
    var ax = dx / (d || 1) * sp, ay = dy / (d || 1) * sp;
    var k = Math.min(1, dt * 2.4);                          // 轉向平滑
    fish.vx += (ax - fish.vx) * k; fish.vy += (ay - fish.vy) * k;
    fish.x += fish.vx * dt; fish.y += fish.vy * dt;
    var m = 24; fish.x = Math.min(Math.max(fish.x, m), W - m); fish.y = Math.min(Math.max(fish.y, m), H - m);
    fish.boost = Math.max(0, fish.boost - dt * 1.1);
    fish.wag += dt * (6 + fish.boost * 14);
    for (var i = ripples.length - 1; i >= 0; i--) { ripples[i].t += dt; if (ripples[i].t > 0.9) ripples.splice(i, 1); }
    if (!reduce && Math.random() < dt * 0.8) bubbles.push({ x: Math.random() * W, y: H + 8, r: 2 + Math.random() * 4, s: 18 + Math.random() * 26 });
    for (var j = bubbles.length - 1; j >= 0; j--) { bubbles[j].y -= bubbles[j].s * dt; if (bubbles[j].y < -10) bubbles.splice(j, 1); }
  }

  function draw(t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1E2F75"); g.addColorStop(1, "#122062");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (!reduce) {                                          // 很淡的水光，不閃爍
      ctx.fillStyle = "rgba(127,163,232,0.07)";
      for (var b = 0; b < 3; b++) {
        var yy = (H * (0.2 + b * 0.3) + Math.sin(t / 1600 + b) * 14);
        ctx.beginPath(); ctx.ellipse(W / 2, yy, W * 0.7, 10, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = "rgba(220,235,255,0.35)";
    bubbles.forEach(function (o) { ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill(); });
    ripples.forEach(function (r) {
      ctx.strokeStyle = "rgba(203,224,69," + (0.55 * (1 - r.t / 0.9)).toFixed(3) + ")";
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, 12 + r.t * unit() * 0.18, 0, Math.PI * 2); ctx.stroke();
    });
    drawFish();
  }

  function drawFish() {
    var s = unit() * 0.085 + 10;                            // 魚身長度約畫面短邊的 1/6
    var ang = Math.atan2(fish.vy, fish.vx || 0.0001);
    var wag = Math.sin(fish.wag) * 0.35;
    ctx.save(); ctx.translate(fish.x, fish.y); ctx.rotate(ang);
    ctx.fillStyle = "#A9BE2E";                               // 尾巴
    ctx.save(); ctx.translate(-s * 0.9, 0); ctx.rotate(wag);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s * 0.75, -s * 0.5); ctx.lineTo(-s * 0.75, s * 0.5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#CBE045";                               // 身體
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#A9BE2E";                               // 背鰭
    ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.5); ctx.quadraticCurveTo(s * 0.1, -s * 0.95, s * 0.35, -s * 0.45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#0F1A4A";                               // 眼睛
    ctx.beginPath(); ctx.arc(s * 0.55, -s * 0.12, s * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function loop(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (visible) { step(dt); draw(now); }
    if (now - startedAt > PLAY_MS) { stop("玩了兩分鐘，讓牠休息一下吧。"); return; }
    raf = requestAnimationFrame(loop);
  }

  function say(text) { if (text) { msg.textContent = text; msg.hidden = false; } else { msg.hidden = true; } }
  function start() {
    if (running) return;
    running = true; startedAt = performance.now(); last = 0; say("");
    btnStart.hidden = true; btnStop.hidden = false;
    if (navigator.wakeLock) navigator.wakeLock.request("screen").then(function (w) { wake = w; }).catch(function () {});
    raf = requestAnimationFrame(loop);
  }
  function stop(text) {
    running = false; cancelAnimationFrame(raf);
    btnStart.hidden = false; btnStop.hidden = true; btnStart.textContent = "再玩一次";
    if (wake) { wake.release().catch(function () {}); wake = null; }
    say(text || ""); draw(performance.now());
  }

  // 碰到小魚附近，牠就游開；碰哪裡都會有一圈漣漪
  box.addEventListener("pointerdown", function (e) {
    var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    ripples.push({ x: x, y: y, t: 0 });
    if (!running) { start(); return; }
    var near = Math.max(70, unit() * 0.2);
    if (Math.hypot(x - fish.x, y - fish.y) < near) {
      var ax = fish.x - x, ay = fish.y - y, d = Math.hypot(ax, ay) || 1;
      fish.tx = Math.min(Math.max(fish.x + ax / d * unit() * 0.6, 30), W - 30);
      fish.ty = Math.min(Math.max(fish.y + ay / d * unit() * 0.6, 30), H - 30);
      fish.boost = 1;
    }
  });

  btnStart.addEventListener("click", start);
  btnStop.addEventListener("click", function () { stop(""); });

  // 全螢幕：iPhone 的 Safari 不支援一般元素全螢幕，不支援就把按鈕藏起來
  var canFull = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  if (!canFull) btnFull.hidden = true;
  btnFull.addEventListener("click", function () {
    var req = box.requestFullscreen || box.webkitRequestFullscreen;
    if (req) { try { var p = req.call(box); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
    start();
  });
  ["fullscreenchange", "webkitfullscreenchange"].forEach(function (ev) {
    document.addEventListener(ev, function () { setTimeout(size, 50); });
  });

  // 不在畫面上、或切到別的分頁就暫停
  document.addEventListener("visibilitychange", function () { visible = !document.hidden; last = 0; });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting && !document.hidden; last = 0; }, { threshold: 0.2 }).observe(box);
  }
  if ("ResizeObserver" in window) new ResizeObserver(size).observe(box); else window.addEventListener("resize", size);
  size();
})();
