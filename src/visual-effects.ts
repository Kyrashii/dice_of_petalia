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

  return { burst, popScore, lumaHearts: () => lumaParticles("heart", 6), lumaStars: multiplier => lumaParticles("star", Math.min(10, 3 + multiplier)), skinEffect };
}
