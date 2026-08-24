// ============================================================
// HABIT DATA
// Each habit carries: emoji, mood (used for avatar CSS class),
// quote (Gen-Z commentary), and score (effect on happiness meter)
// ============================================================

const HABIT_CATEGORIES = {
  Entertainment: {
    icon: "🎮",
    habits: [
      { name: "Scrolling Reels", emoji: "🥴", mood: "drained", quote: "bro really chose the void over sleep", score: -6 },
      { name: "Gaming Marathon", emoji: "🎯", mood: "hyper", quote: "no thoughts, just headshots", score: -3 },
      { name: "Binge Watching", emoji: "📺", mood: "numb", quote: "one more episode... six hours ago", score: -5 },
    ],
  },
  Productivity: {
    icon: "💻",
    habits: [
      { name: "Deep Work Session", emoji: "🧠", mood: "locked-in", quote: "the rizz of actually finishing a task", score: 8 },
      { name: "Inbox Zero", emoji: "📬", mood: "accomplished", quote: "adulting arc: activated", score: 5 },
      { name: "Read a Book", emoji: "📖", mood: "wise", quote: "certified bookworm behavior fr", score: 6 },
    ],
  },
  Health: {
    icon: "💪",
    habits: [
      { name: "Gym Session", emoji: "🔥", mood: "buff", quote: "gains szn, no cap", score: 9 },
      { name: "Drank Water", emoji: "💧", mood: "hydrated", quote: "hydro homies rise up", score: 3 },
      { name: "Slept 8hrs", emoji: "😴", mood: "rested", quote: "actually woke up as a functional human", score: 7 },
    ],
  },
  Social: {
    icon: "👥",
    habits: [
      { name: "Called Family", emoji: "🥹", mood: "warm", quote: "wholesome moment, no jokes here", score: 6 },
      { name: "Doomscrolled DMs", emoji: "😵‍💫", mood: "anxious", quote: "checking texts like it's a part-time job", score: -4 },
    ],
  },
  Finance: {
    icon: "💸",
    habits: [
      { name: "Impulse Purchase", emoji: "🫠", mood: "regret", quote: "bank account said 'bruh'", score: -7 },
      { name: "Budgeted Spending", emoji: "🧾", mood: "responsible", quote: "financial rizz unlocked", score: 5 },
    ],
  },
};

// ============================================================
// STATE
// ============================================================

let editor;
let happiness = 50; // 0-100 scale
let lastNodeId = null; // tracks the most recently added node, for auto-chaining

// ============================================================
// INIT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  initDrawflow();
  populateHabitDropdowns();
  updateHappinessDisplay();
  initSidebarToggle();

  document.getElementById("add-node-btn").addEventListener("click", handleAddNode);
  document.getElementById("download-btn").addEventListener("click", handleDownloadBackup);
  document.getElementById("upload-input").addEventListener("change", handleUploadBackup);
});

// ============================================================
// MOBILE SIDEBAR DRAWER
// ============================================================

function initSidebarToggle() {
  const toggleBtn = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");

  toggleBtn.addEventListener("click", () => {
    const isOpen = sidebar.classList.contains("sidebar-open");
    if (isOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  backdrop.addEventListener("click", closeSidebar);
}

function openSidebar() {
  document.getElementById("sidebar").classList.add("sidebar-open");
  document.getElementById("sidebar-backdrop").classList.add("active");
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("sidebar-open");
  document.getElementById("sidebar-backdrop").classList.remove("active");
}

function isMobileViewport() {
  return window.innerWidth <= 768;
}

function initDrawflow() {
  const container = document.getElementById("drawflow");
  editor = new Drawflow(container);
  editor.reroute = true;
  editor.start();

  initConnectionDrawAnimation(container);
}

// Watches for newly drawn connection paths and animates them "drawing in"
// via stroke-dashoffset, instead of just popping into existence.
function initConnectionDrawAnimation(drawflowContainer) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;

        const paths = node.matches && node.matches("path.main-path")
          ? [node]
          : node.querySelectorAll
            ? node.querySelectorAll("path.main-path")
            : [];

        paths.forEach((path) => {
          try {
            const length = path.getTotalLength();
            path.style.strokeDasharray = length;
            path.style.strokeDashoffset = length;
            // force a reflow so the browser registers the starting state
            // before we transition to the end state
            path.getBoundingClientRect();
            path.style.transition = "stroke-dashoffset 0.5s ease";
            requestAnimationFrame(() => {
              path.style.strokeDashoffset = "0";
            });
          } catch (err) {
            // getTotalLength can fail on a path with no length yet; skip silently
          }
        });
      });
    });
  });

  observer.observe(drawflowContainer, { childList: true, subtree: true });
}

// ============================================================
// DROPDOWNS
// ============================================================

function populateHabitDropdowns() {
  const categorySelect = document.getElementById("category-select");
  categorySelect.innerHTML = "";

  Object.keys(HABIT_CATEGORIES).forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = `${HABIT_CATEGORIES[cat].icon} ${cat}`;
    categorySelect.appendChild(opt);
  });

  categorySelect.addEventListener("change", updateHabitOptions);
  updateHabitOptions();
}

