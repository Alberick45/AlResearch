import { useState, useRef, useEffect } from "react";
import {
  Search, Plus, X, Link2, Youtube, FileText, Image as ImageIcon,
  BookMarked, FlaskConical, MessageCircle, CheckCircle2, Circle,
  Lock, Globe2, Sparkles, ChevronRight, Star, Moon, HelpCircle,
  Settings, Bell, Edit3, Trash2, Shield, Eye, Database, FileUp, FileDown,
  Unlock, UserPlus, LogOut, Key, User, BookOpen, Clock
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Accent Map & Constants                                              */
/* ------------------------------------------------------------------ */

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
};

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

let _id = 8000;
const nextId = (prefix) => `${prefix}${_id++}`;

export default function App() {
  // Authentication & Session States
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem("rkv_active_user") || null;
  });
  
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // 'login' | 'register'
  
  // Registration and Login Input Drafts
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  // Topics Loaded dynamically per logged-in user
  const [topics, setTopics] = useState([]);

  // Active view: can be a topic ID, "unsorted", or "recently-viewed"
  const [activeView, setActiveView] = useState("all-topics"); 
  const [activeTopicId, setActiveTopicId] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [resourceFilter, setResourceFilter] = useState("All");

  // Unsorted resources bucket (stored at user vault level)
  const [unsortedResources, setUnsortedResources] = useState([]);

  // Recently Viewed tracker (list of { id, type, name, timestamp })
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // UI Dropdowns & Modals
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState("discovery"); // 'discovery' | 'resource'
  const [toast, setToast] = useState(null);

  // Settings PIN Change Drafts
  const [oldPinInput, setOldPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");

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

  // Load vault data when current user changes
  useEffect(() => {
    if (currentUser) {
      const savedVault = localStorage.getItem(`rkv_vault_${currentUser}`);
      const userTopics = savedVault ? JSON.parse(savedVault) : [];
      setTopics(userTopics);

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
    } else {
      setTopics([]);
      setUnsortedResources([]);
      setRecentlyViewed([]);
      setActiveTopicId(null);
      setActiveView("all-topics");
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

  const activeTopic = topics.find((t) => t.id === activeTopicId) || null;
  const accentHex = activeTopic ? (ACCENTS[activeTopic.accent] || "#C9974D") : "#C9974D";

  // Track Recently Viewed whenever activeTopic changes
  useEffect(() => {
    if (activeTopic) {
      addToRecentlyViewed(activeTopic.id, "topic", activeTopic.name);
    }
  }, [activeTopicId]);

  const addToRecentlyViewed = (id, type, name) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      const updated = [{ id, type, name, timestamp: new Date().toLocaleTimeString() }, ...filtered];
      return updated.slice(0, 10); // Keep last 10 entries
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
  const exportData = () => {
    const dataStr = JSON.stringify(topics, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `research_vault_backup_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    showToast("Vault data exported successfully");
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].resources) {
          setTopics(parsed);
          setActiveTopicId(parsed[0].id);
          showToast("Vault backup imported successfully!");
        } else {
          alert("Invalid backup file format.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  };

  /* --- Authentication Handlers --- */

  const handleRegister = (e) => {
    e.preventDefault();
    const username = usernameInput.trim().toLowerCase();
    const password = passwordInput;
    if (!username || !password) {
      alert("Please enter a username and password.");
      return;
    }

    const savedProfiles = localStorage.getItem("rkv_profiles");
    const profiles = savedProfiles ? JSON.parse(savedProfiles) : {};

    if (profiles[username]) {
      alert("Username profile already exists in local vault storage.");
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
      alert("Please enter a username and password.");
      return;
    }

    const savedProfiles = localStorage.getItem("rkv_profiles");
    const profiles = savedProfiles ? JSON.parse(savedProfiles) : {};

    const profile = profiles[username];
    if (!profile || profile.password !== password) {
      alert("Invalid vault username profile key or password PIN.");
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
      alert("Old password PIN is incorrect.");
      return;
    }

    profiles[currentUser].password = newPinInput;
    localStorage.setItem("rkv_profiles", JSON.stringify(profiles));
    setOldPinInput("");
    setNewPinInput("");
    setSettingsModalOpen(false);
    showToast("Password PIN successfully changed.");
  };

  const handleClearAllData = () => {
    if (confirm("WARNING: This will permanently delete all topics, resources, notes, and discoveries for this profile. Continue?")) {
      setTopics([]);
      setUnsortedResources([]);
      setRecentlyViewed([]);
      setActiveTopicId(null);
      setSettingsModalOpen(false);
      showToast("Vault cleared completely.");
    }
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
    if (confirm("Are you sure you want to delete this topic and all its contents?")) {
      const remaining = topics.filter((t) => t.id !== id);
      setTopics(remaining);
      if (activeTopicId === id && remaining.length > 0) {
        setActiveTopicId(remaining[0].id);
        setActiveView("topic");
      } else if (remaining.length === 0) {
        setActiveTopicId(null);
        setActiveView("all-topics");
      }
      showToast("Topic deleted");
    }
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
    const newRes = {
      id: nextId("r"),
      title,
      type: newResourceType,
      status: "Unread",
      date: today,
      sourceId: newResourceUrl ? nextId("s") : null,
    };

    if (activeView === "unsorted") {
      setUnsortedResources((prev) => [newRes, ...prev]);
      showToast("Resource added to Unsorted list");
    } else {
      setTopics((prev) =>
        prev.map((t) => {
          if (t.id !== activeTopicId) return t;
          const resources = [newRes, ...t.resources];
          const sources = newResourceUrl
            ? [
                {
                  id: newRes.sourceId,
                  type: newResourceType === "YouTube Video" ? "Video" : "Website",
                  title: `${title} Source`,
                  url: newResourceUrl,
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
              { date: today, text: `Changed status of "${resObj.title}" to ${next}.` },
              ...t.timeline,
            ],
          };
        })
      );
    }
    showToast(`Marked resource as ${nextStatus}`);
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

  const quickCaptureSave = (topicTargetId, type, content) => {
    const today = new Date().toISOString().split("T")[0];
    if (type === "discovery") {
      const title = content.length > 40 ? content.slice(0, 40) + "..." : content;
      
      if (topicTargetId === "unsorted") {
        alert("Discoveries must be filed under a specific Research Topic. Please choose a topic.");
        return;
      }

      setTopics((prev) =>
        prev.map((t) => {
          if (t.id !== topicTargetId) return t;
          const disc = {
            id: nextId("d"),
            title,
            statement: content,
            verification: "Unverified",
            visibility: "Private",
            relatedResources: [],
            relatedNotes: [],
            date: today,
          };
          return {
            ...t,
            discoveries: [disc, ...t.discoveries],
            timeline: [{ date: today, text: `Captured discovery: "${title}"` }, ...t.timeline],
          };
        })
      );
      showToast(`Captured discovery under topic`);
    } else {
      // Resource
      let title = content;
      let resType = "Website";
      try {
        const url = new URL(content.startsWith("http") ? content : `https://${content}`);
        title = url.hostname.replace("www.", "") + (url.pathname !== "/" ? url.pathname : "");
        if (/youtube\.com|youtu\.be/.test(url.hostname)) resType = "YouTube Video";
        else if (url.pathname.endsWith(".pdf")) resType = "PDF";
      } catch (err) {
        // Keep title as content
      }

      const resObj = {
        id: nextId("r"),
        title,
        type: resType,
        status: "Unread",
        date: today,
        sourceId: nextId("s"),
      };

      if (topicTargetId === "unsorted") {
        setUnsortedResources((prev) => [resObj, ...prev]);
        showToast("Quick captured to Unsorted");
      } else {
        setTopics((prev) =>
          prev.map((t) => {
            if (t.id !== topicTargetId) return t;
            const src = {
              id: resObj.sourceId,
              type: resType === "YouTube Video" ? "Video" : "Website",
              title,
              url: content,
              date: today.split("-")[0],
            };
            return {
              ...t,
              resources: [resObj, ...t.resources],
              sources: [src, ...t.sources],
              timeline: [{ date: today, text: `Captured resource: "${title}"` }, ...t.timeline],
            };
          })
        );
        showToast(`Quick captured resource to topic`);
      }
    }
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

      {/* 1. SIDEBAR PANEL */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo-row">
            <span style={{ fontSize: "22px" }}>📂</span>
            <h1 className="sidebar-title">Research Vault</h1>
          </div>
          <span className="sidebar-sub">knowledge compiler</span>
        </div>

        <div className="workspace-dropdown">
          <button className="workspace-btn">
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Shield size={14} style={{ color: "#5E8577" }} />
              <strong>{currentUser}'s Vault</strong>
            </span>
            <Lock size={12} style={{ color: "var(--text-dim)" }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Library Navigation */}
          <div className="sidebar-nav-section">
            <div className="sidebar-section-title">Library</div>
            <button
              className={`sidebar-item ${activeView === "all-topics" ? "active" : ""}`}
              onClick={() => { setActiveView("all-topics"); setActiveTopicId(null); }}
            >
              <BookMarked size={15} />
              <span>All Topics</span>
            </button>
            <button
              className={`sidebar-item ${activeView === "unsorted" ? "active" : ""}`}
              onClick={() => { setActiveView("unsorted"); setActiveTopicId(null); }}
            >
              <HelpCircle size={15} />
              <span>Unsorted</span>
            </button>
            <button
              className={`sidebar-item ${activeView === "recently-viewed" ? "active" : ""}`}
              onClick={() => { setActiveView("recently-viewed"); setActiveTopicId(null); }}
            >
              <Eye size={15} />
              <span>Recently Viewed</span>
            </button>
          </div>

          {/* Topics List */}
          <div className="sidebar-nav-section">
            <div className="sidebar-section-title">
              <span>Research Topics</span>
              <button onClick={() => setAddingTopic(true)} title="Add new topic">
                <Plus size={14} />
              </button>
            </div>

            {addingTopic && (
              <div style={{ padding: "8px 20px" }}>
                <input
                  type="text"
                  placeholder="Topic name..."
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                    fontSize: "12px",
                    color: "white"
                  }}
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createTopic();
                    if (e.key === "Escape") setAddingTopic(false);
                  }}
                />
                <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                  <button
                    onClick={createTopic}
                    style={{
                      background: "var(--accent-brass)",
                      color: "black",
                      border: "none",
                      padding: "3px 8px",
                      fontSize: "11px",
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setAddingTopic(false)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-secondary)",
                      padding: "3px 8px",
                      fontSize: "11px",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {topics.map((t) => {
              const active = activeView === "topic" && t.id === activeTopicId;
              const accentColor = ACCENTS[t.accent] || "#C9974D";
              return (
                <button
                  key={t.id}
                  className={`sidebar-item ${active ? "active" : ""}`}
                  style={{ "--accent-color": accentColor }}
                  onClick={() => {
                    setActiveTopicId(t.id);
                    setActiveView("topic");
                    setActiveTab("Overview");
                  }}
                >
                  <span className="sidebar-item-bullet" style={{ background: accentColor }} />
                  <span className="serif" style={{ fontSize: "14.5px", fontWeight: 500 }}>{t.name}</span>
                  {t.starred && <Star size={11} fill="#C9974D" stroke="none" style={{ marginLeft: "auto" }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sidebar-footer">
          {/* Backup Import Export */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="desktop-app-btn" style={{ flex: 1 }} onClick={exportData} title="Export Vault Data">
              <FileDown size={14} />
              <span>Export</span>
            </button>
            <label className="desktop-app-btn" style={{ flex: 1, cursor: "pointer" }} title="Import Vault Data">
              <FileUp size={14} />
              <span>Import</span>
              <input type="file" accept=".json" onChange={importData} style={{ display: "none" }} />
            </label>
          </div>

          <button className="desktop-app-btn" onClick={handleLogout} style={{ color: "var(--accent-garnet)", borderColor: "rgba(166, 83, 61, 0.3)" }}>
            <LogOut size={14} />
            <span>Lock Vault</span>
          </button>
        </div>
      </aside>

      {/* 2. SECONDARY COLUMN (RESOURCES COLUMN) */}
      <section className="secondary-column">
        <div className="secondary-header">
          <h2 className="secondary-title">
            {activeView === "unsorted" ? "Unsorted" : "Resources"}
          </h2>
          <div className="secondary-header-actions">
            <button
              className="btn-icon-square"
              onClick={() => {
                if (topics.length === 0 && activeView !== "unsorted") {
                  alert("Please create a Research Topic first in the sidebar before adding resources.");
                  return;
                }
                setAddingResource(!addingResource);
              }}
              title="Add resource inline"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {addingResource && (activeTopicId || activeView === "unsorted") && (
          <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              type="text"
              placeholder="Resource name / title..."
              className="form-input"
              value={newResourceTitle}
              onChange={(e) => setNewResourceTitle(e.target.value)}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <select
                className="form-input"
                style={{ flex: 1 }}
                value={newResourceType}
                onChange={(e) => setNewResourceType(e.target.value)}
              >
                {Object.keys(TYPE_ICON).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="URL (optional)"
                className="form-input"
                style={{ flex: 1.5 }}
                value={newResourceUrl}
                onChange={(e) => setNewResourceUrl(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button className="btn-ghost" onClick={() => setAddingResource(false)}>Cancel</button>
              <button className="btn-solid" style={{ background: "var(--accent-brass)", color: "black" }} onClick={addResourceDirect}>Save</button>
            </div>
          </div>
        )}

        <div className="secondary-filter-bar">
          {["All", ...STATUS_ORDER].map((f) => (
            <button
              key={f}
              className={`filter-pill ${resourceFilter === f ? "active" : ""}`}
              onClick={() => setResourceFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="resource-cards-list">
          {activeView === "all-topics" || activeView === "recently-viewed" ? (
            <div className="empty-state" style={{ padding: "40px 10px" }}>
              <BookMarked size={24} style={{ color: "var(--text-dim)" }} />
              <div className="empty-title" style={{ fontSize: "14px" }}>
                {activeView === "recently-viewed" ? "Recently Viewed" : "All Research Topics"}
              </div>
              <p className="empty-body" style={{ fontSize: "11px" }}>Select a topic on the left to see its resources.</p>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 10px" }}>
              <Link2 size={24} style={{ color: "var(--text-dim)" }} />
              <div className="empty-title" style={{ fontSize: "14px" }}>No resources here</div>
              <p className="empty-body" style={{ fontSize: "11px" }}>Press "+" to add a resource.</p>
            </div>
          ) : (
            filteredResources.map((r) => {
              const Icon = TYPE_ICON[r.type] || FileText;
              const active = r.id === activeResourceId;
              const sourceObj = r.sourceId && activeTopic ? activeTopic.sources.find((s) => s.id === r.sourceId) : null;
              return (
                <div
                  key={r.id}
                  className={`resource-mini-card ${active ? "active" : ""}`}
                  style={{ "--accent-color": accentHex }}
                  onClick={() => {
                    setActiveResourceId(r.id);
                    addToRecentlyViewed(r.id, "resource", r.title);
                  }}
                >
                  <div className="resource-mini-header">
                    <div className="resource-mini-title-wrap">
                      <Icon size={14} className="resource-mini-icon" />
                      <h4 className="resource-mini-title">{r.title}</h4>
                    </div>
                  </div>

                  <div className="resource-mini-meta">
                    <span className="mono" style={{ textTransform: "uppercase", fontSize: "9.5px" }}>{r.type}</span>
                    <button
                      className={`status-pill status-${r.status.toLowerCase()}`}
                      style={{ fontSize: "9px", padding: "2px 8px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        cycleStatus(r.id);
                      }}
                    >
                      {r.status}
                    </button>
                  </div>
                  {sourceObj?.url && (
                    <span className="mono resource-mini-url" style={{ fontSize: "9.5px", marginTop: "2px" }}>
                      🔗 {sourceObj.url}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 3. MAIN WORKSPACE */}
      <main className="main-workspace">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="search-container">
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
          </div>

          <div className="topbar-right">
            <button
              className="btn-new-capture"
              onClick={() => {
                if (topics.length === 0) {
                  alert("Please create a Research Topic first in the sidebar before capturing data.");
                  return;
                }
                setCaptureMode("discovery");
                setCaptureOpen(true);
              }}
            >
              <Plus size={16} />
              <span>New</span>
            </button>
            <button className="topbar-icon-btn" onClick={() => showToast("Offline synchronization verified.")} title="Toggle Theme">
              <Moon size={16} />
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

            <button className="topbar-icon-btn" onClick={() => setHelpModalOpen(true)} title="Help & Documentation">
              <HelpCircle size={16} />
            </button>
            <button className="topbar-icon-btn" onClick={() => setSettingsModalOpen(true)} title="Settings">
              <Settings size={16} />
            </button>

            {/* Profile Dropdown Toggle */}
            <div className="profile-dropdown-wrapper">
              <div className="user-profile-avatar" title="Vault Profile Dropdown" onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}>
                {currentUser.slice(0, 2).toUpperCase()}
              </div>
              {profileDropdownOpen && (
                <div className="profile-dropdown-menu">
                  <div className="profile-menu-header">
                    <div className="profile-menu-name">Profile: {currentUser}</div>
                    <div className="profile-menu-sub">Active Local Space</div>
                  </div>
                  <button className="profile-menu-item" onClick={() => { setProfileDropdownOpen(false); setSettingsModalOpen(true); }}>
                    <Settings size={14} />
                    <span>Vault Settings</span>
                  </button>
                  <button className="profile-menu-item" onClick={() => { setProfileDropdownOpen(false); setHelpModalOpen(true); }}>
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
          <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
            <h2 className="serif" style={{ fontSize: "26px", marginBottom: "20px" }}>Research Topic Inventory</h2>
            {topics.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "60px" }}>
                <div style={{ fontSize: "56px", marginBottom: "16px" }}>📂</div>
                <h3 className="serif" style={{ fontSize: "20px", marginBottom: "8px" }}>Vault is Empty</h3>
                <p style={{ color: "var(--text-secondary)", textAlign: "center", maxWidth: "380px" }}>
                  Create your first Research Topic container by pressing the <strong style={{ color: "var(--accent-brass)" }}>+</strong> icon in the sidebar list.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
                {topics.map((t) => (
                  <div
                    key={t.id}
                    className="stat-card"
                    style={{ borderLeft: `4px solid ${ACCENTS[t.accent] || "#C9974D"}` }}
                    onClick={() => { setActiveTopicId(t.id); setActiveView("topic"); setActiveTab("Overview"); }}
                  >
                    <h4 className="serif" style={{ fontSize: "18px", fontWeight: "600" }}>{t.name}</h4>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "4px 0 12px" }}>{t.tagline}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                      <span>📄 {t.resources.length} resources</span>
                      <span>💡 {t.discoveries.length} discoveries</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === "unsorted" && (
          <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
            <h2 className="serif" style={{ fontSize: "26px", marginBottom: "10px" }}>Unsorted Inbox</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "20px", fontSize: "13.5px" }}>
              Contains quick resources pasted without an assigned topic container. To assign them, click cycle status or manage them directly.
            </p>
            {unsortedResources.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "60px" }}>
                <HelpCircle size={48} style={{ color: "var(--text-dim)", marginBottom: "14px" }} />
                <h3 className="serif" style={{ fontSize: "18px" }}>No unsorted items</h3>
                <p style={{ color: "var(--text-dim)" }}>Everything has been cleanly categorized.</p>
              </div>
            ) : (
              <div className="resources-tab-list">
                {unsortedResources.map((r) => {
                  const Icon = TYPE_ICON[r.type] || FileText;
                  return (
                    <div key={r.id} className="resource-detail-card">
                      <div className="resource-detail-left">
                        <Icon size={18} className="resource-detail-icon" />
                        <div className="resource-detail-info">
                          <h4 className="resource-detail-title">{r.title}</h4>
                          <span className="resource-detail-meta">{r.type} • Unsorted Inbox</span>
                        </div>
                      </div>
                      <button className={`status-pill status-${r.status.toLowerCase()}`} onClick={() => cycleStatus(r.id)}>
                        {r.status}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeView === "recently-viewed" && (
          <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
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
                    }}
                  >
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      {item.type === "topic" ? <BookOpen size={18} /> : <FileText size={18} />}
                      <div>
                        <h4 style={{ fontSize: "14px", fontWeight: "600" }}>{item.name}</h4>
                        <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                          Type: {item.type} • Accessed at {item.timestamp}
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
                  <div className="resources-tab-list">
                    {activeTopic.resources.length === 0 ? (
                      <div className="empty-state">
                        <Link2 size={32} />
                        <div className="empty-title">No resources added</div>
                        <p className="empty-body">Create new resources using the secondary list header plus button.</p>
                      </div>
                    ) : (
                      activeTopic.resources.map((r) => {
                        const Icon = TYPE_ICON[r.type] || FileText;
                        return (
                          <div key={r.id} className="resource-detail-card">
                            <div className="resource-detail-left">
                              <Icon size={18} className="resource-detail-icon" />
                              <div className="resource-detail-info">
                                <h4 className="resource-detail-title">{r.title}</h4>
                                <span className="resource-detail-meta">
                                  {r.type} • added {fmtDate(r.date)}
                                </span>
                              </div>
                            </div>
                            
                            <button
                              className={`status-pill status-${r.status.toLowerCase()}`}
                              onClick={() => cycleStatus(r.id)}
                            >
                              {r.status}
                            </button>
                          </div>
                        );
                      })
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
                      {activeTopic.notes.map((n) => (
                        <div key={n.id} className="note-card">
                          <div className="note-card-header">
                            <span className="note-card-date">{fmtDate(n.date)}</span>
                          </div>
                          <p className="note-card-text">{n.text}</p>
                          
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

                        <div className="discovery-card-header">
                          <h4 className="discovery-card-title">{d.title}</h4>
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
                        <div key={s.id} className="source-card-item">
                          <h4 className="source-card-title">{s.title}</h4>
                          <div className="source-card-meta">
                            {s.type === "Book" && `Author: ${s.author} • Publisher: ${s.publisher} • Pages: ${s.pages || "N/A"}`}
                            {s.type === "Video" && `Video Channel: ${s.channel || "N/A"} • URL: ${s.url}`}
                            {s.type === "Website" && `Author: ${s.author || "N/A"} • Published: ${s.date || "N/A"} • URL: ${s.url}`}
                          </div>
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
            <aside className="workspace-right-sidebar">
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
                  <h4 className="about-title" style={{ fontSize: "14px" }}>Recent Notes</h4>
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
                <label className="form-label">Destination Research Topic</label>
                <select id="quick-capture-topic-select" className="form-input" defaultValue={activeTopicId || "unsorted"}>
                  <option value="unsorted">Unsorted Inbox (No Topic)</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {captureMode === "discovery" ? "Discovery Statement" : "Resource Link / Title"}
                </label>
                <textarea
                  id="quick-capture-textarea"
                  className="form-textarea"
                  placeholder={
                    captureMode === "discovery"
                      ? "E.g., ESP32 boot buttons must be pressed down to sync uploads."
                      : "E.g., https://github.com/cyberbotics/webots"
                  }
                  rows={4}
                />
              </div>
            </div>

            <div className="drawer-footer">
              <button className="btn-ghost" onClick={() => setCaptureOpen(false)}>Cancel</button>
              <button
                className="btn-solid"
                style={{ background: "var(--accent-purple)", color: "white" }}
                onClick={() => {
                  const selectEl = document.getElementById("quick-capture-topic-select");
                  const textEl = document.getElementById("quick-capture-textarea");
                  if (textEl && textEl.value.trim()) {
                    quickCaptureSave(selectEl.value, captureMode, textEl.value.trim());
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
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Vault Settings</h3>
              <button className="drawer-close-btn" onClick={() => setSettingsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
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
                <h4 style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Backup Management</h4>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button className="desktop-app-btn" onClick={exportData}>Export JSON Vault</button>
                  <label className="desktop-app-btn" style={{ cursor: "pointer", textAlign: "center" }}>
                    Import Backup
                    <input type="file" accept=".json" onChange={importData} style={{ display: "none" }} />
                  </label>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "14px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: "600", color: "var(--accent-garnet)", marginBottom: "8px" }}>Danger Zone</h4>
                <button className="btn-solid" style={{ background: "var(--accent-garnet)", color: "white", width: "100%" }} onClick={handleClearAllData}>
                  Clear All Vault Data
                </button>
              </div>
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
                <li><strong style={{ color: "var(--text-primary)" }}>Escape</strong>: Close active quick capture drawers and dialog overlays.</li>
              </ul>

              <h4 style={{ fontWeight: "600", marginTop: "10px" }}>How to import / export?</h4>
              <p style={{ color: "var(--text-secondary)" }}>
                Use the Export and Import buttons in the sidebar or the Settings menu to backup your research catalog to a JSON file.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
