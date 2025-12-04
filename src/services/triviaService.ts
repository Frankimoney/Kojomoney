import africaTriviaData from '../assets/data/africa_trivia.json';

export type TriviaSource = 'global' | 'africa';
export type Region = 'global' | 'africa' | 'mixed';

export interface TriviaQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
    category: string;
    difficulty: string;
    source: TriviaSource;
}

interface OpenTDBResult {
    category: string;
    type: string;
    difficulty: string;
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
}

interface OpenTDBResponse {
    response_code: number;
    results: OpenTDBResult[];
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * Returns a new shuffled array (does not mutate original).
 */
export function shuffleArray<T>(arr: T[]): T[] {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

/**
 * Decodes HTML entities from a string.
 * Safe for use in browser environments.
 */
function decodeHTMLEntities(text: string): string {
    // Browser: use DOM parser for full coverage
    if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea')
        textArea.innerHTML = text
        return textArea.value
    }
    // Server: lightweight decoder for common entities + numeric codes
    const map: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#039;': "'",
        '&apos;': "'",
        '&ldquo;': '“',
        '&rdquo;': '”',
        '&lsquo;': '‘',
        '&rsquo;': '’',
        '&nbsp;': ' ',
        '&mdash;': '—',
        '&ndash;': '–',
    }
    let decoded = text.replace(/&[a-zA-Z]+;/g, (entity) => map[entity] ?? entity)
    decoded = decoded.replace(/&#(\d+);/g, (_, num: string) => String.fromCharCode(parseInt(num, 10)))
    decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    return decoded
}

export async function fetchGlobalTrivia(amount: number = 10): Promise<TriviaQuestion[]> {
    try {
        const response = await fetch(`https://opentdb.com/api.php?amount=${Math.max(1, Math.min(50, amount))}&type=multiple`);
        if (!response.ok) {
            throw new Error(`OpenTDB API error: ${response.statusText}`);
        }
        const data: OpenTDBResponse = await response.json();

        if (data.response_code !== 0) {
            throw new Error(`OpenTDB API returned code: ${data.response_code}`);
        }

        return data.results.map((item) => {
            const options = shuffleArray([...item.incorrect_answers, item.correct_answer]);
            return {
                question: decodeHTMLEntities(item.question),
                options: options.map(decodeHTMLEntities),
                correctAnswer: decodeHTMLEntities(item.correct_answer),
                category: decodeHTMLEntities(item.category),
                difficulty: item.difficulty,
                source: 'global',
            };
        });
    } catch (error) {
        console.error('Failed to fetch global trivia:', error);
        return [];
    }
}

export function fetchAfricaTrivia(): TriviaQuestion[] {
    // Cast imported JSON to any to avoid strict type checks on import if types don't perfectly align initially
    const data = africaTriviaData as any[];

    return data.map((item) => ({
        question: item.question,
        options: shuffleArray(item.options),
        correctAnswer: item.correctAnswer,
        category: item.category,
        difficulty: item.difficulty,
        source: 'africa',
    }));
}

export async function getTriviaByRegion(region: Region): Promise<TriviaQuestion[]> {
    let questions: TriviaQuestion[] = [];

    try {
        if (region === 'global') {
            questions = await fetchGlobalTrivia();
            if (questions.length === 0) {
                console.warn('Global trivia fetch failed or empty, falling back to Africa trivia.');
                questions = fetchAfricaTrivia();
            }
        } else if (region === 'africa') {
            questions = fetchAfricaTrivia();
        } else if (region === 'mixed') {
            const globalQuestions = await fetchGlobalTrivia();
            const africaQuestions = fetchAfricaTrivia();

            if (globalQuestions.length === 0) {
                console.warn('Global trivia fetch failed for mixed mode, using only Africa trivia.');
                return shuffleArray(africaQuestions);
            }

            // Mix 50/50 - taking 5 from each to make a set of 10
            const mixCount = 5;
            const selectedGlobal = globalQuestions.slice(0, mixCount);
            // Shuffle Africa questions before slicing to ensure variety
            const selectedAfrica = shuffleArray(africaQuestions).slice(0, mixCount);

            questions = [...selectedGlobal, ...selectedAfrica];
        }
    } catch (error) {
        console.error('Error in getTriviaByRegion:', error);
        // Ultimate fallback
        return shuffleArray(fetchAfricaTrivia());
    }

    return shuffleArray(questions);
}
