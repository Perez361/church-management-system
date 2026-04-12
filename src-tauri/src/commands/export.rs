use crate::db::get_pool;
use crate::models::AppError;
use chrono::{Utc, Datelike};
use rust_xlsxwriter::*;
use std::path::PathBuf;

// ── Helpers ───────────────────────────────────────────────────────────────────

fn downloads_dir() -> PathBuf {
    dirs::download_dir().unwrap_or_else(|| PathBuf::from("."))
}

fn stamp() -> String {
    let n = Utc::now();
    format!("{}{:02}{:02}", n.year(), n.month(), n.day())
}

// ── Light, Excel-friendly colour theme ────────────────────────────────────────
//
// All cells have explicit background + font colour so spreadsheet apps never
// produce invisible text (e.g. black text on a dark row).
//
//  Header   – Navy  #1E4D6B  |  White text  #FFFFFF  |  Bold
//  Even row – White #FFFFFF  |  Dark  text  #1A1A2E
//  Odd  row – Ice   #EEF4FF  |  Dark  text  #1A1A2E
//  Total    – Amber #FFF3CD  |  Amber text  #7A4F00  |  Bold
//  20% col  – Warm  #FEF9EC  |  Dark  text  #1A1A2E  (even)
//           - Warm  #FDF3D0  |  Dark  text  #1A1A2E  (odd)
//  60% col  – Mint  #EFF9F0  |  Dark  text  #1A1A2E  (even)
//           - Mint  #D8F3DC  |  Dark  text  #1A1A2E  (odd)
// ─────────────────────────────────────────────────────────────────────────────

const DARK:          u32 = 0x1A1A2E;  // universal dark text
const WHITE_BG:      u32 = 0xFFFFFF;
const ICE_BG:        u32 = 0xEEF4FF;  // odd-row tint
const NAVY_BG:       u32 = 0x1E4D6B;  // header
const AMBER_BG:      u32 = 0xFFF3CD;  // totals bg
const AMBER_TXT:     u32 = 0x7A4F00;  // totals text
const WARM_BG:       u32 = 0xFEF9EC;  // 20% even
const WARM_ALT_BG:   u32 = 0xFDF3D0;  // 20% odd
const MINT_BG:       u32 = 0xEFF9F0;  // 60% even
const MINT_ALT_BG:   u32 = 0xD8F3DC;  // 60% odd

fn header_fmt() -> Format {
    Format::new()
        .set_bold()
        .set_background_color(Color::RGB(NAVY_BG))
        .set_font_color(Color::RGB(0xFFFFFF))
}

// Even row — text cell
fn row_fmt() -> Format {
    Format::new()
        .set_background_color(Color::RGB(WHITE_BG))
        .set_font_color(Color::RGB(DARK))
}

// Odd row — text cell
fn alt_fmt() -> Format {
    Format::new()
        .set_background_color(Color::RGB(ICE_BG))
        .set_font_color(Color::RGB(DARK))
}

// Even row — currency cell
fn currency_fmt() -> Format {
    Format::new()
        .set_background_color(Color::RGB(WHITE_BG))
        .set_font_color(Color::RGB(DARK))
        .set_num_format("\"GHS \"#,##0.00")
}

// Odd row — currency cell
fn alt_currency_fmt() -> Format {
    Format::new()
        .set_background_color(Color::RGB(ICE_BG))
        .set_font_color(Color::RGB(DARK))
        .set_num_format("\"GHS \"#,##0.00")
}

// Totals row — label
fn totals_label_fmt() -> Format {
    Format::new()
        .set_bold()
        .set_background_color(Color::RGB(AMBER_BG))
        .set_font_color(Color::RGB(AMBER_TXT))
}

// Totals row — currency
fn totals_currency_fmt() -> Format {
    Format::new()
        .set_bold()
        .set_background_color(Color::RGB(AMBER_BG))
        .set_font_color(Color::RGB(AMBER_TXT))
        .set_num_format("\"GHS \"#,##0.00")
}

