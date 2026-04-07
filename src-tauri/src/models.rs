use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct Member {
    pub id: String,
    pub member_no: String,
    pub first_name: String,
    pub last_name: String,
    pub date_of_birth: Option<String>,
    pub gender: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub department_id: Option<String>,
    pub membership_date: String,
    pub status: String,
    pub photo_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
    pub synced_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMemberInput {
    pub first_name: String,
    pub last_name: String,
    pub date_of_birth: Option<String>,
    pub gender: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub department_id: Option<String>,
    pub membership_date: String,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateMemberInput {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub date_of_birth: Option<String>,
    pub gender: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub department_id: Option<String>,
    pub membership_date: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct TithePayment {
    pub id: String,
    pub member_id: String,
    pub amount: f64,
    pub payment_date: String,
    pub period_month: i64,
    pub period_year: i64,
    pub payment_mode: String,
    pub reference_no: Option<String>,
    pub received_by: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub synced_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTitheInput {
    pub member_id: String,
    pub amount: f64,
    pub payment_date: String,
    pub period_month: i64,
    pub period_year: i64,
    pub payment_mode: String,
    pub reference_no: Option<String>,
    pub received_by: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct Offering {
    pub id: String,
    pub service_date: String,
    pub service_type: String,
    pub category: String,
    pub total_amount: f64,
    pub currency: String,
    pub notes: Option<String>,
    pub counted_by: Option<String>,
    pub created_at: String,
    pub synced_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateOfferingInput {
    pub service_date: String,
    pub service_type: String,
    pub category: String,
    pub total_amount: f64,
    pub currency: Option<String>,
    pub notes: Option<String>,
    pub counted_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct WelfareContribution {
    pub id: String,
    pub member_id: String,
    pub amount: f64,
    pub contribution_date: String,
    pub payment_mode: String,
    pub reference_no: Option<String>,
    pub received_by: String,
    pub created_at: String,
    pub synced_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateWelfareInput {
    pub member_id: String,
    pub amount: f64,
    pub contribution_date: String,
    pub payment_mode: String,
    pub reference_no: Option<String>,
    pub received_by: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct WelfareDisbursement {
    pub id: String,
    pub beneficiary_id: String,
    pub amount: f64,
    pub reason: String,
    pub disbursement_date: String,
    pub approved_by: String,
    pub status: String,
    pub created_at: String,
    pub synced_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDisbursementInput {
    pub beneficiary_id: String,
    pub amount: f64,
    pub reason: String,
    pub disbursement_date: String,
    pub approved_by: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_members: i64,
    pub active_members: i64,
    pub tithe_this_month: f64,
    pub offerings_this_month: f64,
    pub welfare_balance: f64,
    pub welfare_disbursed_month: f64,
    pub tithe_payers_month: i64,
    pub welfare_contributors_month: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MemberSummary {
    pub id: String,
    pub member_no: String,
    pub first_name: String,
    pub last_name: String,
    pub gender: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub department_id: Option<String>,
    pub membership_date: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncQueueItem {
    pub id: i64,
    pub table_name: String,
    pub record_id: String,
    pub operation: String,
    pub payload: String,
    pub status: String,
    pub retry_count: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppError {
    pub message: String,
    pub code: String,
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        AppError {
            message: e.to_string(),
            code: "DB_ERROR".into(),
        }
    }
}

impl From<String> for AppError {
    fn from(s: String) -> Self {
        AppError { message: s, code: "ERROR".into() }
    }
}