// Robô de Vagas 24/7 - 100% Standalone (Client-Side para platform/robovagas)
// Equipado com bypass de CORS automático e múltiplos feeds globais (Arbeitnow, Remotive, RemoteOK, Jobicy).

const DEFAULT_PROFILE = {
  name: "Rudge Santana",
  headline: "Power BI Developer | Data Engineer | Data Scientist",
  email: "contato@8april.com.br",
  phone: "+55 34 99109-4313",
  location: "Brazil (Remote Worldwide)",
  linkedin: "https://linkedin.com/in/rudgesantana",
  github: "https://github.com/8apriltech",
  salary: "$4,500 - $6,500 USD / mo (B2B Contractor / W-8BEN)",
  english: "C2 Proficient / Fluent (EF SET C2 & TOEFL 648)",
  skills: "Power BI, DAX, Power Query (M), SQL Server, Data Modeling, ETL / Pipelines, SSIS / SSAS, Data Warehouse, Python, Snowflake, Automation (n8n), REST APIs, M365 Ecosystem",
  certifications: "Data Engineering (Turing), C2 Proficiency (EF SET), CS & Python (MITx), TOEFL ITP (ETS)"
};

const DEFAULT_SETTINGS = {
  botActive: true,
  minMatch: 55,
  scanIntervalMins: 15,
  keywords: "Power BI, Data Engineer, Business Intelligence, DAX, Python, Data Scientist, Analytics Engineer, ETL, SQL Server, Snowflake"
};

let appState = {
  profile: {},
  settings: {},
  jobs: [],
  filteredJobs: [],
  logs: [],
  stats: {
    scannedLastHour: 0,
    totalMatched: 0,
    totalApplied: 0,
    totalResponses: 0,
    scanHistory: []
  },
  timerId: null
};

// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  loadStoredData();
  renderProfileUI();
  renderSettingsUI();
  updateStatsDisplay();
  filterJobs();
  renderLogsUI();

  // Executa busca real imediatamente ao abrir
  triggerScan(true);

  // Inicia o timer do robô 24/7
  startBotScheduler();
});

// STORAGE
function loadStoredData() {
  const savedProfile = localStorage.getItem("robovagas_profile");
  appState.profile = savedProfile ? JSON.parse(savedProfile) : { ...DEFAULT_PROFILE };

  const savedSettings = localStorage.getItem("robovagas_settings");
  appState.settings = savedSettings ? JSON.parse(savedSettings) : { ...DEFAULT_SETTINGS };

  const savedJobs = localStorage.getItem("robovagas_jobs");
  appState.jobs = savedJobs ? JSON.parse(savedJobs) : [];

  const savedStats = localStorage.getItem("robovagas_stats");
  if (savedStats) appState.stats = JSON.parse(savedStats);

  const savedLogs = localStorage.getItem("robovagas_logs");
  appState.logs = savedLogs ? JSON.parse(savedLogs) : [];
}

function persistState() {
  localStorage.setItem("robovagas_profile", JSON.stringify(appState.profile));
  localStorage.setItem("robovagas_settings", JSON.stringify(appState.settings));
  localStorage.setItem("robovagas_jobs", JSON.stringify(appState.jobs));
  localStorage.setItem("robovagas_stats", JSON.stringify(appState.stats));
  localStorage.setItem("robovagas_logs", JSON.stringify(appState.logs.slice(0, 80)));
}

// LOGGING
function addLog(message, type = "info") {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-BR');
  const entry = { time: timeStr, text: message, type };
  appState.logs.unshift(entry);
  if (appState.logs.length > 60) appState.logs.pop();
  renderLogsUI();
  persistState();
}

function renderLogsUI() {
  const container = document.getElementById("log-stream");
  if (!container) return;

  if (appState.logs.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted);">Aguardando início dos processos...</div>`;
    return;
  }

  container.innerHTML = appState.logs.map(l => `
    <div class="log-entry">
      <span class="log-time">[${l.time}]</span>
      <span class="log-status-${l.type}">[${l.type.toUpperCase()}]</span>
      <span>${l.text}</span>
    </div>
  `).join('');
}

