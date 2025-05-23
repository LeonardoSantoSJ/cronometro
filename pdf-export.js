// Funções para exportação de relatórios para PDF
function exportToPDF() {
    const reportPeriod = document.getElementById('report-period').value;
    const reportView = document.getElementById('report-view').value;
    
    // Obter período formatado para o título
    let periodText = '';
    if (reportPeriod === 'custom') {
        const startDate = document.getElementById('report-start-date').valueAsDate;
        const endDate = document.getElementById('report-end-date').valueAsDate;
        
        if (!startDate || !endDate) {
            alert('Por favor, selecione as datas inicial e final para exportar o relatório personalizado.');
            return;
        }
        
        periodText = `${formatDateBR(startDate)} a ${formatDateBR(endDate)}`;
    } else {
        const today = new Date();
        
        switch (reportPeriod) {
            case 'day':
                periodText = `Dia: ${formatDateBR(today)}`;
                break;
            
            case 'week':
                // Primeiro dia da semana (domingo)
                const firstDayOfWeek = new Date(today);
                firstDayOfWeek.setDate(today.getDate() - today.getDay());
                
                // Último dia da semana (sábado)
                const lastDayOfWeek = new Date(firstDayOfWeek);
                lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
                
                periodText = `Semana: ${formatDateBR(firstDayOfWeek)} a ${formatDateBR(lastDayOfWeek)}`;
                break;
            
            case 'month':
                periodText = `Mês: ${today.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`;
                break;
        }
    }
    
    // Inicializar jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configurar fonte e tamanho
    doc.setFont('helvetica');
    doc.setFontSize(16);
    
    // Título
    doc.text('Relatório de Tempo de Tarefas', 105, 20, { align: 'center' });
    
    // Subtítulo com período
    doc.setFontSize(12);
    doc.text(`Período: ${periodText}`, 105, 30, { align: 'center' });
    
    // Data de geração
    doc.setFontSize(10);
    doc.text(`Gerado em: ${formatDateTimeBR(new Date())}`, 105, 38, { align: 'center' });
    
    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(20, 42, 190, 42);
    
    // Posição vertical atual
    let yPos = 50;
    
    // Adicionar tabela de dados se estiver visível
    if (reportView === 'table' || reportView === 'both') {
        // Título da seção
        doc.setFontSize(14);
        doc.text('Resumo de Tarefas', 20, yPos);
        yPos += 10;
        
        // Obter dados da tabela
        const tableData = getTableData();
        
        if (tableData.length > 0) {
            // Configurar cabeçalhos e colunas
            const headers = [['Tarefa', 'Tempo Total', 'Tempo Médio', 'Frequência']];
            
            // Adicionar tabela ao PDF
            doc.autoTable({
                startY: yPos,
                head: headers,
                body: tableData,
                theme: 'striped',
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                styles: {
                    fontSize: 10,
                    cellPadding: 3
                },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 30, halign: 'center' },
                    2: { cellWidth: 30, halign: 'center' },
                    3: { cellWidth: 25, halign: 'center' }
                }
            });
            
            // Atualizar posição vertical
            yPos = doc.lastAutoTable.finalY + 15;
        } else {
            doc.setFontSize(12);
            doc.text('Nenhuma tarefa encontrada para este período.', 20, yPos);
            yPos += 15;
        }
    }
    
    // Adicionar gráfico se estiver visível
    if (reportView === 'chart' || reportView === 'both') {
        // Verificar se há um gráfico para exportar
        if (window.reportChart) {
            // Título da seção
            doc.setFontSize(14);
            doc.text('Gráfico de Tempo por Tarefa', 20, yPos);
            yPos += 10;
            
            // Capturar gráfico como imagem
            const canvas = document.getElementById('report-chart');
            const chartImage = canvas.toDataURL('image/png', 1.0);
            
            // Calcular dimensões para manter proporção
            const imgWidth = 170;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            // Verificar se precisa de nova página
            if (yPos + imgHeight > 280) {
                doc.addPage();
                yPos = 20;
            }
            
            // Adicionar imagem ao PDF
            doc.addImage(chartImage, 'PNG', 20, yPos, imgWidth, imgHeight);
            
            // Atualizar posição vertical
            yPos += imgHeight + 15;
        } else {
            doc.setFontSize(12);
            doc.text('Nenhum gráfico disponível para este período.', 20, yPos);
            yPos += 15;
        }
    }
    
    // Adicionar rodapé
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
        doc.text('Cronômetro de Tarefas', 20, 285);
    }
    
    // Salvar o PDF
    doc.save(`relatorio_tarefas_${formatDateFilenameBR(new Date())}.pdf`);
}

// Função para obter dados da tabela para o PDF
function getTableData() {
    const tableBody = document.getElementById('report-table-body');
    const rows = tableBody.querySelectorAll('tr:not(.table-active)'); // Excluir linha de total
    
    const data = [];
    
    rows.forEach(row => {
        // Verificar se não é uma linha de mensagem vazia
        if (row.cells.length === 1 && row.cells[0].colSpan > 1) {
            return;
        }
        
        const rowData = [];
        row.querySelectorAll('td').forEach(cell => {
            rowData.push(cell.textContent.trim());
        });
        
        if (rowData.length > 0) {
            data.push(rowData);
        }
    });
    
    return data;
}

// Funções auxiliares de formatação de data
function formatDateBR(date) {
    return date.toLocaleDateString('pt-BR');
}

function formatDateTimeBR(date) {
    return date.toLocaleString('pt-BR');
}

function formatDateFilenameBR(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}
