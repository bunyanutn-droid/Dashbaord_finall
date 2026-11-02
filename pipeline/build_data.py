"""Build the dashboard data bundle from the attached source files only.

Usage:  python -I pipeline/build_data.py
Reads   data_raw/** (extracted from the attached zip files)
Writes  docs/data.js  (window.DASH = {...})
        reports/data_quality.json, reports/analysis_results.json

No value is invented: missing stays missing (null), flagged rows are kept and
marked, and every derived figure records the file/columns/formula it came from.
"""
import json, math, re, sys, warnings
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

warnings.filterwarnings("ignore")
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data_raw"
F_FOTN = RAW / "02_Freedom_on_the_Net" / "freedom_on_the_net_scores.csv"
F_FOTN_X = RAW / "02_Freedom_on_the_Net" / "freedom_on_the_net_scores.xlsx"
F_EU = RAW / "03_EUvsDisinfo" / "euvsdisinfo_base.csv"
TH = RAW / "04_Thai_Disinformation_and_Scams"
F_AFNC = TH / "csv" / "afnc_items.csv"
F_ACSC = TH / "csv" / "acsc_weekly.csv"
F_PANEL = TH / "csv" / "weekly_panel.csv"
F_DICT = TH / "csv" / "data_dictionary.csv"
F_XLSX = TH / "thai-disinfo-scam-dataset.xlsx"


def rel(p):
    return str(p.relative_to(ROOT)).replace("\\", "/")


def clean(v):
    """JSON-safe scalar: NaN/NaT -> None, numpy -> python."""
    if v is None:
        return None
    if isinstance(v, (float, np.floating)):
        return None if math.isnan(v) or math.isinf(v) else round(float(v), 6)
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.bool_,)):
        return bool(v)
    if isinstance(v, pd.Timestamp):
        return None if pd.isna(v) else v.strftime("%Y-%m-%d")
    if v is pd.NaT:
        return None
    return v


def r(x, n=4):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), n)


# ---------------------------------------------------------------- load
fotn = pd.read_csv(F_FOTN, encoding="utf-8-sig")
fotn_x = pd.read_excel(F_FOTN_X, sheet_name=None)
eu = pd.read_csv(F_EU, encoding="utf-8-sig")
afnc = pd.read_csv(F_AFNC, encoding="utf-8-sig")
acsc = pd.read_csv(F_ACSC, encoding="utf-8-sig")
panel = pd.read_csv(F_PANEL, encoding="utf-8-sig")
ddict = pd.read_csv(F_DICT, encoding="utf-8-sig")
xl_sheets = pd.ExcelFile(F_XLSX).sheet_names

# ---------------------------------------------------------------- quality
quality = {"files": [], "checks": []}


def profile(name, df, path, sheet, key=None, date_cols=(), date_fmt=None):
    miss = {c: int(df[c].isna().sum()) for c in df.columns}
    q = {
        "dataset": name, "file": rel(path), "sheet": sheet,
        "rows": int(len(df)), "cols": int(df.shape[1]),
        "missing_total": int(sum(miss.values())),
        "missing_by_col": {k: v for k, v in miss.items() if v},
        "dup_rows": int(df.duplicated().sum()),
        "dup_key": int(df.duplicated(key).sum()) if key else None,
        "key": key, "date_issues": {},
    }
    for c in date_cols:
        parsed = pd.to_datetime(df[c], format=date_fmt, errors="coerce")
        q["date_issues"][c] = {
            "unparsed": int(parsed.isna().sum() - df[c].isna().sum()),
            "min": clean(parsed.min()), "max": clean(parsed.max()), "format": date_fmt or "YYYY-MM-DD",
        }
    quality["files"].append(q)
    return q


def check(dataset, name, ok, detail, action):
    quality["checks"].append({"dataset": dataset, "check": name, "status": "ผ่าน" if ok else "พบประเด็น",
                              "ok": bool(ok), "detail": detail, "action": action})


profile("Freedom on the Net", fotn, F_FOTN, "-", ["iso3", "data_year"])
profile("EUvsDisinfo", eu, F_EU, "-", ["debunk_id", "article_id"], ["debunk_date"], "%d-%m-%Y")
profile("AFNC items", afnc.drop(columns=["content"]), F_AFNC, "-", ["post_id"], ["date", "week_start"])
profile("ACSC weekly", acsc, F_ACSC, "acsc_weekly", ["week_start"], ["week_start", "week_end", "article_date"])
profile("Weekly panel", panel, F_PANEL, "weekly_panel", ["week_start"], ["week_start", "week_end"])

# --- FOTN checks
comp_sum = fotn.obstacles_to_access + fotn.limits_on_content + fotn.violations_of_user_rights
bad_sum = fotn[comp_sum != fotn.total_score]
check("Freedom on the Net", "total_score = ผลรวม 3 องค์ประกอบ", bad_sum.empty,
      f"ไม่ตรง {len(bad_sum)} แถว จาก {len(fotn)}" + ("" if bad_sum.empty else ": " + ", ".join(
          f"{a} {b} ({t} vs {s})" for a, b, t, s in zip(bad_sum.country, bad_sum.data_year, bad_sum.total_score, comp_sum[bad_sum.index]))),
      "แสดงค่าตามต้นฉบับ ไม่แก้ไข")
exp_code = np.where(fotn.total_score >= 70, 1, np.where(fotn.total_score >= 40, 2, 3))
bad_code = fotn[exp_code != fotn.status_code]
check("Freedom on the Net", "status_code สอดคล้องเกณฑ์คะแนน (70–100 เสรี, 40–69 เสรีบางส่วน, 0–39 ไม่เสรี)",
      bad_code.empty, f"ไม่สอดคล้อง {len(bad_code)} แถว", "ใช้ status ตามต้นฉบับ")
