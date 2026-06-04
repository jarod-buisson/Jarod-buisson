/* Comportements communs : barre de nav au scroll + menu mobile,
   compteurs animés, accordéon séries, et lightbox (zoom photo). */
(function () {
  var nav = document.getElementById('nav');
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('scrolled', window.scrollY > 30);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Compteurs animés (section À propos).
     - data-year-since="2018"  -> cible = année courante - 2018 (se met à jour seul chaque année)
     - data-count="44"         -> cible fixe
     - data-suffix=" ans"      -> texte ajouté après le nombre */
  var counters = document.querySelectorAll('.stat .n[data-count], .stat .n[data-year-since]');
  if (counters.length && 'IntersectionObserver' in window) {
    var animate = function (el) {
      var target = el.hasAttribute('data-year-since')
        ? (new Date().getFullYear() - parseInt(el.getAttribute('data-year-since'), 10))
        : parseInt(el.getAttribute('data-count'), 10);
      var suffix = el.getAttribute('data-suffix') || '';
      var dur = 1200, start = null;
      var tick = function (ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);            // ease-out cubic
        el.textContent = Math.round(eased * target) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { io.observe(c); });
  }

  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('mobileMenu');
  var close = document.getElementById('menuClose');
  if (toggle && menu) {
    toggle.addEventListener('click', function () { menu.classList.add('open'); });
    if (close) close.addEventListener('click', function () { menu.classList.remove('open'); });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { menu.classList.remove('open'); });
    });
  }

  /* Accordéon séries : déplie/replie le panneau d'images au clic. */
  document.querySelectorAll('.serie-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      if (panel) panel.hidden = open;
    });
  });

  /* Lightbox : ouverture d'une photo en grand, avec bascule zoom
     « ajusté à l'écran » <-> « taille réelle » (panoramique au scroll).
     Navigation précédent/suivant dans le groupe d'origine. */
  (function () {
    var lb = document.getElementById('lightbox');
    if (!lb) return;
    var lbImg     = document.getElementById('lbImg');
    var lbStage   = document.getElementById('lbStage');
    var lbCaption = document.getElementById('lbCaption');
    var lbClose   = document.getElementById('lbClose');
    var lbPrev    = document.getElementById('lbPrev');
    var lbNext    = document.getElementById('lbNext');
    var group = [];
    var index = 0;

    function fullSrc(img) { return img.getAttribute('data-full') || img.src; }

    function setZoom(on) {
      lbStage.classList.toggle('zoomed', on);
      lbImg.classList.toggle('zoomed', on);
      if (!on) { lbStage.scrollTop = 0; lbStage.scrollLeft = 0; }
    }

    function show(i) {
      if (!group.length) return;
      index = (i + group.length) % group.length;
      var img = group[index];
      setZoom(false);
      lbImg.src = fullSrc(img);
      lbImg.alt = img.alt || '';
      lbCaption.textContent = img.alt || '';
      var single = group.length < 2;
      lbPrev.hidden = single;
      lbNext.hidden = single;
    }

    function open(list, i) {
      group = list;
      lb.hidden = false;
      lb.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      show(i);
    }

    function dismiss() {
      lb.hidden = true;
      lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      setZoom(false);
      lbImg.src = '';
    }

    function bind(list) {
      list.forEach(function (img, i) {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', function () { open(list, i); });
      });
    }

    var slice = function (nl) { return Array.prototype.slice.call(nl); };
    bind(slice(document.querySelectorAll('.gallery .shot img')));
    var euskal = document.querySelectorAll('#euskal-panel .serie-grid img');
    if (euskal.length) bind(slice(euskal));

    lbImg.addEventListener('click', function (e) {
      e.stopPropagation();
      setZoom(!lbImg.classList.contains('zoomed'));
    });
    lbClose.addEventListener('click', dismiss);
    lbPrev.addEventListener('click', function (e) { e.stopPropagation(); show(index - 1); });
    lbNext.addEventListener('click', function (e) { e.stopPropagation(); show(index + 1); });
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target === lbStage) dismiss();
    });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') dismiss();
      else if (e.key === 'ArrowLeft') show(index - 1);
      else if (e.key === 'ArrowRight') show(index + 1);
    });
  })();
})();
