// Variáveis globais
let timer;
let absoluteStartTime; // Guarda o timestamp do início absoluto da tarefa atual
let referenceTime; // Guarda o timestamp de referência para cálculo (início ou último resume)
let pausedTime = 0; // Tempo acumulado enquanto pausado (em ms)
let isRunning = false;
let isPaused = false;
let tasks = []; // Array para armazenar tarefas concluídas

// Chave para localStorage
const TIMER_STATE_KEY = "timerState";
const TASKS_KEY = "tasks"; // Chave para tarefas concluídas

// Elementos DOM
const timerDisplay = document.getElementById("timer");
const startTimeDisplay = document.getElementById("start-time");
const endTimeDisplay = document.getElementById("end-time");
const currentTaskName = document.getElementById("current-task-name");
const predefinedTasksSelect = document.getElementById("predefined-tasks");
const customTaskInput = document.getElementById("custom-task");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resumeBtn = document.getElementById("resume-btn");
const stopBtn = document.getElementById("stop-btn");
const timerContainer = document.querySelector(".timer-display");

// Modal elements (Finalizar Tarefa)
const renameTaskModalEl = document.getElementById("rename-task-modal");
const renameTaskModal = new bootstrap.Modal(renameTaskModalEl);
const finalTaskNameInput = document.getElementById("final-task-name");
const modalStartTime = document.getElementById("modal-start-time");
const modalEndTime = document.getElementById("modal-end-time");
const modalDuration = document.getElementById("modal-duration");
const saveTaskBtn = document.getElementById("save-task-btn");

// Modal elements (Editar Tarefa)
const editTaskModalEl = document.getElementById("edit-task-modal"); // Precisa ser criado no HTML
let editTaskModal; // Será inicializado no DOMContentLoaded
const editTaskNameInput = document.getElementById("edit-task-name");
const editStartTimeInput = document.getElementById("edit-start-time");
const editEndTimeInput = document.getElementById("edit-end-time");
const saveEditedTaskBtn = document.getElementById("save-edited-task-btn");
let editingTaskId = null; // Guarda o ID da tarefa sendo editada

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded and parsed");

    // Inicializa o modal de edição
    if (editTaskModalEl) {
        editTaskModal = new bootstrap.Modal(editTaskModalEl);
    } else {
        console.error("Edit task modal element not found!");
    }

    loadTasks(); // Carregar tarefas concluídas
    restoreTimerState(); // Restaurar estado do cronômetro, se houver

    try {
        document.getElementById("filter-date").valueAsDate = new Date();
    } catch (e) {
        console.error("Error setting initial filter date:", e);
        document.getElementById("filter-date").value = new Date().toISOString().split("T")[0];
    }

    setupEventListeners();
});

// Configuração de eventos
function setupEventListeners() {
    console.log("Setting up event listeners");
    startBtn.addEventListener("click", startTimer);
    pauseBtn.addEventListener("click", pauseTimer);
    resumeBtn.addEventListener("click", resumeTimer);
    stopBtn.addEventListener("click", stopTimer);
    predefinedTasksSelect.addEventListener("change", updateTaskName);
    customTaskInput.addEventListener("input", updateTaskName);
    // saveTaskBtn listener é definido dinamicamente em stopTimer
    // saveEditedTaskBtn listener é definido abaixo

    if (saveEditedTaskBtn) {
        saveEditedTaskBtn.addEventListener("click", saveEditedTask);
    } else {
        console.error("Save edited task button not found!");
    }

    document.getElementById("apply-filter-btn").addEventListener("click", applyHistoryFilter);
    document.getElementById("generate-report-btn").addEventListener("click", generateReport);
    document.getElementById("export-pdf-btn").addEventListener("click", exportToPDF);
    document.getElementById("report-period").addEventListener("change", function () {
        const customDateRange = document.querySelector(".custom-date-range");
        customDateRange.style.display = this.value === "custom" ? "flex" : "none";
    });

    // Salva o estado ANTES da página descarregar
    window.addEventListener("beforeunload", saveCurrentTimerState);

    console.log("Event listeners setup complete");
}

