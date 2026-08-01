import { PosterData, posterDoc, esc } from './index'

// Bright flyer (à la "Tasty Health Menu · 50% OFF · Free Home Delivery"):
// light stage, playful headline, round hero with brush ring, offer bubble,
// delivery + contact footer.
export function flyerPosterHTML(d: PosterData): string {
  const accent = d.accent && d.accent !== '#ffffff' ? d.accent : '#e11d48'
  const green = '#5a9e2f'
  const name = esc(d.restaurantName || 'Our Restaurant')
  const headline = esc(d.headline || 'Tasty Menu')
  const sub = esc(d.subtext || 'Enjoy the taste')
  const cta = esc(d.cta || 'Free Home Delivery')
  const hero = d.coverUrl || d.items?.find(i => i.image_url)?.image_url || ''
  const heroImg = hero
    ? `<img class="hero" src="${hero}" crossorigin="anonymous"/>`
    : `<div class="hero heroph">🍽️</div>`
  const bubble = d.badge ? `<div class="bubble">${esc(d.badge)}</div>` : ''

  const css = `
    .poster{background:#f7f5f1;color:#1e1e1e;padding:80px 70px 64px;display:flex;flex-direction:column;
      align-items:center;text-align:center;position:relative;overflow:hidden;}
    .corner{position:absolute;width:220px;height:220px;border-radius:0 0 60px 0;}
    .c-l{top:-30px;left:-30px;background:${green};transform:rotate(0);border-radius:0 0 90px 0;}
    .c-r{top:-30px;right:-30px;background:${accent};border-radius:0 0 0 90px;}
    .brand{font-size:30px;font-weight:800;letter-spacing:4px;text-transform:uppercase;color:${accent};margin-top:20px;}
    .headline{font-size:120px;font-weight:900;line-height:.92;text-transform:uppercase;color:${accent};
      letter-spacing:-2px;margin-top:14px;}
    .sub{font-size:44px;font-weight:700;color:#1e1e1e;margin-top:8px;}
    .herowrap{position:relative;margin:44px 0 auto;}
    .hero{width:620px;height:620px;object-fit:cover;border-radius:50%;border:14px solid ${green};
      box-shadow:0 24px 50px rgba(0,0,0,.14);}
    .heroph{display:flex;align-items:center;justify-content:center;background:${accent}14;font-size:200px;}
    .bubble{position:absolute;top:-10px;left:-30px;width:180px;height:180px;background:#fff;border:6px solid ${accent};
      color:${accent};border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;
      font-size:52px;font-weight:900;line-height:1;padding:20px;box-shadow:0 10px 24px rgba(0,0,0,.12);}
    .foot{display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:34px;}
    .deliv{text-align:left;}
    .dtitle{font-size:36px;font-weight:800;color:${green};}
    .dphone{font-size:40px;font-weight:900;color:${accent};margin-top:2px;}
    .durl{font-size:24px;color:#666;margin-top:8px;}
    .qrwrap{padding:12px;border:3px solid ${accent}44;border-radius:16px;box-shadow:none;}
    .qrwrap img{width:150px;height:150px;}
  `
  const inner = `
    <div class="corner c-l"></div><div class="corner c-r"></div>
    <div class="brand">${name}</div>
    <div class="headline">${headline}</div>
    <div class="sub">${sub}</div>
    <div class="herowrap">${heroImg}${bubble}</div>
    <div class="foot">
      <div class="deliv"><div class="dtitle">${cta}</div>
        ${d.phone ? `<div class="dphone">${esc(d.phone)}</div>` : ''}
        <div class="durl">${esc(d.menuUrl)}</div></div>
      <div class="qrwrap"><img src="${d.qrDataUrl}"/></div>
    </div>`
  return posterDoc(inner, css)
}
