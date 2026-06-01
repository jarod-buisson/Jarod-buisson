/* Configurateur de la page Services.
   Politique de tarif unique : 10 € par pellicule en 35 mm, 12 € en 120.
   Dev + scan inclus dans le forfait. Les autres choix (type, rendu, scan)
   sont des préférences pour le développement, sans incidence sur le prix. */
(function () {
  var form = document.getElementById('configForm');
  if (!form) return;

  var BASE_PRICE = 10;
  var FORMAT_120_SURCHARGE = 2;

  var qtyInput = document.getElementById('qty');
  var formatSel = document.getElementById('format');

  function checked(name) {
    return form.querySelector('input[name="' + name + '"]:checked');
  }

  function set(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function update() {
    var type   = checked('type');
    var rendu  = checked('rendu');
    var scan   = checked('scan');
    var format = formatSel.value;
    var qty    = Math.max(1, parseInt(qtyInput.value, 10) || 1);

    var unit  = BASE_PRICE + (format === '120' ? FORMAT_120_SURCHARGE : 0);
    var total = unit * qty;

    set('r-type',   type.value);
    set('r-rendu',  rendu.value);
    set('r-scan',   scan.value);
    set('r-format', format === '120' ? '120 (moyen format)' : '35 mm');
    set('r-qty',    qty + (qty > 1 ? ' pellicules' : ' pellicule'));
    set('r-unit',   unit + ' €');
    set('r-total',  total + ' €');
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
    if (msg) {
      msg.classList.add('show');
      msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  update();
})();