// Tithe breakdown — 20% columns (even / odd rows)
fn t20_fmt()     -> Format { Format::new().set_background_color(Color::RGB(WARM_BG))     .set_font_color(Color::RGB(DARK)).set_num_format("\"GHS \"#,##0.00") }
fn t20_alt_fmt() -> Format { Format::new().set_background_color(Color::RGB(WARM_ALT_BG)) .set_font_color(Color::RGB(DARK)).set_num_format("\"GHS \"#,##0.00") }

// Tithe breakdown — 60% column (even / odd rows)
fn t60_fmt()     -> Format { Format::new().set_background_color(Color::RGB(MINT_BG))     .set_font_color(Color::RGB(DARK)).set_num_format("\"GHS \"#,##0.00") }
fn t60_alt_fmt() -> Format { Format::new().set_background_color(Color::RGB(MINT_ALT_BG)) .set_font_color(Color::RGB(DARK)).set_num_format("\"GHS \"#,##0.00") }

// Totals for 20% / 60% columns
fn totals_t20_fmt() -> Format { Format::new().set_bold().set_background_color(Color::RGB(0xFBD95B)).set_font_color(Color::RGB(AMBER_TXT)).set_num_format("\"GHS \"#,##0.00") }
fn totals_t60_fmt() -> Format { Format::new().set_bold().set_background_color(Color::RGB(0xA3E4A8)).set_font_color(Color::RGB(0x1A4D1E)) .set_num_format("\"GHS \"#,##0.00") }

// Keep old bold_fmt / bold_currency_fmt aliases so we don't break anything
fn bold_fmt()          -> Format { totals_label_fmt()    }
fn bold_currency_fmt() -> Format { totals_currency_fmt() }

fn write_headers(ws: &mut Worksheet, headers: &[&str]) -> Result<(), AppError> {
    let hf = header_fmt();
    for (c, h) in headers.iter().enumerate() {
        ws.write_with_format(0, c as u16, *h, &hf)
            .map_err(|e| AppError { message: e.to_string(), code: "EXPORT".into() })?;
    }
    Ok(())
}

fn save(wb: &mut Workbook, name: &str) -> Result<String, AppError> {
    let path = downloads_dir().join(name);
    wb.save(&path)
        .map_err(|e| AppError { message: e.to_string(), code: "EXPORT".into() })?;
    Ok(path.to_string_lossy().to_string())
}

// ── Members ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn export_members_excel() -> Result<String, AppError> {
    let pool = get_pool();

    #[derive(sqlx::FromRow)]
    struct Row {
        member_no:       String,
        first_name:      String,
        last_name:       String,
        gender:          String,
        phone:           Option<String>,
        email:           Option<String>,
        department_id:   Option<String>,
        membership_date: String,
        status:          String,
    }

    let rows = sqlx::query_as::<_, Row>(
        "SELECT member_no, first_name, last_name, gender, phone, email,
                department_id, membership_date, status
         FROM members
         WHERE deleted_at IS NULL
         ORDER BY first_name, last_name",
    )
    .fetch_all(pool)
    .await?;

    let mut wb = Workbook::new();
    let ws = wb.add_worksheet();
    ws.set_name("Members")
        .map_err(|e| AppError { message: e.to_string(), code: "EXPORT".into() })?;

    write_headers(ws, &[
        "Member No", "First Name", "Last Name", "Gender",
        "Phone", "Email", "Department", "Membership Date", "Status",
    ])?;

    fn dept_label(d: Option<&str>) -> &str {
        match d {
            Some("choir")         => "Choir",
            Some("ushers")        => "Ushers",
            Some("youth")         => "Youth",
            Some("elders")        => "Elders",
            Some("sunday_school") => "Sunday School",
            Some(other)           => other,
            None                  => "—",
        }
    }

    let rf  = row_fmt();
    let alt = alt_fmt();

    for (i, row) in rows.iter().enumerate() {
        let r   = (i + 1) as u32;
        let odd = i % 2 == 1;
        let fmt = if odd { &alt } else { &rf };

        let cells: &[&str] = &[
            &row.member_no,
            &row.first_name,
            &row.last_name,
            &row.gender,
            row.phone.as_deref().unwrap_or("—"),
            row.email.as_deref().unwrap_or("—"),
            dept_label(row.department_id.as_deref()),
            &row.membership_date,
            &row.status,
        ];

        for (c, val) in cells.iter().enumerate() {
            ws.write_with_format(r, c as u16, *val, fmt).ok();
        }
    }

    ws.autofit();
    save(&mut wb, &format!("members_{}.xlsx", stamp()))
}

