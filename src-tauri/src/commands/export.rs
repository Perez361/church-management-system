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

fn header_fmt() -> Format {
    Format::new()
        .set_bold()
        .set_background_color(Color::RGB(0x1C1828))
        .set_font_color(Color::RGB(0xC9A84C))
}

fn currency_fmt() -> Format {
    Format::new().set_num_format("\"GHS \"#,##0.00")
}

fn alt_fmt() -> Format {
    Format::new().set_background_color(Color::RGB(0x211D30))
}

fn alt_currency_fmt() -> Format {
    Format::new()
        .set_background_color(Color::RGB(0x211D30))
        .set_num_format("\"GHS \"#,##0.00")
}

fn bold_fmt() -> Format {
    Format::new().set_bold()
}

fn bold_currency_fmt() -> Format {
    Format::new()
        .set_bold()
        .set_num_format("\"GHS \"#,##0.00")
}

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

    let dept_label = |d: Option<&str>| match d {
        Some("choir")         => "Choir",
        Some("ushers")        => "Ushers",
        Some("youth")         => "Youth",
        Some("elders")        => "Elders",
        Some("sunday_school") => "Sunday School",
        Some(other)           => other,
        None                  => "—",
    };

    let alt = alt_fmt();

    for (i, row) in rows.iter().enumerate() {
        let r   = (i + 1) as u32;
        let odd = i % 2 == 1;

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
            if odd {
                ws.write_with_format(r, c as u16, *val, &alt).ok();
            } else {
                ws.write(r, c as u16, *val).ok();
            }
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
        "Member", "Member No", "Amount (GHS)", "Payment Date",
        "Period Month", "Payment Mode", "Reference", "Received By",
    ])?;

    let cf  = currency_fmt();
    let alt = alt_fmt();
    let acf = alt_currency_fmt();
    let bf  = bold_fmt();
    let bcf = bold_currency_fmt();

    let month_names = [
        "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    let mut total = 0.0_f64;

    for (i, row) in rows.iter().enumerate() {
        let r   = (i + 1) as u32;
        let odd = i % 2 == 1;
        let name  = format!("{} {}", row.first_name, row.last_name);
        let month = month_names
            .get(row.period_month as usize)
            .copied()
            .unwrap_or("?");

        if odd {
            ws.write_with_format(r, 0, &name,                                    &alt).ok();
            ws.write_with_format(r, 1, &row.member_no,                           &alt).ok();
            ws.write_with_format(r, 2, row.amount,                               &acf).ok();
            ws.write_with_format(r, 3, &row.payment_date,                        &alt).ok();
            ws.write_with_format(r, 4, month,                                    &alt).ok();
            ws.write_with_format(r, 5, &row.payment_mode,                        &alt).ok();
            ws.write_with_format(r, 6, row.reference_no.as_deref().unwrap_or("—"), &alt).ok();
            ws.write_with_format(r, 7, &row.received_by,                         &alt).ok();
        } else {
            ws.write(r, 0, &name).ok();
            ws.write(r, 1, &row.member_no).ok();
            ws.write_with_format(r, 2, row.amount, &cf).ok();
            ws.write(r, 3, &row.payment_date).ok();
            ws.write(r, 4, month).ok();
            ws.write(r, 5, &row.payment_mode).ok();
            ws.write(r, 6, row.reference_no.as_deref().unwrap_or("—")).ok();
            ws.write(r, 7, &row.received_by).ok();
        }

        total += row.amount;
    }

    // Totals row
    let tr = (rows.len() + 1) as u32;
    ws.write_with_format(tr, 1, "TOTAL", &bf).ok();
    ws.write_with_format(tr, 2, total,   &bcf).ok();

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

    let cf  = currency_fmt();
    let alt = alt_fmt();
    let acf = alt_currency_fmt();
    let bf  = bold_fmt();
    let bcf = bold_currency_fmt();

    let mut total = 0.0_f64;

    for (i, row) in rows.iter().enumerate() {
        let r   = (i + 1) as u32;
        let odd = i % 2 == 1;

        if odd {
            ws.write_with_format(r, 0, &row.service_date,                         &alt).ok();
            ws.write_with_format(r, 1, &row.service_type,                         &alt).ok();
            ws.write_with_format(r, 2, &row.category,                             &alt).ok();
            ws.write_with_format(r, 3, row.total_amount,                          &acf).ok();
            ws.write_with_format(r, 4, &row.currency,                             &alt).ok();
            ws.write_with_format(r, 5, row.counted_by.as_deref().unwrap_or("—"), &alt).ok();
        } else {
            ws.write(r, 0, &row.service_date).ok();
            ws.write(r, 1, &row.service_type).ok();
            ws.write(r, 2, &row.category).ok();
            ws.write_with_format(r, 3, row.total_amount, &cf).ok();
            ws.write(r, 4, &row.currency).ok();
            ws.write(r, 5, row.counted_by.as_deref().unwrap_or("—")).ok();
        }

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

        if odd {
            ws.write_with_format(r, 0, &name,                                     &alt).ok();
            ws.write_with_format(r, 1, &row.member_no,                            &alt).ok();
            ws.write_with_format(r, 2, row.amount,                                &acf).ok();
            ws.write_with_format(r, 3, &row.contribution_date,                    &alt).ok();
            ws.write_with_format(r, 4, &row.payment_mode,                         &alt).ok();
            ws.write_with_format(r, 5, row.reference_no.as_deref().unwrap_or("—"), &alt).ok();
            ws.write_with_format(r, 6, &row.received_by,                          &alt).ok();
        } else {
            ws.write(r, 0, &name).ok();
            ws.write(r, 1, &row.member_no).ok();
            ws.write_with_format(r, 2, row.amount, &cf).ok();
            ws.write(r, 3, &row.contribution_date).ok();
            ws.write(r, 4, &row.payment_mode).ok();
            ws.write(r, 5, row.reference_no.as_deref().unwrap_or("—")).ok();
            ws.write(r, 6, &row.received_by).ok();
        }

        total += row.amount;
    }

    let tr = (rows.len() + 1) as u32;
    ws.write_with_format(tr, 1, "TOTAL", &bf).ok();
    ws.write_with_format(tr, 2, total,   &bcf).ok();

    ws.autofit();
    save(&mut wb, &format!("welfare_{}.xlsx", year))
}