rng_bad = fotn[(fotn.obstacles_to_access > 25) | (fotn.limits_on_content > 35) | (fotn.violations_of_user_rights > 40) | (fotn.total_score > 100)]
check("Freedom on the Net", "คะแนนอยู่ในช่วงเต็ม (25/35/40/100)", rng_bad.empty, f"เกินช่วง {len(rng_bad)} แถว", "-")
csv_vs_x = fotn_x["scores"].reset_index(drop=True).equals(fotn.reset_index(drop=True)) if "scores" in fotn_x else False
check("Freedom on the Net", "ไฟล์ CSV และ XLSX ตรงกัน", csv_vs_x,
      "ค่าทุกช่องตรงกัน" if csv_vs_x else "พบความต่างระหว่าง CSV กับ XLSX", "ใช้ไฟล์ CSV เป็นหลัก")
check("Freedom on the Net", "ความครอบคลุมประเทศต่อปีไม่เท่ากัน", False,
      "จำนวนประเทศต่อปี: " + ", ".join(f"{y}:{n}" for y, n in fotn.groupby("data_year").size().items()),
      "ไม่เติมค่า ประเทศที่ไม่มีข้อมูลแสดงเป็น N/A; การจัดอันดับระบุจำนวนประเทศในปีนั้นเสมอ")

# --- EUvsDisinfo checks
eu["debunk_dt"] = pd.to_datetime(eu.debunk_date, format="%d-%m-%Y")
last_eu = eu.debunk_dt.max()
check("EUvsDisinfo", "วันที่เป็นข้อความ DD-MM-YYYY", True, "แปลงสำเร็จทุกแถวด้วยรูปแบบ %d-%m-%Y", "แปลงเป็นวันที่ก่อนเรียงหรือรวมกลุ่ม")
check("EUvsDisinfo", "ปีสุดท้ายไม่ครบปี", False, f"ข้อมูลล่าสุด {last_eu:%Y-%m-%d} (ปี 2023 มีถึงเดือนสิงหาคม)", "ระบุว่าเป็นปีไม่ครบเมื่อเทียบรายปี")
check("EUvsDisinfo", "1 แถว = บทความ ไม่ใช่การหักล้าง", True,
      f"{len(eu):,} แถว แต่มี debunk_id ไม่ซ้ำ {eu.debunk_id.nunique():,} รายการ", "นับการหักล้างด้วย debunk_id ไม่ซ้ำ")
check("EUvsDisinfo", "keywords ว่าง", eu.keywords.isna().sum() == 0, f"ว่าง {int(eu.keywords.isna().sum())} แถว", "จัดเป็น '(ไม่ระบุ)' ไม่ตัดทิ้ง")
check("EUvsDisinfo", "ไม่มีตัวแปรประเทศ", False, "ไม่มีคอลัมน์ประเทศของผู้เผยแพร่/เป้าหมาย มีเพียงภาษาและโดเมน",
      "ไม่เชื่อมกับ Freedom on the Net รายประเทศ")

# --- AFNC checks
url_ok = (afnc.url == "https://www.antifakenewscenter.com/?p=" + afnc.post_id.astype(str)).all()
check("AFNC items", "url สร้างได้จาก post_id", bool(url_ok), "รูปแบบ https://www.antifakenewscenter.com/?p={post_id}", "เก็บเฉพาะ post_id ในชุดข้อมูลแดชบอร์ด")
ver = afnc[afnc.item_type == "Verdict"]
dup_title = int(ver.duplicated(["title"]).sum())
check("AFNC items", "หัวข้อคำตัดสินซ้ำกัน", dup_title == 0,
      f"{dup_title:,} คำตัดสินมีหัวข้อซ้ำกับโพสต์อื่น แต่ post_id ไม่ซ้ำ (ข่าวลือที่วนกลับมา เช่น ทำใบขับขี่ออนไลน์)",
      "ไม่ลบ เพราะเป็นโพสต์แยกกันคนละวัน; ระบุในข้อจำกัด")
check("AFNC items", "ปี 2019 ข้อมูลน้อย", False, f"มีคำตัดสินในปี 2019 เพียง {int((ver.year == 2019).sum())} รายการ (ศูนย์ฯ เปิด พ.ย. 2019)",
      "ใช้ 2020-01 เป็นจุดเริ่มอนุกรมพยากรณ์")
check("AFNC items", "checked_by_agency ว่าง", False, f"ว่าง {int(afnc.checked_by_agency.isna().sum()):,} แถว ({afnc.checked_by_agency.isna().mean()*100:.1f}%)", "แสดงเป็น '(ไม่ระบุ)'")
check("AFNC items", "verdict ได้จากแท็กแทนป้าย", False, f"{int((afnc.verdict_source == 'tags').sum())} แถวกู้คำตัดสินจากแท็ก", "คงไว้ตามผู้จัดทำ แสดงใน Data Explorer")
check("AFNC items", "view_count เป็นภาพ ณ วันดาวน์โหลด", False, "ยอดชม ณ 1 พ.ย. 2026 โพสต์เก่าสะสมนานกว่า", "ไม่ใช้เปรียบเทียบความนิยมข้ามปี")

# panel vs recount
afnc["week_start"] = pd.to_datetime(afnc.week_start)
rec = ver.assign(week_start=pd.to_datetime(ver.week_start)).groupby("week_start").verdict_en.value_counts().unstack(fill_value=0)
pp = panel.assign(week_start=pd.to_datetime(panel.week_start)).set_index("week_start")
j = pp[["afnc_fake", "afnc_distorted", "afnc_true"]].join(rec, how="left").fillna(0)
mism = int(((j.afnc_fake != j.Fake) | (j.afnc_distorted != j.Distorted) | (j.afnc_true != j["True"])).sum())
check("Weekly panel", "afnc_* ใน weekly_panel ตรงกับการนับใหม่จาก afnc_items", mism == 0, f"สัปดาห์ที่ไม่ตรง {mism} จาก {len(j)}", "ยืนยันว่านับจากไฟล์เดียวกัน")

