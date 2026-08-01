import { PosterData, posterDoc, esc } from './index'

// Full-bleed advertising poster — big hero food photo, bold overlaid headline,
// feature call-outs and a scan-to-order strip. Matches the classic light-box
// product-ad look. Uses the restaurant cover, else the first dish photo.
export function coverPosterHTML(d: PosterData): string {
  const accent = d.accent && d.accent !== '#ffffff' ? d.accent : '#e11d48'
  const name = esc(d.restaurantName || 'Our Restaurant')
  const headline = esc(d.headline || 'Fresh & Delicious')
  const sub = esc(d.subtext || 'Made to order, every time')
  const hero = d.coverUrl || d.items?.find(i => i.image_url)?.image_url || ''
  const heroLayer = hero
    ? `<img class="hero" src="${hero}" crossorigin="anonymous"/>`
    : `<div class="hero herofallback"></div>`

  const featList = d.features && d.features.length ? d.features.slice(0, 3) : ['100% Fresh', 'Made to Order', 'Great Taste']
  const feats = featList.map(f => `<div class="feat">${esc(f)}</div>`).join('')
  const offerBadge = d.badge ? `<div class="offer">${esc(d.badge)}</div>` : ''

  const css = `
    .poster{background:${accent};overflow:hidden;}
    .hero{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
    .herofallback{background:linear-gradient(135deg,#333,#111);}
    .shade{position:absolute;inset:0;background:linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.05) 40%, rgba(0,0,0,.72) 100%);}
    .side{position:absolute;left:0;top:0;bottom:0;width:150px;background:${accent};
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:36px;}
    .feat{color:#fff;font-size:30px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
      writing-mode:vertical-rl;transform:rotate(180deg);}
    .top{position:absolute;top:70px;left:210px;right:80px;display:flex;align-items:center;gap:20px;color:#fff;}
    .badge{background:#fff;color:${accent};font-size:28px;font-weight:800;padding:10px 24px;border-radius:100px;letter-spacing:2px;text-transform:uppercase;}
    .bottom{position:absolute;left:210px;right:80px;bottom:70px;color:#fff;}
    .headline{font-size:130px;font-weight:900;line-height:.92;letter-spacing:-3px;text-shadow:0 4px 24px rgba(0,0,0,.4);}
    .sub{font-size:44px;font-weight:600;margin-top:18px;text-shadow:0 2px 12px rgba(0,0,0,.4);}
    .scan{display:flex;align-items:center;gap:26px;margin-top:44px;background:rgba(255,255,255,.16);
      backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.3);border-radius:24px;padding:22px;width:fit-content;}
    .qrwrap{padding:12px;border-radius:16px;box-shadow:none;}
    .qrwrap img{width:150px;height:150px;}
    .scan .t1{font-size:40px;font-weight:800;}
    .scan .t2{font-size:26px;opacity:.9;margin-top:4px;}
    .offer{position:absolute;top:60px;right:70px;width:190px;height:190px;background:#fff;color:${accent};
      border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;
      font-size:52px;font-weight:900;line-height:1;transform:rotate(9deg);padding:22px;box-shadow:0 12px 30px rgba(0,0,0,.35);}
  `
  const inner = `
    ${heroLayer}
    <div class="shade"></div>
    <div class="side">${feats}</div>
    <div class="top"><div class="badge">${name}</div></div>
    ${offerBadge}
    <div class="bottom">
      <div class="headline">${headline}</div>
      <div class="sub">${sub}</div>
      <div class="scan"><div class="qrwrap"><img src="${d.qrDataUrl}"/></div>
        <div><div class="t1">${esc(d.cta || 'Scan to Order')}</div>
        <div class="t2">${d.phone ? '📞 ' + esc(d.phone) + '  ·  ' : ''}${esc(d.menuUrl)}</div></div></div>
    </div>`
  return posterDoc(inner, css)
}
