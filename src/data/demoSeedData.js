export const demoProgram = {
  title: 'Demo AI Course Enrollment',
  slug: 'demo-course',
  description: 'A demo enrollment flow for AquaGate.',
  isActive: true,
  courseAccessUrl: 'https://example.com/course-access',
  questionVersion: 1,
  criteriaVersion: 1,
}

export const demoQuestions = [
  {
    questionText: 'Why do you want to join this course at this stage of your learning journey?',
    modelAnswer:
      'A strong answer explains current goals, why the course is timely, and what specific outcomes the applicant expects to gain.',
    maxScore: 10,
    order: 1,
    isActive: true,
    rubric: {
      correctness: 2,
      clarity: 2,
      depth: 3,
      examples: 3,
    },
  },
  {
    questionText: 'Describe a recent project or learning challenge you completed successfully.',
    modelAnswer:
      'A high-quality response outlines the problem, the applicant’s contribution, the process followed, and the outcome achieved.',
    maxScore: 10,
    order: 2,
    isActive: true,
    rubric: {
      correctness: 2,
      clarity: 2,
      depth: 3,
      examples: 3,
    },
  },
  {
    questionText: 'How do you usually approach learning a completely new concept or tool?',
    modelAnswer:
      'The best responses show structure, initiative, consistency, and the ability to learn independently through practice and feedback.',
    maxScore: 10,
    order: 3,
    isActive: true,
    rubric: {
      correctness: 2,
      clarity: 2,
      depth: 3,
      examples: 3,
    },
  },
  {
    questionText: 'Tell us about a time you received critical feedback and what you did next.',
    modelAnswer:
      'A strong answer demonstrates coachability, reflection, specific action taken, and visible improvement after feedback.',
    maxScore: 10,
    order: 4,
    isActive: true,
    rubric: {
      correctness: 2,
      clarity: 2,
      depth: 3,
      examples: 3,
    },
  },
  {
    questionText: 'What strengths would help you succeed in a structured online course environment?',
    modelAnswer:
      'Good answers reference discipline, communication, time management, follow-through, and a realistic understanding of course expectations.',
    maxScore: 10,
    order: 5,
    isActive: true,
    rubric: {
      correctness: 2,
      clarity: 2,
      depth: 3,
      examples: 3,
    },
  },
  {
    questionText: 'Share an example of solving a problem with limited guidance or incomplete information.',
    modelAnswer:
      'A strong response shows decision-making under ambiguity, step-by-step thinking, and the ability to make progress independently.',
    maxScore: 10,
    order: 6,
    isActive: true,
    rubric: {
      correctness: 2,
      clarity: 2,
      depth: 3,
      examples: 3,
    },
  },
  {
    questionText: 'How would you manage this course alongside your existing responsibilities?',
    modelAnswer:
      'The best answers include a practical plan for time allocation, consistency, deadlines, and risk management.',
    maxScore: 10,
    order: 7,
    isActive: true,
    rubric: {
      correctness: 2,
      clarity: 2,
      depth: 3,
      examples: 3,
    },
  },
  {
    questionText: 'What kind of outcomes would make this course a success for you?',
    modelAnswer:
      'A compelling answer defines measurable or concrete goals such as skills gained, portfolio work, career clarity, or execution milestones.',
    maxScore: 10,
    order: 8,
    isActive: true,
    rubric: {
      correctness: 2,
      clarity: 2,
      depth: 3,
      examples: 3,
    },
  },
  {
    questionText: 'What might make your application weaker than others, and how are you addressing it?',
    modelAnswer:
      'Strong answers are honest, self-aware, and paired with a credible plan to improve or compensate for current gaps.',
    maxScore: 10,
    order: 9,
    isActive: true,
    rubric: {
      correctness: 2,
      clarity: 2,
      depth: 3,
      examples: 3,
    },
  },
  {
    questionText: 'Is there anything else the review team should know before making a selection decision?',
    modelAnswer:
      'A good closing answer reinforces fit, highlights meaningful context, and avoids repeating earlier points without adding value.',
    maxScore: 10,
    order: 10,
    isActive: true,
    rubric: {
      correctness: 2,
      clarity: 2,
      depth: 3,
      examples: 3,
    },
  },
]

export const demoSelectionRules = {
  minShortlistScore: 80,
  minWaitlistScore: 60,
  borderlineMinScore: 75,
  minEachQuestionScore: 5,
  aiStrictnessLevel: 'balanced',
  autoShortlist: true,
  manualReviewEnabled: true,
  autoEmailEnabled: false,
  isActive: true,
  criteriaVersion: 1,
}
