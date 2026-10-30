const designers = [
  { id: "d1", name: "Elena Vance", email: "elena.vance@example.com", avatar: "https://i.pravatar.cc/100?img=47" },
  { id: "d2", name: "Marcus Chen", email: "marcus.chen@example.com", avatar: "https://i.pravatar.cc/100?img=12" },
  { id: "d3", name: "Sophia Patel", email: "sophia.patel@example.com", avatar: "https://i.pravatar.cc/100?img=44" },
  { id: "d4", name: "Noah Williams", email: "noah.williams@example.com", avatar: "https://i.pravatar.cc/100?img=13" },
  { id: "d5", name: "Ava Thompson", email: "ava.thompson@example.com", avatar: "https://i.pravatar.cc/100?img=49" }
];

const dateOffset = (days) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

let tasks = [
  { id:"TSK-1048", name:"Homepage hero banner redesign", type:"Web banner", status:"In Progress", designerId:"d1", priority:"High", accepted:dateOffset(-2), delivery:dateOffset(3), description:"Redesign the homepage hero banner with a clearer visual hierarchy and updated campaign messaging.", objective:"Improve campaign visibility and engagement.", platform:"Website · 1920 × 600 px", references:"", checklist:["Review current brand guidelines","Prepare desktop and mobile variations"], formats:["Figma","PNG"], files:[], messages:0 },
  { id:"TSK-1047", name:"Product launch email template", type:"Email template", status:"In Review", designerId:"d2", priority:"Urgent", accepted:dateOffset(-5), delivery:dateOffset(1), description:"Create a responsive product launch email template.", objective:"Communicate the launch clearly and drive users to the product.", platform:"Email · Responsive", references:"", checklist:["Desktop layout","Mobile layout","Email compatibility"], formats:["HTML","PNG"], files:[], messages:2 },
  { id:"TSK-1046", name:"Campaign landing page UI", type:"Landing page", status:"In Progress", designerId:"d3", priority:"High", accepted:dateOffset(-3), delivery:dateOffset(5), description:"Design a conversion-focused landing page for the upcoming campaign.", objective:"Increase sign-ups from campaign traffic.", platform:"Web · Responsive", references:"", checklist:["Wireframe","Visual design"], formats:["Figma","PNG"], files:[], messages:0 },
  { id:"TSK-1045", name:"Social media campaign creatives", type:"Social creative", status:"Pending", designerId:"d4", priority:"Medium", accepted:dateOffset(0), delivery:dateOffset(6), description:"Create a set of social media campaign creatives.", objective:"Maintain visual consistency across social channels.", platform:"Instagram and LinkedIn", references:"", checklist:["Feed creative","Story creative"], formats:["PNG","SVG"], files:[], messages:0 },
  { id:"TSK-1044", name:"Portfolio dashboard UI updates", type:"UI screen", status:"Completed", designerId:"d1", priority:"Medium", accepted:dateOffset(-12), delivery:dateOffset(-4), description:"Improve the dashboard layout and visual consistency.", objective:"Make important portfolio information easier to scan.", platform:"Web app", references:"", checklist:["Dashboard layout","Responsive review"], formats:["Figma","PNG"], files:[], messages:0 },
  { id:"TSK-1043", name:"Investment newsletter visuals", type:"Email template", status:"In Review", designerId:"d5", priority:"Low", accepted:dateOffset(-4), delivery:dateOffset(2), description:"Design supporting visuals for the investment newsletter.", objective:"Make newsletter content more engaging.", platform:"Email", references:"", checklist:["Header artwork","Section visuals"], formats:["PNG","SVG"], files:[], messages:1 },
  { id:"TSK-1042", name:"Mobile onboarding screens", type:"UI screen", status:"In Progress", designerId:"d2", priority:"High", accepted:dateOffset(-6), delivery:dateOffset(4), description:"Create a streamlined onboarding flow for mobile users.", objective:"Make account onboarding clear and easy to complete.", platform:"Mobile app", references:"", checklist:["Welcome screen","Details screen","Confirmation screen"], formats:["Figma","PNG"], files:[], messages:0 },
  { id:"TSK-1041", name:"Feature announcement banner", type:"Web banner", status:"Completed", designerId:"d3", priority:"Low", accepted:dateOffset(-15), delivery:dateOffset(-7), description:"Design a feature announcement banner.", objective:"Highlight the new feature across the website.", platform:"Website", references:"", checklist:["Desktop banner","Mobile banner"], formats:["PNG"], files:[], messages:0 }
];

