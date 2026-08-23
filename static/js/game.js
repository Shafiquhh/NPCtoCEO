let editor = null;
let nodeCounter = 0;

window.onload = function() {
    const container = document.getElementById("drawflow");
    if (container) {
        editor = new Drawflow(container);
        editor.start();
        console.log("Drawflow initialized successfully!");
    } else {
        console.error("Drawflow container element not found!");
    }
};

function handleDirectClick() {
    if (!editor) {
        alert("Drawflow editor is still initializing. Please wait a second.");
        return;
    }

    const selectElement = document.getElementById("habitSelect");
    if (!selectElement) return;

    const habitType = selectElement.value;

    const posX = 150 + (nodeCounter * 20);
    const posY = 100 + (nodeCounter * 20);
    nodeCounter++;

    let title = "Habit";
    let desc = "Done today";

    if (habitType === 'reels') {
        title = "📱 Entertainment";
        desc = "Watched 2hrs of reels in AM";
    } else if (habitType === 'work') {
        title = "⚡ Productivity";
        desc = "Deep work session completed";
    } else if (habitType === 'gym') {
        title = "💪 Health";
        desc = "Crushed the gym workout";
    }

    const html = `<div><div class="title-box">${title}</div><div class="box"><p>${desc}</p></div></div>`;

    // Pass 'false' instead of 'html' as the last parameter for plain vanilla HTML strings
    editor.addNode(habitType, 1, 1, posX, posY, 'node-style', {}, html, false);

    const avatar = document.getElementById("avatar-character");
    const bubble = document.getElementById("speech-bubble");

    if (!avatar || !bubble) return;

    if (habitType === 'reels') {
        avatar.innerHTML = "🧟‍♂️";
        bubble.innerHTML = "Bro really scrolled reels for 2 hours in the morning. Put down the phone and touch grass.";
    } else if (habitType === 'work' || habitType === 'gym') {
        avatar.innerHTML = "😎";
        bubble.innerHTML = "W behavior. We are locking in today, let's go!";
    } else {
        avatar.innerHTML = "🤔";
        bubble.innerHTML = "Interesting choice... let's see where this leads.";
    }
}

function saveDay() {
    if (!editor) return;
    const data = editor.export();

    fetch('/api/save-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(res => alert(res.message))
    .catch(err => console.error("Save error:", err));
}