function updateHabitOptions() {
  const category = document.getElementById("category-select").value;
  const habitSelect = document.getElementById("habit-select");
  habitSelect.innerHTML = "";

  HABIT_CATEGORIES[category].habits.forEach((habit, index) => {
    const opt = document.createElement("option");
    opt.value = index;
    opt.textContent = `${habit.emoji} ${habit.name}`;
    habitSelect.appendChild(opt);
  });
}

// ============================================================
// NODE CREATION
// ============================================================

function handleAddNode() {
  const category = document.getElementById("category-select").value;
  const habitIndex = document.getElementById("habit-select").value;
  const habit = HABIT_CATEGORIES[category].habits[habitIndex];
  const noteInput = document.getElementById("custom-note-input");
  const initialNote = noteInput.value || "";

  const nodeHTML = `
    <div class="habit-node">
      <div class="habit-node-header">${habit.emoji} ${habit.name}</div>
      <textarea df-note class="habit-note-input" placeholder="Add a note...">${escapeHtml(initialNote)}</textarea>
    </div>
  `;

  const nodeData = {
    category: category,
    habitName: habit.name,
    note: initialNote,
    score: habit.score,
  };

  // Spread new nodes out a bit so they don't stack directly on the avatar
  const posX = Math.random() * 500 + 50;
  const posY = Math.random() * 350 + 50;

  const newNodeId = editor.addNode(
    habit.name,
    1,
    1,
    posX,
    posY,
    "habit-" + category.toLowerCase(),
    nodeData,
    nodeHTML,
    false // plain HTML, no Vue dependency
  );

  // Auto-chain: connect the previous node's output to this node's input,
  // so the canvas reads as a timeline of the day rather than loose nodes.
  if (lastNodeId !== null) {
    editor.addConnection(lastNodeId, newNodeId, "output_1", "input_1");
  }
  lastNodeId = newNodeId;

  applyHappinessDelta(habit.score);
  updateAvatarReaction(habit);
  triggerAvatarReactionAnimation(habit.score);
  triggerHappinessBarPulse();
  spawnScoreEffects(habit.score);

  noteInput.value = "";

  if (isMobileViewport()) {
    closeSidebar();
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// AVATAR REACTIONS
// ============================================================

function updateAvatarReaction(habit) {
  document.getElementById("avatar-emoji").textContent = habit.emoji;
  document.getElementById("avatar-speech").textContent = habit.quote;

  const container = document.getElementById("avatar-container");
  container.className = "avatar-mood-" + habit.mood;
}

// Restarts a CSS animation on an element by removing then re-adding its
// class (a browser reflow in between forces the animation to replay,
// since just re-adding the same class name otherwise does nothing).
function replayAnimation(el, className) {
  el.classList.remove(className);
  void el.offsetWidth; // force reflow
  el.classList.add(className);
}

function triggerAvatarReactionAnimation(score) {
  const emoji = document.getElementById("avatar-emoji");
  const bubble = document.querySelector(".speech-bubble");

  emoji.classList.remove("avatar-bump", "avatar-shake");
  void emoji.offsetWidth;
  emoji.classList.add(score >= 0 ? "avatar-bump" : "avatar-shake");

  replayAnimation(bubble, "speech-bubble-pop");
}

// ============================================================
// PARTICLE BURST + FLOATING SCORE POPUP
// ============================================================

const POSITIVE_COMIC_WORDS = ["POW!", "LET'S GO!", "W!", "YESSS!", "BOOM!"];
const NEGATIVE_COMIC_WORDS = ["OOF!", "BRUH!", "L!", "YIKES!", "NOPE!"];

function getRandomComicWord(score) {
  const pool = score >= 0 ? POSITIVE_COMIC_WORDS : NEGATIVE_COMIC_WORDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function spawnScoreEffects(score) {
  const fxLayer = document.getElementById("fx-layer");
  const wrap = document.querySelector(".canvas-wrap");
  const avatarEmoji = document.getElementById("avatar-emoji");

  const wrapRect = wrap.getBoundingClientRect();
  const emojiRect = avatarEmoji.getBoundingClientRect();

  const originX = emojiRect.left + emojiRect.width / 2 - wrapRect.left;
  const originY = emojiRect.top - wrapRect.top;

  spawnScorePopup(fxLayer, originX, originY, score);
  spawnParticleBurst(fxLayer, originX, originY, score);
}

function spawnScorePopup(fxLayer, x, y, score) {
  const popup = document.createElement("div");
  popup.className = "score-popup";

  const word = getRandomComicWord(score);
  const color = score >= 0 ? "var(--comic-green)" : "var(--comic-red)";

  popup.innerHTML = `
    <span class="comic-word" style="color: ${color};">${word}</span>
    <span class="comic-score" style="color: ${color};">${(score >= 0 ? "+" : "") + score}</span>
  `;
  popup.style.left = x + "px";
  popup.style.top = y + "px";

  fxLayer.appendChild(popup);
  popup.addEventListener("animationend", () => popup.remove());
}

function spawnParticleBurst(fxLayer, x, y, score) {
  const particleCount = 16;
  const goodColors = ["#2BB673", "#FFD400", "#1C4FD6"];
  const badColors = ["#ED1B2F", "#8B3FE8", "#111111"];
  const colors = score >= 0 ? goodColors : badColors;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";

    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 70;
    const tx = Math.cos(angle) * distance;
    // good particles drift upward more; bad particles sink slightly
    const ty = Math.sin(angle) * distance - (score >= 0 ? 50 : -10);

    particle.style.setProperty("--tx", tx + "px");
    particle.style.setProperty("--ty", ty + "px");
    particle.style.left = x + "px";
    particle.style.top = y + "px";
    const size = 5 + Math.random() * 5;
    particle.style.width = size + "px";
    particle.style.height = size + "px";
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];

    fxLayer.appendChild(particle);
    particle.addEventListener("animationend", () => particle.remove());
  }
}

// ============================================================
// HAPPINESS METER
// ============================================================

function applyHappinessDelta(delta) {
  happiness = Math.max(0, Math.min(100, happiness + delta));
  updateHappinessDisplay();
}

function triggerHappinessBarPulse() {
  const fill = document.getElementById("happiness-bar-fill");
  replayAnimation(fill, "pulse");

  // Pulse all active battery bars
  const bars = document.querySelectorAll(".battery-bar.active");
  bars.forEach((bar) => {
    replayAnimation(bar, "pulse");
  });
}

function updateHappinessDisplay() {
  const fill = document.getElementById("happiness-bar-fill");
  fill.style.width = happiness + "%";
  fill.style.backgroundColor = getChargeColor(happiness);
  document.getElementById("happiness-value").textContent = happiness;
  updateBatteryBars();
}

// ============================================================
// AVATAR CHARGE BATTERY (vertical bar-fill meter)
// ============================================================

function updateBatteryBars() {
  // 6 bars total, each bar represents ~16.67% (100/6)
  const barsPercentage = Math.ceil((happiness / 100) * 6);

  for (let i = 1; i <= 6; i++) {
    const bar = document.querySelector(`.battery-bar[data-bar="${i}"]`);
    if (i <= barsPercentage) {
      bar.classList.add("active");
      bar.style.fill = getChargeColor(happiness);
    } else {
      bar.classList.remove("active");
      bar.style.fill = "transparent";
    }
  }
}

// Interpolates comic-red -> comic-yellow -> comic-green as happiness
// goes 0 -> 50 -> 100, matching the CSS custom properties in style.css
function getChargeColor(percent) {
  const red = [237, 27, 47];     // --comic-red
  const yellow = [255, 212, 0];  // --comic-yellow
  const green = [43, 182, 115];  // --comic-green

  let start, end, t;
  if (percent <= 50) {
    start = red;
    end = yellow;
    t = percent / 50;
  } else {
    start = yellow;
    end = green;
    t = (percent - 50) / 50;
  }

  const r = Math.round(start[0] + (end[0] - start[0]) * t);
  const g = Math.round(start[1] + (end[1] - start[1]) * t);
  const b = Math.round(start[2] + (end[2] - start[2]) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

// ============================================================
// BACKEND SAVE / LOAD
// ============================================================

function showStatus(message, isError = false) {
  const el = document.getElementById("status-msg");
  el.textContent = message;
  el.style.color = isError ? "#ED1B2F" : "#2BB673";
  setTimeout(() => { el.textContent = ""; }, 3000);
}

// ============================================================
// CLIENT-SIDE BACKUP (download / upload JSON file)
// This is the only persistence mechanism now — no server calls.
// ============================================================

function handleDownloadBackup() {
  const exportData = editor.export();

  const backup = {
    canvas: exportData,
    happiness: happiness,
    saved_at: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  const dateStamp = new Date().toISOString().slice(0, 10);
  a.download = `life-sim-backup-${dateStamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showStatus("Backup downloaded ✔");
}

function handleUploadBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const backup = JSON.parse(e.target.result);

      if (!backup.canvas) {
        showStatus("That file doesn't look like a valid backup", true);
        return;
      }

      editor.clear();
      editor.import(backup.canvas);
      happiness = backup.happiness ?? 50;
      lastNodeId = getLastNodeIdFromCanvas();
      updateHappinessDisplay();

      showStatus("Backup loaded ✔");
    } catch (err) {
      console.error(err);
      showStatus("Couldn't read that file", true);
    }
  };

  reader.onerror = () => {
    showStatus("File read failed", true);
  };

  reader.readAsText(file);

  // reset the input so selecting the same file again still fires 'change'
  event.target.value = "";
}

// Finds the "last" node in an imported canvas so newly added nodes keep
// chaining onto the end of the timeline instead of an old, stale node.
// Heuristic: the node with the highest id in module "Home".
function getLastNodeIdFromCanvas() {
  try {
    const nodes = editor.drawflow.drawflow.Home.data;
    const ids = Object.keys(nodes).map(Number);
    if (ids.length === 0) return null;
    return Math.max(...ids);
  } catch (err) {
    console.error("Could not determine last node from canvas", err);
    return null;
  }
}