# --- ACSC checks
acsc["week_start_dt"] = pd.to_datetime(acsc.week_start)
lpc = (acsc.loss_baht / acsc.cases).round()
bad_lpc = int((abs(lpc - acsc.loss_per_case_baht) > 1).sum())
check("ACSC weekly", "loss_per_case_baht = loss_baht ÷ cases", bad_lpc == 0, f"ไม่ตรง {bad_lpc} แถว", "คำนวณใหม่ในแดชบอร์ด")
q1, q3 = acsc.cases.quantile([.25, .75]); iqr = q3 - q1
out = acsc[(acsc.cases > q3 + 3 * iqr) | (acsc.cases < q1 - 3 * iqr)]
check("ACSC weekly", "ค่าผิดปกติ (IQR×3) ของจำนวนคดี", out.empty,
      "สัปดาห์ " + ", ".join(out.week_start) + f": {', '.join(f'{c:,}' for c in out.cases)} คดี (ปกติ {int(acsc.cases.median()):,})",
      "ไม่ลบ แต่ตัดออกจากผลรวม/สถิติ/พยากรณ์โดยค่าเริ่มต้น (ผู้ใช้เลือกรวมได้)")
gaps = []
allw = pd.date_range(acsc.week_start_dt.min(), acsc.week_start_dt.max(), freq="W-SUN")
acsc_end = pd.to_datetime(acsc.week_end)
for w in allw:  # a Sunday week is a gap only if no reported period overlaps it
    if not ((acsc.week_start_dt <= w + pd.Timedelta(days=6)) & (acsc_end >= w)).any():
        gaps.append(w.strftime("%Y-%m-%d"))
check("ACSC weekly", "สัปดาห์ที่ไม่มีการแถลง", not gaps, "ไม่มีตัวเลข: " + ", ".join(gaps) + " และ 2026-10-25 (ยังไม่แถลงขณะรวบรวม)",
      "ปล่อยว่าง ไม่เติมศูนย์")
check("ACSC weekly", "เปลี่ยนความละเอียดของหน่วยเงิน", False,
      f"exact {int((acsc.loss_precision=='exact').sum())} สัปดาห์, rounded (ปัดเป็นล้านบาท ตั้งแต่ 2026-08-09) {int((acsc.loss_precision=='rounded').sum())} สัปดาห์",
      "แสดงป้าย rounded; หน่วย = บาท (THB) ทั้งหมด")
check("ACSC weekly", "ช่วงเวลา 8 วันซ้อนทับ", False, "สัปดาห์ 2026-05-30 ถึง 2026-06-06 (8 วัน) ซ้อนวันสุดท้ายของสัปดาห์ก่อน 1 วัน",
      "คงไว้; ความเสียหายต่อวันใช้ days จริงในการหาร")
chg = acsc.cases.diff()
diff_mis = int((acsc.cases_change_vs_prev_week.notna() & chg.notna() & (chg != acsc.cases_change_vs_prev_week)).sum())
check("ACSC weekly", "ส่วนต่างที่แถลง ≠ ส่วนต่างที่คำนวณ", diff_mis == 0, f"ไม่ตรง {diff_mis} สัปดาห์ (ตำรวจเทียบกับตัวเลขที่ปรับปรุง)",
      "กราฟการเปลี่ยนแปลงคำนวณใหม่จาก cases และ loss_baht")
check("ACSC weekly", "ไม่มีจำนวนผู้เสียหาย", False, "มีเพียงจำนวนคดีที่แจ้ง ไม่มีจำนวนผู้เสียหาย และไม่มีมูลค่าแยกทุกประเภท",
      "แสดง N/A สำหรับผู้เสียหาย; มูลค่าตามประเภทใช้ได้เฉพาะประเภทที่เสียหายสูงสุดของสัปดาห์")
check("ข้ามชุดข้อมูล", "ช่วงเวลาทับซ้อน", False,
      "FOTN 2010–2024 (data_year) · EUvsDisinfo 2015-01 – 2023-08 · AFNC 2019-01 – 2026-10 · ACSC 2025-11 – 2026-10",
      "FOTN กับ ACSC ไม่มีปีทับซ้อน จึงไม่คำนวณความสัมพันธ์ระหว่างคู่นี้")
check("ข้ามชุดข้อมูล", "ไฟล์ AI Incident Database", False, "คู่มือกล่าวถึงชุดที่ 1 (AI Incident Database) แต่ไม่มีในไฟล์แนบ",
      "ไม่นำมาใช้")

# ---------------------------------------------------------------- scam type grouping
SCAM_RULES = [
    ("tied", "หลายประเภท (เสมอกัน)"),
    ("สินค้า", "หลอกซื้อขายสินค้า/บริการ"),
    ("ลงทุน", "หลอกลงทุน"),
    ("รางวัล", "หลอกโอนเงินรับรางวัล"),
    ("รายได้พิเศษ", "หลอกหารายได้พิเศษ/ทำงาน"),
    ("ทำงาน", "หลอกหารายได้พิเศษ/ทำงาน"),
    ("ข่มขู่", "ข่มขู่ทางโทรศัพท์"),
    ("แอบอ้าง", "แอบอ้างเป็นบุคคลอื่น"),
]


def scam_group(s):
    if not isinstance(s, str):
        return None
    for k, g in SCAM_RULES:
        if k in s:
            return g
    return "อื่น ๆ"


acsc["top_group"] = acsc.top_type_th.map(scam_group)
acsc["hl_group"] = acsc.highest_loss_type_th.map(scam_group)
acsc["flagged_suspect"] = acsc.flag.fillna("").str.startswith("Suspect")

# ---------------------------------------------------------------- compact data for JS
CATS = sorted(afnc.category_th.unique().tolist())
CAT_EN = dict(zip(afnc.category_th, afnc.category_en))
TYPES = ["Verdict", "Online crime advisory", "Knowledge article", "Other news", "Activity", "Announcement", "Unlabelled"]
VMAP = {"Fake": "F", "Distorted": "D", "True": "T"}
agencies = afnc.checked_by_agency.fillna("").value_counts().index.tolist()
if "" in agencies:
    agencies.remove("")
