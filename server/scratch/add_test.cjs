const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/jaydbapp').then(async () => {
    const pair = {
        id: '1776050000000',
        question: 'Hi',
        answer: 'Hello! I am your AI assistant. How can I help you today?'
    };
    await mongoose.connection.db.collection('ai_agent').insertOne(pair);
    console.log('SUCCESS: Added test pair Hi -> Hello');
    process.exit(0);
}).catch(e => {
    console.error('FAILURE:', e);
    process.exit(1);
});