// ── Tithe ─────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn export_tithe_excel(year: i64) -> Result<String, AppError> {
    let pool = get_pool();

    #[derive(sqlx::FromRow)]
    struct Row {
        first_name:   String,
        last_name:    String,
        member_no:    String,
        amount:       f64,
        payment_date: String,
        period_month: i64,
        payment_mode: String,
        reference_no: Option<String>,
        received_by:  String,
    }

    let rows = sqlx::query_as::<_, Row>(
        "SELECT m.first_name, m.last_name, m.member_no,
                t.amount, t.payment_date, t.period_month,
                t.payment_mode, t.reference_no, t.received_by
         FROM tithe_payments t
         JOIN members m ON m.id = t.member_id
         WHERE t.period_year = ?
         ORDER BY t.payment_date DESC",
    )
    .bind(year)
    .fetch_all(pool)
    .await?;

    let mut wb = Workbook::new();
    let ws = wb.add_worksheet();
    ws.set_name(&format!("Tithe {}", year))
        .map_err(|e| AppError { message: e.to_string(), code: "EXPORT".into() })?;

    write_headers(ws, &[
        "Member", "Member No", "Tithe Amount (GHS)", "Payment Date",
        "Period Month", "Payment Mode", "Reference", "Received By",
        "20% Portion (GHS)", "60% Portion (GHS)", "20% Balance (GHS)",
    ])?;

    let rf   = row_fmt();
    let cf   = currency_fmt();
    let alt  = alt_fmt();
    let acf  = alt_currency_fmt();
    let tlf  = totals_label_fmt();
    let tcf  = totals_currency_fmt();
    // Breakdown column formats
    let t20  = t20_fmt();     let t20a = t20_alt_fmt();
    let t60  = t60_fmt();     let t60a = t60_alt_fmt();
    let tt20 = totals_t20_fmt();
    let tt60 = totals_t60_fmt();

    let month_names = [
        "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    let mut total        = 0.0_f64;
    let mut total_part_a = 0.0_f64; // 20%
    let mut total_part_b = 0.0_f64; // 60%
    let mut total_part_c = 0.0_f64; // 20% balance

    for (i, row) in rows.iter().enumerate() {
        let r      = (i + 1) as u32;
        let odd    = i % 2 == 1;
        let name   = format!("{} {}", row.first_name, row.last_name);
        let month  = month_names.get(row.period_month as usize).copied().unwrap_or("?");
        let part_a = row.amount * 0.20;
        let part_b = row.amount * 0.60;
        let part_c = row.amount * 0.20;

        let (tf, cf_r, bf20, bf60) = if odd {
            (&alt, &acf, &t20a, &t60a)
        } else {
            (&rf,  &cf,  &t20,  &t60)
        };

        ws.write_with_format(r, 0, &name,                                      tf).ok();
        ws.write_with_format(r, 1, &row.member_no,                             tf).ok();
        ws.write_with_format(r, 2, row.amount,                                 cf_r).ok();
        ws.write_with_format(r, 3, &row.payment_date,                          tf).ok();
        ws.write_with_format(r, 4, month,                                      tf).ok();
        ws.write_with_format(r, 5, &row.payment_mode,                          tf).ok();
        ws.write_with_format(r, 6, row.reference_no.as_deref().unwrap_or("—"), tf).ok();
        ws.write_with_format(r, 7, &row.received_by,                           tf).ok();
        ws.write_with_format(r, 8,  part_a,                                    bf20).ok();
        ws.write_with_format(r, 9,  part_b,                                    bf60).ok();
        ws.write_with_format(r, 10, part_c,                                    bf20).ok();

        total        += row.amount;
        total_part_a += part_a;
        total_part_b += part_b;
        total_part_c += part_c;
    }

    // Totals row — amber for main amount, warm/mint tints for 20/60 columns
    let tr = (rows.len() + 1) as u32;
    ws.write_with_format(tr, 1,  "TOTAL",       &tlf).ok();
    ws.write_with_format(tr, 2,  total,          &tcf).ok();
    ws.write_with_format(tr, 8,  total_part_a,   &tt20).ok();
    ws.write_with_format(tr, 9,  total_part_b,   &tt60).ok();
    ws.write_with_format(tr, 10, total_part_c,   &tt20).ok();

    ws.autofit();
    save(&mut wb, &format!("tithe_{}.xlsx", year))
}

