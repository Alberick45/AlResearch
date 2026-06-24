import { useState, useRef, useEffect } from "react";
import {
  Search, Plus, X, Link2, Youtube, FileText, Image as ImageIcon,
  BookMarked, FlaskConical, MessageCircle, CheckCircle2, Circle,
  Lock, Globe2, Sparkles, ChevronRight, Star, Moon, Sun, HelpCircle,
  Settings, Bell, Edit3, Trash2, Shield, Eye, Database, FileUp, FileDown, Info,
  Unlock, UserPlus, LogOut, Key, User, BookOpen, Clock, Video, Mic, Users
} from "lucide-react";
import ThreeHead from "./ThreeHead";

/* ------------------------------------------------------------------ */
/* Accent Map & Constants                                              */
/* ------------------------------------------------------------------ */

const TABS = ["Overview", "Resources", "Notes", "Discoveries", "Sources", "Timeline"];

const ACCENTS = {
  verdigris: "#5E8577",
  brass: "#C9974D",
  indigo: "#5A6B8C",
  sage: "#8C9B6E",
  garnet: "#A6533D",
  clay: "#B5764A",
};

const STATUS_ORDER = ["Unread", "Reading", "Finished", "Valuable", "Archived"];

const TYPE_ICON = {
  Website: Link2,
  "YouTube Video": Youtube,
  PDF: FileText,
  Book: BookMarked,
  "Research Paper": FlaskConical,
  Image: ImageIcon,
  "Personal Conversation": MessageCircle,
  Video: Video,
  Audio: Mic,
  Discussion: Users,
  Discovery: Sparkles,
};

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function parseChatLog(rawText) {
  if (!rawText) return [];
  const lines = rawText.split("\n");
  const messages = [];
  
  const bracketPattern = /^\[([^\]]+)\]\s*([^:]+):\s*(.*)$/;
  const dashPattern = /^([^\-]+)\s*-\s*([^:]+):\s*(.*)$/;
  const simplePattern = /^([^:\n]+):\s*(.*)$/;
  
  let currentMsg = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    let match = line.match(bracketPattern);
    if (match) {
      if (currentMsg) messages.push(currentMsg);
      currentMsg = {
        timestamp: match[1].trim(),
        sender: match[2].trim(),
        text: match[3].trim()
      };
      continue;
    }
    
    match = line.match(dashPattern);
    if (match) {
      if (currentMsg) messages.push(currentMsg);
      currentMsg = {
        timestamp: match[1].trim(),
        sender: match[2].trim(),
        text: match[3].trim()
      };
      continue;
    }

    match = line.match(simplePattern);
    if (match && match[1].length < 40 && !match[1].includes("http") && !match[1].includes("/")) {
      if (currentMsg) messages.push(currentMsg);
      currentMsg = {
        timestamp: "",
        sender: match[1].trim().replace(/^\[|\]$/g, ""),
        text: match[2].trim()
      };
      continue;
    }

    if (currentMsg) {
      currentMsg.text += "\n" + line;
    } else {
      currentMsg = {
        timestamp: "",
        sender: "System",
        text: line
      };
    }
  }
  
  if (currentMsg) {
    messages.push(currentMsg);
  }
  
  return messages;
}

function renderMessageText(text) {
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent-brass)", textDecoration: "underline", wordBreak: "break-all" }}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

const nextId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

const sanitizeAndMigrateTopics = (rawTopics) => {
  if (!Array.isArray(rawTopics)) return [];
  const seenIds = new Set();
  return rawTopics.map((topic) => {
    if (!topic || typeof topic !== "object") return topic;
    if (!topic.id || seenIds.has(topic.id)) {
      const newId = nextId("topic");
      seenIds.add(newId);
      return { ...topic, id: newId };
    }
    seenIds.add(topic.id);
    return topic;
  });
};

/* ------------------------------------------------------------------ */
/* Cryptographic Puzzle Key Helpers                                  */
/* ------------------------------------------------------------------ */

async function deriveCryptoKey(pin, salt) {
  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(dataObj, pin) {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const key = await deriveCryptoKey(pin, salt);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    enc.encode(JSON.stringify(dataObj))
  );

  const encryptedBytes = new Uint8Array(encrypted);
  const combined = new Uint8Array(salt.length + iv.length + encryptedBytes.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(encryptedBytes, salt.length + iv.length);

  let binary = "";
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return "RKV_KEY_v1_" + btoa(binary);
}

async function decryptData(encryptedStr, pin) {
  if (!encryptedStr.startsWith("RKV_KEY_v1_")) {
    throw new Error("Invalid key format");
  }
  const base64 = encryptedStr.replace("RKV_KEY_v1_", "");
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const salt = bytes.slice(0, 16);
  const iv = bytes.slice(16, 28);
  const ciphertext = bytes.slice(28);

  const key = await deriveCryptoKey(pin, salt);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decrypted));
}

/* ------------------------------------------------------------------ */
/* IndexedDB Attachment Database Helper                               */
/* ------------------------------------------------------------------ */

const DB_NAME = "rkv_attachments_db";
const DB_VERSION = 1;
const STORE_NAME = "attachments";

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const attachmentDb = {
  async get(key) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    } catch (e) {
      console.error("IndexedDB get error:", e);
      return null;
    }
  },
  async set(key, val) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(val, key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (e) {
      console.error("IndexedDB set error:", e);
    }
  },
  async delete(key) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (e) {
      console.error("IndexedDB delete error:", e);
    }
  },
  async getAllEntries() {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const entries = {};
        const cursorReq = store.openCursor();
        cursorReq.onerror = () => reject(cursorReq.error);
        cursorReq.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            entries[cursor.key] = cursor.value;
            cursor.continue();
          } else {
            resolve(entries);
          }
        };
      });
    } catch (err) {
      console.error("IndexedDB getAllEntries error:", err);
      return {};
    }
  },
  async setMany(entriesObj) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const keys = Object.keys(entriesObj);
        let done = 0;
        if (keys.length === 0) { resolve(); return; }
        for (const key of keys) {
          const req = store.put(entriesObj[key], key);
          req.onsuccess = () => { done++; if (done === keys.length) resolve(); };
          req.onerror = () => reject(req.error);
        }
      });
    } catch (err) {
      console.error("IndexedDB setMany error:", err);
    }
  }
};

const cleanAttachmentIfDb = async (url) => {
  if (url && url.startsWith("db://")) {
    const key = url.replace("db://", "");
    await attachmentDb.delete(key);
  }
};

