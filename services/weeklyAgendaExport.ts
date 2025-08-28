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
  
  // Save the PDF
  const fileName = `agenda-${format(meetingDate, 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};

export const exportWeeklyAgendaToTSV = (
  agenda: WeeklyAgenda,
  organization: Organization | null,
  meetingDate: Date
) => {
  const lines: string[] = [];
  
  // Header metadata
  lines.push(`Club\t${organization?.name || 'Toastmasters Club'}`);
  lines.push(`Club #\t${organization?.clubNumber || 'XXXXX'}`);
  lines.push(`Title\tMeeting Agenda`);
  lines.push(`Date\t${format(meetingDate, 'MMMM d, yyyy')}`);
  if (agenda.theme) {
    lines.push(`Theme\t${agenda.theme}`);
  }
  lines.push(''); // Empty line
  
  // Table header
  lines.push('Time\tProgram Event\tMember\tDescription');
  
  // Table data
  agenda.items.forEach(item => {
    lines.push(`${item.time}\t${item.programEvent}\t${item.person}\t${item.description}`);
  });
  
  lines.push(''); // Empty line
  
  // Footer
  if (agenda.nextMeetingInfo) {
    lines.push(`Next Meeting\tTM: ${agenda.nextMeetingInfo.toastmaster}, Speakers: ${agenda.nextMeetingInfo.speakers.join(', ')}, TT: ${agenda.nextMeetingInfo.tableTopicsMaster}`);
  }
  lines.push(`Website\t${agenda.websiteUrl || `${window.location.origin} tmapp.club`}`);
  
  // Create and download the file
  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `agenda-${format(meetingDate, 'yyyy-MM-dd')}.tsv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
