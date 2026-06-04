/* Configurateur de la page Services.

   Modèle « panier » : l'utilisateur compose sa commande en incrémentant
   les compteurs des cartes Noir & Blanc et Couleur, chacune offrant deux
   formats (35 mm et 120). Le total quantité + prix se calculent en direct.

   Tarification :
   - 35 mm : 10 € par pellicule (N&B ou Couleur)
   - 120   : 12 € par pellicule (N&B ou Couleur)
   Le rendu, le scan et la remise n'ont pas d'incidence sur le prix —
   ce sont des préférences de traitement.

   Paiement : exclusivement par virement (PayPal ou Wero). Une référence
   à 6 caractères est générée à chaque chargement de la page ; le client
   doit la reporter dans la description de son virement pour qu'on puisse
   rattacher le paiement à sa commande.

   Envoi : AJAX POST vers FormSubmit. On construit FormData manuellement
   pour que le mail soit lisible (composition agrégée, totaux nommés)
   plutôt qu'une liste des 4 compteurs bruts. Si l'envoi échoue, message
   fallback qui invite à m'écrire en direct. */
(function () {
  var form = document.getElementById('configForm');
  if (!form) return;

  var PRICE_35   = 10;
  var PRICE_120  = 12;
  var FORMSUBMIT_ENDPOINT = form.action;

  // Aperçu photo par rendu. Noms de fichiers en ASCII minuscule : GitHub
  // Pages tourne sous Linux (sensible à la casse) et n'aime pas les accents.
  var RENDU_PREVIEW = {
    'Classique': 'images/classique.jpg',
    'Contrasté': 'images/contraste.jpg',
    'Flat':      'images/flat.jpg'
  };

  // 4 compteurs (type × format) + leurs métadonnées pour la composition lisible
  var COUNTERS = [
    { id: 'qty_nb_35',  type: 'N&B',     format: '35 mm', price: PRICE_35  },
    { id: 'qty_nb_120', type: 'N&B',     format: '120',   price: PRICE_120 },
    { id: 'qty_col_35', type: 'Couleur', format: '35 mm', price: PRICE_35  },
    { id: 'qty_col_120',type: 'Couleur', format: '120',   price: PRICE_120 }
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
      if (n > 0) items.push({ n: n, type: c.type, format: c.format, price: c.price });
    });
    return items;
  }

  function totals() {
    var qty = 0;
    var price = 0;
    COUNTERS.forEach(function (c) {
      var n = getCount(c.id);
      qty += n;
      price += n * c.price;
    });
    return { qty: qty, price: price };
  }

  function update() {
    var items    = composition();
    var t        = totals();
    var rendu    = checked('rendu');
    var scan     = checked('scan');
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
          s.textContent = it.n + '× ' + it.type + ' ' + it.format;
          rPellicules.appendChild(s);
        });
      }
    }

    set('r-rendu',    rendu ? rendu.value : '—');
    set('r-scan',     scan ? scan.value : '—');
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

  // Construit la chaîne lisible "1× N&B 35 mm + 1× Couleur 120" pour le mail
  function compositionString() {
    var items = composition();
    if (items.length === 0) return '—';
    return items.map(function (it) {
      return it.n + '× ' + it.type + ' ' + it.format;
    }).join(' + ');
  }

  // Délégation : tous les boutons +/- des 4 mini-steppers passent par là
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

    // Construction manuelle du FormData : on n'envoie pas les 4 compteurs
    // bruts (qty_nb_35, etc.) qui seraient peu lisibles dans le mail, mais
    // une composition agrégée et les totaux nommés
    var fd = new FormData();
    fd.append('_subject',  'Demande de développement — Jarod Buisson');
    fd.append('_template', 'table');
    fd.append('_captcha',  'false');
    // Copie envoyée au client : il reçoit le même récap (avec sa référence
    // de paiement). _cc fonctionne en AJAX, contrairement à _autoresponse.
    fd.append('_cc',       document.getElementById('email').value);
    var honey = form.querySelector('input[name="_honey"]');
    if (honey) fd.append('_honey', honey.value);

    fd.append('composition',         compositionString());
    fd.append('quantite_totale',     String(t.qty));
    fd.append('prix_total',          t.price + ' €');
    fd.append('rendu',               checked('rendu').value);
    fd.append('scan',                checked('scan').value);
    fd.append('remise',              checked('remise').value);
    fd.append('paiement',            'Virement (PayPal ou Wero)');
    fd.append('reference_paiement',  PAY_REF);
    fd.append('nom',                 document.getElementById('name').value);
    fd.append('email',               document.getElementById('email').value);
    fd.append('details',             document.getElementById('msg').value);

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

  // Init : affiche la référence de paiement partout où elle apparaît
  if (payCode) payCode.textContent = PAY_REF;
  if (virementCode) virementCode.textContent = PAY_REF;

  update();
})();