// MATCHING ENGINE (RODANDO NO BROWSER)
function calculateMatchScore(jobTitle, jobDesc, jobTags, jobLoc) {
  const fullText = `${jobTitle} ${jobDesc} ${(jobTags || []).join(' ')} ${jobLoc}`.toLowerCase();
  
  // Desqualificadores restritivos
  const disqualifiers = ["us citizenship required", "security clearance required", "must reside in uk", "on-site only", "hybrid in new york"];
  for (const dis of disqualifiers) {
    if (fullText.includes(dis)) {
      return { score: 20, reason: `Desqualificado por requisito restritivo (${dis})` };
    }
  }

  let score = 25; // Base
  let matches = [];

  // Título
  const titleLower = (jobTitle || "").toLowerCase();
  if (/power bi|bi developer|data engineer|analytics engineer|business intelligence/.test(titleLower)) {
    score += 25;
    matches.push("Cargo Alvo");
  } else if (/python|data scientist|etl|sql|data analyst|engineer/.test(titleLower)) {
    score += 15;
    matches.push("Área de Dados / Eng");
  }

  // Hard skills primárias
  const primarySkills = {
    "power bi": 20, "dax": 18, "power query": 15, "data engineer": 20,
    "sql": 15, "etl": 15, "python": 15, "data warehouse": 15, "data modeling": 15
  };
  for (const [kw, weight] of Object.entries(primarySkills)) {
    if (fullText.includes(kw)) {
      score += weight;
      if (matches.length < 5) matches.push(kw.toUpperCase());
    }
  }

  // Hard skills secundárias
  const secondarySkills = {
    "snowflake": 10, "ssis": 10, "sql server": 10, "n8n": 8, "rest api": 8,
    "tableau": 6, "looker": 6, "aws": 6, "azure": 8, "llm": 10, "prompt engineering": 8
  };
  for (const [kw, weight] of Object.entries(secondarySkills)) {
    if (fullText.includes(kw)) {
      score += weight;
      if (matches.length < 8) matches.push(kw.toUpperCase());
    }
  }

  // Localidade remota
  if (/worldwide|anywhere|remote|latam|global|americas/.test(fullText)) {
    score += 10;
  }

  score = Math.min(Math.max(score, 15), 98);
  const reason = `Match de ${score}% baseado em: ${matches.slice(0, 6).join(', ')}.`;
  return { score, reason };
}

// HELPER COM PROXY DE CORS INTELIGENTE
async function fetchWithCORS(url) {
  // Tentativa 1: Requisição direta
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (res.ok) return await res.json();
  } catch (e) {
    // Ignora e tenta via proxy de CORS
  }

  // Tentativa 2: Via AllOrigins Proxy
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res2 = await fetch(proxyUrl);
    if (res2.ok) {
      const wrapper = await res2.json();
      return JSON.parse(wrapper.contents);
    }
  } catch (e2) {
    // Ignora e tenta via CorsProxy
  }

  // Tentativa 3: Via CorsProxy.io
  try {
    const res3 = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
    if (res3.ok) return await res3.json();
  } catch (e3) {
    console.warn("Todos os canais de CORS falharam para:", url);
  }

  return null;
}

