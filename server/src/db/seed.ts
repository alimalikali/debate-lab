import { db } from '../config/database';

const categories = [
  {
    name: 'Philosophy',
    slug: 'philosophy',
    description: 'Explore fundamental questions about existence, knowledge, and ethics',
    icon_name: 'brain',
    color: 'purple',
    display_order: 1,
  },
  {
    name: 'Technology',
    slug: 'technology',
    description: 'Debate the impact and ethics of technological advancement',
    icon_name: 'cpu',
    color: 'blue',
    display_order: 2,
  },
  {
    name: 'Politics',
    slug: 'politics',
    description: 'Discuss political systems, policies, and governance',
    icon_name: 'landmark',
    color: 'red',
    display_order: 3,
  },
  {
    name: 'Ethics',
    slug: 'ethics',
    description: 'Examine moral dilemmas and ethical frameworks',
    icon_name: 'scale',
    color: 'yellow',
    display_order: 4,
  },
  {
    name: 'Science',
    slug: 'science',
    description: 'Debate scientific theories, methods, and discoveries',
    icon_name: 'flask',
    color: 'green',
    display_order: 5,
  },
  {
    name: 'Society',
    slug: 'society',
    description: 'Explore social issues and cultural phenomena',
    icon_name: 'users',
    color: 'orange',
    display_order: 6,
  },
];

const topics = [
  // Philosophy
  {
    title: 'Free Will vs Determinism',
    description: 'Do humans have genuine free will, or are our choices determined by prior causes?',
    difficulty: 'intermediate',
    category_slug: 'philosophy',
  },
  {
    title: 'The Meaning of Life',
    description: 'Is there an inherent meaning to life, or do we create our own purpose?',
    difficulty: 'expert',
    category_slug: 'philosophy',
  },
  {
    title: 'Is Knowledge Possible?',
    description: 'Can we truly know anything with certainty, or are all beliefs subject to doubt?',
    difficulty: 'expert',
    category_slug: 'philosophy',
  },

  // Technology
  {
    title: 'AI Rights and Consciousness',
    description: 'Should advanced AI systems be granted rights if they demonstrate consciousness?',
    difficulty: 'intermediate',
    category_slug: 'technology',
  },
  {
    title: 'Social Media Impact on Society',
    description: 'Has social media been a net positive or negative for human society?',
    difficulty: 'beginner',
    category_slug: 'technology',
  },
  {
    title: 'Privacy vs Security',
    description: 'Should we sacrifice privacy for enhanced security in the digital age?',
    difficulty: 'intermediate',
    category_slug: 'technology',
  },
  {
    title: 'Automation and Employment',
    description: 'Will automation lead to mass unemployment, or create new opportunities?',
    difficulty: 'beginner',
    category_slug: 'technology',
  },

  // Politics
  {
    title: 'Democracy vs Other Systems',
    description: 'Is democracy the best form of government, or are there better alternatives?',
    difficulty: 'intermediate',
    category_slug: 'politics',
  },
  {
    title: 'Immigration Policy',
    description: 'Should nations have open borders, or strict immigration controls?',
    difficulty: 'beginner',
    category_slug: 'politics',
  },
  {
    title: 'Universal Basic Income',
    description: 'Is UBI a viable solution to poverty and automation-driven job loss?',
    difficulty: 'intermediate',
    category_slug: 'politics',
  },

  // Ethics
  {
    title: 'The Trolley Problem',
    description: 'Is it ethical to sacrifice one person to save many?',
    difficulty: 'beginner',
    category_slug: 'ethics',
  },
  {
    title: 'Animal Rights',
    description: 'Do animals have rights comparable to humans, and should we be vegan?',
    difficulty: 'intermediate',
    category_slug: 'ethics',
  },
  {
    title: 'Genetic Engineering Ethics',
    description: 'Is it ethical to genetically modify humans for enhancement?',
    difficulty: 'expert',
    category_slug: 'ethics',
  },

  // Science
  {
    title: 'Climate Change Action',
    description: 'What measures should we take to address climate change?',
    difficulty: 'beginner',
    category_slug: 'science',
  },
  {
    title: 'Space Colonization Priority',
    description: 'Should we prioritize colonizing other planets or solving Earth\'s problems first?',
    difficulty: 'intermediate',
    category_slug: 'science',
  },
  {
    title: 'Scientific Method Limitations',
    description: 'Are there fundamental limits to what science can explain?',
    difficulty: 'expert',
    category_slug: 'science',
  },

  // Society
  {
    title: 'Education System Reform',
    description: 'Is the traditional education system outdated and in need of radical change?',
    difficulty: 'beginner',
    category_slug: 'society',
  },
  {
    title: 'Work-Life Balance',
    description: 'Should we adopt a 4-day work week as the new standard?',
    difficulty: 'beginner',
    category_slug: 'society',
  },
  {
    title: 'Cancel Culture',
    description: 'Is cancel culture a form of accountability or mob justice?',
    difficulty: 'intermediate',
    category_slug: 'society',
  },
];

async function seed(): Promise<void> {
  console.log('Starting database seeding...');

  try {
    // Insert categories
    console.log('Seeding categories...');
    for (const category of categories) {
      await db.query(
        `INSERT INTO topic_categories (name, slug, description, icon_name, color, display_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           icon_name = EXCLUDED.icon_name,
           color = EXCLUDED.color,
           display_order = EXCLUDED.display_order`,
        [category.name, category.slug, category.description, category.icon_name, category.color, category.display_order]
      );
    }
    console.log(`✓ Seeded ${categories.length} categories`);

    // Get category IDs
    const categoryResult = await db.query('SELECT id, slug FROM topic_categories');
    const categoryMap = new Map(categoryResult.rows.map((r) => [r.slug, r.id]));

    // Insert topics
    console.log('Seeding topics...');
    for (const topic of topics) {
      const categoryId = categoryMap.get(topic.category_slug);
      await db.query(
        `INSERT INTO debate_topics (title, description, difficulty, category_id, is_predefined)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT DO NOTHING`,
        [topic.title, topic.description, topic.difficulty, categoryId]
      );
    }
    console.log(`✓ Seeded ${topics.length} topics`);

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    await db.end();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
