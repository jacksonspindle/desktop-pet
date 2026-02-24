import type { MenuAction } from "../components/RadialMenu";

export interface Command {
  id: MenuAction | "chat-inline" | "search-inline";
  label: string;
  icon: string;
  keywords: string[];
  hint?: string;
  takesArgument?: boolean;
}

export const commands: Command[] = [
  { id: "chat", label: "Chat", icon: "💬", keywords: ["talk", "say", "message"], hint: "chat <message>", takesArgument: true },
  { id: "search", label: "Search", icon: "🔍", keywords: ["find", "look", "query", "ask"], hint: "search <query>", takesArgument: true },
  { id: "music", label: "Play Music", icon: "🎵", keywords: ["song", "audio", "sound", "mute", "stop"] },
  { id: "nap", label: "Nap", icon: "😴", keywords: ["sleep", "rest", "zzz"] },
  { id: "home", label: "Go Home", icon: "🏠", keywords: ["house", "return", "bed"] },
  { id: "settings", label: "Settings", icon: "⚙️", keywords: ["config", "preferences", "options", "theme"] },
  { id: "journal", label: "Journal", icon: "📓", keywords: ["diary", "log", "entries"] },
  { id: "achievements", label: "Achievements", icon: "🏆", keywords: ["trophies", "badges", "awards", "unlocks"] },
  { id: "friends", label: "Friends", icon: "👋", keywords: ["social", "visit", "hangout", "pets"] },
  { id: "notes", label: "Notes", icon: "📝", keywords: ["sticky", "memo", "write", "reminder"] },
];
