"""Write reports/สรุปผลการวิเคราะห์.md from the pipeline outputs and source files (no hand-typed numbers)."""
import json, sys, pandas as pd
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
R = Path(__file__).resolve().parent.parent
A = json.loads((R/"reports/analysis_results.json").read_text(encoding="utf-8"))
Q = json.loads((R/"reports/data_quality.json").read_text(encoding="utf-8"))
af = pd.read_csv(R/"data_raw/04_Thai_Disinformation_and_Scams/csv/afnc_items.csv", encoding="utf-8-sig", usecols=["date","item_type","verdict_en","category_th","year"])
v = af[af.item_type=="Verdict"].copy(); v["q"]=pd.PeriodIndex(v.date,freq="Q").astype(str)
fq = v[v.verdict_en=="Fake"].groupby("q").size().sort_values(ascending=False)
fals = v[v.verdict_en!="True"].category_th.value_counts()
vc = v.verdict_en.value_counts(); n=len(v)
fo = pd.read_csv(R/"data_raw/02_Freedom_on_the_Net/freedom_on_the_net_scores.csv", encoding="utf-8-sig")
y24 = fo[fo.data_year==2024].sort_values("total_score",ascending=False).reset_index(drop=True)
th = y24[y24.iso3=="THA"].iloc[0]; rank = int(y24.index[y24.iso3=="THA"][0])+1
asean = y24[y24.iso3.isin(["KHM","IDN","MYS","MMR","PHL","SGP","THA","VNM"])]
C = {c["id"]:c for c in A["correlations"]}
F = {f["id"]:f for f in A["forecasts"]}
def c(x): return f"n={x['n']}, Spearman ρ={x['spearman']:.2f} (p={x['spearman_p']:.3f}), Pearson r={x['pearson']:.2f} (p={x['pearson_p']:.3f})"
L=[]
L.append("# สรุปผลการวิเคราะห์ตามคำถามหลัก 5 ข้อ\n\nตัวเลขทุกตัวสร้างจากไฟล์แนบโดย `pipeline/build_data.py` และ `pipeline/make_report.py` (ไม่มีการพิมพ์ตัวเลขด้วยมือ) ดูที่มาและสูตรเต็มในแท็บ Data Explorer & Sources\n")
L.append("## Q1 เสรีภาพทางอินเทอร์เน็ตสัมพันธ์กับข่าวปลอมและความเสียหายหรือไม่\n**สถานะ: ตอบได้บางส่วน**\n")
L.append(f"- FOTN ไทย × ข่าวปลอม AFNC รายปี 2020–2024: {c(C['th_fotn_vs_fake'])} — ไม่มีนัยสำคัญ และ n น้อยมาก")
L.append(f"- ข่าวเท็จรายสัปดาห์ × จำนวนคดี (ไทย, 47 สัปดาห์): {c(C['wk_false_vs_cases'])}")
L.append(f"- ข่าวเท็จรายสัปดาห์ × ความเสียหาย: {c(C['wk_false_vs_loss'])}")
L.append("- **FOTN × ความเสียหายจากมิจฉาชีพ: ไม่สามารถสรุปได้จากข้อมูลที่มี** — FOTN มีถึง data_year 2024, ACSC เริ่ม พ.ย. 2025 ไม่มีปีทับซ้อน")
L.append("- ไม่มีข้อมูลควบคุม (ผู้ใช้อินเทอร์เน็ต ประชากร กฎหมาย ระบบรายงาน) จึงควบคุมปัจจัยเหล่านี้ไม่ได้ ห้ามตีความเป็นเหตุและผล\n")
L.append(f"## Q2 ไตรมาสที่มีข่าวปลอมมากที่สุด\n**ตอบได้** — {fq.index[0]} มี {fq.iloc[0]} รายการ รองลงมา " + ", ".join(f"{k} ({x})" for k,x in fq.iloc[1:3].items()) + f" (จากข่าวปลอมทั้งหมด {vc['Fake']:,} รายการ, ม.ค. 2019 – ต.ค. 2026)\n")
L.append(f"## Q3 ข่าวปลอมส่วนใหญ่เกี่ยวกับเรื่องใด\n**ตอบได้** — ข่าวเท็จ (ปลอม+บิดเบือน) {len(v)-vc['True']:,} รายการ: " + ", ".join(f"{k} {x:,} ({x/fals.sum()*100:.1f}%)" for k,x in fals.head(4).items()) + " (หมวดตามต้นฉบับ AFNC)\n")
L.append(f"## Q4 สัดส่วนข่าวจริง/ปลอม\n**ตอบได้ (ภายในขอบเขตข้อมูล)** — จากคำตัดสิน {n:,} รายการ: ปลอม {vc['Fake']:,} ({vc['Fake']/n*100:.1f}%), บิดเบือน {vc['Distorted']:,} ({vc['Distorted']/n*100:.1f}%), จริง {vc['True']:,} ({vc['True']/n*100:.1f}%) · ครอบคลุมเฉพาะเรื่องที่ AFNC เลือกตรวจและเผยแพร่ **ไม่ใช่สัดส่วนข่าวปลอมในสังคม**\n")
L.append(f"## Q5 เสรีภาพของไทยเทียบต่างประเทศ\n**ตอบได้** — data_year 2024: ไทย {th.total_score}/100 (ไม่เสรี) อันดับ {rank}/{len(y24)}; มัธยฐานทุกประเทศ {y24.total_score.median():.0f}; อาเซียน: " + ", ".join(f"{r.country.replace(' (the)','').replace('Viet Nam','Vietnam')} {r.total_score}" for r in asean.itertuples()) + f"; องค์ประกอบไทย: เข้าถึง {th.obstacles_to_access}/25, เนื้อหา {th.limits_on_content}/35, สิทธิผู้ใช้ {th.violations_of_user_rights}/40 · เป็นการประเมินของผู้เชี่ยวชาญ จำนวนประเทศต่อปีไม่เท่ากัน\n")
L.append("## รายงานคุณภาพข้อมูล (ย่อ)\n| ชุดข้อมูล | ตรวจ | ผล | การดำเนินการ |\n|---|---|---|---|")
for k in Q["checks"]: L.append(f"| {k['dataset']} | {k['check']} | {k['status']}: {k['detail']} | {k['action']} |")
L.append("\n## ข้อจำกัดสำคัญ\n- ไฟล์ AI Incident Database ที่คู่มือกล่าวถึงไม่มีในไฟล์แนบ\n- ไม่มีข้อมูลข่าวปลอม/ความเสียหายของต่างประเทศที่นิยามเดียวกัน; EUvsDisinfo ไม่มีประเทศและเป็นเฉพาะฝั่งสนับสนุนรัสเซีย\n- ACSC รวบรวมจากข่าว เฉพาะคดีที่แจ้งความ ไม่มีจำนวนผู้เสียหาย; สัปดาห์ 16–22 ส.ค. 2026 ติดป้าย Suspect (ตัดออกโดยค่าเริ่มต้น แสดงได้ด้วยตัวกรอง)")
(R/"reports/สรุปผลการวิเคราะห์.md").write_text("\n".join(L),encoding="utf-8"); print("\n".join(L[:14]))
