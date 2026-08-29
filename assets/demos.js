(() => {
  'use strict';

  const Charts = window.QSCharts;
  let activeCleanup = null;

  const LABS = [
    { id: 'returns', no: '01', title: '收益率、复利与波动拖累', module: '基础与收益分布', level: '入门', lessons: ['l01', 'l02'], summary: '调节两期收益和重复周期，观察简单收益、对数收益、算术平均与最终财富为何可能给出不同直觉。' },
    { id: 'lln', no: '02', title: '大数定律与运行均值', module: '抽样与统计推断', level: '入门', lessons: ['l02', 'l06', 'l08'], summary: '从正态、厚尾与偏态分布连续抽样，观察样本均值如何收敛，以及厚尾为何让收敛过程更不稳定。' },
    { id: 'clt', no: '03', title: '中心极限定理模拟器', module: '抽样与统计推断', level: '核心', lessons: ['l05', 'l07', 'l08'], summary: '改变原始分布、样本量和重复次数，直接比较原始分布与样本均值分布。' },
    { id: 'portfolio', no: '04', title: '相关性与组合风险', module: '基础与收益分布', level: '核心', lessons: ['l03', 'l04'], summary: '调节资产波动率、相关系数和权重，实时查看组合波动率曲线与分散化收益。' },
    { id: 'tails', no: '05', title: '厚尾、VaR 与 Expected Shortfall', module: '基础与收益分布', level: '进阶', lessons: ['l05'], summary: '在相同波动率下比较正态分布与 Student-t 分布的尾部损失，理解“均值和方差相同”不等于风险相同。' },
    { id: 'inference', no: '06', title: '置信区间、t 检验与功效', module: '抽样与统计推断', level: '核心', lessons: ['l08', 'l09', 'l10', 'l11'], summary: '输入样本均值、标准差和样本量，动态计算标准误、置信区间、t 值、p 值与近似检验功效。' },
    { id: 'regression', no: '07', title: '线性回归、异方差与稳健标准误', module: '回归与因子处理', level: '核心', lessons: ['l12', 'l15'], summary: '模拟线性关系并加入异方差和离群点，比较常规标准误与 HC1 稳健标准误。' },
    { id: 'neutralization', no: '08', title: '因子中性化与残差信息', module: '回归与因子处理', level: '核心', lessons: ['l13', 'l14'], summary: '生成受市值和行业污染的因子，通过截面回归残差化，检查暴露是否被剥离、有效信息是否被保留。' },
    { id: 'aracf', no: '09', title: 'AR(1)、ACF 与有效样本量', module: '时间序列', level: '核心', lessons: ['l16', 'l17', 'l18'], summary: '调节自回归系数，观察样本路径、ACF、长期方差和有效样本量如何变化。' },
    { id: 'bootstrap', no: '10', title: 'IID Bootstrap 与 Block Bootstrap', module: '重采样与研究偏差', level: '进阶', lessons: ['l19', 'l20'], summary: '对独立数据和相关时间序列分别重采样，比较两类 Bootstrap 对均值不确定性的估计。' },
    { id: 'multiple', no: '11', title: '多重检验、Bonferroni 与 FDR', module: '重采样与研究偏差', level: '核心', lessons: ['l21', 'l22'], summary: '控制测试数量、真实信号比例和效应强度，观察未经校正、Bonferroni 与 Benjamini–Hochberg 的发现结果。' },
    { id: 'factor', no: '12', title: 'IC、Rank IC、ICIR 与因子分层', module: '因子研究', level: '核心', lessons: ['l23', 'l24', 'l25', 'l26'], summary: '模拟横截面因子和未来收益，动态查看每日 IC 分布、ICIR、胜率、分层收益与单调性。' },
    { id: 'decay', no: '13', title: 'IC Decay、换手率与交易成本', module: '因子研究', level: '进阶', lessons: ['l27'], summary: '把信号衰减、再平衡频率、换手和成本放在同一张图中，寻找示意性的净收益最优持有期。' },
    { id: 'fmb', no: '14', title: 'Fama–MacBeth 两步回归', module: '因子研究', level: '进阶', lessons: ['l28', 'l16'], summary: '逐期估计横截面风险溢价，再对时间序列均值做常规与 HAC 推断。' },
    { id: 'overfit', no: '15', title: '策略搜索与回测过拟合', module: '回测与机器学习', level: '核心', lessons: ['l22', 'l29'], summary: '增加候选策略数量，观察最优样本内 Sharpe 如何被抬高、样本外表现如何回落。' },
    { id: 'validation', no: '16', title: '时间序列验证、Purging 与 Embargo', module: '回测与机器学习', level: '进阶', lessons: ['l29', 'l30'], summary: '可视化随机切分、滚动窗口和扩展窗口，并显示标签重叠、purge 与 embargo 对可用样本的影响。' },
    { id: 'csv', no: '17', title: '本地 CSV 收益率分析器', module: '数据实验室', level: '实战', lessons: ['l01', 'l03', 'l05', 'l09'], summary: '不上传任何数据到网络，直接在浏览器中读取 CSV 数值列，计算分布统计、置信区间、Sharpe 与财富曲线。' },
  ];

  // ---------- Numerical utilities ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normal(rng) {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function studentT(rng, df) {
    let chi = 0;
    const k = Math.max(1, Math.round(df));
    for (let i = 0; i < k; i++) { const z = normal(rng); chi += z * z; }
    return normal(rng) / Math.sqrt(chi / k);
  }

  const sum = (xs) => xs.reduce((a, b) => a + b, 0);
  const mean = (xs) => xs.length ? sum(xs) / xs.length : NaN;
  function variance(xs, sample = true) {
    if (xs.length < (sample ? 2 : 1)) return NaN;
    const m = mean(xs);
    return xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - (sample ? 1 : 0));
  }
  const std = (xs, sample = true) => Math.sqrt(variance(xs, sample));
  function quantile(xs, q) {
    if (!xs.length) return NaN;
    const s = [...xs].sort((a, b) => a - b);
    const pos = (s.length - 1) * Math.max(0, Math.min(1, q));
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo);
  }
  function skewness(xs) {
    if (xs.length < 3) return NaN;
    const m = mean(xs), s = std(xs, false);
    if (!s) return 0;
    return mean(xs.map(x => ((x - m) / s) ** 3));
  }
  function excessKurtosis(xs) {
    if (xs.length < 4) return NaN;
    const m = mean(xs), s = std(xs, false);
    if (!s) return 0;
    return mean(xs.map(x => ((x - m) / s) ** 4)) - 3;
  }
  function covariance(a, b) {
    const n = Math.min(a.length, b.length);
    if (n < 2) return NaN;
    const ma = mean(a.slice(0, n)), mb = mean(b.slice(0, n));
    let s = 0;
    for (let i = 0; i < n; i++) s += (a[i] - ma) * (b[i] - mb);
    return s / (n - 1);
  }
  function correlation(a, b) {
    const c = covariance(a, b), sa = std(a), sb = std(b);
    return sa && sb ? c / (sa * sb) : NaN;
  }
  function ranks(xs) {
    const pairs = xs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const r = Array(xs.length);
    let i = 0;
    while (i < pairs.length) {
      let j = i + 1;
      while (j < pairs.length && pairs[j].v === pairs[i].v) j++;
      const avg = (i + 1 + j) / 2;
      for (let k = i; k < j; k++) r[pairs[k].i] = avg;
      i = j;
    }
    return r;
  }
  const spearman = (a, b) => correlation(ranks(a), ranks(b));

  function erf(x) {
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }
  const normalCDF = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
  const normalPDF = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

  function logGamma(z) {
    const p = [
      676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012,
      9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
    z -= 1;
    let x = 0.99999999999980993;
    for (let i = 0; i < p.length; i++) x += p[i] / (z + i + 1);
    const t = z + p.length - 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  function betacf(a, b, x) {
    const MAXIT = 160, EPS = 3e-12, FPMIN = 1e-30;
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }

  function regularizedBeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2)
      ? bt * betacf(a, b, x) / a
      : 1 - bt * betacf(b, a, 1 - x) / b;
  }

  function tCDF(t, df) {
    const x = df / (df + t * t);
    const ib = regularizedBeta(x, df / 2, 0.5);
    return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
  }
  function tPDF(t, df) {
    return Math.exp(logGamma((df + 1) / 2) - logGamma(df / 2)) / Math.sqrt(df * Math.PI) * Math.pow(1 + t * t / df, -(df + 1) / 2);
  }
  function tQuantile(p, df) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    let lo = -16, hi = 16;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (tCDF(mid, df) < p) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  function olsSimple(x, y) {
    const n = Math.min(x.length, y.length);
    const mx = mean(x), my = mean(y);
    let sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      sxx += (x[i] - mx) ** 2;
      sxy += (x[i] - mx) * (y[i] - my);
      syy += (y[i] - my) ** 2;
    }
    const beta = sxy / sxx;
    const alpha = my - beta * mx;
    const residuals = y.map((v, i) => v - alpha - beta * x[i]);
    const sse = sum(residuals.map(e => e * e));
    const sigma2 = sse / Math.max(1, n - 2);
    const seBeta = Math.sqrt(sigma2 / sxx);
    const hc0Var = sum(residuals.map((e, i) => e * e * (x[i] - mx) ** 2)) / (sxx ** 2);
    const hc1Se = Math.sqrt((n / Math.max(1, n - 2)) * hc0Var);
    return { alpha, beta, residuals, sse, r2: 1 - sse / syy, seBeta, hc1Se, t: beta / seBeta };
  }

  function solveLinear(A, b) {
    const n = A.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
      [M[col], M[pivot]] = [M[pivot], M[col]];
      const d = M[col][col];
      if (Math.abs(d) < 1e-12) throw new Error('矩阵接近奇异');
      for (let j = col; j <= n; j++) M[col][j] /= d;
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const f = M[r][col];
        for (let j = col; j <= n; j++) M[r][j] -= f * M[col][j];
      }
    }
    return M.map(row => row[n]);
  }

  function olsMultiple(X, y) {
    const n = X.length, k = X[0].length;
    const XtX = Array.from({ length: k }, () => Array(k).fill(0));
    const Xty = Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      for (let a = 0; a < k; a++) {
        Xty[a] += X[i][a] * y[i];
        for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b];
      }
    }
    const beta = solveLinear(XtX, Xty);
    const fitted = X.map(row => row.reduce((s, v, j) => s + v * beta[j], 0));
    const residuals = y.map((v, i) => v - fitted[i]);
    return { beta, fitted, residuals };
  }

  function acf(xs, maxLag) {
    const m = mean(xs);
    const denom = sum(xs.map(x => (x - m) ** 2));
    const out = [];
    for (let lag = 0; lag <= maxLag; lag++) {
      let num = 0;
      for (let t = lag; t < xs.length; t++) num += (xs[t] - m) * (xs[t - lag] - m);
      out.push(num / denom);
    }
    return out;
  }

  function neweyWestSEMean(xs, lag) {
    const n = xs.length, m = mean(xs);
    const centered = xs.map(x => x - m);
    let lrv = sum(centered.map(x => x * x)) / n;
    for (let l = 1; l <= Math.min(lag, n - 1); l++) {
      let gamma = 0;
      for (let t = l; t < n; t++) gamma += centered[t] * centered[t - l];
      gamma /= n;
      const w = 1 - l / (lag + 1);
      lrv += 2 * w * gamma;
    }
    return Math.sqrt(Math.max(0, lrv) / n);
  }

  function movingBlockSample(xs, blockLength, rng) {
    const n = xs.length, out = [];
    while (out.length < n) {
      const start = Math.floor(rng() * Math.max(1, n - blockLength + 1));
      for (let j = 0; j < blockLength && out.length < n; j++) out.push(xs[start + j]);
    }
    return out;
  }

  // ---------- UI utilities ----------
  const fmt = (x, digits = 3) => Number.isFinite(x) ? x.toLocaleString('zh-CN', { maximumFractionDigits: digits, minimumFractionDigits: digits }) : '—';
  const pct = (x, digits = 2) => Number.isFinite(x) ? `${(x * 100).toFixed(digits)}%` : '—';
  const bps = (x, digits = 1) => Number.isFinite(x) ? `${x.toFixed(digits)} bp` : '—';
  const signed = (x, digits = 3) => Number.isFinite(x) ? `${x >= 0 ? '+' : ''}${x.toFixed(digits)}` : '—';

  function range(id, label, min, max, step, value, format = 'raw', help = '') {
    return `<label class="control"><span class="control-label">${label}<output id="${id}-out"></output></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-format="${format}">${help ? `<small>${help}</small>` : ''}</label>`;
  }
  function select(id, label, options, value) {
    return `<label class="control"><span class="control-label">${label}</span><select id="${id}">${options.map(o => `<option value="${o.value}" ${o.value === value ? 'selected' : ''}>${o.label}</option>`).join('')}</select></label>`;
  }
  function checkbox(id, label, checked = false, help = '') {
    return `<label class="toggle-control"><input id="${id}" type="checkbox" ${checked ? 'checked' : ''}><span class="toggle-ui"></span><span><strong>${label}</strong>${help ? `<small>${help}</small>` : ''}</span></label>`;
  }
  function metricGrid(items) {
    return `<div class="metric-grid">${items.map(i => `<div class="metric-card ${i.tone || ''}"><span>${i.label}</span><strong id="m-${i.id}">—</strong>${i.hint ? `<small>${i.hint}</small>` : ''}</div>`).join('')}</div>`;
  }
  function chartCard(id, title = '', cls = '') {
    return `<div class="chart-card ${cls}">${title ? `<div class="chart-card-head"><h3>${title}</h3></div>` : ''}<canvas id="${id}" aria-label="${title || '交互图表'}"></canvas></div>`;
  }
  function setMetric(root, id, value, tone = '') {
    const el = root.querySelector(`#m-${id}`);
    if (!el) return;
    el.textContent = value;
    const card = el.closest('.metric-card');
    card?.classList.remove('good', 'bad', 'warn');
    if (tone) card?.classList.add(tone);
  }
  function val(root, id) { return Number(root.querySelector(`#${id}`)?.value); }
  function strVal(root, id) { return root.querySelector(`#${id}`)?.value || ''; }
  function checked(root, id) { return !!root.querySelector(`#${id}`)?.checked; }

  function updateControlOutputs(root) {
    root.querySelectorAll('input[type="range"]').forEach(input => {
      const out = root.querySelector(`#${input.id}-out`);
      if (!out) return;
      const v = Number(input.value), f = input.dataset.format;
      if (f === 'pct') out.textContent = `${v.toFixed(Math.abs(v) < 10 ? 1 : 0)}%`;
      else if (f === 'decPct') out.textContent = `${(v * 100).toFixed(1)}%`;
      else if (f === 'bps') out.textContent = `${v.toFixed(1)} bp`;
      else if (f === 'int') out.textContent = Math.round(v).toLocaleString('zh-CN');
      else if (f === 'float2') out.textContent = v.toFixed(2);
      else if (f === 'float3') out.textContent = v.toFixed(3);
      else out.textContent = v.toString();
    });
  }

  function wireControls(root, update, randomize) {
    const handler = () => { updateControlOutputs(root); update(); };
    root.querySelectorAll('input[type="range"], input[type="checkbox"], select').forEach(el => {
      el.addEventListener(el.type === 'range' ? 'input' : 'change', handler);
    });
    root.querySelector('[data-rerun]')?.addEventListener('click', () => { randomize?.(); update(); });
    updateControlOutputs(root);
  }

  function linkedLessons(meta) {
    return meta.lessons.map(id => {
      const item = window.QS_CONTENT.lessons.find(x => x.id === id);
      return item ? `<a class="lesson-chip" href="#/lesson/${id}">${id.toUpperCase()} · ${item.title}</a>` : '';
    }).join('');
  }

  function labPage(meta, formula, controls, metrics, charts, interpretation, extra = '') {
    return `<article class="lab-page">
      <div class="crumbs"><a href="#/home">首页</a><span>/</span><a href="#/labs">交互实验室</a><span>/</span><span>实验 ${meta.no}</span></div>
      <header class="lab-header">
        <div><span class="eyebrow">实验 ${meta.no} · ${meta.module} · ${meta.level}</span><h1>${meta.title}</h1><p>${meta.summary}</p></div>
        <div class="lab-links">${linkedLessons(meta)}</div>
      </header>
      <section class="formula-panel"><div class="formula-mark">ƒ</div><div><span>核心关系</span><div class="formula-body">${formula}</div></div></section>
      <div class="lab-workbench">
        <aside class="control-panel"><div class="panel-title"><h2>参数控制</h2><button class="button ghost small" data-rerun type="button">重新模拟</button></div>${controls}<div class="control-note">所有计算都在本机浏览器内完成，不上传数据。</div></aside>
        <section class="lab-output">${metrics}${charts}${extra}</section>
      </div>
      <section class="interpretation"><h2>如何解读</h2>${interpretation}</section>
    </article>`;
  }

  function installResize(update) {
    let timer = null;
    const onResize = () => { clearTimeout(timer); timer = setTimeout(update, 120); };
    window.addEventListener('resize', onResize);
    return () => { clearTimeout(timer); window.removeEventListener('resize', onResize); };
  }

  // ---------- Lab implementations ----------
  const implementations = {};

  implementations.returns = (root, meta) => {
    let seed = 1;
    root.innerHTML = labPage(meta,
      String.raw`$$1+R_{1:T}=\prod_{t=1}^{T}(1+R_t),\qquad r_{1:T}=\sum_{t=1}^{T}\ln(1+R_t)$$`,
      range('ret-p0', '初始资金', 10, 1000, 10, 100, 'int') +
      range('ret-r1', '第一期收益', -60, 80, 1, 20, 'pct') +
      range('ret-r2', '第二期收益', -60, 80, 1, -20, 'pct') +
      range('ret-cycles', '重复两期组合', 1, 24, 1, 6, 'int'),
      metricGrid([
        { id: 'wealth', label: '最终财富', hint: '按简单收益逐期复利' },
        { id: 'cum', label: '累计收益', hint: '最终财富 / 初始财富 − 1' },
        { id: 'arith', label: '算术平均单期收益', hint: '不等同于复利增长率' },
        { id: 'geo', label: '几何平均单期收益', hint: '真实的等效复合增速' },
      ]),
      chartCard('ret-chart', '财富路径'),
      `<p>当两期收益幅度相同、方向相反时，算术平均可以等于零，但最终财富仍会下降。这是因为亏损发生在已经变化的本金上。波动越大，算术平均与几何平均之间的差距通常越大。</p><p>量化回测应使用逐期复利构造财富曲线；对数收益适合时间聚合，但组合横截面聚合不能简单相加。</p>`
    );
    const update = () => {
      const p0 = val(root, 'ret-p0');
      const r1 = val(root, 'ret-r1') / 100, r2 = val(root, 'ret-r2') / 100;
      const cycles = val(root, 'ret-cycles');
      const rs = [];
      for (let i = 0; i < cycles; i++) rs.push(r1, r2);
      let wealth = p0;
      const path = [{ x: 0, y: wealth }];
      rs.forEach((r, i) => { wealth *= 1 + r; path.push({ x: i + 1, y: wealth }); });
      const cum = wealth / p0 - 1;
      const arith = mean(rs);
      const geo = Math.pow(wealth / p0, 1 / rs.length) - 1;
      setMetric(root, 'wealth', `¥${fmt(wealth, 2)}`, wealth >= p0 ? 'good' : 'bad');
      setMetric(root, 'cum', pct(cum), cum >= 0 ? 'good' : 'bad');
      setMetric(root, 'arith', pct(arith));
      setMetric(root, 'geo', pct(geo), geo >= arith - 1e-12 ? '' : 'warn');
      Charts.line(root.querySelector('#ret-chart'), [
        { name: '财富', data: path, points: true },
        { name: '初始资金', data: [{ x: 0, y: p0 }, { x: rs.length, y: p0 }], dash: [5, 4] },
      ], { title: '逐期复利财富', xLabel: '期数', yLabel: '财富', includeZero: false, height: 330 });
    };
    wireControls(root, update, () => seed++);
    update();
    return installResize(update);
  };

  function drawFromDist(rng, dist, mu, sigma) {
    if (dist === 'normal') return mu + sigma * normal(rng);
    if (dist === 't5') return mu + sigma * studentT(rng, 5) / Math.sqrt(5 / 3);
    if (dist === 'skew') {
      const z = Math.exp(0.75 * normal(rng));
      const ez = Math.exp(0.75 ** 2 / 2);
      const vz = (Math.exp(0.75 ** 2) - 1) * Math.exp(0.75 ** 2);
      return mu + sigma * (z - ez) / Math.sqrt(vz);
    }
    return mu + sigma * normal(rng);
  }

  implementations.lln = (root, meta) => {
    let seed = 42;
    root.innerHTML = labPage(meta,
      String.raw`$$\bar X_n=\frac{1}{n}\sum_{i=1}^{n}X_i\xrightarrow{p}\mu,\qquad SE(\bar X)\approx\frac{\sigma}{\sqrt n}$$`,
      select('lln-dist', '数据分布', [
        { value: 'normal', label: '正态分布' }, { value: 't5', label: 'Student-t（df=5）' }, { value: 'skew', label: '标准化对数正态（偏态）' },
      ], 't5') +
      range('lln-mu', '真实均值 μ', -1, 1, .05, .2, 'float2') +
      range('lln-sigma', '真实标准差 σ', .2, 3, .1, 1, 'float2') +
      range('lln-n', '样本量 n', 20, 5000, 20, 1000, 'int'),
      metricGrid([
        { id: 'samplemean', label: '样本均值', hint: '当前样本路径的点估计' },
        { id: 'error', label: '估计误差', hint: '样本均值 − 真实均值' },
        { id: 'se', label: '理论标准误', hint: 'σ / √n' },
        { id: 'inside', label: '误差 / 标准误', hint: '绝对值越大，当前路径越极端' },
      ]),
      chartCard('lln-chart', '运行均值收敛路径'),
      `<p>大数定律保证的是收敛方向，不保证每条有限样本路径都平滑。厚尾或偏态数据常出现更长的“偏离阶段”。因此，“样本量已经很多”不能只凭绝对数量判断，还要结合波动、依赖结构和尾部性质。</p>`
    );
    const update = () => {
      const rng = mulberry32(seed);
      const dist = strVal(root, 'lln-dist'), mu = val(root, 'lln-mu'), sigma = val(root, 'lln-sigma'), n = val(root, 'lln-n');
      const running = [];
      let s = 0;
      for (let i = 1; i <= n; i++) {
        s += drawFromDist(rng, dist, mu, sigma);
        if (i <= 120 || i % Math.max(1, Math.floor(n / 450)) === 0 || i === n) running.push({ x: i, y: s / i });
      }
      const finalMean = s / n, se = sigma / Math.sqrt(n), z = (finalMean - mu) / se;
      setMetric(root, 'samplemean', fmt(finalMean, 4));
      setMetric(root, 'error', signed(finalMean - mu, 4), Math.abs(z) < 2 ? 'good' : 'warn');
      setMetric(root, 'se', fmt(se, 4));
      setMetric(root, 'inside', `${fmt(Math.abs(z), 2)} × SE`, Math.abs(z) < 2 ? 'good' : 'warn');
      Charts.line(root.querySelector('#lln-chart'), [
        { name: '运行均值', data: running },
        { name: '真实均值 μ', data: [{ x: 1, y: mu }, { x: n, y: mu }], dash: [6, 4] },
        { name: '+2SE(n)', data: running.map(p => ({ x: p.x, y: mu + 2 * sigma / Math.sqrt(p.x) })), dash: [3, 3], alpha: .7 },
        { name: '−2SE(n)', data: running.map(p => ({ x: p.x, y: mu - 2 * sigma / Math.sqrt(p.x) })), dash: [3, 3], alpha: .7 },
      ], { title: '样本越多，均值估计的典型误差带越窄', xLabel: '累计样本量', yLabel: '运行均值', height: 340 });
    };
    wireControls(root, update, () => seed++);
    update();
    return installResize(update);
  };

  function standardizedDraw(rng, dist) {
    if (dist === 'normal') return normal(rng);
    if (dist === 'uniform') return (rng() * 2 - 1) * Math.sqrt(3);
    if (dist === 'exponential') return -Math.log(Math.max(1e-12, 1 - rng())) - 1;
    if (dist === 't3') return studentT(rng, 3) / Math.sqrt(3);
    return normal(rng);
  }

  implementations.clt = (root, meta) => {
    let seed = 77;
    root.innerHTML = labPage(meta,
      String.raw`$$\frac{\bar X-\mu}{\sigma/\sqrt n}\Rightarrow N(0,1)$$`,
      select('clt-dist', '原始分布', [
        { value: 'normal', label: '正态' }, { value: 'uniform', label: '均匀' }, { value: 'exponential', label: '指数偏态' }, { value: 't3', label: 'Student-t（df=3，厚尾）' },
      ], 'exponential') +
      range('clt-n', '每组样本量 n', 1, 100, 1, 12, 'int') +
      range('clt-reps', '重复抽样次数', 200, 5000, 100, 2000, 'int'),
      metricGrid([
        { id: 'mean', label: '样本均值的均值', hint: '应接近原分布均值 0' },
        { id: 'sd', label: '样本均值标准差', hint: '理论值为 1/√n' },
        { id: 'skew', label: '样本均值偏度', hint: '越接近 0 越对称' },
        { id: 'kurt', label: '样本均值超额峰度', hint: '正态基准为 0' },
      ]),
      `<div class="chart-grid two">${chartCard('clt-raw', '原始随机变量')}${chartCard('clt-means', '样本均值分布')}</div>`,
      `<p>中心极限定理描述的是“样本均值的标准化分布”，不是说原始收益会变成正态。样本量增加后，样本均值通常更接近正态，但厚尾、强依赖和无限方差会显著减慢甚至破坏这一近似。</p>`
    );
    const update = () => {
      const rng = mulberry32(seed), dist = strVal(root, 'clt-dist'), n = val(root, 'clt-n'), reps = val(root, 'clt-reps');
      const raw = Array.from({ length: Math.min(3000, reps) }, () => standardizedDraw(rng, dist));
      const means = [];
      for (let r = 0; r < reps; r++) {
        let s = 0;
        for (let i = 0; i < n; i++) s += standardizedDraw(rng, dist);
        means.push(s / n);
      }
      setMetric(root, 'mean', fmt(mean(means), 4));
      setMetric(root, 'sd', `${fmt(std(means), 4)} / 理论 ${fmt(1 / Math.sqrt(n), 4)}`);
      setMetric(root, 'skew', fmt(skewness(means), 3));
      setMetric(root, 'kurt', fmt(excessKurtosis(means), 3));
      Charts.histogram(root.querySelector('#clt-raw'), raw, { title: '原始分布', bins: 45, height: 300, xLabel: 'X', yLabel: '密度' });
      const se = 1 / Math.sqrt(n);
      Charts.histogram(root.querySelector('#clt-means'), means, {
        title: `样本均值（n=${n}）`, bins: 45, height: 300, xLabel: '样本均值', yLabel: '密度',
        curves: [{ fn: x => normalPDF(x / se) / se, dash: [5, 3] }],
      });
    };
    wireControls(root, update, () => seed++);
    update();
    return installResize(update);
  };

  implementations.portfolio = (root, meta) => {
    root.innerHTML = labPage(meta,
      String.raw`$$\sigma_p^2=w^2\sigma_1^2+(1-w)^2\sigma_2^2+2w(1-w)\rho\sigma_1\sigma_2$$`,
      range('pf-vol1', '资产 1 年化波动率', 5, 60, 1, 20, 'pct') +
      range('pf-vol2', '资产 2 年化波动率', 5, 60, 1, 30, 'pct') +
      range('pf-rho', '相关系数 ρ', -1, 1, .05, .2, 'float2') +
      range('pf-w', '资产 1 权重', 0, 100, 1, 50, 'pct') +
      range('pf-mu1', '资产 1 预期收益', -10, 40, 1, 10, 'pct') +
      range('pf-mu2', '资产 2 预期收益', -10, 40, 1, 14, 'pct'),
      metricGrid([
        { id: 'vol', label: '组合波动率', hint: '由方差—协方差结构决定' },
        { id: 'ret', label: '组合预期收益', hint: '权重加权平均' },
        { id: 'div', label: '分散化降低', hint: '相对权重加权波动率' },
        { id: 'minw', label: '最小方差权重', hint: '资产 1 的解析解并限制在 0–100%' },
      ]),
      chartCard('pf-chart', '权重—风险曲线'),
      `<p>资产数量本身不会自动产生分散化。组合风险的关键是协方差项。当相关系数下降时，风险曲线会向下弯曲，最小方差组合可能显著低于任何一个资产的波动率。</p><p>实际估计中，协方差矩阵容易受样本误差影响，因此生产组合通常需要收缩估计、稳健约束和交易成本控制。</p>`
    );
    const update = () => {
      const s1 = val(root, 'pf-vol1') / 100, s2 = val(root, 'pf-vol2') / 100, rho = val(root, 'pf-rho');
      const w = val(root, 'pf-w') / 100, mu1 = val(root, 'pf-mu1') / 100, mu2 = val(root, 'pf-mu2') / 100;
      const risk = (ww) => Math.sqrt(Math.max(0, ww ** 2 * s1 ** 2 + (1 - ww) ** 2 * s2 ** 2 + 2 * ww * (1 - ww) * rho * s1 * s2));
      const vol = risk(w), ret = w * mu1 + (1 - w) * mu2;
      const naive = w * s1 + (1 - w) * s2;
      const denom = s1 ** 2 + s2 ** 2 - 2 * rho * s1 * s2;
      const minW = denom > 1e-12 ? Math.max(0, Math.min(1, (s2 ** 2 - rho * s1 * s2) / denom)) : .5;
      const curve = Array.from({ length: 101 }, (_, i) => ({ x: i, y: risk(i / 100) * 100 }));
      setMetric(root, 'vol', pct(vol));
      setMetric(root, 'ret', pct(ret), ret >= 0 ? 'good' : 'bad');
      setMetric(root, 'div', pct((naive - vol) / naive), rho < .8 ? 'good' : 'warn');
      setMetric(root, 'minw', pct(minW, 1));
      Charts.line(root.querySelector('#pf-chart'), [
        { name: '组合波动率', data: curve },
        { name: '当前权重', data: [{ x: w * 100, y: vol * 100 }], points: true, pointRadius: 5 },
        { name: '最小方差点', data: [{ x: minW * 100, y: risk(minW) * 100 }], points: true, pointRadius: 5 },
      ], { title: `ρ = ${rho.toFixed(2)}`, xLabel: '资产 1 权重（%）', yLabel: '年化波动率（%）', xExtent: [0, 100], height: 340 });
    };
    wireControls(root, update);
    update();
    return installResize(update);
  };

  implementations.tails = (root, meta) => {
    let seed = 120;
    root.innerHTML = labPage(meta,
      String.raw`$$VaR_q=-Q_{1-q}(R),\qquad ES_q=-E[R\mid R\le Q_{1-q}(R)]$$`,
      range('tail-n', '模拟样本量', 500, 12000, 500, 5000, 'int') +
      range('tail-df', 'Student-t 自由度', 3, 30, 1, 5, 'int') +
      range('tail-sigma', '单期波动率', .5, 5, .1, 2, 'pct') +
      select('tail-q', '风险置信水平', [{ value: '0.95', label: '95%' }, { value: '0.99', label: '99%' }], '0.99'),
      metricGrid([
        { id: 'nvar', label: '正态 VaR', hint: '左尾分位数的相反数' },
        { id: 'tvar', label: '厚尾 VaR', hint: '同波动率 Student-t' },
        { id: 'nes', label: '正态 ES', hint: '超过 VaR 后的平均损失' },
        { id: 'tes', label: '厚尾 ES', hint: '对极端损失更敏感' },
      ]),
      `<div class="chart-grid two">${chartCard('tail-hist', '厚尾与正态基准')}${chartCard('tail-bars', '尾部风险比较')}</div>`,
      `<p>VaR 只告诉你一个损失分位点，不说明越过分位点后会损失多少；Expected Shortfall 直接考察尾部平均损失。对于厚尾收益，二者都可能明显高于正态假设给出的结果。</p><p>这里使用模拟分布做教学展示。真实策略风险还需处理波动聚集、流动性枯竭、跳跃和状态转换。</p>`
    );
    const update = () => {
      const rng = mulberry32(seed), n = val(root, 'tail-n'), df = val(root, 'tail-df'), sigma = val(root, 'tail-sigma') / 100, q = Number(strVal(root, 'tail-q'));
      const norm = [], fat = [];
      const scaleT = df > 2 ? Math.sqrt((df - 2) / df) : 1;
      for (let i = 0; i < n; i++) {
        norm.push(sigma * normal(rng));
        fat.push(sigma * studentT(rng, df) * scaleT);
      }
      const p = 1 - q;
      const qn = quantile(norm, p), qt = quantile(fat, p);
      const esn = -mean(norm.filter(x => x <= qn)), est = -mean(fat.filter(x => x <= qt));
      setMetric(root, 'nvar', pct(-qn));
      setMetric(root, 'tvar', pct(-qt), -qt > -qn ? 'warn' : '');
      setMetric(root, 'nes', pct(esn));
      setMetric(root, 'tes', pct(est), est > esn ? 'bad' : '');
      const lim = Math.max(Math.abs(quantile(fat, .002)), Math.abs(quantile(fat, .998)), sigma * 5);
      Charts.histogram(root.querySelector('#tail-hist'), fat, {
        title: `Student-t(df=${df})，波动率相同`, bins: 60, xExtent: [-lim, lim], height: 310, xLabel: '单期收益', yLabel: '密度',
        xFormatter: v => `${(v * 100).toFixed(1)}%`,
        curves: [{ fn: x => normalPDF(x / sigma) / sigma, dash: [5, 3] }],
      });
      Charts.bars(root.querySelector('#tail-bars'), ['VaR', 'ES'], [[-qn * 100, esn * 100], [-qt * 100, est * 100]], {
        title: `${Math.round(q * 100)}% 尾部损失`, height: 310, yLabel: '损失（%）', yFormatter: v => `${v.toFixed(1)}%`,
      });
    };
    wireControls(root, update, () => seed++);
    update();
    return installResize(update);
  };

  function drawTInference(canvas, tValue, df, critical) {
    const data = Array.from({ length: 241 }, (_, i) => {
      const x = -6 + i * .05;
      return { x, y: tPDF(x, df) };
    });
    const marker = (x) => [{ x, y: 0 }, { x, y: tPDF(x, df) }];
    Charts.line(canvas, [
      { name: `t 分布(df=${df})`, data },
      { name: '观测 t', data: marker(Math.max(-6, Math.min(6, tValue))), points: true },
      { name: '临界值', data: marker(critical), dash: [4, 3] },
      { name: '', data: marker(-critical), dash: [4, 3] },
    ], { title: '双侧 t 检验', xExtent: [-6, 6], yExtent: [0, Math.max(...data.map(p => p.y)) * 1.12], xLabel: 't', yLabel: '密度', height: 320 });
  }

  implementations.inference = (root, meta) => {
    root.innerHTML = labPage(meta,
      String.raw`$$t=\frac{\bar X-\mu_0}{s/\sqrt n},\qquad CI=\bar X\pm t_{1-\alpha/2,n-1}\frac{s}{\sqrt n}$$`,
      range('inf-mean', '样本均值', -0.05, .08, .001, .012, 'float3') +
      range('inf-sd', '样本标准差', .01, .30, .005, .08, 'float3') +
      range('inf-n', '样本量 n', 10, 1000, 5, 120, 'int') +
      range('inf-null', '原假设均值 μ₀', -.03, .03, .001, 0, 'float3') +
      select('inf-conf', '置信水平', [{ value: '.90', label: '90%' }, { value: '.95', label: '95%' }, { value: '.99', label: '99%' }], '.95'),
      metricGrid([
        { id: 'se', label: '标准误', hint: '均值估计的不确定性' },
        { id: 't', label: 't 统计量', hint: '离原假设多少个标准误' },
        { id: 'p', label: '双侧 p 值', hint: '在 H₀ 下同等或更极端结果概率' },
        { id: 'ci', label: '置信区间', hint: '重复抽样意义下的区间程序' },
        { id: 'decision', label: '当前决策', hint: '按所选 α，不等同于策略必然有效' },
        { id: 'power', label: '近似检验功效', hint: '把当前效应视为真实效应的正态近似' },
      ]),
      chartCard('inf-chart', 't 分布与检验位置'),
      `<p>p 值不是“原假设为真的概率”，置信区间也不是“参数有某概率落在当前固定区间内”。在量化研究中，还必须同时报告经济量级、样本依赖、试验次数和样本外结果。</p>`
    );
    const update = () => {
      const m = val(root, 'inf-mean'), s = val(root, 'inf-sd'), n = val(root, 'inf-n'), mu0 = val(root, 'inf-null'), conf = Number(strVal(root, 'inf-conf'));
      const df = n - 1, se = s / Math.sqrt(n), t = (m - mu0) / se;
      const p = 2 * (1 - tCDF(Math.abs(t), df));
      const crit = tQuantile(1 - (1 - conf) / 2, df);
      const lo = m - crit * se, hi = m + crit * se;
      const zcrit = tQuantile(1 - (1 - conf) / 2, df);
      const delta = Math.abs(m - mu0) / se;
      const power = normalCDF(-zcrit - delta) + 1 - normalCDF(zcrit - delta);
      const reject = p < 1 - conf;
      setMetric(root, 'se', fmt(se, 5));
      setMetric(root, 't', signed(t, 3), Math.abs(t) >= crit ? 'good' : 'warn');
      setMetric(root, 'p', p < .0001 ? '< 0.0001' : fmt(p, 4), reject ? 'good' : 'warn');
      setMetric(root, 'ci', `[${fmt(lo, 4)}, ${fmt(hi, 4)}]`);
      setMetric(root, 'decision', reject ? '拒绝 H₀' : '不能拒绝 H₀', reject ? 'good' : 'warn');
      setMetric(root, 'power', pct(power, 1), power >= .8 ? 'good' : 'warn');
      drawTInference(root.querySelector('#inf-chart'), t, df, crit);
    };
    wireControls(root, update);
    update();
    return installResize(update);
  };

  implementations.regression = (root, meta) => {
    let seed = 231;
    root.innerHTML = labPage(meta,
      String.raw`$$Y_i=\alpha+\beta X_i+\varepsilon_i,\qquad \widehat\beta=\frac{\sum(X_i-\bar X)(Y_i-\bar Y)}{\sum(X_i-\bar X)^2}$$`,
      range('reg-beta', '真实斜率 β', -2, 2, .1, .8, 'float2') +
      range('reg-noise', '基础噪声 σ', .2, 3, .1, 1, 'float2') +
      range('reg-n', '样本量 n', 30, 600, 10, 180, 'int') +
      range('reg-outlier', '离群点比例', 0, 12, 1, 2, 'pct') +
      checkbox('reg-hetero', '加入异方差', true, '误差波动随 |X| 增大'),
      metricGrid([
        { id: 'beta', label: '估计斜率 β̂', hint: '样本线性关系' },
        { id: 'se', label: '常规标准误', hint: '依赖同方差假设' },
        { id: 'hc1', label: 'HC1 稳健标准误', hint: '允许未知形式异方差' },
        { id: 'r2', label: 'R²', hint: '样本内解释度，不等同于预测能力' },
        { id: 't', label: '常规 t 值', hint: 'β̂ / SE' },
        { id: 'ci', label: '95% 稳健区间', hint: 'β̂ ± 1.96 × HC1 SE' },
      ]),
      chartCard('reg-chart', '散点与拟合线'),
      `<p>异方差不会自动使 OLS 斜率有偏，但会使常规标准误和显著性推断失真。离群点则可能同时扭曲斜率和推断。真实因子研究还应检查杠杆点、非线性、遗漏变量和时间/行业聚类。</p>`
    );
    const update = () => {
      const rng = mulberry32(seed), beta0 = val(root, 'reg-beta'), noise = val(root, 'reg-noise'), n = val(root, 'reg-n'), outlier = val(root, 'reg-outlier') / 100, hetero = checked(root, 'reg-hetero');
      const x = [], y = [];
      for (let i = 0; i < n; i++) {
        const xi = normal(rng);
        const local = noise * (hetero ? .45 + .65 * Math.abs(xi) : 1);
        let e = local * normal(rng);
        if (rng() < outlier) e += noise * 7 * normal(rng);
        x.push(xi); y.push(.25 + beta0 * xi + e);
      }
      const fit = olsSimple(x, y);
      setMetric(root, 'beta', fmt(fit.beta, 3), Math.abs(fit.beta - beta0) < .25 ? 'good' : 'warn');
      setMetric(root, 'se', fmt(fit.seBeta, 4));
      setMetric(root, 'hc1', fmt(fit.hc1Se, 4), fit.hc1Se > fit.seBeta * 1.15 ? 'warn' : '');
      setMetric(root, 'r2', pct(fit.r2, 1));
      setMetric(root, 't', fmt(fit.t, 2));
      setMetric(root, 'ci', `[${fmt(fit.beta - 1.96 * fit.hc1Se, 3)}, ${fmt(fit.beta + 1.96 * fit.hc1Se, 3)}]`);
      Charts.scatter(root.querySelector('#reg-chart'), x.map((v, i) => ({ x: v, y: y[i] })), {
        title: `真实 β=${beta0.toFixed(2)}；估计 β̂=${fit.beta.toFixed(2)}`, line: { slope: fit.beta, intercept: fit.alpha },
        xLabel: 'X', yLabel: 'Y', height: 350, crosshair: true,
      });
    };
    wireControls(root, update, () => seed++);
    update();
    return installResize(update);
  };

  implementations.neutralization = (root, meta) => {
    let seed = 411;
    root.innerHTML = labPage(meta,
      String.raw`$$Factor_i=\beta_0+\beta_s Size_i+\sum_k\gamma_k Industry_{ik}+\varepsilon_i,\qquad Factor_i^{neutral}=\widehat\varepsilon_i$$`,
      range('neu-n', '股票数量', 100, 1000, 50, 400, 'int') +
      range('neu-size', '市值污染强度', 0, 2, .1, 1.1, 'float2') +
      range('neu-ind', '行业污染强度', 0, 2, .1, .8, 'float2') +
      range('neu-alpha', '残差信号强度', 0, .15, .005, .04, 'float3') +
      range('neu-noise', '未来收益噪声', .2, 2, .1, 1, 'float2'),
      metricGrid([
        { id: 'rawsize', label: '原因子—市值相关', hint: '中性化前暴露' },
        { id: 'ressize', label: '残差因子—市值相关', hint: '应接近 0' },
        { id: 'rawic', label: '原因子 Rank IC', hint: '可能混入风格收益' },
        { id: 'resic', label: '残差因子 Rank IC', hint: '控制行业与市值后的排序信息' },
      ]),
      `<div class="chart-grid two">${chartCard('neu-raw', '中性化前')}${chartCard('neu-resid', '中性化后')}</div>${chartCard('neu-industry', '各行业平均暴露')}`,
      `<p>残差化的目标不是把因子“变漂亮”，而是让研究问题更清楚：在控制行业与市值之后，剩余信息是否仍与未来收益相关。中性化可能剥离真实收益来源，也可能降低噪声，因此必须同时比较前后 IC、分层、换手和可解释性。</p>`
    );
    const update = () => {
      const rng = mulberry32(seed), n = val(root, 'neu-n'), sizeC = val(root, 'neu-size'), indC = val(root, 'neu-ind'), alpha = val(root, 'neu-alpha'), noise = val(root, 'neu-noise');
      const kInd = 5, indEffects = [-1, -.45, 0, .55, 1];
      const size = [], industry = [], pure = [], raw = [], ret = [], X = [];
      for (let i = 0; i < n; i++) {
        const s = normal(rng), ind = Math.floor(rng() * kInd), p = normal(rng);
        const f = p + sizeC * s + indC * indEffects[ind];
        const r = alpha * p + .005 * s + noise * .05 * normal(rng);
        size.push(s); industry.push(ind); pure.push(p); raw.push(f); ret.push(r);
        const row = [1, s];
        for (let j = 1; j < kInd; j++) row.push(ind === j ? 1 : 0);
        X.push(row);
      }
      const fit = olsMultiple(X, raw), resid = fit.residuals;
      const rawSize = correlation(raw, size), resSize = correlation(resid, size), rawIC = spearman(raw, ret), resIC = spearman(resid, ret);
      setMetric(root, 'rawsize', fmt(rawSize, 3), Math.abs(rawSize) > .3 ? 'warn' : '');
      setMetric(root, 'ressize', fmt(resSize, 4), Math.abs(resSize) < .03 ? 'good' : 'warn');
      setMetric(root, 'rawic', fmt(rawIC, 3));
      setMetric(root, 'resic', fmt(resIC, 3), resIC > rawIC ? 'good' : '');
      Charts.scatter(root.querySelector('#neu-raw'), size.map((x, i) => ({ x, y: raw[i] })), { title: `Corr=${rawSize.toFixed(3)}`, xLabel: 'Size', yLabel: 'Raw factor', height: 300, crosshair: true });
      Charts.scatter(root.querySelector('#neu-resid'), size.map((x, i) => ({ x, y: resid[i] })), { title: `Corr=${resSize.toFixed(3)}`, xLabel: 'Size', yLabel: 'Residual factor', height: 300, crosshair: true });
      const rawMeans = [], resMeans = [];
      for (let j = 0; j < kInd; j++) {
        rawMeans.push(mean(raw.filter((_, i) => industry[i] === j)));
        resMeans.push(mean(resid.filter((_, i) => industry[i] === j)));
      }
      Charts.bars(root.querySelector('#neu-industry'), ['行业 A', '行业 B', '行业 C', '行业 D', '行业 E'], [rawMeans, resMeans], { title: '中性化前后行业均值', yLabel: '平均因子值', height: 300 });
    };
    wireControls(root, update, () => seed++);
    update();
    return installResize(update);
  };

  implementations.aracf = (root, meta) => {
    let seed = 900;
    root.innerHTML = labPage(meta,
      String.raw`$$X_t=\phi X_{t-1}+\varepsilon_t,\qquad n_{eff}\approx n\frac{1-\rho_1}{1+\rho_1}$$`,
      range('ar-phi', 'AR(1) 系数 φ', -.9, .95, .05, .65, 'float2') +
      range('ar-n', '样本长度 n', 100, 1200, 20, 500, 'int') +
      range('ar-sigma', '创新波动 σᵋ', .2, 2, .1, 1, 'float2') +
      range('ar-lags', '显示 ACF 滞后阶数', 5, 30, 1, 20, 'int'),
      metricGrid([
        { id: 'rho1', label: '样本一阶自相关', hint: 'ACF(1)' },
        { id: 'neff', label: '近似有效样本量', hint: '正相关会减少独立信息' },
        { id: 'naivese', label: '朴素均值标准误', hint: '忽略序列依赖' },
        { id: 'hacse', label: 'HAC 均值标准误', hint: 'Newey–West，自动包含若干滞后' },
      ]),
      `<div class="chart-grid two">${chartCard('ar-series', 'AR(1) 样本路径')}${chartCard('ar-acf', '样本自相关函数')}</div>`,
      String.raw`<p>正自相关会让相邻观测携带重复信息，使“500 个日度观测”远少于 500 个独立观测。直接套用 $s/\sqrt n$ 往往低估标准误。负自相关则可能产生相反效果。</p>`
    );
    const update = () => {
      const rng = mulberry32(seed), phi = val(root, 'ar-phi'), n = val(root, 'ar-n'), eps = val(root, 'ar-sigma'), lags = val(root, 'ar-lags');
      const xs = [eps * normal(rng) / Math.sqrt(Math.max(.01, 1 - phi * phi))];
      for (let t = 1; t < n; t++) xs.push(phi * xs[t - 1] + eps * normal(rng));
      const a = acf(xs, lags), rho1 = a[1], neff = Math.max(1, Math.min(n, n * (1 - rho1) / (1 + rho1)));
      const naive = std(xs) / Math.sqrt(n), lag = Math.max(1, Math.floor(4 * Math.pow(n / 100, 2 / 9))), hac = neweyWestSEMean(xs, lag);
      setMetric(root, 'rho1', fmt(rho1, 3));
      setMetric(root, 'neff', `${Math.round(neff).toLocaleString('zh-CN')} / ${n}`, neff < n * .6 ? 'warn' : '');
      setMetric(root, 'naivese', fmt(naive, 4));
      setMetric(root, 'hacse', `${fmt(hac, 4)}（lag=${lag}）`, hac > naive * 1.2 ? 'warn' : '');
      const shown = xs.slice(0, Math.min(300, n)).map((y, x) => ({ x, y }));
      Charts.line(root.querySelector('#ar-series'), [{ name: 'Xₜ', data: shown }], { title: `φ=${phi.toFixed(2)}`, xLabel: 't', yLabel: 'X', height: 300, zeroLine: true });
      Charts.bars(root.querySelector('#ar-acf'), a.slice(1).map((_, i) => String(i + 1)), a.slice(1), { title: 'ACF(k)', xLabel: 'lag', yLabel: '相关系数', yExtent: [-1, 1], height: 300 });
    };
    wireControls(root, update, () => seed++);
    update();
    return installResize(update);
  };

  implementations.bootstrap = (root, meta) => {
    let seed = 1300;
    root.innerHTML = labPage(meta,
      String.raw`$$\bar X^{*(b)}=\frac1n\sum_{i=1}^n X_i^{*(b)},\qquad CI_{95\%}=[Q_{.025}(\bar X^*),Q_{.975}(\bar X^*)]$$`,
      select('boot-process', '数据生成过程', [{ value: 'iid', label: 'IID 正态' }, { value: 'ar', label: 'AR(1) 相关序列' }], 'ar') +
      range('boot-n', '样本长度 n', 80, 800, 20, 300, 'int') +
      range('boot-phi', 'AR 系数 φ', 0, .9, .05, .65, 'float2') +
      range('boot-block', '移动块长度', 2, 40, 1, 12, 'int') +
      range('boot-b', 'Bootstrap 次数', 300, 3000, 100, 1200, 'int'),
      metricGrid([
        { id: 'sample', label: '原样本均值', hint: '待估计统计量' },
        { id: 'iidci', label: 'IID Bootstrap 95% CI', hint: '逐点重采样，破坏时间依赖' },
        { id: 'blockci', label: 'Block Bootstrap 95% CI', hint: '按连续块重采样' },
        { id: 'ratio', label: '区间宽度比', hint: 'Block 宽度 / IID 宽度' },
      ]),
      `<div class="chart-grid two">${chartCard('boot-iid', 'IID Bootstrap 均值')}${chartCard('boot-block-chart', 'Block Bootstrap 均值')}</div>`,
      `<p>对存在自相关或波动聚集的序列逐点重采样，会破坏原有依赖结构，通常低估不确定性。块长度太短仍保留不足，太长又会减少有效重采样组合；它本身也是需要诊断的超参数。</p>`
    );
    const update = () => {
      const rng = mulberry32(seed), process = strVal(root, 'boot-process'), n = val(root, 'boot-n'), phi = val(root, 'boot-phi'), block = Math.min(val(root, 'boot-block'), n), B = val(root, 'boot-b');
      const xs = [];
      let prev = normal(rng);
      for (let i = 0; i < n; i++) {
        const x = process === 'ar' ? phi * prev + normal(rng) : normal(rng);
        xs.push(x); prev = x;
      }
      const iidMeans = [], blockMeans = [];
      for (let b = 0; b < B; b++) {
        let s = 0;
        for (let i = 0; i < n; i++) s += xs[Math.floor(rng() * n)];
        iidMeans.push(s / n);
        blockMeans.push(mean(movingBlockSample(xs, block, rng)));
      }
      const iidCI = [quantile(iidMeans, .025), quantile(iidMeans, .975)], blockCI = [quantile(blockMeans, .025), quantile(blockMeans, .975)];
      const ratio = (blockCI[1] - blockCI[0]) / (iidCI[1] - iidCI[0]);
      setMetric(root, 'sample', fmt(mean(xs), 4));
      setMetric(root, 'iidci', `[${fmt(iidCI[0], 3)}, ${fmt(iidCI[1], 3)}]`);
      setMetric(root, 'blockci', `[${fmt(blockCI[0], 3)}, ${fmt(blockCI[1], 3)}]`);
      setMetric(root, 'ratio', `${fmt(ratio, 2)} ×`, ratio > 1.15 ? 'warn' : '');
      const extent = Charts.finiteExtent([...iidMeans, ...blockMeans], [-1, 1], .03);
      Charts.histogram(root.querySelector('#boot-iid'), iidMeans, { title: '逐点重采样', bins: 42, xExtent: extent, height: 300, xLabel: 'Bootstrap 均值', yLabel: '密度' });
      Charts.histogram(root.querySelector('#boot-block-chart'), blockMeans, { title: `移动块长度=${block}`, bins: 42, xExtent: extent, height: 300, xLabel: 'Bootstrap 均值', yLabel: '密度' });
    };
    wireControls(root, update, () => seed++);
    update();
    return installResize(update);
  };

  function bhSelected(pvals, q) {
    const ordered = pvals.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
    let k = -1;
    ordered.forEach((o, idx) => { if (o.p <= ((idx + 1) / pvals.length) * q) k = idx; });
    const selected = new Set(k >= 0 ? ordered.slice(0, k + 1).map(o => o.i) : []);
    return { selected, threshold: k >= 0 ? ordered[k].p : 0, ordered };
  }

  implementations.multiple = (root, meta) => {
    let seed = 1701;
    root.innerHTML = labPage(meta,
      String.raw`$$FWER=P(V\ge1),\qquad FDR=E\left[\frac{V}{\max(R,1)}\right],\qquad p_{(k)}\le\frac{k}{m}q$$`,
      range('mt-m', '同时测试的假设数 m', 20, 2000, 20, 500, 'int') +
      range('mt-alpha', '目标显著性 / FDR 水平', .01, .15, .01, .05, 'decPct') +
      range('mt-prop', '真实信号比例', 0, .3, .01, .06, 'decPct') +
      range('mt-effect', '真实信号 z 效应', .5, 4, .1, 2.2, 'float2'),
      metricGrid([
        { id: 'raw', label: '未经校正发现数', hint: 'p ≤ α' },
        { id: 'bonf', label: 'Bonferroni 发现数', hint: 'p ≤ α/m' },
        { id: 'bh', label: 'BH-FDR 发现数', hint: '自适应阶梯阈值' },
        { id: 'fdp', label: 'BH 实际假发现比例', hint: '本次模拟 V / max(R,1)' },
      ]),
      `<div class="chart-grid two">${chartCard('mt-bars', '真发现与假发现')}${chartCard('mt-pvals', '排序 p 值与 BH 阈值')}</div>`,
      `<p>未经校正的 5% 显著性在大规模因子搜索中会产生大量偶然发现。Bonferroni 强控制“至少一个假发现”的概率，但可能过于保守；BH 控制的是发现集合中的期望假发现比例，更适合探索型筛选，但仍不能替代独立样本外验证。</p>`
    );
    const update = () => {
      const rng = mulberry32(seed), m = val(root, 'mt-m'), alpha = val(root, 'mt-alpha'), prop = val(root, 'mt-prop'), effect = val(root, 'mt-effect');
      const pvals = [], truth = [];
      for (let i = 0; i < m; i++) {
        const isTrue = rng() < prop;
        const z = normal(rng) + (isTrue ? effect * (rng() < .5 ? -1 : 1) : 0);
        pvals.push(Math.max(1e-12, 2 * (1 - normalCDF(Math.abs(z))))); truth.push(isTrue);
      }
      const raw = new Set(pvals.map((p, i) => p <= alpha ? i : -1).filter(i => i >= 0));
      const bonf = new Set(pvals.map((p, i) => p <= alpha / m ? i : -1).filter(i => i >= 0));
      const bh = bhSelected(pvals, alpha);
      const counts = (set) => {
        let tp = 0, fp = 0; set.forEach(i => truth[i] ? tp++ : fp++); return { tp, fp };
      };
      const cr = counts(raw), cb = counts(bonf), ch = counts(bh.selected);
      setMetric(root, 'raw', `${raw.size}（假 ${cr.fp}）`, cr.fp > 0 ? 'warn' : '');
      setMetric(root, 'bonf', `${bonf.size}（假 ${cb.fp}）`);
      setMetric(root, 'bh', `${bh.selected.size}（假 ${ch.fp}）`, bh.selected.size ? 'good' : 'warn');
      setMetric(root, 'fdp', pct(ch.fp / Math.max(1, bh.selected.size), 1), ch.fp / Math.max(1, bh.selected.size) <= alpha ? 'good' : 'warn');
      Charts.bars(root.querySelector('#mt-bars'), ['未校正', 'Bonferroni', 'BH-FDR'], [[cr.tp, cb.tp, ch.tp], [cr.fp, cb.fp, ch.fp]], { title: `真实信号约 ${Math.round(prop * m)} 个`, yLabel: '发现数量', height: 310 });
      const maxShow = Math.min(m, 250);
      const ordered = bh.ordered.slice(0, maxShow);
      Charts.line(root.querySelector('#mt-pvals'), [
        { name: '排序 p 值', data: ordered.map((o, i) => ({ x: i + 1, y: o.p })), points: true, pointRadius: 1.5 },
        { name: 'BH 阶梯线', data: ordered.map((o, i) => ({ x: i + 1, y: ((i + 1) / m) * alpha })), dash: [5, 3] },
      ], { title: `显示最小的 ${maxShow} 个 p 值`, xLabel: '排序 k', yLabel: 'p 值', yExtent: [0, Math.max(.01, ordered.at(-1)?.p || .05)], height: 310 });
    };
    wireControls(root, update, () => seed++);
    update();
    return installResize(update);
  };

  implementations.factor = (root, meta) => {
    let seed = 2024;
    root.innerHTML = labPage(meta,
      String.raw`$$IC_t=Corr(Factor_{i,t},R_{i,t+1}),\qquad ICIR=\frac{Mean(IC_t)}{Std(IC_t)}$$`,
      range('fac-days', '交易日数量', 30, 360, 10, 180, 'int') +
      range('fac-stocks', '每日股票数量', 50, 600, 25, 300, 'int') +
      range('fac-signal', '真实线性信号强度', -.08, .16, .005, .04, 'float3') +
      range('fac-noise', '收益噪声', .3, 2, .1, 1, 'float2') +
      range('fac-outlier', '收益离群点比例', 0, 8, .5, 1.5, 'pct'),
      metricGrid([
        { id: 'pearson', label: 'Mean IC', hint: '每日 Pearson IC 均值' },
        { id: 'rank', label: 'Mean Rank IC', hint: '每日 Spearman IC 均值' },
        { id: 'icir', label: 'Rank ICIR', hint: '均值 / 时间序列标准差' },
        { id: 'hit', label: 'Rank IC 正值比例', hint: '方向稳定性' },
        { id: 't', label: 'Rank IC 均值 t 值', hint: '此处为朴素独立日假设' },
        { id: 'ls', label: 'Q5−Q1 平均收益', hint: '分层多空收益（模拟单位）' },
      ]),
      `<div class="chart-grid two">${chartCard('fac-ic', '每日 Rank IC 分布')}${chartCard('fac-buckets', '因子五分组收益')}</div>${chartCard('fac-roll', '滚动 Rank IC')}`,
      `<p>IC 衡量横截面线性关系，Rank IC 衡量排序关系。两者均值相近时，信号大致线性且不太受极端值影响；离群点增多时，Rank IC 通常更稳健。完整研究还要检查时间稳定性、行业/市值中性化、换手、成本、容量和多重检验。</p>`
    );
    const update = () => {
      const rng = mulberry32(seed), days = val(root, 'fac-days'), stocks = val(root, 'fac-stocks'), signal = val(root, 'fac-signal'), noise = val(root, 'fac-noise'), outlier = val(root, 'fac-outlier') / 100;
      const ics = [], rics = [], qSums = Array(5).fill(0), qCounts = Array(5).fill(0);
      for (let d = 0; d < days; d++) {
        const f = [], r = [];
        for (let i = 0; i < stocks; i++) {
          const x = normal(rng);
          let e = noise * normal(rng);
          if (rng() < outlier) e += noise * 9 * normal(rng);
          f.push(x); r.push(signal * x + e);
        }
        ics.push(correlation(f, r)); rics.push(spearman(f, r));
        const order = f.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
        order.forEach((o, rank) => {
          const q = Math.min(4, Math.floor(rank / stocks * 5)); qSums[q] += r[o.i]; qCounts[q]++;
        });
      }
      const mi = mean(ics), mr = mean(rics), sr = std(rics), icir = mr / sr, hit = rics.filter(x => x > 0).length / days, t = mr / (sr / Math.sqrt(days));
      const qs = qSums.map((s, i) => s / qCounts[i]), ls = qs[4] - qs[0];
      setMetric(root, 'pearson', fmt(mi, 4));
      setMetric(root, 'rank', fmt(mr, 4), mr * signal > 0 ? 'good' : 'warn');
      setMetric(root, 'icir', fmt(icir, 3));
      setMetric(root, 'hit', pct(hit, 1));
      setMetric(root, 't', fmt(t, 2), Math.abs(t) > 2 ? 'good' : 'warn');
      setMetric(root, 'ls', fmt(ls, 4), ls * signal > 0 ? 'good' : 'warn');
      Charts.histogram(root.querySelector('#fac-ic'), rics, { title: `Mean=${mr.toFixed(3)}；Std=${sr.toFixed(3)}`, bins: 36, height: 310, xLabel: 'Rank IC', yLabel: '密度' });
      Charts.bars(root.querySelector('#fac-buckets'), ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'], qs, { title: '按因子从低到高分组', yLabel: '平均未来收益', height: 310 });
      const win = Math.min(20, Math.max(5, Math.floor(days / 8))), roll = [];
      for (let i = win - 1; i < days; i++) roll.push({ x: i + 1, y: mean(rics.slice(i - win + 1, i + 1)) });
      Charts.line(root.querySelector('#fac-roll'), [
        { name: `${win} 日滚动 Rank IC`, data: roll },
        { name: '全样本均值', data: [{ x: win, y: mr }, { x: days, y: mr }], dash: [5, 3] },
      ], { title: '信号稳定性比单一均值更重要', xLabel: '交易日', yLabel: 'Rank IC', height: 300, zeroLine: true });
    };
    wireControls(root, update, () => seed++);
    update();
    return installResize(update);
  };

  implementations.decay = (root, meta) => {
    root.innerHTML = labPage(meta,
      String.raw`$$IC(h)=IC_0e^{-\ln(2)(h-1)/H},\qquad Net(h)=Gross(h)-Turnover(h)\times Cost$$`,
      range('dec-ic', '初始 IC₀', .005, .12, .005, .05, 'float3') +
      range('dec-half', '信号半衰期 H（日）', 1, 30, 1, 6, 'int') +
      range('dec-turn', '1 日换手率', 10, 200, 5, 100, 'pct') +
      range('dec-cost', '单边综合成本', 1, 40, 1, 10, 'bps') +
      range('dec-h', '当前持有期 h', 1, 30, 1, 5, 'int'),
      metricGrid([
        { id: 'ic', label: '当前持有期 IC', hint: '指数衰减示意' },
        { id: 'turn', label: '估计换手率', hint: '示意模型：随持有期下降' },
        { id: 'gross', label: '毛收益贡献', hint: '模拟映射，单位 bp' },
        { id: 'cost', label: '成本拖累', hint: '换手 × 单边成本 × 2' },
        { id: 'net', label: '净收益贡献', hint: '毛收益 − 成本' },
        { id: 'best', label: '示意最优持有期', hint: '当前参数下净收益最大' },
      ]),
      chartCard('dec-chart', '持有期、信号与净收益'),
      `<p>这是一套教学用结构模型，不是经验定价公式。它的作用是把三个常被割裂的量放到一起：信号会衰减、延长持有期可降低换手、交易成本会吞噬毛收益。真实最优再平衡频率必须用可成交回测和容量模型估计。</p>`
    );
    const update = () => {
      const ic0 = val(root, 'dec-ic'), half = val(root, 'dec-half'), turn0 = val(root, 'dec-turn') / 100, costBps = val(root, 'dec-cost'), current = val(root, 'dec-h');
      const rows = [];
      for (let h = 1; h <= 30; h++) {
        const ic = ic0 * Math.exp(-Math.LN2 * (h - 1) / half);
        const turnover = Math.min(2, turn0 / Math.sqrt(h));
        const gross = 300 * ic * Math.sqrt(h);
        const cost = turnover * costBps * 2;
        rows.push({ h, ic, turnover, gross, cost, net: gross - cost });
      }
      const row = rows[current - 1], best = rows.reduce((a, b) => b.net > a.net ? b : a, rows[0]);
      setMetric(root, 'ic', fmt(row.ic, 4));
      setMetric(root, 'turn', pct(row.turnover, 1));
      setMetric(root, 'gross', bps(row.gross));
      setMetric(root, 'cost', bps(row.cost), 'warn');
      setMetric(root, 'net', bps(row.net), row.net > 0 ? 'good' : 'bad');
      setMetric(root, 'best', `${best.h} 日（${bps(best.net)}）`, 'good');
      Charts.line(root.querySelector('#dec-chart'), [
        { name: '毛收益', data: rows.map(r => ({ x: r.h, y: r.gross })) },
        { name: '成本', data: rows.map(r => ({ x: r.h, y: r.cost })) },
        { name: '净收益', data: rows.map(r => ({ x: r.h, y: r.net })) },
        { name: '当前', data: [{ x: row.h, y: row.net }], points: true, pointRadius: 5 },
      ], { title: `IC 半衰期 ${half} 日；成本 ${costBps} bp/边`, xLabel: '持有期（日）', yLabel: '示意收益贡献（bp）', height: 350, zeroLine: true });
    };
    wireControls(root, update);
    update();
    return installResize(update);
  };

  implementations.fmb = (root, meta) => {
    let seed = 2800;
    root.innerHTML = labPage(meta,
      String.raw`$$R_{i,t+1}=\alpha_t+\lambda_t Factor_{i,t}+\varepsilon_{i,t+1},\qquad \bar\lambda=\frac1T\sum_{t=1}^{T}\widehat\lambda_t$$`,
      range('fmb-days', '横截面期数 T', 30, 360, 10, 180, 'int') +
      range('fmb-stocks', '每期股票数 N', 50, 800, 25, 300, 'int') +
      range('fmb-lambda', '真实平均风险溢价', -15, 30, 1, 8, 'bps') +
      range('fmb-time-rho', 'λₜ 时间自相关', 0, .9, .05, .55, 'float2') +
      range('fmb-noise', '横截面收益噪声', .5, 3, .1, 1.2, 'float2'),
      metricGrid([
        { id: 'mean', label: '平均 λ̂', hint: '逐期斜率的时间均值' },
        { id: 'naive', label: '朴素 t 值', hint: '假设 λ̂ₜ 时间独立' },
        { id: 'hac', label: 'HAC t 值', hint: '允许有限阶时间相关' },
        { id: 'pos', label: 'λ̂ 正值比例', hint: '方向稳定性' },
      ]),
      `<div class="chart-grid two">${chartCard('fmb-series', '逐期风险溢价')}${chartCard('fmb-hist', 'λ̂ 时间分布')}</div>`,
      `<p>Fama–MacBeth 的第一步在每个时点做横截面回归，第二步对斜率时间序列进行推断。若风险溢价本身存在持续性，朴素标准误会偏小，HAC t 值通常更保守。真实研究还需要处理特征测量误差、行业聚类和可交易标签。</p>`
    );
    const update = () => {
      const rng = mulberry32(seed), T = val(root, 'fmb-days'), N = val(root, 'fmb-stocks'), lambdaMean = val(root, 'fmb-lambda') / 10000, rho = val(root, 'fmb-time-rho'), noise = val(root, 'fmb-noise') * .01;
      const lambdas = [];
      let latent = lambdaMean;
      const innovationSd = .006 * Math.sqrt(Math.max(.01, 1 - rho * rho));
      for (let t = 0; t < T; t++) {
        latent = lambdaMean + rho * (latent - lambdaMean) + innovationSd * normal(rng);
        const x = [], y = [];
        for (let i = 0; i < N; i++) { const f = normal(rng); x.push(f); y.push(latent * f + noise * normal(rng)); }
        lambdas.push(olsSimple(x, y).beta);
      }
      const m = mean(lambdas), naiveSE = std(lambdas) / Math.sqrt(T), lag = Math.max(1, Math.floor(4 * Math.pow(T / 100, 2 / 9))), hacSE = neweyWestSEMean(lambdas, lag);
      setMetric(root, 'mean', bps(m * 10000));
      setMetric(root, 'naive', fmt(m / naiveSE, 2));
      setMetric(root, 'hac', `${fmt(m / hacSE, 2)}（lag=${lag}）`, Math.abs(m / hacSE) > 2 ? 'good' : 'warn');
      setMetric(root, 'pos', pct(lambdas.filter(x => x > 0).length / T, 1));
      Charts.line(root.querySelector('#fmb-series'), [
        { name: 'λ̂ₜ', data: lambdas.map((y, x) => ({ x: x + 1, y: y * 10000 })) },
        { name: '平均 λ̂', data: [{ x: 1, y: m * 10000 }, { x: T, y: m * 10000 }], dash: [5, 3] },
      ], { title: `真实均值=${(lambdaMean * 10000).toFixed(1)} bp`, xLabel: '时期 t', yLabel: '风险溢价（bp）', height: 310, zeroLine: true });
      Charts.histogram(root.querySelector('#fmb-hist'), lambdas.map(x => x * 10000), { title: '逐期斜率分布', bins: 38, height: 310, xLabel: 'λ̂（bp）', yLabel: '密度' });
    };
    wireControls(root, update, () => seed++);
    update();
    return installResize(update);
  };

  implementations.overfit = (root, meta) => {
    let seed = 2900;
    root.innerHTML = labPage(meta,
      String.raw`$$\widehat S_{winner}^{IS}=\max_{j\le M}\widehat S_j^{IS},\qquad E[\max Z_j]\uparrow\text{ as }M\uparrow$$`,
      range('of-m', '候选策略数量 M', 10, 1500, 10, 300, 'int') +
      range('of-n', '样本内交易日', 126, 1260, 21, 504, 'int') +
      range('of-prop', '真实有效策略比例', 0, .2, .01, .03, 'decPct') +
      range('of-true', '有效策略真实 Sharpe', .2, 2.5, .1, 1, 'float2') +
      range('of-corr', 'IS/OOS 状态稳定度', 0, .9, .05, .35, 'float2'),
      metricGrid([
        { id: 'bestis', label: '赢家样本内 Sharpe', hint: '在 M 个候选中取最大' },
        { id: 'bestoos', label: '同一策略样本外 Sharpe', hint: '独立/弱相关估计' },
        { id: 'gap', label: '选择乐观偏差', hint: 'IS − OOS' },
        { id: 'truth', label: '赢家真实类型', hint: '模拟中可观察，现实中不可观察' },
        { id: 'prob', label: '重复实验选中真策略概率', hint: '100 次 Monte Carlo' },
        { id: 'falsemax', label: '零 Alpha 策略最大 IS', hint: '纯噪声也会产生漂亮回测' },
      ]),
      `<div class="chart-grid two">${chartCard('of-scatter', '样本内与样本外')}${chartCard('of-rank', '样本内前 20 名的 OOS')}</div>`,
      `<p>候选策略越多，最大样本内 Sharpe 越容易只是噪声极值。样本外表现回落并不一定表示市场“突然失效”，也可能是选择偏差的必然结果。应在研究登记中记录完整搜索空间，并保留真正独立的最终测试集。</p>`
    );

    function oneRun(rng, M, n, prop, trueSharpe, stability) {
      const sd = Math.sqrt(252 / n);
      const rows = [];
      for (let j = 0; j < M; j++) {
        const active = rng() < prop, truth = active ? trueSharpe : 0;
        const common = normal(rng), independent = normal(rng);
        const is = truth + sd * common;
        const oos = truth + sd * (stability * common + Math.sqrt(Math.max(0, 1 - stability ** 2)) * independent);
        rows.push({ is, oos, active, truth });
      }
      rows.sort((a, b) => b.is - a.is);
      return rows;
    }

    const update = () => {
      const rng = mulberry32(seed), M = val(root, 'of-m'), n = val(root, 'of-n'), prop = val(root, 'of-prop'), trueS = val(root, 'of-true'), stability = val(root, 'of-corr');
      const rows = oneRun(rng, M, n, prop, trueS, stability), winner = rows[0];
      const nullMax = Math.max(...rows.filter(r => !r.active).map(r => r.is), -Infinity);
      let trueWins = 0;
      for (let r = 0; r < 100; r++) if (oneRun(rng, M, n, prop, trueS, stability)[0].active) trueWins++;
      setMetric(root, 'bestis', fmt(winner.is, 2), 'good');
      setMetric(root, 'bestoos', fmt(winner.oos, 2), winner.oos > 0 ? 'good' : 'bad');
      setMetric(root, 'gap', fmt(winner.is - winner.oos, 2), winner.is - winner.oos > .7 ? 'warn' : '');
      setMetric(root, 'truth', winner.active ? '真实有效' : '纯噪声', winner.active ? 'good' : 'bad');
      setMetric(root, 'prob', `${trueWins}%`, trueWins >= 70 ? 'good' : 'warn');
      setMetric(root, 'falsemax', Number.isFinite(nullMax) ? fmt(nullMax, 2) : '无零 Alpha 策略', Number.isFinite(nullMax) && nullMax > 1.5 ? 'warn' : '');
      const sample = rows.length > 600 ? rows.filter((_, i) => i < 60 || i % Math.ceil(rows.length / 500) === 0) : rows;
      Charts.scatter(root.querySelector('#of-scatter'), sample.map(r => ({ x: r.is, y: r.oos })), { title: `M=${M}；选中策略已高亮在指标卡`, xLabel: 'IS Sharpe', yLabel: 'OOS Sharpe', height: 320, crosshair: true, alpha: .45 });
      const top = rows.slice(0, Math.min(20, M));
      Charts.bars(root.querySelector('#of-rank'), top.map((_, i) => `#${i + 1}`), [top.map(r => r.is), top.map(r => r.oos)], { title: '按 IS 排名后的前 20 名', yLabel: 'Sharpe', height: 320 });
    };
    wireControls(root, update, () => seed++);
    update();
    return installResize(update);
  };

  function drawValidation(canvas, mode, total, train, test, purge, embargo, folds) {
    const { ctx, width, height, colors } = Charts.setup(canvas, 360);
    ctx.save();
    ctx.fillStyle = colors.ink; ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'; ctx.fillText('验证窗口时间轴', 14, 16);
    const left = 70, right = 24, top = 52, rowH = 42, usable = width - left - right;
    const x = v => left + (v / total) * usable;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const rows = [];
    if (mode === 'random') {
      for (let f = 0; f < folds; f++) rows.push({ train: [[0, total]], test: [[0, total]], random: true });
    } else {
      for (let f = 0; f < folds; f++) {
        const testStart = Math.min(total - test, train + f * test);
        if (testStart >= total) break;
        const trainStart = mode === 'rolling' ? Math.max(0, testStart - train) : 0;
        const trainEnd = Math.max(trainStart, testStart - purge);
        rows.push({ train: [[trainStart, trainEnd]], purge: [[trainEnd, testStart]], test: [[testStart, Math.min(total, testStart + test)]], embargo: [[Math.min(total, testStart + test), Math.min(total, testStart + test + embargo)]] });
      }
    }
    rows.forEach((row, i) => {
      const y = top + i * rowH;
      ctx.fillStyle = colors.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(`Fold ${i + 1}`, left - 10, y + 12);
      ctx.fillStyle = colors.grid; ctx.fillRect(left, y, usable, 24);
      if (row.random) {
        const rng = mulberry32(9000 + i);
        for (let t = 0; t < total; t++) {
          const isTest = rng() < test / (train + test);
          ctx.fillStyle = isTest ? colors.accent2 : colors.accent;
          ctx.fillRect(x(t), y, Math.max(1, usable / total), 24);
        }
      } else {
        const paint = (segments, color) => (segments || []).forEach(([a, b]) => { ctx.fillStyle = color; ctx.fillRect(x(a), y, Math.max(1, x(b) - x(a)), 24); });
        paint(row.train, colors.accent); paint(row.purge, colors.negative); paint(row.test, colors.accent2); paint(row.embargo, colors.accent3);
      }
    });
    const yAxis = top + rows.length * rowH + 8;
    ctx.strokeStyle = colors.ink; ctx.beginPath(); ctx.moveTo(left, yAxis); ctx.lineTo(left + usable, yAxis); ctx.stroke();
    ctx.fillStyle = colors.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let t = 0; t <= total; t += Math.max(1, Math.round(total / 6))) { ctx.fillText(String(t), x(t), yAxis + 6); }
    const legend = [['训练', colors.accent], ['Purge', colors.negative], ['测试', colors.accent2], ['Embargo', colors.accent3]];
    let lx = left; const ly = height - 28;
    legend.forEach(([lab, color]) => { ctx.fillStyle = color; ctx.fillRect(lx, ly, 15, 10); ctx.fillStyle = colors.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(lab, lx + 20, ly + 5); lx += 76; });
    ctx.restore();
  }

  implementations.validation = (root, meta) => {
    root.innerHTML = labPage(meta,
      String.raw`$$Train\cap LabelWindow(Test)=\varnothing,\qquad Embargo\;blocks\;nearby\;information\;reuse$$`,
      select('cv-mode', '切分方式', [{ value: 'random', label: '随机 K 折（不适合时序标签）' }, { value: 'rolling', label: '滚动窗口' }, { value: 'expanding', label: '扩展窗口' }], 'expanding') +
      range('cv-total', '总时间长度', 72, 240, 12, 144, 'int') +
      range('cv-train', '训练窗口长度', 24, 120, 6, 60, 'int') +
      range('cv-test', '测试窗口长度', 6, 36, 3, 12, 'int') +
      range('cv-purge', 'Purge 长度', 0, 12, 1, 3, 'int') +
      range('cv-embargo', 'Embargo 长度', 0, 12, 1, 3, 'int') +
      range('cv-folds', '最大折数', 2, 8, 1, 6, 'int'),
      metricGrid([
        { id: 'folds', label: '实际可用折数', hint: '受总时间长度约束' },
        { id: 'firsttrain', label: '首折训练样本', hint: '扣除 purge 后' },
        { id: 'leak', label: '标签泄漏风险', hint: '随机切分通常为高' },
        { id: 'testshare', label: '测试覆盖比例', hint: '各折测试窗口并集 / 全样本' },
      ]),
      chartCard('cv-chart', '切分时间轴'),
      `<p>时间序列验证首先要维护因果顺序。若标签跨越未来多个交易日，训练样本的标签窗口可能与测试期重叠，因此需要 purge；测试结束后的短期样本还可能共享信息或持仓路径，因此可设置 embargo。随机 K 折会把未来样本放进训练集，通常不适合这类任务。</p>`
    );
    const update = () => {
      const mode = strVal(root, 'cv-mode'), total = val(root, 'cv-total'), train = Math.min(val(root, 'cv-train'), total - 1), test = val(root, 'cv-test'), purge = val(root, 'cv-purge'), embargo = val(root, 'cv-embargo'), maxF = val(root, 'cv-folds');
      let actual = mode === 'random' ? maxF : Math.max(0, Math.min(maxF, Math.floor((total - train) / test)));
      const firstTrain = mode === 'random' ? Math.round(total * train / (train + test)) : Math.max(0, train - purge);
      const covered = mode === 'random' ? Math.min(1, test / (train + test)) : Math.min(1, actual * test / total);
      setMetric(root, 'folds', String(actual));
      setMetric(root, 'firsttrain', String(firstTrain));
      setMetric(root, 'leak', mode === 'random' ? '高' : purge > 0 ? '较低' : '中等', mode === 'random' ? 'bad' : purge > 0 ? 'good' : 'warn');
      setMetric(root, 'testshare', pct(covered, 1));
      drawValidation(root.querySelector('#cv-chart'), mode, total, train, test, purge, embargo, actual);
    };
    wireControls(root, update);
    update();
    return installResize(update);
  };

  implementations.csv = (root, meta) => {
    root.innerHTML = labPage(meta,
      String.raw`$$Sharpe_{ann}=\frac{\bar r}{s_r}\sqrt{A},\qquad Wealth_t=\prod_{j\le t}(1+r_j)$$`,
      `<label class="control file-control"><span class="control-label">选择本地 CSV</span><input id="csv-file" type="file" accept=".csv,text/csv"><small>文件只在当前浏览器标签页读取。</small></label>` +
      `<label class="control"><span class="control-label">数值列</span><select id="csv-column"><option value="sample">示例收益率</option></select></label>` +
      range('csv-periods', '年化周期数 A', 12, 365, 1, 252, 'int') +
      `<button class="button secondary full" id="csv-sample" type="button">恢复示例数据</button>`,
      metricGrid([
        { id: 'n', label: '有效观测数', hint: '自动忽略无法解析的单元格' },
        { id: 'mean', label: '单期均值', hint: '算术平均' },
        { id: 'vol', label: '单期标准差', hint: '样本标准差' },
        { id: 'sharpe', label: '年化 Sharpe', hint: '未扣无风险利率' },
        { id: 'skew', label: '偏度', hint: '负值表示左尾更长' },
        { id: 'kurt', label: '超额峰度', hint: '正态基准为 0' },
        { id: 'ci', label: '均值 95% 区间', hint: 'IID t 区间，仅作初步诊断' },
        { id: 'mdd', label: '最大回撤', hint: '按输入列视为简单收益构造财富' },
      ]),
      `<div class="chart-grid two">${chartCard('csv-hist', '收益分布')}${chartCard('csv-wealth', '财富曲线')}</div>`,
      `<p>该工具适合快速审计一列收益率或 IC。它不会自动识别百分数格式、复权规则、频率、缺失机制或时间依赖；这些语义必须由研究者确认。若数据存在自相关，应改用 HAC 或 Block Bootstrap 区间。</p>`,
      `<div class="data-status" id="csv-status">当前使用内置示例：带轻微负偏与波动聚集的日收益。</div>`
    );
    let current = [];
    let parsedColumns = {};

    function sampleData() {
      const rng = mulberry32(8888), xs = [];
      let vol = .012;
      for (let i = 0; i < 900; i++) {
        vol = .0008 + .92 * vol + .08 * Math.abs(normal(rng)) * .012;
        let r = .00035 + vol * normal(rng);
        if (rng() < .018) r -= .035 * Math.abs(normal(rng));
        xs.push(Math.max(-.8, r));
      }
      current = xs; parsedColumns = { sample: xs };
      const sel = root.querySelector('#csv-column');
      sel.innerHTML = '<option value="sample">示例收益率</option>';
      root.querySelector('#csv-status').textContent = '当前使用内置示例：带轻微负偏与波动聚集的日收益。';
      update();
    }

    function parseCSV(text) {
      const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(x => x.trim().length);
      if (lines.length < 2) throw new Error('CSV 至少需要表头和一行数据');
      const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].split(';').length > lines[0].split(',').length ? ';' : ',');
      const split = (line) => {
        const out = []; let cell = '', quoted = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') { if (quoted && line[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
          else if (ch === delimiter && !quoted) { out.push(cell.trim()); cell = ''; }
          else cell += ch;
        }
        out.push(cell.trim()); return out;
      };
      const headers = split(lines[0]).map((h, i) => h || `column_${i + 1}`);
      const cols = Object.fromEntries(headers.map(h => [h, []]));
      for (const line of lines.slice(1, 50001)) {
        const cells = split(line);
        headers.forEach((h, i) => {
          const cell = (cells[i] || '').trim();
          const isPercent = /%$/.test(cell);
          const raw = cell.replace(/%$/, '').replace(/,/g, '');
          let x = Number(raw);
          if (isPercent) x /= 100;
          if (Number.isFinite(x)) cols[h].push(x);
        });
      }
      return Object.fromEntries(Object.entries(cols).filter(([, xs]) => xs.length >= 5));
    }

    const update = () => {
      const A = val(root, 'csv-periods');
      const key = strVal(root, 'csv-column');
      current = parsedColumns[key] || current;
      const xs = current.filter(x => Number.isFinite(x) && x > -1);
      if (!xs.length) return;
      const m = mean(xs), s = std(xs), sharpe = s ? m / s * Math.sqrt(A) : NaN, se = s / Math.sqrt(xs.length), crit = tQuantile(.975, Math.max(1, xs.length - 1));
      let wealth = 1, peak = 1, mdd = 0;
      const path = [{ x: 0, y: 1 }];
      xs.forEach((r, i) => { wealth *= 1 + r; peak = Math.max(peak, wealth); mdd = Math.min(mdd, wealth / peak - 1); path.push({ x: i + 1, y: wealth }); });
      setMetric(root, 'n', xs.length.toLocaleString('zh-CN'));
      setMetric(root, 'mean', pct(m, 4));
      setMetric(root, 'vol', pct(s, 3));
      setMetric(root, 'sharpe', fmt(sharpe, 2), sharpe > 1 ? 'good' : sharpe < 0 ? 'bad' : 'warn');
      setMetric(root, 'skew', fmt(skewness(xs), 3));
      setMetric(root, 'kurt', fmt(excessKurtosis(xs), 3));
      setMetric(root, 'ci', `[${pct(m - crit * se, 4)}, ${pct(m + crit * se, 4)}]`);
      setMetric(root, 'mdd', pct(mdd, 1), mdd < -.25 ? 'bad' : 'warn');
      const lo = quantile(xs, .005), hi = quantile(xs, .995);
      Charts.histogram(root.querySelector('#csv-hist'), xs, { title: '截去最外侧 0.5% 仅用于绘图', bins: 55, xExtent: [lo, hi], height: 310, xLabel: '收益率', yLabel: '密度', xFormatter: v => `${(v * 100).toFixed(1)}%` });
      Charts.line(root.querySelector('#csv-wealth'), [{ name: '财富', data: path.filter((_, i) => i < 500 || i % Math.max(1, Math.floor(path.length / 500)) === 0 || i === path.length - 1) }], { title: `最终财富倍数 ${wealth.toFixed(2)}×`, xLabel: '观测序号', yLabel: '财富', height: 310 });
    };

    root.querySelector('#csv-file').addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        parsedColumns = parseCSV(text);
        const keys = Object.keys(parsedColumns);
        if (!keys.length) throw new Error('没有找到至少 5 个有效数值的列');
        const sel = root.querySelector('#csv-column');
        sel.innerHTML = keys.map(k => `<option value="${k.replace(/"/g, '&quot;')}">${k}（${parsedColumns[k].length}）</option>`).join('');
        current = parsedColumns[keys[0]];
        root.querySelector('#csv-status').textContent = `已读取：${file.name}。未向网络发送文件。`;
        update();
      } catch (err) {
        root.querySelector('#csv-status').textContent = `读取失败：${err.message}`;
      }
    });
    root.querySelector('#csv-column').addEventListener('change', update);
    root.querySelector('#csv-sample').addEventListener('click', sampleData);
    root.querySelector('#csv-periods').addEventListener('input', () => { updateControlOutputs(root); update(); });
    root.querySelector('[data-rerun]')?.remove();
    updateControlOutputs(root);
    sampleData();
    return installResize(update);
  };

  // ---------- Public API ----------
  function render(id, root) {
    if (activeCleanup) { try { activeCleanup(); } catch (_) {} activeCleanup = null; }
    const meta = LABS.find(x => x.id === id) || LABS[0];
    const implementation = implementations[meta.id];
    if (!implementation) {
      root.innerHTML = '<div class="empty-state"><h2>实验尚未实现</h2></div>';
      return meta;
    }
    activeCleanup = implementation(root, meta) || null;
    if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([root]).catch(() => {});
    return meta;
  }

  function cleanup() {
    if (activeCleanup) { try { activeCleanup(); } catch (_) {} activeCleanup = null; }
  }

  window.QS_LABS = LABS;
  window.QSDemos = { render, cleanup, stats: { mean, std, quantile, skewness, excessKurtosis, correlation, spearman } };
})();
