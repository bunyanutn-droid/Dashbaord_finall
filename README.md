# Digital Freedom & Disinformation Intelligence Dashboard
 https://bunyanutn-droid.github.io/Dashbaord_finall/
แดชบอร์ดวิเคราะห์เสรีภาพทางอินเทอร์เน็ต ข่าวปลอม และความเสียหายจากมิจฉาชีพ (ใช้ข้อมูลจากไฟล์แนบเท่านั้น)

## โครงสร้าง
- `docs/` — หน้าเว็บ (`index.html`, `app.js`) และชุดข้อมูลที่ประมวลผลแล้ว (`data.js`)
- `pipeline/build_data.py` — อ่านข้อมูลดิบ ตรวจคุณภาพ คำนวณสถิติ/พยากรณ์ แล้วสร้าง `docs/data.js`
- `pipeline/make_report.py` — สร้าง `reports/สรุปผลการวิเคราะห์.md`
- `reports/` — รายงานคุณภาพข้อมูลและผลวิเคราะห์
- `*.zip`, `00_Data_Guide_TH.pdf` — ข้อมูลต้นฉบับและคู่มือ

## เปิดดูแดชบอร์ด
```bash
python -m http.server 8765 --directory docs
```
แล้วเปิด http://localhost:8765 (ต้องต่ออินเทอร์เน็ตเพื่อโหลดไลบรารีกราฟ ECharts)

## สร้างข้อมูลใหม่ (ถ้าแก้ pipeline หรือเปลี่ยนข้อมูล)
```bash
pip install pandas scipy statsmodels openpyxl
# แตก zip ทั้ง 3 ไฟล์ลงโฟลเดอร์ data_raw/
python -c "import zipfile,glob; [zipfile.ZipFile(z).extractall('data_raw') for z in glob.glob('0*.zip')]"
python -I pipeline/build_data.py
python -I pipeline/make_report.py
```
