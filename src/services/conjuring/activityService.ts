import type { ActivityCategory, ActivityLists, ActivityCounts } from '@/types/conjuring';

const ACTIVITIES_STORAGE_KEY = 'conjuring-studio-activities';
const ACTIVITIES_COUNTS_STORAGE_KEY = 'conjuring-studio-activity-counts';

const defaultActivities: ActivityLists = {
  'Sports activities': [
    "Track running", "Pool swimming", "Mountain biking", "Soccer match", "Basketball match", "Boxing training", "Tennis serve", "Wall climbing", "Ski descent", "Wave surfing", "Team rowing", "Martial arts combat", "Rugby tackle", "Indoor climbing", "Golf swing", "Skateboard trick", "Sunrise yoga", "Latin dance", "Scuba diving", "Kayaking"
  ],
  'Artistic activities': [
    "Canvas painting", "Marble sculpture", "Playing guitar", "Playing piano", "Wall graffiti", "Musician with guitar", "Singing into a microphone", "Photographer in action", "Cameraman filming", "Ink calligraphy", "Wheel pottery", "Tattooing in progress", "Orchestra conductor", "Poet writing", "Public reading", "Theatrical improvisation", "Exhibition visit"
  ],
  'Lifestyle & relaxation': [
    "Breakfast on the terrace", "Reading in a park", "Shopping in a boutique", "Picnic with friends", "Meal preparation", "Stroll in a lively street", "Walk in the forest", "Working in a cafe", "Evening on a rooftop", "Scooter ride", "Dog walk", "Meditation by a lake", "Remote work from home", "Plane trip", "Boat ride", "Nap in a hammock", "Hammam relaxation", "Spa with steam", "Shopping at the local market", "Beach walk"
  ],
  'Daily life': [
    "Brushing teeth", "Making coffee", "Grocery shopping", "Getting out of the car", "Folding laundry", "Talking on the phone", "Checking a smartphone", "Doing dishes", "Watching television", "Working at a desk", "Watering a plant", "Walking in the rain", "Cycling to work", "Tying shoelaces", "Looking out the window", "Cooking a simple dish", "Exiting a metro station", "Open-plan office meeting", "Shopping in an open market", "Downtown shopping"
  ],
  'Original experiences': [
    "Paragliding landing", "Going up in a hot air balloon", "Swing above the water", "Lighting a campfire", "Walking in a wheat field", "Reading perched in a tree", "Horseback riding by the water", "Stargazing with a telescope", "Sleeping in a hammock", "Admiring the view from a building rooftop", "Flying a kite", "Picking wildflowers", "Writing on a train", "Drinking tea in a yurt", "Diving into a mountain lake", "Playing music in the street", "Painting a mural", "Night under the stars", "Nap under a tree", "Watching a carousel at the fair"
  ],
  'Romantic Activities': [
    "Holding roses under rain",
    "Lighting candles for dinner",
    "Writing love on sand",
    "Drawing heart on window",
    "Carrying flowers behind back",
    "Hiding heart shape gift behind his back",
    "Hugging pillow while dreaming",
    "Carving initials into tree",
    "Men and woman hands touching with love",
    "Holding 2 plane tickets",
    "Bring breakfast in bed",
    "Holding beautiful restaurant door",
    "Playing guitar looking at camera",
    "Giving food from his fork in restaurant",
    "Putting parfum on his neck",
    "Smiling looking at his phone",
    "Pouring tea with care"
  ],
  'Date Activities': [
    "two steaming cups of coffee in a terrace",
    "Sharing a bucket of popcorn in cinema",
    "Night market: tasting ice cream or street food together.",
    "Impromptu dance in a lit alleyway.",
    "Flowered balcony: a discreet kiss, city lights in the background.",
    "Feeding birds playfully",
    "Opening car door",
    "Inviting to go in Photo Booth",
    "Drinking fresh juice in a bar"
  ],
  'Couple Activities': [
    "Cooking together in the kitchen",
    "Reading a book together on a sofa",
    "Feeding ducks by a pond",
    "Watching a movie under a blanket",
    "Sharing headphones while listening to music",
    "Looking at old photo albums together",
    "Decorating a Christmas tree",
    "Exploring a local market",
    "Riding a scooter/motorbike together",
    "Sharing breakfast in bed",
    "Holding hands while walking through autumn leaves",
    "Painting together on a canvas",
    "Drinking hot chocolate on a snowy day",
    "Playing video games as a team",
    "Building a puzzle on the floor",
    "Taking polaroid selfies together",
    "Sitting in the front seat of a car, one hand resting on the partner’s thigh while driving",
    "Washing dishes side by side, playfully splashing water",
    "Folding laundry together and laughing at mismatched socks",
    "Grocery shopping together, one pushing the cart while the other adds items"
  ]
};

