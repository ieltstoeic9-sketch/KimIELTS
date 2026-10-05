/**
 * ANH NGỮ MS. KIM - UNIVERSAL RESULT TRACKER
 * One Google Sheet can receive results from all tests:
 * KET / PRE-IELTS / IELTS / Listening / Reading / etc.
 */

const SHEET_NAME = 'Results';

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) sh = ss.insertSheet(SHEET_NAME);

    const raw = e && e.parameter ? e.parameter.payload : '';
    if (!raw) throw new Error('Missing payload');

    const data = JSON.parse(raw);
    const answers = Array.isArray(data.answers) ? data.answers : [];

    const total = Number(data.total || answers.length || 0);
    const baseHeaders = [
      'Submitted At',
      'Student Name',
      'Class',
      'Course',
      'Skill',
      'Test',
      'Score',
      'Total',
      'Correct',
      'Incorrect',
      'Correct Rate'
    ];

    // Create / extend headers automatically according to the longest test.
    if (sh.getLastRow() === 0) {
      const headers = [
        ...baseHeaders,
        ...Array.from({ length: total }, (_, i) => `Q${i + 1}`)
      ];
      sh.appendRow(headers);
      sh.setFrozenRows(1);
    } else {
      const lastCol = sh.getLastColumn();
      const currentHeaders = sh.getRange(1, 1, 1, lastCol).getValues()[0];
      const currentQCount = Math.max(0, currentHeaders.length - baseHeaders.length);

      if (total > currentQCount) {
        const newHeaders = [];
        for (let i = currentQCount + 1; i <= total; i++) {
          newHeaders.push(`Q${i}`);
        }
        sh.getRange(1, lastCol + 1, 1, newHeaders.length).setValues([newHeaders]);
      }
    }

    const qCells = [];
    for (let i = 1; i <= total; i++) {
      const a = answers.find(x => Number(x.question) === i);
      if (!a) {
        qCells.push('');
      } else {
        const mark = a.isCorrect ? '✓' : '✗';
        qCells.push(`${a.answer || ''} ${mark} | Key: ${a.correctAnswer || ''}`);
      }
    }

    const score = Number(data.score || data.correct || 0);
    const correct = Number(data.correct ?? score);
    const incorrect = Number(data.incorrect ?? Math.max(0, total - correct));
    const rate = Number(data.correctRate ?? (total ? Math.round(correct * 10000 / total) / 100 : 0));

    const row = [
      new Date(),
      data.studentName || '',
      data.className || '',
      data.courseName || '',
      data.skillName || '',
      data.testName || '',
      `${score}/${total}`,
      total,
      correct,
      incorrect,
      `${rate}%`,
      ...qCells
    ];

    // Pad row so it always matches current sheet width.
    const width = sh.getLastColumn();
    while (row.length < width) row.push('');

    sh.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        error: String(err)
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
