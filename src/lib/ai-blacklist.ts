// AI-ism Blacklist - Words that flag AI-generated content
export const AI_BLACKLIST = [
    'delve',
    'tapestry',
    'vital',
    'empower',
    'leverage',
    'synergize',
    'comprehensive',
    'in the realm of',
    'it is important to note',
    'furthermore',
    'moreover',
    'in conclusion',
    'firstly',
    'secondly',
    'lastly',
    'paramount',
    'pivotal',
    'multifaceted',
    'myriad',
    'plethora',
    'harness',
    'navigate',
    'landscape',
    'robust',
    'seamless',
    'seamlessly',
    'cutting-edge',
    'game-changer',
    'revolutionize',
    'unlock',
    'unleash',
    // Extended list - more red flags
    'testament',
    'bustling',
    'vibrant',
    'underscore',
    'realm',
    'spearhead',
    'paradigm',
    'holistic',
    'synergy',
    'streamline',
    'facilitate',
    'optimize',
    'utilize',
    'implement',
    'innovative',
    'groundbreaking',
    'transformative',
    'unprecedented',
    'compelling',
    'nuanced',
    'intricacies',
    'endeavor',
    'embark',
    'journey',
    'landscape',
    'ecosystem',
    'framework',
    'leverage',
    'garner',
    'foster',
    'bolster',
    'elevate',
    'enhance',
    'amplify',
    'augment',
    'substantive',
    'discern',
    'elucidate',
    'expound',
    'articulate',
    'underscore',
    'accentuate',
    'meticulous',
    'meticulously',
    'intricate',
    'intricately',
    'encompasses',
    'embodies',
    'exemplifies',
    'epitomizes',
    'quintessential'
]

// Replacements for common AI-isms
export const AI_REPLACEMENTS: Record<string, string> = {
    'delve': 'look into',
    'delve into': 'check out',
    'tapestry': 'mix',
    'vital': 'important',
    'empower': 'help',
    'leverage': 'use',
    'synergize': 'combine',
    'comprehensive': 'full',
    'paramount': 'key',
    'pivotal': 'big',
    'multifaceted': 'complex',
    'myriad': 'tons of',
    'plethora': 'bunch of',
    'harness': 'use',
    'navigate': 'deal with',
    'landscape': 'space',
    'robust': 'solid',
    'seamless': 'smooth',
    'seamlessly': 'smoothly',
    'cutting-edge': 'latest',
    'game-changer': 'big deal',
    'revolutionize': 'shake up',
    'unlock': 'open up',
    'unleash': 'let loose',
    'testament': 'proof',
    'bustling': 'busy',
    'vibrant': 'lively',
    'underscore': 'highlight',
    'realm': 'area',
    'spearhead': 'lead',
    'paradigm': 'model',
    'holistic': 'whole',
    'synergy': 'teamwork',
    'streamline': 'simplify',
    'facilitate': 'help with',
    'optimize': 'improve',
    'utilize': 'use',
    'implement': 'set up',
    'innovative': 'new',
    'groundbreaking': 'new',
    'transformative': 'major',
    'unprecedented': 'never seen',
    'compelling': 'strong',
    'nuanced': 'subtle',
    'intricacies': 'details',
    'endeavor': 'try',
    'embark': 'start',
    'journey': 'path',
    'ecosystem': 'system',
    'framework': 'structure',
    'garner': 'get',
    'foster': 'build',
    'bolster': 'boost',
    'elevate': 'raise',
    'enhance': 'improve',
    'amplify': 'increase',
    'augment': 'add to',
    'substantive': 'real',
    'discern': 'see',
    'elucidate': 'explain',
    'expound': 'explain',
    'articulate': 'express',
    'accentuate': 'highlight',
    'meticulous': 'careful',
    'meticulously': 'carefully',
    'intricate': 'detailed',
    'intricately': 'in detail',
    'encompasses': 'includes',
    'embodies': 'shows',
    'exemplifies': 'shows',
    'epitomizes': 'represents',
    'quintessential': 'classic'
}

