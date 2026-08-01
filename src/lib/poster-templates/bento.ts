import { PosterData, posterDoc, esc, money } from './index'

// Bento-grid poster — rounded cells (branding, QR, up to 4 dishes). Trendy,
// playful, shows a few dishes at a glance.
export function bentoPosterHTML(d: PosterData): string {
  const accent = d.accent && d.accent !== '#ffffff' ? d.accent : '#ea580c'
  const name = esc(d.restaurantName || 'Our Restaurant')
  const headline = esc(d.headline || 'Taste the best')
  const items = (d.items || []).slice(0, 4)

  const dishCell = (i: number) => {
    const it = items[i]
    if (!it) return `<div class="cell empty"></div>`
    const img = it.image_url
      ? `<img class="dimg" src="${it.image_url}" crossorigin="anonymous"/>`
      : `<div class="dimg dfallback">🍽️</div>`
    return `<div class="cell dish">${img}
      <div class="dinfo"><span class="dname">${esc(it.name)}</span><span class="dprice">${money(it.price)}</span></div></div>`
  }

  const css = `
    .poster{background:#f4f1ea;padding:54px;display:grid;gap:26px;
      grid-template-columns:1fr 1fr;grid-template-rows:auto 1fr 1fr auto;}
    .cell{border-radius:36px;overflow:hidden;position:relative;}
    .brand{grid-column:1 / 3;background:${accent};color:#fff;padding:50px 56px;display:flex;align-items:center;justify-content:space-between;}
    .brand .bt{font-size:34px;font-weight:700;letter-spacing:3px;text-transform:uppercase;opacity:.9;}
    .brand .bh{font-size:62px;font-weight:900;line-height:1;margin-top:6px;}
    .brand .logo{width:130px;height:130px;border-radius:28px;object-fit:cover;background:#fff;}
    .dish{background:#fff;box-shadow:0 10px 26px rgba(0,0,0,.06);display:flex;flex-direction:column;}
    .dimg{width:100%;height:100%;object-fit:cover;flex:1;}
    .dfallback{display:flex;align-items:center;justify-content:center;background:${accent}14;font-size:100px;}
    .dinfo{position:absolute;left:0;right:0;bottom:0;padding:22px 26px;background:linear-gradient(transparent, rgba(0,0,0,.72));
      color:#fff;display:flex;align-items:flex-end;justify-content:space-between;gap:12px;}
    .dname{font-size:34px;font-weight:700;line-height:1.1;}
    .dprice{font-size:34px;font-weight:800;flex-shrink:0;}
    .empty{background:#e8e4da;}
    .qr{grid-column:1 / 3;background:#141414;color:#fff;display:flex;align-items:center;gap:34px;padding:40px 56px;}
    .qrwrap{padding:14px;border-radius:18px;box-shadow:none;}
    .qrwrap img{width:170px;height:170px;}
    .qt1{font-size:46px;font-weight:800;}
    .qt2{font-size:28px;opacity:.75;margin-top:6px;}
  `
  const logo = d.logoUrl ? `<img class="logo" src="${d.logoUrl}" crossorigin="anonymous"/>` : ''
  const inner = `
    <div class="cell brand"><div><div class="bt">${name}</div><div class="bh">${headline}</div></div>${logo}</div>
    ${dishCell(0)}${dishCell(1)}${dishCell(2)}${dishCell(3)}
    <div class="cell qr"><div class="qrwrap"><img src="${d.qrDataUrl}"/></div>
      <div><div class="qt1">Scan to Order</div><div class="qt2">${esc(d.menuUrl)}</div></div></div>`
  return posterDoc(inner, css)
}
