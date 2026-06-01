/* Configurateur de la page Services.
   Politique de tarif unique : 10 € par pellicule en 35 mm, 12 € en 120.
   Dev + scan inclus dans le forfait. Type/rendu/scan/remise/paiement sont
   des préférences sans incidence sur le prix.

   Submit :
   - Affiche le récap de confirmation.
   - Si paiement = Virement : génère une référence unique « JB-YYMMDD-XXXX »
     à reporter dans la description du virement (pour rattacher l'arrivée
     du paiement à la commande). */
(function () {
  var form = document.getElementById('configForm');
  if (!form) return;

  var BASE_PRICE = 10;
  var FORMAT_120_SURCHARGE = 2;

  var qtyInput      = document.getElementById('qty');
  var formatSel     = document.getElementById('format');
  var returnNotice  = document.getElementById('returnNotice');
  var virementBlock = document.getElementById('virementBlock');
  var virementCode  = document.getElementById('virementCode');

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

    var unit  = BASE_PRICE + (format === '120' ? FORMAT_120_SURCHARGE : 0);
    var total = unit * qty;

    set('r-type',     type.value);
    set('r-rendu',    rendu.value);
    set('r-scan',     scan.value);
    set('r-remise',   remise.value);
    set('r-paiement', paiement.value);
    set('r-format',   format === '120' ? '120 (moyen format)' : '35 mm');
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
    var msg = document.getElementById('sentMsg');
    if (!msg) return;

    var paiement = checked('paiement');
    if (virementBlock && virementCode) {
      if (paiement.value === 'Virement') {
        virementCode.textContent = generateRef();
        virementBlock.hidden = false;
      } else {
        virementBlock.hidden = true;
      }
    }

    msg.classList.add('show');
    msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  update();
})();
