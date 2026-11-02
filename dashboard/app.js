'use strict';
/* Digital Freedom & Disinformation Intelligence Dashboard
   All figures are computed in the browser from data.js, which pipeline/build_data.py
   builds from the attached files only. Statistical tests and forecasts are computed
   in the pipeline (scipy / statsmodels) and shown as-is. */

const D = window.DASH;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const isNum = v => v !== null && v !== undefined && v !== '' && !Number.isNaN(+v);
const fmt = v => isNum(v) ? nf0.format(v) : 'N/A';
const fmt1 = v => isNum(v) ? nf1.format(v) : 'N/A';
const fmt2 = v => isNum(v) ? nf2.format(v) : 'N/A';
const pct = (a, b) => b ? (a / b * 100) : null;
const fmtPct = v => isNum(v) ? nf1.format(v) + '%' : 'N/A';
const mBaht = v => isNum(v) ? nf1.format(v / 1e6) + ' ล้านบาท' : 'N/A';
const fdate = s => { if (!s) return 'N/A'; const [y, m, d] = s.split('-'); return d ? `${+d} ${TH_M[+m - 1]} ${y}` : `${TH_M[+m - 1]} ${y}`; };
const fym = ym => { const [y, m] = ym.split('-'); return `${TH_M[+m - 1]} ${y}`; };
const qOf = m => Math.floor((m - 1) / 3) + 1;
const sum = a => a.reduce((s, v) => s + (+v || 0), 0);
const median = a => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };

const V = { F: '#a51d24', D: '#e2725b', T: '#2e7d32' };
const VL = { F: 'ข่าวปลอม', D: 'ข่าวบิดเบือน', T: 'ข่าวจริง' };
const VEN = { F: 'Fake', D: 'Distorted', T: 'True' };
const STC = { 1: '#2e7d32', 2: '#b77800', 3: '#a51d24' };
const STL = { 1: 'เสรี', 2: 'เสรีบางส่วน', 3: 'ไม่เสรี' };
const CATC = { 'นโยบายรัฐบาล-ข่าวสาร': '#2a78d6', 'ผลิตภัณฑ์สุขภาพ': '#1baf7a', 'การเงิน-หุ้น': '#eb6834', 'ภัยพิบัติ': '#eda100', 'ความสงบและความมั่นคง': '#6250d6', 'อาชญากรรมออนไลน์': '#e87ba4' };
const catColor = c => CATC[c] || '#9a9893';
const ASEAN = ['KHM', 'IDN', 'MYS', 'MMR', 'PHL', 'SGP', 'THA', 'VNM'];
const FONT = '"IBM Plex Sans Thai","Noto Sans Thai",Tahoma,sans-serif';