// --- Funções de Persistência --- 

function saveCurrentTimerState() {
    if (!isRunning) return;
    let currentTotalPausedTime = pausedTime;
    if (!isPaused) {
        currentTotalPausedTime += (Date.now() - referenceTime);
    }
    const state = {
        absoluteStartTime: absoluteStartTime,
        referenceTime: Date.now(),
        pausedTime: currentTotalPausedTime,
        isRunning: isRunning,
        isPaused: isPaused,
        taskName: currentTaskName.textContent
    };
    try {
        localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
        console.log("Timer state saved on beforeunload:", state);
    } catch (e) {
        console.error("Error saving timer state to localStorage:", e);
    }
}

function saveTimerState() {
    if (!isRunning) return;
    const state = {
        absoluteStartTime: absoluteStartTime,
        referenceTime: referenceTime,
        pausedTime: pausedTime,
        isRunning: isRunning,
        isPaused: isPaused,
        taskName: currentTaskName.textContent
    };
    try {
        localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
        console.log("Timer state saved:", state);
    } catch (e) {
        console.error("Error saving timer state to localStorage:", e);
    }
}

function restoreTimerState() {
    console.log("Attempting to restore timer state...");
    let state;
    try {
        const storedState = localStorage.getItem(TIMER_STATE_KEY);
        if (!storedState) {
            console.log("No saved timer state found.");
            return;
        }
        state = JSON.parse(storedState);
        console.log("Saved state found:", state);

        if (typeof state.absoluteStartTime !== 'number' || 
            typeof state.pausedTime !== 'number' || 
            typeof state.isRunning !== 'boolean' ||
            typeof state.isPaused !== 'boolean' ||
            typeof state.referenceTime !== 'number') {
            console.error("Invalid timer state found in localStorage. Clearing.", state);
            clearTimerState();
            return;
        }

    } catch (e) {
        console.error("Error reading or parsing timer state from localStorage:", e);
        clearTimerState();
        return;
    }

    if (state.isRunning) {
        absoluteStartTime = state.absoluteStartTime;
        pausedTime = state.pausedTime;
        isRunning = state.isRunning;
        isPaused = state.isPaused;
        currentTaskName.textContent = state.taskName;
        startTimeDisplay.textContent = formatTime(new Date(absoluteStartTime));
        endTimeDisplay.textContent = "--:--:--";
        syncTaskSelectionUI(state.taskName);

        const timeElapsedSinceSave = Date.now() - state.referenceTime;
        console.log(`Time elapsed since save: ${timeElapsedSinceSave} ms`);

        if (isPaused) {
            referenceTime = state.referenceTime;
            timerDisplay.textContent = formatDuration(pausedTime);
            pauseBtn.disabled = true;
            resumeBtn.disabled = false;
            stopBtn.disabled = false;
            startBtn.disabled = true;
            timerContainer.classList.add("timer-paused");
            timerContainer.classList.remove("timer-running");
            console.log("Timer restored to PAUSED state.");
        } else {
            pausedTime += timeElapsedSinceSave;
            referenceTime = Date.now();
            timerDisplay.textContent = formatDuration(pausedTime);
            pauseBtn.disabled = false;
            resumeBtn.disabled = true;
            stopBtn.disabled = false;
            startBtn.disabled = true;
            timerContainer.classList.add("timer-running");
            timerContainer.classList.remove("timer-paused");
            if (timer) clearInterval(timer);
            timer = setInterval(updateTimerDisplay, 1000);
            console.log("Timer restored to RUNNING state. Interval restarted.");
        }
    } else {
        console.log("Saved state indicates timer was not running. Clearing state.");
        clearTimerState();
    }
}

