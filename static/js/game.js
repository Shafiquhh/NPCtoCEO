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

  document.getElementById("add-node-btn").addEventListener("click", handleAddNode);
  document.getElementById("download-btn").addEventListener("click", handleDownloadBackup);
  document.getElementById("upload-input").addEventListener("change", handleUploadBackup);
});

function initDrawflow() {
  const container = document.getElementById("drawflow");
  editor = new Drawflow(container);
  editor.reroute = true;
  editor.start();
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

  noteInput.value = "";
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

// ============================================================
// HAPPINESS METER
// ============================================================

function applyHappinessDelta(delta) {
  happiness = Math.max(0, Math.min(100, happiness + delta));
  updateHappinessDisplay();
}

function updateHappinessDisplay() {
  document.getElementById("happiness-bar-fill").style.width = happiness + "%";
  document.getElementById("happiness-value").textContent = happiness;
}

// ============================================================
// BACKEND SAVE / LOAD
// ============================================================

function showStatus(message, isError = false) {
  const el = document.getElementById("status-msg");
  el.textContent = message;
  el.style.color = isError ? "#ff6b6b" : "#7fdb8f";
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