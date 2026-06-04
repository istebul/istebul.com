import test from 'node:test';
import assert from 'node:assert/strict';

const {
  applyAssistantQuestionFlow,
  buildAssistantWizardSteps,
  resetAssistantAnswersOnForkChange,
  getAssistantForkField
} = await import('../../js/features/assistant/assistant-flow.js');

const tatilQuestions = [
  { id: 'province', label: 'İl' },
  { id: 'vacationType', label: 'Tip', options: [{ value: 'familyResort' }, { value: 'honeymoon' }, { value: 'culture' }] },
  { id: 'travelers', label: 'Kişi', options: [{ value: 'solo' }, { value: 'couple' }, { value: 'family' }] },
  { id: 'budget', label: 'Bütçe', type: 'number' },
  { id: 'priority', label: 'Öncelik', options: [{ value: 'allInclusive' }, { value: 'premium' }] }
];

test('tatil honeymoon limits travelers to couple', () => {
  const filtered = applyAssistantQuestionFlow('tatil', tatilQuestions, { vacationType: 'honeymoon' });
  const travelers = filtered.find((q) => q.id === 'travelers');
  assert.deepEqual(
    travelers.options.map((o) => o.value),
    ['couple']
  );
});

test('buildAssistantWizardSteps inserts profile step for fork', () => {
  const steps = buildAssistantWizardSteps('tatil', { questions: tatilQuestions }, {});
  assert.equal(steps[1].id, 'profile');
  assert.equal(steps[1].questions[0].id, 'vacationType');
});

test('resetAssistantAnswersOnForkChange clears incompatible tatil answers', () => {
  const answers = {
    vacationType: 'familyResort',
    travelers: 'family',
    destination: 'europe',
    priority: 'experience'
  };
  answers.vacationType = 'honeymoon';
  const next = resetAssistantAnswersOnForkChange('tatil', answers, 'vacationType', 'familyResort');
  assert.equal(next.travelers, 'couple');
  assert.equal(next.destination, '');
});

test('arac fork field is usage', () => {
  assert.equal(getAssistantForkField('arac'), 'usage');
});

test('finansman konut fork limits long terms only', () => {
  const questions = [
    { id: 'purpose', options: [{ value: 'konut' }, { value: 'arac' }] },
    { id: 'term', options: [{ value: '36' }, { value: '120' }, { value: '240' }] },
    { id: 'budget', type: 'number' }
  ];
  const filtered = applyAssistantQuestionFlow('finansman', questions, { purpose: 'konut' });
  const term = filtered.find((q) => q.id === 'term');
  assert.deepEqual(
    term.options.map((o) => o.value),
    ['120', '240']
  );
});
