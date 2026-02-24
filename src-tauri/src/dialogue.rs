use serde::{Deserialize, Serialize};

use crate::memory;

#[derive(Serialize)]
struct ClaudeRequest {
    model: String,
    max_tokens: u32,
    system: String,
    messages: Vec<Message>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<Vec<serde_json::Value>>,
}

#[derive(Serialize, Deserialize, Clone)]
struct Message {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ClaudeResponse {
    content: Vec<ContentBlock>,
}

#[derive(Deserialize)]
struct ContentBlock {
    #[serde(rename = "type")]
    block_type: Option<String>,
    text: Option<String>,
}

#[derive(Deserialize, Debug)]
struct ClaudeErrorResponse {
    error: Option<ClaudeErrorDetail>,
}

#[derive(Deserialize, Debug)]
struct ClaudeErrorDetail {
    message: Option<String>,
}

fn build_system_prompt(mode: &str, app_name: &str, window_title: &str, facts: &[String]) -> String {
    let now = chrono::Local::now();
    let time_of_day = match now.format("%H").to_string().parse::<u32>().unwrap_or(12) {
        0..=5 => "late night",
        6..=11 => "morning",
        12..=16 => "afternoon",
        17..=20 => "evening",
        _ => "night",
    };

    let context = format!(
        "Current date and time: {} ({}). User is using: {} (window: \"{}\").",
        now.format("%A, %B %-d, %Y at %H:%M"),
        time_of_day,
        app_name,
        window_title
    );

    let no_actions = "Never narrate actions in asterisks like *stretches* or *yawns* or *purrs*. \
                      Just speak naturally as a cat would.";

    let facts_section = if !facts.is_empty() {
        let items: Vec<String> = facts
            .iter()
            .enumerate()
            .map(|(i, f)| format!("{}) {}", i + 1, f))
            .collect();
        format!(" Things you remember about your owner: {}", items.join(". "))
    } else {
        String::new()
    };

    match mode {
        "chat" => format!(
            "You are a cute cat desktop pet living on the user's screen. \
            You are chatting with your owner. Keep responses to 1-3 short sentences. \
            Be playful, curious, and cat-like. {} \
            Never use emojis. \
            If the user asks you to remember, note, or remind them of something, \
            extract the key info and include it as [NOTE: ...] in your response, \
            followed by a short confirmation. For example if they say \
            'remind me to call the dentist', respond like \
            'Got it, I will stick that up for you! [NOTE: Call the dentist]'. \
            If the user tells you something personal or worth remembering \
            (their name, preferences, important events), include \
            [REMEMBER: key fact] in your response. For example if they say \
            'My name is Jackson', respond like \
            'Nice to meet you, Jackson! [REMEMBER: Owner's name is Jackson]'.{} \
            Context: {}",
            no_actions, facts_section, context
        ),
        "judge" => format!(
            "You are a judgmental cat desktop pet. Roast and judge what the user is currently doing \
            based on their active application and window title. Be sassy, sarcastic, and funny \
            but not mean-spirited. Keep it to 1-2 sentences. {} Never use emojis. Context: {}",
            no_actions, context
        ),
        "search" => format!(
            "You are a cat desktop pet that can search the web. The user searched for something. \
            Use the web_search tool to find current, accurate information. \
            IMPORTANT: For time-sensitive queries (scores, weather, news), include today's date \
            ({}) in your search query. \
            CRITICAL: Your answer MUST be 1-2 short sentences only (under 150 characters). \
            Be direct - just state the answer. No hedging, no caveats, no suggestions to search elsewhere. \
            {} Never use emojis. Context: {}",
            now.format("%B %-d, %Y"), no_actions, context
        ),
        "journal" => format!(
            "You are a cat writing in your personal diary. Write a short diary entry (2-4 sentences) \
            about today. Be introspective, cat-like, and reference the events provided. \
            Write in first person as a cat. {} Never use emojis. Context: {}",
            no_actions, context
        ),
        "achievement" => format!(
            "You are a cute cat desktop pet. Your owner just unlocked an achievement or trophy. \
            React with a short excited comment (1 sentence, under 60 characters). \
            Be proud and cat-like. {} Never use emojis.", no_actions
        ),
        _ => format!(
            "You are a cute cat desktop pet living on the user's screen. \
            Keep responses to 1-2 very short sentences (under 80 characters total). \
            Be playful, curious, and cat-like. {} \
            Never use emojis. React to what the user is doing based on the context. \
            Context: {}",
            no_actions, context
        ),
    }
}

fn build_user_message(mode: &str, trigger: &str, user_input: &str) -> String {
    match mode {
        "chat" => format!("Your owner says: \"{}\"", user_input),
        "judge" => format!(
            "Judge what I'm doing right now. Trigger: {}",
            trigger
        ),
        "search" => {
            let today = chrono::Local::now().format("%B %-d, %Y").to_string();
            format!("Today is {}. I searched for: {}", today, user_input)
        }
        "journal" => format!("Write a diary entry about today. Here are the events: {}", trigger),
        "achievement" => format!("React to unlocking this achievement: {}", trigger),
        _ => format!("Say something as a cat desktop pet. Trigger: {}", trigger),
    }
}

/// Extract all [REMEMBER: ...] tags from text, returning (cleaned_text, facts)
fn extract_remember_tags(text: &str) -> (String, Vec<String>) {
    let mut facts = Vec::new();
    let re = regex::Regex::new(r"\[REMEMBER:\s*(.+?)\]").unwrap();
    for cap in re.captures_iter(text) {
        facts.push(cap[1].trim().to_string());
    }
    let cleaned = re.replace_all(text, "").to_string();
    let cleaned = cleaned.trim().to_string();
    (cleaned, facts)
}

#[tauri::command]
pub async fn generate_pet_dialogue(
    app: tauri::AppHandle,
    app_name: String,
    window_title: String,
    trigger: String,
    mode: Option<String>,
    user_input: Option<String>,
) -> Result<String, String> {
    let api_key = std::env::var("ANTHROPIC_API_KEY")
        .map_err(|_| "ANTHROPIC_API_KEY not set".to_string())?;

    let mode = mode.unwrap_or_else(|| "spontaneous".to_string());
    let user_input = user_input.unwrap_or_default();

    let is_chat = mode == "chat";

    // Load memory for chat mode
    let chat_memory = if is_chat {
        Some(memory::load_memory(&app))
    } else {
        None
    };

    let facts = chat_memory
        .as_ref()
        .map(|m| m.facts.as_slice())
        .unwrap_or(&[]);

    let system_prompt = build_system_prompt(&mode, &app_name, &window_title, facts);
    let user_message = build_user_message(&mode, &trigger, &user_input);

    let max_tokens = match mode.as_str() {
        "search" => 256,
        "journal" => 200,
        "chat" => 150,
        _ => 100,
    };

    // Add web_search tool for search mode
    let tools = if mode == "search" {
        Some(vec![serde_json::json!({
            "type": "web_search_20250305",
            "name": "web_search",
            "max_uses": 3
        })])
    } else {
        None
    };

    // Build messages array: include history for chat mode
    let mut messages: Vec<Message> = Vec::new();
    if let Some(ref mem) = chat_memory {
        for msg in &mem.messages {
            messages.push(Message {
                role: msg.role.clone(),
                content: msg.content.clone(),
            });
        }
    }
    messages.push(Message {
        role: "user".to_string(),
        content: user_message.clone(),
    });

    let request = ClaudeRequest {
        model: "claude-haiku-4-5-20251001".to_string(),
        max_tokens,
        system: system_prompt,
        messages,
        tools,
    };

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        let error_msg = serde_json::from_str::<ClaudeErrorResponse>(&body)
            .ok()
            .and_then(|e| e.error)
            .and_then(|e| e.message)
            .unwrap_or_else(|| format!("API error: {}", status));
        return Err(error_msg);
    }