AG = {a: i for i, a in enumerate(agencies)}
afnc_rows = [
    [int(p), d, TYPES.index(t), VMAP.get(v, ""), CATS.index(c), AG.get(a, -1) if isinstance(a, str) else -1,
     ti, tg if isinstance(tg, str) else "", int(vc), "T" if vs == "tags" else ""]
    for p, d, t, v, c, a, ti, tg, vc, vs in zip(afnc.post_id, afnc.date, afnc.item_type, afnc.verdict_en, afnc.category_th,
                                                 afnc.checked_by_agency, afnc.title, afnc.topic_tags, afnc.view_count, afnc.verdict_source)
]

eu_kw = eu.keywords.fillna("(ไม่ระบุ)").str.split(",").apply(lambda xs: [x.strip() for x in xs if x.strip()])
KW = pd.Series([k for ks in eu_kw for k in set(ks)]).value_counts()
KWL = KW.index.tolist(); KWI = {k: i for i, k in enumerate(KWL)}
LANGS = eu.article_language.value_counts().index.tolist()
deb_ids = eu.drop_duplicates("debunk_id")[["debunk_id"]].reset_index(drop=True)
DI = {d: i for i, d in enumerate(deb_ids.debunk_id)}
eu["kwl"] = eu_kw
g = eu.groupby("debunk_id", sort=False)
eu_debunks = []
for did, grp in g:
    kws = sorted({KWI[k] for ks in grp.kwl for k in ks})
    eu_debunks.append([DI[did], grp.debunk_dt.iloc[0].strftime("%Y-%m-%d"), kws,
                       int((grp["class"] == "disinformation").sum()), int((grp["class"] == "trustworthy").sum()), did])
eu_debunks.sort(key=lambda x: x[0])
eu_articles = [[DI[d], pub, dom, LANGS.index(l), 1 if c == "disinformation" else 0, u, aid]
               for d, pub, dom, l, c, u, aid in zip(eu.debunk_id, eu.article_publisher, eu.article_domain, eu.article_language,
                                                    eu["class"], eu.article_url, eu.article_id)]

fotn_rows = fotn.to_dict(orient="records")
acsc_cols = ["week_start", "week_end", "days", "cases", "loss_baht", "loss_precision", "loss_per_case_baht",
             "cases_change_vs_prev_week", "loss_change_vs_prev_week_baht", "top_type_th", "top_type_case_share_pct",
             "highest_loss_type_th", "highest_loss_type_loss_baht", "flag", "publisher", "article_date", "source_url", "notes",
             "top_group", "hl_group", "flagged_suspect"]
acsc_rows = [{k: clean(v) for k, v in rec.items()} for rec in acsc[acsc_cols].to_dict(orient="records")]
for i, rr in enumerate(acsc_rows):
    rr["row"] = i + 2  # 1-based row number in CSV incl. header
panel_rows = [{k: clean(v) for k, v in rec.items()} for rec in panel.to_dict(orient="records")]

# ---------------------------------------------------------------- statistics
analysis = {"correlations": [], "forecasts": []}


def corr_block(cid, title, x, y, xlab, ylab, labels, sources, note, min_n=10):
    x = np.asarray(x, float); y = np.asarray(y, float)
    n = len(x)
    res = {"id": cid, "title": title, "n": n, "xlab": xlab, "ylab": ylab,
           "points": [[r(a, 4), r(b, 4), l] for a, b, l in zip(x, y, labels)], "sources": sources, "note": note}
    if n >= 3 and np.std(x) > 0 and np.std(y) > 0:
        pr, pp_ = stats.pearsonr(x, y); sr, sp = stats.spearmanr(x, y)
        slope, inter = np.polyfit(x, y, 1)
        res.update(pearson=r(pr), pearson_p=r(pp_, 6), spearman=r(sr), spearman_p=r(sp, 6), slope=r(slope, 6), intercept=r(inter, 6))
        res["reliable"] = n >= min_n
    else:
        res["reliable"] = False
    return res


# C1: Thailand FOTN vs AFNC fake per calendar year (complete years only)
th = fotn[fotn.iso3 == "THA"].set_index("data_year")
yr_fake = ver[ver.verdict_en == "Fake"].groupby("year").size()
yr_false = ver[ver.verdict_en.isin(["Fake", "Distorted"])].groupby("year").size()
yrs = [y for y in range(2020, 2025) if y in th.index and y in yr_fake.index]
analysis["correlations"].append(corr_block(
    "th_fotn_vs_fake", "คะแนนเสรีภาพอินเทอร์เน็ตของไทย (FOTN) กับจำนวนข่าวปลอมที่ AFNC ตัดสินรายปี",
    th.loc[yrs, "total_score"], yr_fake.loc[yrs], "คะแนน FOTN ไทย (0–100, data_year)", "จำนวนคำตัดสิน 'ข่าวปลอม' ต่อปี",
    [str(y) for y in yrs],
    ["data_raw/02_Freedom_on_the_Net/freedom_on_the_net_scores.csv: total_score (iso3=THA)",
     "data_raw/04_Thai_Disinformation_and_Scams/csv/afnc_items.csv: นับแถว item_type=Verdict, verdict_en=Fake ตาม year"],
    f"ใช้เฉพาะปีที่ครบทั้งสองชุด: {yrs[0]}–{yrs[-1]} (2019 ไม่ครบปี, FOTN ยังไม่มี 2025) n={len(yrs)} ต่ำกว่าเกณฑ์ขั้นต่ำ 10 จุด"))
analysis["correlations"].append(corr_block(
    "th_loc_vs_false", "องค์ประกอบ 'การจำกัดเนื้อหา' (FOTN ไทย) กับจำนวนข่าวเท็จ (ปลอม+บิดเบือน) รายปี",
    th.loc[yrs, "limits_on_content"], yr_false.loc[yrs], "limits_on_content ไทย (เต็ม 35)", "ข่าวเท็จ (ปลอม+บิดเบือน) ต่อปี",
    [str(y) for y in yrs],
    ["freedom_on_the_net_scores.csv: limits_on_content (THA)", "afnc_items.csv: Verdict ที่ verdict_en ∈ {Fake, Distorted}"],
    f"n={len(yrs)} ปี เป็นการสำรวจเท่านั้น"))

