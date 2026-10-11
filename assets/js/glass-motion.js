/* Small viewport physics, shared by the background and its offline checks. */
(function () {
  'use strict';

  function stepParticle(particle, pointer, width, height, dt) {
    var p = particle;
    var radius = Math.min(p.radius, width / 2, height / 2);
    var targetX, targetY;
    dt = Math.min(Math.max(dt, 0), 1 / 30);

    if (pointer) {
      targetX = Math.max(radius, Math.min(width - radius, pointer.x + p.offsetX));
      targetY = Math.max(radius, Math.min(height - radius, pointer.y + p.offsetY));
      p.vx += ((targetX - p.x) * 7 - p.vx * 4) * dt;
      p.vy += ((targetY - p.y) * 7 - p.vy * 4) * dt;
    } else {
      p.vy += 220 * dt;
      p.vx *= Math.exp(-.2 * dt);
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.x < radius || p.x > width - radius) {
      p.x = Math.max(radius, Math.min(width - radius, p.x));
      p.vx = p.x === radius ? Math.abs(p.vx) * .75 : -Math.abs(p.vx) * .75;
    }
    if (p.y < radius || p.y > height - radius) {
      p.y = Math.max(radius, Math.min(height - radius, p.y));
      p.vy = p.y === radius ? Math.abs(p.vy) * .72 : -Math.abs(p.vy) * .72;
      if (!pointer && p.y === height - radius && Math.abs(p.vy) < 12) p.vy = 0;
    }
    return p;
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = stepParticle;
    return;
  }

  var scene = document.querySelector('.portfolio-home .glass-scene');
  var toggle = document.getElementById('glass-motion');
  if (!scene || !toggle) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var particles = [];
  var pointer = null;
  var lastInput = -Infinity;
  var lastFrame = 0;
  var frame = null;
  var width = window.innerWidth;
  var height = window.innerHeight;
  var positions = [[.08,.22], [.86,.13], [.46,.08], [.14,.74], [.81,.67], [.62,.43], [.94,.9]];

  positions.forEach(function (position, index) {
    var element = document.createElement('span');
    var radius = (width < 760 ? 30 : 48) + (index % 3) * 12;
    element.className = 'glass-particle glass-particle--' + index % 3;
    element.style.width = element.style.height = radius * 2 + 'px';
    scene.appendChild(element);
    particles.push({
      element: element, radius: radius,
      x: width * position[0], y: height * position[1], vx: (index % 2 ? 1 : -1) * 18, vy: -12,
      offsetX: Math.cos(index * 2.4) * (width < 760 ? 90 : 190),
      offsetY: Math.sin(index * 2.4) * (width < 760 ? 85 : 140)
    });
  });

  function draw() {
    particles.forEach(function (p) {
      p.element.style.transform = 'translate3d(' + (p.x - p.radius).toFixed(2) + 'px,' + (p.y - p.radius).toFixed(2) + 'px,0)';
    });
  }

  function tick(now) {
    var dt = lastFrame ? (now - lastFrame) / 1000 : 0;
    lastFrame = now;
    var activePointer = pointer && now - lastInput < 900 ? pointer : null;
    particles.forEach(function (p) { stepParticle(p, activePointer, width, height, dt); });
    draw();
    frame = window.requestAnimationFrame(tick);
  }

  function updatePlayback() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    lastFrame = 0;
    pointer = null;
    if (toggle.checked && !reducedMotion.matches && !document.hidden) frame = window.requestAnimationFrame(tick);
  }

  window.addEventListener('pointermove', function (event) {
    if (!toggle.checked || reducedMotion.matches || (event.pointerType === 'touch' && event.buttons === 0)) return;
    pointer = { x: event.clientX, y: event.clientY };
    lastInput = performance.now();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', function () { pointer = null; });
  window.addEventListener('blur', function () { pointer = null; });
  window.addEventListener('resize', function () {
    width = window.innerWidth;
    height = window.innerHeight;
    particles.forEach(function (p) { stepParticle(p, null, width, height, 0); });
    draw();
  }, { passive: true });
  toggle.addEventListener('change', updatePlayback);
  reducedMotion.addEventListener('change', updatePlayback);
  document.addEventListener('visibilitychange', updatePlayback);
  draw();
  updatePlayback();
}());
