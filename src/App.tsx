import { useState, useCallback, useEffect, useRef } from "react";
import Pet from "./components/Pet";
import SpeechBubble from "./components/SpeechBubble";
import RadialMenu, { MenuAction } from "./components/RadialMenu";
import ChatInput from "./components/ChatInput";
import SettingsPanel from "./components/SettingsPanel";
import JournalPanel from "./components/JournalPanel";
import AchievementsPanel from "./components/AchievementsPanel";
import AchievementToast from "./components/AchievementToast";
import { usePetMovement } from "./hooks/usePetMovement";
import { useActiveWindow } from "./hooks/useActiveWindow";
import { useDialogue } from "./hooks/useDialogue";
import { useCursorPassthrough } from "./hooks/useCursorPassthrough";
import { useTheme } from "./hooks/useTheme";
import { useAmbientMusic } from "./hooks/useAmbientMusic";
import { useEventTracker } from "./hooks/useEventTracker";
import { useAchievements } from "./hooks/useAchievements";
import { useJournal } from "./hooks/useJournal";

type InputMode = "chat" | "search" | null;

export default function App() {
  const {
    position, state, facingLeft, dragging,
    setState, setPosition, setDragging,
    goHome, leaveHome, nap, wake,
  } = usePetMovement();
  const { appName, windowTitle, appChanged } = useActiveWindow();
  const { text, visible, hiding, loading, generate, dismiss } = useDialogue(
    appName,
    windowTitle,
    appChanged,
  );
  const { breed, color, currentTheme, customThemes, selectBreed, selectColor, addCustomTheme, removeCustomTheme } =
    useTheme();
  const { playing: musicPlaying, toggle: toggleMusic } = useAmbientMusic();
  const { data: eventData, trackEvent } = useEventTracker();
  const { achievements, unlocked, newlyUnlocked, dismissToast, manualUnlock } = useAchievements(eventData);
  const { entries, generateToday, todayGenerated, loading: journalLoading } = useJournal(eventData);

  const [menuOpen, setMenuOpen] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);

  const overlayOpen = menuOpen || inputMode !== null || dragging || settingsOpen || journalOpen || achievementsOpen;

  useCursorPassthrough({
    petX: position.x,
    petY: position.y,
    overlayOpen,
  });

  // Generate pet comment on achievement unlock
  const lastToastRef = useRef<string | null>(null);
  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      const latest = newlyUnlocked[0];
      const key = `${latest.id}-${latest.tier || ""}`;
      if (lastToastRef.current !== key) {
        lastToastRef.current = key;
        generate("achievement", `${latest.name}${latest.tier ? ` (${latest.tier})` : ""}`);
      }
    }
  }, [newlyUnlocked, generate]);

  const handleDragStart = useCallback(() => {
    setDragging(true);
    setMenuOpen(false);
    setInputMode(null);
    dismiss();
    if (state === "walking") setState("idle");
  }, [setDragging, dismiss, state, setState]);

  const handleDrag = useCallback((mx: number, my: number) => {
    setPosition({ x: mx, y: my });
  }, [setPosition]);

  const handleDragEnd = useCallback(() => {
    setDragging(false);
    trackEvent("petDrag");
  }, [setDragging, trackEvent]);

  const handlePetClick = useCallback(() => {
    if (settingsOpen || journalOpen || achievementsOpen) return;
    trackEvent("petClick");
    if (state === "napping") {
      wake();
      trackEvent("wake");
      generate("chat", "cat was woken up from a nap");
      return;
    }
    if (state === "home") {
      leaveHome();
      dismiss();
      return;
    }
    if (visible && !menuOpen) dismiss();
    setMenuOpen((prev) => !prev);
    setInputMode(null);
  }, [state, wake, leaveHome, generate, dismiss, visible, menuOpen, settingsOpen, journalOpen, achievementsOpen, trackEvent]);

  const handleMenuSelect = useCallback(
    (action: MenuAction) => {
      setMenuOpen(false);
      switch (action) {
        case "chat":
          trackEvent("menuOpen", "chat");
          setInputMode("chat");
          break;
        case "search":
          trackEvent("menuOpen", "search");
          setInputMode("search");
          break;
        case "music":
          toggleMusic();
          setState("talking");
          trackEvent("music", musicPlaying ? "stop" : "start");
          // Check lullaby achievement: start music while napping
          if (!musicPlaying && state === "napping") {
            manualUnlock("lullaby");
          }
          generate(
            "music",
            musicPlaying
              ? "user stopped the ambient music"
              : "user started playing ambient music",
          );
          setTimeout(() => setState("idle"), 3000);
          break;
        case "nap":
          nap();
          trackEvent("nap");
          dismiss();
          break;
        case "home":
          goHome();
          trackEvent("home");
          dismiss();
          break;
        case "settings":
          trackEvent("settings");
          setSettingsOpen(true);
          break;
        case "journal":
          trackEvent("journal");
          setJournalOpen(true);
          break;
        case "achievements":
          trackEvent("achievements");
          setAchievementsOpen(true);
          break;
      }
    },
    [setState, generate, nap, goHome, dismiss, toggleMusic, musicPlaying, trackEvent, manualUnlock, state],
  );

  const handleChatSubmit = useCallback(
    (userText: string) => {
      const mode = inputMode ?? "chat";
      setInputMode(null);
      setState("talking");
      if (mode === "chat") {
        trackEvent("chat");
      } else if (mode === "search") {
        trackEvent("search", userText);
      }
      generate(mode, `user ${mode === "search" ? "searched for" : "said"}: ${userText}`, userText);
      setTimeout(() => setState("idle"), 3000);
    },
    [inputMode, setState, generate, trackEvent],
  );

  const handleThemeImport = useCallback(
    (name: string, idle: string, walk: string, sleep: string) => {
      addCustomTheme(name, idle, walk, sleep);
      trackEvent("themeImport");
    },
    [addCustomTheme, trackEvent],
  );

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Pet
        x={position.x}
        y={position.y}
        state={state}
        facingLeft={facingLeft}
        theme={currentTheme}
        onClick={handlePetClick}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      />

      {visible && !menuOpen && !inputMode && !settingsOpen && !journalOpen && !achievementsOpen && (
        <SpeechBubble
          text={loading ? "..." : text}
          x={position.x}
          y={position.y}
          hiding={hiding}
        />
      )}

      {menuOpen && (
        <RadialMenu
          x={position.x}
          y={position.y}
          musicPlaying={musicPlaying}
          onSelect={handleMenuSelect}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {inputMode && (
        <ChatInput
          x={position.x}
          y={position.y}
          mode={inputMode}
          onSubmit={handleChatSubmit}
          onClose={() => setInputMode(null)}
        />
      )}

      {settingsOpen && (
        <SettingsPanel
          currentBreed={breed}
          currentColor={color}
          customThemes={customThemes}
          onSelectBreed={selectBreed}
          onSelectColor={selectColor}
          onImport={handleThemeImport}
          onDelete={removeCustomTheme}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {journalOpen && (
        <JournalPanel
          entries={entries}
          loading={journalLoading}
          todayGenerated={todayGenerated}
          onGenerateToday={generateToday}
          onOpen={() => manualUnlock("diary_reader")}
          onClose={() => setJournalOpen(false)}
        />
      )}

      {achievementsOpen && (
        <AchievementsPanel
          achievements={achievements}
          unlocked={unlocked}
          eventData={eventData}
          onOpen={() => manualUnlock("trophy_hunter")}
          onClose={() => setAchievementsOpen(false)}
        />
      )}

      {newlyUnlocked.length > 0 && (
        <AchievementToast
          unlock={newlyUnlocked[0]}
          petX={position.x}
          petY={position.y}
          onDismiss={dismissToast}
        />
      )}
    </div>
  );
}
