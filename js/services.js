/* Configurateur de la page Services.

   Modèle « panier » : l'utilisateur compose sa commande en incrémentant le
   compteur des cartes Noir & Blanc et Couleur. Tarif unique : 10 € la
   pellicule, quel que soit le format (35 mm ou 120) ou le rendu —
   développement et scan toujours inclus.

   Paiement : avant la remise/l'envoi, par virement (PayPal ou Wero) ou en
   espèces lors de la remise. Une référence à 6 caractères est générée à
   chaque chargement de page ; le client la reporte lors de son règlement
   pour qu'on puisse rattacher le paiement à sa commande.

   Envoi :
   - FormData POST AJAX vers FormSubmit → mail de notification (admin).
   - EmailJS → mail de confirmation au client (récap + référence).
   Si un envoi échoue, on n'interrompt pas l'autre. */
(function () {
  var form = document.getElementById('configForm');
  if (!form) return;

  var UNIT_PRICE = 10;            // 10 € la pellicule, tout format / tout rendu
  var FORMSUBMIT_ENDPOINT = form.action;

  // EmailJS : mail de confirmation au client (FormSubmit gère le mail admin).
  // La clé publique est destinée à être exposée côté navigateur.
  var EMAILJS_SERVICE_ID  = 'service_joq5dag';
  var EMAILJS_TEMPLATE_ID = 'template_w30pet5';
  var EMAILJS_PUBLIC_KEY  = 'oS00khejCHT2v4Hhy';
  if (window.emailjs) emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

  // Aperçu photo par rendu. Noms de fichiers en ASCII minuscule : GitHub
  // Pages tourne sous Linux (sensible à la casse) et n'aime pas les accents.
  var RENDU_PREVIEW = {
    'Classique': 'images/classique.jpg',
    'Contrasté': 'images/contraste.jpg',
    'Flat':      'images/flat.jpg'
  };

  // Un compteur par type de pellicule
  var COUNTERS = [
    { id: 'qty_nb',  type: 'N&B' },
    { id: 'qty_col', type: 'Couleur' }
  ];

  var returnNotice  = document.getElementById('returnNotice');
  var virementCode  = document.getElementById('virementCode');
  var payCode       = document.getElementById('payCode');
  var emptyHint     = document.getElementById('emptyHint');
  var sentMsg       = document.getElementById('sentMsg');
  var errMsg        = document.getElementById('errMsg');
  var submitBtn     = document.getElementById('submitBtn');
  var rPellicules   = document.getElementById('r-pellicules');
  var renduPreview  = document.getElementById('renduPreview');

  // Référence de paiement : 6 caractères aléatoires sans ambiguïté visuelle
  // (exclus 0/O et 1/I/L). Régénérée à chaque chargement de page.
  function generateRef() {
    var chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    var s = '';
    for (var i = 0; i < 6; i++) {
      s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
  }
  var PAY_REF = generateRef();

  function checked(name) {
    return form.querySelector('input[name="' + name + '"]:checked');
  }

  function set(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function getCount(id) {
    var el = document.getElementById(id);
    return Math.max(0, parseInt(el ? el.value : 0, 10) || 0);
  }

  function setCount(id, n) {
    var el = document.getElementById(id);
    if (el) el.value = Math.min(99, Math.max(0, n));
  }

  // Items non nuls sous forme exploitable pour le récap et le mail
  function composition() {
    var items = [];
    COUNTERS.forEach(function (c) {
      var n = getCount(c.id);
      if (n > 0) items.push({ n: n, type: c.type });
    });
    return items;
  }

  function totals() {
    var qty = 0;
    COUNTERS.forEach(function (c) { qty += getCount(c.id); });
    return { qty: qty, price: qty * UNIT_PRICE };
  }

  function update() {
    var items    = composition();
    var t        = totals();
    var rendu    = checked('rendu');
    var remise   = checked('remise');

    // Pellicules : liste multi-ligne dans le récap, ou "—" si vide
    if (rPellicules) {
      rPellicules.innerHTML = '';
      if (items.length === 0) {
        var span = document.createElement('span');
        span.textContent = '—';
        rPellicules.appendChild(span);
      } else {
        items.forEach(function (it) {
          var s = document.createElement('span');
          s.textContent = it.n + '× ' + it.type;
          rPellicules.appendChild(s);
        });
      }
    }

    set('r-rendu',    rendu ? rendu.value : '—');
    set('r-remise',   remise ? remise.value : '—');
    set('r-paiement', 'Virement · réf. ' + PAY_REF);
    set('r-qty',      t.qty + (t.qty > 1 ? ' pellicules' : ' pellicule'));
    set('r-total',    t.price + ' €');

    // Bascule l'aperçu photo selon le rendu sélectionné
    if (renduPreview && rendu) {
      var previewSrc = RENDU_PREVIEW[rendu.value];
      if (previewSrc && renduPreview.getAttribute('src') !== previewSrc) {
        renduPreview.src = previewSrc;
        renduPreview.alt = 'Aperçu du rendu ' + rendu.value;
      }
    }

    // Encart « enveloppe + timbre » uniquement en cas d'envoi postal
    if (returnNotice) returnNotice.hidden = !remise || remise.value !== 'Envoi postal';

    // Empêche l'envoi si aucune pellicule sélectionnée
    var empty = t.qty === 0;
    if (submitBtn) submitBtn.disabled = empty;
    if (emptyHint) emptyHint.hidden = !empty;
  }

  // Construit la chaîne lisible "1× N&B + 2× Couleur" pour les mails
  function compositionString() {
    var items = composition();
    if (items.length === 0) return '—';
    return items.map(function (it) {
      return it.n + '× ' + it.type;
    }).join(' + ');
  }

  // Délégation : tous les boutons +/- des mini-steppers passent par là
  form.addEventListener('click', function (e) {
    var btn = e.target.closest('.stepper-btn');
    if (!btn) return;
    var target = btn.dataset.target;
    var action = btn.dataset.action;
    var cur = getCount(target);
    setCount(target, action === 'inc' ? cur + 1 : cur - 1);
    update();
  });

  form.addEventListener('change', update);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!sentMsg) return;

    sentMsg.classList.remove('show');
    if (errMsg) errMsg.classList.remove('show');

    var t = totals();
    if (t.qty === 0) return; // garde-fou, normalement le bouton est disabled

    // Construction manuelle du FormData : on n'envoie pas les compteurs bruts
    // (qty_nb, qty_col) mais une composition agrégée et les totaux nommés
    var fd = new FormData();
    fd.append('_subject',  'Demande de développement — Jarod Buisson');
    fd.append('_template', 'table');
    fd.append('_captcha',  'false');
    var honey = form.querySelector('input[name="_honey"]');
    if (honey) fd.append('_honey', honey.value);

    fd.append('composition',         compositionString());
    fd.append('quantite_totale',     String(t.qty));
    fd.append('prix_total',          t.price + ' €');
    fd.append('rendu',               checked('rendu').value);
    fd.append('remise',              checked('remise').value);
    fd.append('paiement',            'Virement (PayPal ou Wero)');
    fd.append('reference_paiement',  PAY_REF);
    fd.append('nom',                 document.getElementById('name').value);
    fd.append('email',               document.getElementById('email').value);
    fd.append('instagram',           document.getElementById('instagram').value || '—');
    fd.append('details',             document.getElementById('msg').value);

    // Mail de confirmation au client via EmailJS (indépendant du mail admin
    // FormSubmit) : en cas d'échec on n'interrompt pas — Jarod a la demande.
    if (window.emailjs) {
      emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        email:       document.getElementById('email').value,
        nom:         document.getElementById('name').value,
        composition: compositionString(),
        quantite:    String(t.qty),
        rendu:       checked('rendu').value,
        remise:      checked('remise').value,
        paiement:    'Virement (PayPal ou Wero)',
        prix_total:  t.price + ' €',
        reference:   PAY_REF,
        details:     document.getElementById('msg').value || '—'
      }).catch(function (err) {
        console.warn('EmailJS (mail client) a échoué :', err);
      });
    }

    var origLabel = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Envoi…'; }

    fetch(FORMSUBMIT_ENDPOINT, {
      method: 'POST',
      body: fd,
      headers: { 'Accept': 'application/json' }
    })
    .then(function (r) { return r.json(); })
    .then(function (json) {
      var ok = json.success === 'true' || json.success === true;
      if (!ok) throw new Error(json.message || 'submission failed');
      sentMsg.classList.add('show');
      sentMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    })
    .catch(function () {
      if (errMsg) {
        errMsg.classList.add('show');
        errMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    })
    .finally(function () {
      if (submitBtn) {
        submitBtn.disabled = totals().qty === 0;
        submitBtn.textContent = origLabel || 'Envoyer ma demande →';
      }
    });
  });

  // Aperçu du rendu : bouton déplier / replier (masqué par défaut)
  var renduToggle = document.getElementById('renduToggle');
  var renduPanel  = document.getElementById('renduPanel');
  if (renduToggle && renduPanel) {
    var rtLabel = renduToggle.querySelector('.rt-label');
    renduToggle.addEventListener('click', function () {
      var open = renduToggle.getAttribute('aria-expanded') === 'true';
      renduToggle.setAttribute('aria-expanded', String(!open));
      renduPanel.hidden = open;
      if (rtLabel) rtLabel.textContent = open ? 'Voir un aperçu du rendu' : 'Masquer l\'aperçu';
    });
  }

  // Init : affiche la référence de paiement partout où elle apparaît
  if (payCode) payCode.textContent = PAY_REF;
  if (virementCode) virementCode.textContent = PAY_REF;

  update();
})();
