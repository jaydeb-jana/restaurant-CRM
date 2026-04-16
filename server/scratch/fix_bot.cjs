const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/jaydbapp').then(async () => {
    await mongoose.connection.db.collection('settings').updateOne(
        { id: 'app-settings' },
        { $set: { activeBotSessions: ['session-9910'] } }
    );
    console.log('SUCCESS: Session session-9910 is now enabled for AI Bot.');
    process.exit(0);
}).catch(e => {
    console.error('FAILURE:', e);
    process.exit(1);
});
