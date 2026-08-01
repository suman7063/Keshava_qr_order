import { PosterData, posterDoc, esc, money } from './index'

// Promotion poster: big typed headline (e.g. "20% OFF"), supporting line, a few
// featured dishes with photos/prices, and a small "scan to order" QR corner.
export function offerPosterHTML(d: PosterData): string {
  const accent = d.accent || '#e11d48'
  const heading = esc(d.headline || 'Today’s Special')
  const sub = esc(d.subtext || 'Limited time only — grab it before it’s gone!')
  const name = esc(d.restaurantName || 'Our Restaurant')
  const items = (d.items || []).slice(0, 3)
  const badge = d.badge ? `<div class="obadge">${esc(d.badge)}</div>` : ''

  const itemCards = items.map(it => {
    const img = it.image_url
      ? `<img class="pic" src="${it.image_url}" crossorigin="anonymous"/>`
      : `<div class="pic pic-fallback">🍽️</div>`
    const veg = it.is_vegetarian
      ? `<span class="veg" title="Veg"></span>` : ''
    return `<div class="card">${img}
      <div class="cinfo"><div class="cname">${veg}${esc(it.name)}</div>
      <div class="cprice">${money(it.price)}</div></div></div>`
  }).join('')

  const css = `
    .poster{background:#faf7f2;display:flex;flex-direction:column;padding:0;}
    .top{background:linear-gradient(135deg, ${accent}, ${accent}cc);color:#fff;
      padding:80px 80px 70px;text-align:center;position:relative;}
    .rname{font-size:38px;font-weight:700;letter-spacing:3px;text-transform:uppercase;opacity:.95;margin-bottom:26px;}
    .obadge{position:absolute;top:44px;right:56px;background:#fff;color:${accent};font-size:42px;font-weight:900;
      padding:16px 32px;border-radius:100px;transform:rotate(-6deg);box-shadow:0 10px 24px rgba(0,0,0,.22);}
    .heading{font-size:118px;font-weight:900;line-height:.95;letter-spacing:-1px;text-transform:uppercase;}
    .sub{font-size:34px;font-weight:500;margin-top:22px;opacity:.96;line-height:1.3;max-width:820px;margin-left:auto;margin-right:auto;}
    .items{flex:1;display:flex;flex-direction:column;gap:34px;padding:64px 80px 40px;}
    .card{background:#fff;border-radius:28px;box-shadow:0 12px 34px rgba(0,0,0,.08);
      display:flex;align-items:center;gap:36px;padding:26px;overflow:hidden;}
    .pic{width:190px;height:190px;border-radius:22px;object-fit:cover;flex-shrink:0;}
    .pic-fallback{display:flex;align-items:center;justify-content:center;background:${accent}18;font-size:80px;}
    .cinfo{flex:1;min-width:0;}
    .cname{font-size:46px;font-weight:700;color:#1a1a1a;line-height:1.15;display:flex;align-items:center;gap:16px;}
    .veg{width:26px;height:26px;border:3px solid #2e9c4f;border-radius:5px;position:relative;flex-shrink:0;}
    .veg:after{content:'';position:absolute;inset:5px;background:#2e9c4f;border-radius:50%;}
    .cprice{font-size:52px;font-weight:800;color:${accent};margin-top:8px;}
    .foot{display:flex;align-items:center;gap:34px;background:#1a1a1a;color:#fff;padding:44px 80px;}
    .qrwrap{padding:18px;border-radius:22px;}
    .qrwrap img{width:180px;height:180px;}
    .ftext{flex:1;}
    .fbig{font-size:44px;font-weight:800;line-height:1.1;}
    .fsmall{font-size:28px;opacity:.8;margin-top:8px;}
  `
  const inner = `
    <div class="top">
      ${badge}
      <div class="rname">${name}</div>
      <div class="heading">${heading}</div>
      <div class="sub">${sub}</div>
    </div>
    <div class="items">${itemCards || ''}</div>
    <div class="foot">
      <div class="qrwrap"><img src="${d.qrDataUrl}"/></div>
      <div class="ftext"><div class="fbig">${esc(d.cta || 'Scan to Order')}</div>
      <div class="fsmall">${d.phone ? '📞 ' + esc(d.phone) + '  ·  ' : ''}${esc(d.menuUrl)}</div></div>
    </div>`
  return posterDoc(inner, css)
}
