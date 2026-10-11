/* Lightweight circle physics; no rendering or physics dependencies. */
(function () {
  'use strict';
  var gravity = 100;

  function findNearest(particles, pointer) {
    var nearest = -1;
    var distance = Infinity;
    particles.forEach(function (p, index) {
      var gap = Math.max(0, Math.hypot(p.x - pointer.x, p.y - pointer.y) - p.radius);
      if (gap < distance) { distance = gap; nearest = index; }
    });
    return nearest;
  }

  function contain(p, width, height) {
    var r = p.radius;
    if (p.x < r) { p.x = r; if (p.vx < 0) p.vx *= -.97; }
    if (p.x > width - r) { p.x = width - r; if (p.vx > 0) p.vx *= -.97; }
    if (p.y < r) { p.y = r; if (p.vy < 0) p.vy *= -.97; }
    if (p.y > height - r) {
      p.y = height - r;
      // Keep the ambient scene lively after repeated contacts lose energy.
      if (p.vy > 0) p.vy = -Math.max(p.vy * .97, Math.sqrt(2 * gravity * height * .55));
    }
  }

  function collide(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var radius = a.radius + b.radius;
    var square = dx * dx + dy * dy;
    if (square >= radius * radius) return;
    var distance = Math.sqrt(square);
    var nx = distance > .0001 ? dx / distance : 1;
    var ny = distance > .0001 ? dy / distance : 0;
    var inverseA = 1 / (a.radius * a.radius);
    var inverseB = 1 / (b.radius * b.radius);
    var inverseSum = inverseA + inverseB;
    var correction = (radius - distance) / inverseSum;
    a.x -= nx * correction * inverseA;
    a.y -= ny * correction * inverseA;
    b.x += nx * correction * inverseB;
    b.y += ny * correction * inverseB;
    var closingSpeed = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (closingSpeed >= 0) return;
    var impulse = -(1 + .95) * closingSpeed / inverseSum;
    a.vx -= impulse * nx * inverseA;
    a.vy -= impulse * ny * inverseA;
    b.vx += impulse * nx * inverseB;
    b.vy += impulse * ny * inverseB;
  }

  function stepWorld(particles, pointer, selected, width, height, elapsed) {
    elapsed = Math.min(Math.max(elapsed, 0), 1 / 30);
    var steps = Math.max(1, Math.ceil(elapsed / (1 / 120)));
    var dt = elapsed / steps;
    for (var step = 0; step < steps; step++) {
      particles.forEach(function (p, index) {
        if (pointer && index === selected) {
          var targetX = Math.max(p.radius, Math.min(width - p.radius, pointer.x));
          var targetY = Math.max(p.radius, Math.min(height - p.radius, pointer.y));
          p.vx += ((targetX - p.x) * 16 - p.vx * 6) * dt;
          p.vy += ((targetY - p.y) * 16 - p.vy * 6) * dt;
        } else { p.vy += gravity * dt; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        contain(p, width, height);
      });
      // A few passes separate simultaneous contacts without a large engine.
      for (var pass = 0; pass < 3; pass++) {
        for (var a = 0; a < particles.length; a++) {
          for (var b = a + 1; b < particles.length; b++) collide(particles[a], particles[b]);
        }
        particles.forEach(function (p) { contain(p, width, height); });
      }
    }
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = { findNearest: findNearest, stepWorld: stepWorld };
    return;
  }
  var scene = document.querySelector('.portfolio-home .glass-scene');
  if (!scene) return;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var particles = [];
  var pointer = null;
  var selected = -1;
  var lastInput = -Infinity;
  var lastFrame = 0;
  var frame = null;
  var width = window.innerWidth;
  var height = window.innerHeight;
  var sizes = [14, 20, 27, 35, 44, 54];
  var count = width < 760 ? 18 : 26;

  function radiusFor(base) { return Math.min(base * (width < 760 ? .6 : 1), width / 4, height / 4); }

  for (var index = 0; index < count; index++) {
    var element = document.createElement('span');
    var baseRadius = sizes[index % sizes.length];
    var radius = radiusFor(baseRadius);
    var particle = { element: element, baseRadius: baseRadius, radius: radius, vx: (Math.random() - .5) * 180, vy: (Math.random() - .5) * 160 };
    // Begin dispersed, rather than spawning a pile of intersecting circles.
    for (var attempt = 0; attempt < 100; attempt++) {
      particle.x = radius + Math.random() * (width - radius * 2);
      particle.y = radius + Math.random() * (height - radius * 2);
      if (particles.every(function (p) { return Math.hypot(p.x - particle.x, p.y - particle.y) >= p.radius + radius + 3; })) break;
    }
    element.className = 'glass-particle glass-particle--' + index % 3;
    element.style.width = element.style.height = radius * 2 + 'px';
    scene.appendChild(element);
    particles.push(particle);
  }

  function draw() {
    particles.forEach(function (p) {
      p.element.style.transform = 'translate3d(' + (p.x - p.radius).toFixed(2) + 'px,' + (p.y - p.radius).toFixed(2) + 'px,0)';
    });
  }
  function tick(now) {
    var dt = lastFrame ? (now - lastFrame) / 1000 : 0;
    lastFrame = now;
    var activePointer = pointer && now - lastInput < 900 ? pointer : null;
    stepWorld(particles, activePointer, activePointer ? selected : -1, width, height, dt);
    draw();
    frame = window.requestAnimationFrame(tick);
  }
  function updatePlayback() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    lastFrame = 0;
    pointer = null;
    selected = -1;
    if (!reducedMotion.matches && !document.hidden) frame = window.requestAnimationFrame(tick);
  }
  function releasePointer() { pointer = null; selected = -1; }
  window.addEventListener('pointermove', function (event) {
    if (reducedMotion.matches || (event.pointerType === 'touch' && event.buttons === 0)) return;
    pointer = { x: event.clientX, y: event.clientY };
    selected = findNearest(particles, pointer);
    lastInput = performance.now();
  }, { passive: true });
  window.addEventListener('pointerup', function (event) { if (event.pointerType === 'touch') releasePointer(); }, { passive: true });
  window.addEventListener('pointercancel', releasePointer, { passive: true });
  document.documentElement.addEventListener('pointerleave', releasePointer);
  window.addEventListener('blur', releasePointer);
  window.addEventListener('resize', function () {
    var oldWidth = width, oldHeight = height;
    width = window.innerWidth;
    height = window.innerHeight;
    releasePointer();
    particles.forEach(function (p) {
      p.x *= width / oldWidth;
      p.y *= height / oldHeight;
      p.radius = radiusFor(p.baseRadius);
      p.element.style.width = p.element.style.height = p.radius * 2 + 'px';
    });
    stepWorld(particles, null, -1, width, height, 0);
    draw();
  }, { passive: true });
  reducedMotion.addEventListener('change', updatePlayback);
  document.addEventListener('visibilitychange', updatePlayback);
  draw();
  updatePlayback();
}());