let activeStatus = "All";
let searchTerm = "";
let selectedPriority = "Medium";
let selectedFormats = new Set(["Figma", "PNG"]);
let uploadedFiles = [];
let selectedTaskId = null;
let detailTab = "Overview";
let activeChatDesignerId = null;
let activeChatTaskId = null;
let chatMessages = {};
let draftCount = 0;
let currentPage = 1;
let openMenuId = null;
let toastTimer = null;

designers.forEach(d => {
  chatMessages[d.id] = [
    { direction:"incoming", text:"Hi! Let me know if you need anything related to your design requests.", time:"10:15 AM" }
  ];
});

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[ch]);
}

function getDesigner(id) {
  return designers.find(d => d.id === id) || designers[0];
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value + "T12:00:00");
  return d.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}

function statusClass(status) {
  return ({
    "Completed":"status-completed",
    "In Progress":"status-in-progress",
    "Pending":"status-pending",
    "Canceled":"status-canceled",
    "In Review":"status-in-review"
  })[status] || "status-pending";
}

function deliveryHealth(task) {
  if (["Completed", "Canceled"].includes(task.status)) return null;
  if (!task.delivery) return { label:"No date", className:"health-soon" };
  const today = new Date(); today.setHours(0,0,0,0);
  const delivery = new Date(task.delivery + "T00:00:00");
  const diff = Math.ceil((delivery - today) / 86400000);
  if (diff < 0) return { label:"Overdue", className:"health-late" };
  if (diff <= 2) return { label:diff === 0 ? "Due today" : "Due soon", className:"health-soon" };
  return { label:"On track", className:"health-on" };
}

function filteredTasks() {
  return tasks.filter(task => {
    const designer = getDesigner(task.designerId);
    const matchesStatus = activeStatus === "All" || task.status === activeStatus;
    const haystack = [task.name, task.id, designer.name, designer.email, task.type]
      .join(" ").toLowerCase();
    return matchesStatus && haystack.includes(searchTerm.toLowerCase());
  });
}

function updateStats() {
  $("#statTotal").textContent = tasks.length;
  $("#statProgress").textContent = tasks.filter(t => t.status === "In Progress").length;
  $("#statPending").textContent = tasks.filter(t => t.status === "Pending").length;
  $("#statCompleted").textContent = tasks.filter(t => t.status === "Completed").length;

  $("#countAll").textContent = tasks.length;
  $("#countProgress").textContent = tasks.filter(t => t.status === "In Progress").length;
  $("#countPending").textContent = tasks.filter(t => t.status === "Pending").length;
  $("#countReview").textContent = tasks.filter(t => t.status === "In Review").length;
  $("#countCompleted").textContent = tasks.filter(t => t.status === "Completed").length;
}

function renderDesigners() {
  $("#designerList").innerHTML = designers.map(d => `
    <div class="designer-entry">
      <img src="${escapeHTML(d.avatar)}" alt="${escapeHTML(d.name)}">
      <div>
        <strong>${escapeHTML(d.name)}</strong>
        <a href="mailto:${escapeHTML(d.email)}">${escapeHTML(d.email)}</a>
      </div>
    </div>
  `).join("");
}