# C3: weekly AFNC false verdicts vs ACSC cases / loss (same week, Thailand)
pw = panel[panel.acsc_reported & panel.acsc_flag.fillna("").str.startswith("Suspect").eq(False)].copy()
pw["false"] = pw.afnc_fake + pw.afnc_distorted
for cid, col, lab, unit in [("wk_false_vs_cases", "acsc_cases", "จำนวนคดีออนไลน์ที่แจ้ง (คดี/สัปดาห์)", 1),
                            ("wk_false_vs_loss", "acsc_loss_baht", "มูลค่าความเสียหาย (ล้านบาท/สัปดาห์)", 1e6)]:
    blk = corr_block(cid, f"ข่าวเท็จที่ AFNC เผยแพร่ กับ {lab.split(' (')[0]} — รายสัปดาห์ ประเทศไทย",
                     pw["false"], pw[col] / unit, "ข่าวเท็จ (ปลอม+บิดเบือน) ต่อสัปดาห์", lab, pw.week_start.tolist(),
                     ["data_raw/04_Thai_Disinformation_and_Scams/csv/weekly_panel.csv: afnc_fake+afnc_distorted, " + col + " (acsc_reported=TRUE)"],
                     "ตัดสัปดาห์ 2026-08-16 (ติดป้าย Suspect) ออก; ไม่มีการเติมสัปดาห์ที่ไม่มีการแถลง")
    dx = pw["false"].diff().iloc[1:]; dy = (pw[col] / unit).diff().iloc[1:]
    sr, sp = stats.spearmanr(dx, dy)
    blk["diff_spearman"] = r(sr); blk["diff_spearman_p"] = r(sp, 6); blk["diff_n"] = int(len(dx))
    blk["period"] = f"{pw.week_start.min()} – {pw.week_start.max()}"
    analysis["correlations"].append(blk)

# C4: Russia FOTN vs EUvsDisinfo debunks per year (exploratory)
ru = fotn[fotn.iso3 == "RUS"].set_index("data_year")
eu_y = eu.drop_duplicates("debunk_id").groupby(eu.debunk_dt.dt.year).size()
ryrs = [y for y in range(2015, 2023) if y in ru.index and y in eu_y.index]
analysis["correlations"].append(corr_block(
    "ru_fotn_vs_debunks", "คะแนน FOTN ของรัสเซีย กับจำนวนการหักล้างของ EUvsDisinfo รายปี (เชิงสำรวจ)",
    ru.loc[ryrs, "total_score"], eu_y.loc[ryrs], "คะแนน FOTN รัสเซีย (data_year)", "จำนวน debunk_id ไม่ซ้ำ ต่อปี",
    [str(y) for y in ryrs],
    ["freedom_on_the_net_scores.csv: total_score (iso3=RUS)", "euvsdisinfo_base.csv: นับ debunk_id ไม่ซ้ำ ตามปีของ debunk_date"],
    f"ปี {ryrs[0]}–{ryrs[-1]} (2023 ไม่ครบปีจึงตัดออก) n={len(ryrs)}; EUvsDisinfo เก็บเฉพาะข้อมูลเท็จฝั่งสนับสนุนรัสเซีย ไม่ใช่ข่าวเท็จทั้งหมดของประเทศ; ทั้งสองอนุกรมมีแนวโน้มตามเวลาซึ่งอาจทำให้เกิดสหสัมพันธ์ลวง"))

analysis["not_computable"] = [
    {"pair": "คะแนนเสรีภาพ (FOTN) × มูลค่าความเสียหายจากมิจฉาชีพ (ACSC)",
     "reason": "FOTN มีถึง data_year 2024 แต่ ACSC เริ่ม พ.ย. 2025 ไม่มีปีทับซ้อนแม้แต่ปีเดียว",
     "need": "คะแนน FOTN ฉบับ 2026 (data_year 2025) และสถิติความเสียหายย้อนหลังหลายปี หรือข้อมูลความเสียหายของหลายประเทศ"},
    {"pair": "คะแนนเสรีภาพ × จำนวนข่าวปลอม ข้ามประเทศ",
     "reason": "จำนวนข่าวปลอมมีเฉพาะประเทศไทย (AFNC); EUvsDisinfo ไม่มีตัวแปรประเทศ และเก็บเฉพาะข้อมูลเท็จฝั่งสนับสนุนรัสเซีย",
     "need": "จำนวนข่าวปลอมที่นับด้วยนิยามเดียวกันในหลายประเทศ พร้อมจำนวนผู้ใช้อินเทอร์เน็ต/ประชากรเพื่อปรับฐาน"},
    {"pair": "ควบคุมปัจจัยอื่น (ผู้ใช้อินเทอร์เน็ต ประชากร การใช้แพลตฟอร์ม ระบบรายงาน ความเข้มข้นการตรวจจับ กฎหมาย)",
     "reason": "ไม่มีตัวแปรเหล่านี้ในไฟล์แนบ จึงไม่สามารถควบคุมได้",
     "need": "ข้อมูลประชากร/ผู้ใช้อินเทอร์เน็ตรายปี และข้อมูลนโยบาย/ระบบการรายงานของแต่ละประเทศ"},
]


# ---------------------------------------------------------------- forecasting
from statsmodels.tsa.holtwinters import ExponentialSmoothing, SimpleExpSmoothing, Holt
from statsmodels.tsa.arima.model import ARIMA


def fc_naive(y, h):
    return np.repeat(y[-1], h)


def fc_snaive(y, h, m=12):
    return np.array([y[len(y) - m + (i % m)] for i in range(h)])


def fc_ma(y, h, k):
    return np.repeat(np.mean(y[-k:]), h)


def fc_ses(y, h):
    return SimpleExpSmoothing(y, initialization_method="estimated").fit().forecast(h)


def fc_holt(y, h):
    return Holt(y, damped_trend=True, initialization_method="estimated").fit().forecast(h)


def fc_hw(y, h):
    return ExponentialSmoothing(y, trend="add", damped_trend=True, seasonal="add", seasonal_periods=12,
                                initialization_method="estimated").fit().forecast(h)


