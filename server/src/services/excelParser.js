const ExcelJS = require('exceljs');

const HEADER_MAP = {
name:         ['이름', '학생명', '성명', 'name', 'student'],
takenAt:      ['응시일', '시험일', '날짜', 'date', 'taken_at', 'takenAt'],
totalScore:   ['총점', 'total', '합계', 'total_score', 'totalScore'],
lcScore:      ['lc', 'lc점수', 'lc 점수', 'listening', 'lc_score', 'lcScore'],
rcScore:      ['rc', 'rc점수', 'rc 점수', 'reading', 'rc_score', 'rcScore'],
part1Correct: ['part1', 'p1', '파트1', '파트 1', 'part 1'],
part2Correct: ['part2', 'p2', '파트2', '파트 2', 'part 2'],
part3Correct: ['part3', 'p3', '파트3', '파트 3', 'part 3'],
part4Correct: ['part4', 'p4', '파트4', '파트 4', 'part 4'],
part5Correct: ['part5', 'p5', '파트5', '파트 5', 'part 5'],
part6Correct: ['part6', 'p6', '파트6', '파트 6', 'part 6'],
part7Correct: ['part7', 'p7', '파트7', '파트 7', 'part 7'],
};

function normalize(str) {
return String(str ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

function buildColumnIndex(headerRow) {
const index = {};
headerRow.eachCell((cell, colNumber) => {
const h = normalize(cell.value);
for (const [field, aliases] of Object.entries(HEADER_MAP)) {
if (aliases.some(a => normalize(a) === h)) {
index[field] = colNumber;
break;
}
}
});
return index;
}

async function parseScoreExcel(buffer) {
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(buffer);

const sheet = workbook.worksheets[0];
if (!sheet) throw new Error('시트를 찾을 수 없습니다.');

const headerRow = sheet.getRow(1);
const colIdx = buildColumnIndex(headerRow);

if (!colIdx.name) {
throw new Error('이름 컬럼을 찾을 수 없습니다. (이름 / 학생명 / name)');
}
if (!colIdx.totalScore && !(colIdx.lcScore && colIdx.rcScore)) {
throw new Error('점수 컬럼을 찾을 수 없습니다. (총점 또는 LC + RC 컬럼 필요)');
}

const records = [];

sheet.eachRow((row, rowNumber) => {
if (rowNumber === 1) return;

const nameVal = row.getCell(colIdx.name)?.value;
if (!nameVal) return;

const lcScore = colIdx.lcScore  ? Number(row.getCell(colIdx.lcScore).value)  || 0 : 0;
const rcScore = colIdx.rcScore  ? Number(row.getCell(colIdx.rcScore).value)  || 0 : 0;
const total   = colIdx.totalScore
? Number(row.getCell(colIdx.totalScore).value) || (lcScore + rcScore)
: lcScore + rcScore;

const getNum = (field) =>
colIdx[field] ? Number(row.getCell(colIdx[field]).value) || null : null;

const takenAtRaw = colIdx.takenAt ? row.getCell(colIdx.takenAt).value : null;
const takenAt    = takenAtRaw instanceof Date
? takenAtRaw
: (takenAtRaw ? new Date(takenAtRaw) : new Date());

records.push({
name:         String(nameVal).trim(),
takenAt,
totalScore:   total,
lcScore,
rcScore,
part1Correct: getNum('part1Correct'),
part2Correct: getNum('part2Correct'),
part3Correct: getNum('part3Correct'),
part4Correct: getNum('part4Correct'),
part5Correct: getNum('part5Correct'),
part6Correct: getNum('part6Correct'),
part7Correct: getNum('part7Correct'),
});
});

return records;
}

module.exports = { parseScoreExcel };