const defaultActivityCounts: ActivityCounts = {
    'Sports activities': 2,
    'Artistic activities': 2,
    'Lifestyle & relaxation': 2,
    'Daily life': 2,
    'Original experiences': 1,
    'Romantic Activities': 0,
    'Date Activities': 0,
    'Couple Activities': 0,
};

export const getActivities = (): ActivityLists => {
  try {
    const stored = localStorage.getItem(ACTIVITIES_STORAGE_KEY);
    if (stored) {
      const storedActivities = JSON.parse(stored);
      // Merge stored activities with defaults to handle new categories being added
      const mergedActivities = { ...defaultActivities };
      for (const key in storedActivities) {
        if (Object.prototype.hasOwnProperty.call(mergedActivities, key)) {
          mergedActivities[key as ActivityCategory] = storedActivities[key];
        }
      }
      return mergedActivities;
    }
  } catch (e) {
    console.error("Failed to load activities from localStorage", e);
  }
  return defaultActivities;
};

export const saveActivities = (activities: ActivityLists) => {
  try {
    localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(activities));
  } catch (e) {
    console.error("Failed to save activities to localStorage", e);
  }
};

export const resetActivities = () => {
  try {
    localStorage.removeItem(ACTIVITIES_STORAGE_KEY);
  } catch(e) {
     console.error("Failed to remove activities from localStorage", e);
  }
  return defaultActivities;
};

export const getAactivityCounts = (): ActivityCounts => {
    try {
        const stored = localStorage.getItem(ACTIVITIES_COUNTS_STORAGE_KEY);
        if (stored) {
            const storedCounts = JSON.parse(stored);
             return { ...defaultActivityCounts, ...storedCounts };
        }
    } catch (e) {
        console.error("Failed to load activity counts from localStorage", e);
    }
    return defaultActivityCounts;
};

export const saveActivityCounts = (counts: ActivityCounts) => {
    try {
        localStorage.setItem(ACTIVITIES_COUNTS_STORAGE_KEY, JSON.stringify(counts));
    } catch (e) {
        console.error("Failed to save activity counts to localStorage", e);
    }
};

export const resetActivityCounts = () => {
    try {
        localStorage.removeItem(ACTIVITIES_COUNTS_STORAGE_KEY);
    } catch(e) {
        console.error("Failed to remove activity counts from localStorage", e);
    }
    return defaultActivityCounts;
};


export const activitiesToString = (activities: ActivityLists): string => {
    return (Object.keys(activities) as ActivityCategory[])
        .map(category => `${category}\n${activities[category].join('\n')}`)
        .join('\n\n');
};

export const generateSceneRequirementsString = (counts: ActivityCounts): string => {
    const requirements = (Object.keys(counts) as ActivityCategory[])
        .filter(category => counts[category] > 0)
        .map(category => `- ${counts[category]} scene${counts[category] > 1 ? 's' : ''} from ${category}`)
        .join('\n');
    return requirements ? `You must generate:\n${requirements}` : '';
};