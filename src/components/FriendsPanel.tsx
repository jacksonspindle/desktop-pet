import { useState, useCallback } from "react";
import { getSpritePaths, Breed, Color } from "../hooks/useTheme";
import { Friend } from "../hooks/useFriends";
import "../styles/friends.css";

interface FriendsPanelProps {
  myPetCode: string | null;
  myPetName: string;
  registered: boolean;
  registering: boolean;
  connected: boolean;
  friends: Friend[];
  loadingFriends: boolean;
  onRegister: () => void;
  onSetName: (name: string) => void;
  onAddFriend: (code: string) => Promise<{ ok: boolean; error?: string }>;
  onAcceptFriend: (id: string) => void;
  onRemoveFriend: (id: string) => void;
  onHangout: (id: string) => void;
  onClose: () => void;
}

export default function FriendsPanel({
  myPetCode,
  myPetName,
  registered,
  registering,
  connected,
  friends,
  loadingFriends,
  onRegister,
  onSetName,
  onAddFriend,
  onAcceptFriend,
  onRemoveFriend,
  onHangout,
  onClose,
}: FriendsPanelProps) {
  const [addCode, setAddCode] = useState("");
  const [addMessage, setAddMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(myPetName);

  const handleCopy = useCallback(() => {
    if (!myPetCode) return;
    navigator.clipboard.writeText(myPetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [myPetCode]);

  const handleAddFriend = useCallback(async () => {
    if (!addCode.trim() || adding) return;
    setAdding(true);
    setAddMessage(null);
    const result = await onAddFriend(addCode.trim());
    if (result.ok) {
      setAddMessage({ text: "Friend added!", type: "success" });
      setAddCode("");
    } else {
      setAddMessage({ text: result.error || "Failed", type: "error" });
    }
    setAdding(false);
    setTimeout(() => setAddMessage(null), 3000);
  }, [addCode, adding, onAddFriend]);

  const handleNameBlur = useCallback(() => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== myPetName) {
      onSetName(trimmed);
    } else {
      setEditingName(myPetName);
    }
  }, [editingName, myPetName, onSetName]);

  if (!connected) {
    return (
      <div className="friends-overlay" onClick={onClose}>
        <div className="friends-panel" onClick={(e) => e.stopPropagation()}>
          <div className="friends-header">
            <span className="friends-title">Friends</span>
            <button className="friends-close" onClick={onClose}>x</button>
          </div>
          <div className="friends-empty">
            Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to enable friends.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-overlay" onClick={onClose}>
      <div className="friends-panel" onClick={(e) => e.stopPropagation()}>
        <div className="friends-header">
          <span className="friends-title">Friends</span>
          <button className="friends-close" onClick={onClose}>x</button>
        </div>

        {/* Your Code Section */}
        <div className="section-label">Your Code</div>
        {!registered ? (
          <div className="friends-code-section">
            <button
              className="friends-register-btn"
              onClick={onRegister}
              disabled={registering}
            >
              {registering ? "Connecting..." : "Connect My Cat"}
            </button>
          </div>
        ) : (
          <div className="friends-code-section">
            <div className="friends-code-row">
              <span className="friends-code-display">{myPetCode}</span>
              <button
                className={`friends-copy-btn ${copied ? "copied" : ""}`}
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="friends-name-row">
              <input
                className="friends-name-input"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                maxLength={20}
                placeholder="Pet name"
              />
            </div>
          </div>
        )}

        {/* Add Friend Section */}
        {registered && (
          <>
            <div className="section-label">Add Friend</div>
            <div className="friends-add-section">
              <div className="friends-add-row">
                <input
                  className="friends-add-input"
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddFriend(); }}
                  placeholder="XXXX-XXXX"
                  maxLength={9}
                />
                <button
                  className="friends-add-btn"
                  onClick={handleAddFriend}
                  disabled={adding || !addCode.trim()}
                >
                  {adding ? "..." : "Add"}
                </button>
              </div>
              {addMessage && (
                <div className={`friends-add-message ${addMessage.type}`}>
                  {addMessage.text}
                </div>
              )}
            </div>
          </>
        )}

        {/* Friend List */}
        {registered && (
          <>
            <div className="section-label">
              Friends {loadingFriends ? "..." : `(${friends.length})`}
            </div>
            <div className="friends-list">
              {friends.length === 0 && !loadingFriends && (
                <div className="friends-empty">
                  Share your code with friends to get started!
                </div>
              )}
              {friends.map((friend) => {
                const paths = getSpritePaths(friend.breed as Breed, friend.color as Color);
                return (
                  <div key={friend.id} className="friend-card">
                    <div
                      className="friend-sprite-preview"
                      style={{ backgroundImage: `url(${paths.idle})` }}
                    />
                    <div className="friend-info">
                      <div className="friend-name">
                        <span className={`friend-status-dot ${friend.online ? "online" : "offline"}`} />
                        {friend.name}
                        {friend.status === "pending_outgoing" && <span className="friend-pending">Pending</span>}
                        {friend.status === "pending_incoming" && <span className="friend-pending incoming">Request</span>}
                      </div>
                      <div className="friend-code">{friend.pet_code}</div>
                    </div>
                    <div className="friend-actions">
                      {friend.status === "pending_incoming" && (
                        <button
                          className="friend-accept-btn"
                          onClick={() => onAcceptFriend(friend.id)}
                        >
                          Accept
                        </button>
                      )}
                      {friend.status === "mutual" && friend.online && (
                        <button
                          className="friend-visit-btn"
                          onClick={() => onHangout(friend.id)}
                        >
                          Hangout
                        </button>
                      )}
                      <button
                        className="friend-remove-btn"
                        onClick={() => onRemoveFriend(friend.id)}
                      >
                        x
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
