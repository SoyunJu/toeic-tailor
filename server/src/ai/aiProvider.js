const provider = process.env.AI_PROVIDER === 'openai'
? require('./openaiProvider')
: require('./mockProvider');

module.exports = provider;