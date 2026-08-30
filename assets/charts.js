(() => {
  'use strict';

  const TAU = Math.PI * 2;

  function css(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function palette() {
    return {
      ink: css('--chart-ink', '#24313f'),
      muted: css('--chart-muted', '#6f7d8c'),
      grid: css('--chart-grid', '#dce3e8'),
      surface: css('--chart-surface', '#ffffff'),
      accent: css('--chart-accent', '#0b7c78'),
      accent2: css('--chart-accent-2', '#d78328'),
      accent3: css('--chart-accent-3', '#5568d8'),
      positive: css('--chart-positive', '#14805e'),
      negative: css('--chart-negative', '#bf4d4d'),
      faint: css('--chart-faint', 'rgba(11,124,120,.14)'),
    };
  }

  function setup(canvas, height = 280) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(280, Math.floor(rect.width || canvas.parentElement?.clientWidth || 720));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height, dpr, colors: palette() };
  }

  function finiteExtent(values, fallback = [0, 1], padRatio = 0.06) {
    const xs = values.filter(Number.isFinite);
    if (!xs.length) return fallback;
    let min = Math.min(...xs);
    let max = Math.max(...xs);
    if (min === max) {
      const d = Math.abs(min || 1) * 0.1 || 1;
      min -= d;
      max += d;
    }
    const pad = (max - min) * padRatio;
    return [min - pad, max + pad];
  }

  function niceNum(range, round) {
    if (!Number.isFinite(range) || range <= 0) return 1;
    const exponent = Math.floor(Math.log10(range));
    const fraction = range / Math.pow(10, exponent);
    let niceFraction;
    if (round) {
      if (fraction < 1.5) niceFraction = 1;
      else if (fraction < 3) niceFraction = 2;
      else if (fraction < 7) niceFraction = 5;
      else niceFraction = 10;
    } else {
      if (fraction <= 1) niceFraction = 1;
      else if (fraction <= 2) niceFraction = 2;
      else if (fraction <= 5) niceFraction = 5;
      else niceFraction = 10;
    }
    return niceFraction * Math.pow(10, exponent);
  }

  function ticks(min, max, maxTicks = 6) {
    const range = niceNum(max - min, false);
    const step = niceNum(range / Math.max(1, maxTicks - 1), true);
    const niceMin = Math.floor(min / step) * step;
    const niceMax = Math.ceil(max / step) * step;
    const result = [];
    for (let v = niceMin; v <= niceMax + step * 0.5; v += step) result.push(v);
    return result;
  }

  function formatTick(v) {
    const a = Math.abs(v);
    if (a >= 1e6) return `${(v / 1e6).toFixed(1)}m`;
    if (a >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
    if (a > 0 && a < 0.001) return v.toExponential(1);
    if (a < 0.1) return v.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
    if (a < 10) return v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return v.toFixed(0);
  }

  function drawAxes(ctx, area, xExtent, yExtent, options = {}) {
    const c = palette();
    const [xmin, xmax] = xExtent;
    const [ymin, ymax] = yExtent;
    const xScale = (x) => area.left + ((x - xmin) / (xmax - xmin)) * area.width;
    const yScale = (y) => area.top + area.height - ((y - ymin) / (ymax - ymin)) * area.height;

    ctx.save();
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.lineWidth = 1;

    const yTicks = ticks(ymin, ymax, options.yTicks || 5);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const v of yTicks) {
      const y = yScale(v);
      if (y < area.top - 1 || y > area.top + area.height + 1) continue;
      ctx.strokeStyle = c.grid;
      ctx.beginPath();
      ctx.moveTo(area.left, y);
      ctx.lineTo(area.left + area.width, y);
      ctx.stroke();
      ctx.fillStyle = c.muted;
      ctx.fillText(options.yFormatter ? options.yFormatter(v) : formatTick(v), area.left - 8, y);
    }

    const xt = options.xTickValues || ticks(xmin, xmax, options.xTicks || 6);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const v of xt) {
      const x = xScale(v);
      if (x < area.left - 1 || x > area.left + area.width + 1) continue;
      ctx.strokeStyle = c.grid;
      ctx.beginPath();
      ctx.moveTo(x, area.top);
      ctx.lineTo(x, area.top + area.height);
      ctx.stroke();
      ctx.fillStyle = c.muted;
      ctx.fillText(options.xFormatter ? options.xFormatter(v) : formatTick(v), x, area.top + area.height + 7);
    }

    ctx.strokeStyle = c.ink;
    ctx.beginPath();
    ctx.moveTo(area.left, area.top + area.height);
    ctx.lineTo(area.left + area.width, area.top + area.height);
    ctx.moveTo(area.left, area.top);
    ctx.lineTo(area.left, area.top + area.height);
    ctx.stroke();

    if (options.xLabel) {
      ctx.fillStyle = c.muted;
      ctx.textAlign = 'center';
      ctx.fillText(options.xLabel, area.left + area.width / 2, area.top + area.height + 28);
    }
    if (options.yLabel) {
      ctx.save();
      ctx.translate(13, area.top + area.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = c.muted;
      ctx.fillText(options.yLabel, 0, 0);
      ctx.restore();
    }
    ctx.restore();
    return { xScale, yScale };
  }

  function title(ctx, width, text, subtitle) {
    if (!text) return;
    const c = palette();
    ctx.save();
    ctx.fillStyle = c.ink;
    ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, 14, 10);
    if (subtitle) {
      ctx.fillStyle = c.muted;
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(subtitle, width - 14, 11);
    }
    ctx.restore();
  }

  function legend(ctx, area, series) {
    const c = palette();
    const active = series.filter(s => s.name);
    if (!active.length) return;
    ctx.save();
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    let x = area.left;
    const y = Math.max(31, area.top - 14);
    for (const s of active) {
      ctx.strokeStyle = s.color || c.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 16, y);
      ctx.stroke();
      ctx.fillStyle = c.muted;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.name, x + 21, y);
      x += 26 + ctx.measureText(s.name).width + 18;
      if (x > area.left + area.width - 80) break;
    }
    ctx.restore();
  }

  function line(canvas, series, options = {}) {
    const { ctx, width, height, colors } = setup(canvas, options.height || 300);
    title(ctx, width, options.title, options.subtitle);
    const area = {
      left: options.left || 58,
      top: options.top || (series.some(s => s.name) ? 51 : 38),
      width: width - (options.left || 58) - (options.right || 22),
      height: height - (options.top || (series.some(s => s.name) ? 51 : 38)) - (options.bottom || 45),
    };
    const allX = [];
    const allY = [];
    for (const s of series) {
      for (const p of s.data || []) {
        if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
          allX.push(p.x); allY.push(p.y);
        }
      }
    }
    const xExtent = options.xExtent || finiteExtent(allX, [0, 1], 0);
    let yExtent = options.yExtent || finiteExtent(allY, [0, 1], 0.08);
    if (options.includeZero) yExtent = [Math.min(0, yExtent[0]), Math.max(0, yExtent[1])];
    const scales = drawAxes(ctx, area, xExtent, yExtent, options);

    if (options.zeroLine && yExtent[0] <= 0 && yExtent[1] >= 0) {
      const y0 = scales.yScale(0);
      ctx.save();
      ctx.strokeStyle = colors.ink;
      ctx.globalAlpha = 0.35;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(area.left, y0); ctx.lineTo(area.left + area.width, y0); ctx.stroke();
      ctx.restore();
    }

    const defaultColors = [colors.accent, colors.accent2, colors.accent3, colors.positive, colors.negative];
    series.forEach((s, idx) => {
      const pts = (s.data || []).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
      if (!pts.length) return;
      ctx.save();
      ctx.strokeStyle = s.color || defaultColors[idx % defaultColors.length];
      ctx.fillStyle = s.color || defaultColors[idx % defaultColors.length];
      ctx.lineWidth = s.width || 2;
      ctx.globalAlpha = s.alpha ?? 1;
      if (s.dash) ctx.setLineDash(s.dash);
      ctx.beginPath();
      pts.forEach((p, i) => {
        const x = scales.xScale(p.x), y = scales.yScale(p.y);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      if (s.points) {
        for (const p of pts) {
          ctx.beginPath();
          ctx.arc(scales.xScale(p.x), scales.yScale(p.y), s.pointRadius || 2.5, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    });
    legend(ctx, area, series);
    return { ...scales, area, xExtent, yExtent };
  }

  function scatter(canvas, points, options = {}) {
    const { ctx, width, height, colors } = setup(canvas, options.height || 310);
    title(ctx, width, options.title, options.subtitle);
    const area = { left: 58, top: 40, width: width - 80, height: height - 86 };
    const xExtent = options.xExtent || finiteExtent(points.map(p => p.x), [-1, 1], 0.08);
    const yExtent = options.yExtent || finiteExtent(points.map(p => p.y), [-1, 1], 0.08);
    const scales = drawAxes(ctx, area, xExtent, yExtent, options);
    ctx.save();
    ctx.fillStyle = options.pointColor || colors.accent;
    ctx.globalAlpha = options.alpha ?? 0.55;
    const radius = options.radius || 2.4;
    for (const p of points) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      ctx.beginPath();
      ctx.arc(scales.xScale(p.x), scales.yScale(p.y), radius, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    if (options.line && Number.isFinite(options.line.slope) && Number.isFinite(options.line.intercept)) {
      const x1 = xExtent[0], x2 = xExtent[1];
      const y1 = options.line.intercept + options.line.slope * x1;
      const y2 = options.line.intercept + options.line.slope * x2;
      ctx.save();
      ctx.strokeStyle = options.line.color || colors.accent2;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(scales.xScale(x1), scales.yScale(y1));
      ctx.lineTo(scales.xScale(x2), scales.yScale(y2));
      ctx.stroke();
      ctx.restore();
    }

    if (options.crosshair) {
      ctx.save();
      ctx.strokeStyle = colors.muted;
      ctx.globalAlpha = .5;
      ctx.setLineDash([4, 4]);
      if (xExtent[0] <= 0 && xExtent[1] >= 0) {
        const x0 = scales.xScale(0); ctx.beginPath(); ctx.moveTo(x0, area.top); ctx.lineTo(x0, area.top + area.height); ctx.stroke();
      }
      if (yExtent[0] <= 0 && yExtent[1] >= 0) {
        const y0 = scales.yScale(0); ctx.beginPath(); ctx.moveTo(area.left, y0); ctx.lineTo(area.left + area.width, y0); ctx.stroke();
      }
      ctx.restore();
    }
    return { ...scales, area, xExtent, yExtent };
  }

  function histogram(canvas, values, options = {}) {
    const finite = values.filter(Number.isFinite);
    const { ctx, width, height, colors } = setup(canvas, options.height || 300);
    title(ctx, width, options.title, options.subtitle);
    if (!finite.length) return;
    const bins = Math.max(5, Math.min(80, options.bins || Math.round(Math.sqrt(finite.length))));
    const [rawMin, rawMax] = options.xExtent || finiteExtent(finite, [0, 1], 0);
    const min = rawMin, max = rawMax;
    const step = (max - min) / bins || 1;
    const counts = Array(bins).fill(0);
    for (const v of finite) {
      let idx = Math.floor((v - min) / step);
      if (idx < 0 || idx >= bins) {
        if (v === max) idx = bins - 1; else continue;
      }
      counts[idx] += 1;
    }
    const density = options.density !== false;
    const ys = density ? counts.map(c => c / (finite.length * step)) : counts;
    const ymax = Math.max(...ys, 1e-9) * 1.12;
    const area = { left: 58, top: 40, width: width - 80, height: height - 86 };
    const scales = drawAxes(ctx, area, [min, max], [0, ymax], options);
    const barW = area.width / bins;
    ctx.save();
    ctx.fillStyle = options.color || colors.accent;
    ctx.globalAlpha = options.alpha ?? .68;
    ys.forEach((y, i) => {
      const x = area.left + i * barW;
      const y0 = scales.yScale(0);
      const yy = scales.yScale(y);
      ctx.fillRect(x + .5, yy, Math.max(1, barW - 1), y0 - yy);
    });
    ctx.restore();

    if (options.curves) {
      const curveColors = [colors.accent2, colors.accent3, colors.positive];
      options.curves.forEach((curve, idx) => {
        ctx.save();
        ctx.strokeStyle = curve.color || curveColors[idx % curveColors.length];
        ctx.lineWidth = curve.width || 2.2;
        if (curve.dash) ctx.setLineDash(curve.dash);
        ctx.beginPath();
        const n = 180;
        for (let i = 0; i <= n; i++) {
          const xVal = min + (i / n) * (max - min);
          const yVal = curve.fn(xVal);
          const x = scales.xScale(xVal), y = scales.yScale(yVal);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      });
    }
    return { counts, ys, min, max, step, ...scales, area };
  }

  function bars(canvas, labels, values, options = {}) {
    const { ctx, width, height, colors } = setup(canvas, options.height || 300);
    title(ctx, width, options.title, options.subtitle);
    const area = { left: 58, top: 42, width: width - 80, height: height - 92 };
    const all = values.flat ? values.flat().filter(Number.isFinite) : values.filter(Number.isFinite);
    let yExtent = options.yExtent || finiteExtent(all, [0, 1], .12);
    if (options.includeZero !== false) yExtent = [Math.min(0, yExtent[0]), Math.max(0, yExtent[1])];
    const xExtent = [-0.5, labels.length - 0.5];
    const scales = drawAxes(ctx, area, xExtent, yExtent, {
      ...options,
      xTickValues: labels.map((_, i) => i),
      xFormatter: (v) => labels[Math.round(v)] ?? '',
    });
    const groups = Array.isArray(values[0]) ? values : [values];
    const groupCount = groups.length;
    const slot = area.width / Math.max(1, labels.length);
    const groupWidth = slot * .72;
    const barWidth = groupWidth / groupCount;
    const defaultColors = [colors.accent, colors.accent2, colors.accent3, colors.positive, colors.negative];
    const y0 = scales.yScale(0);
    groups.forEach((series, g) => {
      ctx.save();
      ctx.fillStyle = options.colors?.[g] || defaultColors[g % defaultColors.length];
      ctx.globalAlpha = .82;
      series.forEach((v, i) => {
        if (!Number.isFinite(v)) return;
        const center = scales.xScale(i);
        const x = center - groupWidth / 2 + g * barWidth + 1;
        const y = scales.yScale(v);
        ctx.fillRect(x, Math.min(y, y0), Math.max(1, barWidth - 2), Math.abs(y0 - y));
      });
      ctx.restore();
    });
    return { ...scales, area };
  }

  function heatmap(canvas, matrix, rowLabels, colLabels, options = {}) {
    const { ctx, width, height, colors } = setup(canvas, options.height || 320);
    title(ctx, width, options.title, options.subtitle);
    const left = 76, top = 48, right = 24, bottom = 58;
    const area = { left, top, width: width - left - right, height: height - top - bottom };
    const rows = matrix.length, cols = matrix[0]?.length || 0;
    if (!rows || !cols) return;
    const values = matrix.flat().filter(Number.isFinite);
    const maxAbs = options.maxAbs || Math.max(...values.map(Math.abs), 1e-9);
    const cw = area.width / cols, ch = area.height / rows;

    function blend(a, b, t) {
      const parse = (hex) => {
        const x = hex.replace('#', '');
        return x.length === 3 ? x.split('').map(v => parseInt(v + v, 16)) : [parseInt(x.slice(0,2),16), parseInt(x.slice(2,4),16), parseInt(x.slice(4,6),16)];
      };
      const aa = parse(a), bb = parse(b);
      return `rgb(${aa.map((v,i) => Math.round(v + (bb[i]-v)*t)).join(',')})`;
    }
    const low = '#bf4d4d', mid = '#f4f6f7', high = '#0b7c78';

    ctx.save();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = matrix[r][c];
        const t = Math.max(-1, Math.min(1, v / maxAbs));
        ctx.fillStyle = t >= 0 ? blend(mid, high, t) : blend(mid, low, -t);
        ctx.fillRect(area.left + c*cw, area.top + r*ch, cw + .5, ch + .5);
        if (options.values && cw > 35 && ch > 22) {
          ctx.fillStyle = Math.abs(t) > .6 ? '#ffffff' : colors.ink;
          ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(options.valueFormatter ? options.valueFormatter(v) : v.toFixed(2), area.left + (c+.5)*cw, area.top + (r+.5)*ch);
        }
      }
    }
    ctx.strokeStyle = colors.grid;
    ctx.strokeRect(area.left, area.top, area.width, area.height);
    ctx.fillStyle = colors.muted;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    colLabels.forEach((lab, c) => ctx.fillText(lab, area.left + (c+.5)*cw, area.top + area.height + 8));
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    rowLabels.forEach((lab, r) => ctx.fillText(lab, area.left - 8, area.top + (r+.5)*ch));
    ctx.restore();
    return { area };
  }

  

  function ensureCanvas(mount) {
    let canvas = mount.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      mount.insertBefore(canvas, mount.firstChild);
    }
    return canvas;
  }

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gauss(rand) {
    const u = Math.max(1e-12, rand());
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }

  function drawL01WealthPath(mount) {
    const canvas = ensureCanvas(mount);
    const colors = palette();
    line(canvas, [
      {
        name: '实际财富',
        data: [{ x: 0, y: 10 }, { x: 1, y: 11 }, { x: 2, y: 9.9 }],
        points: true,
        width: 2.5,
      },
      {
        name: '错觉：平均 0% 持平',
        data: [{ x: 0, y: 10 }, { x: 1, y: 10 }, { x: 2, y: 10 }],
        dash: [5, 4],
        color: colors.muted,
        width: 1.6,
      },
    ], {
      height: 230,
      title: '先涨 10% 再跌 10%',
      subtitle: '10 → 11 → 9.9',
      xTickValues: [0, 1, 2],
      xFormatter: (v) => ({ 0: '起点', 1: '涨 10%', 2: '跌 10%' }[v] || ''),
      yExtent: [9.35, 11.45],
      yFormatter: (v) => Number(v).toFixed(1),
      yTicks: 5,
      bottom: 50,
      top: 52,
    });
  }

  function drawP00NumberLine(mount) {
    const canvas = ensureCanvas(mount);
    const { ctx, width, height, colors } = setup(canvas, 168);
    title(ctx, width, '数轴上的距离', '|−4 − 3| = 7');
    const xmin = -6, xmax = 6;
    const left = 28, right = width - 28;
    const y = 96;
    const xScale = (x) => left + ((x - xmin) / (xmax - xmin)) * (right - left);
    ctx.save();
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(right - 8, y - 5);
    ctx.lineTo(right, y);
    ctx.lineTo(right - 8, y + 5);
    ctx.stroke();
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let t = -5; t <= 5; t++) {
      const x = xScale(t);
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x, y + 6);
      ctx.stroke();
      ctx.fillStyle = colors.muted;
      ctx.fillText(String(t), x, y + 10);
    }
    function dot(v, label, color) {
      const x = xScale(v);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 6.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = colors.ink;
      ctx.textBaseline = 'bottom';
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(label, x, y - 12);
    }
    dot(-4, '−4', colors.negative);
    dot(3, '3', colors.positive);
    const x1 = xScale(-4), x2 = xScale(3);
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y + 36);
    ctx.lineTo(x1, y + 48);
    ctx.lineTo(x2, y + 48);
    ctx.lineTo(x2, y + 36);
    ctx.stroke();
    ctx.fillStyle = colors.accent;
    ctx.textBaseline = 'top';
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('距离 7', (x1 + x2) / 2, y + 52);
    ctx.restore();
  }

  function drawP00Bps(mount) {
    const canvas = ensureCanvas(mount);
    bars(canvas,
      ['8 bp 单边', '16 bp 往返', '25 bp', '1% = 100 bp'],
      [8, 16, 25, 100],
      {
        height: 220,
        title: '基点有多小',
        subtitle: '1 bp = 0.01%',
        yFormatter: (v) => `${Math.round(v)} bp`,
        includeZero: true,
      });
  }

  function drawP00Slope(mount) {
    const canvas = ensureCanvas(mount);
    line(canvas, [{
      name: 'y = 2x + 3',
      data: [{ x: 0, y: 3 }, { x: 1, y: 5 }, { x: 2, y: 7 }, { x: 3, y: 9 }, { x: 4, y: 11 }],
      points: true,
      width: 2.4,
    }], {
      height: 230,
      title: '斜率是「x 增加 1，y 增加多少」',
      subtitle: '截距 3，斜率 2',
      xTickValues: [0, 1, 2, 3, 4],
      yExtent: [0, 12.5],
      includeZero: true,
      bottom: 44,
      top: 52,
    });
  }

  function drawP00Compound(mount) {
    const canvas = ensureCanvas(mount);
    const colors = palette();
    const linear = [];
    const compound = [];
    for (let n = 0; n <= 15; n++) {
      linear.push({ x: n, y: 1 + 0.10 * n });
      compound.push({ x: n, y: Math.pow(1.10, n) });
    }
    line(canvas, [
      { name: '复利 (1.10)ⁿ', data: compound, width: 2.4 },
      { name: '线性 1 + 0.10n', data: linear, dash: [5, 4], color: colors.muted, width: 1.7 },
    ], {
      height: 230,
      title: '每期 10%，线性近似会越差',
      subtitle: '起点 1',
      xTicks: 6,
      yExtent: [0.8, 4.5],
      bottom: 44,
      top: 52,
    });
  }

  function drawL02ArithGeo(mount) {
    const canvas = ensureCanvas(mount);
    const colors = palette();
    function path(rets) {
      const pts = [{ x: 0, y: 1 }];
      let w = 1;
      rets.forEach((r, i) => {
        w *= (1 + r);
        pts.push({ x: i + 1, y: w });
      });
      return pts;
    }
    const low = [0.05, 0.05, 0.05, 0.05];
    const high = [0.25, -0.15, 0.25, -0.15];
    line(canvas, [
      { name: '低波动，每期 +5%', data: path(low), points: true, width: 2.4 },
      { name: '高波动，算术平均同样 +5%', data: path(high), points: true, color: colors.accent2, width: 2.4 },
    ], {
      height: 240,
      title: '算术平均相同，复合增长不同',
      subtitle: '低波动终值 1.22，高波动 1.13',
      xTickValues: [0, 1, 2, 3, 4],
      xFormatter: (v) => (v === 0 ? '起点' : `第 ${v} 期`),
      yExtent: [0.9, 1.42],
      bottom: 48,
      top: 52,
    });
  }

  function drawL03Deviations(mount) {
    const canvas = ensureCanvas(mount);
    const xs = [2, 4, 6];
    const mean = 4;
    const signed = xs.map((x) => x - mean);
    const squared = signed.map((d) => d * d);
    bars(canvas,
      ['2', '4', '6'],
      [signed, squared],
      {
        height: 230,
        title: '离差相加是 0，平方离差不会抵消',
        subtitle: '青绿是离差，橙色是平方离差',
        includeZero: true,
        colors: undefined,
      });
  }

  function drawL03SqrtT(mount) {
    const canvas = ensureCanvas(mount);
    const colors = palette();
    const sigma = 0.01;
    const sqrtPts = [];
    for (let t = 1; t <= 252; t++) sqrtPts.push({ x: t, y: sigma * Math.sqrt(t) });
    const marks = [1, 5, 21, 63, 252].map((t) => ({ x: t, y: sigma * Math.sqrt(t) }));
    line(canvas, [
      { name: 'σ√T', data: sqrtPts, width: 2.2 },
      { name: '日 / 周 / 月 / 季 / 年', data: marks, points: true, color: colors.accent2, width: 0 },
    ], {
      height: 230,
      title: '日波动 1%，按 √T 放大',
      subtitle: '一年约 15.9%，不是 252%',
      xTickValues: [1, 63, 126, 189, 252],
      xFormatter: (v) => ({ 1: '1 日', 63: '季', 126: '半年', 189: '', 252: '1 年' }[v] || String(v)),
      yExtent: [0, 0.18],
      yFormatter: (v) => `${(v * 100).toFixed(0)}%`,
      includeZero: true,
      bottom: 48,
      top: 52,
    });
  }

  function drawL04Scatter(mount) {
    const canvas = ensureCanvas(mount);
    const rand = rng(20260830);
    const rho = 0.7;
    const points = [];
    for (let i = 0; i < 90; i++) {
      const x = gauss(rand);
      const y = rho * x + Math.sqrt(1 - rho * rho) * gauss(rand);
      points.push({ x, y });
    }
    scatter(canvas, points, {
      height: 240,
      title: 'ρ = 0.7 的线性共变',
      subtitle: '相关不是因果，极端值会拉动',
      radius: 3.1,
      alpha: 0.62,
    });
  }

  function drawL04VolCurve(mount) {
    const canvas = ensureCanvas(mount);
    const colors = palette();
    const s1 = 0.20, s2 = 0.20;
    function curve(rho) {
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const w = i / 40;
        const v = w * w * s1 * s1 + (1 - w) * (1 - w) * s2 * s2 + 2 * w * (1 - w) * rho * s1 * s2;
        pts.push({ x: w, y: Math.sqrt(Math.max(0, v)) });
      }
      return pts;
    }
    line(canvas, [
      { name: 'ρ = 1，没有分散化', data: curve(1), dash: [5, 4], color: colors.muted, width: 1.7 },
      { name: 'ρ = 0.2', data: curve(0.2), width: 2.4 },
      { name: 'ρ = −0.3，U 形更明显', data: curve(-0.3), color: colors.accent2, width: 2.4 },
    ], {
      height: 240,
      title: '两资产组合波动随权重变化',
      subtitle: 'σ₁ = σ₂ = 20%',
      xTickValues: [0, 0.25, 0.5, 0.75, 1],
      xFormatter: (v) => (v === 0 ? '全资产 2' : v === 1 ? '全资产 1' : v === 0.5 ? '各一半' : ''),
      yExtent: [0.08, 0.22],
      yFormatter: (v) => `${(v * 100).toFixed(0)}%`,
      bottom: 48,
      top: 52,
    });
  }

  function drawL12Fit(mount) {
    const canvas = ensureCanvas(mount);
    const rand = rng(12);
    const points = [];
    for (let i = 0; i < 22; i++) {
      const x = 0.4 + i * 0.42;
      const y = 2 + 1.2 * x + gauss(rand) * 1.15;
      points.push({ x, y });
    }
    const n = points.length;
    const mx = points.reduce((s, p) => s + p.x, 0) / n;
    const my = points.reduce((s, p) => s + p.y, 0) / n;
    let num = 0, den = 0;
    for (const p of points) {
      num += (p.x - mx) * (p.y - my);
      den += (p.x - mx) * (p.x - mx);
    }
    const beta = num / den;
    const alpha = my - beta * mx;
    const { ctx, width, height, colors } = setup(canvas, 250);
    title(ctx, width, '拟合直线与残差', `α̂ ≈ ${alpha.toFixed(2)}，β̂ ≈ ${beta.toFixed(2)}`);
    const area = { left: 52, top: 50, width: width - 74, height: height - 96 };
    const xExtent = [-0.2, 10.2];
    const yExtent = finiteExtent(points.map((p) => p.y).concat([alpha, alpha + beta * 10]), [0, 1], 0.12);
    const scales = drawAxes(ctx, area, xExtent, yExtent, {});
    ctx.save();
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    ctx.setLineDash([3, 3]);
    for (const p of points) {
      const yhat = alpha + beta * p.x;
      ctx.beginPath();
      ctx.moveTo(scales.xScale(p.x), scales.yScale(p.y));
      ctx.lineTo(scales.xScale(p.x), scales.yScale(yhat));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.moveTo(scales.xScale(0), scales.yScale(alpha));
    ctx.lineTo(scales.xScale(10), scales.yScale(alpha + beta * 10));
    ctx.stroke();
    ctx.fillStyle = colors.ink;
    ctx.globalAlpha = 0.78;
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(scales.xScale(p.x), scales.yScale(p.y), 3.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    legend(ctx, area, [
      { name: 'OLS 拟合线', color: colors.accent },
      { name: '残差', color: colors.muted },
    ]);
  }

  const INLINE_FIGURES = {
    'l01-wealth-path': drawL01WealthPath,
    'p00-number-line': drawP00NumberLine,
    'p00-bps': drawP00Bps,
    'p00-slope': drawP00Slope,
    'p00-compound': drawP00Compound,
    'l02-arith-geo': drawL02ArithGeo,
    'l03-deviations': drawL03Deviations,
    'l03-sqrt-t': drawL03SqrtT,
    'l04-scatter': drawL04Scatter,
    'l04-vol-curve': drawL04VolCurve,
    'l12-fit': drawL12Fit,
  };

  function renderInlineFigures(root) {
    if (!root) return;
    root.querySelectorAll('[data-figure]').forEach(mount => {
      const name = mount.dataset.figure;
      const drawer = INLINE_FIGURES[name];
      if (!drawer) return;
      const draw = () => drawer(mount);
      draw();
      requestAnimationFrame(draw);
      if (mount._qsResize) return;
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => draw());
      ro.observe(mount);
      mount._qsResize = ro;
    });
  }

  window.QSCharts = { setup, line, scatter, histogram, bars, heatmap, finiteExtent, formatTick, palette, renderInlineFigures };
})();
