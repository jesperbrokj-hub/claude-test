const SOURCE_LABEL = {
  actual: "Faktisk",
  estimate: "Estimat",
  unavailable: "Ikke tilgængelig",
};

const monthsSelect = document.getElementById("months");
const refreshBtn = document.getElementById("refresh");
const statusEl = document.getElementById("status");
const tableBody = document.getElementById("table-body");

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
  const values = rows.map((r) => r.marketSharePct);
  const sources = rows.map((r) => r.source);

  const pointColors = sources.map((s) =>
    s === "estimate" ? "#b45309" : s === "actual" ? "#2563eb" : "#9ca3af"
  );

  const config = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Markedsandel %",
          data: values,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.08)",
          spanGaps: true,
          tension: 0.25,
          pointRadius: 4,
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          segment: {
            borderDash: (segCtx) => (sources[segCtx.p1DataIndex] === "estimate" ? [6, 4] : undefined),
          },
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterLabel: (item) => SOURCE_LABEL[sources[item.dataIndex]] ?? "",
          },
        },
      },
      scales: {
        y: {
          ticks: { callback: (v) => `${v}%` },
        },
      },
    },
  };

  if (chart) {
    chart.data = config.data;
    chart.update();
  } else {
    chart = new Chart(ctx, config);
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
