import { getTriviaByRegion } from './triviaService';

async function testTriviaService() {
    console.log('=== Testing Trivia Service ===\n');

    // Test Global
    console.log('📡 Testing GLOBAL trivia...');
    const globalTrivia = await getTriviaByRegion('global');
    console.log(`✓ Fetched ${globalTrivia.length} global questions`);
    console.log('Sample question:', globalTrivia[0]);
    console.log('All sources:', [...new Set(globalTrivia.map(q => q.source))]);
    console.log('');

    // Test Africa
    console.log('🌍 Testing AFRICA trivia...');
    const africaTrivia = await getTriviaByRegion('africa');
    console.log(`✓ Fetched ${africaTrivia.length} Africa questions`);
    console.log('Sample question:', africaTrivia[0]);
    console.log('All sources:', [...new Set(africaTrivia.map(q => q.source))]);
    console.log('');

    // Test Mixed
    console.log('🌐 Testing MIXED trivia...');
    const mixedTrivia = await getTriviaByRegion('mixed');
    console.log(`✓ Fetched ${mixedTrivia.length} mixed questions`);
    console.log('Sample question:', mixedTrivia[0]);
    const sources = mixedTrivia.map(q => q.source);
    console.log('Source distribution:', {
        global: sources.filter(s => s === 'global').length,
        africa: sources.filter(s => s === 'africa').length,
    });
    console.log('');

    console.log('✅ All tests completed!');
}

testTriviaService().catch(console.error);