function clearTimerState() {
    try {
        localStorage.removeItem(TIMER_STATE_KEY);
        console.log("Timer state cleared from localStorage.");
    } catch (e) {
        console.error("Error clearing timer state from localStorage:", e);
    }
}

// --- Funções do Cronômetro --- 

function startTimer() {
    console.log("startTimer called");
    if (isRunning) return;
    const taskName = getSelectedTaskName();
    if (!taskName) {
        alert("Por favor, selecione ou digite o nome da tarefa antes de iniciar o cronômetro.");
        return;
    }
    const now = Date.now();
    absoluteStartTime = now;
    referenceTime = now;
    pausedTime = 0;
    isRunning = true;
    isPaused = false;
    console.log("Timer started. Absolute Start:", new Date(absoluteStartTime));
    updateTimerDisplay();
    startTimeDisplay.textContent = formatTime(new Date(absoluteStartTime));
    endTimeDisplay.textContent = "--:--:--";
    currentTaskName.textContent = taskName;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
    stopBtn.disabled = false;
    timerContainer.classList.add("timer-running");
    timerContainer.classList.remove("timer-paused");
    if (timer) clearInterval(timer);
    timer = setInterval(updateTimerDisplay, 1000);
    console.log("Timer interval set");
    saveTimerState();
}

function pauseTimer() {
    console.log("pauseTimer called");
    if (!isRunning || isPaused) return;
    clearInterval(timer);
    const now = Date.now();
    pausedTime += (now - referenceTime);
    isPaused = true;
    referenceTime = now;
    console.log("Timer paused. Accumulated pausedTime (ms):", pausedTime);
    pauseBtn.disabled = true;
    resumeBtn.disabled = false;
    timerContainer.classList.remove("timer-running");
    timerContainer.classList.add("timer-paused");
    saveTimerState();
}

function resumeTimer() {
    console.log("resumeTimer called");
    if (!isRunning || !isPaused) return;
    isPaused = false;
    referenceTime = Date.now();
    console.log("Timer resumed. New referenceTime:", new Date(referenceTime));
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
    timerContainer.classList.add("timer-running");
    timerContainer.classList.remove("timer-paused");
    if (timer) clearInterval(timer);
    timer = setInterval(updateTimerDisplay, 1000);
    console.log("Timer interval restarted after resume");
    saveTimerState();
}

function stopTimer() {
    console.log("stopTimer called");
    if (!isRunning) {
        console.warn("stopTimer called while not running");
        return;
    }
    if (typeof absoluteStartTime !== 'number' || isNaN(absoluteStartTime)) {
        console.error("stopTimer critical error: absoluteStartTime is invalid!", absoluteStartTime);
        alert("Erro crítico: O horário de início da tarefa é inválido. Não é possível parar ou salvar.");
        resetUIAndState(); 
        return;
    }
    clearInterval(timer);
    const now = Date.now();
    let totalTimeMs;
    if (isPaused) {
        totalTimeMs = pausedTime;
    } else {
        totalTimeMs = pausedTime + (now - referenceTime);
    }
    console.log("Timer stopped. Absolute Start:", new Date(absoluteStartTime), "End:", new Date(now), "Total elapsed time (ms):", totalTimeMs);
    endTimeDisplay.textContent = formatTime(new Date(now));
    const taskName = currentTaskName.textContent;
    finalTaskNameInput.value = taskName;
    modalStartTime.textContent = formatTime(new Date(absoluteStartTime));
    modalEndTime.textContent = formatTime(new Date(now));
    modalDuration.textContent = formatDuration(totalTimeMs);
    console.log("Modal data prepared:", { taskName, startTime: modalStartTime.textContent, endTime: modalEndTime.textContent, duration: modalDuration.textContent });
    clearTimerState();
    const savedAbsoluteStartTime = absoluteStartTime;
    isRunning = false;
    isPaused = false;
    pausedTime = 0;
    referenceTime = undefined;
    absoluteStartTime = undefined;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    stopBtn.disabled = true;
    timerContainer.classList.remove("timer-running", "timer-paused");
    if (renameTaskModal) {
        saveTaskBtn.onclick = null; 
        renameTaskModalEl.removeEventListener('hidden.bs.modal', handleModalClose);
        saveTaskBtn.onclick = () => saveTask(taskName, savedAbsoluteStartTime, now, totalTimeMs);
        renameTaskModalEl.addEventListener('hidden.bs.modal', handleModalClose, { once: true });
        renameTaskModal.show();
        console.log("Rename task modal shown");
    } else {
        console.error("Cannot show modal, instance is not available.");
        alert("Erro ao abrir a janela para salvar a tarefa.");
        resetUIAndState();
    }
}

