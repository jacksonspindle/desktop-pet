import { useState, useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import Pet from "./components/Pet";
import SpeechBubble from "./components/SpeechBubble";
import RadialMenu, { MenuAction } from "./components/RadialMenu";
import CommandPalette from "./components/CommandPalette";
import SettingsPanel from "./components/SettingsPanel";
import JournalPanel from "./components/JournalPanel";
import AchievementsPanel from "./components/AchievementsPanel";
import AchievementToast from "./components/AchievementToast";
import FriendsPanel from "./components/FriendsPanel";
import VisitingPet from "./components/VisitingPet";
import StickyNoteComponent from "./components/StickyNote";
import NotesPanel from "./components/NotesPanel";
import MoreMenu from "./components/MoreMenu";
import SnackPanel, { Snack } from "./components/SnackPanel";
import FeedAnimation from "./components/FeedAnimation";
import TimerPanel from "./components/TimerPanel";
import TimerBubble from "./components/TimerBubble";
import HungerBar from "./components/HungerBar";
import { usePetMovement } from "./hooks/usePetMovement";
import { useActiveWindow } from "./hooks/useActiveWindow";
import { useDialogue } from "./hooks/useDialogue";
import { useCursorPassthrough } from "./hooks/useCursorPassthrough";
import { useTheme } from "./hooks/useTheme";
import { useAmbientMusic } from "./hooks/useAmbientMusic";
import { useEventTracker } from "./hooks/useEventTracker";
import { useAchievements } from "./hooks/useAchievements";
import { useJournal } from "./hooks/useJournal";
import { useFriends } from "./hooks/useFriends";
import { useNotes } from "./hooks/useNotes";
import { useTimer } from "./hooks/useTimer";
import { useHunger, HungerLevel } from "./hooks/useHunger";

const DEFAULT_SHORTCUT = "CommandOrControl+Shift+Space";

export default function App() {
  const {
    position, state, facingLeft, dragging,
    setState, setPosition, setDragging,
    goHome, leaveHome, nap, wake,
  } = usePetMovement();
  const { appName, windowTitle, appChanged } = useActiveWindow();
  const { notes, notesVisible, addNote, deleteNote, updateNotePosition, toggleNotesVisible } = useNotes();
  const timer = useTimer({
    onComplete: (timerLabel) => {
      trackEvent("timer", timerLabel);
      generate("chat", `timer finished: ${timerLabel}`);
    },
  });
  const { text, visible, hiding, loading, generate, dismiss } = useDialogue(
    appName,
    windowTitle,
    appChanged,
    addNote,
  );
  const lastHungerCommentRef = useRef(0);
  const HUNGER_SEVERITY: Record<HungerLevel, number> = { full: 0, peckish: 1, hungry: 2, starving: 3 };
  const hunger = useHunger({
    onLevelChange: (level, prevLevel) => {
      // Only comment when hunger worsens
      if (HUNGER_SEVERITY[level] <= HUNGER_SEVERITY[prevLevel]) return;
      if (level !== "hungry" && level !== "starving") return;
      const now = Date.now();
      if (now - lastHungerCommentRef.current < 3 * 60 * 1000) return;
      lastHungerCommentRef.current = now;
      generate("hungry", level === "starving" ? "starving" : "getting hungry");
    },
  });

  const { breed, color, currentTheme, customThemes, selectBreed, selectColor, addCustomTheme, removeCustomTheme } =
    useTheme();
  const { playing: musicPlaying, toggle: toggleMusic } = useAmbientMusic();
  const { data: eventData, trackEvent } = useEventTracker();
  const { achievements, unlocked, newlyUnlocked, dismissToast, manualUnlock } = useAchievements(eventData);
  const { entries, generateToday, todayGenerated, loading: journalLoading } = useJournal(eventData);
  const {
    myPetCode, myPetName, registered, registering, friends, loadingFriends, connected,
    register: registerPet, addFriend, acceptFriend, removeFriend, sendVisit, startHangout, setMyPetName, currentVisit, dismissVisit,
  } = useFriends(breed, color);

  const [shortcut, setShortcut] = useState(() =>
    localStorage.getItem("chat-shortcut") || DEFAULT_SHORTCUT
  );
  const handleChangeShortcut = useCallback((s: string) => {
    setShortcut(s);
    localStorage.setItem("chat-shortcut", s);
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [feedingSnack, setFeedingSnack] = useState<{ snack: Snack; startX: number; startY: number; skipFly?: boolean } | null>(null);
  const [draggingSnack, setDraggingSnack] = useState<{ snack: Snack; x: number; y: number } | null>(null);
  const [petExtraStyle, setPetExtraStyle] = useState<React.CSSProperties>({});
  const [visitorPos, setVisitorPos] = useState<{ x: number; y: number } | null>(null);
  const [visitorOverlay, setVisitorOverlay] = useState(false);
  const [notePositions, setNotePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  const positionRef = useRef(position);
  positionRef.current = position;

  // Pulse pet when dragging snack is near
  const nearPet = draggingSnack
    ? Math.hypot(draggingSnack.x - position.x, draggingSnack.y - position.y) < 60
    : false;
  useEffect(() => {
    if (nearPet) {
      setPetExtraStyle({ animation: "feed-drag-pulse 0.8s ease-in-out infinite", transition: "none" });
    } else if (draggingSnack) {
      setPetExtraStyle({});
    }
  }, [nearPet, draggingSnack]);

  const overlayOpen = menuOpen || paletteOpen || dragging || settingsOpen || journalOpen || achievementsOpen || friendsOpen || notesOpen || moreOpen || timerOpen || feedOpen || !!draggingSnack || visitorOverlay;

  const extraHitZones = [
    ...(visitorPos ? [visitorPos] : []),
    ...(notesVisible ? notes.map((n) => {
      const pos = notePositions.get(n.id);
      // Center of the note (180px wide, ~80px tall) with generous hit zone
      return { x: (pos?.x ?? n.x) + 90, y: (pos?.y ?? n.y) + 40, w: 200, h: 100 };
    }) : []),
    ...(timer.running ? [{ x: position.x - 50, y: position.y - 60, w: 80, h: 30 }] : []),
    { x: position.x - 26, y: position.y + 33, w: 52, h: 6 },
  ];

  useCursorPassthrough({
    petX: position.x,
    petY: position.y,
    overlayOpen,
    extraHitZones: extraHitZones.length > 0 ? extraHitZones : undefined,
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

  // Comment on hunger if loaded already hungry/starving
  const hungerMountRef = useRef(false);
  useEffect(() => {
    if (hungerMountRef.current) return;
    hungerMountRef.current = true;
    if (hunger.hungerLevel === "hungry" || hunger.hungerLevel === "starving") {
      const timeout = setTimeout(() => {
        lastHungerCommentRef.current = Date.now();
        generate("hungry", hunger.hungerLevel === "starving" ? "starving" : "getting hungry");
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Global shortcut to toggle command palette (user-configurable)
  const paletteOpenRef = useRef(paletteOpen);
  paletteOpenRef.current = paletteOpen;
  useEffect(() => {
    register(shortcut, (e) => {
      if (e.state !== "Pressed") return;
      if (paletteOpenRef.current) {
        setPaletteOpen(false);
      } else {
        setMenuOpen(false);
        setSettingsOpen(false);
        setJournalOpen(false);
        setAchievementsOpen(false);
        setFriendsOpen(false);
        setNotesOpen(false);
        setMoreOpen(false);
        setTimerOpen(false);
        setFeedOpen(false);
        setPaletteOpen(true);
        trackEvent("menuOpen", "palette");
      }
    });
    return () => { unregister(shortcut); };
  }, [shortcut, trackEvent]);

  const handleDragStart = useCallback(() => {
    setDragging(true);
    setMenuOpen(false);
    setPaletteOpen(false);
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
    if (settingsOpen || journalOpen || achievementsOpen || friendsOpen || notesOpen || moreOpen || timerOpen || feedOpen) return;
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
    setPaletteOpen(false);
  }, [state, wake, leaveHome, generate, dismiss, visible, menuOpen, settingsOpen, journalOpen, achievementsOpen, friendsOpen, notesOpen, moreOpen, timerOpen, feedOpen, trackEvent]);

  const handleMenuSelect = useCallback(
    (action: MenuAction) => {
      setMenuOpen(false);
      switch (action) {
        case "chat":
          trackEvent("menuOpen", "chat");
          setPaletteOpen(true);
          break;
        case "search":
          trackEvent("menuOpen", "search");
          setPaletteOpen(true);
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
        case "friends":
          trackEvent("friends");
          setFriendsOpen(true);
          break;
        case "notes":
          trackEvent("notes");
          setNotesOpen(true);
          break;
        case "feed":
          trackEvent("feed");
          setFeedOpen(true);
          break;
        case "timer":
          trackEvent("timer");
          setTimerOpen(true);
          break;
      }
    },
    [setState, generate, nap, goHome, dismiss, toggleMusic, musicPlaying, trackEvent, manualUnlock, state],
  );

  const handlePaletteChat = useCallback(
    (userText: string) => {
      setPaletteOpen(false);
      setState("talking");
      trackEvent("chat");
      generate("chat", `user said: ${userText}`, userText);
      setTimeout(() => setState("idle"), 3000);
    },
    [setState, generate, trackEvent],
  );

  const handlePaletteSearch = useCallback(
    (query: string) => {
      setPaletteOpen(false);
      setState("talking");
      trackEvent("search", query);
      generate("search", `user searched for: ${query}`, query);
      setTimeout(() => setState("idle"), 3000);
    },
    [setState, generate, trackEvent],
  );

  const handleVisitorChat = useCallback(
    (message: string) => {
      if (currentVisit) {
        sendVisit(currentVisit.fromPetId, message);
      }
    },
    [currentVisit, sendVisit],
  );

  const handleClearMemory = useCallback(() => {
    invoke("clear_chat_memory");
  }, []);

  const handleSnackGrab = useCallback(
    (snack: Snack, e: React.MouseEvent) => {
      const startX = e.clientX;
      const startY = e.clientY;
      let isDragging = false;

      const onMouseMove = (me: MouseEvent) => {
        const dx = me.clientX - startX;
        const dy = me.clientY - startY;

        if (!isDragging && dx * dx + dy * dy > 25) {
          // Crossed 5px threshold — start drag
          isDragging = true;
          setFeedOpen(false);
          setDraggingSnack({ snack, x: me.clientX, y: me.clientY });
        }

        if (isDragging) {
          setDraggingSnack({ snack, x: me.clientX, y: me.clientY });
        }
      };

      const onMouseUp = (me: MouseEvent) => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);

        if (isDragging) {
          setDraggingSnack(null);
          // Check if dropped near pet
          const pet = positionRef.current;
          const dist = Math.hypot(me.clientX - pet.x, me.clientY - pet.y);
          if (dist < 60) {
            // Drop on pet — skip fly, go straight to chomp
            setFeedingSnack({ snack, startX: me.clientX, startY: me.clientY, skipFly: true });
            trackEvent("feed", snack.id);
            setState("talking");
          }
          // else: dropped away, do nothing (emoji fades via CSS)
          setPetExtraStyle({});
        } else {
          // Click without dragging — fallback to old fly animation
          setFeedOpen(false);
          setFeedingSnack({ snack, startX, startY });
          trackEvent("feed", snack.id);
          setState("talking");
        }
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [trackEvent, setState],
  );

  const handleFeedComplete = useCallback(
    (snackName: string) => {
      setFeedingSnack(null);
      setPetExtraStyle({});
      hunger.feed(25);
      generate("feed", `cat was fed ${snackName}`);
      setTimeout(() => setState("idle"), 3000);
    },
    [generate, setState, hunger],
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
        extraStyle={petExtraStyle}
        onClick={handlePetClick}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      />

      {visible && !menuOpen && !paletteOpen && !settingsOpen && !journalOpen && !achievementsOpen && !friendsOpen && !notesOpen && !moreOpen && !timerOpen && !feedOpen && !feedingSnack && !draggingSnack && (
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
          onMore={() => { setMenuOpen(false); setMoreOpen(true); }}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {moreOpen && (
        <MoreMenu
          musicPlaying={musicPlaying}
          onSelect={(action) => { setMoreOpen(false); handleMenuSelect(action); }}
          onClose={() => setMoreOpen(false)}
        />
      )}

      {paletteOpen && (
        <CommandPalette
          x={position.x}
          y={position.y}
          musicPlaying={musicPlaying}
          onExecute={handleMenuSelect}
          onChat={handlePaletteChat}
          onSearch={handlePaletteSearch}
          onTimer={(seconds) => {
            setPaletteOpen(false);
            timer.start(seconds);
            trackEvent("timer", `${Math.round(seconds / 60)}m`);
          }}
          onClose={() => setPaletteOpen(false)}
        />
      )}

      {settingsOpen && (
        <SettingsPanel
          currentBreed={breed}
          currentColor={color}
          customThemes={customThemes}
          shortcut={shortcut}
          onSelectBreed={selectBreed}
          onSelectColor={selectColor}
          onImport={handleThemeImport}
          onDelete={removeCustomTheme}
          onChangeShortcut={handleChangeShortcut}
          onClearMemory={handleClearMemory}
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

      {friendsOpen && (
        <FriendsPanel
          myPetCode={myPetCode}
          myPetName={myPetName}
          registered={registered}
          registering={registering}
          connected={connected}
          friends={friends}
          loadingFriends={loadingFriends}
          onRegister={registerPet}
          onSetName={setMyPetName}
          onAddFriend={addFriend}
          onAcceptFriend={acceptFriend}
          onRemoveFriend={removeFriend}
          onHangout={startHangout}
          onClose={() => setFriendsOpen(false)}
        />
      )}

      {notesOpen && (
        <NotesPanel
          notes={notes}
          notesVisible={notesVisible}
          onAdd={addNote}
          onDelete={deleteNote}
          onToggleVisible={toggleNotesVisible}
          onClose={() => setNotesOpen(false)}
        />
      )}

      {feedOpen && (
        <SnackPanel
          onGrab={handleSnackGrab}
          onClose={() => setFeedOpen(false)}
        />
      )}

      {draggingSnack && (
        <div
          className="feed-dragging-snack"
          style={{ left: draggingSnack.x, top: draggingSnack.y }}
        >
          {draggingSnack.snack.emoji}
        </div>
      )}

      {feedingSnack && (
        <FeedAnimation
          snack={feedingSnack.snack}
          startX={feedingSnack.startX}
          startY={feedingSnack.startY}
          petX={position.x}
          petY={position.y}
          skipFly={feedingSnack.skipFly}
          onPetStyle={setPetExtraStyle}
          onComplete={handleFeedComplete}
        />
      )}

      {timerOpen && (
        <TimerPanel
          running={timer.running}
          remaining={timer.remaining}
          label={timer.label}
          onStart={(seconds, label) => {
            timer.start(seconds, label);
            trackEvent("timer", label || `${Math.round(seconds / 60)}m`);
          }}
          onCancel={timer.cancel}
          onClose={() => setTimerOpen(false)}
        />
      )}

      {timer.running && !overlayOpen && (
        <TimerBubble
          x={position.x}
          y={position.y}
          remaining={timer.remaining}
          label={timer.label}
        />
      )}

      {!overlayOpen && state !== "home" && (
        <HungerBar
          x={position.x}
          y={position.y}
          hunger={hunger.hunger}
        />
      )}

      {notesVisible && notes.length > 0 && !notesOpen && notes.map((note) => (
        <StickyNoteComponent
          key={note.id}
          note={note}
          onDelete={deleteNote}
          onMove={updateNotePosition}
          onPositionReport={(id, x, y) => {
            setNotePositions((prev) => new Map(prev).set(id, { x, y }));
          }}
        />
      ))}

      {currentVisit && !settingsOpen && !journalOpen && !achievementsOpen && !friendsOpen && (
        <VisitingPet
          visit={currentVisit}
          userPetX={position.x}
          userPetY={position.y}
          onComplete={dismissVisit}
          onChat={handleVisitorChat}
          onPositionChange={setVisitorPos}
          onOverlayChange={setVisitorOverlay}
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