// ── Offerings ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn export_offerings_excel(year: i64) -> Result<String, AppError> {
    let pool = get_pool();

    #[derive(sqlx::FromRow)]
    struct Row {
        service_date: String,
        service_type: String,
        category:     String,
        total_amount: f64,
        currency:     String,
        counted_by:   Option<String>,
    }

    let rows = sqlx::query_as::<_, Row>(
        "SELECT service_date, service_type, category,
                total_amount, currency, counted_by
         FROM offerings
         WHERE strftime('%Y', service_date) = ?
         ORDER BY service_date DESC",
    )
    .bind(year.to_string())
    .fetch_all(pool)
    .await?;

    let mut wb = Workbook::new();
    let ws = wb.add_worksheet();
    ws.set_name(&format!("Offerings {}", year))
        .map_err(|e| AppError { message: e.to_string(), code: "EXPORT".into() })?;

    write_headers(ws, &[
        "Date", "Service Type", "Category",
        "Amount (GHS)", "Currency", "Counted By",
    ])?;

    let rf  = row_fmt();
    let cf  = currency_fmt();
    let alt = alt_fmt();
    let acf = alt_currency_fmt();
    let bf  = bold_fmt();
    let bcf = bold_currency_fmt();

    let mut total = 0.0_f64;

    for (i, row) in rows.iter().enumerate() {
        let r   = (i + 1) as u32;
        let odd = i % 2 == 1;
        let (tf, cf_r) = if odd { (&alt, &acf) } else { (&rf, &cf) };

        ws.write_with_format(r, 0, &row.service_date,                        tf).ok();
        ws.write_with_format(r, 1, &row.service_type,                        tf).ok();
        ws.write_with_format(r, 2, &row.category,                            tf).ok();
        ws.write_with_format(r, 3, row.total_amount,                         cf_r).ok();
        ws.write_with_format(r, 4, &row.currency,                            tf).ok();
        ws.write_with_format(r, 5, row.counted_by.as_deref().unwrap_or("—"), tf).ok();

        total += row.total_amount;
    }

    let tr = (rows.len() + 1) as u32;
    ws.write_with_format(tr, 2, "TOTAL", &bf).ok();
    ws.write_with_format(tr, 3, total,   &bcf).ok();

    ws.autofit();
    save(&mut wb, &format!("offerings_{}.xlsx", year))
}

