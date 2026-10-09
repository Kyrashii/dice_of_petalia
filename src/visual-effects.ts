// @ts-nocheck

export function createVisualEffects({ query, colors, reduceMotion }) {
  function removeAfter(element, duration) { setTimeout(() => element.remove(), duration); }

  function burst(x, y, count) {
    for (let index = 0; index < count; index++) {
      const particle = document.createElement("i"), angle = Math.random() * Math.PI * 2, distance = 40 + Math.random() * 150;
      particle.className = "burst"; particle.style.cssText = `left:${x}px;top:${y}px;background:${colors[index % colors.length]};--x:${Math.cos(angle) * distance}px;--y:${Math.sin(angle) * distance}px`;
      document.body.appendChild(particle); removeAfter(particle, 1100);
    }
  }

  function popScore(score) {
    const preview = query("#preview").getBoundingClientRect(), element = document.createElement("div");
    element.className = "score-pop"; element.textContent = `+${score.toLocaleString()}`; element.style.left = `${preview.left + preview.width / 2 - 28}px`; element.style.top = `${preview.top}px`;
    document.body.appendChild(element); removeAfter(element, 1200);
  }

  function lumaParticles(kind, count) {
    if (reduceMotion) return;
    const stage = query("#guardian"); if (!stage) return;
    const rect = stage.getBoundingClientRect();
    for (let index = 0; index < count; index++) {
      const particle = document.createElement("i"), angle = Math.random() * Math.PI * 2, range = 34 + Math.random() * 54;
      particle.className = `luma-${kind}`; particle.textContent = kind === "star" ? "✦" : "♥";
      particle.style.left = `${rect.left + rect.width * (.2 + Math.random() * .6)}px`; particle.style.top = `${rect.top + rect.height * (.16 + Math.random() * .58)}px`;
      particle.style.setProperty("--drift-x", `${Math.cos(angle) * range}px`); particle.style.setProperty("--drift-y", `${Math.sin(angle) * range - 28}px`);
      document.body.appendChild(particle); removeAfter(particle, 950);
    }
  }

  function skinEffect(skin) {
    if (!skin || reduceMotion) return;
    const colorsBySkin = { sakura:["#ff9fc8","#ffd2e4"], mint:["#83dbc0","#dffff4"], pearl:["#f0c2da","#fff2d8"], crystal:["#d8a0ff","#a8d8ff"] };
    const glyphsBySkin = { sakura:["✿","·"], mint:["❋","•"], pearl:["✦","·"], crystal:["◆","✧"] };
    const table = document.querySelector(".moon-table"), rect = table?.getBoundingClientRect(); if (!rect) return;
    for (let index = 0; index < 12; index++) {
      const particle = document.createElement("i"), angle = Math.random() * Math.PI * 2, distance = 46 + Math.random() * 105;
      particle.className = `skin-effect skin-effect-${skin.id}`; particle.textContent = glyphsBySkin[skin.id][index % 2];
      particle.style.left = `${rect.left + rect.width * (.22 + Math.random() * .56)}px`; particle.style.top = `${rect.top + rect.height * (.4 + Math.random() * .34)}px`; particle.style.color = colorsBySkin[skin.id][index % 2];
      particle.style.setProperty("--drift-x", `${Math.cos(angle) * distance}px`); particle.style.setProperty("--drift-y", `${Math.sin(angle) * distance - 62}px`);
      document.body.appendChild(particle); removeAfter(particle, 1000);
    }
  }

  // Small puffs where a die lands on the table.
  function dust(x, y) {
    if (reduceMotion) return;
    for (let index = 0; index < 4; index++) {
      const puff = document.createElement("i");
      puff.className = "dust-puff";
      puff.style.left = `${x}px`; puff.style.top = `${y}px`;
      puff.style.setProperty("--drift-x", `${(index - 1.5) * 14 + (Math.random() * 6 - 3)}px`);
      document.body.appendChild(puff); removeAfter(puff, 600);
    }
  }

  // Petals that flutter down across the whole screen.
  function petalRain(count = 36, palette = colors) {
    if (reduceMotion) return;
    for (let index = 0; index < count; index++) {
      const petal = document.createElement("i");
      petal.className = "petal-fall";
      petal.style.left = `${Math.random() * 100}vw`;
      petal.style.background = palette[index % palette.length];
      petal.style.setProperty("--fall-delay", `${Math.random() * .6}s`);
      petal.style.setProperty("--fall-time", `${1.8 + Math.random() * 1.4}s`);
      petal.style.setProperty("--sway", `${(Math.random() * 2 - 1) * 90}px`);
      petal.style.setProperty("--spin", `${(Math.random() < .5 ? -1 : 1) * (360 + Math.random() * 540)}deg`);
      petal.style.setProperty("--size", `${8 + Math.random() * 9}px`);
      document.body.appendChild(petal); removeAfter(petal, 3900);
    }
  }

  // A big hand name ("Full House!") that blooms over the table.
  function flourish(text, tier) {
    const table = query(".moon-table")?.getBoundingClientRect();
    const element = document.createElement("div");
    element.className = `hand-flourish tier-${tier}`;
    element.textContent = text;
    if (table) { element.style.left = `${table.left + table.width / 2}px`; element.style.top = `${table.top + table.height * .42}px`; }
    document.body.appendChild(element); removeAfter(element, reduceMotion ? 700 : 1300);
  }

  // Title card for a new round.
  function roundCard(title, subtitle) {
    const card = document.createElement("div");
    card.className = "round-card-splash";
    card.setAttribute("aria-hidden", "true");
    card.innerHTML = `<b>${title}</b><span>${subtitle}</span>`;
    document.body.appendChild(card); removeAfter(card, reduceMotion ? 900 : 1700);
  }

  // The played score flies from the hand-score box up into the round score.
  function scoreFly(score, fromSelector, toSelector) {
    const from = query(fromSelector)?.getBoundingClientRect(), to = query(toSelector)?.getBoundingClientRect();
    if (!from || !to || reduceMotion) return;
    const element = document.createElement("div");
    element.className = "score-fly"; element.textContent = `+${score.toLocaleString()}`;
    element.style.left = `${from.left + from.width / 2}px`; element.style.top = `${from.top + from.height / 2}px`;
    element.style.setProperty("--fly-x", `${to.left + to.width / 2 - (from.left + from.width / 2)}px`);
    element.style.setProperty("--fly-y", `${to.top + to.height / 2 - (from.top + from.height / 2)}px`);
    document.body.appendChild(element); removeAfter(element, 900);
  }

  // Gentle petals and fireflies drifting through the garden behind the table.
  function startAmbient(layer) {
    if (!layer || reduceMotion || layer.childElementCount) return;
    const tones = ["#ffd1e6", "#fff4c2", "#e3d6ff", "#c9f1e1"];
    for (let index = 0; index < 14; index++) {
      const mote = document.createElement("i");
      const firefly = index % 3 === 0;
      mote.className = firefly ? "ambient-firefly" : "ambient-petal";
      mote.style.left = `${Math.random() * 100}%`;
      mote.style.top = `${Math.random() * 100}%`;
      mote.style.setProperty("--drift-time", `${14 + Math.random() * 16}s`);
      mote.style.setProperty("--drift-delay", `${-Math.random() * 20}s`);
      mote.style.setProperty("--drift-x", `${(Math.random() * 2 - 1) * 160}px`);
      mote.style.setProperty("--tone", tones[index % tones.length]);
      layer.appendChild(mote);
    }
  }

  return { burst, popScore, dust, petalRain, flourish, roundCard, scoreFly, startAmbient, lumaHearts: () => lumaParticles("heart", 6), lumaStars: multiplier => lumaParticles("star", Math.min(10, 3 + multiplier)), skinEffect };
}