function handleModalClose(event) {
    console.log("Modal closed without saving. Resetting UI.");
    resetUIAndState();
}

function updateTimerDisplay() {
    let elapsedTime;
    if (!isRunning) {
        elapsedTime = 0;
    } else if (isPaused) {
        elapsedTime = pausedTime;
    } else {
        elapsedTime = pausedTime + (Date.now() - referenceTime);
    }
    timerDisplay.textContent = formatDuration(elapsedTime);
}

// --- Funções Auxiliares --- 

function resetUIAndState() {
    console.log("Resetting UI and state");
    predefinedTasksSelect.value = "";
    customTaskInput.value = "";
    currentTaskName.textContent = "Nenhuma tarefa selecionada";
    timerDisplay.textContent = "00:00:00";
    startTimeDisplay.textContent = "--:--:--";
    endTimeDisplay.textContent = "--:--:--";
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    absoluteStartTime = undefined;
    referenceTime = undefined;
    pausedTime = 0;
    isRunning = false;
    isPaused = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    stopBtn.disabled = true;
    timerContainer.classList.remove("timer-running", "timer-paused");
    clearTimerState();
    console.log("UI and state reset complete");
}

function syncTaskSelectionUI(taskName) {
    if (!taskName) return;
    const predefinedOption = Array.from(predefinedTasksSelect.options).find(opt => opt.value === taskName);
    if (predefinedOption) {
        predefinedTasksSelect.value = taskName;
        customTaskInput.value = "";
    } else {
        customTaskInput.value = taskName;
        predefinedTasksSelect.value = "";
    }
}

// --- Funções de Armazenamento de Tarefas Concluídas --- 

function saveTask(originalTaskName, taskStartTimeStamp, taskEndTimeStamp, taskDurationMs) {
    console.log("saveTask called with:", { originalTaskName, taskStartTimeStamp, taskEndTimeStamp, taskDurationMs });
    const finalTaskName = finalTaskNameInput.value.trim();
    if (!finalTaskName) {
        alert("Por favor, insira um nome para a tarefa.");
        console.warn("saveTask aborted: No final task name provided.");
        return;
    }
    if (typeof taskStartTimeStamp !== 'number' || isNaN(taskStartTimeStamp) || 
        typeof taskEndTimeStamp !== 'number' || isNaN(taskEndTimeStamp)) {
        console.error("saveTask critical error: Invalid start or end timestamp provided.", { taskStartTimeStamp, taskEndTimeStamp });
        alert("Erro crítico: Horário de início ou fim inválido ao tentar salvar. Não foi possível salvar.");
        renameTaskModal.hide();
        return;
    }
    const taskStartTimeDate = new Date(taskStartTimeStamp);
    const taskEndTimeDate = new Date(taskEndTimeStamp);
    console.log("Creating task object with validated dates:", { 
        name: finalTaskName, 
        startTime: taskStartTimeDate, 
        endTime: taskEndTimeDate, 
        duration: formatDuration(taskDurationMs), 
        date: formatDate(taskStartTimeDate) 
    });
    const task = {
        id: Date.now(),
        name: finalTaskName,
        startTime: taskStartTimeDate.toISOString(),
        endTime: taskEndTimeDate.toISOString(),
        duration: formatDuration(taskDurationMs),
        date: formatDate(taskStartTimeDate)
    };
    console.log("Task object created:", task);
    try {
        tasks.push(task);
        saveTasksToLocalStorage();
        console.log("Task saved to list and localStorage.");
    } catch (error) {
        console.error("Error saving task list:", error);
        alert("Erro ao salvar a lista de tarefas.");
        renameTaskModal.hide();
        return;
    }
    try {
        updateHistoryTable(); // Atualiza a tabela de histórico
        console.log("History table updated.");
    } catch (error) {
        console.error("Error updating history table:", error);
        alert("Erro ao atualizar a tabela de histórico, mas a tarefa foi salva.");
    }
    renameTaskModal.hide();
    console.log("saveTask finished successfully.");
}

