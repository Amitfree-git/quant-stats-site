/* Two bounded, equal-probability teaching models; no market data or network calls. */
(function (scope) {
  'use strict';
  const MODELS = Object.freeze({ temperature: [20, 25, 30], cups: [100, 150, 200], A: [-2, 0, 2], B: [-4, 0, 4], C: [4, 0, -4] });
  function stats(x, y) {
    if (!Array.isArray(x) || !Array.isArray(y) || !x.length || x.length !== y.length || !x.every(Number.isFinite) || !y.every(Number.isFinite)) throw new RangeError('需要有效的等长成对数值。');
    const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
    const meanX = mean(x), meanY = mean(y), dx = x.map(v => v - meanX), dy = y.map(v => v - meanY);
    const products = dx.map((v, i) => v * dy[i]), cov = mean(products);
    const sdX = Math.sqrt(mean(dx.map(v => v * v))), sdY = Math.sqrt(mean(dy.map(v => v * v)));
    const rho = sdX === 0 || sdY === 0 ? null : Math.max(-1, Math.min(1, cov / (sdX * sdY)));
    return { meanX, meanY, dx, dy, products, cov, sdX, sdY, rho, zx: sdX ? dx.map(v => v / sdX) : null, zy: sdY ? dy.map(v => v / sdY) : null };
  }
  function portfolio(x, y, weightA) {
    if (!Number.isFinite(weightA) || weightA < 0 || weightA > 1) throw new RangeError('资金权重必须在 0 到 1 之间。');
    const assets = stats(x, y);
    const returns = x.map((v, i) => weightA * v + (1 - weightA) * y[i]);
    const result = stats(returns, returns);
    return { returns, mean: result.meanX, sd: result.sdX, weightedA: weightA * assets.sdX, weightedC: (1 - weightA) * assets.sdY };
  }
  const precise = n => Math.abs(n) < 1e-10 ? '0' : n.toLocaleString('zh-CN', { maximumFractionDigits: 4 });
  const num = n => Math.abs(n) < 1e-10 ? '0' : n.toLocaleString('zh-CN', { maximumFractionDigits: 3 });
  const list = a => a.map(num).join('、');
  function table(headers, rows) {
    return `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr><th scope="row">${r[0]}</th>${r.slice(1).map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function mount(root) {
    root.querySelectorAll('[data-correlation-demo]').forEach(host => {
      if (host.dataset.mounted) return;
      host.dataset.mounted = 'true';
      if (host.dataset.correlationDemo === 'units') {
        host.innerHTML = '<h3>动手：只切换记录单位</h3><label class="control"><span class="control-label">销量单位</span><select id="cor-unit"><option value="cups">杯</option><option value="groups">组（每组 10 杯）</option></select></label><div id="cor-unit-result" aria-live="polite" aria-atomic="true"></div>';
        const select = host.querySelector('select');
        const update = () => {
          const groups = select.value === 'groups', unit = groups ? '组' : '杯';
          const y = MODELS.cups.map(v => v / (groups ? 10 : 1)), s = stats(MODELS.temperature, y);
          host.querySelector('#cor-unit-result').innerHTML = table(['按相同的三个情景配对', '温度（℃）', `销量（${unit}）`], [['原始值', list(MODELS.temperature), list(y)], ['各自均值', num(s.meanX), num(s.meanY)], ['偏差', list(s.dx), list(s.dy)], ['标准差', num(s.sdX), num(s.sdY)]]) + `<p>偏差乘积：${list(s.products)} ℃·${unit}；总体协方差：<strong data-cor-cov>${num(s.cov)}</strong> ℃·${unit}。</p><p>标准差乘积：${num(s.sdX * s.sdY)} ℃·${unit}；相除后 <strong data-cor-rho>ρ = ${num(s.rho)}</strong>。</p><p>${groups ? '协方差和销量标准差同时缩小为原来的 1/10，实际关系不变。' : '切换成“组”，看看哪些数字改变、哪个比值不变。'} 三种情景各占 1/3；小数最多显示 3 位。</p>`;
        };
        select.addEventListener('change', update); update();
      } else if (host.dataset.correlationDemo === 'weights') {
        host.innerHTML = '<h3>动手：把 90 元重新分配</h3><p>仍是 A：−2%、0%、+2%，C：+4%、0%、−4%；三种完整情景各占 1/3。只改期初资金权重，相关系数始终为 −1。</p><label class="control" for="cor-weight-a"><span class="control-label">投入 A 的金额（元），其余投入 C</span><input id="cor-weight-a" type="range" min="0" max="90" step="1" value="45" aria-describedby="cor-weight-help"></label><p id="cor-weight-help">每次移动 1 元；可用方向键调整。两个按钮可精确比较等权和 2:1。</p><div class="cor-weight-actions"><button type="button" class="button" id="cor-weight-equal">各投 45 元</button><button type="button" class="button" id="cor-weight-match">A 60 元 / C 30 元</button></div><div id="cor-weight-result" aria-live="polite" aria-atomic="true"></div>';
        const slider = host.querySelector('#cor-weight-a');
        const update = () => {
          const amountA = Number(slider.value), amountC = 90 - amountA, w = amountA / 90;
          const p = portfolio(MODELS.A, MODELS.C, w), zero = p.sd < 1e-10;
          slider.setAttribute('aria-valuetext', `A ${amountA} 元，C ${amountC} 元`);
          host.querySelector('#cor-weight-result').innerHTML = `<p><strong data-cor-allocation>A ${amountA} 元 / C ${amountC} 元</strong>；期初权重 ${precise(w * 100)}% / ${precise((1 - w) * 100)}%${amountA === 60 ? '（精确为 2/3 与 1/3）' : ''}。</p>` + table(['同一持有期', '情景 1', '情景 2', '情景 3'], [['A 的盈亏（元）', ...MODELS.A.map(v => precise(amountA * v / 100))], ['C 的盈亏（元）', ...MODELS.C.map(v => precise(amountC * v / 100))], ['合计盈亏（元）', ...p.returns.map(v => precise(90 * v / 100))], ['组合收益率', ...p.returns.map(v => precise(v) + '%')]]) + `<p>加权后的幅度 wA × σA = <strong data-cor-weighted-a>${precise(p.weightedA)}%</strong>，wC × σC = <strong data-cor-weighted-c>${precise(p.weightedC)}%</strong>。</p><p>模型组合收益标准差：<strong data-cor-weight-vol>${precise(p.sd)}%</strong>。${zero ? '两边加权幅度相等，本模型三个情景的收益均为 0。' : '两边加权幅度仍不同，方向相反也没有完全抵消。'}</p><p>金额以元计；收益标准差按百分点表示（1 个百分点 = 1%），未年化。小数最多显示 4 位，计算不使用显示的四舍五入值。固定理想模型中的零波动，不是现实无风险或未来收益保证。</p>`;
        };
        slider.addEventListener('input', update);
        host.querySelector('#cor-weight-equal').addEventListener('click', () => { slider.value = '45'; update(); });
        host.querySelector('#cor-weight-match').addEventListener('click', () => { slider.value = '60'; update(); });
        update();
      } else if (host.dataset.correlationDemo === 'volatility') {
        host.innerHTML = '<h3>动手：比较等权组合</h3><p>先完成上方小练习，再切换资产核对。A 固定为 −2%、0、+2%，两项资产各占期初资金的一半。</p><label class="control"><span class="control-label">和 A 搭配的资产</span><select id="cor-asset"><option value="B">B：−4%、0、+4%（同向）</option><option value="C">C：+4%、0、−4%（反向）</option></select></label><div id="cor-asset-result" aria-live="polite" aria-atomic="true"></div>';
        const select = host.querySelector('select');
        const update = () => {
          const name = select.value, a = MODELS.A, b = MODELS[name], s = stats(a, b), p = a.map((v, i) => (v + b[i]) / 2), ps = stats(p, p);
          host.querySelector('#cor-asset-result').innerHTML = table(['同一持有期', '情景 1', '情景 2', '情景 3'], [['A', ...a.map(v => num(v) + '%')], [name, ...b.map(v => num(v) + '%')], ['各占一半的组合', ...p.map(v => num(v) + '%')], ['A 的标准化偏离', ...s.zx.map(num)], [name + ' 的标准化偏离', ...s.zy.map(num)]]) + `<p><strong data-cor-rho>ρ = ${num(s.rho)}</strong>；A 标准差 ${num(s.sdX)}%，${name} 标准差 ${num(s.sdY)}%。<br>组合标准差：<strong data-cor-vol>${num(ps.sdX)}%</strong>。</p><p>${name === 'B' ? '组合比 A 波动更大：方向完全同向，B 的幅度更大。' : '组合并未归零：虽然方向完全反向，但等权时幅度不同，不能完全抵消。'} 教学示例，无收益承诺；三种情景各占 1/3，结果未年化。</p>`;
        };
        select.addEventListener('change', update); update();
      }
    });
  }
  const api = { stats, portfolio, models: MODELS, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (scope) scope.QSCorrelation = api;
})(typeof window === 'undefined' ? null : window);