def fc_arima(y, h, order):
    return ARIMA(y, order=order).fit().forecast(h)


def pick_arima(y):
    best = None
    for p in range(3):
        for d in range(2):
            for q in range(3):
                try:
                    a = ARIMA(y, order=(p, d, q)).fit().aic
                    if best is None or a < best[0]:
                        best = (a, (p, d, q))
                except Exception:
                    pass
    return best[1]


def evaluate(y, models, n_test, h_max):
    """Rolling-origin, 1-step-ahead: train on y[:t], predict y[t] for the last n_test points."""
    out = {}
    for name, fn in models.items():
        errs, preds = [], []
        for t in range(len(y) - n_test, len(y)):
            try:
                p = float(fn(y[:t], 1)[0])
            except Exception:
                p = float("nan")
            preds.append(p); errs.append(y[t] - p)
        e = np.array(errs); a = y[len(y) - n_test:]
        out[name] = {"mae": r(np.nanmean(np.abs(e)), 3), "rmse": r(math.sqrt(np.nanmean(e ** 2)), 3),
                     "mape": r(np.nanmean(np.abs(e / a)) * 100, 3) if np.all(a != 0) else None,
                     "preds": [r(p, 3) for p in preds]}
    return out


def intervals(y, fn, best_fc, h):
    """Empirical prediction intervals from rolling 1..h-step residuals (no distribution assumption beyond symmetry)."""
    res = {k: [] for k in range(1, h + 1)}
    start = max(24 if len(y) > 60 else 12, len(y) - 36)
    for t in range(start, len(y)):
        try:
            f = fn(y[:t], h)
        except Exception:
            continue
        for k in range(1, h + 1):
            if t + k - 1 < len(y):
                res[k].append(y[t + k - 1] - f[k - 1])
    lo80, hi80, lo95, hi95 = [], [], [], []
    for k in range(1, h + 1):
        e = np.array(res[k]) if res[k] else np.array(res[max(kk for kk in res if res[kk])])
        sd = np.std(e, ddof=1)
        lo80.append(best_fc[k - 1] - 1.2816 * sd); hi80.append(best_fc[k - 1] + 1.2816 * sd)
        lo95.append(best_fc[k - 1] - 1.96 * sd); hi95.append(best_fc[k - 1] + 1.96 * sd)
    return lo80, hi80, lo95, hi95


def forecast_block(fid, title, dates, y, models, n_test, h, future_dates, unit, sources, notes, floor0=True):
    y = np.asarray(y, float)
    ev = evaluate(y, models, n_test, h)
    best = min(ev, key=lambda k: (ev[k]["rmse"] if ev[k]["rmse"] is not None else 1e18))
    f = np.asarray(models[best](y, h), float)
    lo80, hi80, lo95, hi95 = intervals(y, models[best], f, h)
    if floor0:
        lo80 = [max(0, v) for v in lo80]; lo95 = [max(0, v) for v in lo95]
    return {"id": fid, "title": title, "unit": unit, "dates": dates, "actual": [r(v, 3) for v in y],
            "test_dates": dates[-n_test:], "eval": ev, "best": best, "n": int(len(y)), "n_test": n_test,
            "future": future_dates, "forecast": [r(v, 3) for v in f],
            "lo80": [r(v, 3) for v in lo80], "hi80": [r(v, 3) for v in hi80],
            "lo95": [r(v, 3) for v in lo95], "hi95": [r(v, 3) for v in hi95],
            "sources": sources, "notes": notes, "method": "Rolling-origin evaluation, 1-step-ahead, " + str(n_test) + " origins; ช่วงพยากรณ์จากความคลาดเคลื่อนย้อนหลังเชิงประจักษ์ 1..h ขั้น"}


vm = ver.copy(); vm["ym"] = vm.month
months = pd.period_range("2020-01", "2026-10", freq="M").astype(str).tolist()
fut_m = pd.period_range("2026-11", periods=6, freq="M").astype(str).tolist()
for fid, vs, lab in [("fc_fake_monthly", ["Fake"], "ข่าวปลอม (Fake)"), ("fc_false_monthly", ["Fake", "Distorted"], "ข่าวเท็จ (ปลอม+บิดเบือน)")]:
    s = vm[vm.verdict_en.isin(vs)].groupby("ym").size().reindex(months, fill_value=0)
    order = pick_arima(s.values.astype(float))
    models = {"Naive": fc_naive, "Seasonal Naive (12)": fc_snaive,
              "Moving Average (3)": lambda y, h: fc_ma(y, h, 3), "Moving Average (6)": lambda y, h: fc_ma(y, h, 6),
              "Simple Exponential Smoothing": fc_ses, "Holt's Trend (damped)": fc_holt,
              "Holt-Winters (additive, damped)": fc_hw, f"ARIMA{order}": lambda y, h, o=order: fc_arima(y, h, o)}
    analysis["forecasts"].append(forecast_block(
        fid, f"จำนวนคำตัดสิน{lab} รายเดือน", months, s.values, models, 12, 6, fut_m, "รายการ/เดือน",
        ["data_raw/04_Thai_Disinformation_and_Scams/csv/afnc_items.csv: นับ item_type=Verdict, verdict_en ∈ " + str(vs) + " ตาม month"],
        ["อนุกรม 2020-01 ถึง 2026-10 (82 เดือน) — ตัดปี 2019 เพราะศูนย์ฯ เพิ่งเปิด", "เดือนที่ไม่มีคำตัดสินนับเป็น 0 เพราะเป็นการนับเหตุการณ์จากรายการครบทุกโพสต์ (ไม่ใช่ค่าที่หายไป)",
         f"ARIMA เลือกอันดับด้วย AIC จากกริด p,q∈{{0,1,2}}, d∈{{0,1}} บนข้อมูลทั้งชุด", "ค่าพยากรณ์สะท้อนจำนวนที่ศูนย์ฯ จะเผยแพร่ ไม่ใช่ปริมาณข่าวปลอมจริงในสังคม"]))

