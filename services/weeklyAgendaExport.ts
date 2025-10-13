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
  doc.setFontSize(12); // Larger header
  doc.setFont(undefined, 'bold');
  const headerText = `${organization?.name || 'Toastmasters Club'} Meeting Agenda for ${format(meetingDate, 'MMMM d, yyyy')}`;
  doc.text(headerText, 105, 8, { align: 'center' }); // Move header up

  // Add a larger space between title and theme
  let themeY = 8 + 10; // 10 units below the title for more visible gap
  let tableStartY = themeY;

  // Theme line - compact
  if (agenda.theme) {
    doc.setFontSize(13); // Larger theme font
    doc.setFont(undefined, 'bold');
    doc.setTextColor(185, 28, 28); // Red color for theme
    doc.text(`Theme: "${agenda.theme}"`, 105, themeY, { align: 'center' });
    doc.setTextColor(0, 0, 0); // Reset to black
    tableStartY = themeY + 6; // Add extra space below theme
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
  startY: tableStartY, // Dynamically set table start position below theme
    styles: {
      fontSize: 10,
      cellPadding: 1,
      lineColor: [128, 128, 128],
      lineWidth: 0.5,
      valign: 'top',
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue-500 for color
      textColor: [255, 255, 255], // White text
      fontStyle: 'bold',
      fontSize: 11,
      halign: 'center',
      cellPadding: 1.5,
    },
  margin: { left: 10 },
  startY: tableStartY,
  columnStyles: {
      0: { cellWidth: 13, halign: 'center' }, // Time (thinner)
      1: { cellWidth: 72, halign: 'left', fontStyle: 'bold' }, // Program Event (wider)
      2: { cellWidth: 38, halign: 'center' }, // Member (slightly wider)
      3: { cellWidth: 67, halign: 'center' }, // Description (slightly wider)
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
          
          // For space rows, left-align Program Event column but keep time centered
          if (data.column.index === 1) { // Program Event column
            data.cell.styles.halign = 'left';
            data.cell.styles.fontStyle = 'bold';
          } else if (data.column.index === 0) { // Time column
            data.cell.styles.halign = 'center'; // Keep time centered
          } else {
            data.cell.styles.halign = 'left';
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
    doc.text('Next Meeting: ', 20, finalY + 12);
    
    // Calculate the width of "Next Meeting: " to position the rest of the text
    const nextMeetingLabelWidth = doc.getTextWidth('Next Meeting: ');
    
    // Build the text with bold labels
    doc.setFont(undefined, 'bold');
    doc.text('TM: ', 20 + nextMeetingLabelWidth, finalY + 12);
    const tmWidth = doc.getTextWidth('TM: ');
    
    doc.setFont(undefined, 'normal');
    doc.text(`${agenda.nextMeetingInfo.toastmaster}, `, 20 + nextMeetingLabelWidth + tmWidth, finalY + 12);
    const tmNameWidth = doc.getTextWidth(`${agenda.nextMeetingInfo.toastmaster}, `);
    
    doc.setFont(undefined, 'bold');
    doc.text('Speakers: ', 20 + nextMeetingLabelWidth + tmWidth + tmNameWidth, finalY + 12);
    const speakersLabelWidth = doc.getTextWidth('Speakers: ');
    
    doc.setFont(undefined, 'normal');
    doc.text(`${agenda.nextMeetingInfo.speakers.filter(s => s).join(', ')}, `, 20 + nextMeetingLabelWidth + tmWidth + tmNameWidth + speakersLabelWidth, finalY + 12);
    const speakersWidth = doc.getTextWidth(`${agenda.nextMeetingInfo.speakers.filter(s => s).join(', ')}, `);
    
    doc.setFont(undefined, 'bold');
    doc.text('TT: ', 20 + nextMeetingLabelWidth + tmWidth + tmNameWidth + speakersLabelWidth + speakersWidth, finalY + 12);
    const ttLabelWidth = doc.getTextWidth('TT: ');
    
    doc.setFont(undefined, 'normal');
    doc.text(agenda.nextMeetingInfo.tableTopicsMaster, 20 + nextMeetingLabelWidth + tmWidth + tmNameWidth + speakersLabelWidth + speakersWidth + ttLabelWidth, finalY + 12);
  }
  
  doc.setFontSize(8);
  doc.text(`Website: ${agenda.websiteUrl || 'https://tmapp.club'}`, 20, finalY + 18);
  
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
  dataGrid.push([`${clubName} Meeting Agenda for ${dateStr}`, '', '', '']);
  
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
  dataGrid.push([agenda.websiteUrl || 'https://tmapp.club', '', '', '']);
  
  // Convert 2D array to TSV string
  return dataGrid.map(row => row.join('\t')).join('\n');
};
