// Subagent Command Center - Enhanced & Persistent
class CommandCenter {
    constructor() {
        console.log('Command Center: Initializing...');

        // default state if storage is empty
        this.agents = [
            { id: 'chuck', name: 'Chuck', role: 'CEO', status: 'online', avatar: 'img/chuck.jpeg' },
            { id: 'sam', name: 'Sam', role: 'Chief of Staff', status: 'active', avatar: 'img/samantha.png' },
            { id: 'jeff', name: 'Jeff', role: 'Market Intelligence', status: 'standby', avatar: 'img/jeff-avatar.png' },
            { id: 'barbara', name: 'Barbara', role: 'Writing Specialist', status: 'standby', avatar: 'img/barbara-avatar.png' }
        ];

        this.tasks = [];
        this.activityLog = [];

        this.loadState();

        // If no tasks exist (first run), add defaults
        if (this.tasks.length === 0) {
            this.tasks = [
                {
                    id: 'task-1',
                    title: 'Market Intelligence Scan',
                    description: 'Comprehensive scan of email re-engagement tools and competitors',
                    assignee: 'jeff',
                    priority: 'high',
                    status: 'assigned',
                    dueDate: '2026-02-05'
                },
                {
                    id: 'task-2',
                    title: 'Content Creation',
                    description: 'Write marketing copy for new feature announcement',
                    assignee: 'barbara',
                    priority: 'medium',
                    status: 'backlog',
                    dueDate: '2026-02-10'
                }
            ];
            this.saveState();
        }

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderAll();
        console.log('Command Center: Ready');
    }