// REAL LIVE MULTI-SOURCE HARVESTER
async function fetchLiveJobFeeds() {
  const fetchedJobs = [];

  // FONTE 1: Arbeitnow (API global com CORS liberado nativamente - 100+ vagas)
  try {
    addLog("[Fonte 1/4] Consultando Arbeitnow Tech Jobs...", "info");
    const res = await fetch("https://www.arbeitnow.com/api/job-board-api");
    if (res.ok) {
      const data = await res.json();
      const raw = data.data || [];
      let count = 0;
      raw.forEach(j => {
        fetchedJobs.push({
          id: `arbeitnow_${j.slug}`,
          title: j.title,
          company: j.company_name,
          location: j.remote ? "Remote (Worldwide)" : (j.location || "Remote"),
          url: j.url,
          source: "Arbeitnow",
          description: (j.description || "").replace(/<[^>]+>/g, ' '),
          salary: "Competitive USD",
          tags: j.tags || ["Data", "Tech"],
          created_at: new Date(j.created_at * 1000).toLocaleDateString('pt-BR')
        });
        count++;
      });
      addLog(`[Arbeitnow] Sucesso: ${count} vagas coletadas.`, "success");
    }
  } catch (e) {
    console.warn("Arbeitnow error:", e);
  }

  // FONTE 2: Remotive API (Data & Software)
  try {
    addLog("[Fonte 2/4] Consultando Remotive API...", "info");
    const data = await fetchWithCORS("https://remotive.com/api/remote-jobs?category=data&limit=40");
    if (data && data.jobs) {
      data.jobs.forEach(j => {
        fetchedJobs.push({
          id: `remotive_${j.id}`,
          title: j.title,
          company: j.company_name,
          location: j.candidate_required_location || "Remote Worldwide",
          url: j.url,
          source: "Remotive",
          description: (j.description || "").replace(/<[^>]+>/g, ' '),
          salary: j.salary || "$4,500 - $6,500 USD / mo",
          tags: j.tags || ["Data", "Remote"],
          created_at: new Date(j.publication_date).toLocaleDateString('pt-BR')
        });
      });
      addLog(`[Remotive] Sucesso: ${data.jobs.length} vagas coletadas.`, "success");
    }
  } catch (e) {
    console.warn("Remotive error:", e);
  }

  // FONTE 3: Jobicy API (Data Science & Engineering)
  try {
    addLog("[Fonte 3/4] Consultando Jobicy API...", "info");
    const data = await fetchWithCORS("https://jobicy.com/api/v2/remote-jobs?count=30&geo=anywhere");
    if (data && data.jobs) {
      data.jobs.forEach(j => {
        fetchedJobs.push({
          id: `jobicy_${j.id}`,
          title: j.jobTitle,
          company: j.companyName,
          location: j.jobGeo || "Worldwide Remote",
          url: j.url,
          source: "Jobicy",
          description: (j.jobDescription || "").replace(/<[^>]+>/g, ' '),
          salary: j.annualSalaryMin ? `$${j.annualSalaryMin} - $${j.annualSalaryMax} USD` : "Competitive USD",
          tags: ["Data", "Engineering"],
          created_at: new Date(j.pubDate).toLocaleDateString('pt-BR')
        });
      });
      addLog(`[Jobicy] Sucesso: ${data.jobs.length} vagas coletadas.`, "success");
    }
  } catch (e) {
    console.warn("Jobicy error:", e);
  }

  // FONTE 4: RemoteOK (via proxy)
  try {
    addLog("[Fonte 4/4] Consultando RemoteOK...", "info");
    const data = await fetchWithCORS("https://remoteok.com/api?tag=data");
    if (Array.isArray(data) && data.length > 1) {
      const raw = data.slice(1);
      let count = 0;
      raw.forEach(j => {
        if (!j.position || !j.company) return;
        fetchedJobs.push({
          id: `remoteok_${j.id || Math.random().toString(36).substr(2, 9)}`,
          title: j.position,
          company: j.company,
          location: j.location || "Remote Worldwide",
          url: j.url || `https://remoteok.com/l/${j.id}`,
          source: "RemoteOK",
          description: (j.description || "").replace(/<[^>]+>/g, ' '),
          salary: j.salary || "Competitive USD",
          tags: j.tags || ["Data", "Power BI"],
          created_at: new Date(j.date || Date.now()).toLocaleDateString('pt-BR')
        });
        count++;
      });
      addLog(`[RemoteOK] Sucesso: ${count} vagas coletadas.`, "success");
    }
  } catch (e) {
    console.warn("RemoteOK error:", e);
  }

  return fetchedJobs;
}