/* ------------------------------------------------------------ data prep */
const A = D.afnc;
const AF = A.rows.map(r => {
  const [id, date, t, v, c, ag, title, tags, views, vsrc] = r;
  const y = +date.slice(0, 4), m = +date.slice(5, 7);
  return { id, date, y, m, q: qOf(m), ym: date.slice(0, 7), type: A.types[t], v, cat: A.cats[c], ag: ag >= 0 ? A.agencies[ag] : '', title, tags, views, vsrc };
});
const EUD = D.eu.debunks.map(([i, date, kws, nd, nt, id]) => {
  const y = +date.slice(0, 4), m = +date.slice(5, 7);
  return { i, date, y, m, q: qOf(m), ym: date.slice(0, 7), kws, nd, nt, id };
});
const AC = D.acsc.rows.map(r => {
  const y = +r.week_start.slice(0, 4), m = +r.week_start.slice(5, 7);
  return { ...r, date: r.week_start, y, m, q: qOf(m), ym: r.week_start.slice(0, 7) };
});
const FO = D.fotn.rows;
const FO_YEARS = [...new Set(FO.map(r => r.data_year))].sort();
const COUNTRIES = [...new Map(FO.map(r => [r.iso3, r.country])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
const CNAME = Object.fromEntries(COUNTRIES);
const shortName = n => n.replace(/ \(the\)/, '').replace('United Kingdom of Great Britain and Northern Ireland', 'United Kingdom').replace('United States of America', 'United States')
  .replace(' (Islamic Republic of)', '').replace(' (Bolivarian Republic of)', '').replace(' (Province of China)', '').replace('Russian Federation', 'Russia').replace('Korea (the Republic of)', 'South Korea').replace('Syrian Arab Republic', 'Syria');
const SCAM_GROUPS = [...new Set(AC.flatMap(r => [r.top_group, r.hl_group]).filter(Boolean))];
const MONTHS_ALL = (() => { const o = []; for (let y = 2015; y <= 2026; y++) for (let m = 1; m <= 12; m++) { if (y === 2026 && m > 10) break; o.push(`${y}-${String(m).padStart(2, '0')}`); } return o; })();
const ACSC_FIRST = '2025-11-09', ACSC_LAST = '2026-10-24';

/* ------------------------------------------------------------ filters */
const F0 = () => ({ start: '', end: '', years: [], quarters: [], months: [], countries: [], region: 'all', cats: [], verdicts: [], scam: [], sources: { afnc: true, acsc: true, fotn: true, eu: true }, flagged: false });
let F = F0();

function dateOk(date, y, m, q) {
  if (F.start && date < F.start) return false;
  if (F.end && date > F.end) return false;
  if (F.years.length && !F.years.includes(y)) return false;
  if (F.quarters.length && !F.quarters.includes(q)) return false;
  if (F.months.length && !F.months.includes(m)) return false;
  return true;
}
function monthOk(ym) { // month-level domain (a month is in range if it overlaps the date range)
  const y = +ym.slice(0, 4), m = +ym.slice(5, 7);
  if (F.start && ym < F.start.slice(0, 7)) return false;
  if (F.end && ym > F.end.slice(0, 7)) return false;
  if (F.years.length && !F.years.includes(y)) return false;
  if (F.quarters.length && !F.quarters.includes(qOf(m))) return false;
  if (F.months.length && !F.months.includes(m)) return false;
  return true;
}
const afncBlocked = () => !F.sources.afnc ? 'ปิดแหล่งข้อมูล AFNC ในตัวกรอง "แหล่งข้อมูล"' : F.region === 'foreign' ? 'AFNC เป็นข้อมูลประเทศไทยเท่านั้น แต่ตัวกรองเลือก "ต่างประเทศ"' : null;
const acscBlocked = () => !F.sources.acsc ? 'ปิดแหล่งข้อมูล ACSC ในตัวกรอง "แหล่งข้อมูล"' : F.region === 'foreign' ? 'ACSC เป็นข้อมูลประเทศไทยเท่านั้น แต่ตัวกรองเลือก "ต่างประเทศ"' : null;
const euBlocked = () => !F.sources.eu ? 'ปิดแหล่งข้อมูล EUvsDisinfo ในตัวกรอง "แหล่งข้อมูล"' : F.region === 'th' ? 'EUvsDisinfo ไม่ใช่ข้อมูลของประเทศไทย แต่ตัวกรองเลือก "ประเทศไทย"' : null;
const fotnBlocked = () => !F.sources.fotn ? 'ปิดแหล่งข้อมูล Freedom on the Net ในตัวกรอง "แหล่งข้อมูล"' : null;

function afncOk(r, o = {}) {
  if (!o.noDate && !dateOk(r.date, r.y, r.m, r.q)) return false;
  if (!o.noCat && F.cats.length && !F.cats.includes(r.cat)) return false;
  if (!o.noVerdict && F.verdicts.length && !F.verdicts.includes(r.v)) return false;
  return true;
}
const afV = (o = {}) => afncBlocked() ? [] : AF.filter(r => r.type === 'Verdict' && afncOk(r, o));
function acscOk(r, o = {}) {
  if (!o.noDate && !dateOk(r.date, r.y, r.m, r.q)) return false;
  if (F.scam.length && !(F.scam.includes(r.top_group) || F.scam.includes(r.hl_group))) return false;
  if (!F.flagged && r.flagged_suspect && !o.keepFlag) return false;
  return true;
}
const acV = (o = {}) => acscBlocked() ? [] : AC.filter(r => acscOk(r, o));
const euV = (o = {}) => euBlocked() ? [] : EUD.filter(d => o.noDate || dateOk(d.date, d.y, d.m, d.q));
function fotnOk(r, o = {}) {
  if (fotnBlocked()) return false;
  if (!o.noYear && F.years.length && !F.years.includes(r.data_year)) return false;
  if (!o.noCountry && F.countries.length && !F.countries.includes(r.iso3)) return false;
  if (!o.noRegion && F.region === 'th' && r.iso3 !== 'THA') return false;
  if (!o.noRegion && F.region === 'foreign' && r.iso3 === 'THA') return false;
  return true;
}
const foV = (o = {}) => FO.filter(r => fotnOk(r, o));
const fotnYears = () => FO_YEARS.filter(y => !F.years.length || F.years.includes(y));

const APPLIES = {
  afnc: ['date', 'year', 'quarter', 'month', 'region', 'cat', 'verdict', 'source'],
  acsc: ['date', 'year', 'quarter', 'month', 'region', 'scam', 'flag', 'source'],
  eu: ['date', 'year', 'quarter', 'month', 'region', 'source'],
  fotn: ['year', 'country', 'region', 'source'],
  static: [],
};
const FNAME = { date: 'ช่วงวันที่', year: 'ปี', quarter: 'ไตรมาส', month: 'เดือน', country: 'ประเทศ', region: 'ไทย/ต่างประเทศ', cat: 'ประเภทข่าว', verdict: 'สถานะข่าว', scam: 'ประเภทการหลอกลวง', flag: 'สัปดาห์ติดป้าย', source: 'แหล่งข้อมูล' };
function activeKeys() {
  const k = [];
  if (F.start || F.end) k.push('date'); if (F.years.length) k.push('year'); if (F.quarters.length) k.push('quarter'); if (F.months.length) k.push('month');
  if (F.countries.length) k.push('country'); if (F.region !== 'all') k.push('region'); if (F.cats.length) k.push('cat'); if (F.verdicts.length) k.push('verdict');
  if (F.scam.length) k.push('scam'); if (F.flagged) k.push('flag'); if (Object.values(F.sources).some(v => !v)) k.push('source');
  return k;
}
function appliedText(ds) {
  const act = activeKeys();
  const dss = ds.split('+');
  if (dss[0] === 'static') return 'ค่าสถิติคำนวณล่วงหน้าจากข้อมูลทั้งชุด ตัวกรองไม่เปลี่ยนค่าเพื่อคงความถูกต้องของการทดสอบ';
  const used = act.filter(k => dss.some(d => APPLIES[d].includes(k)));
  const unused = act.filter(k => !used.includes(k));
  let t = 'ตัวกรองที่มีผล: ' + (used.length ? used.map(k => FNAME[k]).join(', ') : 'ไม่มี (แสดงทั้งหมด)');
  if (unused.length) t += ' · ไม่ใช้กับชุดนี้: ' + unused.map(k => FNAME[k]).join(', ');
  return t;
}

/* ------------------------------------------------------------ chart registry */
let CH = [];
function disposeCharts() { CH.forEach(c => c.dispose()); CH = []; }
function mkChart(id, option, onClick) {
  const el = document.getElementById(id); if (!el) return null;
  const c = echarts.init(el, null, { renderer: 'canvas' });
  c.setOption(Object.assign({ textStyle: { fontFamily: FONT, color: '#4d4f53' }, animationDuration: 400 }, option));
  if (onClick) c.on('click', onClick);
  CH.push(c); return c;
}
window.addEventListener('resize', () => CH.forEach(c => c.resize()));
const axisBase = { axisLine: { lineStyle: { color: '#d6d3cf' } }, axisTick: { show: false }, axisLabel: { color: '#7a7c80', fontSize: 11 }, splitLine: { lineStyle: { color: '#efeeeb' } } };
const tipBase = { backgroundColor: '#fff', borderColor: '#e6e4e0', textStyle: { color: '#16181b', fontSize: 12, fontFamily: FONT }, extraCssText: 'box-shadow:0 4px 14px rgba(0,0,0,.08);border-radius:8px;' };
const grid = (o = {}) => Object.assign({ left: 8, right: 16, top: 34, bottom: 8, containLabel: true }, o);
const legendTop = { top: 0, left: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 12, color: '#4d4f53' } };

/* ------------------------------------------------------------ HTML helpers */
function card({ id, title, sub, ds, src, h = '', body = '', finding = '', note = '' }) {
  return `<div class="card"><h4>${title}</h4><div class="sub">${sub || ''}</div>
    ${body || `<div class="ch ${h}" id="${id}"></div>`}
    ${note ? `<div class="sub" style="margin-top:6px">${note}</div>` : ''}
    ${finding ? `<div class="finding">${finding}</div>` : ''}
    <div class="card-f"><span class="applied">${appliedText(ds || 'static')}</span>${src ? `<button class="linkbtn" data-src="${src}">แหล่งข้อมูล &amp; สูตร</button>` : ''}</div></div>`;
}
const na = (msg, need) => `<div class="na"><b>ไม่มีข้อมูลเพียงพอสำหรับการวิเคราะห์นี้</b><div>${msg}</div>${need ? `<div style="font-size:12px;color:#7a7c80">ข้อมูลที่ต้องมีเพิ่ม: ${need}</div>` : ''}</div>`;
function kpi({ label, value, sub, delta, cls = '', src }) {
  return `<div class="kpi" tabindex="0" role="button" data-src="${src}"><span class="src">ที่มา ⓘ</span><div class="k-l">${label}</div>
    <div class="k-v ${cls}">${value}</div><div class="k-s">${sub || ''}</div>${delta ? `<div class="k-d">${delta}</div>` : ''}</div>`;
}
function deltaHtml(cur, prev, label, goodDown = true) {
  if (!isNum(cur) || !isNum(prev) || prev === 0) return `<span class="flat">${label ? label + ': ' : ''}ไม่มีช่วงก่อนหน้าให้เทียบ</span>`;
  const d = (cur - prev) / prev * 100;
  const cls = Math.abs(d) < 0.05 ? 'flat' : (d > 0) === goodDown ? 'up' : 'down';
  return `<span class="${cls}">${d > 0 ? '▲' : d < 0 ? '▼' : '■'} ${fmt1(Math.abs(d))}%</span> <span class="flat">${label}</span>`;
}
let CUR_SUM = null;
function summaryBlock(o) { CUR_SUM = o; return ''; }
function summaryHtml(o) {
  const it = [['ข้อค้นพบสำคัญ', o.find], ['ตัวเลขสนับสนุน', o.nums], ['ช่วงเวลาที่ศึกษา', o.period], ['แหล่งข้อมูล', o.src], ['ข้อจำกัด', o.lim], ['ประเด็นที่ควรติดตาม', o.next]];
  return `<div class="msum">${it.map(([h, v]) => `<div class="s"><h5>${h}</h5><div>${v}</div></div>`).join('')}</div>`;
}
function table(cols, rows, o = {}) {
  return `<div class="tscroll" style="${o.maxh ? 'max-height:' + o.maxh + 'px' : ''}"><table class="t"><thead><tr>${cols.map(c => `<th class="${c.n ? 'n' : ''}">${c.h}</th>`).join('')}</tr></thead><tbody>
  ${rows.map((r, i) => `<tr class="${(o.hl && o.hl(r)) ? 'hl' : ''} ${o.click ? 'click' : ''}" ${o.click ? `data-row="${i}"` : ''}>${cols.map(c => `<td class="${c.n ? 'n' : ''}">${c.f ? c.f(r) : esc(r[c.k])}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div>`;
}
function downloadCSV(name, cols, rows) {
  const q = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = '﻿' + cols.map(q).join(',') + '\n' + rows.map(r => cols.map(c => q(r[c])).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ------------------------------------------------------------ modal */
function openModal(title, html) { $('#mTitle').textContent = title; $('#mBody').innerHTML = html; $('#modal').classList.remove('hidden'); $('#mClose').focus(); }
function closeModal() { $('#modal').classList.add('hidden'); }
$('#mClose').onclick = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

const afUrl = id => `https://www.antifakenewscenter.com/?p=${id}`;
const AF_COLS = [
  { h: 'post_id', k: 'id', f: r => `<a href="${afUrl(r.id)}" target="_blank" rel="noopener">${r.id}</a>` },
  { h: 'วันที่', k: 'date' }, { h: 'สถานะ', f: r => r.v ? `<span style="color:${V[r.v]};font-weight:600">${VL[r.v]}</span>` : esc(r.type) },
  { h: 'หมวด', k: 'cat' }, { h: 'หัวข้อ', k: 'title' }, { h: 'ยอดชม*', k: 'views', n: 1, f: r => fmt(r.views) }];
const afExport = rows => rows.map(r => ({ post_id: r.id, date: r.date, item_type: r.type, verdict_en: VEN[r.v] || '', category_th: r.cat, checked_by_agency: r.ag, title: r.title, topic_tags: r.tags, view_count: r.views, url: afUrl(r.id) }));
let MODAL_ROWS = null;
function showRecords(title, rows, explain, applyBtn) {
  MODAL_ROWS = rows;
  openModal(title, `<p>${explain}</p><p><b>${fmt(rows.length)}</b> รายการ จาก <code>${A.file}</code> (แสดงสูงสุด 300 รายการแรก; ส่งออก CSV ได้ทั้งหมด)</p>
    <div class="toolbar"><button class="btn sm" id="mExport">ส่งออก CSV</button>${applyBtn ? `<button class="btn sm primary" id="mApply">${applyBtn.label}</button>` : ''}<button class="btn sm" id="mExplore">เปิดใน Data Explorer</button></div>
    ${table(AF_COLS, rows.slice(0, 300), { maxh: 460 })}<p class="sub">* ยอดชม ณ วันดาวน์โหลด 1 พ.ย. 2026 ไม่ใช่ยอดชมในช่วงที่เผยแพร่</p>`);
  $('#mExport').onclick = () => downloadCSV('afnc_records.csv', ['post_id', 'date', 'item_type', 'verdict_en', 'category_th', 'checked_by_agency', 'title', 'topic_tags', 'view_count', 'url'], afExport(rows));
  if (applyBtn) $('#mApply').onclick = () => { applyBtn.fn(); closeModal(); render(); };
  $('#mExplore').onclick = () => { EX.ds = 'afnc'; EX.ids = new Set(rows.map(r => r.id)); EX.idsLabel = title; EX.page = 0; closeModal(); go('explorer'); };
}

/* ------------------------------------------------------------ source registry */
const FILES = { fotn: D.fotn.file, eu: D.eu.file, afnc: D.afnc.file, acsc: D.acsc.file, panel: D.panel.file };
const filterDesc = ds => appliedText(ds);
const SRC = {
  afnc_verdicts: { t: 'จำนวนคำตัดสินข่าว (AFNC)', ds: 'afnc', file: FILES.afnc, sheet: 'CSV (หรือชีต afnc_items ใน thai-disinfo-scam-dataset.xlsx)', cols: 'item_type, verdict_en, date, category_th', f: 'COUNT(แถว) WHERE item_type = "Verdict"', unit: 'รายการ (คำตัดสิน)', miss: 'ไม่มีค่าว่างใน item_type/date; โพสต์ที่ไม่ใช่คำตัดสินไม่ถูกนับ', url: 'https://opendata.antifakenewscenter.com', rec: () => afV() },
  afnc_fake: { t: 'จำนวนข่าวปลอม (AFNC)', ds: 'afnc', file: FILES.afnc, sheet: 'CSV', cols: 'verdict_en, date', f: 'COUNT(แถว) WHERE item_type="Verdict" AND verdict_en="Fake"', unit: 'รายการ', miss: '-', url: 'https://opendata.antifakenewscenter.com', rec: () => afV().filter(r => r.v === 'F') },
  afnc_true: { t: 'จำนวนข่าวจริง (AFNC)', ds: 'afnc', file: FILES.afnc, sheet: 'CSV', cols: 'verdict_en, date', f: 'COUNT(แถว) WHERE item_type="Verdict" AND verdict_en="True"', unit: 'รายการ', miss: '-', url: 'https://opendata.antifakenewscenter.com', rec: () => afV().filter(r => r.v === 'T') },
  afnc_distorted: { t: 'จำนวนข่าวบิดเบือน (AFNC)', ds: 'afnc', file: FILES.afnc, sheet: 'CSV', cols: 'verdict_en, date', f: 'COUNT(แถว) WHERE item_type="Verdict" AND verdict_en="Distorted"', unit: 'รายการ', miss: '-', url: 'https://opendata.antifakenewscenter.com', rec: () => afV().filter(r => r.v === 'D') },
  afnc_time: { t: 'จำนวนคำตัดสินตามเวลา (เดือน/ไตรมาส/ปี)', ds: 'afnc', file: FILES.afnc, sheet: 'CSV', cols: 'date (published_bkk เวลาไทย), verdict_en', f: 'COUNT GROUP BY เดือน/ไตรมาส/ปี ของ date; เปอร์เซ็นต์เปลี่ยนแปลง = (ช่วงนี้ − ช่วงก่อน) ÷ ช่วงก่อน × 100', unit: 'รายการต่อช่วงเวลา', miss: 'ช่วงที่ไม่มีคำตัดสิน = 0 (นับจากรายการครบทุกโพสต์ ไม่ใช่ค่าหาย)', url: 'https://opendata.antifakenewscenter.com', rec: () => afV() },
  afnc_cat: { t: 'คำตัดสินแยกตามหมวดข่าว', ds: 'afnc', file: FILES.afnc, sheet: 'CSV', cols: 'category_th, category_en, verdict_en', f: 'COUNT GROUP BY category_th; ร้อยละ = จำนวนหมวด ÷ จำนวนคำตัดสินทั้งหมดที่ผ่านตัวกรอง × 100', unit: 'รายการ, %', miss: 'ใช้หมวดตามต้นฉบับ AFNC ไม่จัดใหม่', url: 'https://opendata.antifakenewscenter.com', rec: () => afV() },
  afnc_share: { t: 'สัดส่วนข่าวจริง/ปลอม/บิดเบือน', ds: 'afnc', file: FILES.afnc, sheet: 'CSV', cols: 'item_type, verdict_en', f: 'ร้อยละ = จำนวนแต่ละสถานะ ÷ จำนวนคำตัดสินทั้งหมด (ตัวหาร) × 100', unit: '%', miss: 'ตัวหารคือคำตัดสินที่ศูนย์ฯ เลือกตรวจและเผยแพร่ ไม่ใช่ข่าวทั้งหมดในสังคม', url: 'https://opendata.antifakenewscenter.com', rec: () => afV() },
  acsc_loss: { t: 'มูลค่าความเสียหายจากมิจฉาชีพ (ACSC)', ds: 'acsc', file: FILES.acsc, sheet: 'CSV (หรือชีต acsc_weekly)', cols: 'week_start, week_end, loss_baht, loss_precision, flag', f: 'SUM(loss_baht) ของสัปดาห์ที่ผ่านตัวกรอง; ไม่รวมสัปดาห์ติดป้าย Suspect เว้นแต่เลือกรวม', unit: 'บาท (แสดงเป็นล้านบาท)', miss: 'สัปดาห์ที่ไม่มีการแถลงไม่ถูกนับและไม่เติม 0', url: 'แต่ละแถวมี source_url ของข่าวต้นทาง · saranitet.police.go.th', rec: () => acV(), acsc: true },
  acsc_cases: { t: 'จำนวนคดีหลอกลวงออนไลน์ที่แจ้ง (ACSC)', ds: 'acsc', file: FILES.acsc, sheet: 'CSV', cols: 'cases', f: 'SUM(cases)', unit: 'คดี (ไม่ใช่จำนวนผู้เสียหาย)', miss: 'เหมือนข้างบน', url: 'source_url ต่อแถว', rec: () => acV(), acsc: true },
  acsc_type: { t: 'ประเภทการหลอกลวง (ACSC)', ds: 'acsc', file: FILES.acsc, sheet: 'CSV', cols: 'top_type_th, highest_loss_type_th, highest_loss_type_loss_baht', f: 'จัดกลุ่มชื่อประเภทด้วยคำสำคัญ: ' + D.acsc.scam_rules.map(([k, g]) => `"${k}"→${g}`).join('; ') + ' แล้วนับจำนวนสัปดาห์', unit: 'สัปดาห์, บาท', miss: 'สัปดาห์ที่ข่าวไม่ระบุประเภทไม่ถูกนับ; ไม่มีมูลค่าแยกครบทุกประเภท', url: 'source_url ต่อแถว', rec: () => acV(), acsc: true },
  fotn_score: { t: 'คะแนน Freedom on the Net', ds: 'fotn', file: FILES.fotn, sheet: 'CSV (หรือชีต scores ใน .xlsx)', cols: 'country, iso3, data_year, report_edition, total_score, obstacles_to_access, limits_on_content, violations_of_user_rights, status', f: 'ค่าดิบตามต้นฉบับ; อันดับ = ลำดับจากคะแนนสูงไปต่ำในปีเดียวกัน (1 = เสรีที่สุด)', unit: 'คะแนน 0–100 (ยิ่งสูงยิ่งเสรี)', miss: 'ประเทศ/ปีที่ไม่มีการประเมินแสดง N/A ไม่ใช่ 0', url: 'https://freedomhouse.org/report/freedom-net · https://qogdata.pol.gu.se', rec: () => foV(), fotn: true },
  eu_debunks: { t: 'กรณีข้อมูลบิดเบือน (EUvsDisinfo debunks)', ds: 'eu', file: FILES.eu, sheet: 'CSV', cols: 'debunk_id, debunk_date (DD-MM-YYYY), keywords, class', f: 'COUNT(DISTINCT debunk_id); แถว = บทความ จึงไม่นับแถว', unit: 'การหักล้าง (เรื่อง)', miss: 'keywords ว่าง 54 แถว จัดเป็น "(ไม่ระบุ)"', url: 'https://zenodo.org/records/10514307', rec: () => euV(), eu: true },
  corr: { t: 'การวิเคราะห์สหสัมพันธ์', ds: 'static', file: 'reports/analysis_results.json (สร้างโดย pipeline/build_data.py)', sheet: '-', cols: 'ดูรายการแหล่งข้อมูลในแต่ละกราฟ', f: 'Pearson r และ Spearman ρ ด้วย scipy.stats (pearsonr, spearmanr) สองหาง; เส้นแนวโน้ม = least squares (numpy.polyfit)', unit: '-', miss: 'ใช้เฉพาะจุดที่มีข้อมูลทั้งสองตัวแปร ไม่เติมค่า', url: '-' },
};
function showSource(id) {
  const s = SRC[id]; if (!s) return;
  const recs = s.rec ? s.rec() : null;
  let recHtml = '';
  if (recs && s.acsc) {
    recHtml = `<h4>รายการที่นำมาคำนวณ (${fmt(recs.length)} สัปดาห์)</h4>` + acscTable(recs) + `<p class="sub">ผลรวม cases = ${fmt(sum(recs.map(r => r.cases)))} คดี · ผลรวม loss_baht = ${fmt(sum(recs.map(r => r.loss_baht)))} บาท</p>`;
  } else if (recs && s.fotn) {
    recHtml = `<h4>แถวที่ผ่านตัวกรอง (${fmt(recs.length)} แถว · แสดง 200 แถวแรก)</h4>` + table([{ h: 'country', k: 'country' }, { h: 'data_year', k: 'data_year' }, { h: 'report_edition', k: 'report_edition' }, { h: 'total', k: 'total_score', n: 1 }, { h: 'access', k: 'obstacles_to_access', n: 1 }, { h: 'content', k: 'limits_on_content', n: 1 }, { h: 'rights', k: 'violations_of_user_rights', n: 1 }, { h: 'status', k: 'status' }], recs.slice(0, 200), { maxh: 340 });
  } else if (recs && s.eu) {
    recHtml = `<h4>การหักล้างที่ผ่านตัวกรอง (${fmt(recs.length)} debunk_id · ${fmt(sum(recs.map(d => d.nd + d.nt)))} บทความ · แสดง 200 รายการแรก)</h4>` + table([{ h: 'debunk_id', k: 'id' }, { h: 'วันที่หักล้าง', k: 'date' }, { h: 'keywords', f: d => esc(d.kws.map(i => D.eu.keywords[i]).join(', ')) }, { h: 'บทความ disinfo', k: 'nd', n: 1 }, { h: 'บทความ trustworthy', k: 'nt', n: 1 }], recs.slice(0, 200), { maxh: 340 });
  } else if (recs) {
    recHtml = `<h4>รายการที่นำมาคำนวณ (${fmt(recs.length)} รายการ · แสดง 200 รายการแรก)</h4>` + table(AF_COLS, recs.slice(0, 200), { maxh: 340 }) + `<div class="toolbar" style="margin-top:8px"><button class="btn sm" id="srcExplore">เปิดรายการทั้งหมดใน Data Explorer</button></div>`;
  }
  openModal('แหล่งที่มา: ' + s.t, `<dl class="src">
    <dt>ชื่อไฟล์</dt><dd><code>${esc(s.file)}</code></dd><dt>ชีต/ตาราง</dt><dd>${esc(s.sheet)}</dd>
    <dt>คอลัมน์ที่ใช้</dt><dd>${esc(s.cols)}</dd><dt>สูตรคำนวณ</dt><dd>${esc(s.f)}</dd>
    <dt>เงื่อนไขการกรอง</dt><dd>${esc(filterDesc(s.ds))}</dd><dt>หน่วยวัด</dt><dd>${esc(s.unit)}</dd>
    <dt>การจัดการค่าที่หายไป</dt><dd>${esc(s.miss)}</dd><dt>ประเภทตัวเลข</dt><dd>${s.ds === 'static' ? 'ผลวิเคราะห์ (ประมวลผลแล้ว)' : 'นับ/รวมจากข้อมูลดิบ (ประมวลผลแล้ว) — ค่าดิบดูได้ในตารางด้านล่าง'}</dd>
    <dt>URL ต้นทาง</dt><dd>${esc(s.url)}</dd><dt>สร้างชุดข้อมูลแดชบอร์ด</dt><dd>${esc(D.meta.built)} โดย <code>pipeline/build_data.py</code></dd></dl>${recHtml}`);
  const b = $('#srcExplore'); if (b) b.onclick = () => { EX.ds = 'afnc'; EX.ids = new Set(recs.map(r => r.id)); EX.idsLabel = s.t; EX.page = 0; closeModal(); go('explorer'); };
}
function acscTable(recs) {
  return table([{ h: 'แถว', k: 'row', n: 1 }, { h: 'สัปดาห์', f: r => `${fdate(r.week_start)} – ${fdate(r.week_end)}${r.days !== 7 ? ` (${r.days} วัน)` : ''}` },
  { h: 'คดี', k: 'cases', n: 1, f: r => fmt(r.cases) }, { h: 'ความเสียหาย (บาท)', n: 1, f: r => fmt(r.loss_baht) + (r.loss_precision === 'rounded' ? ' <span class="badge b-warn">ปัด</span>' : '') },
  { h: 'ป้าย', f: r => r.flag ? `<span class="badge ${r.flagged_suspect ? 'b-no' : 'b-warn'}" title="${esc(r.flag)}">${r.flagged_suspect ? 'Suspect' : 'หมายเหตุ'}</span>` : '' },
  { h: 'แหล่ง', f: r => `<a href="${esc(r.source_url)}" target="_blank" rel="noopener">${esc(r.publisher)}</a>` }], recs, { maxh: 360 });
}
document.addEventListener('click', e => {
  const s = e.target.closest('[data-src]'); if (s) { showSource(s.dataset.src); }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.kpi')) showSource(e.target.dataset.src); });

/* ------------------------------------------------------------ aggregations */
function monthDomain(from, to) { return MONTHS_ALL.filter(ym => ym >= from && ym <= to && monthOk(ym)); }
function countByMonth(rows, from, to) {
  const dom = monthDomain(from, to);
  const m = Object.fromEntries(dom.map(k => [k, { F: 0, D: 0, T: 0 }]));
  rows.forEach(r => { if (m[r.ym]) m[r.ym][r.v]++; });
  return { dom, m };
}
function byQuarter(rows) {
  const out = {};
  monthDomain('2019-01', '2026-10').forEach(ym => { const k = `${ym.slice(0, 4)}-Q${qOf(+ym.slice(5, 7))}`; out[k] = out[k] || { F: 0, D: 0, T: 0, months: 0 }; out[k].months++; });
  rows.forEach(r => { const k = `${r.y}-Q${r.q}`; if (out[k]) out[k][r.v]++; });
  return out;
}
function byYear(rows) {
  const out = {};
  monthDomain('2019-01', '2026-10').forEach(ym => { const k = ym.slice(0, 4); out[k] = out[k] || { F: 0, D: 0, T: 0, months: 0 }; out[k].months++; });
  rows.forEach(r => { const k = String(r.y); if (out[k]) out[k][r.v]++; });
  return out;
}
const selV = () => F.verdicts.length ? ['F', 'D', 'T'].filter(v => F.verdicts.includes(v)) : ['F', 'D', 'T'];
const fakeKey = () => (F.verdicts.length && !F.verdicts.includes('F')) ? selV() : ['F'];
const fakeLabel = () => fakeKey().map(v => VL[v]).join('+');

function periodWindow() { // returns [curStart,curEnd,prevStart,prevEnd,label] or null
  if (F.quarters.length || F.months.length) return null;
  let s = F.start, e = F.end;
  if (!s && !e && F.years.length) { const ys = [...F.years].sort(); if (ys[ys.length - 1] - ys[0] + 1 !== ys.length) return null; s = ys[0] + '-01-01'; e = ys[ys.length - 1] + '-12-31'; }
  if (!s && !e) return null;
  s = s || '2019-01-01'; e = e || '2026-10-31';
  const ds = new Date(s), de = new Date(e); const len = de - ds + 864e5;
  const ps = new Date(ds - len), pe = new Date(ds - 864e5);
  const iso = d => d.toISOString().slice(0, 10);
  return [s, e, iso(ps), iso(pe), `เทียบ ${fdate(iso(ps))} – ${fdate(iso(pe))}`];
}
const inWin = (d, a, b) => d >= a && d <= b;

/* ------------------------------------------------------------ sidebar */
function chips(name, items, sel, labelFn = x => x) {
  return `<div class="chips" data-f="${name}">${items.map(v => `<button type="button" class="chip ${sel.includes(v) ? 'on' : ''}" data-v="${esc(v)}">${esc(labelFn(v))}</button>`).join('')}</div>`;
}
function renderSidebar() {
  const sb = $('#sidebar');
  sb.innerHTML = `<div class="side-h"><h3>ตัวกรองส่วนกลาง</h3><button class="btn sm" id="sbReset" type="button">Reset</button></div>
  <div class="fgroup"><label>ช่วงวันที่ (ค.ศ.)</label><div class="row2"><input type="date" id="fStart" min="2015-01-01" max="2026-10-31" value="${F.start}" aria-label="วันที่เริ่มต้น"><input type="date" id="fEnd" min="2015-01-01" max="2026-10-31" value="${F.end}" aria-label="วันที่สิ้นสุด"></div>
    <div class="hint">ใช้กับ AFNC, ACSC, EUvsDisinfo (FOTN เป็นรายปี ใช้ตัวกรองปี)</div></div>
  <div class="fgroup"><span class="lbl">ปี</span>${chips('years', [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026], F.years)}<div class="hint">FOTN ใช้ data_year</div></div>
  <div class="fgroup"><span class="lbl">ไตรมาส</span>${chips('quarters', [1, 2, 3, 4], F.quarters, q => 'Q' + q)}</div>
  <div class="fgroup"><span class="lbl">เดือน</span>${chips('months', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], F.months, m => TH_M[m - 1])}</div>
  <div class="fgroup"><span class="lbl">ประเทศไทย / ต่างประเทศ</span>${['all', 'th', 'foreign'].map(v => `<label class="chk"><input type="radio" name="region" value="${v}" ${F.region === v ? 'checked' : ''}> ${{ all: 'ทั้งหมด', th: 'ประเทศไทย', foreign: 'ต่างประเทศ' }[v]}</label>`).join('')}</div>
  <div class="fgroup"><label for="fCountry">ประเทศ (Freedom on the Net)</label><select id="fCountry" multiple size="6">${COUNTRIES.map(([i, n]) => `<option value="${i}" ${F.countries.includes(i) ? 'selected' : ''}>${esc(shortName(n))}</option>`).join('')}</select>
    <div class="hint">Ctrl/⌘ + คลิกเพื่อเลือกหลายประเทศ · มีผลกับข้อมูล FOTN เท่านั้น</div></div>
  <div class="fgroup"><span class="lbl">ประเภทข่าว (หมวด AFNC)</span>${chips('cats', A.cats, F.cats)}</div>
  <div class="fgroup"><span class="lbl">สถานะข่าว</span>${chips('verdicts', ['F', 'D', 'T'], F.verdicts, v => VL[v])}<div class="hint">ตามป้ายคำตัดสินของ AFNC</div></div>
  <div class="fgroup"><span class="lbl">ประเภทการหลอกลวง (ACSC)</span>${chips('scam', SCAM_GROUPS, F.scam)}<div class="hint">เลือกสัปดาห์ที่ประเภทนี้เป็นประเภทคดีมากสุดหรือเสียหายสูงสุด</div>
    <label class="chk"><input type="checkbox" id="fFlag" ${F.flagged ? 'checked' : ''}> รวมสัปดาห์ติดป้าย Suspect (16–22 ส.ค. 2026)</label></div>
  <div class="fgroup"><span class="lbl">แหล่งข้อมูล</span>${[['afnc', 'AFNC ศูนย์ต่อต้านข่าวปลอม'], ['acsc', 'ACSC สถิติคดีหลอกลวง'], ['fotn', 'Freedom on the Net'], ['eu', 'EUvsDisinfo']].map(([k, l]) => `<label class="chk"><input type="checkbox" data-srcf="${k}" ${F.sources[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div>`;
  $$('.chips', sb).forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    const key = g.dataset.f; let v = b.dataset.v; if (['years', 'quarters', 'months'].includes(key)) v = +v;
    F[key] = F[key].includes(v) ? F[key].filter(x => x !== v) : [...F[key], v]; update();
  }));
  $('#fStart').onchange = e => { F.start = e.target.value; update(); };
  $('#fEnd').onchange = e => { F.end = e.target.value; update(); };
  $$('input[name=region]', sb).forEach(r => r.onchange = () => { F.region = r.value; update(); });
  $('#fCountry').onchange = e => { F.countries = [...e.target.selectedOptions].map(o => o.value); update(); };
  $('#fFlag').onchange = e => { F.flagged = e.target.checked; update(); };
  $$('[data-srcf]', sb).forEach(c => c.onchange = () => { F.sources[c.dataset.srcf] = c.checked; update(); });
  $('#sbReset').onclick = resetFilters;
}
function update() { renderSidebar(); render(); }
function resetFilters() { F = F0(); EX.ids = null; update(); }
function activeFiltersBar() {
  const t = [];
  if (F.start || F.end) t.push(`ช่วงวันที่: ${F.start ? fdate(F.start) : 'เริ่มต้น'} – ${F.end ? fdate(F.end) : 'ล่าสุด'}`);
  if (F.years.length) t.push('ปี: ' + [...F.years].sort().join(', '));
  if (F.quarters.length) t.push('ไตรมาส: ' + F.quarters.sort().map(q => 'Q' + q).join(', '));
  if (F.months.length) t.push('เดือน: ' + F.months.sort((a, b) => a - b).map(m => TH_M[m - 1]).join(', '));
  if (F.region !== 'all') t.push(F.region === 'th' ? 'ประเทศไทย' : 'ต่างประเทศ');
  if (F.countries.length) t.push('ประเทศ: ' + F.countries.map(i => shortName(CNAME[i])).join(', '));
  if (F.cats.length) t.push('ประเภทข่าว: ' + F.cats.join(', '));
  if (F.verdicts.length) t.push('สถานะ: ' + F.verdicts.map(v => VL[v]).join(', '));
  if (F.scam.length) t.push('การหลอกลวง: ' + F.scam.join(', '));
  if (F.flagged) t.push('รวมสัปดาห์ Suspect');
  const off = Object.entries(F.sources).filter(([, v]) => !v).map(([k]) => ({ afnc: 'AFNC', acsc: 'ACSC', fotn: 'FOTN', eu: 'EUvsDisinfo' }[k]));
  if (off.length) t.push('ปิดแหล่ง: ' + off.join(', '));
  return `<div class="active-filters"><b>ตัวกรองที่ใช้งาน:</b> ${t.length ? t.map(x => `<span class="tag">${esc(x)}</span>`).join('') : '<span class="none">ไม่มี — แสดงข้อมูลทั้งหมด</span>'}
    ${t.length ? '<button class="btn sm" id="afReset" style="margin-left:auto">Reset Filters</button>' : ''}</div>`;
}

/* ------------------------------------------------------------ tabs */
const TABS = [
  ['overview', 'ภาพรวม (Overview)'], ['freedom', 'เสรีภาพอินเทอร์เน็ต'], ['disinfo', 'ข่าวปลอม & ข้อมูลบิดเบือน'],
  ['scam', 'ความเสียหายจากมิจฉาชีพ'], ['corr', 'เสรีภาพ vs ข่าวปลอม (สหสัมพันธ์)'],
  ['explorer', 'Data Explorer & Sources'],
];
let TAB = 'overview';
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([k, l], i) => `<button type="button" class="${k === TAB ? 'active' : ''}" data-tab="${k}">${i + 1}. ${l}</button>`).join('');
  $$('#tabs button').forEach(b => b.onclick = () => go(b.dataset.tab));
}
function go(t) { TAB = t; renderTabs(); render(); window.scrollTo({ top: 0 }); $('#sidebar').classList.remove('open'); }
function render() {
  disposeCharts(); CUR_SUM = null;
  const main = $('#main');
  main.innerHTML = activeFiltersBar() + `<div id="page"></div>`;
  const r = $('#afReset'); if (r) r.onclick = resetFilters;
  ({ overview: pOverview, freedom: pFreedom, disinfo: pDisinfo, scam: pScam, corr: pCorr, explorer: pExplorer })[TAB]($('#page'));
  mascotRefresh();
}

/* ============================================================ 1. OVERVIEW */
const OV = { compare: 'median' };
function latestFotnYear() { const ys = fotnYears(); return ys.length ? ys[ys.length - 1] : null; }
function fotnRow(iso, y) { return FO.find(r => r.iso3 === iso && r.data_year === y); }

function pOverview(el) {
  const v = afV(), ac = acV(), eu = euV();
  const nF = v.filter(r => r.v === 'F').length, nD = v.filter(r => r.v === 'D').length, nT = v.filter(r => r.v === 'T').length;
  const afPer = v.length ? `${fdate(v.reduce((a, r) => r.date < a ? r.date : a, '9'))} – ${fdate(v.reduce((a, r) => r.date > a ? r.date : a, '0'))}` : 'ไม่มีข้อมูลในช่วงที่เลือก';
  const acPer = ac.length ? `${fdate(ac[0].week_start)} – ${fdate(ac[ac.length - 1].week_end)} (${ac.length} สัปดาห์ที่มีการแถลง)` : 'ไม่มีข้อมูลในช่วงที่เลือก';
  const loss = sum(ac.map(r => r.loss_baht));
  // previous-period deltas
  const w = periodWindow();
  let dF = '', dV = '', dT = '', dL = '', dE = '';
  if (w) {
    const pv = afncBlocked() ? [] : AF.filter(r => r.type === 'Verdict' && afncOk(r, { noDate: true }) && inWin(r.date, w[2], w[3]));
    dV = deltaHtml(v.length, pv.length, w[4]); dF = deltaHtml(nF, pv.filter(r => r.v === 'F').length, w[4]); dT = deltaHtml(nT, pv.filter(r => r.v === 'T').length, w[4], false);
    const pa = acscBlocked() ? [] : AC.filter(r => acscOk(r, { noDate: true }) && inWin(r.date, w[2], w[3]));
    dL = w[2] < ACSC_FIRST ? '<span class="flat">ช่วงก่อนหน้าอยู่นอกช่วงข้อมูล ACSC</span>' : deltaHtml(loss, sum(pa.map(r => r.loss_baht)), w[4]);
    const pe = euBlocked() ? [] : EUD.filter(d => inWin(d.date, w[2], w[3]));
    dE = deltaHtml(eu.length, pe.length, w[4]);
  } else {
    const L = (a, b) => AF.filter(r => r.type === 'Verdict' && afncOk(r, { noDate: true }) && inWin(r.date, a, b));
    if (!afncBlocked() && !(F.start || F.end || F.years.length || F.quarters.length || F.months.length)) {
      const cur = L('2025-11-01', '2026-10-31'), prev = L('2024-11-01', '2025-10-31');
      const lab = '12 เดือนล่าสุด (พ.ย. 2025–ต.ค. 2026) เทียบ 12 เดือนก่อนหน้า';
      dV = deltaHtml(cur.length, prev.length, lab); dF = deltaHtml(cur.filter(r => r.v === 'F').length, prev.filter(r => r.v === 'F').length, lab); dT = deltaHtml(cur.filter(r => r.v === 'T').length, prev.filter(r => r.v === 'T').length, lab, false);
    }
    dL = '<span class="flat">ACSC มีข้อมูลไม่ถึง 1 ปี ไม่มีช่วงก่อนหน้าเทียบแบบปีต่อปี</span>';
  }
  const fy = latestFotnYear();
  const thR = (!fotnBlocked() && fy) ? fotnRow('THA', fy) : null, thP = (thR && fy) ? fotnRow('THA', fy - 1) : null;
  const sameYear = fy ? FO.filter(r => r.data_year === fy && fotnOk(r, { noYear: true, noCountry: true, noRegion: true })) : [];
  let cmpLabel, cmpVal, cmpSub;
  if (OV.compare === 'median') { cmpVal = median(sameYear.map(r => r.total_score)); cmpLabel = `ค่ามัธยฐาน ${sameYear.length} ประเทศ`; cmpSub = `data_year ${fy ?? 'N/A'}`; }
  else { const rr = fy ? fotnRow(OV.compare, fy) : null; cmpVal = rr ? rr.total_score : null; cmpLabel = shortName(CNAME[OV.compare]); cmpSub = rr ? `data_year ${fy} · ${STL[rr.status_code]}` : `ไม่มีการประเมินใน data_year ${fy}`; }
  el.innerHTML = `<div class="page-h"><div><h2>ภาพรวมสถานการณ์</h2><p>ตัวชี้วัดหลักของเสรีภาพทางอินเทอร์เน็ต ข่าวปลอม และความเสียหายจากมิจฉาชีพ คลิกที่ตัวเลขเพื่อดูไฟล์ต้นทาง สูตร และรายการที่นำมาคำนวณ</p></div></div>
  <div class="kpis">
    ${kpi({ label: 'คำตัดสินข่าวทั้งหมด (AFNC, ไทย)', value: afncBlocked() ? 'N/A' : fmt(v.length), sub: afPer, delta: dV, src: 'afnc_verdicts' })}
    ${kpi({ label: 'ข่าวปลอม (Fake)', value: afncBlocked() ? 'N/A' : fmt(nF), cls: 'red', sub: `${fmtPct(pct(nF, v.length))} ของคำตัดสิน`, delta: dF, src: 'afnc_fake' })}
    ${kpi({ label: 'ข่าวบิดเบือน (Distorted)', value: afncBlocked() ? 'N/A' : fmt(nD), sub: `${fmtPct(pct(nD, v.length))} ของคำตัดสิน`, src: 'afnc_distorted' })}
    ${kpi({ label: 'ข่าวจริง (True)', value: afncBlocked() ? 'N/A' : fmt(nT), cls: 'green', sub: `${fmtPct(pct(nT, v.length))} ของคำตัดสิน`, delta: dT, src: 'afnc_true' })}
    ${kpi({ label: 'กรณีข้อมูลบิดเบือนต่างประเทศ (EUvsDisinfo debunks)', value: euBlocked() ? 'N/A' : fmt(eu.length), sub: eu.length ? `${fdate(eu.reduce((a, d) => d.date < a ? d.date : a, '9'))} – ${fdate(eu.reduce((a, d) => d.date > a ? d.date : a, '0'))}` : (euBlocked() || 'ไม่มีข้อมูลในช่วงที่เลือก'), delta: dE, src: 'eu_debunks' })}
    ${kpi({ label: 'มูลค่าความเสียหายจากมิจฉาชีพ (ACSC, ไทย)', value: acscBlocked() || !ac.length ? 'N/A' : mBaht(loss), cls: 'red', sub: acPer, delta: dL, src: 'acsc_loss' })}
    ${kpi({ label: 'คะแนนเสรีภาพอินเทอร์เน็ต ประเทศไทย', value: thR ? `${thR.total_score}/100` : 'N/A', sub: thR ? `data_year ${fy} (รายงาน ${thR.report_edition}) · ${STL[thR.status_code]}` : (fotnBlocked() || 'ไม่มีข้อมูลปีที่เลือก'), delta: thR && thP ? `<span class="flat">เทียบปีก่อน: ${thR.total_score - thP.total_score >= 0 ? '+' : ''}${thR.total_score - thP.total_score} คะแนน</span>` : '', src: 'fotn_score' })}
    ${kpi({ label: 'คะแนนเปรียบเทียบ: ' + esc(cmpLabel), value: isNum(cmpVal) ? `${fmt1(cmpVal).replace('.0', '')}/100` : 'N/A', sub: cmpSub, delta: (thR && isNum(cmpVal)) ? `<span class="flat">ไทยต่างจากค่านี้ ${thR.total_score - cmpVal >= 0 ? '+' : ''}${fmt1(thR.total_score - cmpVal)} คะแนน</span>` : '', src: 'fotn_score' })}
  </div>
  <div class="toolbar" style="margin-top:8px"><label for="ovCmp" style="font-size:12.5px;color:#4d4f53">ประเทศที่ใช้เปรียบเทียบใน KPI:</label>
   <select id="ovCmp" style="max-width:280px"><option value="median">ค่ามัธยฐานทุกประเทศในปีเดียวกัน</option>${COUNTRIES.filter(([i]) => i !== 'THA').map(([i, n]) => `<option value="${i}" ${OV.compare === i ? 'selected' : ''}>${esc(shortName(n))}</option>`).join('')}</select></div>
  <h3 class="sec-h">กราฟภาพรวม</h3>
  <div class="grid g2">
    ${card({ id: 'ovFake', title: 'แนวโน้มจำนวนข่าวปลอมและข่าวบิดเบือนรายเดือน', sub: 'หน่วย: คำตัดสินต่อเดือน · AFNC ประเทศไทย · คลิกจุดเพื่อดูรายการของเดือนนั้น', ds: 'afnc', src: 'afnc_time' })}
    ${card({ id: 'ovLoss', title: 'แนวโน้มมูลค่าความเสียหายจากมิจฉาชีพรายสัปดาห์', sub: 'หน่วย: ล้านบาทต่อสัปดาห์ · ACSC · ช่องว่าง = สัปดาห์ที่ไม่มีการแถลง (ไม่ใช่ 0)', ds: 'acsc', src: 'acsc_loss' })}
    ${card({ id: 'ovShare', title: 'สัดส่วนข่าวจริง ข่าวปลอม และข่าวบิดเบือน', sub: `หน่วย: % ของคำตัดสิน (ตัวหาร = ${fmt(v.length)} คำตัดสิน) · ${afPer}`, ds: 'afnc', src: 'afnc_share' })}
    ${card({ id: 'ovCat', title: 'ประเภทข่าวเท็จที่พบมากที่สุด (ปลอม+บิดเบือน)', sub: `หน่วย: คำตัดสิน · ${afPer} · คลิกแท่งเพื่อดูแนวโน้มของหมวดนั้น`, ds: 'afnc', src: 'afnc_cat' })}
  </div>
  <div class="grid" style="margin-top:14px">
    ${card({ id: 'ovFotn', title: `คะแนนเสรีภาพอินเทอร์เน็ต: ไทยเทียบอาเซียน${F.countries.length ? ' และประเทศที่เลือก' : ''} (data_year ${fy ?? 'N/A'})`, sub: 'หน่วย: คะแนน 0–100 ยิ่งสูงยิ่งเสรี · สีตามสถานะ · คลิกแท่งเพื่อดูรายละเอียดประเทศ', ds: 'fotn', src: 'fotn_score' })}
  </div>`;
  $('#ovCmp').value = OV.compare; $('#ovCmp').onchange = e => { OV.compare = e.target.value; render(); };

  // trend
  if (afncBlocked() || !v.length) $('#ovFake').innerHTML = na(afncBlocked() || 'ไม่มีคำตัดสินในช่วงที่เลือก');
  else {
    const { dom, m } = countByMonth(v, '2019-01', '2026-10');
    const vs = selV().filter(x => x !== 'T');
    mkChart('ovFake', {
      tooltip: { trigger: 'axis', ...tipBase }, legend: { ...legendTop, data: vs.map(x => VL[x]) }, grid: grid(),
      xAxis: { type: 'category', data: dom.map(fym), ...axisBase }, yAxis: { type: 'value', name: 'คำตัดสิน', nameTextStyle: { color: '#7a7c80' }, ...axisBase },
      dataZoom: [{ type: 'inside' }],
      series: vs.map(x => ({ name: VL[x], type: 'line', data: dom.map(k => m[k][x]), symbol: 'circle', symbolSize: 5, showSymbol: false, lineStyle: { width: 2 }, color: V[x] })),
    }, p => { const ym = dom[p.dataIndex]; showRecords(`คำตัดสิน ${fym(ym)}`, v.filter(r => r.ym === ym), `คำตัดสินของ AFNC ที่เผยแพร่ในเดือน ${fym(ym)} ตามตัวกรองปัจจุบัน`, { label: 'กรองทั้งแดชบอร์ดเป็นเดือนนี้', fn: () => { F.start = ym + '-01'; F.end = ym + '-' + new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate(); } }); });
  }
  lossChart('ovLoss', ac);
  // share donut
  if (afncBlocked() || !v.length) $('#ovShare').innerHTML = na(afncBlocked() || 'ไม่มีคำตัดสินในช่วงที่เลือก');
  else donut('ovShare', { F: nF, D: nD, T: nT }, v.length);
  // categories
  const fals = v.filter(r => r.v !== 'T');
  if (!fals.length) $('#ovCat').innerHTML = na(afncBlocked() || 'ไม่มีข่าวเท็จในช่วง/สถานะที่เลือก');
  else catBar('ovCat', fals, c => { DS.trendCat = c; go('disinfo'); setTimeout(() => { const t = $('#dsCatTrend'); if (t) t.scrollIntoView({ behavior: 'smooth' }); }, 60); });
  // fotn
  fotnCompareBar('ovFotn', fy);
}
function lossChart(id, ac) {
  if (acscBlocked()) { $('#' + id).innerHTML = na(acscBlocked()); return; }
  if (!ac.length) { $('#' + id).innerHTML = na('ไม่มีสัปดาห์ที่มีการแถลงในช่วงที่เลือก (ACSC มีข้อมูล 9 พ.ย. 2025 – 24 ต.ค. 2026)'); return; }
  // continuous week axis so that unreported weeks show as gaps
  const first = ac[0].week_start, last = ac[ac.length - 1].week_start;
  const weeks = []; for (let d = new Date(first); d <= new Date(last); d.setDate(d.getDate() + 7)) weeks.push(d.toISOString().slice(0, 10));
  const byW = {}; ac.forEach(r => { byW[r.week_start] = r; });
  // 8-day period starts on Saturday: map it to the following Sunday slot
  ac.filter(r => !weeks.includes(r.week_start)).forEach(r => { const d = new Date(r.week_start); d.setDate(d.getDate() + 1); byW[d.toISOString().slice(0, 10)] = r; });
  const data = weeks.map(w => byW[w] ? +(byW[w].loss_baht / 1e6).toFixed(2) : null);
  mkChart(id, {
    tooltip: { trigger: 'axis', ...tipBase, formatter: ps => { const w = weeks[ps[0].dataIndex], r = byW[w]; return r ? `<b>${fdate(r.week_start)} – ${fdate(r.week_end)}</b><br>ความเสียหาย ${fmt1(r.loss_baht / 1e6)} ล้านบาท${r.loss_precision === 'rounded' ? ' (ตัวเลขปัด)' : ''}<br>คดี ${fmt(r.cases)} คดี${r.flag ? `<br><span style="color:#a51d24">⚠ ${esc(r.flag).slice(0, 90)}…</span>` : ''}` : `<b>${fdate(w)}</b><br>ไม่มีการแถลง/ถูกกรองออก (ไม่ใช่ 0)`; } },
    grid: grid({ top: 20 }), xAxis: { type: 'category', data: weeks.map(fdate), ...axisBase }, yAxis: { type: 'value', name: 'ล้านบาท', ...axisBase },
    series: [{ type: 'line', data, connectNulls: false, symbolSize: 6, lineStyle: { width: 2 }, color: '#a51d24', areaStyle: { color: 'rgba(165,29,36,.08)' } }],
  }, p => { const r = byW[weeks[p.dataIndex]]; if (r) openModal(`ACSC สัปดาห์ ${fdate(r.week_start)}`, acscDetail(r)); });
}
function acscDetail(r) {
  return `<dl class="src">${[['ไฟล์', `<code>${FILES.acsc}</code> แถวที่ ${r.row}`], ['ช่วงเวลา', `${fdate(r.week_start)} – ${fdate(r.week_end)} (${r.days} วัน)`], ['จำนวนคดี', fmt(r.cases) + ' คดี'], ['มูลค่าความเสียหาย', fmt(r.loss_baht) + ' บาท (' + r.loss_precision + ')'],
  ['ความเสียหายต่อคดี', fmt(r.loss_per_case_baht) + ' บาท'], ['ส่วนต่างที่แถลง', `คดี ${fmt(r.cases_change_vs_prev_week)} · ${fmt(r.loss_change_vs_prev_week_baht)} บาท (ตามที่ตำรวจแถลง)`],
  ['ประเภทคดีมากสุด', `${esc(r.top_type_th || 'ไม่ระบุ')} ${r.top_type_case_share_pct ? '(' + r.top_type_case_share_pct + '%)' : ''} → กลุ่ม: ${esc(r.top_group || '-')}`],
  ['ประเภทเสียหายสูงสุด', `${esc(r.highest_loss_type_th || 'ไม่ระบุ')} ${r.highest_loss_type_loss_baht ? '(' + fmt(r.highest_loss_type_loss_baht) + ' บาท)' : ''} → กลุ่ม: ${esc(r.hl_group || '-')}`],
  ['ป้ายเตือน', esc(r.flag || '-')], ['แหล่งข่าว', `${esc(r.publisher)} (${fdate(r.article_date)}) <a href="${esc(r.source_url)}" target="_blank" rel="noopener">เปิดลิงก์ต้นทาง</a>`], ['หมายเหตุผู้รวบรวม', esc(r.notes || '-')]]
    .map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>`;
}
function donut(id, c, total) {
  const keys = selV();
  mkChart(id, {
    tooltip: { trigger: 'item', ...tipBase, formatter: p => `${p.name}<br><b>${fmt(p.value)}</b> รายการ (${fmt1(p.percent)}%)<br>ตัวหาร ${fmt(total)} คำตัดสิน` },
    legend: { ...legendTop, bottom: 0, top: 'auto' },
    series: [{ type: 'pie', radius: ['48%', '74%'], center: ['50%', '46%'], padAngle: 1, itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 4 },
      label: { formatter: p => `${p.name}\n${fmt1(p.percent)}%`, fontSize: 12, color: '#16181b' },
      data: keys.map(k => ({ name: VL[k], value: c[k], itemStyle: { color: V[k] } })) }],
    graphic: [{ type: 'text', left: 'center', top: '40%', style: { text: fmt(total), font: `700 20px ${FONT}`, fill: '#16181b', textAlign: 'center' } }, { type: 'text', left: 'center', top: '50%', style: { text: 'คำตัดสิน', font: `12px ${FONT}`, fill: '#7a7c80', textAlign: 'center' } }],
  });
}
function catBar(id, rows, onClick) {
  const cnt = {}; rows.forEach(r => { cnt[r.cat] = (cnt[r.cat] || 0) + 1; });
  const arr = Object.entries(cnt).sort((a, b) => a[1] - b[1]);
  mkChart(id, {
    tooltip: { trigger: 'item', ...tipBase, formatter: p => `${p.name} (${A.cat_en[p.name] || ''})<br><b>${fmt(p.value)}</b> รายการ · ${fmt1(p.value / rows.length * 100)}%` },
    grid: grid({ top: 10, right: 50 }), xAxis: { type: 'value', ...axisBase }, yAxis: { type: 'category', data: arr.map(a => a[0]), ...axisBase, axisLabel: { color: '#4d4f53', fontSize: 12 } },
    series: [{ type: 'bar', data: arr.map(a => ({ value: a[1], itemStyle: { color: catColor(a[0]), borderRadius: [0, 4, 4, 0] } })), barMaxWidth: 22, label: { show: true, position: 'right', formatter: p => fmt(p.value), fontSize: 11, color: '#4d4f53' } }],
  }, p => onClick && onClick(p.name));
}
function fotnCompareBar(id, fy, list) {
  if (fotnBlocked()) { $('#' + id).innerHTML = na(fotnBlocked()); return; }
  if (!fy) { $('#' + id).innerHTML = na('ไม่มีปีของ FOTN ในตัวกรองปี (FOTN มี data_year 2010–2024)'); return; }
  let isos = list || [...new Set([...ASEAN, ...F.countries])];
  if (F.region === 'th') isos = ['THA']; if (F.region === 'foreign') isos = isos.filter(i => i !== 'THA');
  const rows = isos.map(i => fotnRow(i, fy)).filter(Boolean).sort((a, b) => b.total_score - a.total_score);
  const missing = isos.filter(i => !fotnRow(i, fy)).map(i => shortName(CNAME[i]));
  if (!rows.length) { $('#' + id).innerHTML = na(`ไม่มีประเทศที่เลือกที่มีการประเมินใน data_year ${fy}`); return; }
  mkChart(id, {
    tooltip: { trigger: 'item', ...tipBase, formatter: p => { const r = rows[p.dataIndex]; return `<b>${shortName(r.country)}</b> · data_year ${fy}<br>คะแนนรวม ${r.total_score}/100 (${STL[r.status_code]})<br>เข้าถึง ${r.obstacles_to_access}/25 · เนื้อหา ${r.limits_on_content}/35 · สิทธิผู้ใช้ ${r.violations_of_user_rights}/40`; } },
    grid: grid({ top: 18 }), xAxis: { type: 'category', data: rows.map(r => shortName(r.country)), ...axisBase, axisLabel: { color: '#4d4f53', fontSize: 11.5, interval: 0, rotate: rows.length > 9 ? 30 : 0 } },
    yAxis: { type: 'value', max: 100, name: 'คะแนน', ...axisBase },
    series: [{ type: 'bar', barMaxWidth: 36, data: rows.map(r => ({ value: r.total_score, itemStyle: { color: STC[r.status_code], borderRadius: [4, 4, 0, 0], opacity: r.iso3 === 'THA' ? 1 : .72, borderColor: r.iso3 === 'THA' ? '#16181b' : 'transparent', borderWidth: r.iso3 === 'THA' ? 2 : 0 } })), label: { show: true, position: 'top', fontSize: 11, color: '#16181b' },
      markLine: { silent: true, symbol: 'none', lineStyle: { color: '#9a9893', type: 'dashed' }, label: { formatter: '{b}', fontSize: 10, color: '#7a7c80' }, data: [{ yAxis: 70, name: 'เกณฑ์ "เสรี" 70' }, { yAxis: 40, name: 'เกณฑ์ "เสรีบางส่วน" 40' }] } }],
  }, p => { FS.detail = rows[p.dataIndex].iso3; FS.year = fy; go('freedom'); });
  if (missing.length) $('#' + id).insertAdjacentHTML('afterend', `<div class="sub">N/A (ไม่มีการประเมินใน data_year ${fy}): ${esc(missing.join(', '))}</div>`);
}
function peakOf(obj, keys) { let best = null; Object.entries(obj).forEach(([k, c]) => { const n = sum(keys.map(x => c[x])); if (!best || n > best[1]) best = [k, n]; }); return best; }
/* ---- สรุปรายหน้า (ภาษาง่าย ๆ ต่อเนื่อง, เปลี่ยนตามตัวกรอง) ---- */
const rangeTxt = rs => rs.length ? `${fdate(rs.reduce((a, r) => r.date < a ? r.date : a, '9'))} ถึง ${fdate(rs.reduce((a, r) => r.date > a ? r.date : a, '0'))}` : '';
function filterIntro() {
  return activeKeys().length ? 'สรุปนี้คำนวณใหม่ตามตัวกรองที่คุณเลือกอยู่ในขณะนี้ (ดูรายการตัวกรองที่แถบสีชมพูด้านบนของหน้า) ถ้าอยากดูภาพรวมทั้งหมดให้กดปุ่ม Reset Filters' : 'สรุปนี้ใช้ข้อมูลทั้งหมดที่แนบมา โดยยังไม่ได้เลือกตัวกรองใด ๆ และจะเปลี่ยนไปเองเมื่อคุณเลือกตัวกรอง';
}
function proseAfnc(extra) {
  const v = afV();
  if (!v.length) return `ข้อมูลข่าวปลอมของไทยไม่ถูกนำมาสรุป เพราะ ${afncBlocked() || 'ไม่มีคำตัดสินข่าวในช่วงที่เลือก'}`;
  const nF = v.filter(r => r.v === 'F').length, nD = v.filter(r => r.v === 'D').length, nT = v.filter(r => r.v === 'T').length;
  const kk = fakeKey();
  const { dom, m } = countByMonth(v, '2019-01', '2026-10');
  const pm = dom.reduce((b, k) => { const n = sum(kk.map(x => m[k][x])); return !b || n > b[1] ? [k, n] : b; }, null);
  const Q = byQuarter(v), pq = peakOf(Q, kk), py = peakOf(byYear(v), kk);
  const fals = v.filter(r => r.v !== 'T'); const cc = {}; fals.forEach(r => cc[r.cat] = (cc[r.cat] || 0) + 1);
  const top = Object.entries(cc).sort((a, b) => b[1] - a[1]);
  let t = `ศูนย์ต่อต้านข่าวปลอมซึ่งเป็นหน่วยงานของรัฐตรวจสอบและประกาศผลข่าวไว้ ${fmt(v.length)} เรื่อง (ช่วง ${rangeTxt(v)}) ในจำนวนนี้เป็นข่าวปลอม ${fmt(nF)} เรื่อง คิดเป็น ${fmtPct(pct(nF, v.length))} เป็นข่าวบิดเบือนหรือเอาความจริงบางส่วนไปบิดเบือน ${fmt(nD)} เรื่อง (${fmtPct(pct(nD, v.length))}) และเป็นข่าวจริงที่ศูนย์ฯ ยืนยันให้ ${fmt(nT)} เรื่อง (${fmtPct(pct(nT, v.length))}) ควรเข้าใจว่าตัวเลขนี้คือเรื่องที่ศูนย์ฯ เลือกตรวจและเผยแพร่เท่านั้น ไม่ใช่สัดส่วนของข่าวปลอมทั้งหมดในสังคม`;
  if (pm && pq && py) t += ` ช่วงที่มี${fakeLabel()}ถูกประกาศมากที่สุดคือเดือน ${fym(pm[0])} (${fmt(pm[1])} เรื่อง) ไตรมาส ${pq[0].replace('-', ' ')} (${fmt(pq[1])} เรื่อง) และปี ${py[0]} (${fmt(py[1])} เรื่อง${py[0] === '2026' ? ' ซึ่งปี 2026 มีข้อมูลถึงเดือนตุลาคมเท่านั้น' : ''})`;
  if (top.length) t += ` ข่าวเท็จ (ข่าวปลอมรวมข่าวบิดเบือน) ที่พบมากที่สุดอยู่ในหมวด "${top[0][0]}" จำนวน ${fmt(top[0][1])} เรื่อง หรือ ${fmtPct(pct(top[0][1], fals.length))} ของข่าวเท็จทั้งหมด รองลงมาคือ ${top.slice(1, 3).map(x => `"${x[0]}" ${fmt(x[1])} เรื่อง (${fmtPct(pct(x[1], fals.length))})`).join(' และ ')}`;
  if (extra) {
    const qs = Object.entries(Q).map(([k, c]) => [k, sum(kk.map(x => c[x]))]).sort((a, b) => b[1] - a[1]).slice(0, 3);
    t += ` ไตรมาสที่ ${fakeLabel()}มากที่สุด 3 อันดับแรกคือ ${qs.map(x => `${x[0].replace('-', ' ')} (${fmt(x[1])} เรื่อง)`).join(' ') }`;
    const Y = byYear(v), yk = Object.keys(Y).filter(k => sum(['F', 'D', 'T'].map(x => Y[k][x])) > 0);
    if (yk.length >= 2) { const yv = yk.map(k => sum(kk.map(x => Y[k][x]))); t += ` เมื่อดูรายปี จำนวนที่ประกาศในแต่ละปีคือ ${yk.map((k, i) => `${k}: ${fmt(yv[i])}`).join(', ')} (ปี 2019 เพิ่งเริ่มเปิดศูนย์และปี 2026 ยังไม่ครบปี จึงไม่ควรเทียบยอดตรง ๆ)`; }
    const c = {}; fals.forEach(r => r.tags && r.tags.split(';').map(x => x.trim()).filter(x => x && x !== 'AntiFakeNewsCenter').forEach(x => c[x] = (c[x] || 0) + 1));
    const tg = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (tg.length) t += ` หัวข้อที่ถูกกล่าวถึงบ่อยในข่าวเท็จ ได้แก่ ${tg.map(x => `"${x[0]}" (${fmt(x[1])} ครั้ง)`).join(' ')}`;
    const ag = {}; v.forEach(r => { if (r.ag) ag[r.ag] = (ag[r.ag] || 0) + 1; });
    const ta = Object.entries(ag).sort((a, b) => b[1] - a[1])[0];
    if (ta) t += ` หน่วยงานที่ช่วยตรวจสอบข้อเท็จจริงบ่อยที่สุดคือ ${ta[0]} (${fmt(ta[1])} เรื่อง) โดยราว ${fmtPct(pct(v.filter(r => !r.ag).length, v.length))} ของคำตัดสินไม่ระบุหน่วยงาน`;
    t += ' เรื่องข่าวที่ถูกประกาศซ้ำหัวข้อเดิมมีอยู่ราว 932 เรื่อง ซึ่งเป็นข่าวลือที่วนกลับมา ไม่ได้ถูกตัดทิ้ง';
  }
  return t;
}
function proseAcsc(extra) {
  const ac = acV();
  if (!ac.length) return `ข้อมูลความเสียหายจากมิจฉาชีพไม่ถูกนำมาสรุป เพราะ ${acscBlocked() || 'ไม่มีสัปดาห์ที่มีการแถลงในช่วงที่เลือก (ข้อมูลมีเฉพาะ 9 พฤศจิกายน 2025 ถึง 24 ตุลาคม 2026)'}`;
  const loss = sum(ac.map(r => r.loss_baht)), cases = sum(ac.map(r => r.cases)), days = sum(ac.map(r => r.days));
  let t = `ข้อมูลความเสียหายจากมิจฉาชีพออนไลน์มาจากตัวเลขที่ศูนย์ต่อต้านการฉ้อโกงออนไลน์ของตำรวจแถลงเป็นรายสัปดาห์ ในช่วง ${fdate(ac[0].week_start)} ถึง ${fdate(ac[ac.length - 1].week_end)} (${ac.length} สัปดาห์ที่มีการแถลง) มีคดีที่ประชาชนแจ้งความ ${fmt(cases)} คดี ความเสียหายรวม ${mBaht(loss)} เฉลี่ยคดีละประมาณ ${fmt(loss / cases)} บาท หรือราววันละ ${fmt1(loss / days / 1e6)} ล้านบาท`;
  if (ac.length >= 8) {
    const a = ac.slice(0, 4), b = ac.slice(-4);
    const la = sum(a.map(r => r.loss_baht)) / sum(a.map(r => r.days)), lb = sum(b.map(r => r.loss_baht)) / sum(b.map(r => r.days));
    t += ` เมื่อเทียบ 4 สัปดาห์แรกกับ 4 สัปดาห์ล่าสุดของช่วงนี้ ความเสียหายเฉลี่ยต่อวัน${lb >= la ? 'เพิ่มขึ้น' : 'ลดลง'}จาก ${fmt1(la / 1e6)} เป็น ${fmt1(lb / 1e6)} ล้านบาท (${lb >= la ? 'เพิ่ม' : 'ลด'} ${fmt1(Math.abs((lb - la) / la * 100))}%) โดยตัวเลขช่วงหลังถูกปัดเป็นหน่วยล้านบาท`;
  }
  if (extra) {
    const mx = ac.reduce((b, r) => r.loss_baht > b.loss_baht ? r : b), mn = ac.reduce((b, r) => r.loss_baht < b.loss_baht ? r : b);
    t += ` สัปดาห์ที่เสียหายสูงสุดคือ ${fdate(mx.week_start)} ถึง ${fdate(mx.week_end)} (${mBaht(mx.loss_baht)} จาก ${fmt(mx.cases)} คดี) และต่ำสุดคือ ${fdate(mn.week_start)} ถึง ${fdate(mn.week_end)} (${mBaht(mn.loss_baht)} จาก ${fmt(mn.cases)} คดี)`;
    const hl = {}; ac.forEach(r => { if (r.hl_group) hl[r.hl_group] = (hl[r.hl_group] || 0) + 1; });
    const th = Object.entries(hl).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (th.length) t += ` ประเภทการหลอกลวงที่ถูกรายงานว่าสร้างความเสียหายสูงสุดของสัปดาห์บ่อยที่สุดคือ ${th.map(x => `"${x[0]}" (${x[1]} สัปดาห์)`).join(' ')}`;
    const sh = ac.filter(r => isNum(r.top_type_case_share_pct)).map(r => r.top_type_case_share_pct);
    if (sh.length) t += ` ส่วนประเภทที่มีจำนวนคดีมากที่สุดคือการหลอกซื้อขายสินค้าและบริการออนไลน์เกือบทุกสัปดาห์ โดยมีสัดส่วนประมาณ ${fmt1(Math.min(...sh))} ถึง ${fmt1(Math.max(...sh))}% ของคดีในสัปดาห์ที่ข่าวระบุตัวเลข`;
  }
  t += ' ตัวเลขนี้เป็นเฉพาะคดีที่มีการแจ้งความ ความเสียหายจริงน่าจะสูงกว่านี้ และข้อมูลไม่ได้บอกจำนวนผู้เสียหาย';
  if (!F.flagged && AC.some(r => r.flagged_suspect)) t += ' สัปดาห์ 16 ถึง 22 สิงหาคม 2026 ถูกตัดออกจากการรวมเพราะตัวเลขที่แถลงสูงผิดปกติราว 13 เท่า และขัดกับรายละเอียดในแถลงการณ์เดียวกัน';
  return t;
}
function proseFotn(extra) {
  if (fotnBlocked()) return `คะแนนเสรีภาพอินเทอร์เน็ตไม่ถูกนำมาสรุป เพราะ ${fotnBlocked()}`;
  const ys = fotnYears();
  if (!ys.length) return 'คะแนนเสรีภาพอินเทอร์เน็ตไม่ถูกนำมาสรุป เพราะไม่มีข้อมูลในปีที่เลือก (ข้อมูลมีเฉพาะปี 2010 ถึง 2024)';
  const fy = extra && FS.year && ys.includes(FS.year) ? FS.year : ys[ys.length - 1];
  const th = fotnRow('THA', fy);
  if (!th) return `ไม่มีคะแนนของประเทศไทยในปี ${fy}`;
  const all = FO.filter(r => r.data_year === fy).sort((a, b) => b.total_score - a.total_score);
  const rank = all.findIndex(r => r.iso3 === 'THA') + 1;
  let t = `องค์กร Freedom House ให้คะแนนเสรีภาพในการใช้อินเทอร์เน็ตของแต่ละประเทศเต็ม 100 ยิ่งสูงยิ่งเสรี โดยแบ่งเป็นการเข้าถึงอินเทอร์เน็ตเต็ม 25 การจำกัดเนื้อหาเต็ม 35 และการคุ้มครองสิทธิผู้ใช้เต็ม 40 ในข้อมูลปี ${fy} ประเทศไทยได้ ${th.total_score} คะแนน อยู่ในกลุ่ม "${STL[th.status_code]}" อันดับที่ ${rank} จาก ${all.length} ประเทศที่ได้รับการประเมิน ขณะที่คะแนนกลางของทุกประเทศอยู่ที่ ${fmt1(median(all.map(r => r.total_score)))} คะแนนย่อยของไทยคือ การเข้าถึง ${th.obstacles_to_access} จาก 25 การจำกัดเนื้อหา ${th.limits_on_content} จาก 35 และสิทธิผู้ใช้ ${th.violations_of_user_rights} จาก 40 ซึ่งด้านสิทธิผู้ใช้เป็นด้านที่ได้คะแนนน้อยที่สุดเมื่อเทียบกับคะแนนเต็ม`;
  if (extra) {
    const tr = ys.map(y => fotnRow('THA', y)).filter(Boolean);
    if (tr.length >= 2) {
      const mx = tr.reduce((b, r) => r.total_score > b.total_score ? r : b), mn = tr.reduce((b, r) => r.total_score < b.total_score ? r : b);
      t += ` ย้อนดูแนวโน้มของไทยในปี ${tr[0].data_year} ถึง ${tr[tr.length - 1].data_year} คะแนนเปลี่ยนจาก ${tr[0].total_score} เป็น ${tr[tr.length - 1].total_score} โดยสูงสุดในปี ${mx.data_year} (${mx.total_score}) และต่ำสุดในปี ${mn.data_year} (${mn.total_score}) ไทยอยู่ในกลุ่ม "ไม่เสรี" เกือบทุกปี ยกเว้นข้อมูลปี 2012 ที่เป็น "เสรีบางส่วน"`;
    }
    const as = ASEAN.map(i => fotnRow(i, fy)).filter(Boolean).sort((a, b) => b.total_score - a.total_score);
    if (as.length) t += ` เมื่อเทียบเฉพาะประเทศอาเซียนที่มีข้อมูลในปีนี้ (${as.length} ประเทศ) เรียงจากมากไปน้อยคือ ${as.map(r => `${shortName(r.country)} ${r.total_score}`).join(' ')} ไทยอยู่อันดับที่ ${as.findIndex(r => r.iso3 === 'THA') + 1}`;
    if (FS.detail && FS.detail !== 'THA') { const d = fotnRow(FS.detail, fy); if (d) t += ` ประเทศที่คุณกำลังเปิดดูรายละเอียดคือ ${shortName(d.country)} ได้ ${d.total_score} คะแนน (${STL[d.status_code]}) อันดับที่ ${all.indexOf(d) + 1} ต่างจากไทย ${d.total_score - th.total_score >= 0 ? '+' : ''}${d.total_score - th.total_score} คะแนน`; }
    t += ` จำนวนประเทศที่ถูกประเมินแต่ละปีไม่เท่ากัน (เพิ่มจาก 37 ประเทศในปี 2010 เป็น 71 ประเทศในปี 2024) ประเทศที่ไม่มีข้อมูลในปีใดจึงไม่ได้แปลว่าได้ศูนย์คะแนน`;
  }
  return t + ' คะแนนนี้เป็นการประเมินของผู้เชี่ยวชาญ ไม่ได้มาจากการนับเหตุการณ์';
}
function proseEu(extra) {
  const eu = euV();
  if (!eu.length) return euBlocked() ? `ข้อมูล EUvsDisinfo ไม่ถูกนำมาสรุป เพราะ ${euBlocked()}` : 'ไม่มีการหักล้างของ EUvsDisinfo ในช่วงที่เลือก (ข้อมูลมีเฉพาะมกราคม 2015 ถึงสิงหาคม 2023)';
  let t = `สำหรับข้อมูลบิดเบือนในต่างประเทศ โครงการ EUvsDisinfo ของสหภาพยุโรปบันทึกการหักล้างข้อมูลเท็จที่สนับสนุนรัฐบาลรัสเซียไว้ ${fmt(eu.length)} เรื่อง (ช่วง ${rangeTxt(eu)})`;
  if (extra) {
    const kc = {}; eu.forEach(d => d.kws.forEach(k => kc[k] = (kc[k] || 0) + 1));
    const tk = Object.entries(kc).sort((a, b) => b[1] - a[1]).slice(0, 4);
    t += ` ประเด็นที่ถูกหักล้างบ่อยที่สุดคือ ${tk.map(([k, n]) => `"${D.eu.keywords[k]}" (${fmt(n)} เรื่อง)`).join(' ')}`;
  }
  return t + ' ชุดข้อมูลนี้ไม่ได้ระบุประเทศและเก็บเฉพาะข้อมูลเท็จฝั่งเดียว จึงเอาไปเทียบว่าประเทศใดมีข่าวปลอมมากกว่ากันไม่ได้';
}
function proseCorr() {
  const C = id => D.analysis.correlations.find(c => c.id === id);
  const lvl = c => { const a = Math.abs(c.spearman); return a < .1 ? 'แทบไม่มีความสัมพันธ์' : a < .3 ? 'มีความสัมพันธ์ระดับอ่อน' : a < .5 ? 'มีความสัมพันธ์ระดับปานกลาง' : 'มีความสัมพันธ์ค่อนข้างสูง'; };
  const dir = c => Math.abs(c.spearman) < .1 ? '' : c.spearman > 0 ? ' ไปทางเดียวกัน' : ' สวนทางกัน';
  const one = (c, a, b) => `${a} กับ ${b} (${c.n} จุดข้อมูล) ${lvl(c)}${dir(c)} (ค่า ρ = ${fmt2(c.spearman)}, p = ${fmt2(c.spearman_p)}) ซึ่ง${c.spearman_p < .05 ? 'มีนัยสำคัญทางสถิติ' : 'ยังไม่มีนัยสำคัญทางสถิติ'}`;
  const c1 = C('th_fotn_vs_fake'), c2 = C('th_loc_vs_false'), c3 = C('wk_false_vs_cases'), c4 = C('wk_false_vs_loss'), c5 = C('ru_fotn_vs_debunks');
  return [
    'หน้านี้ตอบว่าเสรีภาพทางอินเทอร์เน็ตมีความสัมพันธ์กับจำนวนข่าวปลอมและความเสียหายจากมิจฉาชีพหรือไม่ โดยเทียบเฉพาะข้อมูลที่เป็นประเทศและช่วงเวลาเดียวกันเท่านั้น ใช้ค่า ρ (Spearman) ซึ่งมีค่าตั้งแต่ -1 ถึง +1 ยิ่งใกล้ 0 ยิ่งไม่เกี่ยวข้องกัน และใช้ค่า p เป็นตัวบอกว่าผลนี้น่าจะเกิดจากความบังเอิญหรือไม่ (ถ้า p ต่ำกว่า 0.05 ถือว่ามีนัยสำคัญ) ผลในหน้านี้คำนวณจากข้อมูลทั้งชุด ไม่เปลี่ยนตามตัวกรอง',
    `คู่ที่ 1 คือคะแนนเสรีภาพของไทยกับจำนวนข่าวปลอมที่ศูนย์ต่อต้านข่าวปลอมประกาศรายปี ปี ${c1.points[0][2]} ถึง ${c1.points[c1.points.length - 1][2]} ${one(c1, 'คะแนนเสรีภาพ', 'ข่าวปลอม')} เพราะมีข้อมูลทับซ้อนเพียง ${c1.n} ปี ซึ่งน้อยเกินกว่าจะสรุปอะไรได้ ผลของคะแนนด้านการจำกัดเนื้อหากับข่าวเท็จก็คล้ายกัน (ρ = ${fmt2(c2.spearman)}, p = ${fmt2(c2.spearman_p)})`,
    `คู่ที่ 2 คือคะแนนเสรีภาพกับความเสียหายจากมิจฉาชีพ ซึ่งคำนวณไม่ได้เลย เพราะข้อมูลเสรีภาพมีถึงปี 2024 แต่ข้อมูลความเสียหายเริ่มเดือนพฤศจิกายน 2025 จึงไม่มีปีที่ตรงกัน`,
    `คู่ที่ 3 เป็นปัจจัยอื่นที่มีในข้อมูล คือข่าวเท็จรายสัปดาห์เทียบกับคดีและความเสียหายรายสัปดาห์ (${c3.n} สัปดาห์ ไม่รวมสัปดาห์ที่ตัวเลขผิดปกติ) ${one(c3, 'ข่าวเท็จ', 'จำนวนคดี')} และ ${one(c4, 'ข่าวเท็จ', 'มูลค่าความเสียหาย')} แปลว่าสัปดาห์ที่มีข่าวเท็จมากไม่ได้ทำให้เห็นว่าคดีหรือความเสียหายสูงตาม และเมื่อดูการเปลี่ยนแปลงจากสัปดาห์ก่อนก็ไม่พบความสัมพันธ์เช่นกัน`,
    `คู่ที่ 4 เป็นการดูเชิงสำรวจกับต่างประเทศ คือคะแนนเสรีภาพของรัสเซียกับจำนวนการหักล้างของ EUvsDisinfo รายปี (${c5.n} ปี) ${one(c5, 'คะแนนเสรีภาพ', 'จำนวนการหักล้าง')} แต่ทั้งสองอย่างเปลี่ยนไปตามเวลาและจำนวนการหักล้างขึ้นกับทรัพยากรของโครงการ จึงอาจดูเหมือนสัมพันธ์กันทั้งที่ไม่เกี่ยวกัน ไม่ควรใช้สรุปเชิงนโยบาย`,
    'โดยรวมข้อมูลที่มีไม่เพียงพอจะบอกว่าเสรีภาพทางอินเทอร์เน็ตเกี่ยวข้องกับข่าวปลอมหรือความเสียหาย เพราะมีจำนวนตัวอย่างน้อย ข่าวปลอมที่นับคือเรื่องที่หน่วยงานเลือกตรวจ ไม่ใช่ปริมาณจริง และไม่มีข้อมูลควบคุมอื่น เช่น จำนวนผู้ใช้อินเทอร์เน็ต ประชากร หรือกฎหมาย ที่สำคัญ ต่อให้พบความสัมพันธ์ ก็ไม่ได้แปลว่าสิ่งหนึ่งเป็นสาเหตุของอีกสิ่งหนึ่ง',
  ];
}
function proseExplorer() {
  const Q = D.quality, bad = Q.checks.filter(c => !c.ok);
  return [
    `หน้านี้ให้ตรวจสอบข้อมูลต้นทางและที่มาของตัวเลขทุกตัวในแดชบอร์ด ข้อมูลที่ใช้มี ${Q.files.length} ชุด ได้แก่ ${Q.files.map(f => `${f.dataset} (${fmt(f.rows)} แถว)`).join(' ')} ครอบคลุมช่วงเวลาไม่เท่ากัน คือ Freedom on the Net ปี 2010 ถึง 2024 EUvsDisinfo มกราคม 2015 ถึงสิงหาคม 2023 ศูนย์ต่อต้านข่าวปลอม มกราคม 2019 ถึงตุลาคม 2026 และสถิติคดีหลอกลวง พฤศจิกายน 2025 ถึงตุลาคม 2026`,
    `จากการตรวจ ${Q.checks.length} รายการ พบประเด็นที่ควรระวัง ${bad.length} รายการ ส่วนที่ผ่านการตรวจคือ คะแนนรวมของ Freedom on the Net ตรงกับผลรวม 3 องค์ประกอบทุกแถว ไฟล์ CSV กับ XLSX ตรงกัน ตารางรวมรายสัปดาห์ตรงกับการนับใหม่จากโพสต์ของศูนย์ต่อต้านข่าวปลอม และมูลค่าความเสียหายต่อคดีคำนวณตรง`,
    `ประเด็นที่พบ เช่น ข้อมูล EUvsDisinfo ปี 2023 มีแค่ถึงเดือนสิงหาคม คำตัดสินของศูนย์ต่อต้านข่าวปลอมปี 2019 มีน้อยเพราะเพิ่งเปิดศูนย์ ตัวเลขความเสียหายตั้งแต่สิงหาคม 2026 ถูกปัดเป็นล้านบาท สัปดาห์ที่ไม่มีการแถลงปล่อยว่างไม่เติมเป็นศูนย์ และสัปดาห์ 16 ถึง 22 สิงหาคม 2026 มีตัวเลขสูงผิดปกติราว 13 เท่า จึงถูกตัดออกโดยค่าเริ่มต้น ทุกการจัดการถูกบันทึกไว้ในแท็บ Data Quality`,
    'ข้อจำกัดสำคัญคือคู่มือข้อมูลกล่าวถึง AI Incident Database แต่ไม่มีไฟล์นี้ในที่แนบจึงไม่ได้ใช้ และไม่มีข้อมูลข่าวปลอมหรือความเสียหายของประเทศอื่นที่นิยามเดียวกัน การเปรียบเทียบข้ามประเทศจึงทำได้เฉพาะคะแนนเสรีภาพ คุณคลิกที่ตัวเลข KPI ในหน้าอื่น ๆ หรือเปิดแท็บ Source of Data เพื่อดูว่าตัวเลขมาจากไฟล์ใด คอลัมน์ใด และคำนวณอย่างไรได้',
  ];
}
function pageProse() {
  const I = filterIntro();
  switch (TAB) {
    case 'overview': return [I, 'หน้านี้คือภาพรวมสถานการณ์ รวมตัวเลขหลักของแต่ละเรื่อง เริ่มจากข่าวปลอมในประเทศไทย ' + proseAfnc(false), proseAcsc(false), proseFotn(false), proseEu(false)];
    case 'freedom': return [I, 'หน้านี้ดูเสรีภาพในการใช้อินเทอร์เน็ตของไทยเทียบกับประเทศอื่น ' + proseFotn(true)];
    case 'disinfo': return [I, 'หน้านี้ดูข่าวปลอมและข้อมูลบิดเบือน ' + proseAfnc(true), proseEu(true)];
    case 'scam': return [I, 'หน้านี้ดูความเสียหายจากมิจฉาชีพออนไลน์ในประเทศไทย ' + proseAcsc(true)];
    case 'corr': return proseCorr();
    default: return proseExplorer();
  }
}

function sixQuestions() {
  const C = id => D.analysis.correlations.find(c => c.id === id);
  const c1 = C('th_fotn_vs_fake'), cw = C('wk_false_vs_loss'), cc = C('wk_false_vs_cases');
  const v = AF.filter(r => r.type === 'Verdict');
  const q = byQuarter(v); const qs = Object.entries(q).map(([k, c]) => [k, c.F]).sort((a, b) => b[1] - a[1]);
  const fals = v.filter(r => r.v !== 'T'); const cnt = {}; fals.forEach(r => cnt[r.cat] = (cnt[r.cat] || 0) + 1);
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
  const nF = v.filter(r => r.v === 'F').length, nD = v.filter(r => r.v === 'D').length, nT = v.filter(r => r.v === 'T').length;
  const y = 2024, all = FO.filter(r => r.data_year === y).sort((a, b) => b.total_score - a.total_score), th = fotnRow('THA', y);
  const as = ASEAN.map(i => fotnRow(i, y)).filter(Boolean).sort((a, b) => b.total_score - a.total_score);
  const st = s => `<span class="badge ${s === 'ok' ? 'b-ok' : s === 'part' ? 'b-warn' : 'b-no'}">${s === 'ok' ? 'ตอบได้' : s === 'part' ? 'ตอบได้บางส่วน' : 'ไม่สามารถสรุปได้จากข้อมูลที่มี'}</span>`;
  const Q = [
    ['เสรีภาพทางอินเทอร์เน็ตมีความสัมพันธ์กับการเกิดข่าวปลอมและมูลค่าความเสียหายจากมิจฉาชีพหรือไม่?', 'part',
      `<p><b>ข่าวปลอม:</b> เชื่อมได้เฉพาะประเทศไทยรายปี (FOTN data_year × AFNC ปีปฏิทิน) ปี ${c1.points[0][2]}–${c1.points[c1.points.length - 1][2]} n = ${c1.n} จุด Spearman ρ = ${fmt2(c1.spearman)} (p = ${fmt2(c1.spearman_p)}), Pearson r = ${fmt2(c1.pearson)} (p = ${fmt2(c1.pearson_p)}) — ไม่มีนัยสำคัญทางสถิติ และ n น้อยเกินกว่าจะสรุปได้</p>
       <p><b>ความเสียหาย:</b> ไม่สามารถคำนวณได้ เพราะ FOTN มีถึง data_year 2024 แต่ ACSC เริ่ม พ.ย. 2025 (ไม่มีปีทับซ้อน)</p>
       <p><b>ปัจจัยอื่นในชุดข้อมูล:</b> ข่าวเท็จรายสัปดาห์กับคดี (n=${cc.n}) ρ = ${fmt2(cc.spearman)} (p = ${fmt2(cc.spearman_p)}), กับความเสียหาย ρ = ${fmt2(cw.spearman)} (p = ${fmt2(cw.spearman_p)}) — ไม่พบความสัมพันธ์ที่มีนัยสำคัญ</p>
       <p class="sub">ต้องการเพิ่ม: ข้อมูลข่าวปลอม/ความเสียหายหลายประเทศที่นิยามเดียวกัน, FOTN ปีที่ทับซ้อนกับ ACSC, ตัวแปรควบคุม (ผู้ใช้อินเทอร์เน็ต ประชากร ระบบรายงาน)</p>`, 'corr'],
    ['ช่วงไตรมาสใดมีจำนวนข่าวปลอมมากที่สุด?', 'ok',
      `<p>ไตรมาส <b>${qs[0][0].replace('-', ' ')}</b> มีข่าวปลอม (Fake) <b>${fmt(qs[0][1])}</b> รายการ รองลงมา ${qs.slice(1, 3).map(x => `${x[0].replace('-', ' ')} (${fmt(x[1])})`).join(', ')} คำนวณจากคำตัดสิน "ข่าวปลอม" ทั้งหมด ${fmt(nF)} รายการ (ม.ค. 2019 – ต.ค. 2026)</p>`, 'disinfo'],
    ['ข่าวปลอมที่พบส่วนใหญ่เกี่ยวข้องกับเรื่องใด?', 'ok',
      `<p>ข่าวเท็จ (ปลอม+บิดเบือน) ${fmt(fals.length)} รายการ พบมากที่สุดในหมวด <b>${top[0][0]}</b> ${fmt(top[0][1])} รายการ (${fmtPct(pct(top[0][1], fals.length))}) ตามด้วย ${top.slice(1, 4).map(t => `${t[0]} ${fmt(t[1])} (${fmtPct(pct(t[1], fals.length))})`).join(', ')} — ใช้หมวดตามต้นฉบับ AFNC</p>`, 'disinfo'],
    ['สัดส่วนข่าวจริงและข่าวปลอมเป็นอย่างไร?', 'ok',
      `<p>จากคำตัดสิน ${fmt(v.length)} รายการ: ข่าวปลอม ${fmt(nF)} (${fmtPct(pct(nF, v.length))}), ข่าวบิดเบือน ${fmt(nD)} (${fmtPct(pct(nD, v.length))}), ข่าวจริง ${fmt(nT)} (${fmtPct(pct(nT, v.length))}) · โพสต์อื่นที่ไม่มีคำตัดสิน ${fmt(AF.length - v.length)} รายการ (รวม Unlabelled ${AF.filter(r => r.type === 'Unlabelled').length})</p>
       <p class="sub">ครอบคลุมเฉพาะเรื่องที่ศูนย์ฯ เลือกตรวจสอบและเผยแพร่ ไม่ใช่ข่าวทั้งหมดในสังคม จึงห้ามตีความเป็นสัดส่วนข่าวปลอมในสังคม</p>`, 'disinfo'],
    ['เสรีภาพในการใช้อินเทอร์เน็ตของประเทศไทยแตกต่างจากต่างประเทศอย่างไร?', 'ok',
      `<p>data_year ${y} (รายงาน ${y + 1}): ไทย <b>${th.total_score}/100</b> "${STL[th.status_code]}" อันดับ ${all.findIndex(r => r.iso3 === 'THA') + 1} จาก ${all.length} ประเทศ ต่ำกว่าค่ามัธยฐาน (${fmt1(median(all.map(r => r.total_score)))}) · ในอาเซียน ${as.length} ประเทศ ไทยอยู่อันดับ ${as.findIndex(r => r.iso3 === 'THA') + 1} (${as.map(r => `${shortName(r.country)} ${r.total_score}`).join(', ')}) · องค์ประกอบ: เข้าถึง ${th.obstacles_to_access}/25, เนื้อหา ${th.limits_on_content}/35, สิทธิผู้ใช้ ${th.violations_of_user_rights}/40</p>
       <p class="sub">เป็นการประเมินของผู้เชี่ยวชาญ ไม่ใช่การนับเหตุการณ์; จำนวนประเทศต่อปีไม่เท่ากัน</p>`, 'freedom'],
  ];
  return Q.map(([q, s, body, tab]) => ({ q, status: st(s), body, tab }));
}

/* ============================================================ 2. FREEDOM */
const FS = { year: null, detail: 'THA', compare: null };
function pFreedom(el) {
  if (fotnBlocked()) { el.innerHTML = `<div class="page-h"><h2>เสรีภาพทางอินเทอร์เน็ต</h2></div>` + na(fotnBlocked()); return; }
  const ys = fotnYears();
  if (!ys.length) { el.innerHTML = `<div class="page-h"><h2>เสรีภาพทางอินเทอร์เน็ต</h2></div>` + na('ตัวกรองปีไม่มีปีที่อยู่ในข้อมูล FOTN (2010–2024)'); return; }
  if (!FS.year || !ys.includes(FS.year)) FS.year = ys[ys.length - 1];
  const y = FS.year;
  const yearRows = FO.filter(r => r.data_year === y).sort((a, b) => b.total_score - a.total_score);
  const shown = yearRows.filter(r => fotnOk(r, { noYear: true }));
  const th = fotnRow('THA', y), rank = yearRows.findIndex(r => r.iso3 === 'THA') + 1;
  const cmp = F.countries.length ? F.countries : ASEAN;
  const det = FO.filter(r => r.iso3 === FS.detail).sort((a, b) => a.data_year - b.data_year);
  el.innerHTML = `<div class="page-h"><div><h2>เสรีภาพทางอินเทอร์เน็ต (Freedom on the Net)</h2><p>คะแนนรวม 0–100 (ยิ่งสูงยิ่งเสรี) = อุปสรรคการเข้าถึง (25) + การจำกัดเนื้อหา (35) + การละเมิดสิทธิผู้ใช้ (40) · data_year = ปีที่ประเมิน, รายงานตีพิมพ์ปีถัดไป</p></div>
    <div style="margin-left:auto"><label for="fsYear" style="font-size:12px;color:#4d4f53">ปีข้อมูล (data_year)</label><select id="fsYear">${ys.map(v => `<option ${v === y ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>
  <div class="kpis">
    ${kpi({ label: 'คะแนนประเทศไทย', value: th ? th.total_score + '/100' : 'N/A', cls: 'red', sub: th ? `data_year ${y} · รายงาน ${th.report_edition}` : 'ไม่มีการประเมิน', src: 'fotn_score' })}
    ${kpi({ label: 'สถานะ', value: th ? STL[th.status_code] : 'N/A', sub: 'เกณฑ์: ≥70 เสรี, 40–69 เสรีบางส่วน, <40 ไม่เสรี', src: 'fotn_score' })}
    ${kpi({ label: 'อันดับของไทย (1 = เสรีที่สุด)', value: th ? `${rank}/${yearRows.length}` : 'N/A', sub: `จาก ${yearRows.length} ประเทศที่ประเมินในปี ${y}`, src: 'fotn_score' })}
    ${kpi({ label: 'อุปสรรคการเข้าถึง', value: th ? th.obstacles_to_access + '/25' : 'N/A', sub: th ? fmtPct(th.obstacles_to_access / 25 * 100) + ' ของคะแนนเต็ม' : '', src: 'fotn_score' })}
    ${kpi({ label: 'การจำกัดเนื้อหา', value: th ? th.limits_on_content + '/35' : 'N/A', sub: th ? fmtPct(th.limits_on_content / 35 * 100) + ' ของคะแนนเต็ม' : '', src: 'fotn_score' })}
    ${kpi({ label: 'การละเมิดสิทธิผู้ใช้', value: th ? th.violations_of_user_rights + '/40' : 'N/A', sub: th ? fmtPct(th.violations_of_user_rights / 40 * 100) + ' ของคะแนนเต็ม' : '', src: 'fotn_score' })}
  </div>
  <h3 class="sec-h"><span class="num">3.1</span> คะแนนและอันดับ</h3>
  ${card({ id: 'fsRank', title: `อันดับคะแนนเสรีภาพอินเทอร์เน็ต data_year ${y} (${shown.length} ประเทศ)`, sub: 'หน่วย: คะแนน 0–100 · สีตามสถานะ · ขอบดำ = ประเทศไทย · คลิกแท่งเพื่อดูรายละเอียดประเทศ', ds: 'fotn', src: 'fotn_score', h: 'xl' })}
  <div class="grid g2" style="margin-top:14px">
    ${card({ id: 'fsDet', title: `รายละเอียดประเทศ: ${esc(shortName(CNAME[FS.detail] || ''))} — คะแนนรายปี`, sub: `หน่วย: คะแนน · data_year ${det.length ? det[0].data_year + '–' + det[det.length - 1].data_year : ''} · เลือกประเทศจากกราฟอันดับหรือ dropdown`, ds: 'fotn', src: 'fotn_score',
    body: `<select id="fsDetSel" style="max-width:260px;margin-bottom:6px">${COUNTRIES.map(([i, n]) => `<option value="${i}" ${i === FS.detail ? 'selected' : ''}>${esc(shortName(n))}</option>`).join('')}</select><div class="ch" id="fsDet"></div>` })}
    ${card({ id: 'fsComp', title: `คะแนนย่อยตามองค์ประกอบ (data_year ${y})`, sub: `หน่วย: คะแนน · ${F.countries.length ? 'ประเทศที่เลือกในตัวกรอง' : 'ไทยและอาเซียน (เลือกประเทศอื่นได้ที่ตัวกรอง "ประเทศ")'}`, ds: 'fotn', src: 'fotn_score' })}
  </div>
  <h3 class="sec-h"><span class="num">3.2</span> เปรียบเทียบประเทศและแนวโน้ม</h3>
  <div class="grid">${card({ id: 'fsLine', title: 'แนวโน้มคะแนนรายปี: ' + (F.countries.length ? 'ประเทศที่เลือก' : 'ไทยเทียบอาเซียน'), sub: `หน่วย: คะแนน 0–100 · data_year ${ys[0]}–${ys[ys.length - 1]} · เส้นขาด = ปีที่ไม่มีการประเมิน`, ds: 'fotn', src: 'fotn_score', h: 'tall' })}</div>
  <div class="grid" style="margin-top:14px">${card({ id: 'fsHeat', title: 'Heatmap คะแนน: ประเทศ × ปี', sub: 'หน่วย: คะแนน 0–100 · สีเข้ม = เสรีน้อย · ช่องว่าง = ไม่มีการประเมิน (ไม่ใช่ 0) · เรียงตามคะแนนล่าสุด', ds: 'fotn', src: 'fotn_score', h: 'xl' })}</div>
  <h3 class="sec-h">ตารางคะแนนและปีที่ประเมิน (data_year ${y})</h3>
  ${table([{ h: 'อันดับ', f: r => yearRows.indexOf(r) + 1, n: 1 }, { h: 'ประเทศ', f: r => esc(shortName(r.country)) }, { h: 'iso3', k: 'iso3' }, { h: 'data_year', k: 'data_year' }, { h: 'รายงาน', k: 'report_edition' },
    { h: 'รวม', k: 'total_score', n: 1 }, { h: 'เข้าถึง /25', k: 'obstacles_to_access', n: 1 }, { h: 'เนื้อหา /35', k: 'limits_on_content', n: 1 }, { h: 'สิทธิ /40', k: 'violations_of_user_rights', n: 1 },
    { h: 'สถานะ', f: r => `<span style="color:${STC[r.status_code]};font-weight:600">${STL[r.status_code]}</span>` }], shown, { hl: r => r.iso3 === 'THA', click: true, maxh: 380 })}
  ${summaryBlock({
    find: th ? `ไทยได้ ${th.total_score}/100 สถานะ "${STL[th.status_code]}" อันดับ ${rank}/${yearRows.length} ในปี ${y}` : 'ไม่มีข้อมูลไทยในปีที่เลือก',
    nums: th ? `ค่ามัธยฐานทุกประเทศ ${fmt1(median(yearRows.map(r => r.total_score)))} · ไทยช่วงปี 2010–2024: ${Math.min(...FO.filter(r => r.iso3 === 'THA').map(r => r.total_score))}–${Math.max(...FO.filter(r => r.iso3 === 'THA').map(r => r.total_score))} คะแนน · สิทธิผู้ใช้ ${th.violations_of_user_rights}/40 คือองค์ประกอบที่ต่ำที่สุดเมื่อเทียบสัดส่วน` : '-',
    period: `data_year ${ys[0]}–${ys[ys.length - 1]} (รายงานฉบับ ${ys[0] + 1}–${ys[ys.length - 1] + 1})`, src: `<code>${FILES.fotn}</code> (Freedom House ผ่าน QoG Jan 2026)`,
    lim: 'เป็นการประเมินโดยผู้เชี่ยวชาญ ไม่ใช่การนับเหตุการณ์; จำนวนประเทศเพิ่มจาก 37 เป็น 71; ยังไม่มีรายงานฉบับ 2026', next: 'ติดตามรายงานฉบับ 2026 (data_year 2025) เพื่อเชื่อมกับข้อมูล ACSC ที่เริ่มปลายปี 2025' })}`;
  $('#fsYear').onchange = e => { FS.year = +e.target.value; render(); };
  $('#fsDetSel').onchange = e => { FS.detail = e.target.value; render(); };
  $$('#page table.t tbody tr.click').forEach(tr => tr.onclick = () => { FS.detail = shown[+tr.dataset.row].iso3; render(); });
  // rank bar
  if (!shown.length) $('#fsRank').innerHTML = na('ไม่มีประเทศที่ผ่านตัวกรองในปีนี้');
  else {
    const rs = [...shown].reverse();
    mkChart('fsRank', {
      tooltip: { trigger: 'item', ...tipBase, formatter: p => { const r = rs[p.dataIndex]; return `<b>${shortName(r.country)}</b> อันดับ ${yearRows.indexOf(r) + 1}/${yearRows.length}<br>${r.total_score}/100 · ${STL[r.status_code]}`; } },
      grid: grid({ top: 8, right: 30 }), xAxis: { type: 'value', max: 100, ...axisBase }, yAxis: { type: 'category', data: rs.map(r => shortName(r.country)), ...axisBase, axisLabel: { fontSize: 10.5, color: '#4d4f53', interval: 0 } },
      series: [{ type: 'bar', barMaxWidth: 14, data: rs.map(r => ({ value: r.total_score, itemStyle: { color: STC[r.status_code], opacity: r.iso3 === 'THA' ? 1 : .7, borderColor: r.iso3 === 'THA' ? '#16181b' : 'transparent', borderWidth: r.iso3 === 'THA' ? 2 : 0, borderRadius: [0, 3, 3, 0] } })),
        label: { show: true, position: 'right', fontSize: 10, color: '#4d4f53' } }],
    }, p => { FS.detail = rs[p.dataIndex].iso3; render(); });
  }
  // detail line
  if (!det.length) $('#fsDet').innerHTML = na('ไม่มีข้อมูลประเทศนี้');
  else {
    const yrsAll = FO_YEARS;
    const val = (k) => yrsAll.map(yy => { const r = det.find(d => d.data_year === yy); return r ? r[k] : null; });
    mkChart('fsDet', {
      tooltip: { trigger: 'axis', ...tipBase }, legend: { ...legendTop }, grid: grid(),
      xAxis: { type: 'category', data: yrsAll, ...axisBase }, yAxis: { type: 'value', max: 100, ...axisBase },
      series: [['total_score', 'คะแนนรวม', '#16181b'], ['obstacles_to_access', 'เข้าถึง (25)', '#2a78d6'], ['limits_on_content', 'เนื้อหา (35)', '#eb6834'], ['violations_of_user_rights', 'สิทธิผู้ใช้ (40)', '#6250d6']]
        .map(([k, n, c], i) => ({ name: n, type: 'line', data: val(k), color: c, lineStyle: { width: i ? 1.6 : 2.6 }, symbolSize: 6, connectNulls: false })),
    });
  }
  // components stacked
  const compRows = cmp.map(i => fotnRow(i, y)).filter(r => r && fotnOk(r, { noYear: true, noCountry: true })).sort((a, b) => b.total_score - a.total_score);
  if (!compRows.length) $('#fsComp').innerHTML = na(`ไม่มีประเทศที่เลือกที่มีการประเมินในปี ${y}`);
  else mkChart('fsComp', {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...tipBase }, legend: { ...legendTop }, grid: grid(),
    xAxis: { type: 'category', data: compRows.map(r => shortName(r.country)), ...axisBase, axisLabel: { interval: 0, rotate: compRows.length > 8 ? 30 : 0, fontSize: 11, color: '#4d4f53' } },
    yAxis: { type: 'value', max: 100, ...axisBase },
    series: [['obstacles_to_access', 'อุปสรรคการเข้าถึง (25)', '#2a78d6'], ['limits_on_content', 'การจำกัดเนื้อหา (35)', '#eb6834'], ['violations_of_user_rights', 'สิทธิผู้ใช้ (40)', '#6250d6']]
      .map(([k, n, c]) => ({ name: n, type: 'bar', stack: 's', barMaxWidth: 36, data: compRows.map(r => r[k]), color: c, itemStyle: { borderColor: '#fff', borderWidth: 1 } })),
  });
  // trend lines
  const lineIsos = (F.countries.length ? F.countries : ASEAN).filter(i => fotnOk({ iso3: i }, { noYear: true, noCountry: true }) !== false);
  const pal = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6', '#008300', '#7a7c80'];
  mkChart('fsLine', {
    tooltip: { trigger: 'axis', ...tipBase, order: 'valueDesc' }, legend: { ...legendTop, type: 'scroll' }, grid: grid({ top: 40 }),
    xAxis: { type: 'category', data: ys, ...axisBase }, yAxis: { type: 'value', max: 100, name: 'คะแนน', ...axisBase },
    series: lineIsos.map((i, k) => ({ name: shortName(CNAME[i]), type: 'line', connectNulls: false, symbolSize: 5, data: ys.map(yy => { const r = fotnRow(i, yy); return r ? r.total_score : null; }),
      color: i === 'THA' ? '#a51d24' : pal[(k) % pal.length], lineStyle: { width: i === 'THA' ? 3.2 : 1.6 }, z: i === 'THA' ? 5 : 2,
      endLabel: { show: i === 'THA', formatter: 'ไทย', color: '#a51d24', fontWeight: 600 } })),
  }, p => { const iso = lineIsos.find(i => shortName(CNAME[i]) === p.seriesName); if (iso) { FS.detail = iso; render(); } });
  // heatmap
  const hc = [...new Set(foV({ noYear: true }).map(r => r.iso3))];
  const lastScore = i => { const rr = FO.filter(r => r.iso3 === i).sort((a, b) => b.data_year - a.data_year)[0]; return rr ? rr.total_score : 0; };
  hc.sort((a, b) => lastScore(a) - lastScore(b));
  const hdata = []; FO.forEach(r => { if (hc.includes(r.iso3) && ys.includes(r.data_year)) hdata.push([ys.indexOf(r.data_year), hc.indexOf(r.iso3), r.total_score]); });
  const heatEl = $('#fsHeat'); heatEl.style.height = Math.max(320, hc.length * 15 + 80) + 'px';
  mkChart('fsHeat', {
    tooltip: { ...tipBase, formatter: p => `<b>${shortName(CNAME[hc[p.value[1]]])}</b> · data_year ${ys[p.value[0]]}<br>${p.value[2]}/100` },
    grid: grid({ top: 10, bottom: 40 }), xAxis: { type: 'category', data: ys, ...axisBase, position: 'top' },
    yAxis: { type: 'category', data: hc.map(i => shortName(CNAME[i])), ...axisBase, axisLabel: { fontSize: 10, interval: 0, color: '#4d4f53', formatter: v => v === 'Thailand' ? '{t|Thailand}' : v, rich: { t: { fontWeight: 700, color: '#a51d24' } } } },
    visualMap: { min: 0, max: 100, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 220, text: ['100 เสรี', '0 ไม่เสรี'], textStyle: { fontSize: 11 }, inRange: { color: ['#5e0b10', '#a51d24', '#e2725b', '#f6c9bf', '#fbefec'] } },
    series: [{ type: 'heatmap', data: hdata, itemStyle: { borderColor: '#fff', borderWidth: 1 }, label: { show: hc.length <= 25, fontSize: 9 } }],
  }, p => { FS.detail = hc[p.value[1]]; render(); });
}

/* ============================================================ 3. DISINFO */
const DS = { trendCat: null, eu: true };
function pDisinfo(el) {
  const v = afV();
  const blocked = afncBlocked();
  const kk = fakeKey();
  const Q = byQuarter(v), Y = byYear(v);
  const qk = Object.keys(Q), yk = Object.keys(Y);
  const qv = qk.map(k => sum(kk.map(x => Q[k][x]))), yv = yk.map(k => sum(kk.map(x => Y[k][x])));
  const pq = qv.length ? qk[qv.indexOf(Math.max(...qv))] : null;
  const { dom, m } = countByMonth(v, '2019-01', '2026-10');
  const mv = dom.map(k => sum(kk.map(x => m[k][x])));
  const pm = mv.length ? dom[mv.indexOf(Math.max(...mv))] : null;
  const nF = v.filter(r => r.v === 'F').length, nD = v.filter(r => r.v === 'D').length, nT = v.filter(r => r.v === 'T').length;
  const allPosts = afncBlocked() ? [] : AF.filter(r => afncOk(r, { noCat: true, noVerdict: true }));
  const nonVer = allPosts.filter(r => r.type !== 'Verdict');
  const fals = v.filter(r => r.v !== 'T');
  const cc = {}; v.forEach(r => { cc[r.cat] = cc[r.cat] || { F: 0, D: 0, T: 0 }; cc[r.cat][r.v]++; });
  const catRows = Object.entries(cc).map(([c, o]) => ({ cat: c, en: A.cat_en[c], ...o, all: o.F + o.D + o.T, fals: o.F + o.D })).sort((a, b) => b.fals - a.fals || b.all - a.all);
  const yRows = yk.map((k, i) => ({ y: k, months: Y[k].months, F: Y[k].F, D: Y[k].D, T: Y[k].T, n: yv[i], chg: i ? (yv[i - 1] ? (yv[i] - yv[i - 1]) / yv[i - 1] * 100 : null) : null }));
  const qRows = qk.map((k, i) => ({ q: k, F: Q[k].F, D: Q[k].D, T: Q[k].T, n: qv[i], chg: i ? (qv[i - 1] ? (qv[i] - qv[i - 1]) / qv[i - 1] * 100 : null) : null, months: Q[k].months }));
  if (!DS.trendCat && catRows.length) DS.trendCat = catRows[0].cat;
  const period = v.length ? `${fdate(v.reduce((a, r) => r.date < a ? r.date : a, '9'))} – ${fdate(v.reduce((a, r) => r.date > a ? r.date : a, '0'))}` : '-';
  el.innerHTML = `<div class="page-h"><div><h2>ข่าวปลอมและข้อมูลบิดเบือน</h2><p>ประเทศไทย: คำตัดสินของศูนย์ต่อต้านข่าวปลอม (AFNC) · ต่างประเทศ: การหักล้างข้อมูลเท็จฝั่งสนับสนุนรัสเซีย (EUvsDisinfo) · ข่าวเท็จ = ข่าวปลอม + ข่าวบิดเบือน</p></div></div>
  ${blocked ? `<div class="warnbox">${blocked}</div>` : ''}
  <div class="kpis">
    ${kpi({ label: 'คำตัดสินทั้งหมด', value: fmt(v.length), sub: period, src: 'afnc_verdicts' })}
    ${kpi({ label: 'ข่าวปลอม', value: fmt(nF), cls: 'red', sub: fmtPct(pct(nF, v.length)), src: 'afnc_fake' })}
    ${kpi({ label: 'ข่าวบิดเบือน', value: fmt(nD), sub: fmtPct(pct(nD, v.length)), src: 'afnc_distorted' })}
    ${kpi({ label: 'ข่าวจริง', value: fmt(nT), cls: 'green', sub: fmtPct(pct(nT, v.length)), src: 'afnc_true' })}
    ${kpi({ label: `เดือนที่มี${fakeLabel()}สูงสุด`, value: pm ? fym(pm) : 'N/A', sub: pm ? fmt(Math.max(...mv)) + ' รายการ' : '', src: 'afnc_time' })}
    ${kpi({ label: `ไตรมาสที่มี${fakeLabel()}สูงสุด`, value: pq ? pq.replace('-', ' ') : 'N/A', sub: pq ? fmt(Math.max(...qv)) + ' รายการ' : '', src: 'afnc_time' })}
  </div>
  <h3 class="sec-h"><span class="num">2.1</span> วิเคราะห์ตามเวลา</h3>
  <div class="grid">${card({ id: 'dsMonth', title: 'จำนวนคำตัดสินรายเดือน แยกสถานะ', sub: `หน่วย: คำตัดสินต่อเดือน · ${period} · คลิกแท่งเพื่อดูรายการของเดือน · ลากเพื่อซูม`, ds: 'afnc', src: 'afnc_time', h: 'tall' })}</div>
  <div class="grid g2" style="margin-top:14px">
    ${card({ id: 'dsQ', title: `${fakeLabel()}รายไตรมาส`, sub: 'หน่วย: รายการต่อไตรมาส · แท่งสีเข้ม = สูงสุด · คลิกแท่งเพื่อดูรายละเอียดข่าวในไตรมาสนั้น', ds: 'afnc', src: 'afnc_time',
      note: '2019 Q1–Q3: ศูนย์ฯ ยังไม่เปิด (เปิด 1 พ.ย. 2019) · 2026 Q4 มีเฉพาะ ต.ค.' })}
    ${card({ id: 'dsY', title: `${fakeLabel()}รายปี`, sub: 'หน่วย: รายการต่อปี · 2026 มีข้อมูลถึง 31 ต.ค. (ไม่ครบปี)', ds: 'afnc', src: 'afnc_time' })}
  </div>
  <div class="grid g2" style="margin-top:14px">
    ${card({ title: `ตารางเปรียบเทียบรายปี (${fakeLabel()})`, sub: 'อัตราเปลี่ยนแปลง = (ปีนี้ − ปีก่อน) ÷ ปีก่อน × 100', ds: 'afnc', src: 'afnc_time',
      body: table([{ h: 'ปี', k: 'y' }, { h: 'เดือนที่มีข้อมูล', k: 'months', n: 1 }, { h: 'ปลอม', k: 'F', n: 1, f: r => fmt(r.F) }, { h: 'บิดเบือน', k: 'D', n: 1, f: r => fmt(r.D) }, { h: 'จริง', k: 'T', n: 1, f: r => fmt(r.T) }, { h: fakeLabel(), n: 1, f: r => fmt(r.n) }, { h: '% เปลี่ยน', n: 1, f: r => r.chg === null ? '—' : `<span class="${r.chg > 0 ? 'up' : 'down'}">${r.chg > 0 ? '+' : ''}${fmt1(r.chg)}%</span>` }], yRows, { maxh: 330 }) })}
    ${card({ title: `ตารางเปรียบเทียบรายไตรมาส (${fakeLabel()})`, sub: 'เทียบกับไตรมาสก่อนหน้า', ds: 'afnc', src: 'afnc_time',
      body: table([{ h: 'ไตรมาส', f: r => r.q.replace('-', ' ') }, { h: 'ปลอม', n: 1, f: r => fmt(r.F) }, { h: 'บิดเบือน', n: 1, f: r => fmt(r.D) }, { h: 'จริง', n: 1, f: r => fmt(r.T) }, { h: fakeLabel(), n: 1, f: r => fmt(r.n) }, { h: '% เปลี่ยน', n: 1, f: r => r.chg === null ? '—' : `<span class="${r.chg > 0 ? 'up' : 'down'}">${r.chg > 0 ? '+' : ''}${fmt1(r.chg)}%</span>` }], [...qRows].reverse(), { maxh: 330, hl: r => r.q === pq }) })}
  </div>
  <h3 class="sec-h"><span class="num">2.2</span> วิเคราะห์ประเภทข่าว</h3>
  <div class="grid g2">
    ${card({ id: 'dsCat', title: 'คำตัดสินแยกตามหมวดข่าว (หมวดตามต้นฉบับ AFNC)', sub: `หน่วย: รายการ · ${period} · คลิกแท่งเพื่อดูแนวโน้มของหมวดนั้น`, ds: 'afnc', src: 'afnc_cat', h: 'tall' })}
    ${card({ id: 'dsTree', title: 'สัดส่วนข่าวเท็จตามหมวด (Treemap)', sub: `หน่วย: % ของข่าวเท็จ ${fmt(fals.length)} รายการ`, ds: 'afnc', src: 'afnc_cat', h: 'tall' })}
  </div>
  <div class="grid g2" style="margin-top:14px">
    <div id="dsCatTrend">${card({ id: 'dsCatT', title: `แนวโน้มรายเดือนของหมวด: ${esc(DS.trendCat || '-')}`, sub: 'หน่วย: คำตัดสินต่อเดือน แยกสถานะ', ds: 'afnc', src: 'afnc_cat',
      body: `<div class="toolbar"><select id="dsCatSel" style="max-width:260px">${A.cats.map(c => `<option ${c === DS.trendCat ? 'selected' : ''}>${c}</option>`).join('')}</select><button class="btn sm" id="dsCatApply">ใช้หมวดนี้เป็นตัวกรองทั้งแดชบอร์ด</button></div><div class="ch" id="dsCatT"></div>` })}</div>
    ${card({ title: 'ตารางรายละเอียดแต่ละประเภทข่าว (อันดับตามจำนวนข่าวเท็จ)', sub: 'ร้อยละข่าวเท็จ = (ปลอม+บิดเบือน) ÷ คำตัดสินในหมวด × 100 · ร้อยละของทั้งหมด ใช้ตัวหาร = คำตัดสินทั้งหมด', ds: 'afnc', src: 'afnc_cat',
      body: table([{ h: '#', n: 1, f: r => catRows.indexOf(r) + 1 }, { h: 'หมวด', f: r => `${esc(r.cat)}<br><span class="sub">${esc(r.en)}</span>` }, { h: 'ปลอม', n: 1, f: r => fmt(r.F) }, { h: 'บิดเบือน', n: 1, f: r => fmt(r.D) }, { h: 'จริง', n: 1, f: r => fmt(r.T) }, { h: 'รวม', n: 1, f: r => fmt(r.all) }, { h: '% ของทั้งหมด', n: 1, f: r => fmtPct(pct(r.all, v.length)) }, { h: '% ข่าวเท็จในหมวด', n: 1, f: r => fmtPct(pct(r.fals, r.all)) }], catRows, { maxh: 360, click: true }) })}
  </div>
  <div class="grid g2" style="margin-top:14px">
    ${card({ title: 'หัวข้อ (topic_tags) ที่พบบ่อยในข่าวเท็จ', sub: 'นับแท็กที่แยกด้วย ; (แท็กทั่วไปถูกตัดโดยผู้จัดทำ) · แท็กที่สะกดต่างกันไม่ได้รวม เช่น โควิด-19 / COVID-19', ds: 'afnc', src: 'afnc_cat', body: tagTable(fals) })}
    ${card({ title: 'หน่วยงานที่ตรวจสอบข้อเท็จจริงบ่อยที่สุด', sub: 'checked_by_agency · ว่าง = ไม่ระบุ', ds: 'afnc', src: 'afnc_cat', body: agencyTable(v) })}
  </div>
  <h3 class="sec-h"><span class="num">2.3</span> สัดส่วนข่าวจริงและข่าวปลอม</h3>
  <div class="grid g2">
    ${card({ id: 'dsDonut', title: 'สัดส่วนสถานะคำตัดสิน', sub: `ตัวหาร = ${fmt(v.length)} คำตัดสิน · ${period}`, ds: 'afnc', src: 'afnc_share' })}
    ${card({ id: 'dsStack', title: 'สัดส่วนสถานะรายปี (100% stacked)', sub: 'หน่วย: % ของคำตัดสินในปีนั้น (ตัวหารแต่ละปีแสดงใน tooltip)', ds: 'afnc', src: 'afnc_share' })}
  </div>
  <div class="grid" style="margin-top:14px">${card({ title: 'จำนวนรายการและตัวหารที่ใช้คำนวณร้อยละ', sub: 'โพสต์ของ AFNC ทุกประเภทในช่วงที่เลือก (ตัวกรองประเภทข่าว/สถานะไม่ใช้กับตารางนี้)', ds: 'afnc', src: 'afnc_share',
    body: table([{ h: 'กลุ่ม', k: 'g' }, { h: 'จำนวน', k: 'n', n: 1, f: r => fmt(r.n) }, { h: 'ร้อยละ', k: 'p', n: 1, f: r => r.p }, { h: 'หมายเหตุ', k: 'note' }], [
      { g: 'ข่าวปลอม (Fake)', n: allPosts.filter(r => r.v === 'F').length, p: fmtPct(pct(allPosts.filter(r => r.v === 'F').length, allPosts.filter(r => r.v).length)), note: 'ตัวหาร = คำตัดสินทั้งหมด' },
      { g: 'ข่าวบิดเบือน (Distorted)', n: allPosts.filter(r => r.v === 'D').length, p: fmtPct(pct(allPosts.filter(r => r.v === 'D').length, allPosts.filter(r => r.v).length)), note: 'ตัวหาร = คำตัดสินทั้งหมด' },
      { g: 'ข่าวจริง (True)', n: allPosts.filter(r => r.v === 'T').length, p: fmtPct(pct(allPosts.filter(r => r.v === 'T').length, allPosts.filter(r => r.v).length)), note: 'ตัวหาร = คำตัดสินทั้งหมด' },
      { g: 'รวมคำตัดสิน (ตัวหาร)', n: allPosts.filter(r => r.v).length, p: '100%', note: '' },
      ...['Online crime advisory', 'Knowledge article', 'Other news', 'Activity', 'Announcement', 'Unlabelled'].map(t => ({ g: `ไม่มีคำตัดสิน: ${t}`, n: nonVer.filter(r => r.type === t).length, p: '—', note: t === 'Unlabelled' ? 'ระบุประเภทไม่ได้ (ยังไม่สามารถจัดประเภทได้)' : 'ไม่นับเป็นข่าวจริง/ปลอม' })),
    ]) })}</div>
  <div class="infobox" style="margin-top:10px">ห้ามนำสัดส่วนนี้ไปเป็นสัดส่วนข่าวปลอมทั้งหมดในสังคม: AFNC เลือกตรวจเฉพาะเรื่องที่ได้รับแจ้งหรือพบ และเผยแพร่ผลตามดุลยพินิจ ข้อมูลไม่ใช่ตัวอย่างสุ่มของข่าวทั้งหมด</div>
  <h3 class="sec-h">ข้อมูลบิดเบือนต่างประเทศ: EUvsDisinfo</h3>
  <div id="euSec"></div>
  ${summaryBlock({
    find: v.length ? `${fakeLabel()}สูงสุดในไตรมาส ${pq ? pq.replace('-', ' ') : '-'} และเดือน ${pm ? fym(pm) : '-'}; หมวดที่มีข่าวเท็จมากที่สุดคือ ${catRows[0] ? catRows[0].cat : '-'}` : 'ไม่มีข้อมูล',
    nums: v.length ? `ปลอม ${fmt(nF)} · บิดเบือน ${fmt(nD)} · จริง ${fmt(nT)} จาก ${fmt(v.length)} คำตัดสิน; หมวดอันดับ 1 มีข่าวเท็จ ${fmt(catRows[0]?.fals)} รายการ (${fmtPct(pct(catRows[0]?.fals, fals.length))})` : '-',
    period, src: `<code>${FILES.afnc}</code>, <code>${FILES.eu}</code>`,
    lim: 'จำนวนคำตัดสินคือเรื่องที่ศูนย์ฯ เลือกตรวจ ไม่ใช่ปริมาณข่าวปลอมจริง; 2019 ข้อมูลน้อย; หัวข้อซ้ำ 932 รายการเป็นข่าวลือที่วนกลับมา (คงไว้); EUvsDisinfo เก็บเฉพาะฝั่งสนับสนุนรัสเซีย',
    next: 'ติดตามหมวดการเงิน-หุ้นและผลิตภัณฑ์สุขภาพที่มีสัดส่วนข่าวเท็จสูง; เปรียบเทียบกับช่วงเหตุการณ์สำคัญ (เช่น โควิด-19, ประเด็นไทย–กัมพูชา)' })}`;
  $('#dsCatSel').onchange = e => { DS.trendCat = e.target.value; render(); };
  $('#dsCatApply').onclick = () => { F.cats = [DS.trendCat]; update(); };
  $$('#page .card table.t tbody tr.click').forEach(tr => tr.onclick = () => { DS.trendCat = catRows[+tr.dataset.row].cat; render(); setTimeout(() => $('#dsCatTrend').scrollIntoView({ behavior: 'smooth' }), 50); });
  if (blocked || !v.length) { ['dsMonth', 'dsQ', 'dsY', 'dsCat', 'dsTree', 'dsCatT', 'dsDonut', 'dsStack'].forEach(id => { const e = $('#' + id); if (e) e.innerHTML = na(blocked || 'ไม่มีคำตัดสินในช่วงที่เลือก'); }); }
  else {
    const vs = selV();
    mkChart('dsMonth', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...tipBase }, legend: { ...legendTop }, grid: grid({ bottom: 40 }),
      xAxis: { type: 'category', data: dom.map(fym), ...axisBase }, yAxis: { type: 'value', name: 'คำตัดสิน', ...axisBase },
      dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 4 }],
      series: vs.map(x => ({ name: VL[x], type: 'bar', stack: 'v', data: dom.map(k => m[k][x]), color: V[x], barCategoryGap: '20%' })),
    }, p => { const ym = dom[p.dataIndex]; showRecords(`คำตัดสิน ${fym(ym)}`, v.filter(r => r.ym === ym), `คำตัดสินที่เผยแพร่ในเดือน ${fym(ym)} ตามตัวกรองปัจจุบัน`, { label: 'กรองทั้งแดชบอร์ดเป็นเดือนนี้', fn: () => { F.start = ym + '-01'; F.end = ym + '-' + new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate(); } }); });
    const mx = Math.max(...qv);
    mkChart('dsQ', {
      tooltip: { trigger: 'item', ...tipBase, formatter: p => `${qk[p.dataIndex].replace('-', ' ')}<br><b>${fmt(p.value)}</b> รายการ · เดือนที่มีข้อมูล ${Q[qk[p.dataIndex]].months}` },
      grid: grid({ top: 14, bottom: 30 }), xAxis: { type: 'category', data: qk.map(k => k.replace('-', ' ')), ...axisBase }, yAxis: { type: 'value', ...axisBase },
      dataZoom: [{ type: 'inside' }],
      series: [{ type: 'bar', data: qv.map(n => ({ value: n, itemStyle: { color: n === mx ? '#7a1016' : '#e2725b', borderRadius: [3, 3, 0, 0] } })), barMaxWidth: 18 }],
    }, p => { const k = qk[p.dataIndex]; const [yy, qq] = [+k.slice(0, 4), +k.slice(-1)]; showRecords(`คำตัดสิน ไตรมาส ${qq}/${yy}`, v.filter(r => r.y === yy && r.q === qq), `ข่าวทั้งหมดที่ผ่านตัวกรองในไตรมาส ${qq} ปี ${yy} (${fakeLabel()} = ${fmt(qv[p.dataIndex])} รายการ)`, { label: 'กรองทั้งแดชบอร์ดเป็นไตรมาสนี้', fn: () => { F.years = [yy]; F.quarters = [qq]; } }); });
    mkChart('dsY', {
      tooltip: { trigger: 'item', ...tipBase, formatter: p => `${yk[p.dataIndex]}<br><b>${fmt(p.value)}</b> รายการ (${Y[yk[p.dataIndex]].months} เดือนที่มีข้อมูล)` },
      grid: grid({ top: 14 }), xAxis: { type: 'category', data: yk, ...axisBase }, yAxis: { type: 'value', ...axisBase },
      series: [{ type: 'bar', data: yv.map((n, i) => ({ value: n, itemStyle: { color: yk[i] === '2026' || yk[i] === '2019' ? '#f3c6c3' : '#a51d24', borderRadius: [4, 4, 0, 0] } })), barMaxWidth: 38, label: { show: true, position: 'top', fontSize: 11, formatter: p => fmt(p.value) } }],
    }, p => { F.years = [+yk[p.dataIndex]]; update(); });
    // category stacked bar
    const cr = [...catRows].reverse();
    mkChart('dsCat', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...tipBase }, legend: { ...legendTop }, grid: grid({ right: 20 }),
      xAxis: { type: 'value', ...axisBase }, yAxis: { type: 'category', data: cr.map(r => r.cat), ...axisBase, axisLabel: { color: '#4d4f53', fontSize: 11.5 } },
      series: vs.map(x => ({ name: VL[x], type: 'bar', stack: 'c', data: cr.map(r => r[x]), color: V[x], barMaxWidth: 22, itemStyle: { borderColor: '#fff', borderWidth: 1 } })),
    }, p => { DS.trendCat = cr[p.dataIndex].cat; render(); setTimeout(() => $('#dsCatTrend').scrollIntoView({ behavior: 'smooth' }), 50); });
    if (fals.length) mkChart('dsTree', {
      tooltip: { ...tipBase, formatter: p => `${p.name}<br><b>${fmt(p.value)}</b> รายการ · ${fmt1(p.value / fals.length * 100)}% ของข่าวเท็จ` },
      series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, width: '100%', height: '100%', top: 0, left: 0,
        label: { formatter: p => `${p.name}\n${fmt1(p.value / fals.length * 100)}%`, fontSize: 12, fontFamily: FONT },
        itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 },
        data: catRows.filter(r => r.fals > 0).map(r => ({ name: r.cat, value: r.fals, itemStyle: { color: catColor(r.cat) } })) }],
    }); else $('#dsTree').innerHTML = na('ไม่มีข่าวเท็จในสถานะที่เลือก');
    // category trend
    const cv = v.filter(r => r.cat === DS.trendCat);
    const ct = countByMonth(cv, '2019-01', '2026-10');
    mkChart('dsCatT', {
      tooltip: { trigger: 'axis', ...tipBase }, legend: { ...legendTop }, grid: grid(),
      xAxis: { type: 'category', data: ct.dom.map(fym), ...axisBase }, yAxis: { type: 'value', ...axisBase }, dataZoom: [{ type: 'inside' }],
      series: vs.map(x => ({ name: VL[x], type: 'line', data: ct.dom.map(k => ct.m[k][x]), color: V[x], showSymbol: false, lineStyle: { width: 2 } })),
    }, p => { const ym = ct.dom[p.dataIndex]; showRecords(`${DS.trendCat} · ${fym(ym)}`, cv.filter(r => r.ym === ym), `คำตัดสินหมวด ${DS.trendCat} เดือน ${fym(ym)}`); });
    donut('dsDonut', { F: nF, D: nD, T: nT }, v.length);
    const yy = yk.filter(k => Y[k].F + Y[k].D + Y[k].T > 0);
    mkChart('dsStack', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...tipBase, formatter: ps => { const k = yy[ps[0].dataIndex]; const t = Y[k].F + Y[k].D + Y[k].T; return `<b>${k}</b> (ตัวหาร ${fmt(t)})<br>` + ps.map(p => `${p.marker}${p.seriesName}: ${fmt1(p.value)}% (${fmt(Y[k][Object.keys(VL).find(z => VL[z] === p.seriesName)])})`).join('<br>'); } },
      legend: { ...legendTop }, grid: grid(), xAxis: { type: 'category', data: yy, ...axisBase }, yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', color: '#7a7c80' }, ...axisBase },
      series: vs.map(x => ({ name: VL[x], type: 'bar', stack: 'p', barMaxWidth: 40, color: V[x], itemStyle: { borderColor: '#fff', borderWidth: 1 }, data: yy.map(k => { const t = Y[k].F + Y[k].D + Y[k].T; return +(Y[k][x] / t * 100).toFixed(2); }) })),
    });
  }
  euSection($('#euSec'));
}
function tagTable(rows) {
  const c = {}; rows.forEach(r => r.tags && r.tags.split(';').map(t => t.trim()).filter(Boolean).forEach(t => c[t] = (c[t] || 0) + 1));
  const arr = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([t, n]) => ({ t, n }));
  return arr.length ? table([{ h: 'แท็ก', k: 't' }, { h: 'จำนวนข่าวเท็จ', k: 'n', n: 1, f: r => fmt(r.n) }], arr, { maxh: 330 }) : na('ไม่มีข้อมูล');
}
function agencyTable(rows) {
  const c = {}; rows.forEach(r => { const a = r.ag || '(ไม่ระบุ)'; c[a] = (c[a] || 0) + 1; });
  const arr = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([a, n]) => ({ a, n, p: fmtPct(pct(n, rows.length)) }));
  return arr.length ? table([{ h: 'หน่วยงาน', k: 'a' }, { h: 'คำตัดสิน', k: 'n', n: 1, f: r => fmt(r.n) }, { h: '%', k: 'p', n: 1 }], arr, { maxh: 330 }) : na('ไม่มีข้อมูล');
}
function euSection(el) {
  const blocked = euBlocked();
  if (blocked) { el.innerHTML = `<div class="card">${na(blocked)}</div>`; return; }
  const eu = euV();
  if (!eu.length) { el.innerHTML = `<div class="card">${na('ไม่มีการหักล้างในช่วงที่เลือก (EUvsDisinfo มีข้อมูล ม.ค. 2015 – ส.ค. 2023)')}</div>`; return; }
  const ids = new Set(eu.map(d => d.i));
  const arts = D.eu.articles.filter(a => ids.has(a[0]));
  const nd = arts.filter(a => a[4] === 1).length, nt = arts.length - nd;
  const months = monthDomain(eu.reduce((a, d) => d.ym < a ? d.ym : a, '9'), eu.reduce((a, d) => d.ym > a ? d.ym : a, '0'));
  const mc = Object.fromEntries(months.map(k => [k, 0])); eu.forEach(d => { if (mc[d.ym] !== undefined) mc[d.ym]++; });
  const kc = {}; eu.forEach(d => d.kws.forEach(k => kc[k] = (kc[k] || 0) + 1));
  const topK = Object.entries(kc).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, n]) => [D.eu.keywords[k], n]);
  const lc = {}; arts.forEach(a => { const l = D.eu.langs[a[3]]; lc[l] = (lc[l] || 0) + 1; });
  const topL = Object.entries(lc).sort((a, b) => b[1] - a[1]);
  const per = `${fdate(eu.reduce((a, d) => d.date < a ? d.date : a, '9'))} – ${fdate(eu.reduce((a, d) => d.date > a ? d.date : a, '0'))}`;
  const dc = {}; arts.filter(a => a[4] === 1).forEach(a => dc[a[2]] = (dc[a[2]] || 0) + 1);
  const topD = Object.entries(dc).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([d, n]) => ({ d, n }));
  el.innerHTML = `<div class="kpis">${kpi({ label: 'การหักล้าง (debunk_id ไม่ซ้ำ)', value: fmt(eu.length), sub: per, src: 'eu_debunks' })}
    ${kpi({ label: 'บทความ class = disinformation', value: fmt(nd), cls: 'red', sub: fmtPct(pct(nd, arts.length)) + ' ของบทความที่ผูกกับการหักล้าง', src: 'eu_debunks' })}
    ${kpi({ label: 'บทความ class = trustworthy', value: fmt(nt), cls: 'green', sub: fmtPct(pct(nt, arts.length)), src: 'eu_debunks' })}
    ${kpi({ label: 'ภาษา / ประเด็น', value: `${topL.length} / ${Object.keys(kc).length}`, sub: 'ภาษาของบทความ / keywords ที่พบ', src: 'eu_debunks' })}</div>
  <div class="grid g2" style="margin-top:14px">
    ${card({ id: 'euM', title: 'จำนวนการหักล้างรายเดือน (EUvsDisinfo)', sub: `หน่วย: debunk_id ไม่ซ้ำต่อเดือน · ${per} · ส.ค. 2023 คือเดือนสุดท้าย`, ds: 'eu', src: 'eu_debunks' })}
    ${card({ id: 'euK', title: 'ประเด็น (keywords) ที่ถูกหักล้างบ่อยที่สุด', sub: 'หน่วย: จำนวนการหักล้างที่มี keyword นี้ (1 เรื่องมีหลาย keyword ได้ ผลรวมจึงเกินจำนวนเรื่อง)', ds: 'eu', src: 'eu_debunks', h: 'tall' })}
    ${card({ id: 'euL', title: 'ภาษาของบทความที่ผูกกับการหักล้าง', sub: 'หน่วย: บทความ · ไม่ใช่ประเทศ', ds: 'eu', src: 'eu_debunks' })}
    ${card({ title: 'โดเมนที่เผยแพร่ข้อมูลเท็จบ่อยที่สุด (class = disinformation)', sub: 'หน่วย: บทความ', ds: 'eu', src: 'eu_debunks', body: table([{ h: 'โดเมน', k: 'd' }, { h: 'บทความ', k: 'n', n: 1, f: r => fmt(r.n) }], topD, { maxh: 300 }) })}
  </div>
  <div class="infobox" style="margin-top:10px">EUvsDisinfo ตั้งใจเก็บเฉพาะข้อมูลเท็จที่สนับสนุนรัฐบาลรัสเซีย ไม่มีตัวแปรประเทศ และ class มาจากการหักล้าง ไม่ได้ตรวจทุกประโยค จึงใช้เปรียบเทียบกับจำนวนข่าวปลอมของไทยหรือบอกว่าประเทศใดมีข่าวปลอมมากกว่าไม่ได้</div>`;
  mkChart('euM', { tooltip: { trigger: 'axis', ...tipBase }, grid: grid({ top: 14 }), xAxis: { type: 'category', data: months.map(fym), ...axisBase }, yAxis: { type: 'value', ...axisBase }, dataZoom: [{ type: 'inside' }],
    series: [{ type: 'bar', data: months.map(k => mc[k]), color: '#a51d24', barCategoryGap: '25%' }] });
  const tk = [...topK].reverse();
  mkChart('euK', { tooltip: { trigger: 'item', ...tipBase }, grid: grid({ top: 8, right: 40 }), xAxis: { type: 'value', ...axisBase }, yAxis: { type: 'category', data: tk.map(k => k[0]), ...axisBase, axisLabel: { fontSize: 11, color: '#4d4f53' } },
    series: [{ type: 'bar', data: tk.map(k => k[1]), color: '#7a7c80', barMaxWidth: 16, itemStyle: { borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', fontSize: 10.5, formatter: p => fmt(p.value) } }] });
  const L7 = topL.slice(0, 7), other = sum(topL.slice(7).map(l => l[1]));
  mkChart('euL', { tooltip: { trigger: 'item', ...tipBase, formatter: p => `${p.name}: ${fmt(p.value)} (${fmt1(p.percent)}%)` }, legend: { ...legendTop, type: 'scroll' },
    series: [{ type: 'pie', radius: ['40%', '70%'], center: ['50%', '56%'], itemStyle: { borderColor: '#fff', borderWidth: 2 }, label: { formatter: '{b}\n{d}%', fontSize: 11 },
      data: [...L7.map(([l, n], i) => ({ name: l, value: n, itemStyle: { color: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6', '#008300'][i] } })), ...(other ? [{ name: 'อื่น ๆ', value: other, itemStyle: { color: '#c9c7c2' } }] : [])] }] });
}

/* ============================================================ 4. SCAM */
function pScam(el) {
  const blocked = acscBlocked();
  const ac = acV();
  const flaggedRow = AC.find(r => r.flagged_suspect);
  const loss = sum(ac.map(r => r.loss_baht)), cases = sum(ac.map(r => r.cases)), days = sum(ac.map(r => r.days));
  const per = ac.length ? `${fdate(ac[0].week_start)} – ${fdate(ac[ac.length - 1].week_end)}` : 'ไม่มีข้อมูลในช่วงที่เลือก';
  // monthly/quarterly/yearly
  const sundays = (a, b) => { const o = []; for (let d = new Date(a); d <= new Date(b); d.setDate(d.getDate() + 7)) o.push(d.toISOString().slice(0, 10)); return o; };
  const expW = sundays(ACSC_FIRST, '2026-10-18');
  const agg = keyFn => { const o = {}; expW.forEach(w => { const k = keyFn(w); o[k] = o[k] || { exp: 0, n: 0, cases: 0, loss: 0, days: 0, rounded: 0, flagged: 0 }; o[k].exp++; });
    ac.forEach(r => { const k = keyFn(r.week_start); if (!o[k]) o[k] = { exp: 0, n: 0, cases: 0, loss: 0, days: 0, rounded: 0, flagged: 0 }; o[k].n++; o[k].cases += r.cases; o[k].loss += r.loss_baht; o[k].days += r.days; if (r.loss_precision === 'rounded') o[k].rounded++; if (r.flagged_suspect) o[k].flagged++; });
    return Object.entries(o).filter(([, x]) => x.n > 0).map(([k, x]) => ({ k, ...x, perDay: x.loss / x.days, perCase: x.loss / x.cases })); };
  const mRows = agg(w => w.slice(0, 7)), qRows = agg(w => `${w.slice(0, 4)}-Q${qOf(+w.slice(5, 7))}`), yRows = agg(w => w.slice(0, 4));
  const aggCols = (lab, fmtK) => [{ h: lab, f: r => fmtK(r.k) }, { h: 'สัปดาห์ที่แถลง/คาด', n: 1, f: r => `${r.n}/${r.exp}${r.n < r.exp ? ' <span class="badge b-warn">ไม่ครบ</span>' : ''}` }, { h: 'คดี', n: 1, f: r => fmt(r.cases) },
    { h: 'ความเสียหาย (ล้านบาท)', n: 1, f: r => fmt1(r.loss / 1e6) + (r.rounded ? ` <span class="badge b-warn" title="${r.rounded} สัปดาห์เป็นตัวเลขปัด">ปัด</span>` : '') + (r.flagged ? ' <span class="badge b-no">Suspect</span>' : '') },
    { h: 'เฉลี่ย ล้านบาท/วัน', n: 1, f: r => fmt2(r.perDay / 1e6) }, { h: 'บาท/คดี', n: 1, f: r => fmt(r.perCase) }];
  // types
  const tg = {}; ac.forEach(r => {
    if (r.top_group) { tg[r.top_group] = tg[r.top_group] || { top: 0, hl: 0, loss: 0, nloss: 0 }; tg[r.top_group].top++; }
    if (r.hl_group) { tg[r.hl_group] = tg[r.hl_group] || { top: 0, hl: 0, loss: 0, nloss: 0 }; tg[r.hl_group].hl++; if (isNum(r.highest_loss_type_loss_baht)) { tg[r.hl_group].loss += r.highest_loss_type_loss_baht; tg[r.hl_group].nloss++; } }
  });
  const tRows = Object.entries(tg).map(([g, o]) => ({ g, ...o })).sort((a, b) => b.hl - a.hl);
  el.innerHTML = `<div class="page-h"><div><h2>ความเสียหายจากมิจฉาชีพ (Scam &amp; Financial Damage)</h2><p>สถิติการแจ้งความออนไลน์ผ่าน Thaipoliceonline ที่ ACSC แถลงรายสัปดาห์ (รวบรวมจากข่าว ไม่ใช่ข้อมูลเปิดของตำรวจ) หน่วยเงิน: บาท (THB)</p></div></div>
  ${blocked ? `<div class="warnbox">${blocked}</div>` : ''}
  <div class="kpis">
    ${kpi({ label: 'มูลค่าความเสียหายรวม', value: blocked ? 'N/A' : mBaht(loss), cls: 'red', sub: per, src: 'acsc_loss' })}
    ${kpi({ label: 'จำนวนเหตุการณ์ (คดีที่แจ้ง)', value: blocked ? 'N/A' : fmt(cases) + ' คดี', sub: `${ac.length} สัปดาห์ที่มีการแถลง`, src: 'acsc_cases' })}
    ${kpi({ label: 'จำนวนผู้เสียหาย', value: 'N/A', sub: 'ไม่มีในข้อมูล — 1 คดีไม่เท่ากับ 1 ผู้เสียหาย', src: 'acsc_cases' })}
    ${kpi({ label: 'ความเสียหายเฉลี่ยต่อคดี', value: cases ? fmt(loss / cases) + ' บาท' : 'N/A', sub: 'ผลรวม loss ÷ ผลรวม cases', src: 'acsc_loss' })}
    ${kpi({ label: 'ความเสียหายเฉลี่ยต่อวัน', value: days ? fmt1(loss / days / 1e6) + ' ล้านบาท' : 'N/A', sub: `หารด้วยจำนวนวันจริง ${days} วัน`, src: 'acsc_loss' })}
    ${kpi({ label: 'ประเภทที่เสียหายสูงสุดบ่อยที่สุด', value: tRows[0] ? esc(tRows[0].g) : 'N/A', sub: tRows[0] ? `${tRows[0].hl} สัปดาห์ที่เป็นประเภทเสียหายสูงสุด` : '', src: 'acsc_type' })}
  </div>
  ${!F.flagged && flaggedRow ? `<div class="warnbox" style="margin-top:10px">ไม่รวมสัปดาห์ ${fdate(flaggedRow.week_start)} – ${fdate(flaggedRow.week_end)} ที่ติดป้าย Suspect (${fmt(flaggedRow.cases)} คดี, ${mBaht(flaggedRow.loss_baht)} ≈ 13 เท่าของปกติ และขัดกับสัดส่วนประเภทในแถลงการณ์เดียวกัน) — เลือกรวมได้ที่ตัวกรองด้านซ้าย</div>` : ''}
  <h3 class="sec-h"><span class="num">4.1</span> ความเสียหายรายสัปดาห์</h3>
  <div class="grid g2">
    ${card({ id: 'scLoss', title: 'มูลค่าความเสียหายรายสัปดาห์', sub: `หน่วย: ล้านบาท · ${per} · ช่องว่าง = ไม่มีการแถลง · คลิกจุดเพื่อดูแหล่งข่าว`, ds: 'acsc', src: 'acsc_loss' })}
    ${card({ id: 'scCases', title: 'จำนวนคดีที่แจ้งรายสัปดาห์', sub: `หน่วย: คดี · ${per}`, ds: 'acsc', src: 'acsc_cases' })}
    ${card({ id: 'scChg', title: 'การเปลี่ยนแปลงความเสียหายจากสัปดาห์ก่อน (คำนวณใหม่)', sub: 'หน่วย: ล้านบาท · คำนวณจาก loss_baht ของสัปดาห์ที่แถลงติดกัน (ไม่ใช้ตัวเลขที่แถลง เพราะตำรวจเทียบกับตัวเลขปรับปรุง)', ds: 'acsc', src: 'acsc_loss' })}
    ${card({ id: 'scPer', title: 'ความเสียหายเฉลี่ยต่อคดีรายสัปดาห์', sub: 'หน่วย: บาทต่อคดี', ds: 'acsc', src: 'acsc_loss' })}
  </div>
  <h3 class="sec-h">มูลค่าความเสียหายรายเดือน รายไตรมาส และรายปี</h3>
  <div class="grid g3">
    ${card({ title: 'รายเดือน (ตามเดือนของ week_start)', sub: '"ไม่ครบ" = มีสัปดาห์ที่ไม่มีการแถลง ผลรวมจึงต่ำกว่าจริง', ds: 'acsc', src: 'acsc_loss', body: table(aggCols('เดือน', fym), mRows, { maxh: 380 }) })}
    ${card({ title: 'รายไตรมาส', sub: 'Q4/2025 เริ่ม 9 พ.ย. 2025', ds: 'acsc', src: 'acsc_loss', body: table(aggCols('ไตรมาส', k => k.replace('-', ' ')), qRows, { maxh: 380 }) })}
    ${card({ title: 'รายปี', sub: 'ทั้งสองปีไม่ครบปี จึงไม่ควรเทียบยอดรวมตรง ๆ ให้ดูค่าเฉลี่ยต่อวัน', ds: 'acsc', src: 'acsc_loss', body: table(aggCols('ปี', k => k), yRows, { maxh: 380 }) })}
  </div>
  <h3 class="sec-h">ประเภทการหลอกลวง</h3>
  <div class="grid g2">
    ${card({ id: 'scType', title: 'จำนวนสัปดาห์ที่แต่ละประเภทเป็น "ประเภทเสียหายสูงสุด" และ "ประเภทคดีมากสุด"', sub: 'หน่วย: สัปดาห์ · ชื่อประเภทจัดกลุ่มตามคำสำคัญ (ดูสูตร)', ds: 'acsc', src: 'acsc_type' })}
    ${card({ title: 'ตารางประเภทการหลอกลวง', sub: 'มูลค่า = ผลรวม highest_loss_type_loss_baht เฉพาะสัปดาห์ที่ข่าวระบุ (ส่วนใหญ่เป็นตัวเลขปัด) ไม่ใช่ความเสียหายทั้งหมดของประเภทนั้น', ds: 'acsc', src: 'acsc_type',
      body: table([{ h: 'กลุ่มประเภท', k: 'g' }, { h: 'สัปดาห์ที่คดีมากสุด', k: 'top', n: 1 }, { h: 'สัปดาห์ที่เสียหายสูงสุด', k: 'hl', n: 1 }, { h: 'มูลค่าที่ระบุ (ล้านบาท)', n: 1, f: r => r.nloss ? fmt1(r.loss / 1e6) : 'N/A' }, { h: 'n สัปดาห์ที่มีมูลค่า', k: 'nloss', n: 1 }], tRows) })}
    ${card({ id: 'scShare', title: 'สัดส่วนคดีของประเภทที่มีคดีมากสุด (หลอกซื้อขายสินค้า/บริการ)', sub: 'หน่วย: % ของคดีในสัปดาห์ · เฉพาะสัปดาห์ที่ข่าวระบุ top_type_case_share_pct', ds: 'acsc', src: 'acsc_type' })}
  </div>
  <h3 class="sec-h">ตารางรายละเอียดรายการต้นทาง</h3>
  ${card({ title: `acsc_weekly (${ac.length} สัปดาห์ที่ผ่านตัวกรอง)`, sub: 'ทุกแถวมีลิงก์ข่าวต้นทาง · คลิกแถวเพื่อดูรายละเอียด', ds: 'acsc', src: 'acsc_loss', body: blocked ? na(blocked) : `<div id="scTbl">${acscTable(ac)}</div>` })}
  ${summaryBlock({
    find: ac.length >= 8 ? `ความเสียหายรายสัปดาห์ลดลงจากระดับ 400–600 ล้านบาทช่วงปลายปี 2025 เหลือราว 130–330 ล้านบาทในช่วงกลาง–ปลายปี 2026 ขณะที่จำนวนคดีลดลงจากราว 7,000 เหลือ 5,000–6,300 คดี/สัปดาห์` : 'ข้อมูลในช่วงที่เลือกน้อย',
    nums: `รวม ${mBaht(loss)} จาก ${fmt(cases)} คดี ใน ${ac.length} สัปดาห์ · เฉลี่ย ${cases ? fmt(loss / cases) : 'N/A'} บาท/คดี · "หลอกซื้อขายสินค้า/บริการ" เป็นประเภทคดีมากสุดทุกสัปดาห์ที่ระบุ`,
    period: per, src: `<code>${FILES.acsc}</code> (ข่าวรายสัปดาห์ + saranitet.police.go.th)`,
    lim: 'เป็นคดีที่มีการแจ้งความเท่านั้น (ความเสียหายจริงน่าจะสูงกว่า); ไม่มีจำนวนผู้เสียหาย; ไม่มีมูลค่าแยกทุกประเภท; ตั้งแต่ ส.ค. 2026 ตัวเลขถูกปัดเป็นล้านบาท; มี 2 สัปดาห์ที่ไม่พบการแถลง; สัปดาห์ 16–22 ส.ค. 2026 น่าจะผิดตั้งแต่ต้นทาง',
    next: 'ติดตามว่าการลดลงต่อเนื่องหรือไม่หลังมีการเปลี่ยนชื่อหน่วยงาน (ต.ค. 2026) และการเปลี่ยนวิธีรายงาน; ขอข้อมูลเปิดรายประเภทจากหน่วยงาน' })}`;
  if (blocked) { ['scLoss', 'scCases', 'scChg', 'scPer', 'scType', 'scShare'].forEach(id => $('#' + id).innerHTML = na(blocked)); return; }
  $$('#scTbl tbody tr').forEach((tr, i) => { tr.classList.add('click'); tr.onclick = e => { if (e.target.closest('a')) return; openModal(`ACSC สัปดาห์ ${fdate(ac[i].week_start)}`, acscDetail(ac[i])); }; });
  lossChart('scLoss', ac);
  if (!ac.length) { ['scCases', 'scChg', 'scPer', 'scType', 'scShare'].forEach(id => $('#' + id).innerHTML = na('ไม่มีข้อมูลในช่วงที่เลือก')); return; }
  const x = ac.map(r => fdate(r.week_start));
  const onWk = p => openModal(`ACSC สัปดาห์ ${fdate(ac[p.dataIndex].week_start)}`, acscDetail(ac[p.dataIndex]));
  mkChart('scCases', { tooltip: { trigger: 'axis', ...tipBase }, grid: grid({ top: 14 }), xAxis: { type: 'category', data: x, ...axisBase }, yAxis: { type: 'value', scale: true, ...axisBase },
    series: [{ type: 'line', data: ac.map(r => r.cases), color: '#16181b', symbolSize: 6, lineStyle: { width: 2 } }] }, onWk);
  const chg = ac.map((r, i) => i ? +((r.loss_baht - ac[i - 1].loss_baht) / 1e6).toFixed(2) : null);
  mkChart('scChg', { tooltip: { trigger: 'axis', ...tipBase, formatter: ps => { const i = ps[0].dataIndex; return i ? `${fdate(ac[i - 1].week_start)} → ${fdate(ac[i].week_start)}<br><b>${chg[i] > 0 ? '+' : ''}${fmt1(chg[i])}</b> ล้านบาท` : 'สัปดาห์แรก — ไม่มีสัปดาห์ก่อนหน้า'; } },
    grid: grid({ top: 14 }), xAxis: { type: 'category', data: x, ...axisBase }, yAxis: { type: 'value', ...axisBase },
    series: [{ type: 'bar', data: chg.map(v => ({ value: v, itemStyle: { color: v > 0 ? '#a51d24' : '#9a9893', borderRadius: v > 0 ? [3, 3, 0, 0] : [0, 0, 3, 3] } })), barMaxWidth: 14 }] }, onWk);
  mkChart('scPer', { tooltip: { trigger: 'axis', ...tipBase }, grid: grid({ top: 14 }), xAxis: { type: 'category', data: x, ...axisBase }, yAxis: { type: 'value', ...axisBase },
    series: [{ type: 'line', data: ac.map(r => Math.round(r.loss_baht / r.cases)), color: '#e2725b', symbolSize: 6, lineStyle: { width: 2 } }] }, onWk);
  const tr = [...tRows].reverse();
  mkChart('scType', { tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...tipBase }, legend: { ...legendTop }, grid: grid(),
    xAxis: { type: 'value', ...axisBase }, yAxis: { type: 'category', data: tr.map(r => r.g), ...axisBase, axisLabel: { fontSize: 11.5, color: '#4d4f53' } },
    series: [{ name: 'ประเภทเสียหายสูงสุด', type: 'bar', data: tr.map(r => r.hl), color: '#a51d24', barMaxWidth: 14 }, { name: 'ประเภทคดีมากสุด', type: 'bar', data: tr.map(r => r.top), color: '#9a9893', barMaxWidth: 14 }] },
    p => { const g = tr[p.dataIndex].g; F.scam = [g]; update(); });
  const sh = ac.filter(r => isNum(r.top_type_case_share_pct));
  if (!sh.length) $('#scShare').innerHTML = na('ไม่มีสัปดาห์ที่ระบุสัดส่วน');
  else mkChart('scShare', { tooltip: { trigger: 'axis', ...tipBase }, grid: grid({ top: 14 }), xAxis: { type: 'category', data: sh.map(r => fdate(r.week_start)), ...axisBase }, yAxis: { type: 'value', min: 50, max: 100, axisLabel: { formatter: '{value}%', color: '#7a7c80' }, ...axisBase },
    series: [{ type: 'line', data: sh.map(r => r.top_type_case_share_pct), color: '#eb6834', symbolSize: 6, lineStyle: { width: 2 } }] });
}

/* ============================================================ 5. CORRELATION */
function interp(c) {
  if (!isNum(c.spearman)) return 'คำนวณไม่ได้';
  const r = c.spearman, a = Math.abs(r);
  const str = a < .1 ? 'แทบไม่มีความสัมพันธ์' : a < .3 ? 'ความสัมพันธ์ระดับอ่อน' : a < .5 ? 'ความสัมพันธ์ระดับปานกลาง' : a < .7 ? 'ความสัมพันธ์ค่อนข้างสูง' : 'ความสัมพันธ์สูง';
  const dir = a < .1 ? '' : r > 0 ? 'เชิงบวก (ไปทางเดียวกัน)' : 'เชิงลบ (สวนทางกัน)';
  const sig = c.spearman_p < .05 ? `มีนัยสำคัญทางสถิติที่ระดับ 0.05 (p = ${fmt2(c.spearman_p)})` : `ไม่มีนัยสำคัญทางสถิติที่ระดับ 0.05 (p = ${fmt2(c.spearman_p)})`;
  return `ข้อมูลที่ศึกษาแสดง${str}${dir ? ' ' + dir : ''} (Spearman ρ = ${fmt2(r)}, n = ${c.n}) ${sig}. ${c.reliable ? '' : `<b>จำนวนตัวอย่าง n = ${c.n} น้อยเกินไปสำหรับข้อสรุปที่น่าเชื่อถือ (เกณฑ์ขั้นต่ำที่ใช้: 10)</b>. `}ผลนี้ไม่เพียงพอที่จะยืนยันว่าตัวแปรหนึ่งเป็นสาเหตุของอีกตัวแปรหนึ่ง`;
}
function pCorr(el) {
  const C = D.analysis.correlations;
  el.innerHTML = `<div class="page-h"><div><h2>เสรีภาพทางอินเทอร์เน็ต vs ข่าวปลอม &amp; ความเสียหาย (Correlation)</h2><p>ตอบคำถาม: เสรีภาพทางอินเทอร์เน็ตมีความสัมพันธ์กับจำนวนข่าวปลอมและมูลค่าความเสียหายหรือไม่ — คำนวณเฉพาะคู่ที่เชื่อมโยงข้อมูลได้อย่างสมเหตุสมผล (ประเทศเดียวกัน ช่วงเวลาเดียวกัน)</p></div></div>
  <div class="infobox"><b>วิธีการ:</b> ใช้ Spearman ρ เป็นหลัก (ไม่ต้องสมมติการแจกแจงปกติ ทนต่อค่าผิดปกติ เหมาะกับข้อมูลนับและ n น้อย) แสดง Pearson r ประกอบ ทดสอบสองหางด้วย scipy.stats · สำหรับอนุกรมรายสัปดาห์ แสดงผลบนผลต่างลำดับที่ 1 เพื่อลดผลของแนวโน้มร่วม · <b>สหสัมพันธ์ไม่ใช่ความเป็นเหตุเป็นผล</b></div>
  <h3 class="sec-h"><span class="num">4.2</span> คำถามหลัก: เสรีภาพ (FOTN) กับข่าวปลอม</h3><div class="grid g2" id="cA"></div>
  <h3 class="sec-h">เสรีภาพ (FOTN) กับมูลค่าความเสียหายจากมิจฉาชีพ</h3>
  <div class="card">${na(D.analysis.not_computable[0].reason, D.analysis.not_computable[0].need)}<div class="card-f"><span>ไม่สร้าง scatter เพราะไม่มีคู่ข้อมูลแม้แต่จุดเดียว</span></div></div>
  <h3 class="sec-h">ปัจจัยอื่นที่มีในชุดข้อมูล: ข่าวเท็จกับคดี/ความเสียหายรายสัปดาห์ (ประเทศไทย)</h3><div class="grid g2" id="cB"></div>
  <h3 class="sec-h">เชิงสำรวจ: เสรีภาพของรัสเซียกับจำนวนการหักล้างของ EUvsDisinfo</h3><div class="grid g2" id="cC"></div>
  <h3 class="sec-h">คู่ที่ไม่สามารถวิเคราะห์ได้และปัจจัยที่ควบคุมไม่ได้</h3>
  ${table([{ h: 'คู่ตัวแปร/ประเด็น', k: 'pair' }, { h: 'เหตุผล', k: 'reason' }, { h: 'ข้อมูลที่ต้องมีเพิ่ม', k: 'need' }], D.analysis.not_computable)}
  ${summaryBlock({
    find: 'ไม่พบหลักฐานทางสถิติที่เพียงพอว่าเสรีภาพทางอินเทอร์เน็ตสัมพันธ์กับจำนวนข่าวปลอมหรือความเสียหาย: คู่ที่คำนวณได้มี n น้อยหรือ p > 0.05 และคู่ FOTN × ความเสียหายคำนวณไม่ได้',
    nums: C.map(c => `${c.title.split('—')[0].split('(')[0].trim()}: ρ = ${fmt2(c.spearman)}, p = ${fmt2(c.spearman_p)}, n = ${c.n}`).join('<br>'),
    period: 'FOTN × AFNC: 2020–2024 · รายสัปดาห์: 2025-11-09 – 2026-10-18 · รัสเซีย × EUvsDisinfo: 2015–2022',
    src: '<code>freedom_on_the_net_scores.csv</code>, <code>afnc_items.csv</code>, <code>weekly_panel.csv</code>, <code>euvsdisinfo_base.csv</code>',
    lim: 'n น้อย; ข้อมูลข่าวปลอมสะท้อนการตรวจจับ/การรายงานของหน่วยงาน ไม่ใช่ปริมาณจริง; อนุกรมเวลามี autocorrelation ทำให้ p-value อาจต่ำเกินจริง; ไม่มีตัวแปรควบคุม (ผู้ใช้อินเทอร์เน็ต ประชากร กฎหมาย)',
    next: 'รวบรวมข้อมูลข่าวปลอม/ความเสียหายของหลายประเทศด้วยนิยามเดียวกัน และ FOTN ปีถัดไป เพื่อเพิ่มจำนวนตัวอย่าง' })}`;
  const box = (c, host) => {
    const id = 'sc_' + c.id; host.insertAdjacentHTML('beforeend', card({ id, title: c.title, sub: `แกน X: ${c.xlab} · แกน Y: ${c.ylab}${c.period ? ' · ' + c.period : ''}`, ds: 'static', src: 'corr',
      body: `<div class="ch" id="${id}"></div><div class="stat-grid"><div><b>${c.n}</b><span>จำนวนตัวอย่าง (n)</span></div><div><b>${fmt2(c.spearman)}</b><span>Spearman ρ</span></div><div><b>${fmt2(c.spearman_p)}</b><span>p-value (Spearman)</span></div><div><b>${fmt2(c.pearson)}</b><span>Pearson r</span></div><div><b>${fmt2(c.pearson_p)}</b><span>p-value (Pearson)</span></div>${isNum(c.diff_spearman) ? `<div><b>${fmt2(c.diff_spearman)}</b><span>ρ ของผลต่างรายสัปดาห์ (p ${fmt2(c.diff_spearman_p)}, n ${c.diff_n})</span></div>` : ''}</div>
      <div class="finding">${interp(c)}</div><div class="sub" style="margin-top:6px">ข้อจำกัด: ${esc(c.note)}<br>ที่มา: ${c.sources.map(esc).join(' · ')}</div>` }));
    const xs = c.points.map(p => p[0]); const lo = Math.min(...xs), hi = Math.max(...xs);
    const inF = p => { const lab = p[2]; if (/^\d{4}-\d{2}-\d{2}$/.test(lab)) return dateOk(lab, +lab.slice(0, 4), +lab.slice(5, 7), qOf(+lab.slice(5, 7))); if (/^\d{4}$/.test(lab)) return !F.years.length || F.years.includes(+lab); return true; };
    mkChart(id, {
      tooltip: { trigger: 'item', ...tipBase, formatter: p => p.seriesType === 'scatter' ? `<b>${p.data[2]}</b><br>${c.xlab}: ${fmt2(p.data[0])}<br>${c.ylab}: ${fmt2(p.data[1])}` : 'เส้นแนวโน้ม (least squares)' },
      grid: grid({ top: 14 }), xAxis: { type: 'value', scale: true, name: c.xlab, nameLocation: 'middle', nameGap: 26, nameTextStyle: { fontSize: 11 }, ...axisBase }, yAxis: { type: 'value', scale: true, ...axisBase },
      series: [{ type: 'scatter', symbolSize: c.n > 20 ? 9 : 13, data: c.points.map(p => ({ value: p, itemStyle: { color: inF(p) ? '#a51d24' : '#d6d3cf', borderColor: '#fff', borderWidth: 1.5 } })),
        label: { show: c.n <= 10, formatter: p => p.data[2], position: 'top', fontSize: 11, color: '#4d4f53' } },
      ...(isNum(c.slope) ? [{ type: 'line', data: [[lo, c.intercept + c.slope * lo], [hi, c.intercept + c.slope * hi]], symbol: 'none', lineStyle: { type: 'dashed', color: '#7a7c80', width: 1.5 }, silent: true }] : [])],
    }, p => { if (p.seriesType === 'scatter' && /^\d{4}-\d{2}-\d{2}$/.test(p.data[2])) { const r = AC.find(a => a.week_start === p.data[2]); if (r) openModal(`ACSC สัปดาห์ ${fdate(r.week_start)}`, acscDetail(r) + `<p>AFNC ข่าวเท็จในสัปดาห์นี้: <b>${fmt(p.data[0])}</b> รายการ (weekly_panel)</p>`); }
      else if (p.seriesType === 'scatter' && /^\d{4}$/.test(p.data[2]) && c.id.startsWith('th')) { const yy = +p.data[2]; showRecords(`คำตัดสินปี ${yy}`, AF.filter(r => r.type === 'Verdict' && r.y === yy && (c.id === 'th_fotn_vs_fake' ? r.v === 'F' : r.v !== 'T')), `จุดข้อมูลปี ${yy}: ${c.ylab} = ${fmt(p.data[1])}`); } });
  };
  C.filter(c => c.id.startsWith('th')).forEach(c => box(c, $('#cA')));
  C.filter(c => c.id.startsWith('wk')).forEach(c => box(c, $('#cB')));
  C.filter(c => c.id.startsWith('ru')).forEach(c => box(c, $('#cC')));
  $('#cC').insertAdjacentHTML('beforeend', `<div class="card"><h4>การอ่านผลเชิงสำรวจ</h4><div class="sub">ทำไมแสดงคู่นี้</div><p style="font-size:13px">EUvsDisinfo เป็นชุดข้อมูลต่างประเทศชุดเดียวที่ระบุ "แหล่ง" ของข้อมูลเท็จได้ในระดับหนึ่ง (ฝั่งสนับสนุนรัฐบาลรัสเซีย) จึงจับคู่กับคะแนน FOTN ของรัสเซียรายปีได้ แต่ทั้งสองอนุกรมมีแนวโน้มตามเวลา (คะแนนรัสเซียลดลงเรื่อย ๆ, จำนวนการหักล้างขึ้นกับทรัพยากรของโครงการ) ค่าสหสัมพันธ์จึงอาจเกิดจากเวลาร่วมกัน (spurious correlation) ไม่ควรใช้สรุปเชิงนโยบาย</p>
    <p style="font-size:13px">การหักล้างของ EUvsDisinfo เป็นการคัดเลือกของหน่วยงาน EU ไม่ใช่ปริมาณข้อมูลเท็จทั้งหมดที่รัสเซียผลิต</p></div>`);
}

/* ============================================================ 8. EXPLORER */
const EX = { sub: 'data', ds: 'afnc', q: '', sort: null, dir: 1, page: 0, per: 25, useF: true, ids: null, idsLabel: '', col: '', val: '' };
const EXDS = {
  afnc: { label: 'AFNC items (โพสต์ศูนย์ต่อต้านข่าวปลอม)', file: () => FILES.afnc,
    rows: () => { let r = afncBlocked() && EX.useF ? [] : AF.filter(x => !EX.useF || afncOk(x)); if (EX.ids) r = AF.filter(x => EX.ids.has(x.id)); return afExport(r); } },
  acsc: { label: 'ACSC weekly (สถิติคดีรายสัปดาห์)', file: () => FILES.acsc, rows: () => (EX.useF ? acV() : AC).map(r => { const { date, y, m, q, ym, ...o } = r; return o; }) },
  fotn: { label: 'Freedom on the Net scores', file: () => FILES.fotn, rows: () => EX.useF ? foV() : FO },
  eu_debunks: { label: 'EUvsDisinfo — ระดับการหักล้าง (debunk_id)', file: () => FILES.eu,
    rows: () => (EX.useF ? euV() : EUD).map(d => ({ debunk_id: d.id, debunk_date: d.date, keywords: d.kws.map(i => D.eu.keywords[i]).join(', '), n_disinformation: d.nd, n_trustworthy: d.nt })) },
  eu_articles: { label: 'EUvsDisinfo — ระดับบทความ (ไฟล์ต้นฉบับ)', file: () => FILES.eu,
    rows: () => { const ok = new Set((EX.useF ? euV() : EUD).map(d => d.i)); return D.eu.articles.filter(a => ok.has(a[0])).map(a => ({ debunk_id: D.eu.debunks[a[0]][5], debunk_date: D.eu.debunks[a[0]][1], article_id: a[6], article_publisher: a[1], article_domain: a[2], article_language: D.eu.langs[a[3]], class: a[4] ? 'disinformation' : 'trustworthy', article_url: a[5] })); } },
  panel: { label: 'Weekly panel (AFNC + ACSC รายสัปดาห์)', file: () => FILES.panel, rows: () => D.panel.rows.filter(r => !EX.useF || dateOk(r.week_start, +r.week_start.slice(0, 4), +r.week_start.slice(5, 7), qOf(+r.week_start.slice(5, 7)))) },
};
function pExplorer(el) {
  const nq = D.quality.checks.filter(c => !c.ok).length;
  summaryBlock({
    find: `ตรวจพบประเด็นคุณภาพข้อมูล ${nq} จาก ${D.quality.checks.length} รายการที่ตรวจ ส่วนใหญ่เป็นข้อจำกัดด้านความครอบคลุมและการรายงาน ไม่ใช่ข้อมูลผิดพลาดเชิงโครงสร้าง; ค่า total_score ของ FOTN ตรงกับผลรวมองค์ประกอบทุกแถว และ weekly_panel ตรงกับการนับใหม่จาก afnc_items`,
    nums: D.quality.files.map(f => `${f.dataset}: ${fmt(f.rows)} แถว ${f.cols} คอลัมน์`).join('<br>'),
    period: 'FOTN 2010–2024 · EUvsDisinfo 2015–2023-08 · AFNC 2019–2026-10 · ACSC 2025-11 – 2026-10', src: 'ไฟล์ทั้งหมดใน <code>data_raw/</code> (ตรวจแล้วดูแท็บ "ไฟล์ที่ตรวจพบ")',
    lim: 'ไม่มีไฟล์ AI Incident Database; ช่วงเวลาของแต่ละชุดไม่ทับซ้อนกันครบ; ACSC มี 1 สัปดาห์ Suspect และสัปดาห์ที่ไม่มีการแถลง',
    next: 'ตรวจคุณภาพซ้ำเมื่อมีข้อมูลใหม่ (รัน pipeline/build_data.py)' });
  el.innerHTML = `<div class="page-h"><div><h2>Data Explorer &amp; Sources</h2><p>ตรวจสอบข้อมูลต้นทาง พจนานุกรมข้อมูล คุณภาพข้อมูล และที่มาของตัวเลขทุกตัว</p></div></div>
   <div class="subtabs">${[['data', '5.1 Data Explorer'], ['dict', '5.2 Data Dictionary'], ['quality', '5.3 Data Quality'], ['source', '5.4 Source of Data'], ['method', 'วิธีคำนวณ & ข้อจำกัด'], ['files', 'ไฟล์ที่ตรวจพบ']].map(([k, l]) => `<button class="btn ${EX.sub === k ? 'primary' : ''}" data-sub="${k}">${l}</button>`).join('')}</div><div id="exBody"></div>`;
  $$('[data-sub]').forEach(b => b.onclick = () => { EX.sub = b.dataset.sub; render(); });
  ({ data: exData, dict: exDict, quality: exQuality, source: exSource, method: exMethod, files: exFiles })[EX.sub]($('#exBody'));
}
function exData(el) {
  const ds = EXDS[EX.ds];
  let rows = ds.rows();
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const total = rows.length;
  if (EX.col && EX.val) { const v = EX.val.toLowerCase(); rows = rows.filter(r => String(r[EX.col] ?? '').toLowerCase().includes(v)); }
  if (EX.q) { const q = EX.q.toLowerCase(); rows = rows.filter(r => cols.some(c => String(r[c] ?? '').toLowerCase().includes(q))); }
  if (EX.sort) { const k = EX.sort, d = EX.dir; rows = [...rows].sort((a, b) => { const x = a[k], y = b[k]; if (x === y) return 0; if (x === null || x === undefined || x === '') return 1; if (y === null || y === undefined || y === '') return -1; return (isNum(x) && isNum(y) ? x - y : String(x).localeCompare(String(y), 'th')) * d; }); }
  const pages = Math.max(1, Math.ceil(rows.length / EX.per)); EX.page = Math.min(EX.page, pages - 1);
  const pr = rows.slice(EX.page * EX.per, (EX.page + 1) * EX.per);
  const cell = (c, v) => (c.endsWith('url') && v) ? `<a href="${esc(v)}" target="_blank" rel="noopener">ลิงก์</a>` : (v === null || v === undefined || v === '') ? '<span class="sub">(ว่าง)</span>' : esc(String(v).length > 120 ? String(v).slice(0, 120) + '…' : v);
  el.innerHTML = `<div class="card"><div class="toolbar">
    <select id="exDs" style="max-width:340px">${Object.entries(EXDS).map(([k, d]) => `<option value="${k}" ${k === EX.ds ? 'selected' : ''}>${d.label}</option>`).join('')}</select>
    <input type="search" id="exQ" placeholder="ค้นหาทุกคอลัมน์…" value="${esc(EX.q)}" style="max-width:240px">
    <select id="exCol" style="max-width:200px"><option value="">กรองคอลัมน์…</option>${cols.map(c => `<option ${c === EX.col ? 'selected' : ''}>${c}</option>`).join('')}</select>
    <input type="search" id="exVal" placeholder="มีคำว่า…" value="${esc(EX.val)}" style="max-width:160px">
    <label class="chk"><input type="checkbox" id="exUseF" ${EX.useF ? 'checked' : ''}> ใช้ตัวกรองส่วนกลาง</label>
    <button class="btn sm" id="exCsv">ส่งออก CSV (${fmt(rows.length)} แถว)</button></div>
    ${EX.ids && EX.ds === 'afnc' ? `<div class="infobox" style="margin-bottom:8px">กำลังแสดงรายการจาก: <b>${esc(EX.idsLabel)}</b> (${fmt(EX.ids.size)} รายการ) <button class="btn sm" id="exClrIds">ล้าง</button></div>` : ''}
    <div class="sub">ไฟล์: <code>${ds.file()}</code> · แสดง ${fmt(rows.length)} จาก ${fmt(total)} แถว (หลังตัวกรองส่วนกลาง${EX.useF ? '' : ' — ปิดอยู่'}) · คลิกหัวคอลัมน์เพื่อเรียง · คลิกแถวเพื่อดูรายละเอียด</div>
    <div class="tscroll" style="max-height:560px"><table class="t"><thead><tr>${cols.map(c => `<th data-sort="${c}" style="cursor:pointer">${c}${EX.sort === c ? (EX.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>
    <tbody>${pr.map((r, i) => `<tr class="click" data-i="${i}">${cols.map(c => `<td>${cell(c, r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="pager"><button class="btn sm" id="exPrev" ${EX.page === 0 ? 'disabled' : ''}>‹ ก่อนหน้า</button> หน้า ${EX.page + 1} / ${pages} <button class="btn sm" id="exNext" ${EX.page >= pages - 1 ? 'disabled' : ''}>ถัดไป ›</button>
      <select id="exPer" style="width:auto">${[25, 50, 100].map(n => `<option ${n === EX.per ? 'selected' : ''}>${n}</option>`).join('')}</select> แถว/หน้า</div></div>
    <p class="sub">หมายเหตุ: ข้อมูล AFNC ในแดชบอร์ดไม่รวมคอลัมน์ content (เนื้อหาเต็ม) เพื่อลดขนาดไฟล์ — ดูได้จาก <code>${FILES.afnc}</code> ด้วย post_id หรือเปิดลิงก์ url</p>`;
  const rr = () => render();
  $('#exDs').onchange = e => { EX.ds = e.target.value; EX.page = 0; EX.sort = null; EX.col = ''; EX.val = ''; rr(); };
  let t; $('#exQ').oninput = e => { clearTimeout(t); t = setTimeout(() => { EX.q = e.target.value; EX.page = 0; rr(); setTimeout(() => { const q = $('#exQ'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 0); }, 350); };
  $('#exCol').onchange = e => { EX.col = e.target.value; EX.page = 0; rr(); };
  let t2; $('#exVal').oninput = e => { clearTimeout(t2); t2 = setTimeout(() => { EX.val = e.target.value; EX.page = 0; rr(); setTimeout(() => { const q = $('#exVal'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 0); }, 350); };
  $('#exUseF').onchange = e => { EX.useF = e.target.checked; EX.page = 0; rr(); };
  $('#exCsv').onclick = () => downloadCSV(`${EX.ds}_export.csv`, cols, rows);
  const c = $('#exClrIds'); if (c) c.onclick = () => { EX.ids = null; rr(); };
  $$('[data-sort]').forEach(th => th.onclick = () => { const k = th.dataset.sort; EX.dir = EX.sort === k ? -EX.dir : 1; EX.sort = k; rr(); });
  $('#exPrev').onclick = () => { EX.page--; rr(); }; $('#exNext').onclick = () => { EX.page++; rr(); };
  $('#exPer').onchange = e => { EX.per = +e.target.value; EX.page = 0; rr(); };
  $$('#exBody tbody tr').forEach(tr => tr.onclick = e => { if (e.target.closest('a')) return; const r = pr[+tr.dataset.i];
    openModal('รายละเอียดรายการ', `<p class="sub">ไฟล์ <code>${ds.file()}</code>${r.row ? ` แถวที่ ${r.row}` : ''}</p><dl class="src">${cols.map(k => `<dt>${k}</dt><dd>${k.endsWith('url') && r[k] ? `<a href="${esc(r[k])}" target="_blank" rel="noopener">${esc(r[k])}</a>` : esc(r[k] ?? '(ว่าง)')}</dd>`).join('')}</dl>`); });
}
function exDict(el) {
  const rows = D.dictionary;
  el.innerHTML = `<div class="card"><h4>Data Dictionary</h4><div class="sub">ชุดไทยใช้พจนานุกรมจาก <code>data_dictionary.csv</code> ของผู้จัดทำ; FOTN และ EUvsDisinfo อ้างอิงคู่มือ <code>00_Data_Guide_TH.pdf</code>; ตัวแปรที่สร้างใหม่ระบุวิธีสร้าง</div>
  ${table([{ h: 'ชุดข้อมูล', k: 'dataset' }, { h: 'ตัวแปร', f: r => `<code>${esc(r.variable)}</code>` }, { h: 'ประเภท', k: 'type' }, { h: 'ความหมาย', k: 'description' }, { h: 'หน่วย', f: r => esc(r.unit || '-') }, { h: 'ไฟล์', f: r => `<code>${esc(r.file)}</code>` }], rows, { maxh: 640 })}</div>
  <div class="card" style="margin-top:14px"><h4>ช่วงเวลาที่ครอบคลุมและข้อจำกัดการใช้งานของแต่ละชุด</h4>
  ${table([{ h: 'ชุดข้อมูล', k: 'd' }, { h: '1 แถว =', k: 'r' }, { h: 'ช่วงเวลา', k: 'p' }, { h: 'ข้อจำกัดในการใช้งาน', k: 'l' }], [
    { d: 'Freedom on the Net', r: '1 ประเทศ ใน 1 ปี', p: 'data_year 2010–2024 (รายงาน 2011–2025)', l: 'การประเมินของผู้เชี่ยวชาญ; ประเทศต่อปีไม่เท่ากัน (37→71); ใช้ report_edition เมื่ออ้างอิงรายงาน' },
    { d: 'EUvsDisinfo', r: 'บทความ 1 ชิ้นที่ผูกกับการหักล้าง', p: '2015-01-06 – 2023-08-01', l: 'เฉพาะข้อมูลเท็จฝั่งสนับสนุนรัสเซีย; ไม่มีประเทศ; 2023 ไม่ครบปี; นับเรื่องด้วย debunk_id' },
    { d: 'AFNC items', r: 'โพสต์ 1 ชิ้นบนเว็บไซต์ศูนย์ฯ', p: '2019-01-05 – 2026-10-31', l: 'คำตัดสินคือเรื่องที่ศูนย์ฯ เลือกตรวจ; 2019 น้อย; view_count เป็นภาพ ณ 1 พ.ย. 2026; ไม่มีสัญญาอนุญาตระบุ' },
    { d: 'ACSC weekly', r: 'การแถลง 1 สัปดาห์', p: '2025-11-09 – 2026-10-24', l: 'รวบรวมจากข่าว; คดีที่แจ้งเท่านั้น; ตัวเลขปัดตั้งแต่ ส.ค. 2026; 1 สัปดาห์ Suspect; ไม่มีจำนวนผู้เสียหาย' },
    { d: 'Weekly panel', r: '1 สัปดาห์ (อาทิตย์–เสาร์)', p: '2018-12-30 – 2026-10-31', l: 'ฝั่ง ACSC ว่างก่อน พ.ย. 2025 (ไม่ใช่ 0)' },
  ])}</div>`;
}
function exQuality(el) {
  const Q = D.quality;
  el.innerHTML = `<div class="card"><h4>สรุปโครงสร้างและคุณภาพของแต่ละไฟล์</h4>
  ${table([{ h: 'ชุดข้อมูล', k: 'dataset' }, { h: 'ไฟล์', f: r => `<code>${esc(r.file)}</code>` }, { h: 'แถว', n: 1, f: r => fmt(r.rows) }, { h: 'คอลัมน์', n: 1, f: r => r.cols },
    { h: 'ค่าว่างทั้งหมด', n: 1, f: r => fmt(r.missing_total) }, { h: 'แถวซ้ำทั้งแถว', n: 1, f: r => fmt(r.dup_rows) }, { h: 'คีย์ซ้ำ', f: r => `${fmt(r.dup_key)} <span class="sub">(${(r.key || []).join('+')})</span>` },
    { h: 'วันที่', f: r => Object.entries(r.date_issues).map(([k, d]) => `${k}: ${d.min} – ${d.max}, แปลงไม่ได้ ${d.unparsed}`).join('<br>') || '-' }], Q.files)}
  <h4 style="margin-top:14px">ค่าว่างรายคอลัมน์</h4>
  ${table([{ h: 'ชุดข้อมูล', k: 'd' }, { h: 'คอลัมน์', k: 'c' }, { h: 'จำนวนว่าง', n: 1, f: r => fmt(r.n) }, { h: '% ว่าง', n: 1, f: r => fmtPct(r.p) }],
    Q.files.flatMap(f => Object.entries(f.missing_by_col).map(([c, n]) => ({ d: f.dataset, c, n, p: n / f.rows * 100 }))), { maxh: 320 })}
  <p class="sub">ค่าว่างในฝั่ง ACSC ของ weekly_panel (361 แถว) คือสัปดาห์ก่อนเริ่มแถลง ไม่ใช่ข้อมูลหาย · ค่าว่างทุกช่องถูกคงไว้เป็น "ไม่มีข้อมูล" ไม่ถูกแปลงเป็น 0</p></div>
  <div class="card" style="margin-top:14px"><h4>ผลการตรวจสอบ (ค่าผิดปกติ รูปแบบวันที่ หน่วยวัด การเชื่อมโยง)</h4>
  ${table([{ h: 'สถานะ', f: r => `<span class="badge ${r.ok ? 'b-ok' : 'b-warn'}">${r.status}</span>` }, { h: 'ชุดข้อมูล', k: 'dataset' }, { h: 'สิ่งที่ตรวจ', k: 'check' }, { h: 'ผลที่พบ', k: 'detail' }, { h: 'การดำเนินการ (บันทึก)', k: 'action' }], Q.checks, { maxh: 600 })}</div>`;
}
function exSource(el) {
  const rows = Object.entries(SRC).map(([k, s]) => ({ k, ...s }));
  el.innerHTML = `<div class="card"><h4>Data Source Mapping — ตัวชี้วัด ↔ ไฟล์ ↔ คอลัมน์ ↔ สูตร</h4><div class="sub">คลิกแถวเพื่อเปิดรายละเอียดพร้อมรายการที่นำมาคำนวณภายใต้ตัวกรองปัจจุบัน · ในทุกหน้า คลิก KPI หรือ "แหล่งข้อมูล &amp; สูตร" ใต้กราฟเพื่อดูข้อมูลเดียวกัน</div>
  ${table([{ h: 'ตัวชี้วัด', k: 't' }, { h: 'ไฟล์', f: r => `<code>${esc(r.file)}</code>` }, { h: 'ชีต/ตาราง', k: 'sheet' }, { h: 'คอลัมน์', k: 'cols' }, { h: 'สูตรคำนวณ', k: 'f' }, { h: 'หน่วย', k: 'unit' }, { h: 'ค่าที่หายไป', k: 'miss' }, { h: 'URL ต้นทาง', k: 'url' }], rows, { click: true, maxh: 640 })}</div>`;
  $$('#exBody tbody tr').forEach(tr => tr.onclick = () => showSource(rows[+tr.dataset.row].k));
}
function exMethod(el) {
  el.innerHTML = `<div class="card"><h4>วิธีคำนวณ</h4><ol style="font-size:13.5px;padding-left:18px">
   <li><b>การประมวลผล:</b> <code>pipeline/build_data.py</code> อ่านไฟล์แนบ (pandas, encoding utf-8-sig) ตรวจคุณภาพ คำนวณสถิติ แล้วเขียน <code>dashboard/data.js</code>; แดชบอร์ดนับ/รวมตัวเลขใหม่ในเบราว์เซอร์ตามตัวกรองทุกครั้ง</li>
   <li><b>การนับข่าว:</b> คำตัดสิน = item_type "Verdict"; ข่าวปลอม = verdict_en "Fake"; ข่าวเท็จ = Fake + Distorted; ช่วงเวลาใช้ date (เวลาไทย) และไตรมาสตามปีปฏิทิน</li>
   <li><b>EUvsDisinfo:</b> นับการหักล้างด้วย debunk_id ไม่ซ้ำ; วันที่แปลงจาก DD-MM-YYYY; keywords แยกด้วยจุลภาค</li>
   <li><b>ACSC:</b> ผลรวม loss_baht/cases ของสัปดาห์ที่แถลง; ไม่เติมสัปดาห์ที่ขาด; ตัดสัปดาห์ Suspect โดยค่าเริ่มต้น; ค่าเฉลี่ยต่อวันใช้จำนวนวันจริง (days); การเปลี่ยนแปลงรายสัปดาห์คำนวณใหม่จากยอดรวม; สัปดาห์ถูกจัดเข้าเดือนตาม week_start</li>
   <li><b>FOTN:</b> ใช้ค่าดิบ; อันดับเรียงจากคะแนนสูง→ต่ำในปีเดียวกัน; ตรวจแล้วว่า total = ผลรวม 3 องค์ประกอบทุกแถว</li>
   <li><b>สหสัมพันธ์:</b> scipy.stats.spearmanr / pearsonr สองหาง; ใช้เฉพาะคู่ที่ประเทศและช่วงเวลาตรงกัน; ผลต่างลำดับที่ 1 สำหรับอนุกรมรายสัปดาห์</li>
</ol></div>
  <div class="card" style="margin-top:14px"><h4>ข้อจำกัดของผลวิเคราะห์</h4><ul style="font-size:13.5px;padding-left:18px">
   <li>จำนวนข่าวปลอมในแดชบอร์ดคือสิ่งที่หน่วยงานตรวจพบและเผยแพร่ ไม่ใช่ปริมาณข่าวปลอมจริง ความแตกต่างระหว่างช่วงเวลาอาจสะท้อนนโยบาย/กำลังคนของหน่วยงาน</li>
   <li>ไม่มีชุดข้อมูลข่าวปลอมหรือความเสียหายของประเทศอื่นที่เทียบเคียงได้ การเปรียบเทียบระหว่างประเทศจึงทำได้เฉพาะคะแนน FOTN</li>
   <li>ไม่มีตัวแปรควบคุม เช่น จำนวนผู้ใช้อินเทอร์เน็ต ประชากร ระดับการใช้แพลตฟอร์ม ระบบการรายงาน ความเข้มข้นในการตรวจจับ กฎหมาย — ไม่ได้สร้างขึ้นเอง และไม่สามารถควบคุมปัจจัยเหล่านี้ได้</li>
   <li>สหสัมพันธ์ไม่ใช่ความเป็นเหตุเป็นผล; n น้อยทำให้อำนาจการทดสอบต่ำ; อนุกรมเวลามี autocorrelation</li>
   <li>ACSC รวบรวมจากข่าว มีตัวเลขที่ขัดกันและปัดเศษ (ระบุในหมายเหตุแต่ละแถว)</li>
   <li>ไฟล์ AI Incident Database ที่คู่มือกล่าวถึงไม่ได้อยู่ในไฟล์แนบ</li></ul></div>`;
}
function exFiles(el) {
  el.innerHTML = `<div class="card"><h4>ไฟล์ที่ตรวจพบในโฟลเดอร์แนบ (รวมโฟลเดอร์ย่อยหลังแตก zip)</h4>
  ${table([{ h: 'ไฟล์', f: r => `<code>${esc(r.file)}</code>` }, { h: 'บทบาท/ชุดข้อมูล', k: 'role' }, { h: 'แถว', n: 1, f: r => r.rows ? fmt(r.rows) : '-' }, { h: 'URL ต้นทาง', f: r => esc(r.url || '-') }], D.meta.files)}
  <div class="warnbox" style="margin-top:10px">${esc(D.meta.missing_dataset)}</div><p class="sub">สร้างชุดข้อมูลแดชบอร์ดเมื่อ ${esc(D.meta.built)}</p></div>`;
}


/* ------------------------------------------------------------ mascot (summary + Q&A) */
const M = { open: false, view: 'menu', qi: 0, qs: null };
const PAGE_NAME = { overview: 'ภาพรวม', freedom: 'เสรีภาพอินเทอร์เน็ต', disinfo: 'ข่าวปลอม & ข้อมูลบิดเบือน', scam: 'ความเสียหายจากมิจฉาชีพ', corr: 'สหสัมพันธ์', explorer: 'Data Explorer & Sources' };
function mascotRefresh() { M.view = 'menu'; M.qs = null; mascotDraw(); }
function mascotDraw() {
  const p = $('#mPanel'); if (!p) return;
  $('#mBadge').classList.toggle('hidden', M.open);
  p.classList.toggle('hidden', !M.open);
  if (!M.open) return;
  const body = $('#mpBody'), back = $('#mpBack'), title = $('#mpTitle');
  back.classList.toggle('hidden', M.view === 'menu');
  if (M.view === 'menu') {
    title.textContent = 'ผู้ช่วยสรุปผล';
    M.qs = M.qs || sixQuestions();
    body.innerHTML = `<p style="margin:0 0 10px">สวัสดีครับ ให้ผมช่วยอะไรดี?</p>
      <button class="choice" data-m="sum"><b>อ่านสรุปหน้านี้</b><small>เล่าเป็นภาษาง่าย ๆ เฉพาะหน้า "${PAGE_NAME[TAB]}" ตามตัวกรองที่เลือกอยู่</small></button>
      ${M.qs.map((q, i) => `<button class="choice" data-q="${i}"><span class="qn">Q${i + 1}</span>${q.q}</button>`).join('')}`;
  } else if (M.view === 'sum') {
    title.textContent = 'สรุปหน้า: ' + PAGE_NAME[TAB];
    body.innerHTML = `<div class="mprose">${pageProse().map(p => `<p>${esc(p)}</p>`).join('')}</div>`;
  } else {
    const q = M.qs[M.qi];
    title.textContent = `คำถามที่ ${M.qi + 1}`;
    body.innerHTML = `<p style="margin:0 0 8px"><b>${q.q}</b></p><p>${q.status}</p>${q.body}<button class="btn sm" onclick="M.open=false;mascotDraw();go('${q.tab}')">ดูการวิเคราะห์ในหน้าที่เกี่ยวข้อง →</button>`;
  }
  $$('[data-m]', body).forEach(b => b.onclick = () => { M.view = b.dataset.m; mascotDraw(); });
  $$('[data-q]', body).forEach(b => b.onclick = () => { M.qi = +b.dataset.q; M.view = 'ans'; mascotDraw(); });
}
function mascotInit() {
  const toggle = () => { M.open = !M.open; if (M.open) M.view = 'menu'; mascotDraw(); };
  $('#mBtn').onclick = toggle; $('#mBadge').onclick = toggle;
  $('#mpClose').onclick = () => { M.open = false; mascotDraw(); };
  $('#mpBack').onclick = () => { M.view = 'menu'; mascotDraw(); };
  mascotDraw();
}

/* ------------------------------------------------------------ boot */
function boot() {
  if (!window.DASH) { $('#loading').innerHTML = '<div class="warnbox">โหลด data.js ไม่สำเร็จ — ให้รัน <code>python -I pipeline/build_data.py</code> ก่อน แล้วเปิด dashboard/index.html ใหม่</div>'; return; }
  if (!window.echarts) { $('#loading').innerHTML = '<div class="warnbox">โหลดไลบรารีกราฟ (ECharts จาก cdnjs) ไม่สำเร็จ — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</div>'; return; }
  const v = AF.filter(r => r.type === 'Verdict');
  $('#coverStats').innerHTML = [[fmt(v.length), 'คำตัดสินข่าว AFNC 2019–2026'], [fmt(D.eu.debunks.length), 'กรณีหักล้าง EUvsDisinfo'], [`${COUNTRIES.length}`, 'ประเทศใน Freedom on the Net']].map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('');
  $('#loading').remove();
  $('#btnOpen').onclick = () => { $('#cover').classList.add('hidden'); $('#app').classList.remove('hidden'); render(); };
  $('#btnCover').onclick = () => { $('#cover').classList.remove('hidden'); $('#app').classList.add('hidden'); disposeCharts(); };
  $('#btnReset').onclick = resetFilters;
  $('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
  renderTabs(); renderSidebar(); mascotInit();
  if (location.hash === '#app') $('#btnOpen').click();
}
try { boot(); } catch (e) { console.error(e); const l = $('#loading'); if (l) l.innerHTML = `<div class="warnbox">เกิดข้อผิดพลาดขณะเริ่มระบบ: ${esc(e.message)}</div>`; }