function saveTasksToLocalStorage() {
    try {
        localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
        console.log("Completed tasks saved to localStorage");
    } catch (e) {
        console.error("Error saving completed tasks to localStorage:", e);
        alert("Não foi possível salvar o histórico de tarefas. O armazenamento local pode estar cheio ou indisponível.");
    }
}

function loadTasks() {
    console.log("loadTasks started");
    const storedTasks = localStorage.getItem(TASKS_KEY);
    if (storedTasks) {
        try {
            const parsedTasks = JSON.parse(storedTasks);
            tasks = parsedTasks.map(task => {
                const startTime = task.startTime ? new Date(task.startTime) : null;
                const endTime = task.endTime ? new Date(task.endTime) : null;
                if (!startTime || isNaN(startTime) || !endTime || isNaN(endTime) || !task.id) {
                    console.warn("Invalid data found in stored task, skipping task:", task);
                    return null;
                }
                // Garante que todas as tarefas tenham um ID (para compatibilidade)
                if (!task.id) task.id = new Date(task.startTime).getTime(); 
                return { ...task, startTime: task.startTime, endTime: task.endTime };
            }).filter(task => task !== null);
            console.log("Tasks loaded and validated from localStorage:", tasks);
            updateHistoryTable();
        } catch (e) {
            console.error("Error parsing tasks from localStorage:", e);
            tasks = [];
            localStorage.removeItem(TASKS_KEY);
        }
    } else {
        console.log("No completed tasks found in localStorage.");
        tasks = [];
    }
}

// --- Funções de Histórico e Relatório --- 

function updateHistoryTable(filteredTasks = tasks) {
    console.log("Updating history table with tasks:", filteredTasks);
    const tableBody = document.getElementById("history-table-body");
    if (!tableBody) {
        console.error("History table body not found!");
        return;
    }
    tableBody.innerHTML = "";

    if (filteredTasks.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma tarefa encontrada.</td></tr>'; // Colspan 6 agora
        return;
    }

    // Ordena as tarefas pela data de início mais recente
    const sortedTasks = [...filteredTasks].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    sortedTasks.forEach(task => {
        const row = tableBody.insertRow();
        const startTimeDate = new Date(task.startTime);
        const endTimeDate = new Date(task.endTime);

        row.innerHTML = `
            <td>${escapeHTML(task.name)}</td>
            <td>${formatTime(startTimeDate)}</td>
            <td>${formatTime(endTimeDate)}</td>
            <td>${task.duration}</td>
            <td>${task.date}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editTask(${task.id})">
                    <i class="bi bi-pencil-square"></i> Editar
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteTask(${task.id})">
                    <i class="bi bi-trash"></i> Excluir
                </button>
            </td>
        `;
    });
    console.log("History table updated successfully with action buttons.");
}

