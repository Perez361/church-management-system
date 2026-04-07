fn main() {
    // Read .env and bake SUPABASE_* values in as compile-time constants
    let env_path = std::path::Path::new(".env");
    if env_path.exists() {
        let content = std::fs::read_to_string(env_path).unwrap_or_default();
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some((key, val)) = line.split_once('=') {
                let key = key.trim();
                let val = val.trim().trim_matches('"');
                if key.starts_with("SUPABASE_") {
                    println!("cargo:rustc-env={}={}", key, val);
                }
            }
        }
    }
    // Re-run build whenever .env changes
    println!("cargo:rerun-if-changed=.env");
    tauri_build::build()
}