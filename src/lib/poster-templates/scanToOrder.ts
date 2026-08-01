import { PosterData, posterDoc, esc } from './index'

// QR-focused poster: bold branded header, huge centred QR, call-to-action.
// Perfect for a light box at the entrance / counter.
export function scanPosterHTML(d: PosterData): string {
  const accent = d.accent || '#f97316'
  const heading = esc(d.headline || 'Scan to Order')
  const sub = esc(d.subtext || 'Browse our full menu & order from your table')
  const name = esc(d.restaurantName || 'Our Restaurant')
  const logo = d.logoUrl
    ? `<img class="logo" src="${d.logoUrl}" crossorigin="anonymous"/>`
    : `<div class="logo logo-fallback">${name.slice(0, 1).toUpperCase()}</div>`

  const css = `
    .poster{background:linear-gradient(160deg, ${accent}, ${accent}cc 55%, ${accent}99);color:#fff;
      display:flex;flex-direction:column;align-items:center;text-align:center;padding:90px 80px;}
    .brandrow{display:flex;align-items:center;gap:24px;margin-bottom:40px;}
    .logo{width:120px;height:120px;border-radius:26px;object-fit:cover;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.2);}
    .logo-fallback{display:flex;align-items:center;justify-content:center;color:${accent};font-size:60px;font-weight:800;}
    .rname{font-size:56px;font-weight:800;letter-spacing:.5px;line-height:1.05;text-align:left;max-width:520px;}
    .heading{font-size:86px;font-weight:900;line-height:1;margin:30px 0 18px;text-transform:uppercase;letter-spacing:1px;}
    .sub{font-size:34px;font-weight:500;opacity:.95;max-width:760px;line-height:1.35;margin-bottom:54px;}
    .qrwrap{margin-bottom:40px;}
    .qrwrap img{width:520px;height:520px;}
    .url{font-size:30px;font-weight:600;letter-spacing:.5px;background:rgba(255,255,255,.16);
      padding:14px 34px;border-radius:100px;margin-bottom:auto;}
    .steps{display:flex;gap:52px;margin-top:56px;}
    .step{display:flex;flex-direction:column;align-items:center;gap:12px;font-size:26px;font-weight:600;}
    .stepnum{width:64px;height:64px;border-radius:50%;background:#fff;color:${accent};
      display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800;}
  `
  const inner = `
    <div class="brandrow">${logo}<div class="rname">${name}</div></div>
    <div class="heading">${heading}</div>
    <div class="sub">${sub}</div>
    <div class="qrwrap"><img src="${d.qrDataUrl}"/></div>
    <div class="url">${esc(d.menuUrl)}</div>
    <div class="steps">
      <div class="step"><div class="stepnum">1</div>Scan</div>
      <div class="step"><div class="stepnum">2</div>Browse</div>
      <div class="step"><div class="stepnum">3</div>Order</div>
    </div>`
  return posterDoc(inner, css)
}