// Clean content of AI-isms
export function cleanAIisms(content: string): string {
    let cleaned = content

    // Replace blacklisted words (case-insensitive)
    for (const [aiWord, replacement] of Object.entries(AI_REPLACEMENTS)) {
        const regex = new RegExp(`\\b${aiWord}\\b`, 'gi')
        cleaned = cleaned.replace(regex, replacement)
    }

    // Remove common AI phrases completely
    const phrasesToRemove = [
        'it is important to note that',
        'it\'s important to note that',
        'it is worth noting that',
        'it\'s worth noting that',
        'in the realm of',
        'at the end of the day,',
        'in today\'s fast-paced world,',
        'in this day and age,',
        'when it comes to',
        'in terms of',
        'as a matter of fact,',
        'needless to say,',
        'it goes without saying that',
        'for all intents and purposes,',
        'at this point in time,',
        'in order to',
        'due to the fact that',
        'for the purpose of',
        'in light of the fact that',
        'with regard to',
        'with respect to',
        'in the context of',
        'from the perspective of',
        'on a daily basis',
        'in today\'s world,',
        'in the modern era,',
        'in the digital age,'
    ]

    for (const phrase of phrasesToRemove) {
        const regex = new RegExp(phrase, 'gi')
        cleaned = cleaned.replace(regex, '')
    }

    // Clean up double spaces
    cleaned = cleaned.replace(/\s{2,}/g, ' ')

    return cleaned
}

// Add controlled imperfections to make text more human
export function addImperfections(content: string): string {
    let result = content

    // Convert formal to contractions
    const contractions: Record<string, string> = {
        'do not': "don't",
        'does not': "doesn't",
        'did not': "didn't",
        'will not': "won't",
        'would not': "wouldn't",
        'could not': "couldn't",
        'should not': "shouldn't",
        'cannot': "can't",
        'can not': "can't",
        'is not': "isn't",
        'are not': "aren't",
        'was not': "wasn't",
        'were not': "weren't",
        'have not': "haven't",
        'has not': "hasn't",
        'had not': "hadn't",
        'it is': "it's",
        'that is': "that's",
        'there is': "there's",
        'what is': "what's",
        'who is': "who's",
        'I am': "I'm",
        'you are': "you're",
        'they are': "they're",
        'we are': "we're",
        'I have': "I've",
        'you have': "you've",
        'they have': "they've",
        'we have': "we've",
        'I would': "I'd",
        'you would': "you'd",
        'they would': "they'd",
        'we would': "we'd",
        'I will': "I'll",
        'you will': "you'll",
        'they will': "they'll",
        'we will': "we'll",
        'let us': "let's"
    }

    for (const [formal, contraction] of Object.entries(contractions)) {
        const regex = new RegExp(`\\b${formal}\\b`, 'gi')
        result = result.replace(regex, contraction)
    }

    // Inject sentence starters occasionally (But, And, So at start of sentences)
    // Find sentences that start with common AI patterns and add variety
    const sentenceStarters = [
        { pattern: /\. However,/g, replacements: ['. But here\'s the thing:', '. But', '. Thing is,'] },
        { pattern: /\. Additionally,/g, replacements: ['. Plus,', '. And', '. Also,'] },
        { pattern: /\. Therefore,/g, replacements: ['. So', '. That means', '. Which means'] },
        { pattern: /\. Consequently,/g, replacements: ['. So', '. As a result,', '. Because of this,'] },
        { pattern: /\. Furthermore,/g, replacements: ['. Plus,', '. And', '. On top of that,'] },
        { pattern: /\. Moreover,/g, replacements: ['. Also,', '. And', '. What\'s more,'] },
        { pattern: /\. Nevertheless,/g, replacements: ['. Still,', '. But', '. Even so,'] },
        { pattern: /\. Nonetheless,/g, replacements: ['. Still,', '. But', '. Even then,'] },
        { pattern: /\. Subsequently,/g, replacements: ['. Then', '. After that,', '. Next,'] },
        { pattern: /\. In addition,/g, replacements: ['. Plus,', '. Also,', '. And'] }
    ]

    for (const { pattern, replacements } of sentenceStarters) {
        result = result.replace(pattern, () => {
            return replacements[Math.floor(Math.random() * replacements.length)]
        })
    }

    return result
}

// Aggressive sentence restructuring for more burstiness
export function addBurstiness(content: string): string {
    // Split by paragraphs (preserve HTML)
    const paragraphs = content.split(/<\/p>/gi)

    return paragraphs.map(p => {
        // Don't touch headings
        if (/<h[1-6]/i.test(p)) return p + '</p>'

        // Occasionally break long sentences
        if (p.length > 300) {
            // Find long sentences and potentially split them
            p = p.replace(/,\s+(and|but|so|which|because)\s+/gi, (match, word) => {
                // 30% chance to split into new sentence
                if (Math.random() < 0.3) {
                    return `. ${word.charAt(0).toUpperCase() + word.slice(1)} `
                }
                return match
            })
        }

        return p + '</p>'
    }).join('')
}
