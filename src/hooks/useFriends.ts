import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, generatePetCode, PetRow, VisitRow } from "../lib/supabase";

export type FriendStatus = "mutual" | "pending_outgoing" | "pending_incoming";

export interface Friend {
  id: string;
  pet_code: string;
  name: string;
  breed: string;
  color: string;
  online: boolean;
  status: FriendStatus;
}

export interface IncomingVisit {
  id: string;
  fromPetId: string;
  fromName: string;
  breed: string;
  color: string;
  message: string;
}

export function useFriends(breed: string, color: string) {
  const [myPetId, setMyPetId] = useState<string | null>(() => localStorage.getItem("pet-id"));
  const [myPetCode, setMyPetCode] = useState<string | null>(() => localStorage.getItem("pet-code"));
  const [myPetName, setMyPetNameState] = useState<string>(() => localStorage.getItem("pet-name") || "Cat");
  const [registered, setRegistered] = useState(() => !!localStorage.getItem("pet-id"));
  const [registering, setRegistering] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [connected, setConnected] = useState(false);
  const [currentVisit, setCurrentVisit] = useState<IncomingVisit | null>(null);

  const myPetIdRef = useRef(myPetId);
  myPetIdRef.current = myPetId;
  const breedRef = useRef(breed);
  breedRef.current = breed;
  const colorRef = useRef(color);
  colorRef.current = color;
  const myPetNameRef = useRef(myPetName);
  myPetNameRef.current = myPetName;
  const friendsRef = useRef(friends);
  friendsRef.current = friends;
  const currentVisitRef = useRef(currentVisit);
  currentVisitRef.current = currentVisit;

  // Check Supabase connection
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    setConnected(!!(url && key));
  }, []);

  // Register pet
  const register = useCallback(async () => {
    if (registering) return;
    setRegistering(true);
    try {
      const code = generatePetCode();
      const { data, error } = await supabase
        .from("pets")
        .insert({ pet_code: code, name: myPetNameRef.current, breed: breedRef.current, color: colorRef.current })
        .select()
        .single();
      if (error) throw error;
      const pet = data as PetRow;
      localStorage.setItem("pet-id", pet.id);
      localStorage.setItem("pet-code", pet.pet_code);
      localStorage.setItem("pet-name", pet.name);
      setMyPetId(pet.id);
      setMyPetCode(pet.pet_code);
      setRegistered(true);
    } catch (err) {
      console.error("Failed to register pet:", err);
    } finally {
      setRegistering(false);
    }
  }, [registering]);

  // Set pet name
  const setMyPetName = useCallback(async (name: string) => {
    setMyPetNameState(name);
    localStorage.setItem("pet-name", name);
    if (myPetIdRef.current) {
      await supabase.from("pets").update({ name }).eq("id", myPetIdRef.current);
    }
  }, []);

  // Presence heartbeat
  useEffect(() => {
    if (!myPetId) return;

    const heartbeat = async () => {
      await supabase.from("pets").update({
        online: true,
        last_seen: new Date().toISOString(),
        breed: breedRef.current,
        color: colorRef.current,
        name: myPetNameRef.current,
      }).eq("id", myPetId);
    };

    heartbeat();
    const interval = setInterval(heartbeat, 60_000);

    const handleUnload = () => {
      // Use sendBeacon for reliable offline signal
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (url && key) {
        const body = JSON.stringify({ online: false, last_seen: new Date().toISOString() });
        navigator.sendBeacon(
          `${url}/rest/v1/pets?id=eq.${myPetId}`,
          new Blob([body], { type: "application/json" })
        );
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
      // Also set offline on cleanup
      supabase.from("pets").update({ online: false, last_seen: new Date().toISOString() }).eq("id", myPetId);
    };
  }, [myPetId]);

  // Refresh friends list
  const refreshFriends = useCallback(async () => {
    if (!myPetIdRef.current) return;
    setLoadingFriends(true);
    try {
      // Get friendships where I added someone
      const { data: outgoing } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("pet_id", myPetIdRef.current);

      // Get friendships where someone added me
      const { data: incoming } = await supabase
        .from("friendships")
        .select("pet_id")
        .eq("friend_id", myPetIdRef.current);

      const outgoingIds = new Set((outgoing || []).map((r) => r.friend_id));
      const incomingIds = new Set((incoming || []).map((r) => r.pet_id));

      // All unique friend IDs (union of both directions)
      const allIds = new Set([...outgoingIds, ...incomingIds]);
      if (allIds.size === 0) {
        setFriends([]);
        setLoadingFriends(false);
        return;
      }

      // Fetch pet data for all
      const { data: pets } = await supabase
        .from("pets")
        .select("*")
        .in("id", [...allIds]);

      const twoMinAgo = Date.now() - 2 * 60 * 1000;
      const friendList: Friend[] = (pets || []).map((pet: PetRow) => {
        const iAdded = outgoingIds.has(pet.id);
        const theyAdded = incomingIds.has(pet.id);
        let status: FriendStatus;
        if (iAdded && theyAdded) status = "mutual";
        else if (iAdded) status = "pending_outgoing";
        else status = "pending_incoming";
        return {
          id: pet.id,
          pet_code: pet.pet_code,
          name: pet.name,
          breed: pet.breed,
          color: pet.color,
          online: pet.online && new Date(pet.last_seen).getTime() > twoMinAgo,
          status,
        };
      });

      setFriends(friendList);
    } catch (err) {
      console.error("Failed to refresh friends:", err);
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  // Refresh friends periodically
  useEffect(() => {
    if (!myPetId) return;
    refreshFriends();
    const interval = setInterval(refreshFriends, 60_000);
    return () => clearInterval(interval);
  }, [myPetId, refreshFriends]);

  // Add friend by code
  const addFriend = useCallback(async (code: string): Promise<{ ok: boolean; error?: string }> => {
    if (!myPetIdRef.current) return { ok: false, error: "Not registered" };

    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode === localStorage.getItem("pet-code")) {
      return { ok: false, error: "That's your own code!" };
    }

    // Look up pet by code
    const { data: pet, error: lookupError } = await supabase
      .from("pets")
      .select("id")
      .eq("pet_code", normalizedCode)
      .single();

    if (lookupError || !pet) return { ok: false, error: "Pet not found" };

    // Check if already added
    const { data: existing } = await supabase
      .from("friendships")
      .select("id")
      .eq("pet_id", myPetIdRef.current)
      .eq("friend_id", pet.id)
      .single();

    if (existing) return { ok: false, error: "Already added!" };

    // Insert friendship
    const { error: insertError } = await supabase
      .from("friendships")
      .insert({ pet_id: myPetIdRef.current, friend_id: pet.id });

    if (insertError) return { ok: false, error: "Failed to add friend" };

    await refreshFriends();
    return { ok: true };
  }, [refreshFriends]);

  // Accept incoming friend request (insert reverse direction)
  const acceptFriend = useCallback(async (friendId: string) => {
    if (!myPetIdRef.current) return;
    await supabase
      .from("friendships")
      .insert({ pet_id: myPetIdRef.current, friend_id: friendId });
    await refreshFriends();
  }, [refreshFriends]);

  // Remove friend
  const removeFriend = useCallback(async (friendId: string) => {
    if (!myPetIdRef.current) return;
    await supabase
      .from("friendships")
      .delete()
      .eq("pet_id", myPetIdRef.current)
      .eq("friend_id", friendId);
    await refreshFriends();
  }, [refreshFriends]);

  // Send visit
  const sendVisit = useCallback(async (toFriendId: string, message = "") => {
    if (!myPetIdRef.current) return;
    await supabase.from("visits").insert({
      from_pet_id: myPetIdRef.current,
      to_pet_id: toFriendId,
      message,
      breed: breedRef.current,
      color: colorRef.current,
      name: myPetNameRef.current,
    });
  }, []);

  // Start a hangout: send both cats to visit each other
  const startHangout = useCallback(async (friendId: string) => {
    if (!myPetIdRef.current) return;
    const friend = friendsRef.current.find((f) => f.id === friendId);
    if (!friend) return;

    // Send my pet to the friend, and their pet to me, simultaneously
    await Promise.all([
      supabase.from("visits").insert({
        from_pet_id: myPetIdRef.current,
        to_pet_id: friendId,
        message: "",
        breed: breedRef.current,
        color: colorRef.current,
        name: myPetNameRef.current,
      }),
      supabase.from("visits").insert({
        from_pet_id: friendId,
        to_pet_id: myPetIdRef.current,
        message: "",
        breed: friend.breed,
        color: friend.color,
        name: friend.name,
      }),
    ]);
  }, []);

  // Dismiss current visit
  const dismissVisit = useCallback(() => {
    setCurrentVisit(null);
  }, []);

  // Receive visits via realtime subscription + periodic polling fallback
  useEffect(() => {
    if (!myPetId) return;

    const consumeVisit = async (visit: VisitRow) => {
      const current = currentVisitRef.current;

      if (current && current.fromPetId === visit.from_pet_id) {
        // Same pet is already visiting — show their message as a chat bubble
        if (visit.message) {
          setCurrentVisit({ ...current, message: visit.message });
        }
      } else if (!current) {
        // No current visit — show the new visitor
        setCurrentVisit({
          id: visit.id,
          fromPetId: visit.from_pet_id,
          fromName: visit.name,
          breed: visit.breed,
          color: visit.color,
          message: visit.message,
        });
      }
      // else: different pet while one is already visiting — consume silently

      // Always mark consumed so it doesn't re-appear
      await supabase.from("visits").update({ consumed: true }).eq("id", visit.id);
    };

    // Poll for unconsumed visits (runs on mount + every 5s as reliability fallback)
    const checkUnconsumed = async () => {
      const { data } = await supabase
        .from("visits")
        .select("*")
        .eq("to_pet_id", myPetId)
        .eq("consumed", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        await consumeVisit(data[0] as VisitRow);
      }
    };

    checkUnconsumed();
    const pollInterval = setInterval(checkUnconsumed, 5000);

    // Subscribe to new visits via realtime
    const channel = supabase
      .channel(`visits-${myPetId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "visits",
          filter: `to_pet_id=eq.${myPetId}`,
        },
        async (payload) => {
          const visit = payload.new as VisitRow;
          if (visit.consumed) return;
          await consumeVisit(visit);
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [myPetId]);

  // Random visit scheduler (3-5 min interval, 30% chance)
  useEffect(() => {
    if (!myPetId) return;

    const scheduleVisit = () => {
      const delay = (3 * 60 + Math.random() * 2 * 60) * 1000; // 3-5 min
      return setTimeout(() => {
        const mutualOnline = friendsRef.current.filter((f) => f.status === "mutual" && f.online);
        if (mutualOnline.length > 0 && Math.random() < 0.3) {
          const target = mutualOnline[Math.floor(Math.random() * mutualOnline.length)];
          sendVisit(target.id);
        }
        timerId = scheduleVisit();
      }, delay);
    };

    let timerId = scheduleVisit();
    return () => clearTimeout(timerId);
  }, [myPetId, sendVisit]);

  return {
    myPetId,
    myPetCode,
    myPetName,
    registered,
    registering,
    friends,
    loadingFriends,
    connected,
    register,
    addFriend,
    acceptFriend,
    removeFriend,
    sendVisit,
    startHangout,
    setMyPetName,
    currentVisit,
    dismissVisit,
  };
}
