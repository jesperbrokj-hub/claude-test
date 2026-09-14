const SOURCE_LABEL = {
  actual: "Faktisk",
  estimate: "Estimat",
  unavailable: "Ikke tilgængelig",
};

const monthsSelect = document.getElementById("months");
const refreshBtn = document.getElementById("refresh");
const statusEl = document.getElementById("status");
const tableBody = document.getElementById("table-body");
const newsList = document.getElementById("news-list");
const newsStatusEl = document.getElementById("news-status");

let chart = null;

function formatMonth(monthKey) {
  const [y, m] = monthKey.split("-");
  const names = [
    "jan", "feb", "mar", "apr", "maj", "jun",
    "jul", "aug", "sep", "okt", "nov", "dec",
  ];
  return `${names[Number(m) - 1]} ${y}`;
}

function formatNumber(n) {
  return n === null || n === undefined ? "—" : n.toLocaleString("da-DK");
}

function formatPct(n) {
  return n === null || n === undefined ? "—" : `${n.toLocaleString("da-DK", { maximumFractionDigits: 1 })}%`;
}

async function fetchMarketShare(months) {
  const res = await fetch(`/api/market-share?months=${months}`);
  if (!res.ok) throw new Error(`API-fejl (${res.status})`);
  const data = await res.json();
  return data.months;
}

async function saveOnboarding(month, onboarded, inputEl) {
  inputEl.classList.remove("saved");
  try {
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, onboarded }),
    });
    if (!res.ok) throw new Error(`Kunne ikke gemme (${res.status})`);
    inputEl.classList.add("saved");
    await load();
  } catch (err) {
    statusEl.textContent = err.message;
  }
}

async function clearOnboarding(month) {
  try {
    const res = await fetch(`/api/onboarding/${month}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Kunne ikke slette (${res.status})`);
    await load();
  } catch (err) {
    statusEl.textContent = err.message;
  }
}

function renderTable(rows) {
  tableBody.innerHTML = "";
  for (const row of rows) {
    const tr = document.createElement("tr");

    const monthTd = document.createElement("td");
    monthTd.textContent = formatMonth(row.month);
    tr.appendChild(monthTd);

    const cvrTd = document.createElement("td");
    cvrTd.className = "num";
    cvrTd.textContent = formatNumber(row.newCvr);
    tr.appendChild(cvrTd);

    const sourceTd = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `badge ${row.source}`;
    badge.textContent = SOURCE_LABEL[row.source] ?? row.source;
    sourceTd.appendChild(badge);
    tr.appendChild(sourceTd);

    const onboardTd = document.createElement("td");
    onboardTd.className = "num";
    const onboardCell = document.createElement("div");
    onboardCell.className = "onboard-cell";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.className = "onboard-input saved";
    input.value = row.onboarded ?? "";
    input.placeholder = "0";
    input.addEventListener("change", () => {
      const value = Number(input.value);
      if (!Number.isInteger(value) || value < 0) return;
      saveOnboarding(row.month, value, input);
    });
    onboardCell.appendChild(input);

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "clear-btn";
    clearBtn.title = "Ryd tal for denne måned";
    clearBtn.textContent = "×";
    clearBtn.hidden = row.onboarded === null;
    clearBtn.addEventListener("click", () => clearOnboarding(row.month));
    onboardCell.appendChild(clearBtn);

    onboardTd.appendChild(onboardCell);
    tr.appendChild(onboardTd);

    const shareTd = document.createElement("td");
    shareTd.className = "num share-cell";
    shareTd.textContent = formatPct(row.marketSharePct);
    tr.appendChild(shareTd);

    tableBody.appendChild(tr);
  }
}

