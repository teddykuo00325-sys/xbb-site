// iOS 專用的雲端橋接（第 6 包）。以下各段原樣取自 android-v161/app/src/main/assets/host-bridge.js：
// requestBridge、V161Cloud、CloudCare 轉接層、xbb-cloud-return 監聽。
// Android 靠 window.V161Host 才執行；iOS 只依賴原生注入的 window.V161CloudHost（App/HostBridge.js）。
// 這個檔案以一般 <script> 在 <head> 載入，會在頁面模組執行前把 window.V161Cloud／window.CloudCare 準備好。
(() => {
  "use strict";

  if (!window.V161CloudHost || window !== window.top) return;

  function requestBridge(channel, errorMessage) {
    let nextRequestId = 0;
    const requests = new Map();
    channel.onmessage = ({ data }) => {
      const { id, ...snapshot } = JSON.parse(data);
      const request = requests.get(id);
      if (!request) return;
      requests.delete(id);
      clearTimeout(request.timeout);
      request.resolve(snapshot);
    };
    return {
      request(op, fields = {}) {
        return new Promise((resolve, reject) => {
          const id = ++nextRequestId;
          const timeout = setTimeout(() => {
            requests.delete(id);
            reject(new Error(errorMessage));
          }, ["signIn","deleteAccount","billingPurchase","billingRestore"].includes(op) ? 600000 : op === "organize" || op === "summary" ? 185000 : op === "submit" ? 30000 : op === "billingProducts" ? 45000 : 10000); // 商店操作要等使用者確認，逾時不能當作取消付款
          requests.set(id, { resolve, timeout });
          try {
            channel.postMessage(JSON.stringify({ ...fields, id, op }));
          } catch (error) {
            clearTimeout(timeout);
            requests.delete(id);
            reject(error);
          }
        });
      },
    };
  }

  // Cloud jobs: V161Cloud.request("status" | "submit" | "cancel" | "ack", fields)
  const cloud = window.V161CloudHost;
  if (cloud && !window.V161Cloud) {
    const bridge = requestBridge(cloud, "線上服務暫時無法連線。");
    const raw = bridge.request.bind(bridge);
    // 離線時不送出：Firestore 會把寫入排在手機上，App 判逾時後連上網路才補送，雲端照跑卻沒人收。
    bridge.request = (op, fields) => op === "submit" && navigator.onLine === false
      ? raw("status").then((s) => ({ ...s, billing: "not-charged", error: "目前沒有網路，連上網路後再送出。" }))
      : raw(op, fields).then((s) => op === "submit" && s.error && typeof s.state === "string" && s.meetingId !== fields?.meetingId
        ? { ...s, billing: "not-charged" } : s); // A rejected request must not inherit an older job's charge.
    window.V161Cloud = bridge;
  }

  // CloudCare adapter: the food-label screen (cloud-care.js) expects a synchronous CloudCare bridge and
  // "cloudcare:update" events. This maps it onto V161Cloud (Firestore cloudFoodJobs, anonymous sign-in).
  // The worker returns the food-ocr.v1 JSON as the string in summaryCloud; failures may carry {"code":"..."}.
  if (window.V161Cloud && !window.CloudCare) {
    const FOOD_PROMPT = "讀取食品包裝照片，只輸出一個 JSON 物件（不要 markdown、不要說明）：" +
      '{"schema":"food-ocr.v1","fields":[{"key":"","value":"","source":"包裝上讀到的原文","unit":"","basis":"","bound":""}],' +
      '"analysis":{可省略}}。key 只能是 name、brand、flavor、netWeight（unit 填 g）、ingredients、' +
      "nutrient:蛋白質、nutrient:脂肪、nutrient:纖維、nutrient:水分、nutrient:熱量、nutrient:鈣、nutrient:磷。" +
      "營養欄位要有 unit（%、g、mg 或 kcal）、basis（每 100 g、每 kg、每包）、bound（標示值、最低值、最高值）。看不清楚的欄位省略，不要猜。" +
      "完全讀不到時輸出 {\"status\":\"failed\",\"code\":\"unreadable\"}。";
    const active = new Map();
    const emit = (requestId, status, extra = {}) => window.dispatchEvent(
      new CustomEvent("cloudcare:update", { detail: { requestId, status, ...extra } }));
    const failCode = (text) => {
      try { const code = JSON.parse(text).code; if (["unreadable", "unavailable", "expired"].includes(code)) return code; } catch (e) { /* not JSON */ }
      return "unavailable";
    };
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    // Pending record (which job to bring back after the user left the page). The finished result stays
    // in the native bridge until CloudCare.release() runs, which also deletes the cloud mirror document.
    const PENDING_KEY = "xbb.cloudPending.food";
    const PENDING_MAX_MS = 8 * 60 * 1000;
    const savePending = (record) => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(record)); } catch (e) { /* not restorable */ } };
    const clearPending = () => { try { localStorage.removeItem(PENDING_KEY); } catch (e) { /* ignore */ } };
    const loadPending = () => { try { const r = JSON.parse(localStorage.getItem(PENDING_KEY) || "null"); return r && typeof r === "object" ? r : null; } catch (e) { return null; } };
    const parseFood = (text) => {
      let payload = null;
      try { payload = JSON.parse(text); } catch (e) { /* not JSON */ }
      return payload && payload.schema === "food-ocr.v1" && Array.isArray(payload.fields) ? payload : null;
    };
    async function poll(requestId, job, lastState) {
      try {
        while (!job.cancelled) {
          await sleep(2000);
          if (job.cancelled) return;
          const s = await window.V161Cloud.request("status");
          if (s.meetingId !== requestId || s.state === "idle") { clearPending(); return emit(requestId, "failed", { code: "unavailable" }); }
          if (s.state === "processing" && lastState !== "running") { lastState = "running"; emit(requestId, "running"); }
          if (s.state === "done") {
            const payload = parseFood(s.summary);
            if (payload) return emit(requestId, "completed", { payload, billing: s.billing || "charged" }); // no ack: kept until release()
            await window.V161Cloud.request("ack");
            clearPending();
            let parsed = null;
            try { parsed = JSON.parse(s.summary); } catch (e) { /* unreadable */ }
            return emit(requestId, "failed", { code: parsed ? failCode(s.summary) : "unreadable", billing: s.billing || "charged" });
          }
          if (s.state === "failed" || s.state === "timeout") {
            await window.V161Cloud.request("ack");
            clearPending();
            return emit(requestId, "failed", { code: s.state === "timeout" ? "expired" : failCode(s.summary), billing: s.billing || "unknown" });
          }
        }
      } catch (error) {
        if (!job.cancelled) emit(requestId, "failed", { code: "unavailable" });
      } finally {
        active.delete(requestId);
      }
    }
    // 原生送出失敗的文字 → 頁面的失敗碼：要登入、上一份還在處理，不要都說成「雲端暫時無法使用」。
    function submitErrorCode(error) {
      const text = String(error || "");
      if (text.includes("請先登入")) return "signed_out";
      if (text.includes("正在處理上一份")) return "busy";
      return navigator.onLine ? "unavailable" : "offline";
    }
    // lang：英文介面由 cloud-care.js 傳 {lang:"en"}（2026-11-14），worker 依 job.lang 回英文說明；其餘照舊 zh-TW。
    async function run(requestId, jpegBase64, lang = "zh-TW") {
      const job = active.get(requestId);
      try {
        // 看診摘要、陪玩或語音的雲端結果還在等核對時不能送：原生只擋處理中，會把那份已完成的結果蓋掉。
        const before = await window.V161Cloud.request("status");
        if (before.state === "done" && (before.kind !== "image" || before.mode === "med-bag")) {
          active.delete(requestId); return emit(requestId, "failed", { code: "busy", billing: "not-charged" });
        }
        const sent = await window.V161Cloud.request("submit", {
          meetingId: requestId, imageB64: jpegBase64, mode: "food-ocr", lang, prompt: FOOD_PROMPT });
        if (sent.error) { active.delete(requestId); return emit(requestId, "failed", { code: submitErrorCode(sent.error), billing: sent.billing || "unknown" }); }
        savePending({ kind: "food", meetingId: requestId, cloudJobId: sent.jobId || "", submittedAt: Date.now() });
        emit(requestId, "queued");
        return poll(requestId, job, "queued");
      } catch (error) {
        active.delete(requestId);
        if (!job.cancelled) emit(requestId, "failed", { code: "unavailable" });
      }
    }
    // Bring back (or re-attach to) the last food job after the page was left or the app restarted.
    async function resume() {
      const record = loadPending();
      if (!record) return null;
      const requestId = record.meetingId;
      const s = await window.V161Cloud.request("status");
      const mine = s.kind === "image" && s.meetingId === requestId && (!record.cloudJobId || s.jobId === record.cloudJobId);
      if (!mine) { clearPending(); return null; } // missing or different job: nothing to bring back
      if (s.state === "done") {
        const payload = parseFood(s.summary);
        if (payload) return { requestId, status: "completed", payload, billing: s.billing || "charged" };
        await window.V161Cloud.request("ack");
        clearPending();
        return { requestId, status: "failed", code: failCode(s.summary), billing: s.billing || "charged" };
      }
      if (s.state === "queued" || s.state === "processing") {
        if (!(Number.isFinite(record.submittedAt) && Date.now() - record.submittedAt < PENDING_MAX_MS)) {
          await window.V161Cloud.request("cancel"); clearPending();
          return { requestId, status: "failed", code: "expired", billing: "unknown" };
        }
        if (!active.has(requestId)) {
          const job = { cancelled: false };
          active.set(requestId, job);
          poll(requestId, job, s.state === "processing" ? "running" : "queued");
        }
        return { requestId, status: "running" };
      }
      if (s.state === "failed" || s.state === "timeout") {
        await window.V161Cloud.request("ack");
        clearPending();
        return { requestId, status: "failed", code: s.state === "timeout" ? "expired" : failCode(s.summary), billing: s.billing || "unknown" };
      }
      clearPending();
      return null;
    }
    window.CloudCare = {
      status: () => JSON.stringify({ signedIn: true, eligible: { food: true, report: false }, online: navigator.onLine }),
      signIn: () => {},
      submit: (kind, jpegBase64, options) => {
        if (kind !== "food") throw new Error("unsupported");
        const requestId = crypto.randomUUID();
        active.set(requestId, { cancelled: false });
        run(requestId, jpegBase64, options && options.lang === "en" ? "en" : "zh-TW");
        return JSON.stringify({ requestId });
      },
      cancel: (requestId) => {
        const job = active.get(requestId);
        if (job) { job.cancelled = true; clearPending(); window.V161Cloud.request("cancel").catch(() => {}); }
      },
      // Async extras for the native Android build (the page feature-detects them).
      resume: () => resume().then(JSON.stringify),
      // The user saved or discarded the brought-back result: delete the cloud copy (failure never blocks).
      release: () => { clearPending(); window.V161Cloud.request("ack").catch(() => {}); },
    };
  }

  // Tapping the "進階模式整理完成" notification: open the page that brings the finished result back.
  // kind "summary" -> 看診摘要; "food" -> 新增食品卡 (its 用包裝照片建立 section resumes the job on mount);
  // a missing or legacy kind opens 看診摘要. After a cold start the app may still be mounting, so retry for a while.
  let returning = 0;
  window.addEventListener("xbb-cloud-return", (event) => {
    const raw = event.detail && event.detail.kind;
    const food = raw === "food" || raw === "image";
    // 陪玩設計、語音快記的結果在各自的頁面帶回；以前一律打開看診摘要，只看到「先到那邊處理」。
    const page = raw === "play" ? "陪玩" : raw === "voice" ? "語音快記" : "";
    const token = ++returning;
    const care = raw === "care" || raw === "med";
    const button = (text) => [...document.querySelectorAll("button")].reverse().find((b) => b.innerText.trim() === text);
    let tries = 0;
    const step = () => {
      if (token !== returning || tries++ > 50) return;
      if (raw === "diary") {
        if (document.querySelector(".life-diary")) return;
        // Mount Records before asking its diary listener to bring back the job.
        window.dispatchEvent(new CustomEvent("paw-route-request", { detail: "records" }));
        window.dispatchEvent(new CustomEvent("paw-diary-open-request"));
      } else if (care) {
        // 照護提醒通知（2026-11-13）：打開「照護」分頁。
        if (document.querySelector(".care-page")) return;
        window.dispatchEvent(new CustomEvent("paw-care-open-request"));
      } else if (page) {
        const open = button(page);
        if (open) { open.click(); return; }
        // 語音快記在「今日」頁：不在首頁時先切過去，下一輪再按。
        const home = page === "語音快記" && button("今日");
        if (home) home.click();
      } else if (food) {
        if (document.querySelector(".food-ocr")) return;
        const add = button("＋ 新增食品卡");
        if (add) add.click(); else window.dispatchEvent(new CustomEvent("paw-route-request", {detail: "feeding"}));
      } else {
        if (document.querySelector('section[aria-label="看診摘要工作區"],section[aria-label="核對看診摘要"],section[aria-label="確認進階模式整理範圍"]')) return;
        window.dispatchEvent(new CustomEvent("paw-summary-open-request"));
      }
      setTimeout(step, 700);
    };
    step();
  });
})();