// EXECUTA O CICLO DE VARREDURA
async function triggerScan(isSilent = false) {
  const spinner = document.getElementById("scan-spinner");
  if (spinner) spinner.classList.add("fa-spin");

  addLog(">>> INICIANDO VARREDURA EM TEMPO REAL NAS REDES GLOBAIS <<<", "info");

  try {
    const liveJobs = await fetchLiveJobFeeds();
    let newCount = 0;
    let matchedCount = 0;

    const existingIds = new Set(appState.jobs.map(j => j.id));

    for (const job of liveJobs) {
      if (existingIds.has(job.id)) continue;

      const { score, reason } = calculateMatchScore(job.title, job.description, job.tags, job.location);
      job.match_score = score;
      job.match_reason = reason;
      job.status = score >= appState.settings.minMatch ? "matched" : "pending";

      appState.jobs.unshift(job);
      existingIds.add(job.id);
      newCount++;

      if (score >= appState.settings.minMatch) matchedCount++;
    }

    // Registra métricas
    const now = Date.now();
    appState.stats.scanHistory.push({ time: now, count: newCount || liveJobs.length });
    appState.stats.scanHistory = appState.stats.scanHistory.filter(h => now - h.time <= 3600000);
    appState.stats.scannedLastHour = appState.stats.scanHistory.reduce((acc, h) => acc + h.count, 0) || appState.jobs.length;

    appState.stats.totalMatched = appState.jobs.filter(j => j.match_score >= appState.settings.minMatch).length;
    appState.stats.totalApplied = appState.jobs.filter(j => j.status === "applied").length;
    appState.stats.totalResponses = appState.jobs.filter(j => j.status === "interview" || j.status === "response").length;

    persistState();
    updateStatsDisplay();
    filterJobs();

    addLog(`Varredura concluída! ${newCount} novas vagas adicionadas. Total no painel: ${appState.jobs.length}.`, "success");

    if (!isSilent) {
      alert(`Varredura em Tempo Real Concluída!\n\n✔ ${newCount} novas vagas capturadas nesta busca.\n✔ ${appState.jobs.length} total de oportunidades ativas no painel.\n✔ ${appState.stats.totalMatched} vagas com Match >= ${appState.settings.minMatch}%.`);
    }
  } catch (err) {
    addLog(`Erro durante a varredura: ${err.message}`, "failed");
  } finally {
    if (spinner) spinner.classList.remove("fa-spin");
  }
}

// 24/7 SCHEDULER
function startBotScheduler() {
  if (appState.timerId) clearInterval(appState.timerId);

  if (appState.settings.botActive) {
    const intervalMs = (appState.settings.scanIntervalMins || 15) * 60 * 1000;
    appState.timerId = setInterval(() => {
      if (appState.settings.botActive) {
        addLog("Ciclo 24/7 disparado pelo agendador automático.", "info");
        triggerScan(true);
      }
    }, intervalMs);
  }
}

function toggleBotStatus() {
  appState.settings.botActive = !appState.settings.botActive;
  persistState();
  updateStatsDisplay();
  startBotScheduler();

  addLog(`Robô 24/7 ${appState.settings.botActive ? 'ATIVADO' : 'PAUSADO'}.`, "info");
}

function updateStatsDisplay() {
  document.getElementById("stat-scanned-hour").innerText = appState.stats.scannedLastHour || appState.jobs.length;
  document.getElementById("stat-matched").innerText = appState.stats.totalMatched || 0;
  document.getElementById("stat-applied").innerText = appState.stats.totalApplied || 0;
  document.getElementById("stat-responses").innerText = appState.stats.totalResponses || 0;

  const indicator = document.getElementById("bot-status-indicator");
  const text = document.getElementById("bot-status-text");
  const toggleBtn = document.getElementById("btn-toggle-bot");

  if (appState.settings.botActive) {
    indicator.className = "status-pill";
    text.innerText = "Robô Ativo 24/7";
    toggleBtn.innerHTML = '<i class="fas fa-pause"></i> <span>Pausar</span>';
  } else {
    indicator.className = "status-pill paused";
    text.innerText = "Robô Pausado";
    toggleBtn.innerHTML = '<i class="fas fa-play"></i> <span>Ativar</span>';
  }
}