function renderChart(rows) {
  const ctx = document.getElementById("chart");
  const labels = rows.map((r) => formatMonth(r.month));
  const shareValues = rows.map((r) => r.marketSharePct);
  const cvrValues = rows.map((r) => r.newCvr);
  const onboardedValues = rows.map((r) => r.onboarded);
  const sources = rows.map((r) => r.source);

  const pointColorsFor = (baseColor) =>
    sources.map((s) => (s === "estimate" ? "#a9781e" : s === "actual" ? baseColor : "#9aa3ab"));

  const sourceDash = (segCtx) => (sources[segCtx.p1DataIndex] === "estimate" ? [6, 4] : undefined);

  const shareColors = pointColorsFor("#0f2a4c");
  const cvrColors = pointColorsFor("#5b7fa6");

  const config = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Markedsandel %",
          data: shareValues,
          yAxisID: "y",
          borderColor: "#0f2a4c",
          backgroundColor: "rgba(15, 42, 76, 0.08)",
          spanGaps: true,
          tension: 0.25,
          pointRadius: 4,
          pointBackgroundColor: shareColors,
          pointBorderColor: shareColors,
          segment: { borderDash: sourceDash },
        },
        {
          label: "Nye CVR-numre",
          data: cvrValues,
          yAxisID: "y1",
          borderColor: "#5b7fa6",
          backgroundColor: "transparent",
          spanGaps: true,
          tension: 0.25,
          pointRadius: 3,
          pointBackgroundColor: cvrColors,
          pointBorderColor: cvrColors,
          segment: { borderDash: sourceDash },
        },
        {
          label: "Nye bankkunder",
          data: onboardedValues,
          yAxisID: "y1",
          borderColor: "#a9781e",
          backgroundColor: "transparent",
          spanGaps: true,
          tension: 0.25,
          pointRadius: 3,
          pointBackgroundColor: "#a9781e",
          pointBorderColor: "#a9781e",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: true, position: "top", labels: { boxWidth: 12, usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: (item) =>
              item.dataset.label === "Markedsandel %"
                ? `${item.dataset.label}: ${formatPct(item.raw)}`
                : `${item.dataset.label}: ${formatNumber(item.raw)}`,
            afterLabel: (item) =>
              item.datasetIndex <= 1 ? SOURCE_LABEL[sources[item.dataIndex]] ?? "" : "",
          },
        },
      },
      scales: {
        y: {
          position: "left",
          title: { display: true, text: "Markedsandel" },
          ticks: { callback: (v) => `${v}%` },
        },
        y1: {
          position: "right",
          title: { display: true, text: "Antal" },
          grid: { drawOnChartArea: false },
          ticks: { callback: (v) => v.toLocaleString("da-DK") },
        },
      },
    },
  };

  if (chart) {
    chart.data = config.data;
    chart.options = config.options;
    chart.update();
  } else {
    chart = new Chart(ctx, config);
  }
}

function formatNewsDate(pubDate) {
  if (!pubDate) return "";
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
}

async function fetchNews(limit) {
  const res = await fetch(`/api/news?limit=${limit}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API-fejl (${res.status})`);
  return data.articles;
}

function renderNews(articles) {
  newsList.innerHTML = "";
  if (articles.length === 0) {
    const empty = document.createElement("li");
    empty.className = "news-empty";
    empty.textContent = "Ingen artikler fundet lige nu.";
    newsList.appendChild(empty);
    return;
  }
  for (const article of articles) {
    const li = document.createElement("li");
    li.className = "news-item";

    const link = document.createElement("a");
    link.href = article.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = article.title;
    li.appendChild(link);

    const meta = document.createElement("span");
    meta.className = "news-meta";
    const parts = [article.source, formatNewsDate(article.publishedAt)].filter(Boolean);
    meta.textContent = parts.join(" · ");
    li.appendChild(meta);

    newsList.appendChild(li);
  }
}

async function loadNews() {
  newsStatusEl.textContent = "Henter nyheder…";
  try {
    const articles = await fetchNews(8);
    renderNews(articles);
    newsStatusEl.textContent = "";
  } catch (err) {
    newsStatusEl.textContent = err.message;
  }
}

async function load() {
  statusEl.textContent = "Henter data…";
  try {
    const rows = await fetchMarketShare(monthsSelect.value);
    renderTable(rows);
    renderChart(rows);
    statusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = err.message;
  }
}

refreshBtn.addEventListener("click", load);
monthsSelect.addEventListener("change", load);

load();
loadNews();
