use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

const MAX_MESSAGE_PAIRS: usize = 20;
const MAX_FACTS: usize = 50;
const MEMORY_FILE: &str = "chat_memory.json";

#[derive(Serialize, Deserialize, Clone)]
pub struct MemoryMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Default)]
pub struct ChatMemory {
    pub messages: Vec<MemoryMessage>,
    pub facts: Vec<String>,
}

fn memory_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;
    Ok(dir.join(MEMORY_FILE))
}

pub fn load_memory(app: &tauri::AppHandle) -> ChatMemory {
    let path = match memory_path(app) {
        Ok(p) => p,
        Err(_) => return ChatMemory::default(),
    };
    match fs::read_to_string(&path) {
        Ok(data) => serde_json::from_str(&data).unwrap_or_default(),
        Err(_) => ChatMemory::default(),
    }
}

pub fn save_memory(app: &tauri::AppHandle, memory: &ChatMemory) {
    let path = match memory_path(app) {
        Ok(p) => p,
        Err(_) => return,
    };
    if let Ok(json) = serde_json::to_string_pretty(memory) {
        let _ = fs::write(path, json);
    }
}

pub fn add_exchange(memory: &mut ChatMemory, user_msg: &str, assistant_msg: &str) {
    memory.messages.push(MemoryMessage {
        role: "user".to_string(),
        content: user_msg.to_string(),
    });
    memory.messages.push(MemoryMessage {
        role: "assistant".to_string(),
        content: assistant_msg.to_string(),
    });
    // Trim to max pairs (each pair = 2 messages)
    let max_messages = MAX_MESSAGE_PAIRS * 2;
    if memory.messages.len() > max_messages {
        let excess = memory.messages.len() - max_messages;
        memory.messages.drain(..excess);
    }
}

pub fn add_fact(memory: &mut ChatMemory, fact: &str) {
    // Don't add duplicate facts
    if memory.facts.iter().any(|f| f == fact) {
        return;
    }
    memory.facts.push(fact.to_string());
    if memory.facts.len() > MAX_FACTS {
        memory.facts.remove(0);
    }
}

#[tauri::command]
pub fn clear_chat_memory(app: tauri::AppHandle) -> Result<(), String> {
    let path = memory_path(&app)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete memory: {}", e))?;
    }
    Ok(())
}

#[derive(Serialize)]
pub struct MemoryStats {
    #[serde(rename = "messageCount")]
    pub message_count: usize,
    #[serde(rename = "factCount")]
    pub fact_count: usize,
}

#[tauri::command]
pub fn get_memory_stats(app: tauri::AppHandle) -> MemoryStats {
    let memory = load_memory(&app);
    MemoryStats {
        message_count: memory.messages.len() / 2, // pairs
        fact_count: memory.facts.len(),
    }
}
