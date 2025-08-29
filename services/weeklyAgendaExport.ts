import { WeeklyAgenda, Organization } from '../types';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportWeeklyAgendaToPDF = (
  agenda: WeeklyAgenda,
  organization: Organization | null,
  meetingDate: Date
) => {
  const doc = new jsPDF();
  
  // Very compact header - pushed higher
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  const headerText = `${organization?.name || 'Toastmasters Club'} TM-${organization?.clubNumber || 'XXXXX'} Meeting Agenda for ${format(meetingDate, 'MMMM d, yyyy')}`;
  doc.text(headerText, 105, 10, { align: 'center' });
  
  // Theme line - compact
  if (agenda.theme) {
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(185, 28, 28); // Red color for theme
    doc.text(`Theme: "${agenda.theme}"`, 105, 16, { align: 'center' });
    doc.setTextColor(0, 0, 0); // Reset to black
  }
  
  // Determine which rows should be highlighted and which should be red
  const highlightedRows: number[] = [];
  const redRows: number[] = [];
  agenda.items.forEach((item, index) => {
    if (item.rowColor === 'highlight') {
      highlightedRows.push(index);
    } else if (item.rowColor === 'space') {
      redRows.push(index);
    }
    // Note: No auto-detection - only manual color selection
  });
  
  // Simple table data without complex spanning
  const tableData = agenda.items.map(item => {
    if (item.rowColor === 'space') {
      // For space rows, put all content in Program Event column and clear others
      return [
        item.time || '',
        item.programEvent || item.person || item.description || '',
        '',
        ''
      ];
    }
    return [
      item.time || '',
      item.programEvent,
      item.person || '',
      item.description || ''
    ];
  });
  
  (autoTable as any)(doc, {
    head: [['Time', 'Program Event', 'Member', 'Description of Role or Task']],
    body: tableData,
    startY: agenda.theme ? 20 : 14,
    styles: {
      fontSize: 8.5,
      cellPadding: 1.5,
      lineColor: [128, 128, 128],
      lineWidth: 0.5,
      valign: 'top',
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue-500 for color
      textColor: [255, 255, 255], // White text
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 65, halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 70, halign: 'center' },
    },
    bodyStyles: {
      textColor: [0, 0, 0],
    },
    didParseCell: (data) => {
      // Center align the third and fourth column headers
      if (data.section === 'head' && (data.column.index === 2 || data.column.index === 3)) {
        data.cell.styles.halign = 'center';
      }
      
      // Apply background colors and alignment to special rows
      if (data.section === 'body') {
        const rowIndex = data.row.index;
        const isHighlighted = highlightedRows.includes(rowIndex);
        const isSpace = redRows.includes(rowIndex);
        
        if (isHighlighted) {
          data.cell.styles.fillColor = [219, 234, 254]; // Light blue (blue-100)
          data.cell.styles.textColor = [0, 0, 0]; // Black text
        } else if (isSpace) {
          data.cell.styles.fillColor = [254, 226, 226]; // Light red (red-100)
          data.cell.styles.textColor = [220, 38, 38]; // Red text
          data.cell.styles.halign = 'left'; // Left-align text for space rows
          
          // For space rows, make the Program Event column span visually by making other columns empty
          if (data.column.index === 1) { // Program Event column
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
  });
  
  // Footer
  const finalY = (doc as any).lastAutoTable.finalY || 65;
  
  // Add a line before footer
  doc.setLineWidth(0.5);
  doc.line(20, finalY + 5, 190, finalY + 5);
  
  if (agenda.nextMeetingInfo) {
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Next Meeting:', 20, finalY + 12);
    doc.setFont(undefined, 'normal');
    const nextMeetingText = `TM: ${agenda.nextMeetingInfo.toastmaster}, Speakers: ${agenda.nextMeetingInfo.speakers.filter(s => s).join(', ')}, TT: ${agenda.nextMeetingInfo.tableTopicsMaster}`;
    doc.text(nextMeetingText, 50, finalY + 12);
  }
  
  doc.setFontSize(8);
  doc.text(`Website: ${agenda.websiteUrl || `${window.location.origin} tmapp.club`}`, 20, finalY + 18);
  
  // Save the PDF with proper naming: TM - Club Name - Theme - Month Day - Agenda
  const monthDay = format(meetingDate, 'MMMM d');
  const clubName = organization?.name || 'Toastmasters Club';
  const theme = agenda.theme || 'No Theme';
  const fileName = `TM - ${clubName} - ${theme} - ${monthDay} - Agenda.pdf`;
  doc.save(fileName);
};

export const exportWeeklyAgendaToTSV = (
  agenda: WeeklyAgenda,
  organization: Organization | null,
  meetingDate: Date
): string => {
  const dataGrid: string[][] = [];
  const clubName = organization?.name || 'Toastmasters Club';
  const clubNumber = organization?.clubNumber || 'XXXXX';
  const dateStr = format(meetingDate, 'MMMM d, yyyy');
  
  // Header row - spans all columns
  dataGrid.push([`${clubName} TM-${clubNumber} Meeting Agenda for ${dateStr}`, '', '', '']);
  
  // Theme row - spans all columns
  if (agenda.theme) {
    dataGrid.push([`The Theme for this meeting is "${agenda.theme}"`, '', '', '']);
  }
  
  // Empty row
  dataGrid.push(['', '', '', '']);
  
  // Table headers
  dataGrid.push(['Time', 'Program Event', 'Member', 'Description of Role or Task']);
  
  // Table data
  agenda.items.forEach(item => {
    if (item.rowColor === 'space') {
      // For space rows, put all content in Program Event column and span
      dataGrid.push([
        item.time || '',
        item.programEvent || item.person || item.description || '',
        '',
        ''
      ]);
    } else {
      dataGrid.push([
        item.time || '',
        item.programEvent || '',
        item.person || '',
        item.description || ''
      ]);
    }
  });
  
  // Empty row
  dataGrid.push(['', '', '', '']);
  
  // Footer
  if (agenda.nextMeetingInfo) {
    dataGrid.push([`Next Meeting – TM: ${agenda.nextMeetingInfo.toastmaster}, Speakers: ${agenda.nextMeetingInfo.speakers.filter(s => s).join(', ')}, TT: ${agenda.nextMeetingInfo.tableTopicsMaster}`, '', '', '']);
  }
  dataGrid.push([agenda.websiteUrl || `${window.location.origin} tmapp.club`, '', '', '']);
  
  // Convert 2D array to TSV string
  return dataGrid.map(row => row.join('\t')).join('\n');
};