    setupEventListeners() {
        // Modal logic
        window.onclick = (event) => {
            if (event.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        };

        const taskForm = document.getElementById('task-form');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createTask(new FormData(taskForm));
            });
        }

        const editTaskForm = document.getElementById('edit-task-form');
        if (editTaskForm) {
            editTaskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateTask(new FormData(editTaskForm));
            });
        }

        const activityForm = document.getElementById('activity-form');
        if (activityForm) {
            activityForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createActivity(new FormData(activityForm));
            });
        }

        // Drag and Drop
        const columns = document.querySelectorAll('.kanban-column');
        columns.forEach(col => {
            col.addEventListener('dragover', e => {
                e.preventDefault();
                col.style.background = '#1f1f35';
            });

            col.addEventListener('dragleave', e => {
                col.style.background = '';
            });

            col.addEventListener('drop', e => {
                e.preventDefault();
                col.style.background = '';
                const taskId = e.dataTransfer.getData('text/plain');
                const newStatus = col.id.replace('col-', '');
                this.updateTaskStatus(taskId, newStatus);
            });
        });
    }

    // --- State Management ---

    saveState() {
        localStorage.setItem('cc_tasks', JSON.stringify(this.tasks));
        localStorage.setItem('cc_activity', JSON.stringify(this.activityLog));
        localStorage.setItem('cc_agents', JSON.stringify(this.agents)); // In case we add dynamic agents later
    }

    loadState() {
        const storedTasks = localStorage.getItem('cc_tasks');
        const storedActivity = localStorage.getItem('cc_activity');
        // We generally stick to hardcoded agents for now, but could load them too

        if (storedTasks) this.tasks = JSON.parse(storedTasks);
        if (storedActivity) this.activityLog = JSON.parse(storedActivity);
    }

    // --- Rendering ---

    renderAll() {
        this.renderAgents();
        this.renderTasks();
        this.renderActivityLog();
        this.populateDropdowns();
    }

    renderAgents() {
        const container = document.getElementById('agents-list');
        if (!container) return;

        container.innerHTML = this.agents.map(agent => `
            <div class="agent-card">
                <img src="${agent.avatar}" class="agent-avatar" alt="${agent.name}">
                <div class="agent-info">
                    <h4>${agent.name}</h4>
                    <p>${agent.role}</p>
                    <span class="agent-status ${agent.status.toLowerCase()}">${agent.status}</span>
                </div>
            </div>
        `).join('');
    }

    renderTasks() {
        // Clear all lists
        ['backlog', 'assigned', 'active', 'complete'].forEach(status => {
            const list = document.getElementById(`list-${status}`);
            const count = document.querySelector(`#col-${status} .count`);
            if (list) list.innerHTML = '';
            if (count) count.innerText = '0';
        });

        // Render tasks
        this.tasks.forEach(task => {
            const list = document.getElementById(`list-${task.status}`);
            if (list) {
                const card = this.createTaskCard(task);
                list.appendChild(card);
            }
        });

        // Update counts
        ['backlog', 'assigned', 'active', 'complete'].forEach(status => {
            const count = document.querySelector(`#col-${status} .count`);
            const num = this.tasks.filter(t => t.status === status).length;
            if (count) count.innerText = num;
        });
    }

    createTaskCard(task) {
        const el = document.createElement('div');
        el.className = 'task-card';
        el.draggable = true;

        const priorityColor = (task.priority === 'urgent' || task.priority === 'high') ? 'priority-high' :
            task.priority === 'medium' ? 'priority-medium' : 'priority-low';

        const agent = this.getAgent(task.assignee);
        const avatarUrl = agent ? agent.avatar : '';
        const agentName = agent ? agent.name : task.assignee;

        el.innerHTML = `
            <div class="task-title">
                <span class="task-priority ${priorityColor}"></span>
                ${task.title}
            </div>
            <div class="task-desc">${task.description}</div>
            <div class="task-meta">
                <div class="task-assignee">
                    ${avatarUrl ? `<img src="${avatarUrl}" class="task-avatar" alt="${agentName}">` : ''}
                    <span>${agentName}</span>
                </div>
                <span>Due: ${(() => {
                const [y, m, d] = task.dueDate.split('-');
                return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            })()}</span>
            </div>
        `;

        el.addEventListener('dragstart', (e) => {
            el.classList.add('dragging');
            e.dataTransfer.setData('text/plain', task.id);
            e.dataTransfer.effectAllowed = 'move';
        });

        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
        });

        el.onclick = () => {
            this.openEditTaskModal(task);
        };

        return el;
    }

    renderActivityLog() {
        const log = document.getElementById('activity-log');
        if (!log) return;

        const recent = [...this.activityLog].reverse().slice(0, 20); // Last 20, newest first
        log.innerHTML = recent.map(activity => `
            <div class="activity-item">
                <div class="activity-time">${activity.timestamp}</div>
                <div class="activity-content">
                    <strong>${this.getAgentName(activity.agent)}:</strong> ${activity.action}
                    ${activity.details ? `<br><span style="color: #888;">${activity.details}</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    populateDropdowns() {
        const selects = document.querySelectorAll('select[name="assignee"], select[name="agent"]');
        selects.forEach(select => {
            // Keep first option
            const first = select.firstElementChild;
            select.innerHTML = '';
            select.appendChild(first);

            this.agents.forEach(agent => {
                const opt = document.createElement('option');
                opt.value = agent.id;
                opt.textContent = agent.name;
                select.appendChild(opt);
            });
        });
    }

    // --- Actions ---

    createTask(formData) {
        const task = {
            id: 'task-' + Date.now(),
            title: formData.get('title'),
            description: formData.get('description'),
            assignee: formData.get('assignee'),
            priority: formData.get('priority'),
            dueDate: formData.get('dueDate'),
            status: 'backlog'
        };

        this.tasks.push(task);
        this.logActivity(task.assignee, 'New Mission Assigned', task.title);
        this.saveState();
        this.renderAll();
        this.closeAllModals();
    }

    createActivity(formData) {
        const agentId = formData.get('agent');
        const desc = formData.get('description');

        this.logActivity(agentId, 'Report', desc);
        this.saveState();
        this.renderActivityLog();
        this.closeAllModals();
    }

    updateTask(formData) {
        const taskId = formData.get('taskId');
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.title = formData.get('title');
            task.description = formData.get('description');
            task.assignee = formData.get('assignee');
            task.priority = formData.get('priority');
            task.dueDate = formData.get('dueDate');

            this.logActivity('chuck', 'Updated Mission', task.title); // Assuming user (Chuck) edited it
            this.saveState();
            this.renderAll();
            this.closeAllModals();
        }
    }

    deleteTask() {
        const form = document.getElementById('edit-task-form');
        const taskId = form.taskId.value;
        const task = this.tasks.find(t => t.id === taskId);

        if (confirm(`Are you sure you want to delete mission "${task.title}"? This cannot be undone.`)) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.logActivity('chuck', 'Terminated Mission', task.title);
            this.saveState();
            this.renderAll();
            this.closeAllModals();
        }
    }

    updateTaskStatus(taskId, newStatus) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.status !== newStatus) {
            const oldStatus = task.status;
            task.status = newStatus;
            this.logActivity(task.assignee, `Moved mission to ${newStatus}`, task.title);
            this.saveState();
            this.renderTasks();
            this.renderActivityLog(); // to show the move
        }
    }

    logActivity(agentId, action, details = null) {
        const activity = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            agent: agentId,
            action,
            details
        };
        this.activityLog.push(activity);
    }

    getAgent(id) {
        return this.agents.find(a => a.id === id);
    }

    getAgentName(id) {
        const agent = this.getAgent(id);
        return agent ? agent.name : id;
    }

    // --- UI Helpers ---

    togglePin(elementId) {
        const el = document.getElementById(elementId);
        if (el) {
            el.classList.toggle('pinned');
        }
    }

    openTaskModal() {
        document.getElementById('task-modal').style.display = 'flex';
    }

    openEditTaskModal(task) {
        const modal = document.getElementById('edit-task-modal');
        const form = document.getElementById('edit-task-form');

        form.taskId.value = task.id;
        form.title.value = task.title;
        form.description.value = task.description;
        form.assignee.value = task.assignee;
        form.priority.value = task.priority;
        form.dueDate.value = task.dueDate;

        modal.style.display = 'flex';
    }

    openActivityModal() {
        document.getElementById('activity-modal').style.display = 'flex';
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        document.querySelectorAll('form').forEach(f => f.reset());
    }
}

// Global accessor
window.commandCenter = null;

document.addEventListener('DOMContentLoaded', () => {
    window.commandCenter = new CommandCenter();
});