function OfflineAttachmentPreview({ url, title, type }) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    if (!url) return;
    if (url.startsWith("data:")) {
      setDataUrl(url);
    } else if (url.startsWith("db://")) {
      const key = url.replace("db://", "");
      attachmentDb.get(key).then((val) => {
        if (val) setDataUrl(val);
      });
    }
  }, [url]);

  if (!dataUrl) return <div style={{ fontSize: "11px", color: "var(--text-dim)", padding: "4px" }}>Loading offline preview...</div>;

  const isAudio = type === "Audio" || dataUrl.startsWith("data:audio/");
  const isDiscussion = type === "Discussion" || (type === "Website" && title.toLowerCase().includes("discussion"));

  if (isAudio) {
    return (
      <div style={{ borderRadius: "8px", overflow: "hidden", maxWidth: "400px", marginTop: "4px", background: "rgba(0,0,0,0.15)", padding: "8px", border: "1px solid var(--border-color)" }}>
        <div style={{ padding: "4px", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)" }}>
          <Mic size={14} style={{ color: "var(--accent-brass)" }} />
          <span style={{ fontWeight: "500" }}>Voice Note / Audio Attachment</span>
        </div>
        <audio src={dataUrl} controls style={{ width: "100%", marginTop: "8px" }} />
      </div>
    );
  }

  if (isDiscussion) {
    let rawText = "";
    try {
      if (dataUrl.startsWith("data:")) {
        const parts = dataUrl.split(",");
        const meta = parts[0];
        const content = parts[1];
        if (meta.includes("base64")) {
          rawText = decodeURIComponent(escape(atob(content)));
        } else {
          rawText = decodeURIComponent(content);
        }
      } else {
        rawText = dataUrl;
      }
    } catch (err) {
      console.error("Decoding failed", err);
      rawText = dataUrl;
    }

    const messages = parseChatLog(rawText);

    const getSenderColor = (sender) => {
      let hash = 0;
      for (let i = 0; i < sender.length; i++) {
        hash = sender.charCodeAt(i) + ((hash << 5) - hash);
      }
      const colors = [
        "#60a5fa", // soft blue
        "#34d399", // soft green
        "#fbbf24", // soft amber/brass
        "#f472b6", // soft pink
        "#a78bfa", // soft purple
        "#2dd4bf", // soft teal
        "#fb7185", // soft rose
        "#22d3ee", // soft cyan
      ];
      return colors[Math.abs(hash) % colors.length];
    };

    return (
      <div style={{ 
        borderRadius: "8px", 
        overflow: "hidden", 
        maxWidth: "600px", 
        marginTop: "8px", 
        background: "var(--bg-card)", 
        border: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column"
      }}>
        <div style={{ 
          padding: "8px 12px", 
          fontSize: "12px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          background: "rgba(255,255,255,0.03)", 
          borderBottom: "1px solid var(--border-color)",
          color: "var(--text-secondary)"
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>
            <Users size={14} style={{ color: "var(--accent-verdigris)" }} />
            Discussion Timeline ({messages.length} messages)
          </span>
          <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>Offline Parsed Chat</span>
        </div>
        <div style={{ 
          padding: "12px", 
          maxHeight: "360px", 
          overflowY: "auto", 
          display: "flex", 
          flexDirection: "column", 
          gap: "8px",
          background: "rgba(0,0,0,0.1)"
        }}>
          {messages.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--text-dim)", textAlign: "center", padding: "12px" }}>
              No chat messages could be parsed. Make sure to paste format like: [23:07] Name: Message
            </div>
          ) : (
            messages.map((msg, index) => {
              const color = getSenderColor(msg.sender);
              return (
                <div key={index} style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  background: "var(--bg-panel)", 
                  padding: "8px 12px", 
                  borderRadius: "8px", 
                  borderLeft: `3px solid ${color}`,
                  alignSelf: "flex-start",
                  width: "100%",
                  boxSizing: "border-box"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                    <span style={{ fontWeight: "600", color: color, fontSize: "12px" }}>
                      {msg.sender}
                    </span>
                    {msg.timestamp && (
                      <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                        {msg.timestamp}
                      </span>
                    )}
                  </div>
                  <div style={{ 
                    fontSize: "13px", 
                    color: "var(--text-primary)", 
                    whiteSpace: "pre-wrap", 
                    lineHeight: "1.4",
                    wordBreak: "break-word"
                  }}>
                    {renderMessageText(msg.text)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: "8px", overflow: "hidden", maxWidth: "300px", marginTop: "4px", background: "rgba(0,0,0,0.15)", padding: "4px", border: "1px solid var(--border-color)" }}>
      {dataUrl.startsWith("data:image/") ? (
        <img src={dataUrl} alt={title} style={{ width: "100%", maxHeight: "160px", objectFit: "contain", borderRadius: "6px" }} />
      ) : dataUrl.startsWith("data:video/") ? (
        <video src={dataUrl} controls style={{ width: "100%", maxHeight: "160px", borderRadius: "6px" }} />
      ) : dataUrl.startsWith("data:application/pdf") ? (
        <div style={{ padding: "10px", fontSize: "12.5px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📄 PDF Document</span>
          <button 
            className="btn-landing-secondary" 
            style={{ padding: "3px 8px", fontSize: "11px", cursor: "pointer", background: "var(--bg-panel)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "white" }}
            onClick={() => {
              const link = document.createElement("a");
              link.href = dataUrl;
              link.download = title.toLowerCase().endsWith(".pdf") ? title : `${title}.pdf`;
              link.click();
            }}
          >
            Download
          </button>
        </div>
      ) : (
        <div style={{ padding: "10px", fontSize: "12.5px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📎 Document Attachment</span>
          <button 
            className="btn-landing-secondary" 
            style={{ padding: "3px 8px", fontSize: "11px", cursor: "pointer", background: "var(--bg-panel)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "white" }}
            onClick={() => {
              const link = document.createElement("a");
              link.href = dataUrl;
              link.download = title;
              link.click();
            }}
          >
            Download
          </button>
        </div>
      )}
    </div>
  );
}



export default function App() {
  // Authentication & Session States
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem("rkv_active_user") || null;
  });
  
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // 'login' | 'register'

  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const lastTabScrollRef = useRef(0);

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const options = { mimeType: "audio/webm" };
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          setCaptureResUrl(base64data);
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          if (!captureResTitle) {
            setCaptureResTitle(`Voice Note - ${timeStr}`);
          }
        };
        reader.readAsDataURL(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(200);
      setIsRecording(true);
      setRecordDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
      showToast("Recording started...");
    } catch (err) {
      console.error("Failed to start recording:", err);
      setAlertDialog({ message: "Could not access microphone. Please check permissions." });
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    showToast("Recording saved");
  };

  // Layout Collapsible & Mobile States
  const [bookMenuOpen, setBookMenuOpen] = useState(false);
  const [secondaryCollapsed, setSecondaryCollapsed] = useState(false);
  const [aboutCollapsed, setAboutCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileSecondaryOpen, setMobileSecondaryOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);



  // Theme Toggling State
  const [theme, setTheme] = useState(() => localStorage.getItem("rkv_theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("rkv_theme", theme);
  }, [theme]);
  
  // Registration and Login Input Drafts
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  // Topics Loaded dynamically per logged-in user
  const [topics, setTopics] = useState(() => {
    const activeUser = localStorage.getItem("rkv_active_user");
    if (activeUser) {
      const saved = localStorage.getItem(`rkv_vault_${activeUser}`);
      const userTopics = saved ? JSON.parse(saved) : [];
      return sanitizeAndMigrateTopics(userTopics);
    }
    return [];
  });


  // Active view: can be a topic ID, "unsorted", or "recently-viewed"
  const [activeView, setActiveView] = useState("all-topics"); 
  const [activeTopicId, setActiveTopicId] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [resourceFilter, setResourceFilter] = useState("All");

  // Unsorted resources bucket (stored at user vault level)
  const [unsortedResources, setUnsortedResources] = useState(() => {
    const activeUser = localStorage.getItem("rkv_active_user");
    if (activeUser) {
      const saved = localStorage.getItem(`rkv_unsorted_${activeUser}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Recently Viewed tracker (list of { id, type, name, timestamp })
  const [recentlyViewed, setRecentlyViewed] = useState(() => {
    const activeUser = localStorage.getItem("rkv_active_user");
    if (activeUser) {
      const saved = localStorage.getItem(`rkv_recent_${activeUser}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  // Tombstone Tracker (list of { id, type, title, deletedAt })
  const [deletedItems, setDeletedItems] = useState(() => {
    const activeUser = localStorage.getItem("rkv_active_user");
    if (activeUser) {
      const saved = localStorage.getItem(`rkv_deleted_${activeUser}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [activeRingIndex, setActiveRingIndex] = useState(0);
  const [hoveredRingIndex, setHoveredRingIndex] = useState(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  const ringItems = [
    { id: "all-topics", label: "All Topics", type: "system" },
    { id: "unsorted", label: "Unsorted", type: "system" },
    { id: "recently-viewed", label: "Recent", type: "system" },
    { id: "appendix", label: "Appendix", type: "system" },
    ...topics.map((t) => ({ id: t.id, label: t.name, type: "topic", accent: t.accent }))
  ];

  // Sync activeRingIndex back to view states
  useEffect(() => {
    const target = ringItems[activeRingIndex];
    if (target) {
      if (target.type === "system") {
        setActiveView(target.id);
        setActiveTopicId(null);
      } else {
        setActiveTopicId(target.id);
        setActiveView("topic");
        setActiveTab("Overview");
      }
    }
  }, [activeRingIndex]);

  // Sync view changes from elsewhere back to activeRingIndex
  useEffect(() => {
    let targetIndex = 0;
    if (activeView === "topic" && activeTopicId) {
      const idx = topics.findIndex((t) => t.id === activeTopicId);
      if (idx !== -1) {
        targetIndex = 4 + idx;
      }
    } else if (activeView === "unsorted") {
      targetIndex = 1;
    } else if (activeView === "recently-viewed") {
      targetIndex = 2;
    } else if (activeView === "appendix") {
      targetIndex = 3;
    } else {
      targetIndex = 0;
    }
    if (activeRingIndex !== targetIndex && targetIndex < ringItems.length) {
      setActiveRingIndex(targetIndex);
    }
  }, [activeView, activeTopicId, topics]);

  // Global mouse wheel listener targeting bottom of viewport to rotate the dock
  useEffect(() => {
    const handleGlobalWheel = (e) => {
      // Check if mouse cursor is within bottom 220px of window viewport
      if (e.clientY > window.innerHeight - 220) {
        e.preventDefault(); // prevent viewport scrolling
        
        const now = Date.now();
        if (now - lastTabScrollRef.current < 200) return; // slightly faster scroll response (200ms)
        
        let direction = 0;
        if (Math.abs(e.deltaX) > 10) {
          direction = e.deltaX > 0 ? 1 : -1;
        } else if (Math.abs(e.deltaY) > 12) {
          direction = e.deltaY > 0 ? 1 : -1;
        }
        
        if (direction !== 0) {
          setActiveRingIndex((prev) => {
            const nextIndex = prev + direction;
            if (nextIndex >= 0 && nextIndex < ringItems.length) {
              lastTabScrollRef.current = now;
              return nextIndex;
            }
            return prev;
          });
        }
      }
    };
    
    window.addEventListener("wheel", handleGlobalWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleGlobalWheel);
    };
  }, [ringItems.length]);

  const handleRingWheel = (e) => {
    // Keep as fallback for inline onWheel
    const now = Date.now();
    if (now - lastTabScrollRef.current < 200) return;
    
    let direction = 0;
    if (Math.abs(e.deltaX) > 10) {
      direction = e.deltaX > 0 ? 1 : -1;
    } else if (Math.abs(e.deltaY) > 12) {
      direction = e.deltaY > 0 ? 1 : -1;
    }
    
    if (direction !== 0) {
      const nextIndex = activeRingIndex + direction;
      if (nextIndex >= 0 && nextIndex < ringItems.length) {
        setActiveRingIndex(nextIndex);
        lastTabScrollRef.current = now;
      }
    }
  };

  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (!e.touches || !e.touches[0]) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    const deltaX = currentX - touchStartXRef.current;
    const deltaY = currentY - touchStartYRef.current;
    
    const now = Date.now();
    if (now - lastTabScrollRef.current < 300) return;
    
    const threshold = 40;
    if (Math.abs(deltaX) > threshold) {
      const direction = deltaX > 0 ? -1 : 1;
      const nextIndex = activeRingIndex + direction;
      if (nextIndex >= 0 && nextIndex < ringItems.length) {
        setActiveRingIndex(nextIndex);
        lastTabScrollRef.current = now;
        touchStartXRef.current = currentX;
        touchStartYRef.current = currentY;
      }
    }
  };

  // UI Dropdowns & Modals
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  
  const currentItem = ringItems[activeRingIndex];
  const isTopicSelected = currentItem && currentItem.type === "topic";
  const [radialContextMenu, setRadialContextMenu] = useState({ visible: false, x: 0, y: 0, topicId: null, topicName: "" });

  useEffect(() => {
    const handleGlobalClick = () => {
      if (radialContextMenu.visible) {
        setRadialContextMenu({ visible: false, x: 0, y: 0, topicId: null, topicName: "" });
      }
    };
    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("contextmenu", handleGlobalClick);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("contextmenu", handleGlobalClick);
    };
  }, [radialContextMenu]);

  const handleRadialContextMenu = (e) => {
    if (!isTopicSelected) return;
    e.preventDefault();
    setRadialContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      topicId: currentItem.id,
      topicName: currentItem.label
    });
  };

  const longPressTimer = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const handleTouchStartRadial = (e) => {
    if (!isTopicSelected) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      setRadialContextMenu({
        visible: true,
        x: touch.clientX,
        y: touch.clientY,
        topicId: currentItem.id,
        topicName: currentItem.label
      });
    }, 600);
  };

  const handleTouchMoveRadial = (e) => {
    if (!longPressTimer.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchEndRadial = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const [settingsTab, setSettingsTab] = useState("profile"); // 'profile' | 'sync' | 'storage'
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [storageInfo, setStorageInfo] = useState(null); // { usage, quota, percent, lsUsed }
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState("discovery"); // 'discovery' | 'resource'
  const [captureResType, setCaptureResType] = useState("Website");
  const [captureResTitle, setCaptureResTitle] = useState("");
  const [captureResUrl, setCaptureResUrl] = useState("");
  const [captureResTranscript, setCaptureResTranscript] = useState("");
  const [toast, setToast] = useState(null);

  // Pagination / Load More states
  const [visibleResourcesCount, setVisibleResourcesCount] = useState(15);
  const [visibleNotesCount, setVisibleNotesCount] = useState(15);
  const [visibleUnsortedCount, setVisibleUnsortedCount] = useState(15);

  // Reset pagination when switching views or filters
  useEffect(() => {
    setVisibleResourcesCount(15);
    setVisibleNotesCount(15);
    setVisibleUnsortedCount(15);
  }, [activeTopicId, activeView, resourceFilter]);



  useEffect(() => {
    setSettingsModalOpen(false);
  }, [activeView, activeTopicId]);

  useEffect(() => {
    if (captureOpen) {
      setCaptureResType("Website");
      setCaptureResTitle("");
      setCaptureResUrl("");
      setCaptureResTranscript("");
    } else {
      if (isRecording) {
        stopAudioRecording();
      }
      setRecordDuration(0);
    }
  }, [captureOpen, isRecording]);

  const handleCaptureFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCaptureResUrl(event.target.result);
      if (!captureResTitle) {
        setCaptureResTitle(file.name);
      }
      const ext = file.name.split('.').pop().toLowerCase();
      if (file.type.startsWith("image/")) {
        setCaptureResType("Image");
      } else if (file.type.startsWith("video/")) {
        setCaptureResType("Video");
      } else if (file.type === "application/pdf" || ext === "pdf") {
        setCaptureResType("PDF");
      } else if (ext === "ppt" || ext === "pptx" || ext === "doc" || ext === "docx" || ext === "xls" || ext === "xlsx") {
        setCaptureResType("Book");
      }
    };
    reader.readAsDataURL(file);
  };

  // Nextcloud WebDAV Sync States
  const [ncUrl, setNcUrl] = useState(() => localStorage.getItem("rkv_nc_url") || "");
  const [ncUser, setNcUser] = useState(() => localStorage.getItem("rkv_nc_user") || "");
  const [ncPass, setNcPass] = useState(() => localStorage.getItem("rkv_nc_pass") || "");
  const [ncPath, setNcPath] = useState(() => localStorage.getItem("rkv_nc_path") || "vault_backup.json");
  const [syncStatus, setSyncStatus] = useState("Idle");
  const [lastSync, setLastSync] = useState(() => localStorage.getItem("rkv_nc_last_sync") || "");

  useEffect(() => {
    localStorage.setItem("rkv_nc_url", ncUrl);
  }, [ncUrl]);
  useEffect(() => {
    localStorage.setItem("rkv_nc_user", ncUser);
  }, [ncUser]);
  useEffect(() => {
    localStorage.setItem("rkv_nc_pass", ncPass);
  }, [ncPass]);
  useEffect(() => {
    localStorage.setItem("rkv_nc_path", ncPath);
  }, [ncPath]);

  // Settings PIN Change Drafts
  const [oldPinInput, setOldPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [cryptoKeyInput, setCryptoKeyInput] = useState("");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef(null);

  // Active resource in secondary sidebar
  const [activeResourceId, setActiveResourceId] = useState(null);

  // Editing Topic Details
  const [editingTopic, setEditingTopic] = useState(null); // null | { id, name, tagline }
  const [addingTopic, setAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");

  // Custom modals & alerts states
  const [editingResource, setEditingResource] = useState(null); // null | { id, title, type, sourceId, sourceUrl }
  const [editingSource, setEditingSource] = useState(null); // null | { id, title, url }
  const [editingNote, setEditingNote] = useState(null); // null | { id, text }
  const [editingDiscovery, setEditingDiscovery] = useState(null); // null | { id, title, statement, verification, visibility }
  const [confirmDialog, setConfirmDialog] = useState(null); // null | { message, onConfirm }
  const [alertDialog, setAlertDialog] = useState(null); // null | { message }
  const [tourStep, setTourStep] = useState(null);

  // Create Resource form inside active workspace
  const [addingResource, setAddingResource] = useState(false);
  const [newResourceTitle, setNewResourceTitle] = useState("");
  const [newResourceType, setNewResourceType] = useState("Website");
  const [newResourceUrl, setNewResourceUrl] = useState("");

  // Create Note form inside Notes Tab
  const [newNoteText, setNewNoteText] = useState("");

  // Convert Note mapping
  const [convertingNoteId, setConvertingNoteId] = useState(null);
  const [convertTitle, setConvertTitle] = useState("");
  const [convertStatement, setConvertStatement] = useState("");

  // Mock Notifications
  const [notifications, setNotifications] = useState([
    { id: "n1", text: "Offline status verified - all caches are active.", time: "Just now" },
    { id: "n2", text: "Welcome to your personal Research Vault space!", time: "1 hour ago" },
  ]);

  const isInitialMount = useRef(true);

  // Load vault data when current user changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (currentUser) {
      const savedVault = localStorage.getItem(`rkv_vault_${currentUser}`);
      const userTopics = savedVault ? JSON.parse(savedVault) : [];
      const migratedTopics = sanitizeAndMigrateTopics(userTopics);
      setTopics(migratedTopics);


      const savedUnsorted = localStorage.getItem(`rkv_unsorted_${currentUser}`);
      setUnsortedResources(savedUnsorted ? JSON.parse(savedUnsorted) : []);

      const savedRecent = localStorage.getItem(`rkv_recent_${currentUser}`);
      setRecentlyViewed(savedRecent ? JSON.parse(savedRecent) : []);

      if (userTopics.length > 0) {
        setActiveTopicId(userTopics[0].id);
        setActiveView("topic");
      } else {
        setActiveTopicId(null);
        setActiveView("all-topics");
      }

      const tourCompleted = localStorage.getItem(`rkv_tour_completed_${currentUser}`);
      if (!tourCompleted) {
        setTourStep(1);
      }
    } else {
      setTopics([]);
      setUnsortedResources([]);
      setRecentlyViewed([]);
      setActiveTopicId(null);
      setActiveView("all-topics");
      setTourStep(null);
    }
  }, [currentUser]);

  // Save changes to localStorage dynamically
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`rkv_vault_${currentUser}`, JSON.stringify(topics));
    }
  }, [topics, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`rkv_unsorted_${currentUser}`, JSON.stringify(unsortedResources));
    }
  }, [unsortedResources, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`rkv_recent_${currentUser}`, JSON.stringify(recentlyViewed));
    }
  }, [recentlyViewed, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`rkv_deleted_${currentUser}`, JSON.stringify(deletedItems));
    }
  }, [deletedItems, currentUser]);

  const activeTopic = topics.find((t) => t.id === activeTopicId) || null;
  const accentHex = activeTopic ? (ACCENTS[activeTopic.accent] || "#C9974D") : "#C9974D";

  // Track Recently Viewed whenever activeTopic changes
  useEffect(() => {
    if (activeTopic) {
      addToRecentlyViewed(activeTopic.id, "topic", activeTopic.name);
    }
  }, [activeTopicId]);

  const addToRecentlyViewed = (id, type, name, topicName = null) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      const updated = [{ id, type, name, topicName, timestamp: new Date().toLocaleTimeString() }, ...filtered];
      return updated.slice(0, 5); // Keep last 5 entries
    });
  };

  // Set default active resource when switching views/topics
  useEffect(() => {
    if (activeView === "topic" && activeTopic?.resources?.length > 0) {
      setActiveResourceId(activeTopic.resources[0].id);
    } else if (activeView === "unsorted" && unsortedResources.length > 0) {
      setActiveResourceId(unsortedResources[0].id);
    } else {
      setActiveResourceId(null);
    }
  }, [activeTopicId, activeView, unsortedResources.length]);

  // Short toast display helper
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  /* --- File Import/Export System --- */
  const exportData = async () => {
    showToast("Preparing export (reading attachments)…");
    let attachments = {};
    try {
      attachments = await attachmentDb.getAllEntries();
    } catch (err) {
      console.warn("Could not read IndexedDB attachments for export:", err);
    }

    const data = {
      topics,
      unsortedResources,
      recentlyViewed,
      deletedItems,
      _attachments: attachments,        // keyed by "attachment_r_xxx"
      _exportedAt: new Date().toISOString(),
      _version: 2
    };

    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `research_vault_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const attachCount = Object.keys(attachments).length;
    showToast(`Vault exported — ${attachCount} attachment${attachCount !== 1 ? "s" : ""} included`);
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {

          // Restore IndexedDB attachments first (so previews work right away)
          if (parsed._attachments && typeof parsed._attachments === "object") {
            const entries = parsed._attachments;
            const count = Object.keys(entries).length;
            if (count > 0) {
              try {
                await attachmentDb.setMany(entries);
                showToast(`Restoring ${count} offline attachment${count !== 1 ? "s" : ""}…`);
              } catch (err) {
                console.error("Failed to restore IndexedDB attachments:", err);
              }
            }
          }

          if (parsed.topics) setTopics(sanitizeAndMigrateTopics(parsed.topics));
          if (parsed.unsortedResources) setUnsortedResources(parsed.unsortedResources);
          if (parsed.recentlyViewed) setRecentlyViewed(parsed.recentlyViewed);
          if (parsed.deletedItems) setDeletedItems(parsed.deletedItems);
          if (parsed.topics && parsed.topics.length > 0) {
            const cleanTopics = sanitizeAndMigrateTopics(parsed.topics);
            setActiveTopicId(cleanTopics[0].id);
            setActiveView("topic");
          }
          showToast("Vault backup imported successfully!");

        } else if (Array.isArray(parsed)) {
          const cleanTopics = sanitizeAndMigrateTopics(parsed);
          setTopics(cleanTopics);
          if (cleanTopics.length > 0) {
            setActiveTopicId(cleanTopics[0].id);
            setActiveView("topic");
          }
          showToast("Topics imported from legacy backup");
        } else {
          setAlertDialog({ message: "Invalid backup format." });
        }
      } catch (err) {
        setAlertDialog({ message: "Failed to parse JSON file." });
      }
    };
    reader.readAsText(file);
  };


  /* --- Nextcloud WebDAV Sync System --- */
  const getNextcloudHeaders = () => {
    return {
      "Authorization": "Basic " + btoa(`${ncUser}:${ncPass}`),
      "Content-Type": "application/json"
    };
  };

  const getNextcloudUrl = () => {
    let base = ncUrl.trim();
    if (!base) return "";
    if (!base.endsWith("/")) base += "/";
    return `${base}${ncPath.trim() || "vault_backup.json"}`;
  };

  const syncToNextcloud = async () => {
    const url = getNextcloudUrl();
    if (!url) {
      setAlertDialog({ message: "Please configure your Nextcloud WebDAV URL in Settings first." });
      return;
    }
    setSyncStatus("Syncing");

    try {
      // 1. PULL FIRST
      let remoteData = null;
      try {
        const pullRes = await fetch(url, { method: "GET", headers: getNextcloudHeaders() });
        if (pullRes.ok) {
          remoteData = await pullRes.json();
        }
      } catch (err) {
        console.warn("Could not pull remote data for merge (it might not exist yet):", err);
      }

      // 2. MERGE LOGIC
      let finalTopics = [...topics];
      let finalUnsorted = [...unsortedResources];
      let finalDeleted = [...deletedItems];

      if (remoteData) {
        // Merge deletedItems: Combine local and remote tombstones
        const remoteDeleted = remoteData.deletedItems || [];
        const mergedDeletedIds = new Set([...finalDeleted.map(d => d.id), ...remoteDeleted.map(d => d.id)]);
        finalDeleted = Array.from(mergedDeletedIds).map(id => 
          finalDeleted.find(d => d.id === id) || remoteDeleted.find(d => d.id === id)
        );

        // Merge Unsorted
        const remoteUnsorted = remoteData.unsortedResources || [];
        remoteUnsorted.forEach(remoteRes => {
          if (!finalUnsorted.find(r => r.id === remoteRes.id) && !mergedDeletedIds.has(remoteRes.id)) {
            finalUnsorted.push(remoteRes);
          }
        });
        finalUnsorted = finalUnsorted.filter(r => !mergedDeletedIds.has(r.id));

        // Merge Topics
        const remoteTopics = remoteData.topics || [];
        remoteTopics.forEach(remoteTopic => {
          if (mergedDeletedIds.has(remoteTopic.id)) return;

          const localTopicIndex = finalTopics.findIndex(t => t.id === remoteTopic.id);
          if (localTopicIndex === -1) {
            finalTopics.push(remoteTopic); // Brand new topic from remote
          } else {
            // Deep Merge inside the Topic
            const localTopic = finalTopics[localTopicIndex];
            
            const mergedRes = [...localTopic.resources];
            (remoteTopic.resources || []).forEach(r => {
              if (!mergedRes.find(x => x.id === r.id) && !mergedDeletedIds.has(r.id)) mergedRes.push(r);
            });

            const mergedNotes = [...localTopic.notes];
            (remoteTopic.notes || []).forEach(n => {
              if (!mergedNotes.find(x => x.id === n.id) && !mergedDeletedIds.has(n.id)) mergedNotes.push(n);
            });

            const mergedDisc = [...localTopic.discoveries];
            (remoteTopic.discoveries || []).forEach(d => {
              if (!mergedDisc.find(x => x.id === d.id) && !mergedDeletedIds.has(d.id)) mergedDisc.push(d);
            });
            
            const mergedSources = [...localTopic.sources];
            (remoteTopic.sources || []).forEach(s => {
              if (!mergedSources.find(x => x.id === s.id) && !mergedDeletedIds.has(s.id)) mergedSources.push(s);
            });

            finalTopics[localTopicIndex] = {
              ...localTopic,
              resources: mergedRes.filter(x => !mergedDeletedIds.has(x.id)),
              notes: mergedNotes.filter(x => !mergedDeletedIds.has(x.id)),
              discoveries: mergedDisc.filter(x => !mergedDeletedIds.has(x.id)),
              sources: mergedSources.filter(x => !mergedDeletedIds.has(x.id))
            };
          }
        });
        
        finalTopics = finalTopics.filter(t => !mergedDeletedIds.has(t.id));
      }

      // 3. Update Local State with merged data
      setTopics(finalTopics);
      setUnsortedResources(finalUnsorted);
      setDeletedItems(finalDeleted);

      // 4. PUSH MERGED DATA
      const data = {
        topics: finalTopics,
        unsortedResources: finalUnsorted,
        recentlyViewed,
        deletedItems: finalDeleted
      };

      const response = await fetch(url, {
        method: "PUT",
        headers: getNextcloudHeaders(),
        body: JSON.stringify(data, null, 2)
      });
      
      if (response.ok) {
        const timeStr = new Date().toLocaleTimeString();
        setSyncStatus("Success");
        setLastSync(timeStr);
        localStorage.setItem("rkv_nc_last_sync", timeStr);
        showToast("Vault successfully merged and uploaded to Nextcloud!");
      } else {
        setSyncStatus("Error");
        let bodyText = "";
        try { bodyText = await response.text(); } catch(e){}
        setAlertDialog({ message: `Failed to upload. Status: ${response.status} ${response.statusText}\nDetail: ${bodyText.substring(0, 150)}` });
      }
    } catch (err) {
      setSyncStatus("Error");
      setAlertDialog({ message: `Sync connection error: ${err.name} - ${err.message}\nMake sure your WebDAV URL is exact (e.g. https://server.com/remote.php/webdav/) and your App Password is correct.` });
    }
  };

  const syncFromNextcloud = async () => {
    const url = getNextcloudUrl();
    if (!url) {
      setAlertDialog({ message: "Please configure your Nextcloud WebDAV URL in Settings first." });
      return;
    }
    setSyncStatus("Syncing");
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: getNextcloudHeaders()
      });
      if (response.ok) {
        const parsed = await response.json();
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const cleanTopics = sanitizeAndMigrateTopics(parsed.topics || []);
          setTopics(cleanTopics);
          if (parsed.unsortedResources) setUnsortedResources(parsed.unsortedResources);
          if (parsed.recentlyViewed) setRecentlyViewed(parsed.recentlyViewed);
          if (cleanTopics.length > 0) {
            setActiveTopicId(cleanTopics[0].id);
            setActiveView("topic");
          }
          const timeStr = new Date().toLocaleTimeString();
          setSyncStatus("Success");
          setLastSync(timeStr);
          localStorage.setItem("rkv_nc_last_sync", timeStr);
          showToast("Vault successfully pulled from Nextcloud!");
        } else {
          setSyncStatus("Error");
          setAlertDialog({ message: "Remote sync payload has an invalid format." });
        }
      } else if (response.status === 404) {
        setSyncStatus("Idle");
        setAlertDialog({ message: "No remote backup file found on Nextcloud yet. Push your local data first." });
      } else {
        setSyncStatus("Error");
        let bodyText = "";
        try { bodyText = await response.text(); } catch(e){}
        setAlertDialog({ message: `Failed to download. Status: ${response.status} ${response.statusText}\nDetail: ${bodyText.substring(0, 150)}` });
      }
    } catch (err) {
      setSyncStatus("Error");
      setAlertDialog({ message: `Sync connection error: ${err.name} - ${err.message}\nMake sure your WebDAV URL is exact (e.g. https://server.com/remote.php/webdav/) and your App Password is correct.` });
    }
  };

  /* --- Authentication Handlers --- */

  const handleRegister = (e) => {
    e.preventDefault();
    const username = usernameInput.trim().toLowerCase();
    const password = passwordInput;
    if (!username || !password) {
      setAlertDialog({ message: "Please enter a username and password." });
      return;
    }

    const savedProfiles = localStorage.getItem("rkv_profiles");
    const profiles = savedProfiles ? JSON.parse(savedProfiles) : {};

    if (profiles[username]) {
      setAlertDialog({ message: "Username profile already exists in local vault storage." });
      return;
    }

    // Register profile locally
    profiles[username] = { password };
    localStorage.setItem("rkv_profiles", JSON.stringify(profiles));

    // Sign in automatically
    localStorage.setItem("rkv_active_user", username);
    setCurrentUser(username);
    setShowAuthForm(false);
    setUsernameInput("");
    setPasswordInput("");
    showToast(`Welcome! Vault profile "${username}" initialized.`);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const username = usernameInput.trim().toLowerCase();
    const password = passwordInput;
    if (!username || !password) {
      setAlertDialog({ message: "Please enter a username and password." });
      return;
    }

    const savedProfiles = localStorage.getItem("rkv_profiles");
    const profiles = savedProfiles ? JSON.parse(savedProfiles) : {};

    const profile = profiles[username];
    if (!profile || profile.password !== password) {
      setAlertDialog({ message: "Invalid vault username profile key or password PIN." });
      return;
    }

    localStorage.setItem("rkv_active_user", username);
    setCurrentUser(username);
    setShowAuthForm(false);
    setUsernameInput("");
    setPasswordInput("");
    showToast(`Logged into "${username}" secure space.`);
  };

  const handleLogout = () => {
    localStorage.removeItem("rkv_active_user");
    setCurrentUser(null);
    setProfileDropdownOpen(false);
    showToast("Vault Locked & Encrypted offline");
  };

  const handleChangePin = (e) => {
    e.preventDefault();
    const savedProfiles = localStorage.getItem("rkv_profiles");
    const profiles = savedProfiles ? JSON.parse(savedProfiles) : {};

    const profile = profiles[currentUser];
    if (!profile || profile.password !== oldPinInput) {
      setAlertDialog({ message: "Old password PIN is incorrect." });
      return;
    }

    profiles[currentUser].password = newPinInput;
    localStorage.setItem("rkv_profiles", JSON.stringify(profiles));
    setOldPinInput("");
    setNewPinInput("");
    setSettingsModalOpen(false);
    showToast("Password PIN successfully changed.");
  };

  const getCurrentUserPin = () => {
    try {
      const savedProfiles = localStorage.getItem("rkv_profiles");
      const profiles = savedProfiles ? JSON.parse(savedProfiles) : {};
      return profiles[currentUser]?.password || "";
    } catch (err) {
      console.error("Failed to get current user PIN", err);
      return "";
    }
  };

  const handleExportCryptoKey = async () => {
    const pin = getCurrentUserPin();
    if (!pin) {
      setAlertDialog({ message: "Unable to retrieve user PIN. Please log in again." });
      return;
    }
    
    const payload = {
      ncUrl: ncUrl.trim(),
      ncUser: ncUser.trim(),
      ncPass: ncPass.trim(),
      ncPath: ncPath.trim()
    };
    
    if (!payload.ncUrl || !payload.ncUser || !payload.ncPass) {
      setAlertDialog({ message: "Please configure your Nextcloud connection details completely before exporting the key." });
      return;
    }
    
    try {
      const encryptedKey = await encryptData(payload, pin);
      await navigator.clipboard.writeText(encryptedKey);
      showToast("Encrypted Sync Key copied to clipboard!");
    } catch (err) {
      console.error("Encryption failed:", err);
      setAlertDialog({ message: "Failed to generate cryptographic key." });
    }
  };

  const handleImportCryptoKey = async () => {
    const pin = getCurrentUserPin();
    if (!pin) {
      setAlertDialog({ message: "Unable to retrieve user PIN. Please log in again." });
      return;
    }
    
    const keyVal = cryptoKeyInput.trim();
    if (!keyVal) {
      setAlertDialog({ message: "Please paste an encrypted key to import." });
      return;
    }
    
    try {
      const decrypted = await decryptData(keyVal, pin);
      if (decrypted && typeof decrypted === "object") {
        setNcUrl(decrypted.ncUrl || "");
        setNcUser(decrypted.ncUser || "");
        setNcPass(decrypted.ncPass || "");
        setNcPath(decrypted.ncPath || "vault_backup.json");
        setCryptoKeyInput("");
        showToast("Sync settings imported and puzzle solved!");
      } else {
        setAlertDialog({ message: "Invalid key format." });
      }
    } catch (err) {
      console.error("Decryption failed:", err);
      setAlertDialog({ message: "Decryption failed. Please verify that this key was generated by this user profile PIN." });
    }
  };

  const refreshStorageInfo = async () => {
    try {
      let usage = 0, quota = 0, percent = 0;
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        usage = est.usage || 0;
        quota = est.quota || 0;
        percent = quota > 0 ? (usage / quota) * 100 : 0;
      }

      // Estimate localStorage size
      let lsBytes = 0;
      for (const key of Object.keys(localStorage)) {
        lsBytes += (localStorage.getItem(key) || "").length * 2; // 2 bytes per char (UTF-16)
      }

      setStorageInfo({ usage, quota, percent, lsUsed: lsBytes });
    } catch (err) {
      console.error("Storage estimate failed:", err);
      setStorageInfo({ usage: 0, quota: 0, percent: 0, lsUsed: 0 });
    }
  };

  const handleClearAllData = () => {
    setConfirmDialog({
      message: "WARNING: This will permanently delete all topics, resources, notes, and discoveries for this profile. Continue?",
      onConfirm: () => {
        setTopics([]);
        setUnsortedResources([]);
        setRecentlyViewed([]);
        setDeletedItems([]);
        setActiveTopicId(null);
        setSettingsModalOpen(false);
        showToast("Vault cleared completely.");
      }
    });
  };

  /* --- Database State Actions --- */

  const toggleStarTopic = (id) => {
    setTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, starred: !t.starred } : t))
    );
    const target = topics.find((t) => t.id === id);
    showToast(target.starred ? `Removed ${target.name} from Favorites` : `Added ${target.name} to Favorites`);
  };

  const createTopic = () => {
    const name = newTopicName.trim();
    if (!name) return;
    const accentKeys = Object.keys(ACCENTS);
    const accent = accentKeys[topics.length % accentKeys.length];
    const newTopic = {
      id: nextId("topic"),
      name,
      accent,
      tagline: "Topic container description details.",
      starred: false,
      resources: [],
      notes: [],
      discoveries: [],
      sources: [],
      timeline: [{ date: new Date().toISOString().split("T")[0], text: `Created topic "${name}".` }],
    };
    setTopics((prev) => [...prev, newTopic]);
    setNewTopicName("");
    setAddingTopic(false);
    setActiveTopicId(newTopic.id);
    setActiveView("topic");
    showToast(`Created topic "${name}"`);
  };

  const deleteTopic = (id) => {
    setConfirmDialog({
      message: "Are you sure you want to delete this topic and all its contents?",
      onConfirm: () => {
        const target = topics.find((t) => t.id === id);
        if (target) {
          setDeletedItems(prev => [...prev, { id: target.id, type: "Topic", title: target.name, deletedAt: new Date().toISOString() }]);
        }
        const origIdx = topics.findIndex((t) => t.id === id);
        const remaining = topics.filter((t) => t.id !== id);
        setTopics(remaining);
        if (activeTopicId === id && remaining.length > 0) {
          const nextActiveTopic = origIdx < remaining.length ? remaining[origIdx] : remaining[remaining.length - 1];
          setActiveTopicId(nextActiveTopic.id);
          setActiveView("topic");
        } else if (remaining.length === 0) {
          setActiveTopicId(null);
          setActiveView("all-topics");
        }
        showToast("Topic deleted");
      }
    });
  };

  const saveTopicEdit = () => {
    if (!editingTopic) return;
    setTopics((prev) =>
      prev.map((t) =>
        t.id === editingTopic.id
          ? { ...t, name: editingTopic.name, tagline: editingTopic.tagline }
          : t
      )
    );
    setEditingTopic(null);
    showToast("Topic details updated");
  };

  const addResourceDirect = () => {
    const title = newResourceTitle.trim();
    if (!title) return;

    const today = new Date().toISOString().split("T")[0];
    const resId = nextId("r");
    let finalUrl = newResourceUrl;
    if (newResourceUrl && newResourceUrl.startsWith("data:")) {
      const attachId = `attachment_${resId}`;
      attachmentDb.set(attachId, newResourceUrl).catch((err) => {
        console.error("Failed to save attachment in IndexedDB", err);
      });
      finalUrl = `db://${attachId}`;
    }

    const newRes = {
      id: resId,
      title,
      type: newResourceType,
      status: "Unread",
      date: today,
      sourceId: finalUrl ? nextId("s") : null,
      url: finalUrl,
    };

    if (activeView === "unsorted") {
      setUnsortedResources((prev) => [newRes, ...prev]);
      showToast("Resource added to Unsorted list");
    } else {
      setTopics((prev) =>
        prev.map((t) => {
          if (t.id !== activeTopicId) return t;
          const resources = [newRes, ...t.resources];
          const sources = finalUrl
            ? [
                {
                  id: newRes.sourceId,
                  type: newResourceType === "YouTube Video" ? "Video" : "Website",
                  title: `${title} Source`,
                  url: finalUrl,
                  date: today.split("-")[0],
                },
                ...t.sources,
              ]
            : t.sources;
          const timeline = [
            { date: today, text: `Added resource "${title}" (${newResourceType}).` },
            ...t.timeline,
          ];
          return { ...t, resources, sources, timeline };
        })
      );
      showToast("Resource added to topic");
    }

    setNewResourceTitle("");
    setNewResourceUrl("");
    setAddingResource(false);
    setActiveResourceId(newRes.id);
  };

  const cycleStatus = (resourceId) => {
    let nextStatus = "Unread";
    if (activeView === "unsorted") {
      setUnsortedResources((prev) =>
        prev.map((r) => {
          if (r.id !== resourceId) return r;
          const idx = STATUS_ORDER.indexOf(r.status);
          const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
          nextStatus = next;
          return { ...r, status: next };
        })
      );
    } else {
      setTopics((prev) =>
        prev.map((t) => {
          if (t.id !== activeTopicId) return t;
          const resources = t.resources.map((r) => {
            if (r.id !== resourceId) return r;
            const idx = STATUS_ORDER.indexOf(r.status);
            const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
            nextStatus = next;
            return { ...r, status: next };
          });
          const today = new Date().toISOString().split("T")[0];
          const resObj = resources.find((r) => r.id === resourceId);
          return {
            ...t,
            resources,
            timeline: [
              { date: today, text: `Changed status of "${resObj.title}" to ${nextStatus}.` },
              ...t.timeline,
            ],
          };
        })
      );
    }
    showToast(`Marked resource as ${nextStatus}`);
  };

  const deleteResource = (resourceId) => {
    setConfirmDialog({
      message: "Are you sure you want to delete this resource?",
      onConfirm: () => {
        let targetUrl = "";
        let resTitle = "Resource";
        if (activeView === "unsorted") {
          const res = unsortedResources.find((r) => r.id === resourceId);
          if (res) { targetUrl = res.url; resTitle = res.title; }
          setUnsortedResources((prev) => prev.filter((r) => r.id !== resourceId));
        } else {
          const res = activeTopic?.resources?.find((r) => r.id === resourceId);
          if (res) { targetUrl = res.url; resTitle = res.title; }
          setTopics((prev) =>
            prev.map((t) => {
              if (t.id !== activeTopicId) return t;
              return { ...t, resources: t.resources.filter((r) => r.id !== resourceId) };
            })
          );
        }
        setDeletedItems(prev => [...prev, { id: resourceId, type: "Resource", title: resTitle, deletedAt: new Date().toISOString() }]);
        if (targetUrl) cleanAttachmentIfDb(targetUrl);
        showToast("Resource deleted");
      }
    });
  };

  const editResource = (resource) => {
    if (resource.type === "Discovery") {
      setEditingDiscovery({
        id: resource.id,
        title: resource.title,
        statement: resource.statement || resource.title || "",
        verification: resource.verification || "Unverified",
        visibility: resource.visibility || "Private",
        date: resource.date,
        isUnsorted: true,
      });
      return;
    }

    let sourceUrl = "";
    if (activeTopic) {
      const src = activeTopic.sources.find((s) => s.id === resource.sourceId);
      if (src) sourceUrl = src.url;
    }
    
    // Find current topic id
    let currentTopicId = "unsorted";
    if (activeTopic) {
      currentTopicId = activeTopic.id;
    } else {
      const found = topics.find((t) => t.resources.some((r) => r.id === resource.id));
      if (found) currentTopicId = found.id;
    }

    setEditingResource({
      id: resource.id,
      title: resource.title,
      type: resource.type,
      sourceId: resource.sourceId,
      sourceUrl: sourceUrl,
      topicId: currentTopicId,
    });
  };

  const saveResourceEdit = (id, newTitle, newType, sourceId, newSourceUrl, targetTopicId) => {
    const titleTrim = newTitle.trim();
    if (!titleTrim) return;

    const isCurrentlyUnsorted = unsortedResources.some((r) => r.id === id);
    const currentTopicOfResource = topics.find((t) => t.resources.some((r) => r.id === id));
    
    let resourceObj = null;
    if (isCurrentlyUnsorted) {
      resourceObj = unsortedResources.find((r) => r.id === id);
    } else if (currentTopicOfResource) {
      resourceObj = currentTopicOfResource.resources.find((r) => r.id === id);
    }

    if (!resourceObj) return;

    let finalSourceUrl = newSourceUrl;
    if (newSourceUrl && newSourceUrl.startsWith("data:")) {
      const attachId = `attachment_${id}`;
      attachmentDb.set(attachId, newSourceUrl).catch((err) => {
        console.error("Failed to save attachment in IndexedDB", err);
      });
      finalSourceUrl = `db://${attachId}`;
    }

    const updatedResource = {
      ...resourceObj,
      title: titleTrim,
      type: newType,
      url: finalSourceUrl || resourceObj.url || "",
    };

    const currentTopicId = isCurrentlyUnsorted ? "unsorted" : currentTopicOfResource.id;

    if (currentTopicId !== targetTopicId) {
      // Remove from current container
      if (currentTopicId === "unsorted") {
        setUnsortedResources((prev) => prev.filter((r) => r.id !== id));
      } else {
        setTopics((prev) =>
          prev.map((t) => {
            if (t.id !== currentTopicId) return t;
            return { ...t, resources: t.resources.filter((r) => r.id !== id) };
          })
        );
      }

      // Add to target container
      if (targetTopicId === "unsorted") {
        setUnsortedResources((prev) => [updatedResource, ...prev]);
      } else {
        setTopics((prev) =>
          prev.map((t) => {
            if (t.id !== targetTopicId) return t;
            let updatedSources = t.sources;
            let newSourceId = updatedResource.sourceId || nextId("s");

            if (finalSourceUrl && finalSourceUrl.trim() !== "") {
              const srcExists = t.sources.some((s) => s.id === newSourceId);
              if (srcExists) {
                updatedSources = t.sources.map((s) =>
                  s.id === newSourceId ? { ...s, url: finalSourceUrl, title: `${titleTrim} Source` } : s
                );
              } else {
                updatedSources = [
                  {
                    id: newSourceId,
                    type: newType === "YouTube Video" || newType === "Video" ? "Video" : "Website",
                    title: `${titleTrim} Source`,
                    url: finalSourceUrl,
                    date: new Date().getFullYear().toString(),
                  },
                  ...t.sources,
                ];
              }
            }
            const today = new Date().toISOString().split("T")[0];
            return {
              ...t,
              resources: [{ ...updatedResource, sourceId: newSourceId }, ...t.resources],
              sources: updatedSources,
              timeline: [{ date: today, text: `Filed resource "${titleTrim}" into this topic.` }, ...t.timeline],
            };
          })
        );
      }
      showToast(`Filed resource into topic`);
    } else {
      // Inline edit
      if (currentTopicId === "unsorted") {
        setUnsortedResources((prev) =>
          prev.map((r) => (r.id === id ? updatedResource : r))
        );
      } else {
        setTopics((prev) =>
          prev.map((t) => {
            if (t.id !== currentTopicId) return t;
            let updatedSources = t.sources;
            let newSourceId = sourceId;
            if (finalSourceUrl !== undefined) {
              if (sourceId) {
                updatedSources = t.sources.map((s) =>
                  s.id === sourceId ? { ...s, url: finalSourceUrl, title: `${titleTrim} Source` } : s
                );
              } else if (finalSourceUrl.trim() !== "") {
                const newSrcId = nextId("s");
                updatedSources = [
                  {
                    id: newSrcId,
                    type: newType === "YouTube Video" || newType === "Video" ? "Video" : "Website",
                    title: `${titleTrim} Source`,
                    url: finalSourceUrl,
                    date: new Date().getFullYear().toString(),
                  },
                  ...t.sources,
                ];
                newSourceId = newSrcId;
              }
            }
            return {
              ...t,
              resources: t.resources.map((r) =>
                r.id === id ? { ...updatedResource, sourceId: newSourceId } : r
              ),
              sources: updatedSources,
            };
          })
        );
      }
      showToast("Resource details updated");
    }
    setEditingResource(null);
  };

  const deleteSource = (sourceId) => {
    setConfirmDialog({
      message: "Are you sure you want to delete this source? This will remove its bibliography card.",
      onConfirm: () => {
        let sourceTitle = "Source";
        if (activeTopic) {
          const src = activeTopic.sources.find(s => s.id === sourceId);
          if (src) sourceTitle = src.title;
        }
        setDeletedItems(prev => [...prev, { id: sourceId, type: "Source", title: sourceTitle, deletedAt: new Date().toISOString() }]);
        setTopics((prev) =>
          prev.map((t) => {
            if (t.id !== activeTopicId) return t;
            return {
              ...t,
              sources: t.sources.filter((s) => s.id !== sourceId),
              resources: t.resources.map((r) => r.sourceId === sourceId ? { ...r, sourceId: null } : r)
            };
          })
        );
        showToast("Source deleted");
      }
    });
  };

  const editSource = (source) => {
    setEditingSource({
      id: source.id,
      title: source.title,
      url: source.url || "",
      type: source.type || "Website",
      author: source.author || "",
      publisher: source.publisher || "",
      pages: source.pages || "",
      channel: source.channel || "",
      date: source.date || "",
    });
  };

  const saveSourceEdit = (id, fields) => {
    const titleTrim = fields.title.trim();
    if (!titleTrim) return;
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id !== activeTopicId) return t;
        return {
          ...t,
          sources: t.sources.map((s) => s.id === id ? { ...s, ...fields, title: titleTrim } : s)
        };
      })
    );
    setEditingSource(null);
    showToast("Source details updated");
  };

  const createNote = () => {
    const text = newNoteText.trim();
    if (!text) return;
    const today = new Date().toISOString().split("T")[0];
    const newN = {
      id: nextId("n"),
      text,
      date: today,
      convertedTo: null,
    };

    setTopics((prev) =>
      prev.map((t) => {
        if (t.id !== activeTopicId) return t;
        return {
          ...t,
          notes: [newN, ...t.notes],
          timeline: [{ date: today, text: "Jotted a new note." }, ...t.timeline],
        };
      })
    );
    setNewNoteText("");
    showToast("Note added");
  };

  const convertNoteToDiscovery = (noteId) => {
    const today = new Date().toISOString().split("T")[0];
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id !== activeTopicId) return t;
        const note = t.notes.find((n) => n.id === noteId);
        const newDisc = {
          id: nextId("d"),
          title: convertTitle.trim() || "Untitled Discovery",
          statement: convertStatement.trim() || note.text,
          verification: "Verified",
          visibility: "Private",
          relatedResources: [],
          relatedNotes: [noteId],
          date: today,
        };

        const notes = t.notes.map((n) =>
          n.id === noteId ? { ...n, convertedTo: newDisc.id } : n
        );

        return {
          ...t,
          notes,
          discoveries: [newDisc, ...t.discoveries],
          timeline: [
            { date: today, text: `Converted note into discovery "${newDisc.title}".` },
            ...t.timeline,
          ],
        };
      })
    );

    setConvertingNoteId(null);
    setConvertTitle("");
    setConvertStatement("");
    setActiveTab("Discoveries");
    showToast("Note converted successfully");
  };

  const quickCaptureSave = (topicTargetId, type, content, manualTitle = "", manualType = "") => {
    const today = new Date().toISOString().split("T")[0];
    if (type === "discovery") {
      const title = content.length > 40 ? content.slice(0, 40) + "..." : content;
      
      const disc = {
        id: nextId("d"),
        title,
        type: "Discovery",
        statement: content,
        verification: "Unverified",
        visibility: "Private",
        relatedResources: [],
        relatedNotes: [],
        status: "Unread",
        date: today,
      };

      if (topicTargetId === "unsorted") {
        setUnsortedResources((prev) => [disc, ...prev]);
        showToast("Quick captured discovery to Unsorted");
      } else {
        setTopics((prev) =>
          prev.map((t) => {
            if (t.id !== topicTargetId) return t;
            return {
              ...t,
              discoveries: [disc, ...t.discoveries],
              timeline: [{ date: today, text: `Captured discovery: "${title}"` }, ...t.timeline],
            };
          })
        );
        showToast(`Captured discovery under topic`);
      }
    } else {
      // Resource
      let title = manualTitle.trim() || content;
      let resType = manualType || "Website";
      if (!manualTitle && content) {
        try {
          const url = new URL(content.startsWith("http") || content.startsWith("data:") ? content : `https://${content}`);
          if (!content.startsWith("data:")) {
            title = url.hostname.replace("www.", "") + (url.pathname !== "/" ? url.pathname : "");
          } else {
            title = "Offline Attachment";
          }
          if (!manualType) {
            if (/youtube\.com|youtu\.be/.test(url.hostname)) resType = "YouTube Video";
            else if (url.pathname.endsWith(".pdf")) resType = "PDF";
          }
        } catch (err) {
          // Keep title as content
        }
      }

      const resId = nextId("r");
      let finalContent = content;
      if (content && content.startsWith("data:")) {
        const attachId = `attachment_${resId}`;
        attachmentDb.set(attachId, content).catch((err) => {
          console.error("Failed to save attachment in IndexedDB", err);
        });
        finalContent = `db://${attachId}`;
      }

      const resObj = {
        id: resId,
        title,
        type: resType,
        status: "Unread",
        date: today,
        sourceId: finalContent ? nextId("s") : null,
        url: finalContent,
      };

      if (topicTargetId === "unsorted") {
        setUnsortedResources((prev) => [resObj, ...prev]);
        showToast("Quick captured to Unsorted");
      } else {
        setTopics((prev) =>
          prev.map((t) => {
            if (t.id !== topicTargetId) return t;
            const src = finalContent
              ? {
                  id: resObj.sourceId,
                  type: resType === "YouTube Video" ? "Video" : (resType === "Video" ? "Video" : "Website"),
                  title,
                  url: finalContent,
                  date: today.split("-")[0],
                }
              : null;
            return {
              ...t,
              resources: [resObj, ...t.resources],
              sources: src ? [src, ...t.sources] : t.sources,
              timeline: [{ date: today, text: `Captured resource: "${title}"` }, ...t.timeline],
            };
          })
        );
        showToast(`Quick captured resource to topic`);
      }
    }
  };

  const deleteNote = (noteId) => {
    setConfirmDialog({
      message: "Are you sure you want to delete this note?",
      onConfirm: () => {
        setDeletedItems(prev => [...prev, { id: noteId, type: "Note", title: "Note", deletedAt: new Date().toISOString() }]);
        setTopics((prev) =>
          prev.map((t) => {
            if (t.id !== activeTopicId) return t;
            return {
              ...t,
              notes: t.notes.filter((n) => n.id !== noteId),
            };
          })
        );
        showToast("Note deleted");
      }
    });
  };

  const saveNoteEdit = () => {
    if (!editingNote) return;
    const textTrim = editingNote.text.trim();
    if (!textTrim) return;
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id !== activeTopicId) return t;
        return {
          ...t,
          notes: t.notes.map((n) => n.id === editingNote.id ? { ...n, text: textTrim } : n)
        };
      })
    );
    setEditingNote(null);
    showToast("Note updated");
  };

  const deleteDiscovery = (discId) => {
    setConfirmDialog({
      message: "Are you sure you want to delete this discovery?",
      onConfirm: () => {
        let discTitle = "Discovery";
        if (activeTopic) {
          const disc = activeTopic.discoveries.find(d => d.id === discId);
          if (disc) discTitle = disc.title;
        }
        setDeletedItems(prev => [...prev, { id: discId, type: "Discovery", title: discTitle, deletedAt: new Date().toISOString() }]);
        setTopics((prev) =>
          prev.map((t) => {
            if (t.id !== activeTopicId) return t;
            return {
              ...t,
              discoveries: t.discoveries.filter((d) => d.id !== discId),
            };
          })
        );
        showToast("Discovery deleted");
      }
    });
  };

  const saveDiscoveryEdit = () => {
    if (!editingDiscovery) return;
    const titleTrim = editingDiscovery.title.trim();
    if (!titleTrim) return;

    if (editingDiscovery.isUnsorted) {
      setUnsortedResources((prev) =>
        prev.map((r) =>
          r.id === editingDiscovery.id
            ? {
                ...r,
                title: titleTrim,
                statement: editingDiscovery.statement.trim(),
                verification: editingDiscovery.verification,
                visibility: editingDiscovery.visibility,
              }
            : r
        )
      );
      setEditingDiscovery(null);
      showToast("Discovery updated");
      return;
    }

    setTopics((prev) =>
      prev.map((t) => {
        if (t.id !== activeTopicId) return t;
        return {
          ...t,
          discoveries: d => d.id === editingDiscovery.id ? { ...d, title: titleTrim, statement: editingDiscovery.statement.trim(), verification: editingDiscovery.verification, visibility: editingDiscovery.visibility } : d
        };
      })
    );
    setEditingDiscovery(null);
    showToast("Discovery updated");
  };

  /* --- Global Search Parser --- */
  const buildSearchResults = () => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    const results = { Topics: [], Resources: [], Notes: [], Discoveries: [] };

    topics.forEach((t) => {
      if (t.name.toLowerCase().includes(q)) {
        results.Topics.push({ topicId: t.id, name: t.name, match: t.name });
      }
      t.resources.forEach((r) => {
        if (r.title.toLowerCase().includes(q)) {
          results.Resources.push({ topicId: t.id, name: t.name, tab: "Resources", match: r.title });
        }
      });
      t.notes.forEach((n) => {
        if (n.text.toLowerCase().includes(q)) {
          results.Notes.push({ topicId: t.id, name: t.name, tab: "Notes", match: n.text });
        }
      });
      t.discoveries.forEach((d) => {
        if (d.title.toLowerCase().includes(q) || d.statement.toLowerCase().includes(q)) {
          results.Discoveries.push({ topicId: t.id, name: t.name, tab: "Discoveries", match: d.title });
        }
      });
    });

    unsortedResources.forEach((r) => {
      if (r.title.toLowerCase().includes(q)) {
        results.Resources.push({ topicId: "unsorted", name: "Unsorted", tab: "Resources", match: r.title });
      }
    });

    const total = results.Topics.length + results.Resources.length + results.Notes.length + results.Discoveries.length;
    return total > 0 ? results : null;
  };

  const searchResults = buildSearchResults();

  /* --- Secondary Resource list render list --- */
  const getFilteredResources = () => {
    let list = [];
    if (activeView === "topic" && activeTopic) {
      list = activeTopic.resources;
    } else if (activeView === "unsorted") {
      list = unsortedResources;
    }
    
    if (resourceFilter === "All") return list;
    return list.filter((r) => r.status === resourceFilter);
  };

  const filteredResources = getFilteredResources();

  // Collated sources count for Sidebar
  const sourceCountMap = {};
  activeTopic?.resources?.forEach((r) => {
    if (r.sourceId) {
      const srcObj = activeTopic.sources.find((s) => s.id === r.sourceId);
      if (srcObj) {
        sourceCountMap[srcObj.title] = (sourceCountMap[srcObj.title] || 0) + 1;
      }
    }
  });

  // Enhanced keyboard shortcuts & Auto-close modals handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape - Close modals/drawers
      if (e.key === "Escape") {
        setSettingsModalOpen(false);
        setHelpModalOpen(false);
        setCaptureOpen(false);
        setAlertDialog(null);
        setConfirmDialog(null);
        setEditingResource(null);
        setEditingSource(null);
        setEditingDiscovery(null);
        setEditingNote(null);
        setAddingTopic(false);
        setAddingResource(false);
        setConvertingNoteId(null);
        setProfileDropdownOpen(false);
        setNotificationsOpen(false);
        setBookMenuOpen(false);
      }

      // Ctrl+Shift+T or Ctrl+Alt+T - Create New Topic
      if ((e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey) && (e.key === "T" || e.key === "t")) {
        e.preventDefault();
        setActiveView("all-topics");
        setActiveTopicId(null);
        setAddingTopic(true);
      }

      // Ctrl+[1-6] - Switch Workspace Tab
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key >= "1" && e.key <= "6") {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        if (tabIndex >= 0 && tabIndex < TABS.length) {
          setActiveTab(TABS[tabIndex]);
        }
      }

      // Ctrl+S - Save Active Form or Full Sync
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === "S" || e.key === "s")) {
        e.preventDefault();
        
        let saved = false;
        if (editingResource) {
          saveResourceEdit(
            editingResource.id,
            editingResource.title,
            editingResource.type,
            editingResource.sourceId,
            editingResource.sourceUrl,
            editingResource.topicId
          );
          saved = true;
        } else if (editingSource) {
          saveSourceEdit(editingSource.id, editingSource);
          saved = true;
        } else if (editingDiscovery) {
          saveDiscoveryEdit();
          saved = true;
        } else if (editingNote) {
          saveNoteEdit();
          saved = true;
        } else if (editingTopic) {
          saveTopicEdit();
          saved = true;
        } else if (addingTopic) {
          createTopic();
          saved = true;
        } else if (addingResource) {
          addResourceDirect();
          saved = true;
        } else if (convertingNoteId) {
          convertNoteToDiscovery(convertingNoteId);
          saved = true;
        } else if (captureOpen) {
          const selectEl = document.getElementById("quick-capture-topic-select");
          const topicVal = selectEl ? selectEl.value : "unsorted";
          if (captureMode === "discovery") {
            const textEl = document.getElementById("quick-capture-textarea");
            if (textEl && textEl.value.trim()) {
              quickCaptureSave(topicVal, "discovery", textEl.value.trim());
              setCaptureOpen(false);
              saved = true;
            }
          } else {
            if (captureResType === "Discussion") {
              if (captureResTranscript.trim()) {
                const encoded = "data:text/plain;charset=utf-8," + encodeURIComponent(captureResTranscript);
                quickCaptureSave(topicVal, "resource", encoded, captureResTitle || "Discussion Log", "Discussion");
                setCaptureOpen(false);
                saved = true;
              } else {
                setAlertDialog({ message: "Please paste your chat log before saving." });
              }
            } else {
              quickCaptureSave(topicVal, "resource", captureResUrl, captureResTitle, captureResType);
              setCaptureOpen(false);
              saved = true;
            }
          }
        }

        if (!saved) {
          // If no form is active, trigger full sync
          syncToNextcloud();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    editingResource,
    editingSource,
    editingDiscovery,
    editingNote,
    editingTopic,
    addingTopic,
    addingResource,
    convertingNoteId,
    captureOpen,
    captureMode,
    captureResType,
    captureResUrl,
    captureResTitle,
    captureResTranscript,
    topics,
    newTopicName,
    newResourceTitle,
    newResourceUrl,
    newResourceType,
    newNoteText,
    convertTitle,
    convertStatement
  ]);

  /* ------------------------------------------------------------------ */
  /* Render Landing & Auth screen when not signed in                    */
  /* ------------------------------------------------------------------ */

  if (!currentUser) {
    return (
      <div className="landing-container">
        <div className="landing-backdrop-grid" />
        
        {!showAuthForm ? (
          <>
            <div className="landing-header">
              <div className="landing-logo">🤖</div>
              <h1 className="landing-title">Research Knowledge Vault</h1>
              <p className="landing-tagline">
                An offline-first simulation & research database. Capture discoveries, logs, and citations instantly inside your browser.
              </p>
            </div>

            <div className="landing-features">
              <div className="landing-feature-card">
                <div className="landing-feature-icon"><Shield size={20} /></div>
                <h3 className="landing-feature-title">Offline & Local</h3>
                <p className="landing-feature-desc">All captured links, notes, and bibliography cards remain locally inside your browser's space.</p>
              </div>

              <div className="landing-feature-card">
                <div className="landing-feature-icon"><Sparkles size={20} /></div>
                <h3 className="landing-feature-title">Quick Capture</h3>
                <p className="landing-feature-desc">Optimize for instant inputs. Jot resources and learned discoveries in seconds with zero friction.</p>
              </div>

              <div className="landing-feature-card">
                <div className="landing-feature-icon"><Search size={20} /></div>
                <h3 className="landing-feature-title">Global Indexing</h3>
                <p className="landing-feature-desc">Search topics, citations, attachments, and note transcripts globally with inline filters.</p>
              </div>

              <div className="landing-feature-card">
                <div className="landing-feature-icon"><BookMarked size={20} /></div>
                <h3 className="landing-feature-title">Source Bibliographies</h3>
                <p className="landing-feature-desc">Generate timelines, bibliography indexes, and metadata tables automatically as you read.</p>
              </div>
            </div>

            <div className="landing-actions">
              <button className="btn-landing-primary" onClick={() => { setAuthMode("login"); setShowAuthForm(true); }}>
                Enter Vault Room
              </button>
              <button className="btn-landing-secondary" onClick={() => { setAuthMode("register"); setShowAuthForm(true); }}>
                Create Local Profile
              </button>
            </div>
          </>
        ) : (
          <div className="auth-card">
            <div className="auth-tabs">
              <button
                className={`auth-tab ${authMode === "login" ? "active" : ""}`}
                onClick={() => setAuthMode("login")}
              >
                Log In
              </button>
              <button
                className={`auth-tab ${authMode === "register" ? "active" : ""}`}
                onClick={() => setAuthMode("register")}
              >
                Create Profile
              </button>
            </div>

            <h2 className="serif" style={{ fontSize: "22px", marginBottom: "16px", textAlign: "center" }}>
              {authMode === "login" ? "Welcome Back" : "Initialize Local Vault"}
            </h2>

            <form className="auth-form" onSubmit={authMode === "login" ? handleLogin : handleRegister}>
              <div className="form-group">
                <label className="form-label">Vault Profile Name</label>
                <input
                  type="text"
                  placeholder="e.g. researcher_john"
                  className="form-input"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password PIN / Key</label>
                <input
                  type="password"
                  placeholder="••••"
                  className="form-input"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
              </div>

              <button type="submit" className="auth-btn-submit">
                {authMode === "login" ? "Unlock Vault" : "Create & Open Vault"}
              </button>

              <button
                type="button"
                className="btn-ghost"
                style={{ marginTop: "8px", alignSelf: "center" }}
                onClick={() => setShowAuthForm(false)}
              >
                Back to overview
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Main Dashboard layout once authenticated                          */
  /* ------------------------------------------------------------------ */

  return (
    <div className="app-container">
      
      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification">
          <Database size={16} style={{ color: "#C9974D" }} />
          <span>{toast}</span>
        </div>
      )}

      {/* ── MOBILE HEADER ──────────────────────────────────────────── */}
      <div className="mobile-topbar">
        <div className="book-menu-wrapper" style={{ position: 'relative' }}>
          <button 
            className="mobile-header-btn" 
            onClick={() => setBookMenuOpen(!bookMenuOpen)} 
            title="Menu"
            style={{ color: bookMenuOpen ? "var(--accent-brass)" : "inherit" }}
          >
            <BookOpen size={20} />
          </button>
          {bookMenuOpen && (
            <div className="profile-dropdown-menu" style={{ left: 0, right: 'auto', top: '40px', zIndex: 100 }}>
              <div className="profile-menu-header">
                <div className="profile-menu-name">Vault Options</div>
                <div className="profile-menu-sub">{currentUser}'s Workspace</div>
              </div>
              <button className="profile-menu-item" onClick={() => { setBookMenuOpen(false); setSettingsModalOpen(true); refreshStorageInfo(); }}>
                <Settings size={14} />
                <span>Vault Settings</span>
              </button>
              <button className="profile-menu-item" onClick={() => { setBookMenuOpen(false); setHelpModalOpen(true); }}>
                <HelpCircle size={14} />
                <span>Documentation</span>
              </button>
              <button className="profile-menu-item logout" onClick={handleLogout}>
                <LogOut size={14} />
                <span>Lock Vault</span>
              </button>
            </div>
          )}
        </div>
        <span className="mobile-topbar-title serif">
          {activeView === "topic" && activeTopic ? activeTopic.name : "Research Vault"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button className="mobile-header-btn" onClick={() => { setCaptureMode("discovery"); setCaptureOpen(true); setSettingsModalOpen(false); setMobileSidebarOpen(false); }} title="New Capture">
            <Plus size={20} />
          </button>
          <button className="mobile-header-btn" onClick={() => setMobileSearchOpen(true)} title="Search">
            <Search size={18} />
          </button>
        </div>
      </div>

      {/* ── MOBILE SEARCH OVERLAY ──────────────────────────────────── */}
      {mobileSearchOpen && (
        <div className="mobile-search-overlay">
          <div className="mobile-search-header">
            <div className="search-input-wrapper" style={{ flex: 1 }}>
              <Search size={15} className="search-input-icon" />
              <input
                autoFocus
                type="text"
                placeholder="Search topics, resources, notes..."
                className="search-input-field"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchFocused(true); }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", display: "flex" }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <button className="mobile-header-btn" onClick={() => { setMobileSearchOpen(false); setSearchQuery(""); setSearchFocused(false); }}>
              Cancel
            </button>
          </div>
          {searchResults && (
            <div className="mobile-search-results">
              {Object.entries(searchResults).map(([section, items]) => {
                if (items.length === 0) return null;
                return (
                  <div key={section} className="search-results-section">
                    <div className="search-section-header">{section}</div>
                    {items.map((item, idx) => (
                      <button
                        key={idx}
                        className="search-result-item"
                        onClick={() => {
                          if (item.topicId === "unsorted") { setActiveView("unsorted"); }
                          else { setActiveTopicId(item.topicId); setActiveView("topic"); setActiveTab(item.tab || "Overview"); }
                          setSearchQuery("");
                          setSearchFocused(false);
                          setMobileSearchOpen(false);
                          setCaptureOpen(false);
                          setSettingsModalOpen(false);
                        }}
                      >
                        <span className="search-item-title">{item.match}</span>
                        <span className="search-item-topic">{item.name}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          {searchQuery && !searchResults && (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-dim)", fontSize: "14px" }}>
              No results for "{searchQuery}"
            </div>
          )}
          {!searchQuery && (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-dim)", fontSize: "13px" }}>
              Search across all topics, resources, notes, and discoveries
            </div>
          )}
        </div>
      )}

      {/* ── MOBILE SIDEBAR BACKDROP ────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div className="drawer-overlay" style={{ zIndex: 48 }} onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* 3. MAIN WORKSPACE */}
      <main className="main-workspace">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className={`topbar-quick-nav ${tourStep === 3 ? "tour-spotlight-highlight" : ""}`}>
              <button 
                className={`topbar-nav-btn ${activeView === "unsorted" ? "active" : ""}`}
                onClick={() => { setActiveView("unsorted"); setActiveTopicId(null); }}
                title="Unsorted"
              >
                <HelpCircle size={14} />
                <span>Unsorted</span>
              </button>
              <button 
                className={`topbar-nav-btn ${activeView === "recently-viewed" ? "active" : ""}`}
                onClick={() => { setActiveView("recently-viewed"); setActiveTopicId(null); }}
                title="Recently Viewed"
              >
                <Clock size={14} />
                <span>Recent</span>
              </button>
              <button 
                className={`topbar-nav-btn ${activeView === "appendix" ? "active" : ""}`}
                onClick={() => { setActiveView("appendix"); setActiveTopicId(null); }}
                title="Appendix & Index"
              >
                <BookOpen size={14} />
                <span>Appendix</span>
              </button>
            </div>
          </div>
          <div className={`search-container ${tourStep === 2 ? "tour-spotlight-highlight" : ""}`}>
            <div className="search-input-wrapper">
              <Search size={15} className="search-input-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search anything..."
                className="search-input-field"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchFocused(true);
                }}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              />
              <span className="search-shortcut">Ctrl K</span>
            </div>

            {/* Global Search Results Dropdown */}
            {searchFocused && searchResults && (
              <div className="search-results-dropdown">
                {Object.entries(searchResults).map(([section, items]) => {
                  if (items.length === 0) return null;
                  return (
                    <div key={section} className="search-results-section">
                      <div className="search-section-header">{section}</div>
                      {items.map((item, idx) => (
                        <button
                          key={idx}
                          className="search-result-item"
                          onClick={() => {
                            if (item.topicId === "unsorted") {
                              setActiveView("unsorted");
                            } else {
                              setActiveTopicId(item.topicId);
                              setActiveView("topic");
                              setActiveTab(item.tab || "Overview");
                            }
                            setSearchQuery("");
                            setSearchFocused(false);
                            setCaptureOpen(false);
                            setSettingsModalOpen(false);
                          }}
                        >
                          <span className="search-item-title">{item.match}</span>
                          <span className="search-item-topic">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="topbar-right">
            <button
              className={`btn-new-capture ${tourStep === 4 ? "tour-spotlight-highlight" : ""}`}
              onClick={() => {
                setCaptureMode("discovery");
                setCaptureOpen(true);
              }}
            >
              <Plus size={16} />
              <span>New</span>
            </button>
            <button 
              className="topbar-icon-btn" 
              onClick={() => {
                const newTheme = theme === "dark" ? "light" : "dark";
                setTheme(newTheme);
                showToast(`Switched to ${newTheme} mode`);
              }} 
              title="Toggle Theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            
            {/* Notifications Dropdown Toggle */}
            <div className="topbar-dropdown-wrapper">
              <button className="topbar-icon-btn" onClick={() => setNotificationsOpen(!notificationsOpen)} title="Notifications">
                <Bell size={16} />
              </button>
              {notificationsOpen && (
                <div className="topbar-dropdown-menu">
                  <div className="dropdown-header-title">Notifications</div>
                  {notifications.map((n) => (
                    <div key={n.id} className="dropdown-list-item">
                      <span>{n.text}</span>
                      <span className="dropdown-item-time">{n.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Book/Research Dropdown Menu */}
            <div className="book-menu-wrapper" style={{ position: 'relative' }}>
              <button 
                className="topbar-icon-btn" 
                onClick={() => setBookMenuOpen(!bookMenuOpen)}
                title="Research actions menu"
                style={{ color: bookMenuOpen ? "var(--accent-brass)" : "var(--text-dim)" }}
              >
                <BookOpen size={16} />
              </button>
              {bookMenuOpen && (
                <div className="profile-dropdown-menu" style={{ right: 0, left: 'auto', top: '35px' }}>
                  <div className="profile-menu-header">
                    <div className="profile-menu-name">Vault Options</div>
                    <div className="profile-menu-sub">{currentUser}'s Workspace</div>
                  </div>
                  {activeView === "topic" && (
                    <button className="profile-menu-item" onClick={() => { setBookMenuOpen(false); setAboutCollapsed(!aboutCollapsed); }}>
                      <Info size={14} />
                      <span>{aboutCollapsed ? "Show About Panel" : "Hide About Panel"}</span>
                    </button>
                  )}
                  <button className="profile-menu-item" onClick={() => { setBookMenuOpen(false); setSettingsModalOpen(true); refreshStorageInfo(); }}>
                    <Settings size={14} />
                    <span>Vault Settings</span>
                  </button>
                  <button className="profile-menu-item" onClick={() => { setBookMenuOpen(false); setHelpModalOpen(true); }}>
                    <HelpCircle size={14} />
                    <span>Documentation</span>
                  </button>
                  <button className="profile-menu-item logout" onClick={handleLogout}>
                    <LogOut size={14} />
                    <span>Lock Vault</span>
                  </button>
                </div>
              )}
            </div>


          </div>
        </header>

        {/* Workspace Body */}
        {activeView === "all-topics" && (
          <div className={`workspace-page ${tourStep === 1 ? "tour-spotlight-highlight" : ""}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', padding: '20px', position: 'relative', zIndex: 5 }}>
            <div style={{ textAlign: 'center' }}>
              <h2 className="serif" style={{ fontSize: '32px', marginBottom: '12px', color: 'var(--text-primary)' }}>Research Knowledge Vault</h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 20px', fontSize: '14px', lineHeight: '1.6' }}>
                Select an existing research topic from the radial scroller below, or initialize a new compiler environment.
              </p>
              <button
                className="btn-solid"
                style={{ background: 'var(--accent-brass)', color: 'black', padding: '10px 24px', fontSize: '14.5px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                onClick={() => setAddingTopic(true)}
              >
                <Plus size={16} />
                <span>Create New Topic</span>
              </button>
            </div>
          </div>
        )}

        {activeView === "unsorted" && (
          <div className="workspace-page">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <h2 className="serif" style={{ fontSize: "26px", marginBottom: "4px" }}>Unsorted</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", margin: 0 }}>
                  Contains quick resources pasted without an assigned topic container.
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12.5px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>LABEL:</span>
                <select
                  className="form-input"
                  style={{ padding: "6px 12px", background: "var(--bg-panel)", borderRadius: "6px", cursor: "pointer" }}
                  value={resourceFilter}
                  onChange={(e) => setResourceFilter(e.target.value)}
                >
                  <option value="All">ALL STATUSES</option>
                  {STATUS_ORDER.map((status) => (
                    <option key={status} value={status}>{status.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
            {unsortedResources.filter((r) => resourceFilter === "All" || r.status === resourceFilter).length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "60px", background: "rgba(255,255,255,0.01)", border: "1px dashed var(--border-color)", padding: "30px", borderRadius: "8px" }}>
                <HelpCircle size={48} style={{ color: "var(--text-dim)", marginBottom: "14px" }} />
                <h3 className="serif" style={{ fontSize: "18px" }}>No items matching status</h3>
                <p style={{ color: "var(--text-dim)" }}>Everything matches your filter cleanly.</p>
              </div>
            ) : (
              <div className="resources-tab-list">
                {(() => {
                  const filtered = unsortedResources.filter((r) => resourceFilter === "All" || r.status === resourceFilter);
                  return (
                    <>
                      {filtered.slice(0, visibleUnsortedCount).map((r) => {
                        const Icon = TYPE_ICON[r.type] || FileText;
                        return (
                          <div key={r.id} className="resource-detail-card" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                              <div className="resource-detail-left" style={{ cursor: "pointer" }} onClick={() => { editResource(r); addToRecentlyViewed(r.id, "resource", r.title, "Unsorted Inbox"); }}>
                                <Icon size={18} className="resource-detail-icon" style={{ marginTop: "3px" }} />
                                <div className="resource-detail-info">
                                  <h4 className="resource-detail-title">{r.title}</h4>
                                  <span className="resource-detail-meta">
                                    {r.type} • Unsorted Inbox
                                    {r.url && !r.url.startsWith("data:") && !r.url.startsWith("db://") && (
                                      <>
                                        {" • "}
                                        <a 
                                          href={r.url.startsWith("http") ? r.url : `https://${r.url}`} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          style={{ color: "var(--accent-brass)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "2px", marginLeft: "4px" }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          Visit link <Link2 size={10} />
                                        </a>
                                      </>
                                    )}
                                  </span>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <button className={`status-pill status-${r.status.toLowerCase()}`} onClick={() => cycleStatus(r.id)}>
                                  {r.status}
                                </button>
                                <button 
                                  style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
                                  onClick={() => editResource(r)}
                                  title="Edit resource title"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button 
                                  style={{ background: "none", border: "none", color: "var(--accent-garnet)", cursor: "pointer" }}
                                  onClick={() => deleteResource(r.id)}
                                  title="Delete resource"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            {r.url && (r.url.startsWith("data:") || r.url.startsWith("db://")) && (
                              <OfflineAttachmentPreview url={r.url} title={r.title} type={r.type} />
                            )}
                          </div>
                        );
                      })}
                      {filtered.length > visibleUnsortedCount && (
                        <button 
                          className="btn-load-more" 
                          onClick={() => setVisibleUnsortedCount(prev => prev + 15)}
                        >
                          Load More Resources ({filtered.length - visibleUnsortedCount} remaining)
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {activeView === "recently-viewed" && (
          <div className="workspace-page">
            <h2 className="serif" style={{ fontSize: "26px", marginBottom: "10px" }}>Recently Viewed</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "20px", fontSize: "13.5px" }}>
              Quick links to your most recently accessed topic workspaces and resources.
            </p>
            {recentlyViewed.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "60px" }}>
                <Clock size={48} style={{ color: "var(--text-dim)", marginBottom: "14px" }} />
                <h3 className="serif" style={{ fontSize: "18px" }}>No viewing history yet</h3>
                <p style={{ color: "var(--text-dim)" }}>Start clicking resources and topics to generate history logs.</p>
              </div>
            ) : (
              <div className="resources-tab-list">
                {recentlyViewed.map((item, idx) => (
                  <div
                    key={idx}
                    className="resource-detail-card"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      if (item.type === "topic") {
                        setActiveTopicId(item.id);
                        setActiveView("topic");
                        setActiveTab("Overview");
                      } else {
                        // Resource
                        const found = topics.find((t) => t.resources.some((r) => r.id === item.id));
                        if (found) {
                          setActiveTopicId(found.id);
                          setActiveView("topic");
                          setActiveTab("Resources");
                          setActiveResourceId(item.id);
                        } else {
                          const isUnsorted = unsortedResources.some((r) => r.id === item.id);
                          if (isUnsorted) {
                            setActiveView("unsorted");
                            setActiveResourceId(item.id);
                          }
                        }
                      }
                      setCaptureOpen(false);
                      setSettingsModalOpen(false);
                    }}
                  >
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      {item.type === "topic" ? <BookOpen size={18} /> : <FileText size={18} />}
                      <div>
                        <h4 style={{ fontSize: "14px", fontWeight: "600" }}>{item.name}</h4>
                        <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                          Type: {item.type} {item.topicName ? `• Topic: ${item.topicName}` : ""} • Accessed at {item.timestamp}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === "appendix" && (
          <div className="workspace-page">
            <h2 className="serif" style={{ fontSize: "26px", marginBottom: "10px" }}>Appendix & Index</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "20px", fontSize: "13.5px" }}>
              A dictionary-style glossary index of all resources, discoveries, and sources compiled across all topics, sorted alphabetically.
            </p>
            {(() => {
              // Aggregate all items
              const appendixItems = [];
              topics.forEach((t) => {
                appendixItems.push({
                  id: t.id,
                  title: t.name,
                  type: "Topic",
                  detailType: t.tagline || "Topic Workspace",
                  topicName: t.name,
                  topicId: t.id,
                  tab: "Overview",
                });
                t.resources.forEach((r) => {
                  appendixItems.push({
                    id: r.id,
                    title: r.title,
                    type: "Resource",
                    detailType: r.type,
                    topicName: t.name,
                    topicId: t.id,
                    tab: "Resources",
                  });
                });
                t.discoveries.forEach((d) => {
                  appendixItems.push({
                    id: d.id,
                    title: d.title,
                    type: "Discovery",
                    detailType: d.verification,
                    topicName: t.name,
                    topicId: t.id,
                    tab: "Discoveries",
                  });
                });
                t.sources.forEach((s) => {
                  appendixItems.push({
                    id: s.id,
                    title: s.title,
                    type: "Source",
                    detailType: s.type,
                    topicName: t.name,
                    topicId: t.id,
                    tab: "Sources",
                  });
                });
              });

              // Sort alphabetically
              appendixItems.sort((a, b) => a.title.localeCompare(b.title));

              if (appendixItems.length === 0) {
                return (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "60px" }}>
                    <BookOpen size={48} style={{ color: "var(--text-dim)", marginBottom: "14px" }} />
                    <h3 className="serif" style={{ fontSize: "18px" }}>Appendix is empty</h3>
                    <p style={{ color: "var(--text-dim)" }}>Start capturing resources, sources, or discoveries to generate indexes.</p>
                  </div>
                );
              }

              // Group by first letter
              const groups = {};
              appendixItems.forEach((item) => {
                const firstChar = item.title.trim().charAt(0).toUpperCase();
                const letter = /^[A-Z]$/.test(firstChar) ? firstChar : "#";
                if (!groups[letter]) groups[letter] = [];
                groups[letter].push(item);
              });

              const letters = Object.keys(groups).sort((a, b) => {
                if (a === "#") return 1;
                if (b === "#") return -1;
                return a.localeCompare(b);
              });

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* A-Z jump bar */}
                  <div className="appendix-az-jumpbar">
                    {letters.map((l) => (
                      <a
                        key={l}
                        href={`#appendix-sec-${l}`}
                        className="az-jump-link"
                        onClick={(e) => {
                          e.preventDefault();
                          const el = document.getElementById(`appendix-sec-${l}`);
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        {l}
                      </a>
                    ))}
                  </div>

                  {/* Dictionary sections */}
                  <div className="appendix-sections" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {letters.map((l) => (
                      <div key={l} id={`appendix-sec-${l}`} className="appendix-letter-section" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div className="appendix-letter-header">
                          {l}
                        </div>
                        <div className="appendix-grid-container">
                          {groups[l].map((item) => (
                            <div
                              key={item.id}
                              className="appendix-item-card"
                              onClick={() => {
                                setActiveTopicId(item.topicId);
                                setActiveView("topic");
                                setActiveTab(item.tab);
                                setCaptureOpen(false);
                                setSettingsModalOpen(false);
                                if (item.tab === "Resources") {
                                  setActiveResourceId(item.id);
                                }
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                                <span className={`appendix-badge badge-${item.type.toLowerCase()}`}>
                                  {item.type}
                                </span>
                                <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                                  in <strong style={{ color: "var(--text-secondary)" }}>{item.topicName}</strong>
                                </span>
                              </div>
                              <h4 className="appendix-item-title">
                                {item.title}
                              </h4>
                              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                                Type: {item.detailType}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeView === "topic" && activeTopic && (
          <div className="workspace-content">
            <div className="workspace-main-panel">
              {/* Topic Header details */}
              <div className="topic-header-section">
                <div className="topic-header-left">
                  <div className="topic-avatar-icon" style={{ background: accentHex }}>
                    {activeTopic.name.slice(0, 2).toUpperCase()}
                  </div>
                  {editingTopic?.id === activeTopic.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: "20px", fontWeight: "600" }}
                        value={editingTopic.name}
                        onChange={(e) => setEditingTopic({ ...editingTopic, name: e.target.value })}
                      />
                      <input
                        type="text"
                        className="form-input"
                        value={editingTopic.tagline}
                        onChange={(e) => setEditingTopic({ ...editingTopic, tagline: e.target.value })}
                      />
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button className="btn-solid" style={{ background: "var(--accent-brass)", color: "black" }} onClick={saveTopicEdit}>Save</button>
                        <button className="btn-ghost" onClick={() => setEditingTopic(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="topic-title-area">
                      <div className="topic-title-wrapper">
                        <h2 className="topic-title-text">{activeTopic.name}</h2>
                        <button
                          style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                          onClick={() => setEditingTopic({ id: activeTopic.id, name: activeTopic.name, tagline: activeTopic.tagline })}
                          title="Edit Topic title/tagline"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", marginLeft: "4px" }}
                          onClick={() => deleteTopic(activeTopic.id)}
                          title="Delete topic container"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="topic-tagline-text">{activeTopic.tagline}</p>
                    </div>
                  )}
                </div>

                <div className="topic-header-actions">
                  <button
                    className="btn-icon-square"
                    style={{ color: activeTopic.starred ? "#C9974D" : "var(--text-secondary)" }}
                    onClick={() => toggleStarTopic(activeTopic.id)}
                    title="Star Topic"
                  >
                    <Star size={16} fill={activeTopic.starred ? "#C9974D" : "none"} />
                  </button>
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="topic-stats-grid">
                <div className="stat-card" onClick={() => setActiveTab("Resources")}>
                  <span className="stat-card-num">{activeTopic.resources.length}</span>
                  <span className="stat-card-label">Resources</span>
                  <span className="stat-card-sub">
                    {activeTopic.resources.filter((r) => r.status === "Unread").length} unread
                  </span>
                </div>
                <div className="stat-card" onClick={() => setActiveTab("Notes")}>
                  <span className="stat-card-num">{activeTopic.notes.length}</span>
                  <span className="stat-card-label">Notes</span>
                  <span className="stat-card-sub">Updated today</span>
                </div>
                <div className="stat-card" onClick={() => setActiveTab("Discoveries")}>
                  <span className="stat-card-num">{activeTopic.discoveries.length}</span>
                  <span className="stat-card-label">Discoveries</span>
                  <span className="stat-card-sub">
                    {activeTopic.discoveries.filter((d) => d.verification === "Verified").length} verified
                  </span>
                </div>
                <div className="stat-card" onClick={() => setActiveTab("Sources")}>
                  <span className="stat-card-num">{activeTopic.sources.length}</span>
                  <span className="stat-card-label">Sources</span>
                  <span className="stat-card-sub">View list</span>
                </div>

                {/* Progress Tracker Card */}
                <div className="progress-stat-card" style={{ "--accent-color": accentHex }}>
                  <div>
                    <span className="stat-card-label" style={{ display: "block", marginBottom: "4px" }}>Progress</span>
                    <span className="mono" style={{ fontSize: "16px", fontWeight: "600" }}>
                      {activeTopic.resources.length > 0
                        ? Math.round(
                            (activeTopic.resources.filter((r) => r.status === "Finished").length /
                              activeTopic.resources.length) *
                              100
                          )
                        : 0}
                      %
                    </span>
                    <span style={{ display: "block", fontSize: "9.5px", color: "var(--text-dim)", marginTop: "2px" }}>
                      Keep going!
                    </span>
                  </div>

                  <div className="progress-circle-wrap">
                    <svg className="progress-circle-svg">
                      <circle className="progress-circle-bg" cx="32" cy="32" r="28" />
                      <circle
                        className="progress-circle-fill"
                        cx="32"
                        cy="32"
                        r="28"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${
                          2 *
                          Math.PI *
                          28 *
                          (1 -
                            (activeTopic.resources.length > 0
                              ? activeTopic.resources.filter((r) => r.status === "Finished").length /
                                activeTopic.resources.length
                              : 0))
                        }`}
                      />
                    </svg>
                    <div className="progress-circle-text">
                      {activeTopic.resources.filter((r) => r.status === "Finished").length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Workspace tabs header */}
              <div className="workspace-tabs-row">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    className={`workspace-tab-btn ${activeTab === tab ? "active" : ""}`}
                    style={{ "--accent-color": accentHex }}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Render Tab Contents */}
              <div className="tab-content-view">
                
                {/* TAB 1: OVERVIEW */}
                {activeTab === "Overview" && (
                  <div>
                    <div className="overview-stats-grid">
                      <div className="overview-block">
                        <h3 className="overview-block-title">Key Metrics</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Total Captured resources:</span>
                            <span className="mono">{activeTopic.resources.length}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Distilled Discoveries:</span>
                            <span className="mono" style={{ color: "var(--accent-verdigris)" }}>{activeTopic.discoveries.length}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Unread items queue:</span>
                            <span className="mono">{activeTopic.resources.filter((r) => r.status === "Unread").length}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Completed items:</span>
                            <span className="mono">{activeTopic.resources.filter((r) => r.status === "Finished").length}</span>
                          </div>
                        </div>
                      </div>

                      <div className="overview-block">
                        <h3 className="overview-block-title">Activity Status</h3>
                        <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                          All records are stored locally on your device. The last registered activity in this workspace was logged on{" "}
                          <strong style={{ color: "var(--text-primary)" }}>
                            {activeTopic.timeline.length > 0 ? fmtDate(activeTopic.timeline[0].date) : "N/A"}
                          </strong>.
                        </p>
                      </div>
                    </div>

                    {activeTopic.resources.length === 0 && (
                      <div className="empty-state">
                        <Sparkles size={32} />
                        <div className="empty-title">Nothing captured yet</div>
                        <p className="empty-body">
                          Start your workflow by pasting web links or creating discoveries using the capture button.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: RESOURCES DETAIL */}
                {activeTab === "Resources" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                      <h3 className="serif" style={{ fontSize: "18px", margin: 0 }}>Workspace Resources</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>LABEL:</span>
                        <select
                          className="form-input"
                          style={{ padding: "5px 10px", background: "var(--bg-panel)", borderRadius: "6px", cursor: "pointer" }}
                          value={resourceFilter}
                          onChange={(e) => setResourceFilter(e.target.value)}
                        >
                          <option value="All">ALL STATUSES</option>
                          {STATUS_ORDER.map((status) => (
                            <option key={status} value={status}>{status.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {activeTopic.resources.length === 0 ? (
                      <div className="empty-state">
                        <Link2 size={32} />
                        <div className="empty-title">No resources added</div>
                        <p className="empty-body">Create new resources using the capture button.</p>
                      </div>
                    ) : activeTopic.resources.filter((r) => resourceFilter === "All" || r.status === resourceFilter).length === 0 ? (
                      <div className="empty-state">
                        <Link2 size={32} />
                        <div className="empty-title">No resources matching status</div>
                        <p className="empty-body">All resources are cleanly filtered.</p>
                      </div>
                    ) : (
                      <div className="resources-tab-list">
                        {(() => {
                          const filtered = activeTopic.resources.filter((r) => resourceFilter === "All" || r.status === resourceFilter);
                          return (
                            <>
                              {filtered.slice(0, visibleResourcesCount).map((r) => {
                                const Icon = TYPE_ICON[r.type] || FileText;
                                return (
                                  <div key={r.id} className="resource-detail-card" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                                      <div className="resource-detail-left" style={{ cursor: "pointer" }} onClick={() => addToRecentlyViewed(r.id, "resource", r.title, activeTopic.name)}>
                                        <Icon size={18} className="resource-detail-icon" style={{ marginTop: "3px" }} />
                                        <div className="resource-detail-info">
                                          <h4 className="resource-detail-title">{r.title}</h4>
                                          <span className="resource-detail-meta">
                                            {r.type} • added {fmtDate(r.date)}
                                            {(() => {
                                              const resUrl = r.url || (activeTopic?.sources?.find((s) => s.id === r.sourceId)?.url) || "";
                                              if (resUrl && !resUrl.startsWith("data:") && !resUrl.startsWith("db://")) {
                                                return (
                                                  <>
                                                    {" • "}
                                                    <a 
                                                      href={resUrl.startsWith("http") ? resUrl : `https://${resUrl}`} 
                                                      target="_blank" 
                                                      rel="noopener noreferrer" 
                                                      style={{ color: "var(--accent-brass)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "2px", marginLeft: "4px" }}
                                                      onClick={(e) => e.stopPropagation()}
                                                    >
                                                      Visit link <Link2 size={10} />
                                                    </a>
                                                  </>
                                                );
                                              }
                                              return null;
                                            })()}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                         <button
                                           className={`status-pill status-${r.status.toLowerCase()}`}
                                           onClick={() => cycleStatus(r.id)}
                                         >
                                           {r.status}
                                         </button>
                                         <button 
                                           style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
                                           onClick={() => editResource(r)}
                                           title="Edit resource title"
                                         >
                                           <Edit3 size={14} />
                                         </button>
                                         <button 
                                           style={{ background: "none", border: "none", color: "var(--accent-garnet)", cursor: "pointer" }}
                                           onClick={() => deleteResource(r.id)}
                                           title="Delete resource"
                                         >
                                           <Trash2 size={14} />
                                         </button>
                                       </div>
                                    </div>
                                    {(() => {
                                      const resUrl = r.url || (activeTopic?.sources?.find((s) => s.id === r.sourceId)?.url) || "";
                                      if (resUrl && (resUrl.startsWith("data:") || resUrl.startsWith("db://"))) {
                                        return <OfflineAttachmentPreview url={resUrl} title={r.title} type={r.type} />;
                                      }
                                      return null;
                                    })()}
                                  </div>
                                );
                              })}
                              {filtered.length > visibleResourcesCount && (
                                <button 
                                  className="btn-load-more" 
                                  onClick={() => setVisibleResourcesCount(prev => prev + 15)}
                                >
                                  Load More Resources ({filtered.length - visibleResourcesCount} remaining)
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: NOTES */}
                {activeTab === "Notes" && (
                  <div>
                    <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
                      <textarea
                        placeholder="Jot down quick thoughts, ideas, code snippets..."
                        className="form-textarea"
                        style={{ flex: 1 }}
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                      />
                      <button
                        className="btn-solid"
                        style={{ background: accentHex, color: "white", height: "fit-content", padding: "10px 16px" }}
                        onClick={createNote}
                      >
                        Jot Note
                      </button>
                    </div>

                    <div className="notes-grid">
                      {activeTopic.notes.slice(0, visibleNotesCount).map((n) => (
                        <div key={n.id} className="note-card">
                          <div className="note-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                             <span className="note-card-date">{fmtDate(n.date)}</span>
                             <div style={{ display: "flex", gap: "8px" }}>
                               <button 
                                 style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
                                 onClick={() => setEditingNote({ id: n.id, text: n.text })}
                                 title="Edit Note"
                               >
                                 <Edit3 size={12} />
                               </button>
                               <button 
                                 style={{ background: "none", border: "none", color: "var(--accent-garnet)", cursor: "pointer" }}
                                 onClick={() => deleteNote(n.id)}
                                 title="Delete Note"
                               >
                                 <Trash2 size={12} />
                               </button>
                             </div>
                           </div>
                           {editingNote && editingNote.id === n.id ? (
                             <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                               <textarea
                                 className="form-textarea"
                                 style={{ fontSize: "13.5px" }}
                                 value={editingNote.text}
                                 onChange={(e) => setEditingNote({ ...editingNote, text: e.target.value })}
                               />
                               <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                 <button className="btn-solid" style={{ background: "var(--accent-brass)", color: "black", padding: "2px 8px", fontSize: "11px" }} onClick={saveNoteEdit}>Save</button>
                                 <button className="btn-ghost" style={{ padding: "2px 8px", fontSize: "11px" }} onClick={() => setEditingNote(null)}>Cancel</button>
                                </div>
                             </div>
                           ) : (
                             <p className="note-card-text">{n.text}</p>
                           )}
                          
                          {n.convertedTo ? (
                            <span className="note-converted-badge">
                              <Sparkles size={12} />
                              <span>Converted to Discovery</span>
                            </span>
                          ) : convertingNoteId === n.id ? (
                            <div className="convert-note-form">
                              <div className="form-group">
                                <label className="form-label">Discovery Title</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={convertTitle}
                                  onChange={(e) => setConvertTitle(e.target.value)}
                                  placeholder="E.g., Hold BOOT button to fix timeout"
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Statement</label>
                                <textarea
                                  className="form-textarea"
                                  value={convertStatement}
                                  onChange={(e) => setConvertStatement(e.target.value)}
                                />
                              </div>
                              <div className="convert-form-actions">
                                <button className="btn-ghost" onClick={() => setConvertingNoteId(null)}>Cancel</button>
                                <button
                                  className="btn-solid"
                                  style={{ background: "var(--accent-verdigris)", color: "white" }}
                                  onClick={() => convertNoteToDiscovery(n.id)}
                                >
                                  Confirm
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              className="btn-convert-note"
                              onClick={() => {
                                      setConvertingNoteId(n.id);
                                      setConvertTitle("");
                                      setConvertStatement(n.text);
                              }}
                            >
                              <Sparkles size={11} />
                              <span>Convert to Discovery</span>
                            </button>
                          )}
                        </div>
                      ))}
                      {activeTopic.notes.length > visibleNotesCount && (
                        <div style={{ gridColumn: "span 3", display: "flex", justifyContent: "center", marginTop: "12px" }}>
                          <button 
                            className="btn-load-more" 
                            style={{ width: "100%" }}
                            onClick={() => setVisibleNotesCount(prev => prev + 15)}
                          >
                            Load More Notes ({activeTopic.notes.length - visibleNotesCount} remaining)
                          </button>
                        </div>
                      )}

                      {activeTopic.notes.length === 0 && (
                        <div className="empty-state" style={{ gridColumn: "span 3" }}>
                          <MessageCircle size={32} />
                          <div className="empty-title">No notes recorded</div>
                          <p className="empty-body">Jot down questions, ideas, or annotations above.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: DISCOVERIES */}
                {activeTab === "Discoveries" && (
                  <div className="discoveries-grid">
                    {activeTopic.discoveries.map((d) => (
                      <div key={d.id} className="discovery-card">
                        {/* Verification Stamp */}
                        <div className={`verification-stamp ${d.verification === "Verified" ? "stamp-verified" : "stamp-unverified"}`}>
                          {d.verification === "Verified" ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                          <span>{d.verification}</span>
                        </div>

                        <div className="discovery-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <h4 className="discovery-card-title">{d.title}</h4>
                          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                            <button
                              style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
                              onClick={() => setEditingDiscovery({
                                id: d.id,
                                title: d.title,
                                statement: d.statement,
                                verification: d.verification,
                                visibility: d.visibility
                              })}
                              title="Edit Discovery"
                            >
                              <Edit3 size={13} style={{ display: "block" }} />
                            </button>
                            <button
                              style={{ background: "none", border: "none", color: "var(--accent-garnet)", cursor: "pointer" }}
                              onClick={() => deleteDiscovery(d.id)}
                              title="Delete Discovery"
                            >
                              <Trash2 size={13} style={{ display: "block" }} />
                            </button>
                          </div>
                        </div>

                        <p className="discovery-statement">{d.statement}</p>

                        <div className="discovery-tags-row">
                          <span className="discovery-badge">
                            {d.visibility === "Public" ? <Globe2 size={10} /> : <Lock size={10} />}
                            <span>{d.visibility}</span>
                          </span>
                          
                          {d.relatedResources.map((rid) => {
                            const resObj = activeTopic.resources.find((r) => r.id === rid);
                            return resObj ? (
                              <span key={rid} className="discovery-tag-item">
                                📄 {resObj.title}
                              </span>
                            ) : null;
                          })}

                          {d.relatedNotes.map((nid) => (
                            <span key={nid} className="discovery-tag-item" style={{ fontStyle: "italic" }}>
                              ✏️ Note reference
                            </span>
                          ))}
                        </div>

                        <div className="discovery-card-footer">
                          <span className="discovery-date">{fmtDate(d.date)}</span>
                          <button
                            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                            onClick={() => {
                              setTopics((prev) =>
                                prev.map((t) => {
                                  if (t.id !== activeTopicId) return t;
                                  const discoveries = t.discoveries.map((disc) =>
                                    disc.id === d.id
                                      ? {
                                          ...disc,
                                          verification: disc.verification === "Verified" ? "To Test" : "Verified",
                                        }
                                      : disc
                                  );
                                  return { ...t, discoveries };
                                })
                              );
                              showToast("Verification status toggled");
                            }}
                            title="Toggle Verification status"
                          >
                            Verify Stamp
                          </button>
                        </div>
                      </div>
                    ))}

                    {activeTopic.discoveries.length === 0 && (
                      <div className="empty-state" style={{ gridColumn: "span 3" }}>
                        <Sparkles size={32} />
                        <div className="empty-title">No discoveries extracted</div>
                        <p className="empty-body">Use quick capture or convert notes to document learning outcomes.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: SOURCES */}
                {activeTab === "Sources" && (
                  <div className="sources-list-view">
                    {activeTopic.sources.length === 0 ? (
                      <div className="empty-state">
                        <BookMarked size={32} />
                        <div className="empty-title">No source bibliography records</div>
                        <p className="empty-body">Sources are created automatically when resources with URLs are logged.</p>
                      </div>
                    ) : (
                      activeTopic.sources.map((s) => (
                         <div key={s.id} className="source-card-item" style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "stretch" }}>
                           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px" }}>
                             <div>
                               <h4 className="source-card-title">{s.title}</h4>
                               <div className="source-card-meta">
                                 {s.type === "Book" && `Author: ${s.author} • Publisher: ${s.publisher} • Pages: ${s.pages || "N/A"}`}
                                 {s.type === "Video" && `Video Channel: ${s.channel || "N/A"}${s.url && !s.url.startsWith("data:") && !s.url.startsWith("db://") ? ` • URL: ${s.url}` : ""}`}
                                 {s.type === "Website" && `Author: ${s.author || "N/A"} • Published: ${s.date || "N/A"}${s.url && !s.url.startsWith("data:") && !s.url.startsWith("db://") ? ` • URL: ${s.url}` : ""}`}
                               </div>
                             </div>
                             <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
                               <button 
                                 style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
                                 onClick={() => editSource(s)}
                                 title="Edit source bibliography"
                               >
                                 <Edit3 size={14} />
                               </button>
                               <button 
                                 style={{ background: "none", border: "none", color: "var(--accent-garnet)", cursor: "pointer" }}
                                 onClick={() => deleteSource(s.id)}
                                 title="Delete source"
                               >
                                 <Trash2 size={14} />
                               </button>
                             </div>
                           </div>
                           {s.url && (s.url.startsWith("data:") || s.url.startsWith("db://")) && (
                             <OfflineAttachmentPreview url={s.url} title={s.title} type={s.type} />
                           )}
                         </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 6: TIMELINE */}
                {activeTab === "Timeline" && (
                  <div className="timeline-list">
                    {activeTopic.timeline.map((event, idx) => (
                      <div key={idx} className="timeline-event-item" style={{ "--accent-color": accentHex }}>
                        <div className="timeline-event-dot" />
                        <div className="timeline-event-date">{fmtDate(event.date)}</div>
                        <div className="timeline-event-text">{event.text}</div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>

            {/* 4. WORKSPACE RIGHT SIDEBAR (ABOUT COLUMN) */}
            <aside className={`workspace-right-sidebar ${aboutCollapsed ? "collapsed" : ""}`}>
              <div className="about-section">
                <h3 className="about-title">About this Topic</h3>
                
                <div className="about-details-table">
                  <div className="about-detail-row">
                    <span className="about-detail-label">Created</span>
                    <span className="about-detail-val">Jun 10, 2024</span>
                  </div>
                  <div className="about-detail-row">
                    <span className="about-detail-label">Last Activity</span>
                    <span className="about-detail-val">Today, 10:45 AM</span>
                  </div>
                  <div className="about-detail-row">
                    <span className="about-detail-label">Time Logged</span>
                    <span className="about-detail-val">8h 42m</span>
                  </div>
                  <div className="about-detail-row">
                    <span className="about-detail-label">Workspace Status</span>
                    <span className="about-detail-val active">
                      <span style={{ width: "6px", height: "6px", background: "var(--accent-green)", borderRadius: "50%" }} />
                      Active
                    </span>
                  </div>
                </div>

                {/* Top Sources Widget */}
                <div className="top-sources-list">
                  <h4 className="about-title" style={{ fontSize: "14px" }}>Top Sources</h4>
                  {Object.keys(sourceCountMap).length === 0 ? (
                    <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>No active source references.</div>
                  ) : (
                    Object.entries(sourceCountMap).map(([title, count], idx) => (
                      <div key={idx} className="top-source-item">
                        <div className="top-source-item-info">
                          <Link2 size={12} style={{ color: "var(--text-dim)", marginRight: "4px" }} />
                          <span className="top-source-item-title">{title}</span>
                        </div>
                        <span className="top-source-item-count">{count}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Recent Notes Widget */}
                <div className="recent-notes-widget">
                              {activeTopic.notes.slice(0, 3).map((note) => (
                    <div key={note.id} className="recent-note-mini">
                      {note.text.length > 80 ? note.text.slice(0, 80) + "..." : note.text}
                    </div>
                  ))}
                  {activeTopic.notes.length === 0 && (
                    <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>No notes added yet.</div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* 2.5 RADIAL DOCK NAVIGATION */}
        <div 
          className="radial-dock-container"
          onWheel={handleRingWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          {/* Glow/Arc decoration */}
          <div className="radial-arc-line" />
          
          {/* The active selector spotlight */}
          <div className="radial-spotlight" />

          <div 
            className="radial-center-panel"
            onContextMenu={handleRadialContextMenu}
            onTouchStart={handleTouchStartRadial}
            onTouchMove={handleTouchMoveRadial}
            onTouchEnd={handleTouchEndRadial}
            style={{ cursor: isTopicSelected ? 'context-menu' : 'default' }}
          >
            <ThreeHead 
              lookAngle={((hoveredRingIndex !== null ? hoveredRingIndex : activeRingIndex) - activeRingIndex) * 22} 
              activeIconType={ringItems[hoveredRingIndex !== null ? hoveredRingIndex : activeRingIndex]?.id}
              activeLabel={ringItems[hoveredRingIndex !== null ? hoveredRingIndex : activeRingIndex]?.label}
            />
            <div className="radial-center-label hide-on-mobile">Move your mouse to interact</div>
            <div className="radial-center-sub hide-on-mobile">Scroll or swipe to explore</div>
            <div className="radial-center-sub show-only-on-mobile">Swipe to explore</div>
          </div>

          {/* The Ring items */}
          <div className="radial-ring">
            {ringItems.map((item, index) => {
              const isActive = index === activeRingIndex;
              const distance = Math.abs(index - activeRingIndex);
              
              let IconComponent = BookOpen;
              if (item.id === "all-topics") IconComponent = BookMarked;
              else if (item.id === "unsorted") IconComponent = HelpCircle;
              else if (item.id === "recently-viewed") IconComponent = Clock;

              const angle = (index - activeRingIndex) * 22;
              const accentColor = item.accent ? (ACCENTS[item.accent] || "var(--accent-brass)") : "var(--accent-brass)";

              return (
                <div
                  key={item.id}
                  className={`radial-item ${isActive ? "active" : ""}`}
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                    opacity: distance > 5 ? 0 : 1,
                    pointerEvents: distance > 5 ? "none" : "auto",
                    "--item-accent": accentColor,
                    zIndex: isActive ? 100 : 10
                  }}
                  onClick={() => setActiveRingIndex(index)}
                  onMouseEnter={() => setHoveredRingIndex(index)}
                  onMouseLeave={() => setHoveredRingIndex(null)}
                >
                  <div className="radial-connector-line" style={{ opacity: isActive ? 0.0 : 1.0 }} />
                  <div className="radial-node-dot" style={{ opacity: isActive ? 0.0 : 1.0 }} />
                  <div 
                    className="radial-item-circle-wrapper"
                    style={{
                      transform: `translateY(calc(-1 * var(--radial-radius) - ${isActive ? "75px" : "45px"})) translateZ(${isActive ? "45px" : "-25px"}) scale(${isActive ? 1.25 : 0.92}) rotate(${-angle}deg)`,
                      opacity: isActive ? 0.0 : 0.5,
                      filter: isActive ? "none" : "blur(0.8px)",
                      transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s, filter 0.4s",
                      pointerEvents: isActive ? "none" : "auto"
                    }}
                  >
                    <div className="radial-item-circle">
                      <IconComponent size={isActive ? 22 : 18} />
                    </div>
                    <span className="radial-item-label">{item.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* 5. QUICK CAPTURE DRAWER OVERLAY */}
      {captureOpen && (
        <div className="drawer-overlay" onClick={() => setCaptureOpen(false)}>
          <div className="quick-capture-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 className="drawer-title">Quick Capture</h3>
              <button className="drawer-close-btn" onClick={() => setCaptureOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="capture-type-picker">
                <div
                  className={`capture-type-card ${captureMode === "discovery" ? "active" : ""}`}
                  onClick={() => setCaptureMode("discovery")}
                >
                  <Sparkles size={20} style={{ color: "var(--accent-brass)" }} />
                  <span className="capture-type-title">Discovery</span>
                  <span className="capture-type-desc">Log learned facts instantly</span>
                </div>
                <div
                  className={`capture-type-card ${captureMode === "resource" ? "active" : ""}`}
                  onClick={() => setCaptureMode("resource")}
                >
                  <Link2 size={20} style={{ color: "var(--accent-verdigris)" }} />
                  <span className="capture-type-title">Resource</span>
                  <span className="capture-type-desc">Paste article or video URLs</span>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: "10px" }}>
                <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Destination Research Topic</span>
                  <span style={{ color: "var(--accent-brass)", fontSize: "10.5px" }}>
                    {captureMode === "discovery"
                      ? "🦉 Tip: Choose or create a specific Topic"
                      : "🦉 Tip: Use Unsorted if no topic exists yet"}
                  </span>
                </label>
                <select
                  id="quick-capture-topic-select"
                  className="form-input"
                  defaultValue={activeTopicId && activeTopicId !== "unsorted" ? activeTopicId : (topics[0]?.id || "unsorted")}
                  onChange={(e) => {
                    if (e.target.value === "new-topic") {
                      setCaptureOpen(false);
                      setActiveView("all-topics");
                      setActiveTopicId(null);
                      setAddingTopic(true);
                    }
                  }}
                >
                  <option value="unsorted">Unsorted Inbox (No Topic)</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                  <option value="new-topic" style={{ color: "var(--accent-brass)", fontWeight: "bold" }}>+ Create New Topic...</option>
                </select>
              </div>

              {captureMode === "resource" ? (
                <>
                  <div className="form-group" style={{ marginTop: "12px" }}>
                    <label className="form-label">Resource Type</label>
                    <select
                      className="form-input"
                      value={captureResType}
                      onChange={(e) => {
                        setCaptureResType(e.target.value);
                        setCaptureResUrl("");
                        setCaptureResTranscript("");
                      }}
                    >
                      {Object.keys(TYPE_ICON).map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      {captureResType === "Discussion" ? "Discussion / Source Name" : "Resource Title"}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={captureResType === "Discussion" ? "E.g., Team WhatsApp Group, ChatGPT Session..." : "E.g., Webots Robotics Simulator"}
                      value={captureResTitle}
                      onChange={(e) => setCaptureResTitle(e.target.value)}
                    />
                  </div>

                  {/* DISCUSSION: Chat paste area */}
                  {captureResType === "Discussion" ? (
                    <div className="form-group" style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "12px", marginTop: "4px" }}>
                      <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Users size={13} style={{ color: "var(--accent-verdigris)" }} />
                          Paste Chat Log
                        </span>
                        <span style={{ color: "var(--accent-brass)", fontSize: "10px" }}>Parsed offline</span>
                      </label>
                      <textarea
                        className="form-textarea"
                        rows={10}
                        style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", lineHeight: "1.6", resize: "vertical" }}
                        placeholder={`Paste your WhatsApp, AI, or any chat log here.\n\nSupported formats:\n[23:07, 6/12/2026] Alby: message here\n23:07 - Alby: message here\nAlby: message here`}
                        value={captureResTranscript}
                        onChange={(e) => setCaptureResTranscript(e.target.value)}
                      />
                      {captureResTranscript && (
                        <div style={{ marginTop: "8px", padding: "8px 10px", background: "rgba(94,133,119,0.1)", borderRadius: "6px", border: "1px solid var(--accent-verdigris)", fontSize: "11px", color: "var(--accent-verdigris)" }}>
                          ✓ {parseChatLog(captureResTranscript).length} messages detected — will be rendered as a chat timeline
                        </div>
                      )}
                    </div>
                  ) : captureResType === "Audio" ? (
                    /* AUDIO: Recording controls */
                    <div className="form-group" style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "12px", marginTop: "4px" }}>
                      <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Mic size={13} style={{ color: "var(--accent-brass)" }} />
                          Voice Recording
                        </span>
                        <span style={{ color: "var(--accent-brass)", fontSize: "10px" }}>Stored offline</span>
                      </label>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
                        {!isRecording ? (
                          <button
                            className="btn-solid"
                            style={{ background: "var(--accent-garnet)", color: "white", display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px" }}
                            onClick={startAudioRecording}
                          >
                            <Mic size={15} />
                            Start Recording
                          </button>
                        ) : (
                          <button
                            className="btn-solid"
                            style={{ background: "rgba(166,83,61,0.3)", color: "var(--accent-garnet)", border: "2px solid var(--accent-garnet)", display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", animation: "pulse 1s infinite" }}
                            onClick={stopAudioRecording}
                          >
                            <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "var(--accent-garnet)", display: "inline-block" }} />
                            Stop ({Math.floor(recordDuration / 60).toString().padStart(2, "0")}:{(recordDuration % 60).toString().padStart(2, "0")})
                          </button>
                        )}
                        {isRecording && (
                          <span style={{ fontSize: "11px", color: "var(--accent-garnet)", animation: "pulse 1s infinite" }}>● Recording…</span>
                        )}
                      </div>

                      {captureResUrl && captureResUrl.startsWith("data:audio") && (
                        <div style={{ marginTop: "10px" }}>
                          <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "4px" }}>Preview:</div>
                          <audio src={captureResUrl} controls style={{ width: "100%" }} />
                        </div>
                      )}

                      <div className="form-group" style={{ marginTop: "12px" }}>
                        <label className="form-label" style={{ fontSize: "11px" }}>Or upload an audio file</label>
                        <input
                          type="file"
                          className="form-input"
                          accept="audio/*"
                          onChange={handleCaptureFileChange}
                          style={{ padding: "4px" }}
                        />
                      </div>
                    </div>
                  ) : (
                    /* DEFAULT: URL + file upload */
                    <>
                      <div className="form-group">
                        <label className="form-label">Source Link URL</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="E.g., https://github.com/cyberbotics/webots"
                          value={captureResUrl}
                          onChange={(e) => setCaptureResUrl(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "12px", marginTop: "12px" }}>
                        <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span>Upload Media / Document File</span>
                          <span style={{ color: "var(--accent-brass)", fontSize: "10px" }}>Offline storage</span>
                        </label>
                        <input
                          type="file"
                          className="form-input"
                          accept="image/*,video/*,application/pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt"
                          onChange={handleCaptureFileChange}
                          style={{ padding: "4px" }}
                        />
                      </div>

                      {captureResUrl && captureResUrl.startsWith("data:") && (
                        <div style={{ marginTop: "12px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-color)", padding: "8px", background: "rgba(0,0,0,0.2)" }}>
                          <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "4px" }}>File Preview:</div>
                          {captureResUrl.startsWith("data:image/") ? (
                            <img src={captureResUrl} alt="Preview" style={{ width: "100%", maxHeight: "150px", objectFit: "contain", borderRadius: "4px" }} />
                          ) : captureResUrl.startsWith("data:video/") ? (
                            <video src={captureResUrl} controls style={{ width: "100%", maxHeight: "150px", borderRadius: "4px" }} />
                          ) : null}
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">Discovery Statement</label>
                  <textarea
                    id="quick-capture-textarea"
                    className="form-textarea"
                    placeholder="E.g., ESP32 boot buttons must be pressed down to sync uploads."
                    rows={4}
                  />
                </div>
              )}
            </div>

            <div className="drawer-footer">
              <button className="btn-ghost" onClick={() => setCaptureOpen(false)}>Cancel</button>
              <button
                className="btn-solid"
                style={{ background: "var(--accent-purple)", color: "white" }}
                onClick={() => {
                  const selectEl = document.getElementById("quick-capture-topic-select");
                  if (captureMode === "discovery") {
                    const textEl = document.getElementById("quick-capture-textarea");
                    if (textEl && textEl.value.trim()) {
                      quickCaptureSave(selectEl.value, "discovery", textEl.value.trim());
                      setCaptureOpen(false);
                    }
                  } else {
                    // For Discussion: encode pasted transcript as a text data URL
                    if (captureResType === "Discussion") {
                      if (!captureResTranscript.trim()) {
                        setAlertDialog({ message: "Please paste your chat log before saving." });
                        return;
                      }
                      const encoded = "data:text/plain;charset=utf-8," + encodeURIComponent(captureResTranscript);
                      quickCaptureSave(selectEl.value, "resource", encoded, captureResTitle || "Discussion Log", "Discussion");
                    } else {
                      quickCaptureSave(selectEl.value, "resource", captureResUrl, captureResTitle, captureResType);
                    }
                    setCaptureOpen(false);
                  }
                }}
              >
                Save Capture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsModalOpen && (
        <div className="modal-overlay" onClick={() => setSettingsModalOpen(false)}>
          <div 
            className="modal-card" 
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => {
              const now = Date.now();
              if (now - lastTabScrollRef.current < 450) return;
              
              const isScrollableContainer = e.target.closest && (
                e.target.closest('[style*="overflowY: auto"]') ||
                e.target.closest('[style*="overflow-y: auto"]') ||
                e.target.closest('[style*="overflow: auto"]')
              );
              if (isScrollableContainer && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                return;
              }
              
              const tabsOrder = ["profile", "sync", "storage"];
              const currentIndex = tabsOrder.indexOf(settingsTab);
              
              let direction = 0;
              if (Math.abs(e.deltaX) > 15) {
                direction = e.deltaX > 0 ? 1 : -1;
              } else if (Math.abs(e.deltaY) > 40) {
                direction = e.deltaY > 0 ? 1 : -1;
              }
              
              if (direction !== 0) {
                const nextIndex = currentIndex + direction;
                if (nextIndex >= 0 && nextIndex < tabsOrder.length) {
                  setSettingsTab(tabsOrder[nextIndex]);
                  lastTabScrollRef.current = now;
                }
              }
            }}
          >
            <div className="modal-header">
              <h3 className="modal-title">Vault Settings</h3>
              <button className="drawer-close-btn" onClick={() => setSettingsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            {/* HCI Grouping Tabs */}
            <div className="settings-tabs-row" style={{ display: "flex", borderBottom: "1px solid var(--border-light)", padding: "0 24px" }}>
              <button
                className={`settings-tab-btn ${settingsTab === "profile" ? "active" : ""}`}
                onClick={() => setSettingsTab("profile")}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  borderBottom: settingsTab === "profile" ? "2px solid var(--accent-brass)" : "2px solid transparent",
                  padding: "10px 0",
                  fontSize: "12.5px",
                  fontWeight: settingsTab === "profile" ? "600" : "400",
                  color: settingsTab === "profile" ? "var(--text-primary)" : "var(--text-dim)",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s"
                }}
              >
                Profile & Security
              </button>
              <button
                className={`settings-tab-btn ${settingsTab === "sync" ? "active" : ""}`}
                onClick={() => setSettingsTab("sync")}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  borderBottom: settingsTab === "sync" ? "2px solid var(--accent-brass)" : "2px solid transparent",
                  padding: "10px 0",
                  fontSize: "12.5px",
                  fontWeight: settingsTab === "sync" ? "600" : "400",
                  color: settingsTab === "sync" ? "var(--text-primary)" : "var(--text-dim)",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s"
                }}
              >
                Sync & Backups
              </button>
              <button
                className={`settings-tab-btn ${settingsTab === "storage" ? "active" : ""}`}
                onClick={() => setSettingsTab("storage")}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  borderBottom: settingsTab === "storage" ? "2px solid var(--accent-brass)" : "2px solid transparent",
                  padding: "10px 0",
                  fontSize: "12.5px",
                  fontWeight: settingsTab === "storage" ? "600" : "400",
                  color: settingsTab === "storage" ? "var(--text-primary)" : "var(--text-dim)",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s"
                }}
              >
                Storage & System
              </button>
            </div>

            <div className="modal-body" style={{ padding: "20px 24px" }}>
              {/* TAB 1: PROFILE & SECURITY */}
              {settingsTab === "profile" && (
                <>
                  <div className="form-group">
                    <label className="form-label">Profile Name</label>
                    <input type="text" className="form-input" value={currentUser} disabled />
                  </div>

                  <form onSubmit={handleChangePin} className="form-group" style={{ borderTop: "1px solid var(--border-light)", paddingTop: "14px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: "600", marginBottom: "10px" }}>Change Password PIN</h4>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input
                        type="password"
                        placeholder="Old PIN"
                        className="form-input"
                        style={{ flex: 1 }}
                        value={oldPinInput}
                        onChange={(e) => setOldPinInput(e.target.value)}
                      />
                      <input
                        type="password"
                        placeholder="New PIN"
                        className="form-input"
                        style={{ flex: 1 }}
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="auth-btn-submit" style={{ marginTop: "10px" }}>Update PIN</button>
                  </form>

                  <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "14px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: "600", color: "var(--accent-garnet)", marginBottom: "8px" }}>Danger Zone</h4>
                    <button className="btn-solid" style={{ background: "var(--accent-garnet)", color: "white", width: "100%" }} onClick={handleClearAllData}>
                      Clear All Vault Data
                    </button>
                  </div>
                </>
              )}

              {/* TAB 2: SYNC & BACKUPS */}
              {settingsTab === "sync" && (
                <>
                  <div>
                    <h4 style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Smart Sync (Cloud Vault)</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
                      <input
                        type="text"
                        placeholder="WebDAV URL (e.g. https://domain.com/remote.php/dav/files/user/)"
                        className="form-input"
                        value={ncUrl}
                        onChange={(e) => setNcUrl(e.target.value)}
                      />
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="text"
                          placeholder="Username"
                          className="form-input"
                          style={{ flex: 1 }}
                          value={ncUser}
                          onChange={(e) => setNcUser(e.target.value)}
                        />
                        <input
                          type="password"
                          placeholder="App Password"
                          className="form-input"
                          style={{ flex: 1 }}
                          value={ncPass}
                          onChange={(e) => setNcPass(e.target.value)}
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Backup Path (e.g. vault_backup.json)"
                        className="form-input"
                        value={ncPath}
                        onChange={(e) => setNcPath(e.target.value)}
                      />
                    </div>
                    
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <button className="desktop-app-btn" style={{ flex: 1, background: "var(--accent-verdigris)", color: "white" }} onClick={syncToNextcloud} disabled={syncStatus === "Syncing"}>
                        {syncStatus === "Syncing" ? "Syncing..." : "Smart Sync Vault"}
                      </button>
                    </div>
                    
                    <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--text-dim)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className={`sync-dot ${syncStatus.toLowerCase()}`} />
                        Status: <strong>{syncStatus}</strong>
                      </span>
                      {lastSync && <span>Last sync: <strong>{lastSync}</strong></span>}
                    </div>

                    {/* Cryptographic Sync Key Import/Export */}
                    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed var(--border-light)" }}>
                      <h5 style={{ fontSize: "12px", fontWeight: "600", margin: "0 0 6px 0", color: "var(--text-secondary)" }}>Cryptographic Sync Key</h5>
                      <p style={{ fontSize: "11px", color: "var(--text-dim)", margin: "0 0 8px 0" }}>
                        Share or backup your cloud connection credentials as a single encrypted token (safe for WhatsApp/Notepad).
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input
                            type="text"
                            placeholder="Paste Encrypted Sync Key here to import..."
                            className="form-input"
                            style={{ flex: 1, fontSize: "11.5px", fontFamily: "var(--font-mono)" }}
                            value={cryptoKeyInput}
                            onChange={(e) => setCryptoKeyInput(e.target.value)}
                          />
                          <button className="desktop-app-btn" style={{ whiteSpace: "nowrap" }} onClick={handleImportCryptoKey}>Import Key</button>
                        </div>
                        <button className="desktop-app-btn" style={{ width: "100%", background: "rgba(255,255,255,0.05)" }} onClick={handleExportCryptoKey}>
                          Export & Copy Encrypted Sync Key
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "14px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Backup Management</h4>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button className="desktop-app-btn" style={{ flex: 1 }} onClick={exportData}>Export JSON Vault</button>
                      <label className="desktop-app-btn" style={{ flex: 1, cursor: "pointer", textAlign: "center" }}>
                        Import Backup
                        <input type="file" accept=".json" onChange={importData} style={{ display: "none" }} />
                      </label>
                    </div>
                  </div>

                  {/* Trashcan Management */}
                  <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <h4 style={{ fontSize: "13px", fontWeight: "600", margin: 0 }}>Trashcan (Tombstones)</h4>
                      <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>{deletedItems.length} items</span>
                    </div>
                    {deletedItems.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ maxHeight: "120px", overflowY: "auto", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-light)", borderRadius: "6px", padding: "8px", fontSize: "11px" }}>
                          {deletedItems.map((item, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: idx < deletedItems.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                              <span style={{ color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginRight: "10px" }}>
                                <strong style={{ color: "var(--text-dim)" }}>{item.type}:</strong> {item.title}
                              </span>
                            </div>
                          ))}
                        </div>
                        <button className="btn-solid" style={{ background: "var(--bg-panel)", border: "1px solid var(--border-color)", color: "var(--text-primary)", width: "100%", fontSize: "12px", padding: "6px" }} 
                          onClick={() => {
                            setConfirmDialog({
                              message: "Are you sure you want to permanently empty the trash? Note: Emptying the trash removes the sync tombstones. If a remote device still has these files, they may reappear on your next sync.",
                              onConfirm: () => setDeletedItems([])
                            });
                          }}>
                          Empty Trashcan
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>Trashcan is empty.</div>
                    )}
                  </div>
                </>
              )}

              {/* TAB 3: STORAGE & SYSTEM */}
              {settingsTab === "storage" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: "600", margin: 0 }}>Storage Overview</h4>
                    <button
                      style={{ fontSize: "11px", background: "none", border: "1px solid var(--border-color)", color: "var(--text-secondary)", borderRadius: "6px", padding: "3px 8px", cursor: "pointer" }}
                      onClick={refreshStorageInfo}
                    >
                      ↻ Refresh
                    </button>
                  </div>
                  {storageInfo ? (() => {
                    const fmtBytes = (b) => {
                      if (b >= 1073741824) return (b / 1073741824).toFixed(2) + " GB";
                      if (b >= 1048576) return (b / 1048576).toFixed(1) + " MB";
                      if (b >= 1024) return (b / 1024).toFixed(1) + " KB";
                      return b + " B";
                    };
                    const barColor = storageInfo.percent > 80 ? "var(--accent-garnet)" : storageInfo.percent > 50 ? "var(--accent-brass)" : "var(--accent-verdigris)";
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {/* Total quota bar */}
                        {storageInfo.quota > 0 && (
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: "var(--text-secondary)", marginBottom: "5px" }}>
                              <span>Total Browser Storage (IndexedDB + Cache)</span>
                              <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                                {fmtBytes(storageInfo.usage)} / {fmtBytes(storageInfo.quota)}
                              </span>
                            </div>
                            <div style={{ background: "var(--bg-panel)", borderRadius: "6px", height: "10px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
                              <div style={{ width: `${storageInfo.usage > 0 ? Math.max(1.5, Math.min(storageInfo.percent, 100)) : 0}%`, height: "100%", background: barColor, borderRadius: "6px", transition: "width 0.4s ease" }} />
                            </div>
                            <div style={{ fontSize: "10px", color: barColor, marginTop: "3px", textAlign: "right" }}>
                              {storageInfo.percent.toFixed(1)}% used — {fmtBytes(storageInfo.quota - storageInfo.usage)} free
                            </div>
                          </div>
                        )}
                        {/* localStorage row */}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                          <span style={{ color: "var(--text-secondary)" }}>localStorage (topics, metadata)</span>
                          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{fmtBytes(storageInfo.lsUsed)}</span>
                        </div>
                        {/* Offline attachments row */}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                          <span style={{ color: "var(--text-secondary)" }}>IndexedDB (files, audio, videos)</span>
                          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                            {fmtBytes(Math.max(0, storageInfo.usage - storageInfo.lsUsed))}
                          </span>
                        </div>
                        {storageInfo.percent > 80 && (
                          <div style={{ fontSize: "11px", color: "var(--accent-garnet)", padding: "6px 10px", background: "rgba(166,83,61,0.1)", borderRadius: "6px", border: "1px solid var(--accent-garnet)" }}>
                            ⚠ Storage is nearly full. Consider exporting your vault and clearing old attachments.
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>Click Refresh to load storage details.</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help & Offline Guide Modal */}
      {helpModalOpen && (
        <div className="modal-overlay" onClick={() => setHelpModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Offline Help & Documentation</h3>
              <button className="drawer-close-btn" onClick={() => setHelpModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: "13.5px", lineHeight: "1.6" }}>
              <h4 style={{ fontWeight: "600" }}>Is this really offline-first?</h4>
              <p style={{ color: "var(--text-secondary)" }}>
                Yes! All topics, notes, status pill states, and discoveries are stored inside your browser's persistent `localStorage`. No data is ever transmitted to a server. You can run this app without internet connectivity.
              </p>

              <h4 style={{ fontWeight: "600", marginTop: "10px" }}>Keyboard Shortcuts</h4>
              <ul style={{ paddingLeft: "20px", color: "var(--text-secondary)" }}>
                <li><strong style={{ color: "var(--text-primary)" }}>Ctrl + K</strong> / <strong style={{ color: "var(--text-primary)" }}>Cmd + K</strong>: Focus global search immediately.</li>
                <li><strong style={{ color: "var(--text-primary)" }}>Escape</strong>: Close any active modal, drawer, dialog overlay, or dropdown.</li>
                <li><strong style={{ color: "var(--text-primary)" }}>Ctrl + S</strong> / <strong style={{ color: "var(--text-primary)" }}>Cmd + S</strong>: Save active forms instantly; if no form is active, triggers a Nextcloud sync backup.</li>
                <li><strong style={{ color: "var(--text-primary)" }}>Ctrl + [1-6]</strong>: Switch workspace tabs in the active topic (Overview, Resources, Notes, Discoveries, Sources, Timeline).</li>
                <li><strong style={{ color: "var(--text-primary)" }}>Ctrl + Alt + T</strong> / <strong style={{ color: "var(--text-primary)" }}>Cmd + Alt + T</strong> (or Shift fallback): Create a new Topic workspace pop-up modal.</li>
              </ul>

              <h4 style={{ fontWeight: "600", marginTop: "10px" }}>How to import / export?</h4>
              <p style={{ color: "var(--text-secondary)" }}>
                Use the Export and Import buttons in the sidebar or the Settings menu to backup your research catalog to a JSON file.
              </p>

              <h4 style={{ fontWeight: "600", marginTop: "10px" }}>Nextcloud Private Cloud Setup</h4>
              <p style={{ color: "var(--text-secondary)" }}>
                To synchronize your vault across your devices (phone, desktop) while maintaining complete privacy:
              </p>
              <ol style={{ paddingLeft: "20px", color: "var(--text-secondary)", marginTop: "4px" }}>
                <li>Download the Web Installer script (<code>setup-nextcloud.php</code>) from the Nextcloud official website.</li>
                <li>Upload <code>setup-nextcloud.php</code> to your web hosting server space.</li>
                <li>Open the file in your browser (e.g. <code>https://your-hosting.com/setup-nextcloud.png</code>) to run the configuration wizard.</li>
                <li>Go to your user security settings and create a dedicated <strong>App Password</strong>.</li>
                <li>Copy the WebDAV URL (looks like <code>https://domain.com/remote.php/dav/files/user/</code>) and paste it along with your Username and App Password into the app's Settings sync panel.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Dialog Modal */}
      {alertDialog && (
        <div className="modal-overlay" onClick={() => setAlertDialog(null)}>
          <div className="modal-card" style={{ maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>⚠️ Notification</span>
              </h3>
              <button className="drawer-close-btn" onClick={() => setAlertDialog(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: "1.5" }}>{alertDialog.message}</p>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                <button className="btn-solid" style={{ background: "var(--accent-brass)", color: "black", padding: "6px 16px", borderRadius: "4px" }} onClick={() => setAlertDialog(null)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog Modal */}
      {confirmDialog && (
        <div className="modal-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="modal-card" style={{ maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Action</h3>
              <button className="drawer-close-btn" onClick={() => setConfirmDialog(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: "1.5" }}>{confirmDialog.message}</p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button className="btn-ghost" onClick={() => setConfirmDialog(null)}>Cancel</button>
                <button
                  className="btn-solid"
                  style={{ background: "var(--accent-garnet)", color: "white", padding: "6px 16px", borderRadius: "4px" }}
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Edit Resource Modal */}
      {editingResource && (
        <div className="modal-overlay" onClick={() => setEditingResource(null)}>
          <div className="modal-card" style={{ maxWidth: "450px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Resource</h3>
              <button className="drawer-close-btn" onClick={() => setEditingResource(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label">Resource Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingResource.title}
                  onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Resource Type</label>
                <select
                  className="form-input"
                  value={editingResource.type}
                  onChange={(e) => setEditingResource({ ...editingResource, type: e.target.value })}
                >
                  {Object.keys(TYPE_ICON).map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Destination Topic</label>
                <select
                  className="form-input"
                  value={editingResource.topicId || "unsorted"}
                  onChange={(e) => setEditingResource({ ...editingResource, topicId: e.target.value })}
                >
                  <option value="unsorted">Unsorted Inbox (No Topic)</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Source URL (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingResource.sourceUrl || ""}
                  onChange={(e) => setEditingResource({ ...editingResource, sourceUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button className="btn-ghost" onClick={() => setEditingResource(null)}>Cancel</button>
                <button
                  className="btn-solid"
                  style={{ background: "var(--accent-brass)", color: "black", padding: "6px 16px", borderRadius: "4px" }}
                  onClick={() => saveResourceEdit(editingResource.id, editingResource.title, editingResource.type, editingResource.sourceId, editingResource.sourceUrl, editingResource.topicId)}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Edit Source Modal */}
      {editingSource && (
        <div className="modal-overlay" onClick={() => setEditingSource(null)}>
          <div className="modal-card" style={{ maxWidth: "450px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Source</h3>
              <button className="drawer-close-btn" onClick={() => setEditingSource(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label">Source Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingSource.title}
                  onChange={(e) => setEditingSource({ ...editingSource, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Source Type</label>
                <select
                  className="form-input"
                  value={editingSource.type}
                  onChange={(e) => setEditingSource({ ...editingSource, type: e.target.value })}
                >
                  <option value="Website">Website</option>
                  <option value="Book">Book</option>
                  <option value="Video">Video</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Source URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingSource.url}
                  onChange={(e) => setEditingSource({ ...editingSource, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              {(editingSource.type === "Book" || editingSource.type === "Website") && (
                <div className="form-group">
                  <label className="form-label">Author</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingSource.author || ""}
                    onChange={(e) => setEditingSource({ ...editingSource, author: e.target.value })}
                    placeholder="Author name..."
                  />
                </div>
              )}
              {editingSource.type === "Book" && (
                <>
                  <div className="form-group">
                    <label className="form-label">Publisher</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingSource.publisher || ""}
                      onChange={(e) => setEditingSource({ ...editingSource, publisher: e.target.value })}
                      placeholder="Publisher name..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pages</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingSource.pages || ""}
                      onChange={(e) => setEditingSource({ ...editingSource, pages: e.target.value })}
                      placeholder="Number of pages..."
                    />
                  </div>
                </>
              )}
              {editingSource.type === "Video" && (
                <div className="form-group">
                  <label className="form-label">Video Channel</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingSource.channel || ""}
                    onChange={(e) => setEditingSource({ ...editingSource, channel: e.target.value })}
                    placeholder="Channel name..."
                  />
                </div>
              )}
              {editingSource.type === "Website" && (
                <div className="form-group">
                  <label className="form-label">Published Year/Date</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingSource.date || ""}
                    onChange={(e) => setEditingSource({ ...editingSource, date: e.target.value })}
                    placeholder="E.g., 2026"
                  />
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button className="btn-ghost" onClick={() => setEditingSource(null)}>Cancel</button>
                <button
                  className="btn-solid"
                  style={{ background: "var(--accent-brass)", color: "black", padding: "6px 16px", borderRadius: "4px" }}
                  onClick={() => saveSourceEdit(editingSource.id, editingSource)}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Edit Discovery Modal */}
      {editingDiscovery && (
        <div className="modal-overlay" onClick={() => setEditingDiscovery(null)}>
          <div className="modal-card" style={{ maxWidth: "450px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Discovery</h3>
              <button className="drawer-close-btn" onClick={() => setEditingDiscovery(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label">Discovery Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingDiscovery.title}
                  onChange={(e) => setEditingDiscovery({ ...editingDiscovery, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Statement</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={editingDiscovery.statement}
                  onChange={(e) => setEditingDiscovery({ ...editingDiscovery, statement: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Verification</label>
                <select
                  className="form-input"
                  value={editingDiscovery.verification}
                  onChange={(e) => setEditingDiscovery({ ...editingDiscovery, verification: e.target.value })}
                >
                  <option value="Unverified">Unverified</option>
                  <option value="Verified">Verified</option>
                  <option value="To Test">To Test</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Visibility</label>
                <select
                  className="form-input"
                  value={editingDiscovery.visibility}
                  onChange={(e) => setEditingDiscovery({ ...editingDiscovery, visibility: e.target.value })}
                >
                  <option value="Private">Private</option>
                  <option value="Public">Public</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button className="btn-ghost" onClick={() => setEditingDiscovery(null)}>Cancel</button>
                <button
                  className="btn-solid"
                  style={{ background: "var(--accent-brass)", color: "black", padding: "6px 16px", borderRadius: "4px" }}
                  onClick={saveDiscoveryEdit}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Topic Modal overlay */}
      {addingTopic && (
        <div className="modal-overlay" onClick={() => setAddingTopic(false)}>
          <div className="modal-card" style={{ maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Research Topic</h3>
              <button className="drawer-close-btn" onClick={() => setAddingTopic(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label">Topic Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Topic name..."
                  autoFocus
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { createTopic(); setAddingTopic(false); }
                    if (e.key === "Escape") setAddingTopic(false);
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button className="btn-ghost" onClick={() => setAddingTopic(false)}>Cancel</button>
                <button
                  className="btn-solid"
                  style={{ background: "var(--accent-brass)", color: "black", padding: "6px 16px", borderRadius: "4px" }}
                  onClick={() => { createTopic(); setAddingTopic(false); }}
                >
                  Create Topic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}      {/* Radial Context Menu */}
      {radialContextMenu.visible && (
        <div 
          className="radial-context-menu" 
          style={{ 
            top: radialContextMenu.y, 
            left: radialContextMenu.x 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="radial-context-menu-item" 
            onClick={() => {
              deleteTopic(radialContextMenu.topicId);
              setRadialContextMenu({ visible: false, x: 0, y: 0, topicId: null, topicName: "" });
            }}
          >
            <Trash2 size={14} />
            <span>Delete {radialContextMenu.topicName}</span>
          </button>
        </div>
      )}

      {/* 6. GUIDED TOUR CARD */}
      {tourStep !== null && (
        <div className="tour-card" onClick={(e) => e.stopPropagation()}>
          <div className="tour-header">
            <h4 className="tour-title">
              <span>🤖 Vault Guide</span>
            </h4>
            <span className="tour-step-badge">Step {tourStep} of 5</span>
          </div>
          <div className="tour-body">
            {tourStep === 1 && (
              <p>
                Welcome to the <strong>Research Knowledge Vault</strong>! This is an offline-first research environment where you can organize topics, links, and quick annotations. Select a topic using the 3D scroller menu or click <strong>Create New Topic</strong> to start a new environment.
              </p>
            )}
            {tourStep === 2 && (
              <p>
                We've placed search center-stage! Click the search bar or press <kbd style={{ background: "rgba(255,255,255,0.1)", padding: "2px 4px", borderRadius: "4px" }}>Ctrl + K</kbd> to search topics, resources, notes, and discoveries instantly across your entire vault.
              </p>
            )}
            {tourStep === 3 && (
              <p>
                Use the top navigation bar to access global, workspace-wide views:
                <br />• <strong>Unsorted</strong>: View resources or discoveries captured without a topic.
                <br />• <strong>Recent</strong>: Quickly access recently viewed topics.
                <br />• <strong>Appendix</strong>: A dictionary-style glossary index of all compile contents.
              </p>
            )}
            {tourStep === 4 && (
              <p>
                Click <strong>+ New</strong> to quick-capture a discovery statement or a resource URL. You can upload media/documents, record voice logs, or paste chat transcripts offline.
              </p>
            )}
            {tourStep === 5 && (
              <div>
                <p style={{ marginBottom: "8px" }}>Supercharge your flow with these power-user keyboard shortcuts:</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "6px", fontSize: "12px", background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "6px" }}>
                  <strong style={{ color: "var(--accent-brass)" }}>Escape</strong> <span>Close modals/drawers</span>
                  <strong style={{ color: "var(--accent-brass)" }}>Ctrl + S</strong> <span>Save form / Nextcloud sync</span>
                  <strong style={{ color: "var(--accent-brass)" }}>Ctrl + [1-6]</strong> <span>Switch topic tabs</span>
                  <strong style={{ color: "var(--accent-brass)" }}>Ctrl+Alt+T</strong> <span>Create new topic</span>
                </div>
              </div>
            )}
          </div>
          <div className="tour-footer">
            <button
              className="btn-ghost"
              style={{ fontSize: "12px", padding: "4px 8px" }}
              onClick={() => {
                localStorage.setItem(`rkv_tour_completed_${currentUser}`, "true");
                setTourStep(null);
                showToast("Tour skipped. Click Help in the profile menu to open guides.");
              }}
            >
              Skip
            </button>
            <div style={{ display: "flex", gap: "8px" }}>
              {tourStep > 1 && (
                <button
                  className="btn-ghost"
                  style={{ fontSize: "12px", padding: "4px 12px" }}
                  onClick={() => setTourStep(tourStep - 1)}
                >
                  Back
                </button>
              )}
              <button
                className="btn-solid"
                style={{ background: "var(--accent-brass)", color: "black", fontSize: "12px", padding: "4px 16px", fontWeight: "600" }}
                onClick={() => {
                  if (tourStep < 5) {
                    setTourStep(tourStep + 1);
                  } else {
                    localStorage.setItem(`rkv_tour_completed_${currentUser}`, "true");
                    setTourStep(null);
                    showToast("Tour completed! Enjoy your Vault.");
                  }
                }}
              >
                {tourStep === 5 ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
