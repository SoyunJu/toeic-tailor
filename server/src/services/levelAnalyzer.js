const PART_MAX = {
part1Correct: 6,
part2Correct: 25,
part3Correct: 39,
part4Correct: 30,
part5Correct: 30,
part6Correct: 16,
part7Correct: 54,
};

function getLevel(totalScore) {
if (totalScore < 500) return 'BEGINNER';
if (totalScore < 700) return 'INTERMEDIATE';
if (totalScore < 850) return 'ADVANCED';
return 'EXPERT';
}

function getWeakParts(scoreRecord) {
const rates = [];
for (const [key, max] of Object.entries(PART_MAX)) {
const correct = scoreRecord[key];
if (correct === null || correct === undefined) continue;
const partNum = parseInt(key.replace('part', '').replace('Correct', ''));
rates.push({ part: partNum, rate: correct / max });
}
return rates.sort((a, b) => a.rate - b.rate);
}

module.exports = { getLevel, getWeakParts, PART_MAX };