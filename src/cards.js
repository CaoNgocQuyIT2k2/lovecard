import questions from './questions.json';

export const decks = [
  { id: 'new', name: 'Mới quen', description: '0 – 3 tháng' },
  { id: 'dating', name: 'Đang yêu', description: '3 – 12 tháng' },
  { id: 'long', name: 'Yêu lâu', description: 'Trên 1 năm' }
].map((deck, index) => ({
  ...deck,
  questions: [
    ...questions[index].deepTalk,
    ...questions[index].truth,
    ...questions[index].challenge
  ]
}));
