(function () {
  var hd = document.getElementById('hd');
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  // header: tall ribbon at the top, shrinks into a slim bar when you scroll
  var cta = document.getElementById('cta');
  function placeCta() {
    // starts at the left edge, reaches bottom-centre after about one screen of scrolling
    var max = document.documentElement.scrollHeight - innerHeight;
    var p = Math.min(1, scrollY / Math.max(1, Math.min(innerHeight * .9, max)));
    p = p * p * (3 - 2 * p);
    cta.style.paddingLeft = cta.style.paddingRight = (26 + p * 16) + 'px';
    cta.style.left = (20 + p * ((innerWidth - cta.offsetWidth) / 2 - 20)) + 'px';
  }
  function onScroll() { hd.classList.toggle('min', scrollY > 40); if (cta) placeCta(); }
  addEventListener('resize', onScroll);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // sections fade in as they come into view
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } });
  }, { threshold: .12 });
  document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });

  // hero image slider
  var hero = document.getElementById('hero');
  if (hero) {
    var slides = [].slice.call(hero.querySelectorAll('.slide')), dotsBox = document.getElementById('dots'), i = 0, timer;
    var dots = slides.map(function (s, k) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Show image ' + (k + 1));
      b.onclick = function () { go(k); restart(); }; dotsBox.appendChild(b); return b;
    });
    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('on', k === i); dots[k].classList.toggle('on', k === i); });
    }
    function restart() { clearInterval(timer); if (!reduce) timer = setInterval(function () { go(i + 1); }, 6500); }
    document.getElementById('hprev').onclick = function () { go(i - 1); restart(); };
    document.getElementById('hnext').onclick = function () { go(i + 1); restart(); };
    hero.addEventListener('mouseenter', function () { clearInterval(timer); });
    hero.addEventListener('mouseleave', restart);
    go(0); restart();
  }

  // gallery pictures tilt toward the cursor
  if (matchMedia('(hover:hover)').matches && !reduce) {
    document.querySelectorAll('.g').forEach(function (t) {
      t.addEventListener('mousemove', function (e) {
        var r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        t.style.transform = 'perspective(800px) rotateY(' + (x * 8) + 'deg) rotateX(' + (-y * 8) + 'deg)';
      });
      t.addEventListener('mouseleave', function () { t.style.transform = ''; });
    });
  }
})();
