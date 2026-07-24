(() => {
  'use strict';

  const STORAGE_KEY = 'msc_patient_pilot_v1';
  const MAX_SYMPTOMS = 3;

  if (!window.CSS) window.CSS = {};
  if (typeof window.CSS.escape !== 'function') {
    window.CSS.escape = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, (char) => `\${char}`);
  }

  const app = document.getElementById('app');
  const toast = document.getElementById('toast');

  let currentView = 'home';
  let historyFilter = 'Todos';
  let historyDate = '';
  let evolutionPeriod = '7';
  let reportPeriod = '30';
  let reportCustomStart = '';
  let reportCustomEnd = '';
  let editingCheckinId = null;

  // Esta versión para pacientes usa localStorage: los datos quedan únicamente en el
  // dispositivo del paciente. Para historia clínica electrónica, panel médico o
  // carga de datos identificables debe reemplazarse por backend seguro,
  // autenticación, consentimiento informado, auditoría y permisos por rol.
  let state = loadState();

  const reasons = ['Dolor', 'Sueño', 'Ansiedad', 'Estrés', 'Digestión', 'Migrañas', 'Rigidez o tensión muscular', 'Bienestar general', 'Otro'];
  const symptomOptions = ['Dolor', 'Ansiedad', 'Estrés', 'Sueño', 'Digestión', 'Cefalea', 'Rigidez', 'Energía', 'Estado de ánimo', 'Otro'];
  const sleepOptions = ['Muy bien', 'Bien', 'Regular', 'Mal', 'Muy mal'];
  const energyOptions = ['Muy alta', 'Alta', 'Media', 'Baja', 'Muy baja'];
  const moodOptions = ['Muy bueno', 'Bueno', 'Neutral', 'Bajo', 'Muy bajo'];
  const functionalityOptions = ['Sí, sin dificultad', 'Sí, con alguna dificultad', 'Solo parcialmente', 'No pude realizarlas'];
  const activities = ['Trabajé o estudié', 'Realicé tareas del hogar', 'Caminé o me movilicé', 'Realicé actividad física', 'Disfruté alguna actividad', 'Socialicé', 'Ninguna de las anteriores'];
  const routes = ['Sublingual', 'Oral', 'Tópica', 'Vaporizada', 'Otra'];
  const effects = ['No percibí efecto', 'Efecto leve', 'Efecto moderado', 'Efecto marcado', 'Efecto excesivo'];
  const omissionReasons = ['Me olvidé', 'No lo necesitaba', 'No tenía producto disponible', 'Me produjo efectos no deseados', 'Decidí omitirlo', 'Indicación profesional', 'Otro'];
  const adverseOptions = ['Ninguno', 'Somnolencia excesiva', 'Mareos', 'Boca seca', 'Náuseas', 'Ansiedad', 'Palpitaciones', 'Dificultad de concentración', 'Sensación desagradable', 'Otro'];
  const productTypes = ['Aceite', 'Tintura', 'Cápsula', 'Tópico', 'Vaporizado', 'Comestible', 'Otro'];
  const predominanceOptions = ['CBD predominante', 'THC predominante', 'Balanceado', 'No conoce'];
  const changeReasons = ['Indicación profesional', 'Respuesta insuficiente', 'Efectos no deseados', 'Cambio de producto', 'Disponibilidad', 'Decisión personal', 'Otro'];
  const navItems = [
    { view: 'home', label: 'Inicio', icon: '⌂' },
    { view: 'day', label: 'Mi día', icon: '✓' },
    { view: 'treatment', label: 'Tratamiento', icon: '◷' },
    { view: 'evolution', label: 'Evolución', icon: '↗' },
    { view: 'history', label: 'Historial', icon: '≡' }
  ];

  function defaultState() {
    return {
      profile: null,
      treatment: blankTreatment(),
      checkins: [],
      intakes: [],
      changes: [],
      demoLoaded: false
    };
  }

  function blankTreatment() {
    return {
      id: uid('treat'),
      product: '',
      type: 'Aceite',
      predominance: 'No conoce',
      ratio: '',
      concentration: '',
      maker: '',
      startDate: todayISO(),
      schedules: [
        { id: uid('sch'), time: '09:00', dose: '', active: false },
        { id: uid('sch'), time: '15:00', dose: '', active: false },
        { id: uid('sch'), time: '21:00', dose: '', active: false },
        { id: uid('sch'), time: '', dose: '', active: false }
      ],
      active: true,
      notes: '',
      createdAt: nowISO(),
      updatedAt: nowISO()
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return migrateState(parsed);
    } catch (error) {
      console.error('No se pudo leer localStorage', error);
      return defaultState();
    }
  }

  function migrateState(data) {
    const clean = { ...defaultState(), ...(data || {}) };
    clean.checkins = Array.isArray(clean.checkins) ? clean.checkins : [];
    clean.intakes = Array.isArray(clean.intakes) ? clean.intakes : [];
    clean.changes = Array.isArray(clean.changes) ? clean.changes : [];
    clean.treatment = clean.treatment || blankTreatment();
    clean.treatment.schedules = normalizeSchedules(clean.treatment.schedules);
    return clean;
  }

  function normalizeSchedules(schedules) {
    const base = Array.isArray(schedules) ? schedules.slice(0, 4) : [];
    while (base.length < 4) base.push({ id: uid('sch'), time: '', dose: '', active: false });
    return base.map((item) => ({
      id: item.id || uid('sch'),
      time: item.time || '',
      dose: item.dose || '',
      active: Boolean(item.active)
    }));
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function nowISO() { return new Date().toISOString(); }
  function todayISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }
  function timeNow() {
    const d = new Date();
    return d.toTimeString().slice(0, 5);
  }
  function addDays(date, days) {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + days);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }
  function daysAgo(n) { return addDays(todayISO(), -n); }

  function formatDate(date) {
    if (!date) return 'Sin fecha';
    const d = new Date(`${date}T12:00:00`);
    return d.toLocaleDateString('es-419', { weekday: 'short', day: '2-digit', month: 'short' });
  }

  function longDate(date = todayISO()) {
    const d = new Date(`${date}T12:00:00`);
    return d.toLocaleDateString('es-419', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function avg(values) {
    const valid = values.map(Number).filter(Number.isFinite);
    if (!valid.length) return null;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  }

  function round(value, digits = 1) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
    return Number(value).toLocaleString('es-419', { maximumFractionDigits: digits, minimumFractionDigits: digits });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function getProfileSymptoms() {
    return (state.profile?.symptoms?.length ? state.profile.symptoms : ['Bienestar general']).slice(0, MAX_SYMPTOMS);
  }

  function mainSymptomName() {
    return getProfileSymptoms()[0] || 'síntoma principal';
  }

  function symptomValue(checkin, symptom) {
    const found = checkin?.symptoms?.find((item) => item.name === symptom);
    return found ? num(found.value, null) : null;
  }

  function todayCheckin() {
    return state.checkins.find((item) => item.date === todayISO());
  }

  function activeSchedules() {
    return normalizeSchedules(state.treatment?.schedules).filter((item) => item.active && item.time);
  }

  function findIntake(date, scheduleId) {
    return state.intakes.find((item) => item.date === date && item.scheduleId === scheduleId);
  }

  function setView(view, options = {}) {
    currentView = view;
    if (view !== 'history') historyDate = historyDate || '';
    if (view !== 'day') editingCheckinId = null;
    if (options.editCheckinId) editingCheckinId = options.editCheckinId;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function render() {
    if (!state.profile) {
      renderOnboarding();
      return;
    }
    app.innerHTML = `
      <div class="app-shell">
        ${renderHeader()}
        <main id="screen">${renderCurrentView()}</main>
        ${renderNav()}
      </div>
    `;
    bindShell();
    bindCurrentView();
  }

  function renderHeader() {
    return `
      <header class="app-header">
        <div class="brand">
          <div class="brand-mark" aria-hidden="true">MSC</div>
          <div>
            <p class="brand-title">Mi Seguimiento Cannábico</p>
            <p>${escapeHTML(state.profile.nickname || 'Paciente')}</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" type="button" data-view="reports" aria-label="Abrir reportes">📄</button>
          <button class="icon-btn" type="button" data-view="settings" aria-label="Abrir configuración">⚙</button>
        </div>
      </header>
    `;
  }

  function renderNav() {
    const buttons = navItems.map((item) => `
      <button class="nav-btn ${currentView === item.view ? 'active' : ''}" type="button" data-view="${item.view}" aria-label="Ir a ${item.label}">
        <span class="nav-icon" aria-hidden="true">${item.icon}</span>
        <span>${item.label}</span>
      </button>
    `).join('');
    return `<nav class="navbar" aria-label="Navegación principal">${buttons}</nav>`;
  }

  function bindShell() {
    app.querySelectorAll('[data-view]').forEach((button) => {
      button.addEventListener('click', () => setView(button.dataset.view));
    });
  }

  function renderCurrentView() {
    switch (currentView) {
      case 'day': return renderDayView();
      case 'treatment': return renderTreatmentView();
      case 'evolution': return renderEvolutionView();
      case 'history': return renderHistoryView();
      case 'reports': return renderReportsView();
      case 'settings': return renderSettingsView();
      default: return renderHomeView();
    }
  }

  function renderOnboarding() {
    const symptomsHTML = symptomOptions.map((symptom) => `
      <label class="check-item">
        <input type="checkbox" name="symptoms" value="${escapeHTML(symptom)}" />
        <span>${escapeHTML(symptom)}</span>
      </label>
    `).join('');

    app.innerHTML = `
      <div class="onboarding-shell">
        <section class="card" style="margin-top: 18px;">
          <div class="brand" style="margin-bottom: 16px;">
            <div class="brand-mark" aria-hidden="true">MSC</div>
            <div>
              <h1 class="screen-title">Bienvenido a tu seguimiento</h1>
              <p class="screen-subtitle">Registrá cómo te sentís, cómo utilizás tu tratamiento y qué cambios notás con el tiempo.</p>
            </div>
          </div>
          <div class="notice-card">
            <p><strong>Uso con pacientes:</strong> Esta versión está pensada como registro personal en el dispositivo del paciente. Usá apodo o iniciales y no ingreses DNI, domicilio, fotos de estudios ni información que identifique directamente a la persona.</p>
            <p><strong>Privacidad:</strong> Los datos se guardan únicamente en este dispositivo. No se envían automáticamente a ningún profesional, ONG, servidor ni nube. El paciente puede exportar un resumen si decide compartirlo.</p>
            <p><strong>Salud:</strong> Esta aplicación organiza información ingresada por el usuario. No brinda diagnósticos, no indica tratamientos, no recomienda dosis y no reemplaza el seguimiento médico. Ante síntomas intensos o una urgencia, contactar al profesional tratante o al servicio de emergencias local.</p>
          </div>
        </section>

        <section class="card">
          <h2 class="section-title" style="margin-top: 0;">Configuración inicial</h2>
          <div class="form-grid">
            <div class="form-row">
              <label for="ob-nickname">Apodo, iniciales o nombre elegido</label>
              <input id="ob-nickname" type="text" placeholder="Ej: P.B., Paciente B o apodo" autocomplete="off" />
            </div>
            <div class="form-row">
              <label for="ob-start">Fecha de inicio del seguimiento</label>
              <div class="input-wrap"><input id="ob-start" type="date" value="${todayISO()}" /></div>
            </div>
            <div class="form-row">
              <label for="ob-reason">Motivo principal de seguimiento</label>
              <select id="ob-reason">${reasons.map((item) => `<option>${escapeHTML(item)}</option>`).join('')}</select>
            </div>
            <fieldset class="form-row" style="border:0;padding:0;margin:0;">
              <legend class="form-label">Síntomas que querés observar <span class="muted">(hasta ${MAX_SYMPTOMS})</span></legend>
              <div class="check-list" id="ob-symptom-list">${symptomsHTML}</div>
              <small id="symptom-help">Seleccioná entre 1 y 3 opciones.</small>
            </fieldset>
            <label class="check-item">
              <input id="ob-accept-demo" type="checkbox" />
              <span>Comprendo que esta app funciona como registro personal y no ingresaré DNI, domicilio, fotos de estudios ni datos identificatorios directos.</span>
            </label>
            <label class="check-item">
              <input id="ob-accept-health" type="checkbox" />
              <span>Comprendo que la aplicación no reemplaza la consulta médica ni indica cambios de tratamiento.</span>
            </label>
            <button class="primary-btn" type="button" id="start-app">Comenzar</button>
            <label class="check-item">
              <input id="ob-accept-share" type="checkbox" />
              <span>Comprendo que si quiero compartir información con mi profesional debo exportarla o mostrarla voluntariamente.</span>
            </label>
            <button class="secondary-btn" type="button" id="load-demo-onboarding">Cargar datos de ejemplo y explorar</button>
          </div>
        </section>
      </div>
    `;
    bindOnboarding();
  }

  function bindOnboarding() {
    const symptomBoxes = [...app.querySelectorAll('input[name="symptoms"]')];
    const help = app.querySelector('#symptom-help');
    symptomBoxes.forEach((box) => {
      box.addEventListener('change', () => {
        const checked = symptomBoxes.filter((item) => item.checked);
        if (checked.length > MAX_SYMPTOMS) {
          box.checked = false;
          showToast(`Podés elegir hasta ${MAX_SYMPTOMS} síntomas.`);
        }
        help.textContent = `${symptomBoxes.filter((item) => item.checked).length}/${MAX_SYMPTOMS} seleccionados.`;
      });
    });

    app.querySelector('#start-app').addEventListener('click', () => {
      const nickname = app.querySelector('#ob-nickname').value.trim();
      const startDate = app.querySelector('#ob-start').value || todayISO();
      const mainReason = app.querySelector('#ob-reason').value;
      const symptoms = symptomBoxes.filter((item) => item.checked).map((item) => item.value).slice(0, MAX_SYMPTOMS);
      const acceptedDemo = app.querySelector('#ob-accept-demo').checked;
      const acceptedHealth = app.querySelector('#ob-accept-health').checked;
      const acceptedShare = app.querySelector('#ob-accept-share').checked;

      if (!nickname) return showToast('Ingresá un apodo, iniciales o nombre elegido.');
      if (!symptoms.length) return showToast('Seleccioná al menos un síntoma para observar.');
      if (!acceptedDemo || !acceptedHealth || !acceptedShare) return showToast('Aceptá los avisos obligatorios para continuar.');

      state.profile = {
        nickname,
        startDate,
        mainReason,
        symptoms,
        acceptedDemo,
        acceptedHealth,
        acceptedShare,
        isDemo: false,
        createdAt: nowISO(),
        updatedAt: nowISO()
      };
      state.treatment = blankTreatment();
      saveState();
      currentView = 'home';
      render();
      showToast('Configuración guardada.');
    });

    app.querySelector('#load-demo-onboarding').addEventListener('click', () => {
      state = createDemoState();
      saveState();
      currentView = 'home';
      render();
      showToast('Datos de ejemplo cargados.');
    });
  }

  function renderHomeView() {
    const checkin = todayCheckin();
    const schedules = activeSchedules();
    const treatment = state.treatment || blankTreatment();
    const quick = todayQuickSummary(checkin);
    const streak = calculateStreak();
    const message = dailyMessage();

    const scheduleHTML = schedules.length ? schedules.map((schedule) => {
      const intake = findIntake(todayISO(), schedule.id);
      const status = intake?.status || 'pendiente';
      const pillClass = status === 'tomada' ? 'done' : status === 'omitida' ? 'warn' : '';
      return `
        <div class="card" style="box-shadow:none;margin:8px 0;">
          <div class="history-top">
            <div>
              <strong>${escapeHTML(schedule.time)} · ${escapeHTML(schedule.dose || 'dosis registrada')}</strong>
              <p class="muted">${escapeHTML(treatment.product || 'Producto no cargado')}</p>
            </div>
            <span class="status-pill ${pillClass}">${escapeHTML(status)}</span>
          </div>
          <div class="actions-row" style="margin-top:10px;">
            <button class="small-btn" type="button" data-intake="taken" data-schedule-id="${schedule.id}">Registrar toma</button>
            <button class="small-btn danger" type="button" data-intake="omitted" data-schedule-id="${schedule.id}">Omitir toma</button>
          </div>
        </div>
      `;
    }).join('') : `<p class="muted">Todavía no configuraste horarios de toma.</p>`;

    return `
      <section>
        <h2 class="screen-title">Hola, ${escapeHTML(state.profile.nickname)}</h2>
        <p class="screen-subtitle">${longDate()} · Así viene tu seguimiento de hoy.</p>
      </section>

      <section class="card">
        <div class="history-top">
          <div>
            <span class="status-pill ${checkin ? 'done' : ''}">${checkin ? 'Completado' : 'Pendiente'}</span>
            <h3 class="section-title" style="margin:12px 0 4px;">Check-in diario</h3>
            <p class="muted">${checkin ? 'Ya registraste tu día. Podés verlo o editarlo.' : 'Completá tu registro en menos de un minuto.'}</p>
          </div>
        </div>
        <button class="primary-btn" type="button" id="home-checkin-btn" style="margin-top:14px;">${checkin ? 'Ver registro de hoy' : 'Completar mi día'}</button>
      </section>

      <section class="card">
        <div class="history-top">
          <div>
            <h3 class="section-title" style="margin:0 0 4px;">Tratamiento de hoy</h3>
            <p class="muted">${escapeHTML(treatment.product || 'Producto no cargado')} ${treatment.type ? '· ' + escapeHTML(treatment.type) : ''}</p>
          </div>
          <button class="small-btn" type="button" data-view="treatment">Editar horarios</button>
        </div>
        <p class="muted">Los recordatorios de esta versión funcionan dentro de la aplicación; no son notificaciones push cuando la app está cerrada.</p>
        ${scheduleHTML}
      </section>

      <h3 class="section-title">Resumen rápido de hoy</h3>
      <div class="metric-grid">
        ${metricCard('Síntoma principal', quick.symptom, quick.symptomDetail)}
        ${metricCard('Sueño', quick.sleep, quick.sleepDetail)}
        ${metricCard('Bienestar', quick.wellbeing, 'Escala 0 a 10')}
        ${metricCard('Efectos no deseados', quick.adverse, quick.adverseDetail)}
      </div>

      <section class="card">
        <h3 class="section-title" style="margin-top:0;">Racha</h3>
        <p><strong>${streak > 0 ? `Llevás ${streak} día${streak === 1 ? '' : 's'} registrando tu evolución.` : 'Hoy podés empezar tu seguimiento.'}</strong></p>
        <p class="muted">No pasa nada si un día no registrás. Podés retomarlo cuando quieras.</p>
      </section>

      <section class="card">
        <div class="history-top">
          <div>
            <h3 class="section-title" style="margin:0 0 4px;">Reporte para tu médica</h3>
            <p class="muted">Generá un resumen semanal o mensual para compartir antes de la consulta.</p>
          </div>
          <span class="status-pill">PDF</span>
        </div>
        <div class="actions-row" style="margin-top:12px;">
          <button class="secondary-btn" type="button" data-view="reports">Generar reporte</button>
        </div>
      </section>

      <section class="notice-card">
        <strong>Acompañamiento</strong>
        <p>${escapeHTML(message)}</p>
      </section>
    `;
  }

  function metricCard(label, value, detail = '') {
    return `
      <div class="metric-card">
        <span class="label">${escapeHTML(label)}</span>
        <span class="value">${escapeHTML(value)}</span>
        ${detail ? `<p class="detail">${escapeHTML(detail)}</p>` : ''}
      </div>
    `;
  }

  function todayQuickSummary(checkin) {
    if (!checkin) {
      return {
        symptom: 'Sin registro', symptomDetail: 'Todavía no hay datos para hoy', sleep: 'Sin registro', sleepDetail: '', wellbeing: '—', adverse: 'Sin registro', adverseDetail: ''
      };
    }
    const symptom = mainSymptomName();
    const value = symptomValue(checkin, symptom);
    const adverse = checkin.adverseEffects?.length && !checkin.adverseEffects.includes('Ninguno');
    return {
      symptom: value === null ? '—' : `${value}/10`,
      symptomDetail: symptom,
      sleep: checkin.sleepQuality || '—',
      sleepDetail: `${checkin.sleepHours || 0} h · ${checkin.awakenings || '0'} despertares`,
      wellbeing: `${checkin.wellbeing ?? '—'}/10`,
      adverse: adverse ? 'Registrados' : 'Ninguno',
      adverseDetail: adverse ? `${checkin.adverseIntensity || ''}` : 'Según lo ingresado hoy'
    };
  }

  function dailyMessage() {
    const messages = [
      'Cada registro ayuda a comprender mejor tu evolución.',
      'Los días difíciles también aportan información valiosa.',
      'Registrar lleva menos de un minuto y ayuda a ver cambios reales.',
      'Gracias por participar activamente en el cuidado de tu salud.',
      'La constancia ayuda a detectar patrones.'
    ];
    const index = new Date().getDate() % messages.length;
    return messages[index];
  }

  function bindHomeView() {
    const homeButton = app.querySelector('#home-checkin-btn');
    if (homeButton) {
      homeButton.addEventListener('click', () => {
        const existing = todayCheckin();
        setView('day', existing ? { editCheckinId: existing.id } : {});
      });
    }
    bindIntakeButtons();
  }

  function renderDayView() {
    const existing = editingCheckinId ? state.checkins.find((item) => item.id === editingCheckinId) : todayCheckin();
    const date = existing?.date || todayISO();
    const time = existing?.time || timeNow();
    const symptoms = getProfileSymptoms();
    const symptomInputs = symptoms.map((symptom) => {
      const value = symptomValue(existing, symptom) ?? 5;
      return `
        <div class="range-card">
          <div class="range-header">
            <strong>${escapeHTML(symptom)}</strong>
            <span class="range-value" id="value-${slug(symptom)}">${value}/10</span>
          </div>
          <input type="range" min="0" max="10" step="1" value="${value}" data-range-output="value-${slug(symptom)}" data-symptom="${escapeHTML(symptom)}" aria-label="Intensidad de ${escapeHTML(symptom)}" />
          <div class="range-scale"><span>0 = nada</span><span>10 = máxima intensidad</span></div>
        </div>
      `;
    }).join('');

    const selectedActivities = existing?.activities || [];
    const adverseSelected = existing?.adverseEffects || ['Ninguno'];
    const usedCannabis = existing ? existing.usedCannabis === 'Sí' : true;

    return `
      <section>
        <h2 class="screen-title">¿Cómo estuvo tu día?</h2>
        <p class="screen-subtitle">Completá este registro en menos de un minuto.</p>
      </section>

      <section class="card step-card">
        <h3 class="section-title" style="margin-top:0;"><span class="step-number">1</span>Síntomas principales</h3>
        <div class="form-grid">${symptomInputs}</div>
      </section>

      <section class="card step-card">
        <h3 class="section-title" style="margin-top:0;"><span class="step-number">2</span>Sueño</h3>
        <div class="form-grid two-col">
          <div class="form-row">
            <label for="day-sleep-quality">¿Cómo dormiste anoche?</label>
            <select id="day-sleep-quality">${optionHTML(sleepOptions, existing?.sleepQuality || 'Regular')}</select>
          </div>
          <div class="form-row">
            <label for="day-sleep-hours">Horas aproximadas</label>
            <input id="day-sleep-hours" type="number" inputmode="decimal" min="0" max="24" step="0.5" value="${escapeHTML(existing?.sleepHours ?? '')}" placeholder="Ej: 6.5" />
          </div>
          <div class="form-row">
            <label for="day-awakenings">Despertares</label>
            <select id="day-awakenings">${optionHTML(['ninguno', '1', '2', '3', '4', '5 o más'], existing?.awakenings || 'ninguno')}</select>
          </div>
        </div>
      </section>

      <section class="card step-card">
        <h3 class="section-title" style="margin-top:0;"><span class="step-number">3</span>Estado general</h3>
        <div class="form-grid">
          <div class="two-col">
            <div class="form-row">
              <label for="day-energy">Energía</label>
              <select id="day-energy">${optionHTML(energyOptions, existing?.energy || 'Media')}</select>
            </div>
            <div class="form-row">
              <label for="day-mood">Estado de ánimo</label>
              <select id="day-mood">${optionHTML(moodOptions, existing?.mood || 'Neutral')}</select>
            </div>
          </div>
          <div class="range-card">
            <div class="range-header"><strong>Bienestar general</strong><span class="range-value" id="value-wellbeing">${existing?.wellbeing ?? 5}/10</span></div>
            <input id="day-wellbeing" type="range" min="0" max="10" step="1" value="${existing?.wellbeing ?? 5}" data-range-output="value-wellbeing" aria-label="Bienestar general" />
          </div>
        </div>
      </section>

      <section class="card step-card">
        <h3 class="section-title" style="margin-top:0;"><span class="step-number">4</span>Funcionalidad</h3>
        <div class="form-grid">
          <div class="form-row">
            <label for="day-functionality">¿Pudiste realizar tus actividades habituales?</label>
            <select id="day-functionality">${optionHTML(functionalityOptions, existing?.functionality || functionalityOptions[1])}</select>
          </div>
          <fieldset class="form-row" style="border:0;margin:0;padding:0;">
            <legend class="form-label">Actividades realizadas</legend>
            <div class="check-list">${checkboxHTML('activity', activities, selectedActivities)}</div>
          </fieldset>
        </div>
      </section>

      <section class="card step-card">
        <h3 class="section-title" style="margin-top:0;"><span class="step-number">5</span>Uso de cannabis medicinal</h3>
        <div class="segmented" role="group" aria-label="Uso de cannabis medicinal">
          <button class="chip-btn ${usedCannabis ? 'active' : ''}" type="button" data-cannabis-choice="Sí">Sí</button>
          <button class="chip-btn ${!usedCannabis ? 'active' : ''}" type="button" data-cannabis-choice="No">No</button>
        </div>
        <input type="hidden" id="day-used-cannabis" value="${usedCannabis ? 'Sí' : 'No'}" />

        <div id="cannabis-yes" class="form-grid ${usedCannabis ? '' : 'hidden'}" style="margin-top:14px;">
          <div class="form-row">
            <label for="day-product-used">Producto utilizado</label>
            <input id="day-product-used" type="text" value="${escapeHTML(existing?.productUsed || state.treatment.product || '')}" placeholder="Ej: aceite indicado / producto registrado" />
          </div>
          <div class="two-col">
            <div class="form-row">
              <label for="day-route">Vía</label>
              <select id="day-route">${optionHTML(routes, existing?.route || 'Sublingual')}</select>
            </div>
            <div class="form-row">
              <label for="day-dose-count">Cantidad de tomas</label>
              <input id="day-dose-count" type="number" min="0" step="1" inputmode="numeric" value="${escapeHTML(existing?.doseCount ?? '')}" placeholder="Ej: 2" />
            </div>
          </div>
          <div class="form-row">
            <label for="day-dose-text">Dosis total escrita por el usuario <span class="muted">(opcional)</span></label>
            <input id="day-dose-text" type="text" value="${escapeHTML(existing?.doseText || '')}" placeholder="Ej: 2 gotas, 0,2 ml, según indicación profesional" />
          </div>
          <div class="form-row">
            <label for="day-effect">Efecto percibido</label>
            <select id="day-effect">${optionHTML(effects, existing?.perceivedEffect || 'Efecto leve')}</select>
          </div>
        </div>

        <div id="cannabis-no" class="form-grid ${usedCannabis ? 'hidden' : ''}" style="margin-top:14px;">
          <div class="form-row">
            <label for="day-no-use-reason">¿Por qué no lo utilizaste?</label>
            <select id="day-no-use-reason">${optionHTML(omissionReasons, existing?.noUseReason || 'No lo necesitaba')}</select>
          </div>
        </div>
      </section>

      <section class="card step-card">
        <h3 class="section-title" style="margin-top:0;"><span class="step-number">6</span>Efectos no deseados</h3>
        <fieldset class="form-row" style="border:0;margin:0;padding:0;">
          <legend class="form-label">¿Tuviste algún efecto no deseado?</legend>
          <div class="check-list">${checkboxHTML('adverse', adverseOptions, adverseSelected)}</div>
        </fieldset>
        <div class="form-row" id="adverse-intensity-wrap" style="margin-top:12px;">
          <label for="day-adverse-intensity">Intensidad</label>
          <select id="day-adverse-intensity">${optionHTML(['Leve', 'Moderada', 'Intensa'], existing?.adverseIntensity || 'Leve')}</select>
        </div>
      </section>

      <section class="card">
        <div class="two-col">
          <div class="form-row">
            <label for="day-date">Fecha</label>
            <div class="input-wrap"><input id="day-date" type="date" value="${date}" /></div>
          </div>
          <div class="form-row">
            <label for="day-time">Hora</label>
            <div class="input-wrap"><input id="day-time" type="time" value="${time}" /></div>
          </div>
        </div>
        <div class="form-row" style="margin-top:12px;">
          <label for="day-comment">¿Querés registrar algo más? <span class="muted">(opcional)</span></label>
          <textarea id="day-comment" placeholder="Ejemplo: cambios de rutina, situación de estrés, actividad física, descanso, alimentación o cualquier observación útil.">${escapeHTML(existing?.comment || '')}</textarea>
        </div>
        <button class="primary-btn" type="button" id="save-day" style="margin-top:14px;">Guardar mi día</button>
      </section>
    `;
  }

  function bindDayView() {
    app.querySelectorAll('input[type="range"]').forEach((range) => {
      const update = () => {
        const output = app.querySelector(`#${CSS.escape(range.dataset.rangeOutput)}`);
        if (output) output.textContent = `${range.value}/10`;
      };
      range.addEventListener('input', update);
      update();
    });

    app.querySelectorAll('[data-cannabis-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        const choice = button.dataset.cannabisChoice;
        app.querySelector('#day-used-cannabis').value = choice;
        app.querySelectorAll('[data-cannabis-choice]').forEach((btn) => btn.classList.toggle('active', btn.dataset.cannabisChoice === choice));
        app.querySelector('#cannabis-yes').classList.toggle('hidden', choice !== 'Sí');
        app.querySelector('#cannabis-no').classList.toggle('hidden', choice !== 'No');
      });
    });

    const adverseBoxes = [...app.querySelectorAll('input[name="adverse"]')];
    const intensityWrap = app.querySelector('#adverse-intensity-wrap');
    const updateAdverse = (changed) => {
      if (changed?.value === 'Ninguno' && changed.checked) adverseBoxes.forEach((box) => { if (box.value !== 'Ninguno') box.checked = false; });
      if (changed?.value !== 'Ninguno' && changed?.checked) adverseBoxes.forEach((box) => { if (box.value === 'Ninguno') box.checked = false; });
      const selected = adverseBoxes.filter((box) => box.checked).map((box) => box.value);
      const hasEffects = selected.length && !selected.includes('Ninguno');
      intensityWrap.classList.toggle('hidden', !hasEffects);
      if (!selected.length) {
        const none = adverseBoxes.find((box) => box.value === 'Ninguno');
        if (none) none.checked = true;
        intensityWrap.classList.add('hidden');
      }
    };
    adverseBoxes.forEach((box) => box.addEventListener('change', () => updateAdverse(box)));
    updateAdverse();

    app.querySelector('#save-day').addEventListener('click', saveDayCheckin);
  }

  function saveDayCheckin() {
    const date = app.querySelector('#day-date').value || todayISO();
    const time = app.querySelector('#day-time').value || timeNow();
    const symptoms = getProfileSymptoms().map((name) => {
      const input = app.querySelector(`input[data-symptom="${CSS.escape(name)}"]`);
      return { name, value: num(input?.value, 0) };
    });
    const sleepHours = app.querySelector('#day-sleep-hours').value;
    if (sleepHours !== '' && (num(sleepHours) < 0 || num(sleepHours) > 24)) return showToast('Las horas de sueño deben estar entre 0 y 24.');

    const usedCannabis = app.querySelector('#day-used-cannabis').value;
    const adverseEffects = [...app.querySelectorAll('input[name="adverse"]:checked')].map((item) => item.value);
    const hasAdverse = adverseEffects.length && !adverseEffects.includes('Ninguno');
    const activitiesSelected = [...app.querySelectorAll('input[name="activity"]:checked')].map((item) => item.value);

    const existingId = editingCheckinId || state.checkins.find((item) => item.date === date)?.id;
    const existing = existingId ? state.checkins.find((item) => item.id === existingId) : null;

    const record = {
      id: existing?.id || uid('chk'),
      category: 'checkin',
      date,
      time,
      symptoms,
      sleepQuality: app.querySelector('#day-sleep-quality').value,
      sleepHours: sleepHours === '' ? null : num(sleepHours),
      awakenings: app.querySelector('#day-awakenings').value,
      energy: app.querySelector('#day-energy').value,
      mood: app.querySelector('#day-mood').value,
      wellbeing: num(app.querySelector('#day-wellbeing').value, 0),
      functionality: app.querySelector('#day-functionality').value,
      activities: activitiesSelected,
      usedCannabis,
      productUsed: usedCannabis === 'Sí' ? app.querySelector('#day-product-used').value.trim() : '',
      route: usedCannabis === 'Sí' ? app.querySelector('#day-route').value : '',
      doseCount: usedCannabis === 'Sí' ? (app.querySelector('#day-dose-count').value || '') : '',
      doseText: usedCannabis === 'Sí' ? app.querySelector('#day-dose-text').value.trim() : '',
      perceivedEffect: usedCannabis === 'Sí' ? app.querySelector('#day-effect').value : '',
      noUseReason: usedCannabis === 'No' ? app.querySelector('#day-no-use-reason').value : '',
      adverseEffects: adverseEffects.length ? adverseEffects : ['Ninguno'],
      adverseIntensity: hasAdverse ? app.querySelector('#day-adverse-intensity').value : '',
      comment: app.querySelector('#day-comment').value.trim(),
      createdAt: existing?.createdAt || nowISO(),
      updatedAt: nowISO(),
      isDemo: existing?.isDemo || false
    };

    if (existing) {
      state.checkins = state.checkins.map((item) => item.id === existing.id ? record : item);
    } else {
      state.checkins.push(record);
    }
    saveState();
    editingCheckinId = record.id;
    showToast('Registro guardado. Gracias por dedicar un momento a tu seguimiento.');
    currentView = 'home';
    render();
  }

  function renderTreatmentView() {
    const treatment = state.treatment || blankTreatment();
    const schedules = normalizeSchedules(treatment.schedules);
    const adherence = calculateAdherence(7);
    const scheduleRows = schedules.map((schedule, index) => `
      <div class="schedule-row" data-schedule-row="${index}">
        <div class="form-row">
          <label for="sch-time-${index}">Hora ${index + 1}</label>
          <div class="input-wrap"><input id="sch-time-${index}" type="time" value="${escapeHTML(schedule.time || '')}" /></div>
        </div>
        <div class="form-row">
          <label for="sch-dose-${index}">Dosis escrita</label>
          <input id="sch-dose-${index}" type="text" value="${escapeHTML(schedule.dose || '')}" placeholder="Ej: 2 gotas" />
        </div>
        <label class="switch-line" for="sch-active-${index}">
          <input id="sch-active-${index}" type="checkbox" ${schedule.active ? 'checked' : ''} />
          Activo
        </label>
      </div>
    `).join('');

    const todaySchedules = activeSchedules().map((schedule) => {
      const intake = findIntake(todayISO(), schedule.id);
      const status = intake?.status || 'pendiente';
      const pillClass = status === 'tomada' ? 'done' : status === 'omitida' ? 'warn' : '';
      return `
        <div class="card" style="box-shadow:none;margin:8px 0;">
          <div class="history-top">
            <div><strong>${escapeHTML(schedule.time)}</strong><p class="muted">${escapeHTML(schedule.dose || 'dosis registrada por el usuario')}</p></div>
            <span class="status-pill ${pillClass}">${escapeHTML(status)}</span>
          </div>
          <div class="actions-row" style="margin-top:10px;">
            <button class="small-btn" type="button" data-intake="taken" data-schedule-id="${schedule.id}">Tomada</button>
            <button class="small-btn danger" type="button" data-intake="omitted" data-schedule-id="${schedule.id}">Omitida</button>
          </div>
        </div>
      `;
    }).join('') || '<p class="muted">No hay horarios activos para hoy.</p>';

    return `
      <section>
        <h2 class="screen-title">Mi tratamiento</h2>
        <p class="screen-subtitle">Registrá lo que estás utilizando según la información que ya tenés.</p>
      </section>
      <section class="notice-card"><strong>Importante:</strong><p>La app no indica dosis ni recomienda productos. Este registro solo organiza información ingresada por el usuario.</p></section>

      <section class="card">
        <h3 class="section-title" style="margin-top:0;">Producto actual</h3>
        <div class="form-grid">
          <div class="form-row"><label for="t-product">Nombre o identificación del producto</label><input id="t-product" type="text" value="${escapeHTML(treatment.product || '')}" placeholder="Ej: aceite indicado / lote propio" /></div>
          <div class="two-col">
            <div class="form-row"><label for="t-type">Tipo de producto</label><select id="t-type">${optionHTML(productTypes, treatment.type || 'Aceite')}</select></div>
            <div class="form-row"><label for="t-predominance">Predominancia declarada</label><select id="t-predominance">${optionHTML(predominanceOptions, treatment.predominance || 'No conoce')}</select></div>
          </div>
          <div class="two-col">
            <div class="form-row"><label for="t-ratio">Relación THC:CBD <span class="muted">opcional</span></label><input id="t-ratio" type="text" value="${escapeHTML(treatment.ratio || '')}" placeholder="Ej: 1:1 / no conoce" /></div>
            <div class="form-row"><label for="t-concentration">Concentración declarada <span class="muted">opcional</span></label><input id="t-concentration" type="text" value="${escapeHTML(treatment.concentration || '')}" placeholder="Ej: 30 mg/ml" /></div>
          </div>
          <div class="two-col">
            <div class="form-row"><label for="t-maker">Elaborador o marca <span class="muted">opcional</span></label><input id="t-maker" type="text" value="${escapeHTML(treatment.maker || '')}" /></div>
            <div class="form-row"><label for="t-start-date">Fecha de inicio</label><div class="input-wrap"><input id="t-start-date" type="date" value="${escapeHTML(treatment.startDate || todayISO())}" /></div></div>
          </div>
          <div class="form-row"><label for="t-notes">Observaciones</label><textarea id="t-notes" placeholder="Información útil para recordar. Evitá ingresar datos identificatorios directos.">${escapeHTML(treatment.notes || '')}</textarea></div>
          <button class="primary-btn" type="button" id="save-treatment">Guardar tratamiento</button>
        </div>
      </section>

      <section class="card">
        <h3 class="section-title" style="margin-top:0;">Horarios de toma</h3>
        <p class="muted">Podés crear hasta cuatro horarios. No se calculan dosis clínicas.</p>
        <div class="form-grid">${scheduleRows}</div>
        <button class="primary-btn" type="button" id="save-schedules" style="margin-top:14px;">Guardar horarios</button>
      </section>

      <section class="card">
        <div class="history-top"><div><h3 class="section-title" style="margin:0 0 4px;">Registro de tomas de hoy</h3><p class="muted">Marcá cada horario como tomado u omitido.</p></div><span class="status-pill">${adherence === null ? '—' : adherence + '%'} adherencia</span></div>
        ${todaySchedules}
        <p class="muted">Adherencia de los últimos 7 días: ${adherence === null ? 'sin datos suficientes' : adherence + '%'}. Este cálculo solo refleja los registros cargados en la app.</p>
      </section>

      <section class="card">
        <h3 class="section-title" style="margin-top:0;">Cambio de producto o dosis</h3>
        <div class="form-grid">
          <div class="form-row"><label for="change-date">Fecha</label><div class="input-wrap"><input id="change-date" type="date" value="${todayISO()}" /></div></div>
          <div class="form-row"><label for="change-desc">Qué cambió</label><input id="change-desc" type="text" placeholder="Ej: cambio de horario, producto o cantidad registrada" /></div>
          <div class="form-row"><label for="change-reason">Motivo general</label><select id="change-reason">${optionHTML(changeReasons, 'Indicación profesional')}</select></div>
          <div class="form-row"><label for="change-comment">Comentario opcional</label><textarea id="change-comment" placeholder="Solo información general. No cargar datos identificables."></textarea></div>
          <button class="secondary-btn" type="button" id="save-change">Registrar cambio</button>
        </div>
      </section>
    `;
  }

  function bindTreatmentView() {
    const saveTreatment = () => {
      const old = state.treatment || blankTreatment();
      state.treatment = {
        ...old,
        product: app.querySelector('#t-product').value.trim(),
        type: app.querySelector('#t-type').value,
        predominance: app.querySelector('#t-predominance').value,
        ratio: app.querySelector('#t-ratio').value.trim(),
        concentration: app.querySelector('#t-concentration').value.trim(),
        maker: app.querySelector('#t-maker').value.trim(),
        startDate: app.querySelector('#t-start-date').value || todayISO(),
        notes: app.querySelector('#t-notes').value.trim(),
        updatedAt: nowISO()
      };
      saveState();
      showToast('Tratamiento guardado.');
      render();
    };
    app.querySelector('#save-treatment').addEventListener('click', saveTreatment);
    app.querySelector('#save-schedules').addEventListener('click', () => {
      const oldSchedules = normalizeSchedules(state.treatment?.schedules);
      const schedules = oldSchedules.map((schedule, index) => ({
        id: schedule.id || uid('sch'),
        time: app.querySelector(`#sch-time-${index}`).value,
        dose: app.querySelector(`#sch-dose-${index}`).value.trim(),
        active: app.querySelector(`#sch-active-${index}`).checked
      }));
      state.treatment.schedules = schedules;
      state.treatment.updatedAt = nowISO();
      saveState();
      showToast('Horarios guardados.');
      render();
    });
    app.querySelector('#save-change').addEventListener('click', () => {
      const description = app.querySelector('#change-desc').value.trim();
      if (!description) return showToast('Describí brevemente qué cambió.');
      const change = {
        id: uid('chg'),
        category: 'treatment-change',
        date: app.querySelector('#change-date').value || todayISO(),
        time: timeNow(),
        description,
        reason: app.querySelector('#change-reason').value,
        comment: app.querySelector('#change-comment').value.trim(),
        createdAt: nowISO(),
        updatedAt: nowISO(),
        isDemo: false
      };
      state.changes.push(change);
      saveState();
      showToast('Cambio registrado.');
      render();
    });
    bindIntakeButtons();
  }

  function bindIntakeButtons() {
    app.querySelectorAll('[data-intake]').forEach((button) => {
      button.addEventListener('click', () => {
        const scheduleId = button.dataset.scheduleId;
        const action = button.dataset.intake;
        if (action === 'taken') markIntake(scheduleId, 'tomada');
        if (action === 'omitted') {
          const reason = window.prompt('Motivo de omisión (opcional):\nEj: me olvidé, no lo necesitaba, indicación profesional, otro.', 'Me olvidé') || '';
          markIntake(scheduleId, 'omitida', reason.trim());
        }
      });
    });
  }

  function markIntake(scheduleId, status, reason = '') {
    const schedule = normalizeSchedules(state.treatment?.schedules).find((item) => item.id === scheduleId);
    if (!schedule) return showToast('No se encontró el horario.');
    const date = todayISO();
    const existing = findIntake(date, scheduleId);
    const record = {
      id: existing?.id || uid('dose'),
      category: 'intake',
      date,
      time: timeNow(),
      scheduledTime: schedule.time,
      scheduleId,
      product: state.treatment?.product || '',
      doseText: schedule.dose || '',
      status,
      omissionReason: status === 'omitida' ? reason : '',
      createdAt: existing?.createdAt || nowISO(),
      updatedAt: nowISO(),
      isDemo: existing?.isDemo || false
    };
    if (existing) state.intakes = state.intakes.map((item) => item.id === existing.id ? record : item);
    else state.intakes.push(record);
    saveState();
    showToast(status === 'tomada' ? 'Toma registrada.' : 'Omisión registrada.');
    render();
  }

  function calculateAdherence(days = 7) {
    const schedules = activeSchedules();
    if (!schedules.length) return null;
    let total = 0;
    let taken = 0;
    for (let i = days - 1; i >= 0; i--) {
      const date = daysAgo(i);
      schedules.forEach((schedule) => {
        total += 1;
        const intake = findIntake(date, schedule.id);
        if (intake?.status === 'tomada') taken += 1;
      });
    }
    return total ? Math.round((taken / total) * 100) : null;
  }

  function dailyAdherence(date) {
    const schedules = activeSchedules();
    if (!schedules.length) return null;
    let taken = 0;
    schedules.forEach((schedule) => {
      const intake = findIntake(date, schedule.id);
      if (intake?.status === 'tomada') taken += 1;
    });
    return Math.round((taken / schedules.length) * 100);
  }

  function renderEvolutionView() {
    const days = evolutionPeriod === 'all' ? null : Number(evolutionPeriod);
    const records = getCheckinsInPeriod(days);
    const dates = periodDates(days, records);
    const mainSymptom = mainSymptomName();
    const symptomValues = records.map((item) => symptomValue(item, mainSymptom)).filter((item) => item !== null);
    const wellbeingValues = records.map((item) => item.wellbeing).filter((item) => item !== null && item !== undefined);
    const sleepValues = records.map((item) => item.sleepHours).filter((item) => item !== null && item !== undefined);
    const adverseDays = records.filter((item) => item.adverseEffects?.length && !item.adverseEffects.includes('Ninguno')).length;
    const adherence = calculateAdherence(days || 14);

    const symptomData = dates.map((date) => {
      const record = state.checkins.find((item) => item.date === date);
      return { label: formatDate(date).replace('.', ''), value: record ? symptomValue(record, mainSymptom) : null };
    });
    const wellbeingData = dates.map((date) => {
      const record = state.checkins.find((item) => item.date === date);
      return { label: formatDate(date).replace('.', ''), value: record?.wellbeing ?? null };
    });
    const sleepData = dates.map((date) => {
      const record = state.checkins.find((item) => item.date === date);
      return { label: formatDate(date).replace('.', ''), value: record?.sleepHours ?? null };
    });
    const adherenceData = dates.map((date) => ({ label: formatDate(date).replace('.', ''), value: dailyAdherence(date) }));

    return `
      <section>
        <h2 class="screen-title">Mi evolución</h2>
        <p class="screen-subtitle">Datos basados únicamente en tus registros.</p>
      </section>

      <section class="card">
        <label class="form-label" for="evolution-period">Período</label>
        <select id="evolution-period" style="margin-top:8px;">
          <option value="7" ${evolutionPeriod === '7' ? 'selected' : ''}>Últimos 7 días</option>
          <option value="14" ${evolutionPeriod === '14' ? 'selected' : ''}>Últimos 14 días</option>
          <option value="all" ${evolutionPeriod === 'all' ? 'selected' : ''}>Todo</option>
        </select>
      </section>

      <div class="metric-grid">
        ${metricCard(`Promedio ${mainSymptom}`, avg(symptomValues) === null ? '—' : `${round(avg(symptomValues))}/10`, 'Síntoma principal')}
        ${metricCard('Promedio bienestar', avg(wellbeingValues) === null ? '—' : `${round(avg(wellbeingValues))}/10`, 'Escala 0 a 10')}
        ${metricCard('Horas de sueño', avg(sleepValues) === null ? '—' : `${round(avg(sleepValues))} h`, 'Promedio registrado')}
        ${metricCard('Adherencia', adherence === null ? '—' : `${adherence}%`, 'Últimos registros')}
        ${metricCard('Días registrados', `${records.length}`, `de ${dates.length || 0} días`) }
        ${metricCard('Efectos no deseados', `${adverseDays}`, 'días del período')}
      </div>

      ${records.length < 2 ? `<section class="empty-state card"><strong>Cuando tengas más registros, vas a poder ver tu evolución acá.</strong><p>Sumá al menos dos check-ins para comparar días.</p></section>` : `
        <section class="card chart-card"><h3 class="section-title" style="margin:0 14px 10px;">${escapeHTML(mainSymptom)} por día</h3>${barChart(symptomData, 10, '/10')}</section>
        <section class="card chart-card"><h3 class="section-title" style="margin:0 14px 10px;">Bienestar por día</h3>${barChart(wellbeingData, 10, '/10')}</section>
        <section class="card chart-card"><h3 class="section-title" style="margin:0 14px 10px;">Horas de sueño por día</h3>${barChart(sleepData, 12, ' h')}</section>
        <section class="card chart-card"><h3 class="section-title" style="margin:0 14px 10px;">Adherencia por día</h3>${barChart(adherenceData, 100, '%')}</section>
      `}

      <section class="card no-print">
        <div class="history-top">
          <div>
            <h3 class="section-title" style="margin:0 0 4px;">Reporte para evaluación médica</h3>
            <p class="muted">Prepará un resumen imprimible con los datos de este seguimiento.</p>
          </div>
          <span class="status-pill">Semanal / mensual</span>
        </div>
        <button class="secondary-btn" type="button" data-view="reports" style="margin-top:12px;">Generar reporte</button>
      </section>

      <section class="notice-card">
        <strong>Observaciones objetivas</strong>
        <ul>
          ${objectiveObservations(records, dates, wellbeingValues, sleepValues, adverseDays).map((item) => `<li>${escapeHTML(item)}</li>`).join('')}
        </ul>
      </section>
    `;
  }

  function bindEvolutionView() {
    const select = app.querySelector('#evolution-period');
    if (select) {
      select.addEventListener('change', () => {
        evolutionPeriod = select.value;
        render();
      });
    }
  }

  function getCheckinsInPeriod(days) {
    const cutoff = days ? daysAgo(days - 1) : null;
    return state.checkins
      .filter((item) => !cutoff || item.date >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function periodDates(days, records) {
    if (days) {
      return Array.from({ length: days }, (_, index) => daysAgo(days - 1 - index));
    }
    const allDates = [...new Set(records.map((item) => item.date))].sort();
    return allDates.length ? allDates : [todayISO()];
  }

  function barChart(data, max, unit) {
    if (!data.length) return '<p class="muted" style="padding:0 14px 14px;">Sin datos.</p>';
    return `<div style="padding:0 14px 12px;">${data.map((item) => {
      const value = item.value === null || item.value === undefined || Number.isNaN(Number(item.value)) ? null : Number(item.value);
      const width = value === null ? 0 : Math.max(2, Math.min(100, (value / max) * 100));
      return `
        <div class="chart-row">
          <span class="chart-label">${escapeHTML(item.label)}</span>
          <div class="bar-track" aria-label="${escapeHTML(item.label)}: ${value === null ? 'sin registro' : value + unit}"><div class="bar-fill" style="width:${width}%"></div></div>
          <span class="chart-value">${value === null ? '—' : round(value) + unit}</span>
        </div>
      `;
    }).join('')}</div>`;
  }

  function objectiveObservations(records, dates, wellbeingValues, sleepValues, adverseDays) {
    if (!records.length) return ['Todavía no hay registros en este período.'];
    const obs = [`Registraste ${records.length} de ${dates.length} días del período.`];
    const wellbeing = avg(wellbeingValues);
    if (wellbeing !== null) obs.push(`Tu promedio de bienestar en este período fue ${round(wellbeing)}/10.`);
    const sleep = avg(sleepValues);
    if (sleep !== null) obs.push(`Dormiste en promedio ${round(sleep)} horas por noche registrada.`);
    obs.push(`Se registraron efectos no deseados en ${adverseDays} día${adverseDays === 1 ? '' : 's'} de este período.`);
    return obs;
  }

  function renderHistoryView() {
    const records = getHistoryRecords().filter((record) => {
      const categoryMatch = historyFilter === 'Todos' || record.filter === historyFilter;
      const dateMatch = !historyDate || record.date === historyDate;
      return categoryMatch && dateMatch;
    });

    return `
      <section>
        <h2 class="screen-title">Historial</h2>
        <p class="screen-subtitle">Todos los registros ordenados desde el más reciente.</p>
      </section>
      <section class="card">
        <div class="filter-row" role="group" aria-label="Filtros de historial">
          ${['Todos', 'Check-in', 'Tomas', 'Omisiones', 'Tratamiento'].map((filter) => `<button class="chip-btn ${historyFilter === filter ? 'active' : ''}" type="button" data-filter="${filter}">${filter}</button>`).join('')}
        </div>
        <div class="form-row" style="margin-top:12px;">
          <label for="history-date">Filtrar por fecha</label>
          <div class="input-wrap"><input id="history-date" type="date" value="${escapeHTML(historyDate)}" /></div>
        </div>
        ${historyDate ? `<button class="ghost-btn" type="button" id="clear-history-date" style="margin-top:10px;">Quitar fecha</button>` : ''}
      </section>
      <section id="history-list">
        ${records.length ? records.map(renderHistoryCard).join('') : `
          <div class="empty-state card">
            <strong>Aún no hay registros.</strong>
            <p>Comenzá agregando tu primer seguimiento.</p>
            <button class="primary-btn" type="button" data-view="day">Crear primer registro</button>
          </div>
        `}
      </section>
    `;
  }

  function getHistoryRecords() {
    const checkins = state.checkins.map((item) => {
      const main = mainSymptomName();
      const value = symptomValue(item, main);
      return {
        id: item.id,
        source: 'checkin',
        filter: 'Check-in',
        date: item.date,
        time: item.time || '',
        category: 'Check-in diario',
        title: `${main}: ${value === null ? '—' : value + '/10'} · Bienestar ${item.wellbeing ?? '—'}/10`,
        description: `${item.sleepQuality || 'Sueño no registrado'} · ${item.usedCannabis === 'Sí' ? 'Usó tratamiento' : 'No usó tratamiento'}`,
        comment: item.comment || ''
      };
    });
    const intakes = state.intakes.map((item) => ({
      id: item.id,
      source: 'intake',
      filter: item.status === 'omitida' ? 'Omisiones' : 'Tomas',
      date: item.date,
      time: item.time || item.scheduledTime || '',
      category: item.status === 'omitida' ? 'Omisión' : 'Toma',
      title: `${item.scheduledTime || item.time || ''} · ${item.status}`,
      description: `${item.product || 'Producto no cargado'} · ${item.doseText || 'dosis registrada por el usuario'}`,
      comment: item.omissionReason || ''
    }));
    const changes = state.changes.map((item) => ({
      id: item.id,
      source: 'change',
      filter: 'Tratamiento',
      date: item.date,
      time: item.time || '',
      category: 'Cambio de tratamiento',
      title: item.description,
      description: item.reason || '',
      comment: item.comment || ''
    }));
    return [...checkins, ...intakes, ...changes].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  }

  function renderHistoryCard(record) {
    return `
      <article class="card history-card">
        <div class="history-top">
          <div>
            <span class="status-pill">${escapeHTML(record.category)}</span>
            <h3 class="section-title" style="margin:10px 0 4px;">${escapeHTML(record.title)}</h3>
            <p class="muted">${formatDate(record.date)} · ${escapeHTML(record.time || 'sin hora')}</p>
          </div>
        </div>
        <p>${escapeHTML(record.description)}</p>
        ${record.comment ? `<p class="muted">${escapeHTML(record.comment)}</p>` : ''}
        <div class="history-actions">
          <button class="small-btn" type="button" data-edit-record="${record.source}" data-id="${record.id}">Editar</button>
          <button class="small-btn danger" type="button" data-delete-record="${record.source}" data-id="${record.id}">Eliminar</button>
        </div>
      </article>
    `;
  }

  function bindHistoryView() {
    app.querySelectorAll('[data-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        historyFilter = button.dataset.filter;
        render();
      });
    });
    const date = app.querySelector('#history-date');
    if (date) date.addEventListener('change', () => { historyDate = date.value; render(); });
    const clear = app.querySelector('#clear-history-date');
    if (clear) clear.addEventListener('click', () => { historyDate = ''; render(); });

    app.querySelectorAll('[data-edit-record]').forEach((button) => {
      button.addEventListener('click', () => editRecord(button.dataset.editRecord, button.dataset.id));
    });
    app.querySelectorAll('[data-delete-record]').forEach((button) => {
      button.addEventListener('click', () => deleteRecord(button.dataset.deleteRecord, button.dataset.id));
    });
  }

  function editRecord(source, id) {
    if (source === 'checkin') return setView('day', { editCheckinId: id });
    if (source === 'intake') {
      const record = state.intakes.find((item) => item.id === id);
      if (!record) return showToast('Registro no encontrado.');
      const status = window.prompt('Editar estado: tomada u omitida', record.status) || record.status;
      if (!['tomada', 'omitida'].includes(status)) return showToast('Estado no válido.');
      const reason = status === 'omitida' ? (window.prompt('Motivo de omisión', record.omissionReason || '') || '') : '';
      record.status = status;
      record.omissionReason = reason;
      record.updatedAt = nowISO();
      saveState();
      showToast('Registro editado.');
      render();
    }
    if (source === 'change') {
      const record = state.changes.find((item) => item.id === id);
      if (!record) return showToast('Registro no encontrado.');
      const description = window.prompt('Qué cambió', record.description) || record.description;
      const comment = window.prompt('Comentario opcional', record.comment || '') || '';
      record.description = description;
      record.comment = comment;
      record.updatedAt = nowISO();
      saveState();
      showToast('Cambio editado.');
      render();
    }
  }

  function deleteRecord(source, id) {
    const ok = window.confirm('¿Querés eliminar este registro? Esta acción modificará tus resúmenes y gráficos.');
    if (!ok) return;
    if (source === 'checkin') state.checkins = state.checkins.filter((item) => item.id !== id);
    if (source === 'intake') state.intakes = state.intakes.filter((item) => item.id !== id);
    if (source === 'change') state.changes = state.changes.filter((item) => item.id !== id);
    saveState();
    showToast('Registro eliminado.');
    render();
  }


  function renderReportsView() {
    const range = getReportRange();
    const report = buildMedicalReport(range.start, range.end);
    return `
      <section class="no-print">
        <h2 class="screen-title">Reportes para mi médica</h2>
        <p class="screen-subtitle">Generá un resumen objetivo para evaluación semanal o mensual.</p>
      </section>

      <section class="card report-controls no-print">
        <h3 class="section-title" style="margin-top:0;">Configurar reporte</h3>
        <div class="form-grid">
          <div class="form-row">
            <label for="report-period">Período</label>
            <select id="report-period">
              <option value="7" ${reportPeriod === '7' ? 'selected' : ''}>Últimos 7 días</option>
              <option value="30" ${reportPeriod === '30' ? 'selected' : ''}>Últimos 30 días</option>
              <option value="all" ${reportPeriod === 'all' ? 'selected' : ''}>Todo el seguimiento</option>
              <option value="custom" ${reportPeriod === 'custom' ? 'selected' : ''}>Personalizado</option>
            </select>
          </div>
          <div class="two-col ${reportPeriod === 'custom' ? '' : 'hidden'}" id="custom-report-dates">
            <div class="form-row">
              <label for="report-start">Desde</label>
              <div class="input-wrap"><input id="report-start" type="date" value="${escapeHTML(range.start)}" /></div>
            </div>
            <div class="form-row">
              <label for="report-end">Hasta</label>
              <div class="input-wrap"><input id="report-end" type="date" value="${escapeHTML(range.end)}" /></div>
            </div>
          </div>
          <div class="form-row">
            <label for="report-doctor">Profesional destinataria/o</label>
            <input id="report-doctor" type="text" value="${escapeHTML(state.profile?.doctorName || 'Dra. María Belén Lucero')}" placeholder="Ej: Dra. María Belén Lucero" />
            <small class="muted">Este dato queda guardado en este dispositivo.</small>
          </div>
          <div class="actions-row">
            <button class="primary-btn" type="button" id="print-report">Imprimir / guardar como PDF</button>
            <button class="ghost-btn" type="button" id="download-report-txt">Descargar TXT</button>
            <button class="ghost-btn" type="button" id="download-report-json">Descargar JSON del período</button>
          </div>
        </div>
        <p class="muted">Para PDF: tocá “Imprimir / guardar como PDF” y elegí “Guardar como PDF” desde el navegador o el celular.</p>
      </section>

      <section class="report-sheet" id="medical-report">
        ${renderReportPreview(report)}
      </section>
    `;
  }

  function bindReportsView() {
    const period = app.querySelector('#report-period');
    const start = app.querySelector('#report-start');
    const end = app.querySelector('#report-end');
    const doctor = app.querySelector('#report-doctor');

    if (period) {
      period.addEventListener('change', () => {
        reportPeriod = period.value;
        if (reportPeriod === 'custom') {
          const range = getReportRange();
          reportCustomStart = reportCustomStart || range.start;
          reportCustomEnd = reportCustomEnd || range.end;
        }
        render();
      });
    }
    if (start) start.addEventListener('change', () => { reportCustomStart = start.value || reportCustomStart; render(); });
    if (end) end.addEventListener('change', () => { reportCustomEnd = end.value || reportCustomEnd; render(); });
    if (doctor) {
      doctor.addEventListener('change', () => {
        state.profile = { ...state.profile, doctorName: doctor.value.trim(), updatedAt: nowISO() };
        saveState();
        render();
      });
    }

    const print = app.querySelector('#print-report');
    if (print) print.addEventListener('click', () => {
      const doctorValue = app.querySelector('#report-doctor')?.value.trim() || '';
      state.profile = { ...state.profile, doctorName: doctorValue, updatedAt: nowISO() };
      saveState();
      window.setTimeout(() => window.print(), 80);
    });
    const txt = app.querySelector('#download-report-txt');
    if (txt) txt.addEventListener('click', downloadReportTXT);
    const json = app.querySelector('#download-report-json');
    if (json) json.addEventListener('click', downloadReportJSON);
  }

  function getReportRange() {
    const today = todayISO();
    if (reportPeriod === 'all') {
      const dates = [state.profile?.startDate, ...state.checkins.map((item) => item.date), ...state.intakes.map((item) => item.date), ...state.changes.map((item) => item.date)].filter(Boolean).sort();
      return { start: dates[0] || today, end: today, label: 'Todo el seguimiento' };
    }
    if (reportPeriod === 'custom') {
      const fallbackStart = addDays(today, -29);
      const start = reportCustomStart || fallbackStart;
      const end = reportCustomEnd || today;
      return start <= end ? { start, end, label: 'Período personalizado' } : { start: end, end: start, label: 'Período personalizado' };
    }
    const days = Number(reportPeriod || 30);
    return { start: addDays(today, -(days - 1)), end: today, label: `Últimos ${days} días` };
  }

  function recordsBetween(items, start, end) {
    return (items || []).filter((item) => item.date >= start && item.date <= end).sort((a, b) => `${a.date}T${a.time || a.scheduledTime || ''}`.localeCompare(`${b.date}T${b.time || b.scheduledTime || ''}`));
  }

  function datesBetween(start, end) {
    const result = [];
    let date = start;
    while (date <= end && result.length < 370) {
      result.push(date);
      date = addDays(date, 1);
    }
    return result;
  }

  function buildMedicalReport(start, end) {
    const profile = state.profile || {};
    const treatment = state.treatment || {};
    const checkins = recordsBetween(state.checkins, start, end);
    const intakes = recordsBetween(state.intakes, start, end);
    const changes = recordsBetween(state.changes, start, end);
    const days = datesBetween(start, end);
    const mainSymptom = mainSymptomName();
    const symptomValues = checkins.map((item) => symptomValue(item, mainSymptom)).filter((item) => item !== null);
    const wellbeingValues = checkins.map((item) => item.wellbeing).filter((item) => item !== null && item !== undefined);
    const sleepValues = checkins.map((item) => item.sleepHours).filter((item) => item !== null && item !== undefined);
    const adverseDays = checkins.filter(hasAdverse).length;
    const useDays = checkins.filter((item) => item.usedCannabis === 'Sí').length;
    const noUseDays = checkins.filter((item) => item.usedCannabis === 'No').length;
    const taken = intakes.filter((item) => item.status === 'tomada').length;
    const omitted = intakes.filter((item) => item.status === 'omitida').length;
    const pending = intakes.filter((item) => item.status === 'pendiente').length;
    const adherence = adherenceForDateRange(start, end);
    const periodLabel = reportPeriod === 'custom' ? `${formatDate(start)} a ${formatDate(end)}` : getReportRange().label;
    return { profile, treatment, checkins, intakes, changes, days, start, end, periodLabel, mainSymptom, symptomValues, wellbeingValues, sleepValues, adverseDays, useDays, noUseDays, taken, omitted, pending, adherence };
  }

  function adherenceForDateRange(start, end) {
    const schedules = activeSchedules();
    if (!schedules.length) return null;
    let total = 0;
    let taken = 0;
    datesBetween(start, end).forEach((date) => {
      schedules.forEach((schedule) => {
        total += 1;
        const intake = findIntake(date, schedule.id);
        if (intake?.status === 'tomada') taken += 1;
      });
    });
    return total ? Math.round((taken / total) * 100) : null;
  }

  function hasAdverse(checkin) {
    return Boolean(checkin?.adverseEffects?.length && !checkin.adverseEffects.includes('Ninguno'));
  }

  function renderReportPreview(report) {
    const symptomAvg = avg(report.symptomValues);
    const wellbeingAvg = avg(report.wellbeingValues);
    const sleepAvg = avg(report.sleepValues);
    const coverage = report.days.length ? Math.round((report.checkins.length / report.days.length) * 100) : 0;
    const doctorName = state.profile?.doctorName || 'Dra. María Belén Lucero';
    const rows = report.checkins.slice(-31).map((item) => {
      const symptomText = (item.symptoms || []).map((s) => `${s.name}: ${s.value}/10`).join(', ') || 'Sin síntomas';
      const adverse = hasAdverse(item) ? item.adverseEffects.filter((a) => a !== 'Ninguno').join(', ') + (item.adverseIntensity ? ` (${item.adverseIntensity})` : '') : 'No';
      return `
        <tr>
          <td>${escapeHTML(formatDate(item.date))}</td>
          <td>${escapeHTML(symptomText)}</td>
          <td>${escapeHTML(item.sleepHours || '—')} h · ${escapeHTML(item.sleepQuality || '—')}</td>
          <td>${escapeHTML(item.wellbeing ?? '—')}/10</td>
          <td>${escapeHTML(item.usedCannabis || '—')}${item.perceivedEffect ? ` · ${escapeHTML(item.perceivedEffect)}` : ''}</td>
          <td>${escapeHTML(adverse)}</td>
        </tr>`;
    }).join('');

    return `
      <div class="report-title-block">
        <p class="report-kicker">Reporte para evaluación médica</p>
        <h2>Seguimiento de cannabis medicinal</h2>
        <p>Destinataria/o: <strong>${escapeHTML(doctorName)}</strong></p>
        <p>Generado el ${longDate(todayISO())} · Período: ${escapeHTML(report.periodLabel)} (${escapeHTML(report.start)} a ${escapeHTML(report.end)})</p>
      </div>

      <div class="report-disclaimer">
        Este reporte organiza datos ingresados por el paciente. No constituye diagnóstico, indicación médica ni recomendación de dosis. Debe ser interpretado por la/el profesional tratante en contexto clínico.
      </div>

      <div class="report-section">
        <h3>1. Perfil de seguimiento</h3>
        <dl class="report-dl">
          <div><dt>Paciente</dt><dd>${escapeHTML(report.profile.nickname || 'Sin completar')}</dd></div>
          <div><dt>Motivo principal</dt><dd>${escapeHTML(report.profile.mainReason || 'Sin completar')}</dd></div>
          <div><dt>Síntomas observados</dt><dd>${escapeHTML((report.profile.symptoms || []).join(', ') || 'Sin completar')}</dd></div>
          <div><dt>Inicio del seguimiento</dt><dd>${escapeHTML(report.profile.startDate || 'Sin completar')}</dd></div>
        </dl>
      </div>

      <div class="report-section">
        <h3>2. Tratamiento registrado por el paciente</h3>
        <dl class="report-dl">
          <div><dt>Producto</dt><dd>${escapeHTML(report.treatment.product || 'Sin completar')}</dd></div>
          <div><dt>Tipo</dt><dd>${escapeHTML(report.treatment.type || 'Sin completar')}</dd></div>
          <div><dt>Predominancia declarada</dt><dd>${escapeHTML(report.treatment.predominance || 'Sin completar')}</dd></div>
          <div><dt>Relación THC:CBD</dt><dd>${escapeHTML(report.treatment.ratio || 'No informada')}</dd></div>
          <div><dt>Concentración</dt><dd>${escapeHTML(report.treatment.concentration || 'No informada')}</dd></div>
          <div><dt>Horarios activos</dt><dd>${escapeHTML(activeSchedules().map((item) => `${item.time} (${item.dose || 'sin dosis escrita'})`).join('; ') || 'Sin horarios activos')}</dd></div>
        </dl>
      </div>

      <div class="report-section">
        <h3>3. Resumen del período</h3>
        <div class="report-metrics">
          <div><span>${report.checkins.length}/${report.days.length}</span><small>días registrados</small></div>
          <div><span>${coverage}%</span><small>cobertura del período</small></div>
          <div><span>${symptomAvg === null ? '—' : `${round(symptomAvg)}/10`}</span><small>promedio ${escapeHTML(report.mainSymptom)}</small></div>
          <div><span>${wellbeingAvg === null ? '—' : `${round(wellbeingAvg)}/10`}</span><small>promedio bienestar</small></div>
          <div><span>${sleepAvg === null ? '—' : `${round(sleepAvg)} h`}</span><small>promedio sueño</small></div>
          <div><span>${report.adherence === null ? '—' : `${report.adherence}%`}</span><small>adherencia registrada</small></div>
          <div><span>${report.adverseDays}</span><small>días con efectos no deseados</small></div>
          <div><span>${report.taken}/${report.omitted}</span><small>tomas/omisiones</small></div>
        </div>
      </div>

      <div class="report-section">
        <h3>4. Observaciones objetivas</h3>
        <ul>
          ${reportObservations(report, symptomAvg, wellbeingAvg, sleepAvg, coverage).map((item) => `<li>${escapeHTML(item)}</li>`).join('')}
        </ul>
      </div>

      <div class="report-section">
        <h3>5. Check-ins diarios ${report.checkins.length > 31 ? '(últimos 31 registros del período)' : ''}</h3>
        ${report.checkins.length ? `<div class="table-wrap"><table class="report-table"><thead><tr><th>Fecha</th><th>Síntomas</th><th>Sueño</th><th>Bienestar</th><th>Uso registrado</th><th>Efectos no deseados</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p>Sin check-ins en este período.</p>'}
      </div>

      <div class="report-section">
        <h3>6. Cambios de tratamiento en el período</h3>
        ${report.changes.length ? `<ul>${report.changes.map((item) => `<li>${escapeHTML(item.date)}: ${escapeHTML(item.description || '')}. Motivo: ${escapeHTML(item.reason || 'sin motivo')}. ${item.comment ? `Comentario: ${escapeHTML(item.comment)}` : ''}</li>`).join('')}</ul>` : '<p>Sin cambios registrados en este período.</p>'}
      </div>
    `;
  }

  function reportObservations(report, symptomAvg, wellbeingAvg, sleepAvg, coverage) {
    const lines = [];
    lines.push(`Se registraron ${report.checkins.length} check-ins sobre ${report.days.length} días del período (${coverage}% de cobertura).`);
    lines.push(symptomAvg === null ? `No hay datos suficientes para calcular promedio de ${report.mainSymptom}.` : `El promedio de ${report.mainSymptom} fue ${round(symptomAvg)}/10.`);
    lines.push(report.wellbeingValues.length ? `El promedio de bienestar general fue ${round(wellbeingAvg)}/10.` : 'No hay datos suficientes de bienestar general.');
    lines.push(report.sleepValues.length ? `El sueño promedio registrado fue ${round(sleepAvg)} horas.` : 'No hay datos suficientes de sueño.');
    lines.push(`Se registraron efectos no deseados en ${report.adverseDays} día(s) del período.`);
    lines.push(`Uso de cannabis medicinal registrado en ${report.useDays} día(s); no uso registrado en ${report.noUseDays} día(s).`);
    lines.push(report.adherence === null ? 'No hay horarios activos suficientes para calcular adherencia.' : `La adherencia registrada para horarios activos fue ${report.adherence}%.`);
    return lines;
  }

  function reportToLines(report) {
    const symptomAvg = avg(report.symptomValues);
    const wellbeingAvg = avg(report.wellbeingValues);
    const sleepAvg = avg(report.sleepValues);
    const coverage = report.days.length ? Math.round((report.checkins.length / report.days.length) * 100) : 0;
    const doctorName = state.profile?.doctorName || 'Dra. María Belén Lucero';
    return [
      'REPORTE PARA EVALUACIÓN MÉDICA',
      'Seguimiento de cannabis medicinal',
      `Destinataria/o: ${doctorName}`,
      `Generado: ${longDate(todayISO())}`,
      `Período: ${report.periodLabel} (${report.start} a ${report.end})`,
      '',
      'Aviso: este reporte organiza datos ingresados por el paciente. No constituye diagnóstico, indicación médica ni recomendación de dosis.',
      '',
      'PERFIL',
      `Paciente: ${report.profile.nickname || 'Sin completar'}`,
      `Motivo principal: ${report.profile.mainReason || 'Sin completar'}`,
      `Síntomas observados: ${(report.profile.symptoms || []).join(', ') || 'Sin completar'}`,
      `Inicio del seguimiento: ${report.profile.startDate || 'Sin completar'}`,
      '',
      'TRATAMIENTO REGISTRADO POR EL PACIENTE',
      `Producto: ${report.treatment.product || 'Sin completar'}`,
      `Tipo: ${report.treatment.type || 'Sin completar'}`,
      `Predominancia declarada: ${report.treatment.predominance || 'Sin completar'}`,
      `Relación THC:CBD: ${report.treatment.ratio || 'No informada'}`,
      `Concentración: ${report.treatment.concentration || 'No informada'}`,
      `Horarios activos: ${activeSchedules().map((item) => `${item.time} (${item.dose || 'sin dosis escrita'})`).join('; ') || 'Sin horarios activos'}`,
      '',
      'RESUMEN DEL PERÍODO',
      `Días registrados: ${report.checkins.length}/${report.days.length} (${coverage}%)`,
      `Promedio ${report.mainSymptom}: ${symptomAvg === null ? 'Sin datos' : `${round(symptomAvg)}/10`}`,
      `Promedio bienestar: ${wellbeingAvg === null ? 'Sin datos' : `${round(wellbeingAvg)}/10`}`,
      `Promedio sueño: ${sleepAvg === null ? 'Sin datos' : `${round(sleepAvg)} horas`}`,
      `Adherencia registrada: ${report.adherence === null ? 'Sin datos' : `${report.adherence}%`}`,
      `Días con efectos no deseados: ${report.adverseDays}`,
      `Tomas registradas como tomadas: ${report.taken}`,
      `Tomas registradas como omitidas: ${report.omitted}`,
      '',
      'OBSERVACIONES OBJETIVAS',
      ...reportObservations(report, symptomAvg, wellbeingAvg, sleepAvg, coverage),
      '',
      'CHECK-INS DEL PERÍODO',
      ...(report.checkins.length ? report.checkins.map((item) => {
        const symptomText = (item.symptoms || []).map((symptom) => `${symptom.name}: ${symptom.value}/10`).join(', ');
        const adverse = hasAdverse(item) ? item.adverseEffects.filter((a) => a !== 'Ninguno').join(', ') + (item.adverseIntensity ? ` (${item.adverseIntensity})` : '') : 'No';
        return `${item.date}: ${symptomText || 'sin síntomas'} | sueño ${item.sleepHours || '—'} h (${item.sleepQuality || '—'}) | bienestar ${item.wellbeing ?? '—'}/10 | cannabis: ${item.usedCannabis || '—'} | efecto: ${item.perceivedEffect || '—'} | efectos no deseados: ${adverse} | comentario: ${item.comment || 'sin comentario'}`;
      }) : ['Sin check-ins en este período.']),
      '',
      'CAMBIOS DE TRATAMIENTO EN EL PERÍODO',
      ...(report.changes.length ? report.changes.map((item) => `${item.date}: ${item.description || ''} | motivo: ${item.reason || 'sin motivo'} | comentario: ${item.comment || 'sin comentario'}`) : ['Sin cambios registrados en este período.'])
    ];
  }

  function downloadReportTXT() {
    const range = getReportRange();
    const report = buildMedicalReport(range.start, range.end);
    const blob = new Blob([reportToLines(report).join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-medico-${range.start}-a-${range.end}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Reporte TXT descargado.');
  }

  function downloadReportJSON() {
    const range = getReportRange();
    const report = buildMedicalReport(range.start, range.end);
    const payload = {
      generatedAt: nowISO(),
      notice: 'Datos ingresados por el paciente. No constituye diagnóstico ni indicación médica.',
      period: { start: range.start, end: range.end, label: report.periodLabel },
      profile: report.profile,
      treatment: report.treatment,
      checkins: report.checkins,
      intakes: report.intakes,
      changes: report.changes
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-medico-${range.start}-a-${range.end}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('JSON del período descargado.');
  }

  function renderSettingsView() {
    const profile = state.profile;
    const selected = profile.symptoms || [];
    return `
      <section>
        <h2 class="screen-title">Configuración</h2>
        <p class="screen-subtitle">Ajustes del registro personal y gestión de datos locales.</p>
      </section>

      <section class="card">
        <h3 class="section-title" style="margin-top:0;">Perfil del paciente</h3>
        <div class="form-grid">
          <div class="form-row"><label for="set-nickname">Apodo</label><input id="set-nickname" type="text" value="${escapeHTML(profile.nickname || '')}" /></div>
          <div class="form-row"><label for="set-start">Fecha de inicio</label><div class="input-wrap"><input id="set-start" type="date" value="${escapeHTML(profile.startDate || todayISO())}" /></div></div>
          <div class="form-row"><label for="set-reason">Motivo principal</label><select id="set-reason">${optionHTML(reasons, profile.mainReason || 'Bienestar general')}</select></div>
          <fieldset class="form-row" style="border:0;margin:0;padding:0;">
            <legend class="form-label">Síntomas seleccionados <span class="muted">(hasta ${MAX_SYMPTOMS})</span></legend>
            <div class="check-list">${checkboxHTML('settings-symptom', symptomOptions, selected)}</div>
          </fieldset>
          <button class="primary-btn" type="button" id="save-settings-profile">Guardar perfil</button>
        </div>
      </section>

      <section class="notice-card">
        <h3 class="section-title" style="margin-top:0;">Avisos importantes</h3>
        <p><strong>Uso con pacientes:</strong> Esta versión está pensada como registro personal en el dispositivo del paciente. Usá apodo o iniciales y no ingreses DNI, domicilio, fotos de estudios ni información que identifique directamente a la persona.</p>
        <p><strong>Privacidad:</strong> Los datos se guardan únicamente en este dispositivo. No se envían automáticamente a ningún profesional, ONG, servidor ni nube. El paciente puede exportar un resumen si decide compartirlo.</p>
        <p><strong>Salud:</strong> Esta aplicación organiza información ingresada por el usuario. No brinda diagnósticos, no indica tratamientos, no recomienda dosis y no reemplaza el seguimiento médico. Ante síntomas intensos o una urgencia, contactar al profesional tratante o al servicio de emergencias local.</p>
      </section>

      <section class="card">
        <h3 class="section-title" style="margin-top:0;">Datos</h3>
        <div class="form-grid">
          <button class="secondary-btn" type="button" id="load-demo">Cargar datos de ejemplo</button>
          <button class="ghost-btn" type="button" id="delete-demo">Eliminar datos de ejemplo</button>
          <button class="secondary-btn" type="button" data-view="reports">Generar reporte médico imprimible</button>
          <button class="ghost-btn" type="button" id="export-summary">Descargar resumen TXT rápido</button>
          <button class="ghost-btn" type="button" id="export-json">Exportar copia JSON</button>
          <label class="ghost-btn" for="import-json" style="cursor:pointer;">Importar copia JSON</label>
          <input id="import-json" type="file" accept="application/json,.json" class="hidden" />
          <button class="danger-btn" type="button" id="clear-data">Borrar todos los datos</button>
          <button class="danger-btn" type="button" id="reset-app">Reiniciar aplicación</button>
        </div>
        <p class="muted">Los datos se guardan en localStorage del navegador del paciente. Esta versión no centraliza datos, no tiene cuentas y no reemplaza una historia clínica electrónica segura.</p>
      </section>
    `;
  }

  function bindSettingsView() {
    const symptomBoxes = [...app.querySelectorAll('input[name="settings-symptom"]')];
    symptomBoxes.forEach((box) => {
      box.addEventListener('change', () => {
        if (symptomBoxes.filter((item) => item.checked).length > MAX_SYMPTOMS) {
          box.checked = false;
          showToast(`Podés elegir hasta ${MAX_SYMPTOMS} síntomas.`);
        }
      });
    });
    app.querySelector('#save-settings-profile').addEventListener('click', () => {
      const nickname = app.querySelector('#set-nickname').value.trim();
      const symptoms = symptomBoxes.filter((item) => item.checked).map((item) => item.value).slice(0, MAX_SYMPTOMS);
      if (!nickname) return showToast('Ingresá un apodo.');
      if (!symptoms.length) return showToast('Seleccioná al menos un síntoma.');
      state.profile = {
        ...state.profile,
        nickname,
        startDate: app.querySelector('#set-start').value || todayISO(),
        mainReason: app.querySelector('#set-reason').value,
        symptoms,
        updatedAt: nowISO()
      };
      saveState();
      showToast('Perfil guardado.');
      render();
    });
    app.querySelector('#load-demo').addEventListener('click', () => {
      if (state.checkins.length || state.intakes.length || state.changes.length) {
        if (!window.confirm('Esto reemplazará los datos actuales por datos de ejemplo. ¿Continuar?')) return;
      }
      state = createDemoState();
      saveState();
      currentView = 'home';
      render();
      showToast('Datos de ejemplo cargados.');
    });
    app.querySelector('#delete-demo').addEventListener('click', () => {
      if (!window.confirm('¿Querés eliminar los datos de ejemplo?')) return;
      removeDemoData();
    });
    app.querySelector('#clear-data').addEventListener('click', () => {
      if (!window.confirm('Esta acción eliminará todos los registros guardados en este dispositivo y no podrá deshacerse.')) return;
      state = { ...defaultState(), profile: state.profile, treatment: blankTreatment() };
      saveState();
      currentView = 'home';
      showToast('Registros borrados.');
      render();
    });
    app.querySelector('#reset-app').addEventListener('click', () => {
      if (!window.confirm('Esta acción reiniciará toda la aplicación y no podrá deshacerse.')) return;
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      currentView = 'home';
      render();
    });
    app.querySelector('#export-summary').addEventListener('click', exportSummaryReport);
    app.querySelector('#export-json').addEventListener('click', exportJSON);
    app.querySelector('#import-json').addEventListener('change', importJSON);
  }


  function exportSummaryReport() {
    const previousPeriod = reportPeriod;
    reportPeriod = '14';
    downloadReportTXT();
    reportPeriod = previousPeriod;
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seguimiento-cannabis-paciente-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Copia JSON exportada.');
  }

  function importJSON(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result));
        const migrated = migrateState(imported);
        if (!migrated.profile || !Array.isArray(migrated.checkins) || !Array.isArray(migrated.intakes)) throw new Error('Estructura incompatible');
        state = migrated;
        saveState();
        currentView = 'home';
        render();
        showToast('Copia JSON importada.');
      } catch (error) {
        console.error(error);
        showToast('El archivo JSON no tiene una estructura compatible.');
      }
    };
    reader.readAsText(file);
  }

  function removeDemoData() {
    state.checkins = state.checkins.filter((item) => !item.isDemo);
    state.intakes = state.intakes.filter((item) => !item.isDemo);
    state.changes = state.changes.filter((item) => !item.isDemo);
    if (state.profile?.isDemo) state.profile = null;
    if (state.treatment?.isDemo) state.treatment = blankTreatment();
    state.demoLoaded = false;
    saveState();
    currentView = 'home';
    render();
    showToast('Datos de ejemplo eliminados.');
  }

  function bindCurrentView() {
    switch (currentView) {
      case 'day': bindDayView(); break;
      case 'treatment': bindTreatmentView(); break;
      case 'evolution': bindEvolutionView(); break;
      case 'history': bindHistoryView(); break;
      case 'reports': bindReportsView(); break;
      case 'settings': bindSettingsView(); break;
      default: bindHomeView(); break;
    }
  }

  function optionHTML(options, selected) {
    return options.map((item) => `<option value="${escapeHTML(item)}" ${item === selected ? 'selected' : ''}>${escapeHTML(item)}</option>`).join('');
  }

  function checkboxHTML(name, options, selected = []) {
    return options.map((item, index) => {
      const id = `${name}-${slug(item)}-${index}`;
      return `
        <label class="check-item" for="${id}">
          <input id="${id}" type="checkbox" name="${name}" value="${escapeHTML(item)}" ${selected.includes(item) ? 'checked' : ''} />
          <span>${escapeHTML(item)}</span>
        </label>
      `;
    }).join('');
  }

  function slug(text) {
    return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'x';
  }

  function calculateStreak() {
    const dates = new Set(state.checkins.map((item) => item.date));
    let streak = 0;
    let date = todayISO();
    while (dates.has(date)) {
      streak += 1;
      date = addDays(date, -1);
    }
    return streak;
  }

  function createDemoState() {
    const start = daysAgo(13);
    const demo = defaultState();
    demo.profile = {
      nickname: 'Paciente Demo',
      startDate: start,
      mainReason: 'Dolor y sueño',
      symptoms: ['Dolor', 'Sueño', 'Bienestar general'],
      acceptedDemo: true,
      acceptedHealth: true,
      isDemo: true,
      createdAt: nowISO(),
      updatedAt: nowISO()
    };
    const schedules = [
      { id: uid('sch'), time: '08:30', dose: '2 gotas', active: true },
      { id: uid('sch'), time: '15:30', dose: '1 gota', active: true },
      { id: uid('sch'), time: '22:00', dose: '2 gotas', active: true },
      { id: uid('sch'), time: '', dose: '', active: false }
    ];
    demo.treatment = {
      id: uid('treat'),
      product: 'Aceite balanceado ficticio',
      type: 'Aceite',
      predominance: 'Balanceado',
      ratio: '1:1 demo',
      concentration: 'Información ficticia',
      maker: 'Elaborador demo',
      startDate: start,
      schedules,
      active: true,
      notes: 'Producto de ejemplo para explorar la app. No usar como indicación real.',
      createdAt: nowISO(),
      updatedAt: nowISO(),
      isDemo: true
    };

    for (let i = 0; i < 14; i++) {
      const date = addDays(start, i);
      const pain = Math.max(2, 8 - Math.floor(i / 3) + (i % 3 === 0 ? 1 : 0));
      const sleepSymptom = Math.max(2, 7 - Math.floor(i / 4));
      const wellbeing = Math.min(8, 4 + Math.floor(i / 3));
      const adverse = i === 3 || i === 9 ? ['Boca seca'] : ['Ninguno'];
      demo.checkins.push({
        id: uid('chk'),
        category: 'checkin',
        date,
        time: '21:30',
        symptoms: [
          { name: 'Dolor', value: pain },
          { name: 'Sueño', value: sleepSymptom },
          { name: 'Bienestar general', value: wellbeing }
        ],
        sleepQuality: i < 3 ? 'Regular' : i < 9 ? 'Bien' : 'Muy bien',
        sleepHours: Number((5.5 + Math.min(i, 8) * 0.18).toFixed(1)),
        awakenings: i < 5 ? '3' : i < 10 ? '2' : '1',
        energy: i < 5 ? 'Baja' : 'Media',
        mood: i < 4 ? 'Neutral' : 'Bueno',
        wellbeing,
        functionality: i < 4 ? 'Sí, con alguna dificultad' : 'Sí, sin dificultad',
        activities: i % 2 === 0 ? ['Caminé o me movilicé', 'Realicé tareas del hogar'] : ['Trabajé o estudié', 'Disfruté alguna actividad'],
        usedCannabis: i === 6 ? 'No' : 'Sí',
        productUsed: i === 6 ? '' : 'Aceite balanceado ficticio',
        route: i === 6 ? '' : 'Sublingual',
        doseCount: i === 6 ? '' : '3',
        doseText: i === 6 ? '' : 'Registro de ejemplo según horarios',
        perceivedEffect: i === 6 ? '' : (i < 5 ? 'Efecto leve' : 'Efecto moderado'),
        noUseReason: i === 6 ? 'Me olvidé' : '',
        adverseEffects: adverse,
        adverseIntensity: adverse.includes('Ninguno') ? '' : 'Leve',
        comment: i === 2 ? 'Día con más tensión y poco descanso. Comentario ficticio.' : (i === 10 ? 'Se registró mejor descanso. Comentario ficticio.' : ''),
        createdAt: nowISO(),
        updatedAt: nowISO(),
        isDemo: true
      });

      schedules.filter((item) => item.active).forEach((schedule, idx) => {
        const omit = (i === 5 && idx === 1) || (i === 10 && idx === 0);
        demo.intakes.push({
          id: uid('dose'),
          category: 'intake',
          date,
          time: schedule.time,
          scheduledTime: schedule.time,
          scheduleId: schedule.id,
          product: 'Aceite balanceado ficticio',
          doseText: schedule.dose,
          status: omit ? 'omitida' : 'tomada',
          omissionReason: omit ? 'Me olvidé' : '',
          createdAt: nowISO(),
          updatedAt: nowISO(),
          isDemo: true
        });
      });
    }

    demo.changes.push({
      id: uid('chg'),
      category: 'treatment-change',
      date: addDays(start, 7),
      time: '10:00',
      description: 'Ajuste ficticio de horario nocturno',
      reason: 'Indicación profesional',
      comment: 'Cambio de ejemplo para visualizar el historial. No es una recomendación.',
      createdAt: nowISO(),
      updatedAt: nowISO(),
      isDemo: true
    });
    demo.demoLoaded = true;
    return demo;
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch((error) => {
        console.info('Service worker no registrado en este entorno:', error?.message || error);
      });
    });
  }

  render();
})();
