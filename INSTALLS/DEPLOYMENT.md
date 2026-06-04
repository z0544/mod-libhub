# מדריך פריסה — ModLibHub (שרת פנימי, ללא רשת חיצונית)

מדריך זה מסביר כיצד לפרוס את **ModLibHub** על שרת Windows פנימי **ללא גישה לאינטרנט**.
הפריסה מבוססת על תהליך **Node יחיד** שמגיש גם את ה-API וגם את האתר (ללא Docker וללא nginx),
ועל **PostgreSQL נייד** (ללא התקנה/הרשאות מנהל).

> כל שלב כולל **בדיקת אימות**. אל תעבור לשלב הבא לפני שהבדיקה עוברת.

---

## 0. סקירה כללית

| רכיב | טכנולוגיה |
|------|------------|
| Runtime | Node.js 22 |
| מסד נתונים | PostgreSQL 18 (בינארים ניידים) |
| הגשת אתר + API | תהליך Node יחיד (פורט 4000) |

**שתי סביבות:**
1. **מכונת Build** (יש בה אינטרנט) — כאן אורזים את החבילה (`package-release.ps1`).
2. **שרת פנימי** (אופליין) — לשם מעבירים את החבילה ומריצים את סקריפטי הפריסה.

---

## 1. מבנה התיקיות בשרת

כל המערכת יושבת תחת `D:\modlibhub`:

```
D:\modlibhub\
├── app\                 # האפליקציה
│   ├── node_modules\    # כל הספריות (offline)
│   ├── api\
│   │   ├── dist\        # קוד השרת המקומפל (index.js)
│   │   ├── prisma\      # schema.prisma
│   │   ├── package.json
│   │   └── .env         # קונפיגורציה (נוצר מהתבנית)
│   └── web\             # האתר הבנוי (קבצים סטטיים)
├── pgsql\               # בינארים של PostgreSQL
├── pgdata\              # נתוני PostgreSQL (הבסיס עצמו)
├── uploads\             # הקבצים שהועלו (UPLOAD_DIR)  ← D:\modlibhub\uploads
├── logs\                # קבצי לוג (postgres + app)
└── app.pid              # מזהה התהליך הרץ
```

> ניתן לשנות את תיקיית הבסיס ע"י הגדרת משתנה הסביבה `MODLIBHUB_ROOT` לפני הרצת הסקריפטים.

