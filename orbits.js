// Click anywhere on the page to drop a star. Stars attract each other and
// leave fading trails, drawn on a canvas that sits behind the page content.
(function () {
  var MAX_STARS = 5;
  var G = 300;            // gravitational constant (px^3 / frame^2 per unit mass)
  var SOFTENING = 12;     // px, keeps close encounters from blowing up
  var SUBSTEPS = 4;       // physics steps per animation frame
  var TRAIL_LIFE = 4000;  // ms until a trail point has fully faded
  var ESCAPE_MARGIN = 800;
  var COLORS = ['40, 40, 55'];

  var canvas = document.getElementById('orbits');
  var ctx = canvas.getContext('2d');
  var stars = [];
  var trails = [];        // {color, points: [{x, y, t}], alive}
  var colorIndex = 0;
  var running = false;
  var width = 0, height = 0;   // canvas size in CSS pixels

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    canvas.style.height = '0px';
    width = document.documentElement.clientWidth;
    height = Math.max(document.documentElement.scrollHeight, window.innerHeight);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function addStar(x, y) {
    var star = { x: x, y: y, vx: 0, vy: 0, m: 1 };
    if (stars.length > 0) {
      // Give the new star a circular orbit around the existing stars' centre of
      // mass and share the momentum so the whole system stays roughly in place.
      var M = 0, cx = 0, cy = 0, cvx = 0, cvy = 0;
      stars.forEach(function (s) {
        M += s.m; cx += s.m * s.x; cy += s.m * s.y; cvx += s.m * s.vx; cvy += s.m * s.vy;
      });
      cx /= M; cy /= M; cvx /= M; cvy /= M;
      var dx = x - cx, dy = y - cy;
      var r = Math.max(Math.sqrt(dx * dx + dy * dy), 30);
      var v = Math.sqrt(G * (M + star.m) / r);
      var tx = -dy / r, ty = dx / r;
      star.vx = cvx + v * tx * M / (M + star.m);
      star.vy = cvy + v * ty * M / (M + star.m);
      stars.forEach(function (s) {
        s.vx -= v * tx * star.m / (M + star.m);
        s.vy -= v * ty * star.m / (M + star.m);
      });
    }
    star.trail = { color: COLORS[colorIndex++ % COLORS.length], points: [], alive: true };
    trails.push(star.trail);
    stars.push(star);
    if (stars.length > MAX_STARS) removeStar(stars[0]);
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  function removeStar(star) {
    star.trail.alive = false;
    stars.splice(stars.indexOf(star), 1);
  }

  function step(dt) {
    var i, j, a, b, dx, dy, d2, f;
    for (i = 0; i < stars.length; i++) { stars[i].ax = 0; stars[i].ay = 0; }
    for (i = 0; i < stars.length; i++) {
      for (j = i + 1; j < stars.length; j++) {
        a = stars[i]; b = stars[j];
        dx = b.x - a.x; dy = b.y - a.y;
        d2 = dx * dx + dy * dy + SOFTENING * SOFTENING;
        f = G / (d2 * Math.sqrt(d2));
        a.ax += f * b.m * dx; a.ay += f * b.m * dy;
        b.ax -= f * a.m * dx; b.ay -= f * a.m * dy;
      }
    }
    for (i = 0; i < stars.length; i++) {
      a = stars[i];
      a.vx += a.ax * dt; a.vy += a.ay * dt;
      a.x += a.vx * dt; a.y += a.vy * dt;
    }
  }

  function frame(now) {
    for (var s = 0; s < SUBSTEPS; s++) step(1 / SUBSTEPS);

    var w = width, h = height;
    stars.slice().forEach(function (star) {
      star.trail.points.push({ x: star.x, y: star.y, t: now });
      if (star.x < -ESCAPE_MARGIN || star.y < -ESCAPE_MARGIN ||
          star.x > w + ESCAPE_MARGIN || star.y > h + ESCAPE_MARGIN) removeStar(star);
    });

    trails.forEach(function (trail) {
      while (trail.points.length && now - trail.points[0].t > TRAIL_LIFE) trail.points.shift();
    });
    trails = trails.filter(function (trail) { return trail.alive || trail.points.length > 1; });

    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineWidth = 1;
    trails.forEach(function (trail) {
      var p = trail.points;
      for (var i = 1; i < p.length; i++) {
        var alpha = 1 - (now - p[i].t) / TRAIL_LIFE;
        ctx.strokeStyle = 'rgba(' + trail.color + ',' + (0.3 * alpha) + ')';
        ctx.beginPath();
        ctx.moveTo(p[i - 1].x, p[i - 1].y);
        ctx.lineTo(p[i].x, p[i].y);
        ctx.stroke();
      }
    });
    stars.forEach(function (star) {
      ctx.fillStyle = 'rgba(' + star.trail.color + ', 0.8)';
      ctx.beginPath();
      ctx.arc(star.x, star.y, 2.5, 0, 2 * Math.PI);
      ctx.fill();
    });

    if (stars.length || trails.length) requestAnimationFrame(frame);
    else running = false;
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('a, .pp')) return;
    addStar(e.pageX, e.pageY);
  });
  window.addEventListener('resize', resize);
  window.addEventListener('load', resize);
  resize();
})();