aw = acsc[~acsc.flagged_suspect].reset_index(drop=True)
fut_w = pd.date_range("2026-10-25", periods=5, freq="W-SUN").strftime("%Y-%m-%d").tolist()
for fid, col, lab, unit, div in [("fc_loss_weekly", "loss_baht", "มูลค่าความเสียหายจากการหลอกลวงออนไลน์", "ล้านบาท/สัปดาห์", 1e6),
                                 ("fc_cases_weekly", "cases", "จำนวนคดีหลอกลวงออนไลน์ที่แจ้ง", "คดี/สัปดาห์", 1)]:
    y = (aw[col] / div).values
    order = pick_arima(y)
    models = {"Naive": fc_naive, "Moving Average (4)": lambda y, h: fc_ma(y, h, 4),
              "Simple Exponential Smoothing": fc_ses, "Holt's Trend (damped)": fc_holt, f"ARIMA{order}": lambda y, h, o=order: fc_arima(y, h, o)}
    analysis["forecasts"].append(forecast_block(
        fid, f"{lab} รายสัปดาห์", aw.week_start.tolist(), y, models, 12, 5, fut_w, unit,
        ["data_raw/04_Thai_Disinformation_and_Scams/csv/acsc_weekly.csv: " + col],
        [f"ใช้ {len(aw)} สัปดาห์ที่มีการแถลง (2025-11-09 – 2026-10-18) ตัดสัปดาห์ 2026-08-16 ที่ติดป้าย Suspect",
         "สัปดาห์ที่ไม่มีการแถลง (2026-06-14, 2026-07-26) ไม่ถูกเติมค่า แบบจำลองถือว่าเป็นลำดับของสัปดาห์ที่มีข้อมูล",
         "ข้อมูลไม่ถึง 1 ปี จึงประมาณฤดูกาลไม่ได้; ตั้งแต่ 2026-08-09 ตัวเลขความเสียหายถูกปัดเป็นล้านบาท (วิธีรายงานเปลี่ยน)",
         "สัปดาห์แรกของการพยากรณ์ (2026-10-25) ยังไม่ถูกแถลงขณะรวบรวมข้อมูล",
         "ความน่าเชื่อถือ: ต่ำ — ใช้เพื่อดูทิศทางระยะสั้นเท่านั้น"]))

# ---------------------------------------------------------------- summary numbers used in insights (verifiable)
ver_q = ver.assign(q=pd.PeriodIndex(ver.date, freq="Q").astype(str))
fake_q = ver_q[ver_q.verdict_en == "Fake"].groupby("q").size()
summ = {
    "afnc_total_posts": int(len(afnc)), "afnc_verdicts": int(len(ver)),
    "afnc_fake": int((ver.verdict_en == "Fake").sum()), "afnc_distorted": int((ver.verdict_en == "Distorted").sum()),
    "afnc_true": int((ver.verdict_en == "True").sum()),
    "afnc_fake_peak_quarter": fake_q.idxmax(), "afnc_fake_peak_quarter_n": int(fake_q.max()),
    "acsc_weeks": int(len(acsc)), "acsc_weeks_excl_flag": int(len(aw)),
    "acsc_loss_excl_flag": int(aw.loss_baht.sum()), "acsc_cases_excl_flag": int(aw.cases.sum()),
}
analysis["summary"] = summ

# ---------------------------------------------------------------- metadata, dictionary, sources
dictionary = []
for _, rw in ddict.iterrows():
    dictionary.append({"dataset": "Thai dataset (" + str(rw["sheet"]) + ")", "file": rel(F_DICT), "variable": rw["column"],
                       "type": rw["type"] if isinstance(rw["type"], str) else "", "description": rw["description"]})
FOTN_DICT = [
    ("country", "text", "ชื่อประเทศภาษาอังกฤษ (ตามชื่อ ISO ใน QoG)", "-"),
    ("iso3", "text", "รหัสประเทศ 3 ตัวอักษร", "-"),
    ("iso_numeric", "int", "รหัสประเทศแบบตัวเลข", "-"),
    ("data_year", "int", "ปีที่การประเมินครอบคลุม (ตาม QoG)", "ปี ค.ศ."),
    ("report_edition", "int", "ปีของรายงาน Freedom on the Net (= data_year + 1)", "ปี ค.ศ."),
    ("total_score", "int", "คะแนนรวม ยิ่งสูงยิ่งเสรี = ผลรวม 3 องค์ประกอบ", "คะแนน 0–100"),
    ("obstacles_to_access", "int", "อุปสรรคในการเข้าถึง (ยิ่งสูงยิ่งมีอุปสรรคน้อย)", "คะแนน 0–25"),
    ("limits_on_content", "int", "การจำกัดเนื้อหา รวมการชี้นำ/ปั่นข้อมูลออนไลน์", "คะแนน 0–35"),
    ("violations_of_user_rights", "int", "การละเมิดสิทธิผู้ใช้", "คะแนน 0–40"),
    ("status_code", "int", "1 = เสรี, 2 = เสรีบางส่วน, 3 = ไม่เสรี", "รหัส"),
    ("status / status_th", "text", "ชื่อสถานะภาษาอังกฤษ / ไทย", "-"),
]
for v, t, d, u in FOTN_DICT:
    dictionary.append({"dataset": "Freedom on the Net", "file": rel(F_FOTN), "variable": v, "type": t, "description": d, "unit": u})
EU_DICT = [
    ("debunk_id", "text", "รหัสการหักล้าง 1 เรื่อง (หลายบทความต่อ 1 debunk)", "-"),
    ("keywords", "text (หลายค่า คั่นด้วย ,)", "ประเด็น/เรื่องเล่าที่ถูกปั่น", "-"),
    ("article_id", "text", "รหัสบทความ", "-"),
    ("article_publisher / article_domain", "text", "สำนักข่าว/เว็บไซต์ และโดเมน", "-"),
    ("article_url", "url", "ลิงก์บทความ (ไม่มีเนื้อหา)", "-"),
    ("article_language", "text", "ภาษาของบทความ", "-"),
    ("debunk_date", "text DD-MM-YYYY", "วันที่ EUvsDisinfo เผยแพร่การหักล้าง (ไม่ใช่วันที่บทความเผยแพร่)", "วันที่"),
    ("class", "text", "disinformation = บทความเผยแพร่ข้อมูลเท็จ; trustworthy = บทความน่าเชื่อถือที่ผูกกับการหักล้างเดียวกัน", "-"),
]
for v, t, d, u in EU_DICT:
    dictionary.append({"dataset": "EUvsDisinfo", "file": rel(F_EU), "variable": v, "type": t, "description": d, "unit": u})
