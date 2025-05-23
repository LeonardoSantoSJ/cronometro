// Aprimoramento das funções de relatório
function generateReport() {
    const reportPeriod = document.getElementById('report-period').value;
    const reportView = document.getElementById('report-view').value;
    
    // Determinar período de datas
    let startDate, endDate;
    
    if (reportPeriod === 'custom') {
        startDate = document.getElementById('report-start-date').valueAsDate;
        endDate = document.getElementById('report-end-date').valueAsDate;
        
        if (!startDate || !endDate) {
            alert('Por favor, selecione as datas inicial e final para o relatório personalizado.');
            return;
        }
        
        // Ajustar para incluir todo o dia final
        endDate.setHours(23, 59, 59, 999);
    } else {
        const today = new Date();
        
        switch (reportPeriod) {
            case 'day':
                startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
                break;
            
            case 'week':
                // Primeiro dia da semana (domingo)
                startDate = new Date(today);
                startDate.setDate(today.getDate() - today.getDay());
                startDate.setHours(0, 0, 0, 0);
                
                // Último dia da semana (sábado)
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;
            
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
        }
    }
    
    // Filtrar tarefas pelo período
    const filteredTasks = tasks.filter(task => {
        return task.startTime >= startDate && task.startTime <= endDate;
    });
    
    // Agrupar tarefas por nome
    const taskGroups = {};
    
    filteredTasks.forEach(task => {
        if (!taskGroups[task.name]) {
            taskGroups[task.name] = {
                name: task.name,
                count: 0,
                totalDuration: 0,
                tasks: []
            };
        }
        
        // Converter duração (HH:MM:SS) para segundos
        const [hours, minutes, seconds] = task.duration.split(':').map(Number);
        const durationInSeconds = hours * 3600 + minutes * 60 + seconds;
        
        taskGroups[task.name].count++;
        taskGroups[task.name].totalDuration += durationInSeconds;
        taskGroups[task.name].tasks.push(task);
    });
    
    // Calcular médias e formatar durações
    Object.values(taskGroups).forEach(group => {
        group.averageDuration = group.totalDuration / group.count;
        group.formattedTotalDuration = formatDuration(group.totalDuration * 1000);
        group.formattedAverageDuration = formatDuration(group.averageDuration * 1000);
    });
    
    // Atualizar visualização conforme selecionado
    updateReportView(Object.values(taskGroups), reportView);
}

function updateReportView(taskGroups, viewType) {
    const chartContainer = document.querySelector('.chart-container');
    const tableContainer = document.getElementById('report-table-container');
    
    // Configurar visibilidade
    switch (viewType) {
        case 'chart':
            chartContainer.style.display = 'block';
            tableContainer.style.display = 'none';
            break;
        
        case 'table':
            chartContainer.style.display = 'none';
            tableContainer.style.display = 'block';
            break;
        
        case 'both':
            chartContainer.style.display = 'block';
            tableContainer.style.display = 'block';
            break;
    }
    
    // Atualizar gráfico se visível
    if (viewType === 'chart' || viewType === 'both') {
        updateReportChart(taskGroups);
    }
    
    // Atualizar tabela se visível
    if (viewType === 'table' || viewType === 'both') {
        updateReportTable(taskGroups);
    }
}

