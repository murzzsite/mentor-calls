const LEAD_ENDPOINT = 'https://lead-relay.leestygpt.workers.dev/lead/PPV9TUT355';

(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  const fmt2 = n => (Math.round(n * 100) / 100).toLocaleString('ru-RU', { minimumFractionDigits: Number.isInteger(Math.round(n * 100) / 100) ? 0 : 2, maximumFractionDigits: 2 });
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* header: прячется при скролле вниз, burger */
  const header = $('#header'), burger = $('#burger'), nav = $('#nav');
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const cy = scrollY;
    header.classList.toggle('is-hide', cy > lastY && cy > 240 && !nav.classList.contains('is-open'));
    lastY = cy;
  }, { passive: true });
  burger?.addEventListener('click', () => {
    const open = burger.classList.toggle('is-open');
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
  });
  $$('a', nav).forEach(a => a.addEventListener('click', () => {
    burger.classList.remove('is-open'); nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false');
  }));

  /* заголовок hero по словам */
  const title = $('[data-split]');
  if (title) {
    const words = title.textContent.trim().split(/\s+/);
    title.setAttribute('aria-label', words.join(' '));
    const hl = (title.dataset.hl || '').split(',').map(Number);
    title.innerHTML = words.map((w, i) => `<span class="w${hl.includes(i) ? ' hl' : ''}" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(' ');
  }

  /* ---------- сетка из 100 звонков ---------- */
  const HEARD = [3, 12, 27, 34, 41, 58, 66, 73, 85, 94];
  const LOST = [5, 9, 18, 23, 31, 38, 46, 52, 60, 64, 71, 79, 88, 97];
  const LOST_PHRASES = [
    ['Клиент сказал «пришлите предложение, я подумаю». Менеджер не назначил следующий контакт.', 'Скажите: «Пришлю сегодня до 16:00. Давайте созвонимся завтра в 11, чтобы вы успели всё обсудить?»'],
    ['Клиент назвал цену дорогой. Менеджер сразу предложил скидку, не выяснив, с чем сравнивают.', 'Спросите: «С чем вы сравниваете? Покажу, чем наше предложение отличается именно для вашей задачи».'],
    ['Клиент был готов к оплате, но менеджер не закрыл разговор на следующем шаге.', 'Скажите: «Давайте зафиксируем: выставляю счёт сейчас, а вы подтвердите оплату до конца дня?»'],
    ['Клиент упомянул конкурента. Менеджер не отработал возражение и перевёл тему.', 'Скажите: «Понимаю, вы смотрите и другие варианты. Что для вас важнее всего при выборе?»'],
    ['Клиент просил перезвонить, обещание не выполнено, сделка остыла.', 'Верните сделку звонком с новым поводом: «Вы просили вернуться к разговору, я подготовил расчёт».']
  ];
  const OK_PHRASES = [
    'Этапы продаж пройдены, возражений нет. Звонок оценён по чек-листу.',
    'Прозвучало возражение «нужно согласовать», менеджер отработал его и назначил следующий шаг.',
    'Потребность клиента выявлена, факты о клиенте занесены в разбор. Рисков нет.',
    'Менеджер выполнил рекомендацию с прошлого звонка. Сделка ведётся дальше.'
  ];

  function buildCalls(el, asButtons) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 100; i++) {
      const t = document.createElement(asButtons ? 'button' : 'div');
      t.className = 't';
      t.dataset.i = i;
      t.style.setProperty('--d', (i * 9) + 'ms');
      if (asButtons) { t.type = 'button'; t.setAttribute('aria-label', 'Звонок ' + (i + 1)); }
      frag.appendChild(t);
    }
    el.appendChild(frag);
    return $$('.t', el);
  }

  /* hero */
  const heroCalls = $('#heroCalls');
  if (heroCalls) {
    const tiles = buildCalls(heroCalls, true);
    const count = $('#heroCount'), card = $('#heroCard');
    const segBtns = $$('.seg__b', $('#heroStage'));
    let mode = 'now', touched = false, sel = -1;

    const setMode = (m, user) => {
      if (user) touched = true;
      mode = m;
      segBtns.forEach(b => { const on = b.dataset.mode === m; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
      tiles.forEach((t, i) => {
        t.className = 't';
        if (m === 'now') { if (HEARD.includes(i)) t.classList.add('is-heard'); }
        else t.classList.add(LOST.includes(i) ? 'is-lost' : 'is-ok');
        if (i === sel) t.classList.add('is-sel');
      });
      count.innerHTML = m === 'now'
        ? 'Прослушано руководителем: <b>10</b> из 100'
        : 'Разобрано: <b>100</b> из 100 · потерянных клиентов: <b>' + LOST.length + '</b>';
      if (sel >= 0) showCard(sel);
    };

    const showCard = i => {
      const lostIdx = LOST.indexOf(i);
      let h, body = '', q = '';
      h = 'Звонок ' + (i + 1);
      if (mode === 'now') {
        body = HEARD.includes(i)
          ? 'Этот звонок прослушал руководитель. Остальные 90 никто не слышал: что в них, неизвестно.'
          : 'Этот звонок никто не слушал. Был ли клиент готов купить и что сказал менеджер, неизвестно.';
      } else if (lostIdx >= 0) {
        const p = LOST_PHRASES[lostIdx % LOST_PHRASES.length];
        h += ': потерянный клиент';
        body = p[0]; q = p[1];
      } else {
        const k = (i * 7) % OK_PHRASES.length;
        h += ': разобран';
        body = OK_PHRASES[k];
      }
      card.innerHTML = '<p class="call-card__h"></p><p class="call-card__t"></p>' + (q ? '<p class="call-card__q"></p>' : '');
      card.children[0].textContent = h;
      card.children[1].textContent = body;
      if (q) card.children[2].textContent = q;
    };

    heroCalls.addEventListener('click', e => {
      const t = e.target.closest('.t'); if (!t) return;
      touched = true;
      sel = +t.dataset.i;
      tiles.forEach(x => x.classList.remove('is-sel'));
      t.classList.add('is-sel');
      showCard(sel);
    });
    segBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode, true)));
    setMode('now');
    if (reduce) setMode('mentor');
    else setTimeout(() => { if (!touched) setMode('mentor'); }, 2600);
  }

  /* ---------- сцена: 4 шага на сетке ---------- */
  const pin = $('#how');
  const sceneCalls = $('#sceneCalls');
  if (pin && sceneCalls) {
    const tiles = buildCalls(sceneCalls, false);
    tiles.forEach(t => t.style.setProperty('--d', '0ms'));
    const steps = $$('.step', pin), bars = $$('.pbar i', pin), cap = $('#sceneCap');
    const CAPS = [
      'Записи загружаются: файлами или из CRM и телефонии.',
      'Mentor слушает каждый звонок, а не десятую часть.',
      'Найдено ' + LOST.length + ' потерянных клиентов. Каждому менеджеру ушла готовая фраза.',
      'Mentor проверяет следующий звонок: рекомендация выполнена, сделка ведётся дальше.'
    ];
    let sig = '';
    const update = () => {
      const r = pin.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - innerHeight), 0, 1);
      const s = Math.min(3, Math.floor(p * 4)), t = clamp(p * 4 - s, 0, 1);
      const n = Math.round(t * 100), k = Math.round(t * LOST.length);
      const key = s + ':' + (s === 0 || s === 1 ? n : k);
      steps.forEach((el, i) => el.classList.toggle('is-on', i === s));
      bars.forEach((b, i) => b.style.setProperty('--p', i < s ? 1 : i === s ? t : 0));
      if (key === sig) return;
      sig = key;
      cap.textContent = CAPS[s];
      tiles.forEach((tl, i) => {
        let c = 't';
        if (s === 0) { if (i < n) c += ' is-up'; }
        else if (s === 1) c += i < n ? ' is-ok' : ' is-up';
        else {
          const li = LOST.indexOf(i);
          if (li >= 0 && li < k) c += s === 2 ? ' is-lost' : ' is-fix';
          else if (li >= 0) c += s === 2 ? ' is-ok' : ' is-lost';
          else c += ' is-ok';
        }
        tl.className = c;
      });
    };
    let tick = false;
    const onScroll = () => { if (!tick) { tick = true; requestAnimationFrame(() => { tick = false; update(); }); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    update();
  }

  /* ---------- цифры ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (reduce) { el.textContent = pre + to + suf; return; }
    const t0 = performance.now(), dur = 1400;
    const step = now => {
      const k = clamp((now - t0) / dur, 0, 1), v = to * (1 - Math.pow(1 - k, 4));
      el.textContent = pre + Math.round(v) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => io.observe(el));

  /* ---------- калькулятор тарифа ---------- */
  const FN = [
    { n: 'Расшифровка + разметка', d: 'Переводим звонок в текст и размечаем этапы продаж: кто говорит, клиент или менеджер. Включена всегда.', lock: true },
    { n: 'Оценка по этапам', d: 'Каждый этап оценивается по чек-листу: можно задать свой или взять наш.' },
    { n: 'Итоги', d: 'Коротко, о чём был разговор.' },
    { n: 'Факты о клиенте', d: 'Потребность клиента и факты о нём, которые прозвучали в разговоре.' },
    { n: 'Риски', d: 'Покажем неочевидный шанс потерять клиента или сорвать сделку.' },
    { n: 'Потерянные клиенты', d: 'Клиенты, которые были готовы купить, но менеджер не дожал.' },
    { n: 'Возражения', d: 'Какие возражения звучат в разговорах и как их отработать.' },
    { n: 'Рекомендации', d: 'Как менеджеру дожать клиента: по 120 психологическим принципам и правилам продаж. Можно добавить вашу экспертизу и опыт лучших сотрудников.' }
  ];
  const TIERS = [
    { min: 2300, price: 14999, rates: [2.81, 1.00, .20, .25, .10, .15, .50, 1.51], h: '≈ 38 часов разговоров', c: '≈ 1 150 звонков', m: '≈ 3 менеджера на линии' },
    { min: 6000, price: 29999, name: 'Оптимальный', rates: [2.15, .77, .15, .19, .08, .12, .39, 1.15], h: '≈ 100 часов разговоров', c: '≈ 3 000 звонков', m: '≈ 8 менеджеров на линии' },
    { min: 13000, price: 59999, rates: [1.99, .71, .14, .18, .07, .11, .35, 1.07], h: '≈ 217 часов разговоров', c: '≈ 6 500 звонков', m: '≈ 16 менеджеров на линии' },
    { min: 30000, price: 119999, rates: [1.72, .62, .12, .16, .06, .09, .31, .92], h: '≈ 500 часов разговоров', c: '≈ 15 000 звонков', m: '≈ 36 менеджеров на линии' }
  ];
  const COL = ['#1F1F1D', '#47443C', '#6E6B63', '#9A968A', '#C9C5B6', '#E7CB96', '#F7C069', '#E0A63C'];
  const calc = $('#calc');
  if (calc) {
    const tiersEl = $('#tiers'), fnsEl = $('#fns'), bar = $('#bar');
    let ti = 1; const on = FN.map(() => true);

    tiersEl.innerHTML = TIERS.map((t, i) => `<button type="button" class="tier${t.name ? ' is-best' : ''}" data-i="${i}" aria-pressed="false">${t.name ? '<span class="tier__badge">' + t.name + '</span>' : ''}<b class="tier__price"></b><span class="tier__pm"></span><span class="tier__min"><span>Включено минут</span><b>${fmt(t.min)}</b></span><span class="tier__f">${t.h}</span><span class="tier__f">${t.c}</span><span class="tier__f">${t.m}</span><span class="tier__f">Аналитика бесплатно</span><span class="tier__pick"><span>Выбрать тариф</span></span></button>`).join('');
    fnsEl.innerHTML = FN.map((f, i) => `<label class="fn"><input type="checkbox" data-i="${i}" checked ${f.lock ? 'disabled' : ''}><span class="fn__sw"></span><span class="fn__t"><b>${f.n}</b><span>${f.d}</span></span><span class="fn__p"></span></label>`).join('')
      + `<div class="fn" style="cursor:default"><span class="fn__sw" style="background:var(--ink)"></span><span class="fn__t"><b>Аналитика отдела</b><span>Полная аналитика отдела, включая ошибки менеджеров. Включена всегда.</span></span><span class="fn__p">бесплатно</span></div>`;
    bar.innerHTML = FN.map((f, i) => `<i style="background:${COL[i]}"></i>`).join('');
    const segs = $$('i', bar), rows = $$('.fn[data-x], label.fn', fnsEl);

    const render = () => {
      const t = TIERS[ti];
      let pm = 0; t.rates.forEach((r, i) => { if (on[i]) pm += r; });
      pm = Math.round(pm * 100) / 100;
      const all = on.every(Boolean), off = on.filter(v => !v).length;
      $$('.tier', tiersEl).forEach((b, i) => {
        const tt = TIERS[i];
        let p = 0; tt.rates.forEach((r, k) => { if (on[k]) p += r; });
        p = Math.round(p * 100) / 100;
        b.classList.toggle('is-on', i === ti); b.setAttribute('aria-pressed', i === ti);
        $('.tier__price', b).textContent = (all ? '' : '≈ ') + fmt(all ? tt.price : p * tt.min) + ' ₽';
        $('.tier__pm', b).textContent = fmt2(p) + ' ₽ за минуту';
      });
      rows.forEach((row, i) => {
        row.classList.toggle('is-off', !on[i]);
        $('.fn__p', row).textContent = fmt2(t.rates[i]) + ' ₽';
      });
      segs.forEach((s, i) => { s.style.flexGrow = on[i] ? t.rates[i] : 0; });
      $('#pm').textContent = fmt2(pm);
      $('#callPrice').textContent = 'Звонок около 2 минут: ' + fmt2(pm * 2) + ' ₽';
      const total = all ? t.price : pm * t.min;
      $('#sum').textContent = (all ? '' : '≈ ') + fmt(total) + ' ₽ в месяц за ' + fmt(t.min) + ' минут';
      $('#pack').textContent = all
        ? (t.name ? 'Тариф «' + t.name + '» со всеми функциями.' : 'Все функции включены.')
        : 'Отключено функций: ' + off + '. Минута дешевле на ' + fmt2(t.rates.reduce((a, r, i) => a + r, 0) - pm) + ' ₽ по сравнению с полным пакетом.';
      const names = FN.filter((f, i) => on[i]).map(f => f.n).join(', ');
      calc.dataset.summary = 'Тариф ' + fmt(t.min) + ' минут, ' + fmt2(pm) + ' ₽/мин (≈ ' + fmt(total) + ' ₽ в месяц). Функции: ' + names + '.';
    };
    tiersEl.addEventListener('click', e => { const b = e.target.closest('.tier'); if (b) { ti = +b.dataset.i; render(); } });
    fnsEl.addEventListener('change', e => { const c = e.target; if (c.dataset.i) { on[+c.dataset.i] = c.checked; render(); } });
    $('#calcCta').addEventListener('click', () => {
      $('#tariffField').value = calc.dataset.summary || '';
      const ta = $('textarea[name=comment]'); if (ta && !ta.value) ta.value = calc.dataset.summary || '';
    });
    render();
  }

  /* ---------- форма ---------- */
  const form = $('#leadForm'), note = $('#formNote');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    note.textContent = '';
    const name = form.name.value.trim(), phone = form.phone.value.trim();
    $$('input', form).forEach(i => i.classList.remove('is-bad'));
    let bad = false;
    if (!name) { form.name.classList.add('is-bad'); bad = true; }
    if (phone.length < 5) { form.phone.classList.add('is-bad'); bad = true; }
    if (!form.consent.checked) { note.textContent = 'Нужно согласие на обработку данных.'; bad = true; }
    if (bad) { if (!note.textContent) note.textContent = 'Заполните имя и телефон или Telegram.'; return; }
    const payload = {};
    new FormData(form).forEach((v, k) => { payload[k] = v; });
    if (payload._gotcha) return;
    const btn = $('button[type=submit]', form); btn.disabled = true;
    try {
      const r = await fetch(LEAD_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error(r.status);
      form.reset(); note.textContent = 'Заявка отправлена. Мы свяжемся с вами в ближайшее время.';
    } catch (err) {
      note.textContent = 'Не удалось отправить. Напишите в Telegram @vyacheslav2511 или позвоните +7 994 025-91-74.';
    } finally { btn.disabled = false; }
  });
})();
