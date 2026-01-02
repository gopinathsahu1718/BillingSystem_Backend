import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const port = process.env.PORT || 6000;

app.listen(port, () => {
    console.log(`🚀 Admin Authentication Server is running at port ${port}`);
});