function renderTasks() {
  const filtered = filteredTasks();
  const body = $("#taskTableBody");

  if (!filtered.length) {
    body.innerHTML = `<tr><td colspan="6"><div class="empty-state"><strong>No tasks found</strong>Try a different search or status filter.</div></td></tr>`;
    $("#tableCount").textContent = "Showing 0 tasks";
    updateStats();
    return;
  }

  body.innerHTML = filtered.map(task => {
    const designer = getDesigner(task.designerId);
    const health = deliveryHealth(task);
    const healthHTML = health ? `<span class="health ${health.className}">${health.label}</span>` : `<span class="muted-dash">—</span>`;
    const hasUnread = (task.messages || 0) > 0;
    return `
      <tr>
        <td class="task-click" data-open-task="${task.id}">
          <div class="task-name">${escapeHTML(task.name)}</div>
          <div class="task-id">${escapeHTML(task.id)} · ${escapeHTML(task.type)}</div>
        </td>
        <td><span class="status ${statusClass(task.status)}">${escapeHTML(task.status)}</span></td>
        <td>
          <div class="designer-mini">
            <img src="${escapeHTML(designer.avatar)}" alt="">
            <span>${escapeHTML(designer.name)}</span>
          </div>
        </td>
        <td><span class="date-text">${formatDate(task.delivery)}</span></td>
        <td>${healthHTML}</td>
        <td>
          <div class="row-actions">
            <button class="icon-button chat-row" data-chat-task="${task.id}" aria-label="Chat with designer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/></svg>
              ${hasUnread ? '<span class="unread-dot"></span>' : ''}
            </button>
            <div class="menu-wrap">
              <button class="icon-button" data-menu="${task.id}" aria-label="Task options">
                <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>
              </button>
              ${openMenuId === task.id ? `
                <div class="row-menu">
                  <button data-view-task="${task.id}">View details</button>
                  <button data-revision="${task.id}">Request revision</button>
                  <button class="danger-option" data-cancel-task="${task.id}">Cancel task</button>
                </div>` : ""}
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  $("#tableCount").textContent = `Showing ${filtered.length} of ${tasks.length} tasks`;
  updateStats();
}

function renderAll() {
  renderTasks();
  renderDesigners();
  updateStats();
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function showOverlay() { $("#overlay").classList.add("show"); }
function hideOverlayIfUnused() {
  if (!$("#createDrawer").classList.contains("open") &&
      !$("#detailDrawer").classList.contains("open")) {
    $("#overlay").classList.remove("show");
  }
}

function openDrawer(id) {
  closeChat();
  $("#createDrawer").classList.remove("open");
  $("#detailDrawer").classList.remove("open");
  const drawer = $(id);
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  showOverlay();
  document.body.style.overflow = "hidden";
}

function closeDrawer(id) {
  const drawer = $(id);
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  hideOverlayIfUnused();
  if (!$("#createDrawer").classList.contains("open") &&
      !$("#detailDrawer").classList.contains("open")) {
    document.body.style.overflow = "";
  }
}

function openCreateDrawer() {
  resetCreateForm();
  openDrawer("#createDrawer");
  setTimeout(() => $("#taskName").focus(), 100);
}

function resetCreateForm() {
  $("#createTaskForm").reset();
  selectedPriority = "Medium";
  selectedFormats = new Set(["Figma", "PNG"]);
  uploadedFiles = [];
  $("#priorityOptions").querySelectorAll("button").forEach(btn => btn.classList.toggle("selected", btn.dataset.priority === selectedPriority));
  $("#formatOptions").querySelectorAll("button").forEach(btn => btn.classList.toggle("selected", selectedFormats.has(btn.dataset.format)));
  $("#checklist").innerHTML = "";
  addChecklistRow();
  renderFiles();
}

function addChecklistRow(value = "") {
  const row = document.createElement("div");
  row.className = "checklist-row";
  row.innerHTML = `<input type="text" placeholder="Checklist item" value="${escapeHTML(value)}" aria-label="Checklist item">
    <button type="button" aria-label="Remove checklist item">×</button>`;
  row.querySelector("button").addEventListener("click", () => row.remove());
  $("#checklist").appendChild(row);
}

function renderFiles() {
  $("#fileChips").innerHTML = uploadedFiles.map((file, index) => `
    <div class="file-chip"><span>${escapeHTML(file.name)}</span>
      <button type="button" data-remove-file="${index}" aria-label="Remove ${escapeHTML(file.name)}">×</button>
    </div>`).join("");
}

function validateTaskForm() {
  const form = $("#createTaskForm");
  if (!form.reportValidity()) return false;

  const accept = $("#acceptDate").value;
  const delivery = $("#deliveryDate").value;
  if (accept && delivery && delivery < accept) {
    showToast("Delivery date must be on or after the accept-by date.");
    $("#deliveryDate").focus();
    return false;
  }
  return true;
}

function collectTask(status = "Pending") {
  const designerId = $("#assignDesigner").value;
  const checklist = $$("#checklist input").map(input => input.value.trim()).filter(Boolean);
  return {
    id: `TSK-${1050 + tasks.length + draftCount}`,
    name: $("#taskName").value.trim(),
    type: $("#taskType").value,
    status,
    designerId,
    priority: selectedPriority,
    accepted: $("#acceptDate").value || "",
    delivery: $("#deliveryDate").value,
    description: $("#description").value.trim(),
    objective: $("#objective").value.trim(),
    platform: $("#platform").value.trim(),
    references: $("#referenceLinks").value.trim(),
    checklist,
    formats: [...selectedFormats],
    files: uploadedFiles.map(file => file.name),
    messages: 0,
    createdAt: new Date().toISOString()
  };
}

function saveTask(status) {
  if (!validateTaskForm()) return;
  const task = collectTask(status);
  tasks.unshift(task);
  closeDrawer("#createDrawer");
  renderAll();
  showToast(status === "Pending" ? "Task request created successfully." : "Draft saved successfully.");
}

function openTaskDetails(taskId, tab = "Overview") {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  selectedTaskId = taskId;
  detailTab = tab;
  renderTaskDetails();
  openDrawer("#detailDrawer");
}

function renderTaskDetails() {
  const task = tasks.find(t => t.id === selectedTaskId);
  if (!task) return;
  const designer = getDesigner(task.designerId);
  $("#detailTaskId").textContent = `${task.id} · ${task.type}`;

  const tabs = ["Overview", "Requirements", "Attachments", "Chat", "Activity"];
  let tabContent = "";

  if (detailTab === "Overview") {
    const steps = ["Pending", "In Progress", "In Review", "Completed"];
    const currentIndex = steps.indexOf(task.status);
    tabContent = `
      <section class="detail-section">
        <h3>Task progress</h3>
        <div class="stepper">
          ${steps.map((step, index) => `
            <div class="step ${index < currentIndex ? "done" : ""} ${index === currentIndex ? "current" : ""}">
              <div class="step-dot">${index < currentIndex ? "✓" : index + 1}</div>
              <div><strong>${step}</strong><small>${index === currentIndex ? "Current status" : index < currentIndex ? "Completed" : "Upcoming"}</small></div>
            </div>`).join("")}
        </div>
      </section>
      <section class="detail-section detail-section-spaced">
        <h3>Task information</h3>
        <div class="detail-list">
          <div class="detail-list-item"><strong>Assigned designer</strong>${escapeHTML(designer.name)} · ${escapeHTML(designer.email)}</div>
          <div class="detail-list-item"><strong>Priority</strong>${escapeHTML(task.priority || "Medium")}</div>
          <div class="detail-list-item"><strong>Accept by</strong>${formatDate(task.accepted)}</div>
          <div class="detail-list-item"><strong>Delivery by</strong>${formatDate(task.delivery)}</div>
        </div>
      </section>`;
  } else if (detailTab === "Requirements") {
    tabContent = `
      <section class="detail-section">
        <h3>Description</h3><p>${escapeHTML(task.description || "No description provided.")}</p>
        <h3 class="detail-heading-spaced">Objective</h3><p>${escapeHTML(task.objective || "No objective provided.")}</p>
        <h3 class="detail-heading-spaced">Platform & dimensions</h3><p>${escapeHTML(task.platform || "Not specified")}</p>
        <h3 class="detail-heading-spaced">Required formats</h3>
        <div class="chip-group">${(task.formats || []).map(f => `<span class="choice-chip selected">${escapeHTML(f)}</span>`).join("") || "Not specified"}</div>
        <h3 class="detail-heading-spaced">Checklist</h3>
        <div class="detail-list">${(task.checklist || []).map(item => `<div class="detail-list-item">${escapeHTML(item)}</div>`).join("") || '<p>No checklist items.</p>'}</div>
        <h3 class="detail-heading-spaced">Reference links</h3><p>${escapeHTML(task.references || "No reference links provided.")}</p>
      </section>`;
  } else if (detailTab === "Attachments") {
    tabContent = `<section class="detail-section"><h3>Attached files</h3><div class="detail-list">${
      (task.files || []).map(file => `<div class="detail-list-item">📎 ${escapeHTML(file)}</div>`).join("") ||
      '<div class="detail-list-item">No files attached to this task.</div>'
    }</div></section>`;
  } else if (detailTab === "Chat") {
    tabContent = `<section class="detail-section"><h3>Designer conversation</h3>
      <p>Continue the conversation with ${escapeHTML(designer.name)} about this task.</p>
      <button class="button-primary" id="detailOpenChat" type="button">Open task chat</button></section>`;
  } else {
    tabContent = `<section class="detail-section"><h3>Task activity</h3><div class="detail-list">
      <div class="detail-list-item"><strong>Task created</strong>${formatDate(task.createdAt ? task.createdAt.slice(0,10) : task.accepted)}</div>
      <div class="detail-list-item"><strong>Current status</strong>${escapeHTML(task.status)}</div>
      <div class="detail-list-item"><strong>Assigned designer</strong>${escapeHTML(designer.name)}</div>
    </div></section>`;
  }

  $("#detailBody").innerHTML = `
    <div class="detail-summary">
      <span class="status ${statusClass(task.status)}">${escapeHTML(task.status)}</span>
      <h3>${escapeHTML(task.name)}</h3>
      <p>${escapeHTML(task.description || "No description provided.")}</p>
      <div class="detail-meta">
        <div><small>Task ID</small><strong>${escapeHTML(task.id)}</strong></div>
        <div><small>Priority</small><strong>${escapeHTML(task.priority || "Medium")}</strong></div>
        <div><small>Accept by</small><strong>${formatDate(task.accepted)}</strong></div>
        <div><small>Delivery by</small><strong>${formatDate(task.delivery)}</strong></div>
      </div>
    </div>
    <div class="detail-tabs">${tabs.map(tab => `<button class="detail-tab ${tab === detailTab ? "active" : ""}" data-detail-tab="${tab}">${tab}</button>`).join("")}</div>
    ${tabContent}
  `;

  let footer = "";
  if (task.status !== "Canceled" && task.status !== "Completed") {
    footer += `<button class="button-secondary" id="detailRevision">Request revision</button>`;
    if (task.status === "In Review") footer += `<button class="button-primary" id="approveTask">Approve & close</button>`;
    else footer += `<button class="button-primary" id="detailChat">Message designer</button>`;
  } else {
    footer += `<button class="button-secondary" id="detailClose">Close</button>`;
  }
  $("#detailFooter").innerHTML = footer;
}

function requestRevision(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  task.status = "In Progress";
  openMenuId = null;
  renderAll();
  if ($("#detailDrawer").classList.contains("open")) renderTaskDetails();
  showToast("Revision requested. Task moved to In Progress.");
}

function cancelTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  if (!confirm(`Cancel "${task.name}"?`)) return;
  task.status = "Canceled";
  openMenuId = null;
  renderAll();
  if ($("#detailDrawer").classList.contains("open")) renderTaskDetails();
  showToast("Task canceled.");
}

/* =========================================================
   CHAT (WhatsApp-style)
========================================================= */

// Left chat list, with search
function renderChatList() {
  const query = $("#chatSearch").value.trim().toLowerCase();
  const items = designers.filter(d => d.name.toLowerCase().includes(query));
  $("#chatList").innerHTML = items.map(d => {
    const last = chatMessages[d.id].at(-1);
    return `
      <button class="wa-chat ${d.id === activeChatDesignerId ? "active" : ""}" data-chat="${d.id}">
        <img src="${escapeHTML(d.avatar)}" alt="">
        <div class="wa-chat-info">
          <div class="wa-chat-top"><strong>${escapeHTML(d.name)}</strong><small>${escapeHTML(last.time || "")}</small></div>
          <div class="wa-chat-preview">${escapeHTML(last.text)}</div>
        </div>
      </button>`;
  }).join("") || `<div class="empty-state">No chats found</div>`;
}

// Open a conversation (from the list, a task row or the Messages menu)
function openChat(designerId, taskId = null) {
  const designer = getDesigner(designerId);
  const task = tasks.find(t => t.id === taskId);
  activeChatDesignerId = designer.id;
  activeChatTaskId = taskId;

  closeDrawer("#detailDrawer");
  $("#chatAvatar").src = designer.avatar;
  $("#chatName").textContent = designer.name;
  $("#chatContext").textContent = task ? `${task.id} · ${task.name}` : "Direct message";
  if (task) task.messages = 0;

  $("#chatWindow").classList.add("open", "show-convo");
  $("#chatWindow").setAttribute("aria-hidden", "false");
  renderTasks();
  renderChatMessages();
  setTimeout(() => $("#chatInput").focus(), 100);
}

function closeChat() {
  $("#chatWindow").classList.remove("open", "show-convo");
  $("#chatWindow").setAttribute("aria-hidden", "true");
}

// Message bubbles (time inside the bubble)
function renderChatMessages() {
  const messages = chatMessages[activeChatDesignerId] || [];
  $("#chatMessages").innerHTML = messages.map(m => `
    <div class="message ${m.direction}">
      <p>${escapeHTML(m.text)}<small>${escapeHTML(m.time || "")}</small></p>
    </div>`).join("");
  $("#chatMessages").scrollTop = $("#chatMessages").scrollHeight;
  renderChatList();
}

// Send message + demo auto-reply
function sendChatMessage(text) {
  if (!text.trim() || !activeChatDesignerId) return;
  const designerId = activeChatDesignerId;
  const clock = () => new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });

  chatMessages[designerId].push({ direction:"outgoing", text:text.trim(), time:clock() });
  renderChatMessages();
  $("#chatInput").value = "";

  setTimeout(() => {
    const replies = [
      "Thanks for sharing! I'll take a look and get back to you.",
      "Got it. I'll review this and keep you updated.",
      "Thanks for the details. I'll work on this and share an update soon."
    ];
    chatMessages[designerId].push({ direction:"incoming", text:replies[Math.floor(Math.random() * replies.length)], time:clock() });
    if (activeChatDesignerId === designerId) renderChatMessages(); else renderChatList();
  }, 1500);
}

// Chat list events
$("#chatList").addEventListener("click", event => {
  const item = event.target.closest("[data-chat]");
  if (item) openChat(item.dataset.chat);
});
$("#chatSearch").addEventListener("input", renderChatList);
$("#chatBack").addEventListener("click", () => $("#chatWindow").classList.remove("show-convo"));

function populateDesignerOptions() {
  $("#assignDesigner").innerHTML = `<option value="">Select designer</option>` +
    designers.map(d => `<option value="${d.id}">${escapeHTML(d.name)} — ${escapeHTML(d.email)}</option>`).join("");
}

/* Events */
$("#createTaskButton").addEventListener("click", openCreateDrawer);

$$("[data-close]").forEach(button => {
  button.addEventListener("click", () => {
    const drawer = button.closest(".drawer");
    closeDrawer("#" + drawer.id);
  });
});

$("#overlay").addEventListener("click", () => {
  closeDrawer("#createDrawer");
  closeDrawer("#detailDrawer");
  document.body.style.overflow = "";
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeDrawer("#createDrawer");
    closeDrawer("#detailDrawer");
    closeChat();
    document.body.style.overflow = "";
    openMenuId = null;
    renderTasks();
  }
});

$("#globalSearch").addEventListener("input", event => {
  searchTerm = event.target.value.trim();
  currentPage = 1;
  renderTasks();
});

$("#taskTabs").addEventListener("click", event => {
  const button = event.target.closest("[data-status]");
  if (!button) return;
  activeStatus = button.dataset.status;
  $$(".task-tab").forEach(tab => tab.classList.toggle("active", tab === button));
  renderTasks();
});

$("#filterButton").addEventListener("click", () => {
  const statuses = ["All", "In Progress", "Pending", "In Review", "Completed"];
  const current = statuses.indexOf(activeStatus);
  activeStatus = statuses[(current + 1) % statuses.length];
  $$(".task-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.status === activeStatus));
  renderTasks();
  showToast(`Showing: ${activeStatus}`);
});

$("#taskTableBody").addEventListener("click", event => {
  const chatButton = event.target.closest("[data-chat-task]");
  if (chatButton) {
    event.stopPropagation();
    const task = tasks.find(t => t.id === chatButton.dataset.chatTask);
    if (task) openChat(task.designerId, task.id);
    return;
  }

  const menuButton = event.target.closest("[data-menu]");
  if (menuButton) {
    event.stopPropagation();
    const id = menuButton.dataset.menu;
    openMenuId = openMenuId === id ? null : id;
    renderTasks();
    return;
  }

  const viewButton = event.target.closest("[data-view-task]");
  if (viewButton) { openTaskDetails(viewButton.dataset.viewTask); return; }

  const revisionButton = event.target.closest("[data-revision]");
  if (revisionButton) { requestRevision(revisionButton.dataset.revision); return; }

  const cancelButton = event.target.closest("[data-cancel-task]");
  if (cancelButton) { cancelTask(cancelButton.dataset.cancelTask); return; }

  const taskCell = event.target.closest("[data-open-task]");
  if (taskCell) openTaskDetails(taskCell.dataset.openTask);
});

document.addEventListener("click", event => {
  if (!event.target.closest(".menu-wrap") && openMenuId) {
    openMenuId = null;
    renderTasks();
  }
});

$("#priorityOptions").addEventListener("click", event => {
  const button = event.target.closest("[data-priority]");
  if (!button) return;
  selectedPriority = button.dataset.priority;
  $$("#priorityOptions button").forEach(btn => btn.classList.toggle("selected", btn === button));
});

$("#formatOptions").addEventListener("click", event => {
  const button = event.target.closest("[data-format]");
  if (!button) return;
  const format = button.dataset.format;
  if (selectedFormats.has(format)) selectedFormats.delete(format);
  else selectedFormats.add(format);
  button.classList.toggle("selected", selectedFormats.has(format));
});

$("#addChecklist").addEventListener("click", () => addChecklistRow());

$("#fileUpload").addEventListener("change", event => {
  uploadedFiles.push(...Array.from(event.target.files));
  renderFiles();
  event.target.value = "";
});

$("#fileChips").addEventListener("click", event => {
  const button = event.target.closest("[data-remove-file]");
  if (!button) return;
  uploadedFiles.splice(Number(button.dataset.removeFile), 1);
  renderFiles();
});

$("#saveDraftButton").addEventListener("click", () => {
  if (!$("#taskName").value.trim()) {
    showToast("Enter a task name to save this draft.");
    $("#taskName").focus();
    return;
  }
  draftCount++;
  closeDrawer("#createDrawer");
  showToast("Draft saved locally for this session.");
});

$("#sendRequestButton").addEventListener("click", () => saveTask("Pending"));

$("#detailBody").addEventListener("click", event => {
  const tab = event.target.closest("[data-detail-tab]");
  if (tab) {
    detailTab = tab.dataset.detailTab;
    if (detailTab === "Chat") {
      renderTaskDetails();
      $("#detailOpenChat")?.addEventListener("click", () => {
        const task = tasks.find(t => t.id === selectedTaskId);
        if (task) openChat(task.designerId, task.id);
      });
      return;
    }
    renderTaskDetails();
    return;
  }

  if (event.target.closest("#detailOpenChat")) {
    const task = tasks.find(t => t.id === selectedTaskId);
    if (task) openChat(task.designerId, task.id);
  }
});

$("#detailFooter").addEventListener("click", event => {
  if (event.target.closest("#detailRevision")) {
    requestRevision(selectedTaskId);
  } else if (event.target.closest("#approveTask")) {
    const task = tasks.find(t => t.id === selectedTaskId);
    if (task) {
      task.status = "Completed";
      renderAll();
      renderTaskDetails();
      showToast("Task approved and completed.");
    }
  } else if (event.target.closest("#detailChat")) {
    const task = tasks.find(t => t.id === selectedTaskId);
    if (task) openChat(task.designerId, task.id);
  } else if (event.target.closest("#detailClose")) {
    closeDrawer("#detailDrawer");
  }
});

$("#closeChat").addEventListener("click", closeChat);
$("#chatForm").addEventListener("submit", event => {
  event.preventDefault();
  sendChatMessage($("#chatInput").value);
});

$("#messagesNav").addEventListener("click", () => {
  const designer = designers[0];
  openChat(designer.id);
});

$$("[data-nav]").forEach(button => {
  button.addEventListener("click", () => {
    const section = button.dataset.nav;
    $$(".nav-item").forEach(item => {
      item.classList.toggle("active", item === button);
      item.removeAttribute("aria-current");
    });
    button.setAttribute("aria-current", "page");

    if (section === "Designers") {
      $("#designersSection").scrollIntoView({ behavior:"smooth", block:"start" });
    } else if (section === "Dashboard") {
      window.scrollTo({ top:0, behavior:"smooth" });
    } else if (section === "Settings" || section === "Help") {
      showToast(`${section} section is a demo placeholder.`);
    }
  });
});

$("#notificationButton").addEventListener("click", () => {
  showToast("You're all caught up!");
});

$("#prevPage").addEventListener("click", () => {
  currentPage = 1;
  showToast("You're viewing page 1.");
});

$("#nextPage").addEventListener("click", () => {
  currentPage = 1;
  showToast("All demo tasks are shown on this page.");
});

populateDesignerOptions();
renderAll();
resetCreateForm();

// Hide the optional logo image if the local logo file is unavailable.
document.querySelectorAll(".logo-image").forEach((logo) => {
  logo.addEventListener("error", () => {
    logo.style.display = "none";
  });
});
