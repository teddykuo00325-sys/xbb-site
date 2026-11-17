// Scoped diary-page styling; record forms and other tabs keep their own layout.
export const DIARY_PAGE_STYLE=`
.life-diary{--diary-paper:#fffbf2;--diary-ink:#674a40;--diary-soft:#f8e1ce;--diary-line:#e9d7c2;--diary-photo:#f3eade;color:var(--diary-ink);padding:6px 0 16px}
.life-diary .ld-heading{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 92px;gap:10px 12px;padding:20px 18px 18px;border:1px solid var(--diary-line);border-radius:26px 26px 12px 26px;background:radial-gradient(circle at 12px 12px,#e8cdbb66 1.5px,transparent 2px) 0 0/22px 22px,var(--diary-paper);box-shadow:0 5px 0 var(--diary-soft);margin-bottom:20px;isolation:isolate}
.life-diary .ld-heading>div{min-width:0;align-self:center}.life-diary .ld-heading h2{font-size:clamp(21px,5.8vw,29px);line-height:1.35;margin:5px 0 0;overflow-wrap:anywhere;color:var(--diary-ink)}
.life-diary .ld-heading .microcopy{font-size:12px;line-height:1.5;margin:0;color:var(--diary-ink)}
.life-diary .ld-welcome-cat{display:block;width:92px;height:112px;object-fit:contain;align-self:end;filter:drop-shadow(0 3px 2px #674a4012)}
.life-diary .ld-heading button.primary{grid-column:1/-1;width:100%;min-height:48px;white-space:normal;border:1px solid #a35842!important;border-radius:16px;background:#a35842!important;color:#fffaf1!important;box-shadow:0 3px 0 #794332;font:inherit;font-weight:700;padding:12px 16px}
.life-diary>.microcopy.left{padding:0 8px;font-size:13px;line-height:1.7;color:var(--diary-ink)}
.life-diary .ld-journal-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:24px 3px 6px;padding:0 2px 10px;border-bottom:2px dashed var(--diary-line)}
.life-diary .ld-journal-title h3{margin:0;font-size:17px}.life-diary .ld-journal-title span{font-size:12px;background:var(--diary-soft);border-radius:20px;padding:5px 10px;white-space:nowrap}
.life-diary .ld-entry{position:relative;margin:18px 0 26px;padding:0 12px 6px;border:1px solid var(--diary-line);border-radius:8px 24px 24px 24px;background:var(--diary-paper);box-shadow:0 5px 0 var(--diary-soft);overflow:visible}
.life-diary .ld-entry:before{content:'';position:absolute;left:22px;top:-7px;width:56px;height:15px;background:#d8b98bc9;transform:rotate(-4deg);pointer-events:none;border-radius:2px}
.life-diary .ld-entry-head{padding:22px 3px 12px;align-items:center;font-size:12px;color:var(--diary-ink)}
.life-diary .ld-entry-head time{padding:5px 9px;background:var(--diary-soft);border-radius:6px;line-height:1.5;overflow-wrap:anywhere}
.life-diary .ld-first{background:#e8b8a5;color:#663b2d;border:1px solid #dca58e;font-size:12px}
.life-diary .ld-photo{border-radius:13px;background:var(--diary-photo);max-height:440px}
.life-diary .ld-caption{margin:17px 5px;font-size:17px;line-height:1.85;color:var(--diary-ink)}
.life-diary .ld-actions{gap:8px;padding:4px 2px 12px;display:grid;grid-template-columns:minmax(0,1fr) auto auto}
.life-diary .ld-actions button{min-height:44px;white-space:normal;font-size:13px;padding:8px 10px;border-radius:13px;color:var(--diary-ink)}
.life-diary .ld-actions button:first-child{background:var(--diary-soft);border:1px solid var(--diary-line);font-weight:700}
.life-diary .ld-empty{margin:18px 0;padding:30px 22px;border:2px dashed var(--diary-line);border-radius:22px;background:var(--diary-paper);font-size:15px;line-height:1.9}
.life-diary .ld-empty p{margin:0}
.life-diary .ldb-shelf{padding:18px 14px 10px;border-radius:22px;background:var(--diary-paper);border:1px solid var(--diary-line);margin:22px 0}
.life-diary .ldb-head h3{font-size:17px;color:var(--diary-ink)}.life-diary .ldb-head p{font-size:12px;line-height:1.7}
.life-diary .ldb-row{padding:12px 4px 17px;border-bottom:7px solid var(--diary-soft);border-radius:0 0 5px 5px;gap:16px}
.life-diary .ldb-designs{gap:6px;margin:12px 0 4px}.life-diary .ldb-designs button{font-size:12px;padding:9px 10px;border-color:var(--diary-line);color:var(--diary-ink);background:var(--diary-paper);border-radius:12px}
.life-diary .ldb-designs button[aria-pressed=true]{background:#805b48;color:#fffaf1;border-color:#805b48}
.life-diary .ldb-cover{box-shadow:3px 4px 0 var(--diary-soft)}
.life-diary .ld-heading button,.life-diary .ld-actions button,.life-diary .ldb-designs button{min-width:46px;min-height:46px}
.life-diary .ld-heading,.life-diary .ld-entry{box-shadow:none;border-radius:24px}
.life-diary .ldb-row{border-bottom:1px solid var(--diary-line);border-radius:0;padding-bottom:14px}
.life-diary .ldb-cover{box-shadow:0 3px 9px #39261b18}
.life-diary button:focus-visible{outline:3px solid #af774a;outline-offset:3px}
html[data-theme=dark] .life-diary{--diary-paper:#352c27;--diary-ink:#f6e6d2;--diary-soft:#4d3d31;--diary-line:#79604d;--diary-photo:#29231f}
html[data-theme=dark] .life-diary .ld-heading{background:radial-gradient(circle at 12px 12px,#d6b99a22 1.5px,transparent 2px) 0 0/22px 22px,var(--diary-paper)}
html[data-theme=dark] .life-diary .ld-first{background:#694534;color:#ffead4;border-color:#9c6d52}
@media(max-width:340px){.life-diary .ld-heading{padding:16px 12px;grid-template-columns:minmax(0,1fr) 76px}.life-diary .ld-welcome-cat{width:76px;height:96px}.life-diary .ld-actions{grid-template-columns:1fr 1fr}.life-diary .ld-actions button:first-child{grid-column:1/-1}.life-diary .ldb-shelf{padding:16px 10px 10px}}
`;