    let claude_response: ClaudeResponse =
        serde_json::from_str(&body).map_err(|e| format!("Failed to parse response: {}", e))?;

    // Web search responses split the answer across multiple text blocks with citations
    // in between. Find all text blocks after the last search result and concatenate them.
    let last_search_idx = claude_response
        .content
        .iter()
        .rposition(|block| block.block_type.as_deref() == Some("web_search_tool_result"));

    let start = last_search_idx.map(|i| i + 1).unwrap_or(0);

    let answer: String = claude_response
        .content
        .iter()
        .skip(start)
        .filter(|block| block.block_type.as_deref() == Some("text"))
        .filter_map(|block| block.text.as_deref())
        .collect();

    let answer = answer.trim().trim_start_matches(['.', ',', ';', ':']).trim().to_string();
    if answer.is_empty() {
        return Err("Empty response from Claude".to_string());
    }

    // For chat mode: extract [REMEMBER:] tags and save to memory
    if is_chat {
        let (cleaned, new_facts) = extract_remember_tags(&answer);
        let mut mem = chat_memory.unwrap_or_default();
        for fact in &new_facts {
            memory::add_fact(&mut mem, fact);
        }
        memory::add_exchange(&mut mem, &user_input, &cleaned);
        memory::save_memory(&app, &mem);
        return Ok(cleaned);
    }

    Ok(answer)
}