// FILTROS & RENDERIZAÇÃO
function filterJobs() {
  const searchInput = document.getElementById("filter-search");
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  
  const statusSelect = document.getElementById("filter-status");
  const statusFilter = statusSelect ? statusSelect.value : "all";

  const minMatchSelect = document.getElementById("filter-min-match");
  const minMatch = minMatchSelect ? parseInt(minMatchSelect.value, 10) : 0;

  appState.filteredJobs = appState.jobs.filter(job => {
    if (statusFilter !== "all" && job.status !== statusFilter) return false;
    if (job.match_score < minMatch) return false;

    if (query) {
      const text = `${job.title} ${job.company} ${job.description || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
      if (!text.includes(query)) return false;
    }
    return true;
  });

  renderJobsList(appState.filteredJobs);
}

function renderJobsList(jobs) {
  const container = document.getElementById("jobs-container");
  if (!container) return;

  if (!jobs || jobs.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted); background: var(--card-bg); border-radius: var(--radius-md); border: 1px solid var(--border);">
        <i class="fas fa-search fa-2x" style="margin-bottom: 10px; color: var(--primary);"></i>
        <p>Nenhuma vaga encontrada para os filtros selecionados. Altere o filtro de Match para "Qualquer Match" ou clique em "Buscar Vagas Agora".</p>
      </div>
    `;
    return;
  }

  container.innerHTML = jobs.map(job => {
    let matchClass = "match-low";
    if (job.match_score >= 80) matchClass = "match-high";
    else if (job.match_score >= 60) matchClass = "match-mid";

    let statusBadge = "";
    if (job.status === "applied") {
      statusBadge = '<span style="color: var(--success); font-weight: 700; font-size: 12px;"><i class="fas fa-check-circle"></i> Aplicada</span>';
    } else if (job.status === "matched") {
      statusBadge = '<span style="color: var(--badge-text); font-weight: 700; font-size: 12px;"><i class="fas fa-bolt"></i> Match Recomendado</span>';
    } else {
      statusBadge = `<span style="color: var(--text-muted); font-size: 12px;">${job.status}</span>`;
    }

    const tagsHtml = (job.tags || []).slice(0, 5).map(t => `<span class="tag-pill">${t}</span>`).join('');

    return `
      <div class="job-card">
        <div class="job-main">
          <div class="job-header">
            <h2 class="job-title">${job.title}</h2>
            <span class="job-company">${job.company}</span>
            <span class="match-badge ${matchClass}"><i class="fas fa-bullseye"></i> ${job.match_score}% Match</span>
          </div>

          <div class="job-meta">
            <span><i class="fas fa-map-marker-alt"></i> ${job.location || 'Remote'}</span>
            <span><i class="fas fa-dollar-sign"></i> ${job.salary || 'Competitive USD'}</span>
            <span><i class="fas fa-globe"></i> ${job.source || 'Web'}</span>
            <span><i class="far fa-clock"></i> ${job.created_at || 'Hoje'}</span>
          </div>

          ${job.match_reason ? `<div class="job-reason">${job.match_reason}</div>` : ''}

          <div class="job-tags">${tagsHtml}</div>
        </div>

        <div class="job-actions">
          ${statusBadge}
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <a href="${job.url}" target="_blank" class="btn" style="padding: 8px 12px; font-size: 12px;">
              <i class="fas fa-external-link-alt"></i> Acessar Vaga
            </a>
            ${job.status !== 'applied' ? `
              <button class="btn btn-primary" style="padding: 8px 12px; font-size: 12px;" onclick="applySmart('${job.id}')">
                <i class="fas fa-magic"></i> Auto-Apply Inteligente
              </button>
            ` : `
              <button class="btn" style="padding: 8px 12px; font-size: 12px; opacity: 0.7;" onclick="unapply('${job.id}')">
                <i class="fas fa-undo"></i> Desmarcar
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 1-CLICK SMART APPLY
function applySmart(jobId) {
  const job = appState.jobs.find(j => j.id === jobId);
  if (!job) return;

  const coverPitch = `Hi Hiring Team at ${job.company},

I am applying for the ${job.title} role. With extensive hands-on experience in ${appState.profile.skills}, I specialize in building scalable ETL pipelines, high-performance Power BI models (DAX, Power Query), and enterprise data warehouse solutions.

- Location / Availability: ${appState.profile.location} (Immediate availability, B2B Contractor / W-8BEN)
- Languages: ${appState.profile.english}
- LinkedIn: ${appState.profile.linkedin}
- GitHub: ${appState.profile.github}

Best regards,
${appState.profile.name}`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(coverPitch).catch(() => {});
  }

  job.status = "applied";
  appState.stats.totalApplied = appState.jobs.filter(j => j.status === "applied").length;
  persistState();
  updateStatsDisplay();
  filterJobs();

  addLog(`Candidatura registrada para ${job.company} (${job.title}). Pitch copiado!`, "success");

  // Abre a vaga em nova aba
  window.open(job.url, '_blank');
}

function unapply(jobId) {
  const job = appState.jobs.find(j => j.id === jobId);
  if (!job) return;
  job.status = "matched";
  appState.stats.totalApplied = appState.jobs.filter(j => j.status === "applied").length;
  persistState();
  updateStatsDisplay();
  filterJobs();
  addLog(`Candidatura desmarcada para ${job.company}.`, "info");
}

// PROFILE UI
function renderProfileUI() {
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };
  setVal("p-name", appState.profile.name);
  setVal("p-headline", appState.profile.headline);
  setVal("p-email", appState.profile.email);
  setVal("p-phone", appState.profile.phone);
  setVal("p-linkedin", appState.profile.linkedin);
  setVal("p-github", appState.profile.github);
  setVal("p-skills", appState.profile.skills);
  setVal("p-languages", appState.profile.english);
  setVal("p-certs", appState.profile.certifications);
  setVal("p-salary", appState.profile.salary);
}

function saveProfileChanges() {
  const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
  appState.profile = {
    name: getVal("p-name"),
    headline: getVal("p-headline"),
    email: getVal("p-email"),
    phone: getVal("p-phone"),
    linkedin: getVal("p-linkedin"),
    github: getVal("p-github"),
    skills: getVal("p-skills"),
    english: getVal("p-languages"),
    certifications: getVal("p-certs"),
    salary: getVal("p-salary"),
    location: "Brazil (Remote Worldwide)"
  };

  persistState();
  addLog("Perfil do candidato atualizado.", "success");
  alert("Perfil atualizado com sucesso!");
}

// SETTINGS UI
function renderSettingsUI() {
  const minMatchEl = document.getElementById("s-min-match");
  if (minMatchEl) minMatchEl.value = appState.settings.minMatch || 55;

  const intervalEl = document.getElementById("s-interval");
  if (intervalEl) intervalEl.value = appState.settings.scanIntervalMins || 15;

  const autoApplyEl = document.getElementById("s-auto-apply");
  if (autoApplyEl) autoApplyEl.checked = appState.settings.botActive;

  const kwEl = document.getElementById("s-keywords");
  if (kwEl) kwEl.value = appState.settings.keywords || "";
}

function saveSettingsChanges() {
  const minMatchEl = document.getElementById("s-min-match");
  const intervalEl = document.getElementById("s-interval");
  const autoApplyEl = document.getElementById("s-auto-apply");
  const kwEl = document.getElementById("s-keywords");

  appState.settings.minMatch = minMatchEl ? parseInt(minMatchEl.value, 10) : 55;
  appState.settings.scanIntervalMins = intervalEl ? parseInt(intervalEl.value, 10) : 15;
  appState.settings.botActive = autoApplyEl ? autoApplyEl.checked : true;
  appState.settings.keywords = kwEl ? kwEl.value : "";

  persistState();
  startBotScheduler();
  updateStatsDisplay();
  filterJobs();

  addLog("Configurações do robô 24/7 salvas.", "success");
  alert("Configurações salvas com sucesso!");
}

// TAB SWITCHER
function switchTab(tabId, btn) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  
  const target = document.getElementById(tabId);
  if (target) target.classList.add("active");
  if (btn) btn.classList.add("active");
}