DERIVED = [
    ("quarter (AFNC)", "derived", "ไตรมาสจาก date: Q1=ม.ค.–มี.ค. … Q4=ต.ค.–ธ.ค.", "-"),
    ("ข่าวเท็จ (false)", "derived", "verdict_en ∈ {Fake, Distorted}", "รายการ"),
    ("scam_group", "derived", "จัดกลุ่มชื่อประเภทคดีที่สะกดต่างกันด้วยคำสำคัญ: สินค้า→ซื้อขายสินค้า/บริการ; ลงทุน; รางวัล; รายได้พิเศษ/ทำงาน; ข่มขู่; แอบอ้าง; 'tied'→หลายประเภท (ตามลำดับนี้)", "-"),
    ("loss_per_day_baht", "derived", "loss_baht ÷ days (ใช้เทียบสัปดาห์ 8 วัน)", "บาท/วัน"),
]
for v, t, d, u in DERIVED:
    dictionary.append({"dataset": "ตัวแปรที่สร้างใหม่", "file": "pipeline/build_data.py", "variable": v, "type": t, "description": d, "unit": u})

meta = {
    "built": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M"),
    "files": [
        {"file": "00_Data_Guide_TH.pdf", "role": "คู่มือข้อมูล (อ้างอิงนิยามตัวแปรและข้อควรระวัง)", "rows": None},
        {"file": rel(F_FOTN), "role": "Freedom on the Net (Freedom House ผ่าน QoG Jan 2026)", "rows": len(fotn), "url": "https://freedomhouse.org/report/freedom-net · https://qogdata.pol.gu.se"},
        {"file": rel(F_FOTN_X), "role": "สำเนา XLSX ของไฟล์ข้างบน (ชีต scores)", "rows": len(fotn_x.get('scores', []))},
        {"file": rel(F_EU), "role": "EUvsDisinfo (Leite et al., 2024) CC BY 4.0", "rows": len(eu), "url": "https://zenodo.org/records/10514307"},
        {"file": rel(F_AFNC), "role": "ศูนย์ต่อต้านข่าวปลอม (AFNC) ทุกโพสต์ เนื้อหาเต็ม", "rows": len(afnc), "url": "https://opendata.antifakenewscenter.com"},
        {"file": rel(F_ACSC), "role": "สถิติคดีหลอกลวงออนไลน์รายสัปดาห์ (ACSC) จากข่าว", "rows": len(acsc), "url": "https://saranitet.police.go.th"},
        {"file": rel(F_PANEL), "role": "ตารางรวมรายสัปดาห์ AFNC + ACSC", "rows": len(panel)},
        {"file": rel(F_DICT), "role": "พจนานุกรมข้อมูลชุดไทย", "rows": len(ddict)},
        {"file": rel(F_XLSX), "role": "Workbook ชุดไทย ชีต: " + ", ".join(xl_sheets), "rows": None},
        {"file": rel(TH / "csv" / "afnc_items.csv.zip"), "role": "สำเนาบีบอัดของ afnc_items.csv (ไม่ใช้ซ้ำ)", "rows": None},
    ],
    "missing_dataset": "คู่มือกล่าวถึง AI Incident Database (ชุดที่ 1) แต่ไม่มีในไฟล์แนบ จึงไม่ได้ใช้",
}

DASH = {
    "meta": meta, "quality": quality, "dictionary": dictionary, "analysis": analysis,
    "afnc": {"cols": ["post_id", "date", "type", "verdict", "cat", "agency", "title", "tags", "views", "vsrc"],
             "types": TYPES, "cats": CATS, "cat_en": CAT_EN, "agencies": agencies, "rows": afnc_rows,
             "file": rel(F_AFNC)},
    "eu": {"keywords": KWL, "langs": LANGS, "debunks": eu_debunks, "articles": eu_articles, "file": rel(F_EU)},
    "fotn": {"rows": fotn_rows, "file": rel(F_FOTN)},
    "acsc": {"rows": acsc_rows, "file": rel(F_ACSC), "scam_rules": SCAM_RULES},
    "panel": {"rows": panel_rows, "file": rel(F_PANEL)},
}

out_dir = ROOT / "docs"; out_dir.mkdir(exist_ok=True)
js = "window.DASH = " + json.dumps(DASH, ensure_ascii=False, separators=(",", ":"), default=clean) + ";\n"
(out_dir / "data.js").write_text(js, encoding="utf-8")
rep = ROOT / "reports"; rep.mkdir(exist_ok=True)
(rep / "data_quality.json").write_text(json.dumps(quality, ensure_ascii=False, indent=1, default=clean), encoding="utf-8")
(rep / "analysis_results.json").write_text(json.dumps(analysis, ensure_ascii=False, indent=1, default=clean), encoding="utf-8")
print("data.js MB", round(len(js.encode()) / 1e6, 2))
print(json.dumps(summ, ensure_ascii=False))
for c in analysis["correlations"]:
    print(c["id"], c["n"], c.get("pearson"), c.get("pearson_p"), c.get("spearman"), c.get("spearman_p"), c.get("diff_spearman"), c.get("diff_spearman_p"))
for f in analysis["forecasts"]:
    print(f["id"], f["best"], {k: (v["mae"], v["rmse"], v["mape"]) for k, v in f["eval"].items()}, f["forecast"])
for c in quality["checks"]:
    print(c["status"], c["dataset"], c["check"], "|", c["detail"][:160])