// ── Welfare ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn export_welfare_excel(year: i64) -> Result<String, AppError> {
    let pool = get_pool();

    #[derive(sqlx::FromRow)]
    struct Row {
        first_name:        String,
        last_name:         String,
        member_no:         String,
        amount:            f64,
        contribution_date: String,
        payment_mode:      String,
        reference_no:      Option<String>,
        received_by:       String,
    }

    let rows = sqlx::query_as::<_, Row>(
        "SELECT m.first_name, m.last_name, m.member_no,
                w.amount, w.contribution_date,
                w.payment_mode, w.reference_no, w.received_by
         FROM welfare_contributions w
         JOIN members m ON m.id = w.member_id
         WHERE strftime('%Y', w.contribution_date) = ?
         ORDER BY w.contribution_date DESC",
    )
    .bind(year.to_string())
    .fetch_all(pool)
    .await?;

    let mut wb = Workbook::new();
    let ws = wb.add_worksheet();
    ws.set_name(&format!("Welfare {}", year))
        .map_err(|e| AppError { message: e.to_string(), code: "EXPORT".into() })?;

    write_headers(ws, &[
        "Member", "Member No", "Amount (GHS)", "Date",
        "Payment Mode", "Reference", "Received By",
    ])?;

    let rf  = row_fmt();
    let cf  = currency_fmt();
    let alt = alt_fmt();
    let acf = alt_currency_fmt();
    let bf  = bold_fmt();
    let bcf = bold_currency_fmt();

    let mut total = 0.0_f64;

    for (i, row) in rows.iter().enumerate() {
        let r    = (i + 1) as u32;
        let odd  = i % 2 == 1;
        let name = format!("{} {}", row.first_name, row.last_name);
        let (tf, cf_r) = if odd { (&alt, &acf) } else { (&rf, &cf) };

        ws.write_with_format(r, 0, &name,                                      tf).ok();
        ws.write_with_format(r, 1, &row.member_no,                             tf).ok();
        ws.write_with_format(r, 2, row.amount,                                 cf_r).ok();
        ws.write_with_format(r, 3, &row.contribution_date,                     tf).ok();
        ws.write_with_format(r, 4, &row.payment_mode,                          tf).ok();
        ws.write_with_format(r, 5, row.reference_no.as_deref().unwrap_or("—"), tf).ok();
        ws.write_with_format(r, 6, &row.received_by,                           tf).ok();

        total += row.amount;
    }

    let tr = (rows.len() + 1) as u32;
    ws.write_with_format(tr, 1, "TOTAL", &bf).ok();
    ws.write_with_format(tr, 2, total,   &bcf).ok();

    ws.autofit();
    save(&mut wb, &format!("welfare_{}.xlsx", year))
}

// ── Export Summary ────────────────────────────────────────────────────────────

#[derive(serde::Serialize)]
pub struct ExportSummary {
    pub total_members:          i64,
    pub active_members:         i64,
    pub total_tithe_year:       f64,
    pub total_offerings_year:   f64,
    pub total_welfare_contrib:  f64,
    pub total_welfare_disbursed: f64,
    pub net_welfare_balance:    f64,
    pub tithe_20_pct:           f64,
    pub tithe_60_pct:           f64,
    pub tithe_20_balance:       f64,
}

#[tauri::command]
pub async fn get_export_summary(year: i64) -> Result<ExportSummary, crate::models::AppError> {
    let pool = get_pool();

    let members: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM members WHERE deleted_at IS NULL",
    )
    .fetch_one(pool)
    .await?;

    let active: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM members WHERE deleted_at IS NULL AND status = 'active'",
    )
    .fetch_one(pool)
    .await?;

    let tithe_year: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount), 0.0) FROM tithe_payments WHERE period_year = ?",
    )
    .bind(year)
    .fetch_one(pool)
    .await?;

    let offerings_year: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(total_amount), 0.0)
         FROM offerings WHERE strftime('%Y', service_date) = ?",
    )
    .bind(year.to_string())
    .fetch_one(pool)
    .await?;

    let welfare_contrib: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount), 0.0)
         FROM welfare_contributions
         WHERE strftime('%Y', contribution_date) = ?",
    )
    .bind(year.to_string())
    .fetch_one(pool)
    .await?;

    let welfare_disbursed: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount), 0.0)
         FROM welfare_disbursements
         WHERE status = 'approved'
           AND strftime('%Y', disbursement_date) = ?",
    )
    .bind(year.to_string())
    .fetch_one(pool)
    .await?;

    let t = tithe_year.0;

    Ok(ExportSummary {
        total_members:           members.0,
        active_members:          active.0,
        total_tithe_year:        t,
        total_offerings_year:    offerings_year.0,
        total_welfare_contrib:   welfare_contrib.0,
        total_welfare_disbursed: welfare_disbursed.0,
        net_welfare_balance:     welfare_contrib.0 - welfare_disbursed.0,
        tithe_20_pct:            t * 0.20,
        tithe_60_pct:            t * 0.60,
        tithe_20_balance:        t * 0.20,
    })
}