function deleteTask(taskId) {
    console.log(`Attempting to delete task with ID: ${taskId}`);
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) {
        return;
    }

    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex > -1) {
        tasks.splice(taskIndex, 1);
        saveTasksToLocalStorage();
        updateHistoryTable(); // Atualiza a tabela de histórico
        // Opcional: Atualizar relatório se estiver visível
        // if (document.getElementById('reports-tab-pane').classList.contains('show')) {
        //     generateReport(); 
        // }
        console.log(`Task with ID ${taskId} deleted successfully.`);
    } else {
        console.error(`Task with ID ${taskId} not found for deletion.`);
        alert("Erro: Tarefa não encontrada para exclusão.");
    }
}

function editTask(taskId) {
    console.log(`Attempting to edit task with ID: ${taskId}`);
    const taskToEdit = tasks.find(task => task.id === taskId);

    if (!taskToEdit) {
        console.error(`Task with ID ${taskId} not found for editing.`);
        alert("Erro: Tarefa não encontrada para edição.");
        return;
    }

    if (!editTaskModal || !editTaskNameInput || !editStartTimeInput || !editEndTimeInput) {
        console.error("Edit modal elements are not available.");
        alert("Erro: O formulário de edição não está pronto.");
        return;
    }

    // Preenche o modal com os dados da tarefa
    editingTaskId = taskId;
    editTaskNameInput.value = taskToEdit.name;
    // Formata as datas para datetime-local input (YYYY-MM-DDTHH:mm)
    editStartTimeInput.value = formatDateTimeLocal(new Date(taskToEdit.startTime));
    editEndTimeInput.value = formatDateTimeLocal(new Date(taskToEdit.endTime));

    // Abre o modal
    editTaskModal.show();
}

function saveEditedTask() {
    if (editingTaskId === null) {
        console.error("No task ID is set for editing.");
        return;
    }

    const taskIndex = tasks.findIndex(task => task.id === editingTaskId);
    if (taskIndex === -1) {
        console.error(`Task with ID ${editingTaskId} not found for saving edits.`);
        alert("Erro: Tarefa não encontrada para salvar as alterações.");
        editTaskModal.hide();
        editingTaskId = null;
        return;
    }

    const newName = editTaskNameInput.value.trim();
    const newStartTimeStr = editStartTimeInput.value;
    const newEndTimeStr = editEndTimeInput.value;

    if (!newName) {
        alert("O nome da tarefa não pode ficar vazio.");
        return;
    }
    if (!newStartTimeStr || !newEndTimeStr) {
        alert("As datas e horas de início e fim são obrigatórias.");
        return;
    }

    try {
        const newStartTime = new Date(newStartTimeStr);
        const newEndTime = new Date(newEndTimeStr);

        if (isNaN(newStartTime) || isNaN(newEndTime)) {
            throw new Error("Formato de data/hora inválido.");
        }

        if (newEndTime <= newStartTime) {
            alert("A hora de fim deve ser posterior à hora de início.");
            return;
        }

        const newDurationMs = newEndTime.getTime() - newStartTime.getTime();

        // Atualiza a tarefa no array
        tasks[taskIndex].name = newName;
        tasks[taskIndex].startTime = newStartTime.toISOString();
        tasks[taskIndex].endTime = newEndTime.toISOString();
        tasks[taskIndex].duration = formatDuration(newDurationMs);
        tasks[taskIndex].date = formatDate(newStartTime);

        saveTasksToLocalStorage();
        updateHistoryTable();
        // Opcional: Atualizar relatório
        // if (document.getElementById('reports-tab-pane').classList.contains('show')) {
        //     generateReport(); 
        // }

        console.log(`Task with ID ${editingTaskId} updated successfully.`);
        editTaskModal.hide();
        editingTaskId = null;

    } catch (error) {
        console.error("Error processing edited task data:", error);
        alert(`Erro ao salvar as alterações: ${error.message}`);
    }
}


