/* Configurateur de la page Services.
   Politique de tarif unique : 10 € par pellicule en 35 mm, 12 € en 120.
   Dev + scan inclus dans le forfait. Type/rendu/scan/remise/paiement sont
   des préférences sans incidence sur le prix.

   Type multi-sélection : si l'utilisateur commande plusieurs pellicules,
   les radios "type" passent en checkboxes (il peut avoir un mix N&B + Couleur).
   Au moins un type doit rester coché en permanence.

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
  var typeHint      = document.getElementById('typeHint');
  var sentMsg       = document.getElementById('sentMsg');
  var errMsg        = document.getElementById('errMsg');
  var submitBtn     = document.getElementById('submitBtn');
  var hPrixUnit     = document.getElementById('hPrixUnit');
  var hTotal        = document.getElementById('hTotal');
  var hRef          = document.getElementById('hRef');

  function checked(name) {
    return form.querySelector('input[name="' + name + '"]:checked');
  }

  function checkedValues(name) {
    var inputs = form.querySelectorAll('input[name="' + name + '"]:checked');
    var values = [];
    inputs.forEach(function (i) { values.push(i.value); });
    return values;
  }

  function set(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function getQty() {
    return Math.max(1, parseInt(qtyInput.value, 10) || 1);
  }

  // Bascule les inputs "type" entre radio (qty=1) et checkbox (qty>1),
  // préserve l'état coché, et garantit qu'au moins un reste coché.
  function syncTypeMode() {
    var multi = getQty() > 1;
    var inputs = form.querySelectorAll('input[name="type"]');
    var newType = multi ? 'checkbox' : 'radio';

    var was = [];
    inputs.forEach(function (i) { if (i.checked) was.push(i.value); });

    inputs.forEach(function (i) { i.type = newType; });

    // Restaure l'état coché. Si on repasse en radio avec plusieurs cochés
    // avant, on ne garde que le premier de la liste cochée.
    inputs.forEach(function (i) {
      if (!multi) {
        i.checked = was.length > 0 && i.value === was[0];
      } else {
        i.checked = was.indexOf(i.value) !== -1;
      }
    });

    if (form.querySelectorAll('input[name="type"]:checked').length === 0) {
      inputs[0].checked = true;
    }

    if (typeHint) typeHint.hidden = !multi;
  }

  function update() {
    var types    = checkedValues('type');
    var rendu    = checked('rendu');
    var scan     = checked('scan');
    var remise   = checked('remise');
    var paiement = checked('paiement');
    var format   = formatSel.value;
    var qty      = getQty();

    var unit  = BASE_PRICE + (format === FORMAT_120_VALUE ? FORMAT_120_SURCHARGE : 0);
    var total = unit * qty;

    set('r-format',   format);
    set('r-qty',      qty + (qty > 1 ? ' pellicules' : ' pellicule'));
    set('r-type',     types.join(' + ') || '—');
    set('r-rendu',    rendu ? rendu.value : '—');
    set('r-scan',     scan ? scan.value : '—');
    set('r-remise',   remise ? remise.value : '—');
    set('r-paiement', paiement ? paiement.value : '—');
    set('r-unit',     unit + ' €');
    set('r-total',    total + ' €');

    if (returnNotice) returnNotice.hidden = !remise || remise.value !== 'Envoi postal';
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
    syncTypeMode();
    update();
  });
  document.getElementById('minus').addEventListener('click', function () {
    qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
    syncTypeMode();
    update();
  });

  form.addEventListener('change', function (e) {
    // En mode checkbox, empêche de décocher la dernière case "type"
    if (e.target && e.target.name === 'type' && e.target.type === 'checkbox' && !e.target.checked) {
      if (form.querySelectorAll('input[name="type"]:checked').length === 0) {
        e.target.checked = true;
      }
    }
    update();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!sentMsg) return;

    sentMsg.classList.remove('show');
    if (errMsg) errMsg.classList.remove('show');

    var paiement = checked('paiement');
    var isVirement = paiement && paiement.value === 'Virement';
    var ref = '';
    if (isVirement) {
      ref = generateRef();
      if (virementCode) virementCode.textContent = ref;
    }
    if (virementBlock) virementBlock.hidden = !isVirement;

    if (hPrixUnit) hPrixUnit.value = document.getElementById('r-unit').textContent;
    if (hTotal)    hTotal.value    = document.getElementById('r-total').textContent;
    if (hRef)      hRef.value      = isVirement ? ref : '(paiement en main propre)';

    // En multi-sélection, FormData renvoie plusieurs entries "type" — on les
    // fusionne en une seule valeur jointe pour un mail plus lisible
    var fd = new FormData(form);
    var typesJoined = checkedValues('type').join(' + ');
    fd.delete('type');
    fd.append('type', typesJoined);

    var origLabel = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Envoi…'; }

    fetch(form.action, {
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
        submitBtn.disabled = false;
        submitBtn.textContent = origLabel || 'Envoyer ma demande →';
      }
    });
  });

  syncTypeMode();
  update();
})();