**תכולת חבילת הפריסה (`release\`)** שמעבירים לשרת:
```
release\
├── app\                 # יועתק ל-D:\modlibhub\app
├── data\
│   ├── modlibhub.sql    # גיבוי מלא של מסד הנתונים
│   └── uploads\         # יועתק ל-D:\modlibhub\uploads
└── scripts\             # סקריפטי הפריסה לשרת
```

---

## 2. הכנה במכונת ה-Build (עם אינטרנט)

> שלב זה כבר בוצע אם קיבלת תיקיית `release` מוכנה. אחרת:

1. ודא שהפרויקט מותקן ומסונכרן (`npm install` רץ, מסד הנתונים עם הנתונים).
2. הרץ:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\deploy\package-release.ps1
   ```
3. נוצרת תיקייה `INSTALLS\release` עם כל מה שצריך.

**בדיקת אימות:**
```powershell
Test-Path INSTALLS\release\app\api\dist\index.js   # אמור להחזיר True
Test-Path INSTALLS\release\data\modlibhub.sql       # אמור להחזיר True
```

---

## 3. העברה לשרת

העתק לשרת (USB / תיקייה משותפת) את התיקייה `INSTALLS` כולה (או לפחות `release` + `software`).
לדוגמה הנח אותה ב-`C:\modlibhub-deploy\`.

**בדיקת אימות:** בשרת, ודא שקיימים:
```powershell
Test-Path C:\modlibhub-deploy\release\scripts\1-setup-postgres.ps1   # True
Test-Path C:\modlibhub-deploy\software                                # True (מכיל את ה-zip של PostgreSQL ו-MSI של Node)
```

---

## 4. שלב 1 — התקנת Node.js (בשרת)

1. הרץ את ה-MSI מתוך `software\` (לדוגמה `node-v22.x.x-x64.msi`) — Next/Next/Install.
2. סגור ופתח מחדש את חלון ה-PowerShell.

**בדיקת אימות:**
```powershell
node -v    # אמור להציג v22.x.x
npm -v
```

---

## 5. שלב 2 — הקמת PostgreSQL

מתוך תיקיית הסקריפטים (`release\scripts`):
```powershell
powershell -ExecutionPolicy Bypass -File 1-setup-postgres.ps1 -PgZip "..\..\software\postgresql-18.4-portable.zip"
```
הסקריפט: מחלץ את הבינארים ל-`D:\modlibhub\pgsql`, מאתחל את `D:\modlibhub\pgdata`, ומפעיל את השרת.

**בדיקת אימות:**
```powershell
& "D:\modlibhub\pgsql\bin\pg_isready.exe" -p 5432
# מצופה: ":5432 - accepting connections"
```

---

## 6. שלב 3 — פריסת האפליקציה

```powershell
powershell -ExecutionPolicy Bypass -File 2-deploy-app.ps1
```
מעתיק את `app\` ל-`D:\modlibhub\app`, את הקבצים שהועלו ל-`D:\modlibhub\uploads`, ויוצר `.env` מהתבנית.

**ערוך את הקונפיגורציה** (חובה לפחות `JWT_SECRET`):
```powershell
notepad D:\modlibhub\app\api\.env
```
(ראה פירוט בסעיף 10.)

**בדיקת אימות:**
```powershell
Test-Path D:\modlibhub\app\api\dist\index.js   # True
Test-Path D:\modlibhub\app\node_modules         # True
(Get-ChildItem D:\modlibhub\uploads -File).Count # מספר הקבצים שהועלו (> 0)
```

---

## 7. שלב 4 — שחזור מסד הנתונים

```powershell
powershell -ExecutionPolicy Bypass -File 3-restore-db.ps1
```
יוצר את מסד הנתונים `modlibhub` ומשחזר את כל הקטגוריות, הפריטים והגרסאות מהגיבוי.

**בדיקת אימות:** הסקריפט מדפיס ספירות. מצופה משהו כמו:
```
categories=24  items=147  item_versions=...
```

---

## 8. שלב 5 — הפעלת המערכת

```powershell
powershell -ExecutionPolicy Bypass -File 4-start.ps1
```
מפעיל את PostgreSQL (אם כבוי) ואת תהליך ה-Node שמגיש API + אתר.

**בדיקת אימות:**
```powershell
Invoke-RestMethod http://localhost:4000/api/health        # status = ok
(Invoke-RestMethod http://localhost:4000/api/categories).Count   # > 0
```
פתח בדפדפן: **http://localhost:4000** — אמור להופיע האתר. התחבר עם `admin / Admin123!`
(שנה סיסמה זו! ראה סעיף 10).

---

## 9. שלב 6 (אופציונלי) — הפעלה אוטומטית בעת אתחול

ב-PowerShell **כמנהל (Administrator)**:
```powershell
powershell -ExecutionPolicy Bypass -File install-autostart.ps1
```
רושם משימה מתוזמנת שמריצה את `4-start.ps1` בכל הפעלת מחשב.

**בדיקת אימות:**
```powershell
Get-ScheduledTask -TaskName ModLibHub | Select-Object State   # Ready
Start-ScheduledTask -TaskName ModLibHub
```
(אפשר גם לבצע אתחול מלא לשרת ולוודא שהאתר עולה לבד.)

---

## 10. קונפיגורציה — מה אפשר לשנות ואיפה

כל ההגדרות נמצאות בקובץ **`D:\modlibhub\app\api\.env`**. לאחר שינוי — הפעל מחדש (`stop.ps1` ואז `4-start.ps1`).

| משתנה | ברירת מחדל | מה זה |
|-------|-------------|--------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/modlibhub?schema=public` | חיבור למסד. אם שינית סיסמת DB — עדכן כאן. |
| `PORT` | `4000` | הפורט שעליו רץ האתר + API. |
| `JWT_SECRET` | (חובה לשנות!) | מפתח חתימת הטוקנים. הזן מחרוזת אקראית ארוכה. |
| `JWT_EXPIRES_IN` | `7d` | תוקף התחברות (`12h`, `7d`, `30d`...). |
| `UPLOAD_DIR` | `D:/modlibhub/uploads` | מיקום הקבצים שהועלו. |
| `MAX_UPLOAD_SIZE` | `2147483648` (2GB) | גודל העלאה מקסימלי בבייטים. |
| `WEB_DIST_DIR` | `D:/modlibhub/app/web` | מיקום קבצי האתר הבנוי. |
| `CORS_ORIGIN` | `http://localhost:4000` | רלוונטי רק אם מגישים את האתר מכתובת אחרת. |

**הגדרות שמשנים בקבצי הקונפיגורציה של המערכת (לא ב-.env):**
- **פורט / סיסמת PostgreSQL / תיקיית בסיס** — בקובץ `scripts\config.ps1` (משתנים `DbPort`, `DbPassword`, `ModRoot`).
- **תיקיית בסיס חלופית** — משתנה הסביבה `MODLIBHUB_ROOT` (למשל `E:\modlibhub`).

**שינוי סיסמת האדמין:** התחבר כאדמין → או החלף דרך ה-DB. (כברירת מחדל `admin / Admin123!`, `viewer / Viewer123!`.)

---

## 11. תפעול שוטף (Day-2)

| פעולה | פקודה (מתוך `scripts`) |
|--------|--------------------------|
| הפעלה | `4-start.ps1` |
| עצירה (אפליקציה) | `stop.ps1` |
| עצירה (כולל DB) | `stop.ps1 -IncludeDb` |
| הפעלת DB בלבד | `start-postgres.ps1` |
| עצירת DB בלבד | `stop-postgres.ps1` |

**לוגים:** `D:\modlibhub\logs\` (`app.out.log`, `app.err.log`, `postgres.log`).

**גיבוי מסד הנתונים:**
```powershell
$env:PGPASSWORD="postgres"
& "D:\modlibhub\pgsql\bin\pg_dump.exe" -h localhost -p 5432 -U postgres -d modlibhub `
  --no-owner --no-privileges --clean --if-exists -f "D:\modlibhub\backup-$(Get-Date -Format yyyyMMdd).sql"
```
גבה גם את תיקיית `D:\modlibhub\uploads` (הקבצים עצמם).

---

## 12. עדכון גרסה

1. במכונת ה-Build: הרץ שוב `package-release.ps1` → תיקיית `release` חדשה.
2. בשרת: `stop.ps1` → הרץ `2-deploy-app.ps1` (מעדכן קוד; ה-`.env` נשמר) → `4-start.ps1`.
   - אם השתנתה סכמת המסד: שחזר/הרץ מיגרציה לפי הצורך (ראה סעיף 13).

---

## 13. פתרון תקלות

| תסמין | פתרון |
|--------|--------|
| `pg_isready` לא מחזיר "accepting connections" | בדוק `logs\postgres.log`. ודא שהפורט 5432 פנוי. |
| האתר לא עולה (4000) | בדוק `logs\app.err.log`. ודא ש-`node -v` עובד ושה-`.env` תקין. |
| "Cannot find module" בהרצת האפליקציה | חסר `node_modules` — ודא ש-`2-deploy-app.ps1` הסתיים והעתיק את התיקייה. |
| הורדות מחזירות 404 | ודא ש-`UPLOAD_DIR` ב-`.env` מצביע ל-`D:\modlibhub\uploads` ושיש שם קבצים. |
| שינוי סכמה אחרי עדכון | הרץ במכונה עם node: `cd D:\modlibhub\app\api ; npx prisma db push` (ה-CLI כלול ב-node_modules). |