function applyHistoryFilter() {
    console.log("Applying history filter...");
    const filterType = document.getElementById("filter-type").value;
    const filterDateValue = document.getElementById("filter-date").value;
    if (!filterDateValue) {
        alert("Por favor, selecione uma data para filtrar.");
        return;
    }
    // Adiciona T00:00:00 para garantir que a data seja interpretada no fuso horário local
    const filterDate = new Date(filterDateValue + "T00:00:00"); 

    console.log(`Filtering by type: ${filterType}, date: ${filterDate.toDateString()}`);

    const filteredTasks = tasks.filter(task => {
        const taskStartDate = new Date(task.startTime);
        // Zera horas, minutos, segundos e milissegundos para comparar apenas o dia
        taskStartDate.setHours(0, 0, 0, 0); 
        filterDate.setHours(0, 0, 0, 0); // Garante que a data do filtro também esteja zerada

        if (filterType === "day") {
            return taskStartDate.getTime() === filterDate.getTime();
        } else if (filterType === "week") {
            const weekStart = new Date(filterDate);
            weekStart.setDate(filterDate.getDate() - filterDate.getDay()); // Dia da semana (0=Domingo)
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999); // Final do dia do último dia da semana
            // Compara a data da tarefa (zerada) com o início e fim da semana
            const taskDateOnly = new Date(task.startTime);
            taskDateOnly.setHours(0,0,0,0);
            return taskDateOnly >= weekStart && taskDateOnly <= weekEnd;
        } else if (filterType === "month") {
            return taskStartDate.getFullYear() === filterDate.getFullYear() &&
                   taskStartDate.getMonth() === filterDate.getMonth();
        }
        return false;
    });

    console.log("Filtered tasks:", filteredTasks);
    updateHistoryTable(filteredTasks);
}

// --- Funções Utilitárias --- 

function formatTime(date) {
    if (!date || !(date instanceof Date) || isNaN(date)) {
        return "--:--:--";
    }
    try {
        return date.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
        console.error("Error formatting time:", e, "Date:", date);
        return "Erro";
    }
}

function formatDuration(ms) {
    if (typeof ms !== "number" || ms < 0 || isNaN(ms)) {
        ms = 0;
    }
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [
        hours.toString().padStart(2, "0"),
        minutes.toString().padStart(2, "0"),
        seconds.toString().padStart(2, "0"),
    ].join(":");
}

function formatDate(date) {
    if (!date || !(date instanceof Date) || isNaN(date)) {
        return "Data inválida";
    }
    try {
        return date.toLocaleDateString("pt-BR");
    } catch (e) {
        console.error("Error formatting date:", e, "Date:", date);
        return "Erro";
    }
}

// Função para formatar Date para input datetime-local (YYYY-MM-DDTHH:mm)
function formatDateTimeLocal(date) {
    if (!date || !(date instanceof Date) || isNaN(date)) {
        return "";
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getSelectedTaskName() {
    const predefinedTask = predefinedTasksSelect.value;
    const customTask = customTaskInput.value.trim();
    return customTask || predefinedTask;
}

function updateTaskName() {
    if (isRunning) return;
    const taskName = getSelectedTaskName();
    currentTaskName.textContent = taskName || "Nenhuma tarefa selecionada";
    if (this === predefinedTasksSelect && this.value) {
        customTaskInput.value = "";
    } else if (this === customTaskInput && this.value) {
        predefinedTasksSelect.value = "";
    }
}

function escapeHTML(str) {
    if (!str) return "";
    const entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;'
    };
    return str.replace(/[&<>]/g, function (s) { // Removido " para simplificar
        return entityMap[s];
    });
}

// Funções de relatório e PDF (presumidas existentes em report-functions.js e pdf-export.js)
// A função generateReport() em report-functions.js já usa a variável global 'tasks',
// então ao deletar/editar uma tarefa e chamar saveTasksToLocalStorage() e updateHistoryTable(),
// o próximo generateReport() já usará a lista atualizada.


