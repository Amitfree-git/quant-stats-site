/* A small, dependency-free lesson. The calculation is also testable in Node. */
(function (scope) {
  'use strict';
  const CASES = {
    same: { title: '同向：温度越高，销量越多', y: [100, 150, 200], conclusion: '正协方差：两者倾向于同向偏离各自的均值。第 1 天虽然都低于均值，仍是同向。' },
    opposite: { title: '反向：温度越高，销量越少', y: [200, 150, 100], conclusion: '负协方差：一个高于自己的均值时，另一个低于自己的均值。' },
    zero: { title: '零线性：两头高，中间低', y: [200, 100, 200], conclusion: '协方差为 0：正、负乘积抵消。销量呈 U 型，仍有非线性关系；不能说两个变量独立。' },
  };
  const X = [20, 25, 30];
  function calculate(x, y, sample = false) {
    if (x.length !== y.length || x.length < (sample ? 2 : 1) || !x.every(Number.isFinite) || !y.every(Number.isFinite)) {
      throw new RangeError('需要等长、有效的成对数值；样本至少含 2 对。');
    }
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    const rows = x.map((v, i) => ({ day: i + 1, x: v, y: y[i], dx: v - meanX, dy: y[i] - meanY, product: (v - meanX) * (y[i] - meanY) }));
    const total = rows.reduce((a, r) => a + r.product, 0);
    const denominator = n - (sample ? 1 : 0);
    return { n, meanX, meanY, rows, total, denominator, covariance: total / denominator };
  }
  const number = (v, digits = 4) => (Math.abs(v) < 1e-10 ? 0 : v).toLocaleString('zh-CN', { maximumFractionDigits: digits });
  const signed = v => (v > 1e-10 ? '+' : '') + number(v);
  const tone = v => v > 1e-10 ? 'positive' : v < -1e-10 ? 'negative' : 'neutral';
  const signText = v => v > 1e-10 ? '正' : v < -1e-10 ? '负' : '零';
  const STEPS = [
    ['先看三天记录', '先不算公式。每一行是一对记录：同一天的温度与冰淇淋销量。这里是教学数据，不是在证明温度造成销量变化。'],
    ['给两组数据各找一个中心', '温度有温度的均值，销量有销量的均值。我们比较的是各自相对中心的位置，不是拿摄氏度和支数直接比较。'],
    ['每个数减去自己的均值', '偏差 = 当天数值 − 自己这组的均值。负号表示低于均值，正号表示高于均值；不是表示亏损或赚钱。'],
    ['把同一天的两个偏差相乘', '负 × 负、正 × 正都是正：同向偏离。负 × 正、正 × 负都是负：反向偏离。任一偏差为 0，乘积就是 0。'],
    ['把乘积相加，再按所选口径除', '协方差保留了方向，也考虑偏离的大小。它是乘积的汇总，不是数一数“正的天数”比“负的天数”多多少。'],
  ];
  const QUIZ = [
    { question: '温度偏差 −5 ℃，销量偏差 −50 支，乘积是什么？', options: ['−250：因为都低于均值', '+250：因为负数 × 负数为正', '0：因为两个负号抵消了数值'], correct: 1, feedback: '（−5）×（−50）= +250 ℃·支。两个数都低于各自的均值，属于同向偏离。' },
    { question: '反向例中，乘积为 −250、0、−250。把 3 天作为总体，协方差约为多少？', options: ['−166.6667 ℃·支', '−250 ℃·支', '+166.6667 ℃·支'], correct: 0, feedback: '先加起来得到 −500，再除以 3，得到约 −166.6667 ℃·支。除以 2 的 −250 是样本口径。' },
    { question: '“零线性”例的协方差为 0，可以推出什么？', options: ['温度和销量一定独立', '销量完全不变', '这组数据的正负线性贡献恰好抵消'], correct: 2, feedback: '只能说这组数据的线性贡献抵消。销量随温度呈 U 型变化，零协方差不等于独立。' },
    { question: '若各天的偏差乘积有 1 个很大的负值、2 个较小的正值，协方差一定为正吗？', options: ['一定：正数天数更多', '不一定：需要比较乘积的总和'], correct: 1, feedback: '必须相加看大小。比如 −100、+10、+10 相加为 −80；正数的个数多也不保证总和为正。' },
  ];
  function scatter(data, step, selected) {
    const px = v => 65 + (v - 18) / 14 * 470;
    const py = v => 260 - (v - 75) / 150 * 220;
    const mx = px(data.meanX), my = py(data.meanY);
    return `<svg class="cov-scatter" viewBox="0 0 600 320" role="img" aria-labelledby="cov-plot-title cov-plot-desc">
      <title id="cov-plot-title">三天温度与销量散点图</title><desc id="cov-plot-desc">${data.rows.map(r => `第${r.day}天，${r.x}摄氏度，销量${r.y}支`).join('；')}。${step >= 2 ? `虚线是各自均值：${number(data.meanX)}摄氏度、${number(data.meanY)}支。` : ''}具体数值也在下方表格中。</desc>
      ${[100, 150, 200].map(y => `<line x1="65" x2="535" y1="${py(y)}" y2="${py(y)}" class="cov-grid"/><text x="55" y="${py(y) + 5}" text-anchor="end">${y}</text>`).join('')}
      <path d="M65 35V265H545" class="cov-axis"/>
      ${X.map(x => `<text x="${px(x)}" y="288" text-anchor="middle">${x}</text>`).join('')}
      <text x="65" y="20">销量（支）</text><text x="535" y="313" text-anchor="end">温度（℃）</text>
      ${step >= 2 ? `<path d="M${mx} 35V265M65 ${my}H535" class="cov-mean-line"/>` : ''}
      ${data.rows.map(r => `<g class="cov-point ${step >= 4 ? `cov-${tone(r.product)}` : ''} ${r.day === selected ? 'is-selected' : ''}"><circle cx="${px(r.x)}" cy="${py(r.y)}" r="${r.day === selected ? 11 : 8}"/><text x="${px(r.x) + (r.day === 3 ? -17 : 17)}" y="${py(r.y) - 14}" text-anchor="${r.day === 3 ? 'end' : 'start'}">第 ${r.day} 天${step >= 4 ? ` · ${signText(r.product)}` : ''}</text></g>`).join('')}
    </svg>`;
  }
  function render(root, meta) {
    let currentCase = 'same', step = 1, selected = 1, sample = false;
    const answers = new Map();
    root.innerHTML = `<article class="lab-page cov-lesson">
      <div class="crumbs"><a href="#/home">首页</a><span>/</span><a href="#/labs">交互实验室</a><span>/</span><span>协方差入门</span></div>
      <header class="lab-header"><div><span class="eyebrow">五小步 · 先理解，再看公式</span><h1>${meta.title}</h1><p>从三天的温度和冰淇淋销量，弄懂“共同变化”到底在算什么。</p></div><div class="lab-links"><a class="lesson-chip" href="#/lesson/l04">回到 L04 课程</a></div></header>
      <section class="cov-controls" aria-label="实验选择">
        <label class="control"><span class="control-label">选择一个例子</span><select id="cov-case">${Object.entries(CASES).map(([key, value]) => `<option value="${key}">${value.title}</option>`).join('')}</select></label>
        <button class="button secondary" id="cov-reset" type="button">从第 1 步重新看</button>
      </section>
      <nav class="cov-steps" aria-label="学习步骤">${['记录', '均值', '偏差', '乘积', '汇总'].map((label, i) => `<button type="button" data-step="${i + 1}" aria-label="第 ${i + 1} 步：${label}"><span>${i + 1}</span>${label}</button>`).join('')}</nav>
      <section class="cov-stage" aria-labelledby="cov-step-heading"><div id="cov-explanation" aria-live="polite" aria-atomic="true"></div>
        <div id="cov-visual"></div><div id="cov-table"></div><div id="cov-detail"></div>
        <div id="cov-summary" hidden></div>
        <div class="cov-step-actions"><button class="button secondary" id="cov-prev" type="button">← 上一步</button><span id="cov-step-count"></span><button class="button" id="cov-next" type="button">下一步 →</button></div>
      </section>
      <section class="cov-after" id="cov-after" hidden>
        <section class="interpretation"><h2>现在再把过程写成公式</h2><p class="cov-formula">总体协方差 = Σ［（温度 − 温度均值）×（销量 − 销量均值）］÷ n</p><p>Σ（读作 Sigma，西格玛）就是“把每一天的结果加起来”；n 是天数。样本协方差把分母改成 n − 1。</p>
          <details><summary>为什么有 n 和 n − 1 两种口径？</summary><p>若只描述这完整的 3 天，把它们视为总体，除以 3。若用这 3 天的随机样本去估计更大总体的协方差，通常除以 3 − 1 = 2；在独立同分布等条件下，这样得到无偏估计。改分母不改变正负方向，也不能让少量数据自动变得可靠。</p></details>
          <h3>先记住这四件事</h3><ul><li>“共同低于均值”也是同向，所以负 × 负为正。</li><li>协方差受单位影响：把销量从“支”改为“打”，数值会缩小为原来的 1/12，关系没有改变。</li><li>协方差为 0 不等于独立，也不等于完全没有关系。</li><li>正协方差不保证赚钱，不说明因果；它只描述两组数据的线性共同变化。</li></ul>
          <details><summary>下一小步：与相关系数有什么联系？</summary><p>两组标准差都非零时，用协方差除以两组标准差的乘积，就得到无单位、介于 −1 与 +1 的 Pearson 相关系数。分子与分母要采用一致的总体或样本口径。它仍只衡量线性关系；这里先不需要学习矩阵。</p></details>
        </section>
        <section class="interpretation cov-quiz" aria-label="协方差小练习"><h2>不看答案，试着判断</h2><p>选一个答案后才会显示反馈。答错可以重试。</p>${QUIZ.map((q, i) => `<fieldset><legend>${i + 1}. ${q.question}</legend><div class="cov-options">${q.options.map((o, j) => `<button class="button secondary" type="button" data-question="${i}" data-answer="${j}" aria-pressed="false">${o}</button>`).join('')}</div><p id="cov-feedback-${i}" class="cov-feedback" aria-live="polite" hidden></p></fieldset>`).join('')}</section>
        <p class="cov-footer">这次能说清“先减均值、再相乘、最后汇总”，就够了。<a href="#/lesson/l04">回到课程继续阅读 →</a></p>
      </section>
    </article>`;
    const query = selector => root.querySelector(selector);
    function update() {
      const data = calculate(X, CASES[currentCase].y, sample);
      query('#cov-explanation').innerHTML = `<span class="eyebrow">第 ${step} / 5 步</span><h2 id="cov-step-heading">${STEPS[step - 1][0]}</h2><p>${STEPS[step - 1][1]}</p>`;
      root.querySelectorAll('[data-step]').forEach(button => {
        const active = Number(button.dataset.step) === step;
        button.classList.toggle('active', active);
        if (active) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
      });
      query('#cov-visual').innerHTML = `<div class="cov-visual-grid"><figure>${scatter(data, step, selected)}<figcaption>${step >= 2 ? `虚线交点是两个均值：${number(data.meanX)} ℃、${number(data.meanY)} 支。` : '横轴看温度，纵轴看销量；每一个点是同一天的一对记录。'}${step >= 4 ? '点旁的“正 / 负 / 零”标出偏差乘积的符号。' : ''}</figcaption></figure><aside class="cov-observe"><h3>${step >= 2 ? '各找各的均值' : '观察这个例子'}</h3>${step >= 2 ? `<p>温度：(${X.join(' + ')}) ÷ 3<br><strong>${number(data.meanX)} ℃</strong></p><p>销量：(${CASES[currentCase].y.join(' + ')}) ÷ 3<br><strong>${number(data.meanY)} 支</strong></p>` : `<p>${CASES[currentCase].title}</p><p>先点“下一步”，给这两组数据各找一个比较基准。</p>`}<p class="cov-rounding">小数最多显示 4 位，计算使用未四舍五入的值。</p></aside></div>`;
      query('#cov-table').innerHTML = `<div class="cov-table-scroll" tabindex="0" role="region" aria-label="三天计算表，可横向滚动"><table class="cov-table"><caption>每次只多看一小步${step >= 3 ? '：偏差 = 数值 − 自己的均值' : ''}</caption><thead><tr><th scope="col">记录</th><th scope="col">温度（℃）</th><th scope="col">销量（支）</th>${step >= 3 ? '<th scope="col">温度偏差（℃）</th><th scope="col">销量偏差（支）</th>' : ''}${step >= 4 ? '<th scope="col">偏差乘积（℃·支）</th>' : ''}</tr></thead><tbody>${data.rows.map(r => `<tr class="${r.day === selected ? 'is-selected' : ''}"><th scope="row"><button type="button" data-day="${r.day}" aria-pressed="${r.day === selected}">第 ${r.day} 天</button></th><td>${r.x}</td><td>${r.y}</td>${step >= 3 ? `<td>${signed(r.dx)}</td><td>${signed(r.dy)}</td>` : ''}${step >= 4 ? `<td class="cov-${tone(r.product)}"><strong>${signed(r.product)}</strong>（${signText(r.product)}）</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
      const row = data.rows[selected - 1];
      const detail = step < 3 ? '点击表格中的某一天，可以在图中突出显示它。' : step === 3 ? `温度偏差：${row.x} − ${number(data.meanX)} = ${signed(row.dx)} ℃；销量偏差：${row.y} − ${number(data.meanY)} = ${signed(row.dy)} 支。` : `（${signed(row.dx)}）×（${signed(row.dy)}）= ${signed(row.product)} ℃·支。${Math.abs(row.product) < 1e-10 ? '至少一个偏差为 0，这一天不贡献正负方向。' : row.product > 0 ? '两个偏差同号：同向偏离均值，乘积为正。' : '两个偏差异号：反向偏离均值，乘积为负。'}`;
      query('#cov-detail').innerHTML = `<div class="cov-day-detail" role="status"><strong>第 ${selected} 天 · </strong>${detail}</div>`;
      query('#cov-summary').hidden = step !== 5;
      query('#cov-summary').innerHTML = `<div class="cov-total"><label class="control"><span class="control-label">计算口径</span><select id="cov-basis"><option value="population" ${!sample ? 'selected' : ''}>总体：描述这完整的 3 天，除以 n = 3</option><option value="sample" ${sample ? 'selected' : ''}>样本：估计更大总体，除以 n − 1 = 2</option></select></label><p>偏差乘积相加：${data.rows.map(r => `（${signed(r.product)}）`).join(' + ')} = <strong>${signed(data.total)}</strong> ℃·支</p><div class="cov-result cov-${tone(data.covariance)}"><span>${sample ? '样本' : '总体'}协方差 · ${signText(data.covariance)}</span><strong id="cov-result-value">${signed(data.covariance)} <small>℃·支</small></strong><p>${signed(data.total)} ÷ ${data.denominator} ${Number.isInteger(data.covariance) ? '=' : '≈'} ${signed(data.covariance)}</p></div><p>${CASES[currentCase].conclusion}</p>${currentCase === 'zero' ? '<p>两头销量一样高，中间低。左右两端的偏差乘积大小相等、符号相反，所以抵消。</p>' : ''}</div>`;
      query('#cov-after').hidden = step !== 5;
      query('#cov-prev').disabled = step === 1;
      query('#cov-next').disabled = step === 5;
      query('#cov-next').textContent = step === 5 ? '已到最后一步' : '下一步 →';
      query('#cov-step-count').textContent = `${step} / 5`;
    }
    function resetAnswers() {
      answers.clear();
      root.querySelectorAll('[data-question]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      root.querySelectorAll('.cov-feedback').forEach(p => { p.hidden = true; p.textContent = ''; });
    }
    function onClick(event) {
      const button = event.target.closest('button');
      if (!button || !root.contains(button)) return;
      if (button.dataset.question !== undefined) {
        const i = Number(button.dataset.question), answer = Number(button.dataset.answer), q = QUIZ[i];
        answers.set(i, answer);
        root.querySelectorAll(`[data-question="${i}"]`).forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.answer) === answer)));
        const feedback = query(`#cov-feedback-${i}`);
        feedback.hidden = false;
        feedback.textContent = `${answer === q.correct ? '答对了。' : '再想一想。'}${q.feedback}`;
        return;
      }
      if (button.dataset.step) step = Number(button.dataset.step);
      else if (button.dataset.day) selected = Number(button.dataset.day);
      else if (button.id === 'cov-next') step = Math.min(5, step + 1);
      else if (button.id === 'cov-prev') step = Math.max(1, step - 1);
      else if (button.id === 'cov-reset') { step = 1; selected = 1; sample = false; resetAnswers(); }
      else return;
      update();
      if (button.dataset.day) query(`[data-day="${selected}"]`).focus();
    }
    function onChange(event) {
      if (event.target.id === 'cov-case') { currentCase = event.target.value; step = 1; selected = 1; sample = false; resetAnswers(); update(); }
      if (event.target.id === 'cov-basis') { sample = event.target.value === 'sample'; update(); query('#cov-basis').focus(); }
    }
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    update();
    return () => { root.removeEventListener('click', onClick); root.removeEventListener('change', onChange); };
  }
  const api = { calculate, cases: CASES, temperatures: X, render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (scope) scope.QSCovariance = api;
})(typeof window === 'undefined' ? null : window);
