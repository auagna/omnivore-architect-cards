// Self-contained DOM → PNG exporter.
//
// We deliberately do NOT use html-to-image: its internal pipeline stalls in
// some headless/offscreen renderers. Instead we use only primitives that are
// known-good everywhere: getComputedStyle inlining + a <foreignObject> SVG +
// canvas rasterization. This keeps export working in any real browser.

const _imgCache = new Map<string, string>();

async function urlToDataUrl(url: string): Promise<string | null> {
  if (url.startsWith("data:")) return url;
  if (_imgCache.has(url)) return _imgCache.get(url)!;
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    _imgCache.set(url, data);
    return data;
  } catch {
    return null;
  }
}

// Copy every resolved style from src onto dst as an inline style string.
function inlineStyles(src: Element, dst: Element) {
  const cs = window.getComputedStyle(src);
  let str = "";
  for (let i = 0; i < cs.length; i++) {
    const prop = cs[i];
    str += `${prop}:${cs.getPropertyValue(prop)};`;
  }
  dst.setAttribute("style", str);
  (dst as HTMLElement).removeAttribute("class");
}

function walk(src: Element, dst: Element) {
  inlineStyles(src, dst);
  const sc = src.children;
  const dc = dst.children;
  for (let i = 0; i < sc.length; i++) {
    if (dc[i]) walk(sc[i], dc[i]);
  }
}

// Replace every url(...) inside an inline style string with an embedded data URL.
async function embedStyleUrls(el: HTMLElement) {
  const all = [el, ...Array.from(el.querySelectorAll<HTMLElement>("*"))];
  const jobs: Promise<void>[] = [];
  for (const node of all) {
    const style = node.getAttribute("style");
    if (!style || !style.includes("url(")) continue;
    const urls = new Set<string>();
    style.replace(/url\((['"]?)([^'")]+)\1\)/g, (_m, _q, u) => {
      urls.add(u);
      return _m;
    });
    for (const u of urls) {
      jobs.push(
        (async () => {
          const data = await urlToDataUrl(u);
          if (data) {
            const cur = node.getAttribute("style") || "";
            node.setAttribute(
              "style",
              cur.split(u).join(data)
            );
          }
        })()
      );
    }
  }
  await Promise.all(jobs);
}

// Inline <img src> as data URLs — relative/sub-path srcs don't resolve inside
// the SVG, and only data URLs render reliably in the rasterized output.
async function embedImgTags(el: HTMLElement) {
  const imgs = Array.from(el.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const raw = img.getAttribute("src");
      if (!raw || raw.startsWith("data:")) return;
      const abs = new URL(raw, location.href).href;
      const data = await urlToDataUrl(abs);
      if (data) img.setAttribute("src", data);
    })
  );
}

export async function nodeToPng(
  node: HTMLElement,
  targetPx: number,
  fontCss: string
): Promise<string> {
  const w = node.offsetWidth;
  const h = node.offsetHeight;

  const clone = node.cloneNode(true) as HTMLElement;
  walk(node, clone);
  await embedStyleUrls(clone);
  await embedImgTags(clone);

  // ensure the clone is laid out at the source box size
  clone.style.width = `${w}px`;
  clone.style.height = `${h}px`;
  clone.style.margin = "0";

  const styleTag = fontCss ? `<style>${fontCss}</style>` : "";
  const xml = new XMLSerializer().serializeToString(clone);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${targetPx}" height="${targetPx}" viewBox="0 0 ${w} ${h}">` +
    `<foreignObject x="0" y="0" width="${w}" height="${h}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml">${styleTag}${xml}</div>` +
    `</foreignObject></svg>`;

  // Build a data: URL for the SVG (a Blob/object URL taints the canvas in some
  // engines; a data: URL does not). Convert via FileReader rather than
  // encodeURIComponent — the latter blocks the main thread on the embedded
  // ~600KB font, the former is native and async.
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("이미지 렌더 실패"));
    img.src = dataUrl;
  });
  if (img.decode) {
    try {
      await img.decode();
    } catch {
      /* best-effort */
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetPx;
  canvas.height = targetPx;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, targetPx, targetPx);
  return canvas.toDataURL("image/png");
}
