import { PosterData, posterDoc, esc } from './index'

// Oversized-typography poster — big editorial headline. Great for a "SUMMER
// SPECIAL", "GRAND OPENING" or "HAPPY HOURS" announcement.
export function boldPosterHTML(d: PosterData): string {
  const accent = d.accent || '#f97316'
  const name = esc(d.restaurantName || 'Our Restaurant')
  const headline = (d.headline || 'Summer Special').toUpperCase()
  const sub = esc(d.subtext || 'Fresh flavours, made to order')
  const logo = d.logoUrl
    ? `<img class="logo" src="${d.logoUrl}" crossorigin="anonymous"/>` : ''

  // Split headline into stacked words; shrink the type so the longest word
  // always fits the poster width (no clipping).
  const wordList = headline.split(/\s+/).filter(Boolean).slice(0, 3)
  const maxLen = Math.max(4, ...wordList.map(w => w.length))
  const fs = Math.max(78, Math.min(160, Math.floor(1560 / maxLen)))
  const words = wordList
    .map((w, i) => `<span class="w" style="font-size:${fs}px;${i === 1 ? `color:${accent}` : ''}">${esc(w)}</span>`).join('')

  const css = `
    .poster{background:#f7f4ee;color:#141414;padding:90px 80px;display:flex;flex-direction:column;}
    .head{display:flex;align-items:center;gap:22px;margin-bottom:20px;}
    .logo{width:96px;height:96px;border-radius:22px;object-fit:cover;}
    .name{font-size:38px;font-weight:700;letter-spacing:4px;text-transform:uppercase;}
    .big{flex:1;display:flex;flex-direction:column;justify-content:center;}
    .w{display:block;font-weight:900;line-height:.88;letter-spacing:-4px;
      text-transform:uppercase;white-space:nowrap;}
    .sub{font-size:40px;font-weight:500;margin-top:34px;max-width:760px;line-height:1.3;color:#444;}
    .foot{display:flex;align-items:center;gap:34px;border-top:6px solid #141414;padding-top:44px;}
    .qrwrap{padding:16px;border-radius:20px;box-shadow:none;border:3px solid #141414;}
    .qrwrap img{width:180px;height:180px;}
    .cta{flex:1;}
    .ctabig{font-size:50px;font-weight:900;text-transform:uppercase;letter-spacing:-1px;}
    .ctasmall{font-size:30px;font-weight:600;color:${accent};margin-top:6px;}
  `
  const inner = `
    <div class="head">${logo}<div class="name">${name}</div></div>
    <div class="big"><div>${words}</div><div class="sub">${sub}</div></div>
    <div class="foot">
      <div class="qrwrap"><img src="${d.qrDataUrl}"/></div>
      <div class="cta"><div class="ctabig">Scan &<br/>Order</div>
      <div class="ctasmall">${esc(d.menuUrl)}</div></div>
    </div>`
  return posterDoc(inner, css)
}
