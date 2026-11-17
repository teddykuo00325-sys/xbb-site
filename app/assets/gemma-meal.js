import {t, K} from './i18n.js?v=audit1117b';
export const GEMMA_MODELS = [
  { id: 'gemma-e2b', title: t('手機模式（省空間）'), size: t('約 2.6 GB') },
  { id: 'gemma-e4b', title: t('手機模式（較細緻）'), size: t('約 3.7 GB') },
];

// Asks the host for status once when it is attached, and keeps asking (every second) only while a download is
// running, so an idle screen never polls. A new download flips `downloading` and restarts the loop.
export function useGemmaModels(R, host, monitor = false) {
  const [status, setStatus] = R.useState(null);
  const downloading = !!status?.downloading;
  R.useEffect(() => {
    if (!host) return;
    let active = true, timer, misses = 0;
    async function refresh() {
      let next;
      try {
        next = await host.request('status');
        misses = 0;
        if (active) setStatus(next);
      } catch {
        // One failed poll while a download is running must not look like "gone": keep the last status and try a few more times.
        misses += 1;
        if (downloading && misses < 5) {
          if (active && monitor) timer = setTimeout(refresh, 2000);
          return;
        }
        next = { unavailable: true };
        if (active) setStatus(next);
      }
      if (active && monitor && next?.downloading) timer = setTimeout(refresh, 1000);
    }
    refresh();
    return () => { active = false; clearTimeout(timer); };
  }, [host, monitor, downloading]);
  return [status, setStatus];
}

const units = { g: 'g', G: 'g', 克: 'g', 公克: 'g', kg: 'kg', 公斤: 'kg', ml: 'ml', mL: 'ml', 毫升: 'ml', 包: K('包'), 罐: K('罐'), 顆: K('顆'), 片: K('片') };
const unknown = /不|沒|未|無|約|大概|可能|好像|估計|不到|少於|超過|剩|只要/;

function observedAmount(source, phrase, cue) {
  if (typeof phrase !== 'string' || !phrase || unknown.test(phrase)) return null;
  const start = source.indexOf(phrase);
  if (start < 0 || source.indexOf(phrase, start + 1) >= 0) return null;
  const clause = source.slice(0, start).split(/[，,。！？；、\n]/).at(-1) + phrase
    + source.slice(start + phrase.length).split(/[，,。！？；、\n]/)[0];
  if (unknown.test(clause) || !cue.test(phrase)) return null;
  const matches = [...phrase.matchAll(/(?<![\d.])([0-9]+(?:\.[0-9]+)?)\s*(公克|公斤|毫升|kg|mL|ml|[gG克包罐顆片])(?![a-zA-Z])/g)];
  if (matches.length !== 1 || !Number.isFinite(Number(matches[0][1]))) return null;
  const [, value, unit] = matches[0];
  return { value, unit: units[unit] };
}

export function parseGemmaMeal(source, candidate) {
  if (typeof candidate !== 'string') throw Error(t('本機整理沒有回傳可核對的草稿，原文仍保留。'));
  const json = candidate.trim().replace(/^```(?:json)?\s*|\s*```$/gi, '');
  let result;
  try { result = JSON.parse(json); } catch {}
  if (!result || !['food', 'provided', 'eaten'].every(key => typeof result[key] === 'string')) {
    throw Error(t('本機整理結果無法核對，請手動整理原文。'));
  }
  const food = result.food.trim();
  if (!food || food.length > 80 || !source.includes(food)) {
    throw Error(t('本機模型未找到可核對的單一食品，請手動整理原文。'));
  }
  const provided = observedAmount(source, result.provided, /放|給|提供|餵|倒|盛|準備/);
  const eaten = observedAmount(source, result.eaten, /吃|喝|攝取/);
  const sameUnit = !provided || !eaten || provided.unit === eaten.unit;
  const separate = !result.provided || !result.eaten ||
    (!result.provided.includes(result.eaten) && !result.eaten.includes(result.provided));
  return {
    food,
    provided: sameUnit && separate && Number(provided?.value) > 0 ? provided.value : '',
    eaten: sameUnit && separate ? eaten?.value || '' : '',
    unit: sameUnit && separate ? provided?.unit || eaten?.unit || '' : '',
  };
}
