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

test('finansman konut fork limits term options to vertical wizard values', () => {
  const questions = [
    { id: 'purpose', options: [{ value: 'konut' }, { value: 'arac' }] },
    {
      id: 'term',
      options: [
        { value: '36', label: '36 ay' },
        { value: '48', label: '48 ay' },
        { value: '60', label: '60 ay' },
        { value: '120', label: '120 ay' }
      ]
    },
    { id: 'budget', type: 'number' }
  ];
  const filtered = applyAssistantQuestionFlow('finansman', questions, { purpose: 'konut' });
  const term = filtered.find((q) => q.id === 'term');
  assert.deepEqual(
    term.options.map((o) => o.value),
    ['36', '48', '60']
  );
});

test('sigorta seyahat fork limits destination options', () => {
  const questions = [
    { id: 'insuranceType', options: [{ value: 'seyahat' }, { value: 'arac' }] },
    {
      id: 'destination_type',
      options: [
        { value: 'yurtici' },
        { value: 'yurtdisi' },
        { value: 'schengen' }
      ]
    },
    { id: 'budget', type: 'number' }
  ];
  const filtered = applyAssistantQuestionFlow('sigorta', questions, { insuranceType: 'seyahat' });
  const dest = filtered.find((q) => q.id === 'destination_type');
  assert.equal(dest.options.length, 3);
});