function updateReportChart(taskGroups) {
    const ctx = document.getElementById('report-chart').getContext('2d');
    
    // Destruir gráfico existente se houver
    if (window.reportChart) {
        window.reportChart.destroy();
    }
    
    // Se não houver dados, mostrar mensagem
    if (taskGroups.length === 0) {
        // Limpar área do gráfico
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Mostrar mensagem
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#6c757d';
        ctx.fillText('Nenhuma tarefa encontrada para este período.', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    // Preparar dados para gráfico de barras (tempo total)
    const barLabels = taskGroups.map(group => group.name);
    const barData = taskGroups.map(group => group.totalDuration / 60); // Converter para minutos
    
    // Preparar dados para gráfico de pizza (distribuição de tempo)
    const pieLabels = barLabels;
    const pieData = barData;
    
    // Gerar cores aleatórias para os gráficos
    const backgroundColors = taskGroups.map(() => {
        const r = Math.floor(Math.random() * 200) + 55;
        const g = Math.floor(Math.random() * 200) + 55;
        const b = Math.floor(Math.random() * 200) + 55;
        return `rgba(${r}, ${g}, ${b}, 0.7)`;
    });
    
    const borderColors = backgroundColors.map(color => color.replace('0.7', '1'));
    
    // Criar gráfico
    window.reportChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: barLabels,
            datasets: [{
                label: 'Tempo Total (minutos)',
                data: barData,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Tempo Total por Tarefa',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const minutes = context.raw;
                            const hours = Math.floor(minutes / 60);
                            const mins = Math.round(minutes % 60);
                            return `${hours}h ${mins}m`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Minutos'
                    },
                    ticks: {
                        callback: function(value) {
                            const hours = Math.floor(value / 60);
                            const mins = Math.round(value % 60);
                            if (hours > 0) {
                                return `${hours}h ${mins}m`;
                            }
                            return `${mins}m`;
                        }
                    }
                }
            }
        }
    });
    
    // Adicionar botão para alternar tipo de gráfico
    if (!document.getElementById('toggle-chart-type')) {
        const toggleButton = document.createElement('button');
        toggleButton.id = 'toggle-chart-type';
        toggleButton.className = 'btn btn-sm btn-outline-secondary mt-2';
        toggleButton.textContent = 'Alternar para Gráfico de Pizza';
        toggleButton.onclick = toggleChartType;
        
        chartContainer.appendChild(toggleButton);
    } else {
        document.getElementById('toggle-chart-type').textContent = 'Alternar para Gráfico de Pizza';
    }
    
    // Função para alternar tipo de gráfico
    function toggleChartType() {
        if (window.reportChart.config.type === 'bar') {
            // Mudar para gráfico de pizza
            window.reportChart.destroy();
            window.reportChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: pieLabels,
                    datasets: [{
                        data: pieData,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Distribuição de Tempo por Tarefa',
                            font: {
                                size: 16
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const minutes = context.raw;
                                    const hours = Math.floor(minutes / 60);
                                    const mins = Math.round(minutes % 60);
                                    const percentage = Math.round((minutes / pieData.reduce((a, b) => a + b, 0)) * 100);
                                    return `${context.label}: ${hours}h ${mins}m (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
            this.textContent = 'Alternar para Gráfico de Barras';
        } else {
            // Mudar para gráfico de barras
            window.reportChart.destroy();
            window.reportChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: barLabels,
                    datasets: [{
                        label: 'Tempo Total (minutos)',
                        data: barData,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Tempo Total por Tarefa',
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const minutes = context.raw;
                                    const hours = Math.floor(minutes / 60);
                                    const mins = Math.round(minutes % 60);
                                    return `${hours}h ${mins}m`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Minutos'
                            },
                            ticks: {
                                callback: function(value) {
                                    const hours = Math.floor(value / 60);
                                    const mins = Math.round(value % 60);
                                    if (hours > 0) {
                                        return `${hours}h ${mins}m`;
                                    }
                                    return `${mins}m`;
                                }
                            }
                        }
                    }
                }
            });
            this.textContent = 'Alternar para Gráfico de Pizza';
        }
    }
}

function updateReportTable(taskGroups) {
    const tableBody = document.getElementById('report-table-body');
    
    // Limpar tabela
    tableBody.innerHTML = '';
    
    // Adicionar linhas
    taskGroups.forEach(group => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${group.name}</td>
            <td>${group.formattedTotalDuration}</td>
            <td>${group.formattedAverageDuration}</td>
            <td>${group.count}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Adicionar linha de total se houver dados
    if (taskGroups.length > 0) {
        const totalRow = document.createElement('tr');
        totalRow.className = 'table-active';
        
        // Calcular totais
        const totalCount = taskGroups.reduce((sum, group) => sum + group.count, 0);
        const totalDuration = taskGroups.reduce((sum, group) => sum + group.totalDuration, 0);
        const formattedTotalDuration = formatDuration(totalDuration * 1000);
        
        totalRow.innerHTML = `
            <td><strong>TOTAL</strong></td>
            <td><strong>${formattedTotalDuration}</strong></td>
            <td>-</td>
            <td><strong>${totalCount}</strong></td>
        `;
        
        tableBody.appendChild(totalRow);
    }
    
    // Mensagem se não houver dados
    if (taskGroups.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="text-center">Nenhuma tarefa encontrada para este período.</td>';
        tableBody.appendChild(row);
    }
}
