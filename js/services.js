/* Configurateur de la page Services.
   Politique de tarif unique : 10 € par pellicule en 35 mm, 12 € en 120.
   Dev + scan inclus dans le forfait. Type/rendu/scan/remise/paiement sont
   des préférences sans incidence sur le prix.

   Envoi : AJAX POST vers FormSubmit (endpoint configuré dans le form HTML).
   - Si paiement = Virement : génère une référence unique JB-YYMMDD-XXXX,
     l'inclut dans le mail envoyé et l'affiche au client après succès.
   - Si l'envoi échoue (réseau, FormSubmit down…) on affiche un fallback
     qui invite le client à m'écrire directement. */
(function () {
  var form = document.getElementById('configForm');
  if (!form) return;

  var BASE_PRICE = 10;
  var FORMAT_120_SURCHARGE = 2;
  var FORMAT_120_VALUE = '120 (moyen format)';

  var qtyInput      = document.getElementById('qty');
  var formatSel     = document.getElementById('format');
  var returnNotice  = document.getElementById('returnNotice');
  var virementBlock = document.getElementById('virementBlock');
  var virementCode  = document.getElementById('virementCode');
  var sentMsg       = document.getElementById('sentMsg');
  var errMsg        = document.getElementById('errMsg');
  var submitBtn     = document.getElementById('submitBtn');
  var hPrixUnit     = document.getElementById('hPrixUnit');
  var hTotal        = document.getElementById('hTotal');
  var hRef          = document.getElementById('hRef');

  function checked(name) {
    return form.querySelector('input[name="' + name + '"]:checked');
  }

  function set(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function update() {
    var type     = checked('type');
    var rendu    = checked('rendu');
    var scan     = checked('scan');
    var remise   = checked('remise');
    var paiement = checked('paiement');
    var format   = formatSel.value;
    var qty      = Math.max(1, parseInt(qtyInput.value, 10) || 1);

    var unit  = BASE_PRICE + (format === FORMAT_120_VALUE ? FORMAT_120_SURCHARGE : 0);
    var total = unit * qty;

    set('r-type',     type.value);
    set('r-rendu',    rendu.value);
    set('r-scan',     scan.value);
    set('r-remise',   remise.value);
    set('r-paiement', paiement.value);
    set('r-format',   format);
    set('r-qty',      qty + (qty > 1 ? ' pellicules' : ' pellicule'));
    set('r-unit',     unit + ' €');
    set('r-total',    total + ' €');

    if (returnNotice) returnNotice.hidden = remise.value !== 'Envoi postal';
  }

  // Référence virement type "JB-260601-X7K9".
  // Caractères sans ambiguïté visuelle : exclus 0/O, 1/I/L.
  function generateRef() {
    var chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    var rand = '';
    for (var i = 0; i < 4; i++) {
      rand += chars[Math.floor(Math.random() * chars.length)];
    }
    var d = new Date();
    var yy = String(d.getFullYear()).slice(-2);
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return 'JB-' + yy + mm + dd + '-' + rand;
  }

  document.getElementById('plus').addEventListener('click', function () {
    qtyInput.value = Math.min(99, (parseInt(qtyInput.value, 10) || 1) + 1);
    update();
  });
  document.getElementById('minus').addEventListener('click', function () {
    qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
    update();
  });

  form.addEventListener('change', update);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!sentMsg) return;

    // Reset des deux messages avant un nouvel envoi
    sentMsg.classList.remove('show');
    if (errMsg) errMsg.classList.remove('show');

    // Génération du code virement si applicable, et préparation de l'affichage
    var paiement = checked('paiement');
    var isVirement = paiement.value === 'Virement';
    var ref = '';
    if (isVirement) {
      ref = generateRef();
      if (virementCode) virementCode.textContent = ref;
    }
    if (virementBlock) virementBlock.hidden = !isVirement;

    // Remplissage des hidden fields envoyés à FormSubmit pour qu'ils figurent
    // dans le mail (sinon Jarod ne verrait que les inputs visibles)
    if (hPrixUnit) hPrixUnit.value = document.getElementById('r-unit').textContent;
    if (hTotal)    hTotal.value    = document.getElementById('r-total').textContent;
    if (hRef)      hRef.value      = isVirement ? ref : '(paiement en main propre)';

    var origLabel = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Envoi…'; }

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
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
        submitBtn.disabled = false;
        submitBtn.textContent = origLabel || 'Envoyer ma demande →';
      }
    });
  });

  update();
})();
